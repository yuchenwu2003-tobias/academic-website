import {CONTINENTS,COUNTRIES,continentById,countryById,fitRegion,zoomView,regionHref} from './geography.js';
import {WORLD_OUTLINE,GRATICULE,project,unproject} from './projection.js';
import {LANDMARKS} from './landmarks.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hrefFor=(country,region)=>region.kind==='world'?`#/travel/continent/${country.continent}`:`#/travel/country/${country.id}`;
function countryShapes(region) {
  const groups=region.kind==='world'?CONTINENTS:COUNTRIES;
  return groups.map(item=>{
    const countries=region.kind==='world'?COUNTRIES.filter(c=>c.continent===item.id):[item];
    const continent=region.kind==='world'?item:continentById.get(item.continent);
    const isRelevant=region.kind==='world'||(region.kind==='continent'?item.continent===region.id:item.id===region.id);
    const href=region.kind==='world'?`#/travel/continent/${item.id}`:`#/travel/country/${item.id}`;
    return `<a href="${href}" data-geo-route class="geo-country-group ${isRelevant?'is-relevant':'is-muted'}" aria-label="${esc(item.name)}，${region.kind==='world'?'进入大洲':'查看国家或地区'}页面" style="--continent-color:${continent.color}">${countries.map(country=>`<path class="geo-country" d="${country.d}" fill-rule="evenodd" data-country="${country.id}"><title>${esc(country.name)} · ${esc(continent.name)}</title></path>`).join('')}</a>`;
  }).join('');
}
function continentLabels(region) {
  if(region.kind!=='world')return '';
  return CONTINENTS.map(continent=>`<a href="#/travel/continent/${continent.id}" data-geo-route aria-label="进入${esc(continent.name)}" class="continent-label" data-anchor-x="${continent.label[0]}" data-anchor-y="${continent.label[1]}" transform="translate(${continent.label.join(' ')})"><rect x="-39" y="-14" width="78" height="36" rx="4"/><text text-anchor="middle" y="1">${esc(continent.name)} <tspan>↗</tspan></text><text class="continent-label-en" text-anchor="middle" y="14">${esc(continent.english.toUpperCase())}</text></a>`).join('');
}
function landmarks(region) {
  const relevant=LANDMARKS.filter(item=>region.kind==='world'||(region.kind==='country'?item.country===region.id:countryById.get(item.country)?.continent===region.id));
  return relevant.map(item=>{const p=project(item.lat,item.lon);return `<a href="#/travel/country/${item.country}" data-geo-route class="map-landmark" data-anchor-x="${p.x}" data-anchor-y="${p.y}" transform="translate(${p.x} ${p.y})" aria-label="${esc(item.title)}，查看${esc(countryById.get(item.country)?.name||'国家')}页面"><title>${esc(item.title)}</title><use href="assets/landmarks.svg#${item.id}" x="-22" y="-53" width="44" height="50"/><text text-anchor="middle" y="9">${esc(item.title)}</text></a>`;}).join('');
}
export function renderMapScene(region={kind:'world'},compact=false) {
  const v=fitRegion(region);
  return `<div class="map-style-bar"><div class="map-style-switch" role="group" aria-label="地图显示模式"><button data-map-style="geographic" aria-pressed="true">地理地图</button><button data-map-style="cartoon" aria-pressed="false">插画地图 <span>✳</span></button></div><span class="map-gesture-hint">滚轮缩放 · 拖拽移动 · 点击${region.kind==='world'?'大洲':'国家'}</span></div><div class="map-stage"><svg class="world-map" data-world-map viewBox="${v.x} ${v.y} ${v.width} ${v.height}" role="group" aria-label="Equal Earth 互动地图，支持滚轮缩放、拖拽、点击大洲和国家"><defs><clipPath id="earth-clip"><path d="${WORLD_OUTLINE}"/></clipPath></defs><rect width="1000" height="500" class="map-canvas"/><path class="map-ocean" d="${WORLD_OUTLINE}"/><g clip-path="url(#earth-clip)"><path class="map-graticule" d="${GRATICULE}"/>${countryShapes(region)}</g><g class="continent-labels">${continentLabels(region)}</g><g class="cartoon-landmarks">${landmarks(region)}</g><g class="map-markers" data-map-markers></g></svg><div class="map-hover-label" data-map-hover>${esc(region.name||'世界')} <span>· Equal Earth</span></div><div class="map-zoom" role="group" aria-label="地图缩放"><button data-map-zoom="in" aria-label="放大地图">＋</button><output class="map-scale" data-map-scale aria-label="缩放比例">100%</output><button data-map-zoom="out" aria-label="缩小地图">−</button><button data-map-reset aria-label="重置地图视图">⌂</button></div><div class="map-placement-hint" data-map-hint hidden>点击地图，放下你的 📌 <button data-map-cancel>取消</button></div></div>`;
}
export function renderRegionDirectory(region,compact=false) {
  if(compact||region.kind==='country')return '';
  if(region.kind==='world')return `<section class="geo-directory" aria-labelledby="continents-heading"><div class="geo-directory-title"><h2 id="continents-heading">七个大洲，七种出发。</h2><span>在地图或下方选择一洲，继续探索</span></div><div class="continent-grid">${CONTINENTS.map((c,i)=>`<a class="continent-card" href="#/travel/continent/${c.id}" style="--continent-color:${c.color}"><span class="mono">0${i+1} / ${esc(c.english.toUpperCase())}</span><h3>${esc(c.name)} <span>↗</span></h3><p>${COUNTRIES.filter(country=>country.continent===c.id).length} 个国家与地区入口</p></a>`).join('')}</div></section>`;
  const countries=COUNTRIES.filter(c=>c.continent===region.id).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  return `<section class="geo-directory" aria-labelledby="countries-heading"><div class="geo-directory-title"><h2 id="countries-heading">继续走进一个国家。</h2><label class="geo-country-search"><span class="sr-only">搜索${esc(region.name)}国家与地区</span><input type="search" data-country-search placeholder="搜索国家或地区…" autocomplete="off"></label></div><div class="country-directory">${countries.map(c=>`<a class="country-directory-link" data-country-entry data-country-key="${esc(`${c.name} ${c.english}`.toLowerCase())}" href="#/travel/country/${c.id}"><span>${esc(c.name)}</span><small>${esc(c.english)}</small><span class="country-link-arrow">↗</span></a>`).join('')}</div><p class="country-search-empty" hidden data-country-empty>没有找到，换个关键词试试。</p></section>`;
}
export function mountMapScene(root,{region,onViewChange,onMarkerClick,onChoosePoint,isAdding,announce}) {
  const svg=root.querySelector('[data-world-map]');
  let view=fitRegion(region),style='geographic',suppressClick=false,drag=null,pinch=null;
  const pointers=new Map();
  try{if(localStorage.getItem('tobias.travel-map.style.v1')==='cartoon')style='cartoon';}catch{}
  function applyStyle(value){style=value;root.dataset.mapStyle=value;root.querySelectorAll('[data-map-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapStyle===value)));}
  function applyView(next){view=next;svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);root.querySelector('[data-map-scale]').value=`${Math.round(100000/view.width)}%`;root.classList.toggle('map-is-zoomed',view.width<450);svg.querySelectorAll('[data-anchor-x]').forEach(el=>el.setAttribute('transform',`translate(${el.dataset.anchorX} ${el.dataset.anchorY}) scale(${view.width/1000})`));onViewChange({...view});}
  function at(clientX,clientY){const p=svg.createSVGPoint();p.x=clientX;p.y=clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):null;}
  const midpoint=()=>{const pair=[...pointers.values()];return {x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2,distance:Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y)};};
  svg.addEventListener('wheel',event=>{event.preventDefault();const point=at(event.clientX,event.clientY);if(!point)return;const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?400:1);applyView(zoomView(view,Math.exp(Math.max(-.5,Math.min(.5,delta*.0018))),point));},{passive:false});
  root.querySelectorAll('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>applyView(zoomView(view,button.dataset.mapZoom==='in'?.72:1/.72))));
  root.querySelector('[data-map-reset]').addEventListener('click',()=>applyView(fitRegion(region)));
  root.querySelectorAll('[data-map-style]').forEach(button=>button.addEventListener('click',()=>{applyStyle(button.dataset.mapStyle);try{localStorage.setItem('tobias.travel-map.style.v1',style);}catch{};}));
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
    const country=event.target.closest('[data-country]');if(country)root.querySelector('[data-map-hover]').textContent=countryById.get(country.dataset.country)?.name||region.name;
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
  svg.addEventListener('pointerleave',()=>{if(!pointers.size)root.querySelector('[data-map-hover]').textContent=region.name||'世界';});
  root.querySelector('[data-country-search]')?.addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();let found=0;root.querySelectorAll('[data-country-entry]').forEach(link=>{link.hidden=!link.dataset.countryKey.includes(query);if(!link.hidden)found++;});root.querySelector('[data-country-empty]').hidden=found>0;});
  applyStyle(style);applyView(view);
  return {getView:()=>({...view}),destroy:()=>{pointers.clear();}};
}
