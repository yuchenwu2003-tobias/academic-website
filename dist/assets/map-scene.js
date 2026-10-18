import {CONTINENTS,COUNTRIES,continentById,countryById,fitRegion,zoomView,regionHref} from './geography.js?v=20261018-wiki-details-final';
import {WORLD_OUTLINE,GRATICULE,project,unproject} from './projection.js?v=20261018-wiki-details-final';
import {LANDMARK_CATALOG} from './landmark-catalog.js?v=20261018-wiki-details-final';
import {layoutLandmarks} from './landmark-layout.js?v=20261018-wiki-details-final';
import {selectLandmarks,landmarkPresentation} from './landmark-curation.js?v=20261018-wiki-details-final';
import {ATLAS_SRC,ATLAS_SIZE,SPRITES} from './landmark-sprites-v3.js?v=20261018-wiki-details-final';
import {renderLakeLayer,mountLakeLayer} from './lake-layer.js?v=20261018-wiki-details-final';
import {mountMapDetail} from './map-detail.js?v=20261018-wiki-details-final';
import {COUNTRY_FLAGS} from './country-flags.js?v=20261018-wiki-details-final';
import {translateText} from './i18n.js?v=20261018-wiki-details-final';
import {renderMapDisclaimer} from './map-disclaimer.js?v=20261018-wiki-details-final';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mapRouteBase=value=>typeof value==='string'&&/^#\/[a-z0-9/_-]+$/i.test(value)?value.replace(/\/+$/,''):'#/travel';
function countryShapes(region,routeBase) {
  const groups=region.kind==='world'?CONTINENTS:COUNTRIES;
  return groups.map(item=>{
    const countries=region.kind==='world'?COUNTRIES.filter(c=>c.continent===item.id):[item];
    const continent=region.kind==='world'?item:continentById.get(item.continent);
    const isRelevant=region.kind==='world'||(region.kind==='continent'?item.continent===region.id:item.id===region.id);
    const href=region.kind==='world'?`${routeBase}/continent/${item.id}`:`${routeBase}/country/${item.id}`;
    return `<a href="${href}" data-geo-route class="geo-country-group ${isRelevant?'is-relevant':'is-muted'}" aria-label="${esc(item.name)}，${region.kind==='world'?'进入大洲':'查看国家或地区'}页面" style="--continent-color:${continent.color}">${countries.map(country=>`<path class="geo-country" d="${country.d}" fill-rule="evenodd" data-country="${country.id}"><title>${esc(country.name)} · ${esc(continent.name)}</title></path>`).join('')}</a>`;
  }).join('');
}
function continentLabels(region,routeBase) {
  if(region.kind!=='world')return '';
  return CONTINENTS.map(continent=>`<a href="${routeBase}/continent/${continent.id}" data-geo-route aria-label="进入${esc(continent.name)}" class="continent-label" data-anchor-x="${continent.label[0]}" data-anchor-y="${continent.label[1]}" transform="translate(${continent.label.join(' ')})"><rect x="-39" y="-14" width="78" height="36" rx="4"/><text text-anchor="middle" y="1">${esc(continent.name)} <tspan>↗</tspan></text><text class="continent-label-en" text-anchor="middle" y="14">${esc(continent.english.toUpperCase())}</text></a>`).join('');
}
function countryLabel(country,name='世界') {
  const flag=country&&COUNTRY_FLAGS[country.id];
  return `${country?(flag?.src?`<img class="country-flag" src="${esc(flag.src)}" alt="${esc(country.id==='ata'?'南极地区符号':`${country.name}旗帜`)}" width="24" height="18">`:'<span class="country-flag-placeholder" aria-hidden="true">⚑</span>'):''}<b>${esc(country?.name||name)}</b><span class="map-hover-meta">· Equal Earth</span>`;
}
function landmarks(items,view,viewport,obstacles,options={},routeBase='#/travel') {
  return layoutLandmarks(items,view,viewport,{...options,obstacles,ignoreLevels:true}).map(item=>{
    const sprite=SPRITES[item.id];if(!sprite)return '';
    const imageSrc=sprite.src||ATLAS_SRC,imageWidth=sprite.sourceWidth||ATLAS_SIZE.width,imageHeight=sprite.sourceHeight||ATLAS_SIZE.height;
    const clip=`landmark-crop-${item.id}`,fit=Math.min((item.size-12)/sprite.width,(item.size-12)/sprite.height);
    const left=-sprite.width*fit/2,top=item.size-sprite.height*fit;
    return `<a href="${routeBase}/country/${item.country}" data-geo-route class="map-landmark" data-landmark-id="${esc(item.id)}" data-landmark-anchor-x="${item.anchorX}" data-landmark-anchor-y="${item.anchorY}" transform="translate(${item.x} ${item.y}) scale(${item.scale})" aria-label="${esc(translateText(`${item.title}，查看${countryById.get(item.country)?.name||'目的地'}页面`))}">
    <title>${esc(item.title)}</title><defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${left}" y="${top}" width="${sprite.width*fit}" height="${sprite.height*fit}"/></clipPath>
    <radialGradient id="${clip}-fade"><stop offset="86%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient><mask id="${clip}-soft" maskUnits="userSpaceOnUse" x="${-item.size/2}" y="0" width="${item.size}" height="${item.size}"><rect x="${-item.size/2}" y="0" width="${item.size}" height="${item.size}" fill="url(#${clip}-fade)"/></mask></defs>
    <g class="map-landmark-icon" clip-path="url(#${clip})" mask="url(#${clip}-soft)" aria-hidden="true"><rect x="${left}" y="${top}" width="${sprite.width*fit}" height="${sprite.height*fit}" fill="transparent" stroke="none"/><image href="${esc(imageSrc)}" x="${left-sprite.x*fit}" y="${top-sprite.y*fit}" width="${imageWidth*fit}" height="${imageHeight*fit}" pointer-events="none"/></g><circle class="map-landmark-anchor" cx="0" cy="${item.size}" r="2.4" aria-hidden="true"/>${item.showLabel?`<text text-anchor="middle" y="${item.size+12}">${esc(item.caption??item.title)}</text>`:''}</a>`;
  }).join('');
}
export function renderMapScene(region={kind:'world'},compact=false,{geographicOnly=false,routeBase='#/travel'}={}) {
  const base=mapRouteBase(routeBase);
  const v=fitRegion(region);
  return `<div class="map-style-bar">${geographicOnly?'<span class="map-gesture-hint">地理地图</span>':'<div class="map-style-switch" role="group" aria-label="地图显示模式"><button data-map-style="geographic" aria-pressed="true">地理地图</button><button data-map-style="cartoon" aria-pressed="false">插画地图 <span>✳</span></button></div>'}<span class="map-gesture-hint">滚轮缩放 · 拖拽移动 · 点击${region.kind==='world'?'大洲':'国家'}</span></div>
  <div class="map-stage"><svg class="world-map" data-world-map viewBox="${v.x} ${v.y} ${v.width} ${v.height}" role="group" aria-label="Equal Earth 互动地图，支持滚轮缩放、拖拽、点击大洲和国家">
  <defs><clipPath id="earth-clip"><path d="${WORLD_OUTLINE}"/></clipPath></defs><rect width="1000" height="500" class="map-canvas"/><path class="map-ocean" d="${WORLD_OUTLINE}"/><g clip-path="url(#earth-clip)"><path class="map-graticule" d="${GRATICULE}"/>${countryShapes(region,base)}${renderLakeLayer(v)}</g><g class="continent-labels">${geographicOnly?'':continentLabels(region,base)}</g><g class="cartoon-landmarks" data-cartoon-layer></g><g class="map-markers" data-map-markers></g></svg>
  <div class="map-detail-status" data-border-detail>国界 · 世界概览</div>${geographicOnly?'':'<div class="map-cartoon-hint">放大地图，发现更多地标</div>'}<div class="map-hover-label" data-map-hover>${countryLabel(region.kind==='country'?region:null,region.name||'世界')}</div>
  <div class="map-zoom" role="group" aria-label="地图缩放"><button data-map-zoom="in" aria-label="放大地图">＋</button><output class="map-scale" data-map-scale aria-label="缩放比例">100%</output><button data-map-zoom="out" aria-label="缩小地图">−</button><a href="${base}" data-map-world aria-label="返回世界地图" title="返回世界地图">🌐</a></div><div class="map-placement-hint" data-map-hint hidden>点击地图，放下你的 📌 <button data-map-cancel>取消</button></div>${renderMapDisclaimer()}</div>`;
}
export function renderRegionDirectory(region,compact=false,{routeBase='#/travel'}={}) {
  const base=mapRouteBase(routeBase);
  if(compact||region.kind==='country')return '';
  if(region.kind==='world')return `<section class="geo-directory" aria-labelledby="continents-heading"><div class="geo-directory-title"><h2 id="continents-heading">七个大洲，七种出发。</h2><span>在地图或下方选择一洲，继续探索</span></div><div class="continent-grid">${CONTINENTS.map((c,i)=>`<a class="continent-card" href="${base}/continent/${c.id}" style="--continent-color:${c.color}"><span class="mono">0${i+1} / ${esc(c.english.toUpperCase())}</span><h3>${esc(c.name)} <span>↗</span></h3><p>${COUNTRIES.filter(country=>country.continent===c.id).length} 个国家与地区入口</p></a>`).join('')}</div></section>`;
  const countries=COUNTRIES.filter(c=>c.continent===region.id).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  return `<section class="geo-directory" aria-labelledby="countries-heading"><div class="geo-directory-title"><h2 id="countries-heading">继续走进一个国家。</h2><label class="geo-country-search"><span class="sr-only">搜索${esc(region.name)}国家与地区</span><input type="search" data-country-search placeholder="搜索国家或地区…" autocomplete="off"></label></div><div class="country-directory">${countries.map(c=>`<a class="country-directory-link" data-country-entry data-country-key="${esc(`${c.name} ${c.english}`.toLowerCase())}" href="${base}/country/${c.id}"><span>${esc(c.name)}</span><small>${esc(c.english)}</small><span class="country-link-arrow">↗</span></a>`).join('')}</div><p class="country-search-empty" hidden data-country-empty>没有找到，换个关键词试试。</p></section>`;
}
export function mountMapScene(root,{region,onViewChange,onMarkerClick,onChoosePoint,isAdding,announce,geographicOnly=false,routeBase='#/travel'}) {
  const base=mapRouteBase(routeBase);
  const svg=root.querySelector('[data-world-map]');
  let view=fitRegion(region),style='geographic',suppressClick=false,drag=null,pinch=null;
  const pointers=new Map();
  if(!geographicOnly)try{if(localStorage.getItem('tobias.travel-map.style.v1')==='cartoon')style='cartoon';}catch{}
  const detail=mountMapDetail(root,region);
  const lakes=mountLakeLayer(root,region);
  const hover=root.querySelector('[data-map-hover]');
  let hoverId;
  function showCountry(country){const key=country?.id||region.name||'世界';if(hoverId===key)return;hoverId=key;hover.innerHTML=countryLabel(country,region.name||'世界');}
  function drawLandmarks(){
    const layer=root.querySelector('[data-cartoon-layer]');
    if(geographicOnly||style!=='cartoon'){layer.replaceChildren();return;}
    const bounds=svg.getBoundingClientRect();
    const obstacles=[...root.querySelectorAll('.map-hover-label,.map-zoom,.map-detail-status,.map-cartoon-hint,.map-disclaimer')].filter(el=>!el.hidden&&el.getBoundingClientRect().width).map(el=>{const b=el.getBoundingClientRect();return{x:b.x-bounds.x,y:b.y-bounds.y,width:b.width,height:b.height};});
    const presentation=landmarkPresentation(selectLandmarks(LANDMARK_CATALOG,region,view),region,view,bounds);
    layer.innerHTML=landmarks(presentation.items.map(item=>({...item,title:translateText(item.title),...(item.caption?{caption:translateText(item.caption)}:{})})),view,bounds,obstacles,presentation.options,base);
  }
  function applyStyle(value){style=geographicOnly?'geographic':value;root.dataset.mapStyle=style;root.querySelectorAll('[data-map-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapStyle===style)));drawLandmarks();}
  function applyView(next){view=next;svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);root.querySelector('[data-map-scale]').value=`${Math.round(100000/view.width)}%`;root.classList.toggle('map-is-zoomed',view.width<450);svg.querySelectorAll('[data-anchor-x]').forEach(el=>el.setAttribute('transform',`translate(${el.dataset.anchorX} ${el.dataset.anchorY}) scale(${view.width/1000})`));drawLandmarks();detail.refresh(view);lakes.refresh(view);onViewChange({...view});}
  function at(clientX,clientY){const p=svg.createSVGPoint();p.x=clientX;p.y=clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):null;}
  const midpoint=()=>{const pair=[...pointers.values()];return {x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2,distance:Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y)};};
  svg.addEventListener('wheel',event=>{event.preventDefault();const point=at(event.clientX,event.clientY);if(!point)return;const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?400:1);applyView(zoomView(view,Math.exp(Math.max(-.5,Math.min(.5,delta*.0018))),point));},{passive:false});
  root.querySelectorAll('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>applyView(zoomView(view,button.dataset.mapZoom==='in'?.72:1/.72))));
  root.querySelector('[data-map-world]').addEventListener('click',event=>{if([base,`${base}/`].includes(window.location.hash)){event.preventDefault();applyView(fitRegion({kind:'world'}));}});
  if(!geographicOnly)root.querySelectorAll('[data-map-style]').forEach(button=>button.addEventListener('click',()=>{applyStyle(button.dataset.mapStyle);try{localStorage.setItem('tobias.travel-map.style.v1',style);}catch{};}));
  svg.addEventListener('click',event=>{
    if(suppressClick){event.preventDefault();suppressClick=false;return;}
    const marker=event.target.closest('[data-pin-id]');
    if(marker){event.preventDefault();onMarkerClick(marker.dataset.pinId);return;}
    if(isAdding()){event.preventDefault();const point=at(event.clientX,event.clientY);const location=point&&unproject(point.x,point.y);if(location)onChoosePoint(location);else announce('请在世界地图的轮廓内选择位置。');}
  });
  svg.addEventListener('keydown',event=>{const marker=event.target.closest('[data-pin-id]');if(marker&&['Enter',' '].includes(event.key)){event.preventDefault();onMarkerClick(marker.dataset.pinId);}});
  svg.addEventListener('pointerdown',event=>{
    if(!pointers.size)suppressClick=false;
    if(event.button!==0||isAdding())return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const center=midpoint();pinch={...center,view:{...view},anchor:at(center.x,center.y)};drag=null;svg.setPointerCapture(event.pointerId);}
    else if(!event.target.closest('[data-pin-id]'))drag={id:event.pointerId,x:event.clientX,y:event.clientY,view:{...view},moved:false};
  });
  svg.addEventListener('pointermove',event=>{
    const country=event.target.closest('[data-country]'),landmark=event.target.closest('[data-landmark-id]');
    if(country)showCountry(countryById.get(country.dataset.country));
    else if(landmark)showCountry(countryById.get(LANDMARK_CATALOG.find(item=>item.id===landmark.dataset.landmarkId)?.country));
    if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch&&pointers.size>=2){const center=midpoint();const next=zoomView(pinch.view,pinch.distance/Math.max(1,center.distance),pinch.anchor);const m=svg.getScreenCTM();if(m){next.x=Math.max(0,Math.min(1000-next.width,next.x-(center.x-pinch.x)/m.a));next.y=Math.max(0,Math.min(500-next.height,next.y-(center.y-pinch.y)/m.d));}applyView(next);suppressClick=true;return;}
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<5)return;
    drag.moved=true;svg.setPointerCapture(event.pointerId);
    const m=svg.getScreenCTM();if(!m)return;
    applyView({...view,x:Math.max(0,Math.min(1000-view.width,drag.view.x-dx/m.a)),y:Math.max(0,Math.min(500-view.height,drag.view.y-dy/m.d))});
  });
  function finish(event){pointers.delete(event.pointerId);if(drag?.moved||pinch)suppressClick=true;drag=null;pinch=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);}
  svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',event=>{finish(event);suppressClick=false;});
  svg.addEventListener('pointerleave',()=>{if(!pointers.size)showCountry(region.kind==='country'?region:null);});
  root.querySelector('[data-country-search]')?.addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();let found=0;root.querySelectorAll('[data-country-entry]').forEach(link=>{link.hidden=!link.dataset.countryKey.includes(query);if(!link.hidden)found++;});root.querySelector('[data-country-empty]').hidden=found>0;});
  const observer=new ResizeObserver(drawLandmarks);observer.observe(svg);
  root.querySelectorAll('.map-hover-label,.map-zoom,.map-detail-status,.map-cartoon-hint,.map-disclaimer').forEach(element=>observer.observe(element));
  window.addEventListener('site-language-change',drawLandmarks);
  showCountry(region.kind==='country'?region:null);applyStyle(style);applyView(view);
  return {getView:()=>({...view}),destroy:()=>{pointers.clear();observer.disconnect();detail.destroy();lakes.destroy();window.removeEventListener('site-language-change',drawLandmarks);}};
}
