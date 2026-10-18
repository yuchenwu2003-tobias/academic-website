import {DESTINATIONS} from './destination-catalog.js?v=20261018-profile';
import {countryById} from './geography.js?v=20261018-profile';
import {toTraditional,countrySearchAliases} from './i18n.js?v=20261018-profile';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textKey=value=>String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[’']/g,'');
const extraCountries={sgp:{name:'新加坡',english:'Singapore'},mdv:{name:'马尔代夫',english:'Maldives'}};
const countryFor=place=>countryById.get(place.country)||extraCountries[place.country]||{name:place.country.toUpperCase(),english:''};
export const destinationPinId=place=>`destination-${place.id}`;

export function destinationsInRegion(region={kind:'world'}) {
  return DESTINATIONS.filter(place=>region.kind==='country'?place.country===region.id:region.kind==='continent'?place.continent===region.id:true)
    .sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name,'zh-CN'));
}

export function searchDestinations(candidates,query='',kind='all') {
  const words=textKey(query.trim()).split(/\s+/).filter(Boolean);
  return candidates.filter(place=>{
    if(kind!=='all'&&place.kind!==kind)return false;
    const country=countryFor(place);
    const searchable=textKey(`${place.name} ${place.english} ${country.name} ${country.english} ${toTraditional(`${place.name} ${country.name}`)} ${countrySearchAliases(place.country)}`);
    return words.every(word=>searchable.includes(word));
  });
}

export function findDestinationPin(place,pins) {
  // Country wishes use country identity. City/sight pins keep their own identity
  // and nearby-point matching, including older pins without a kind field.
  if(place.kind==='country') {
    const countryId=place.countryId||place.country;
    return countryId?pins.find(pin=>pin.kind==='country'&&pin.countryId===countryId):undefined;
  }
  return pins.find(pin=>{
    if(pin.kind==='country')return false;
    if([place.id,place.pinId,destinationPinId(place),`source-${place.id}`].filter(Boolean).includes(pin.id))return true;
    const radians=Math.PI/180;
    const deltaLat=(pin.lat-place.lat)*radians;
    const deltaLon=(pin.lon-place.lon)*radians;
    const a=Math.sin(deltaLat/2)**2+Math.cos(pin.lat*radians)*Math.cos(place.lat*radians)*Math.sin(deltaLon/2)**2;
    return 6371000*2*Math.asin(Math.sqrt(Math.min(1,a)))<=150;
  });
}

export function renderDestinationPicker(region,compact=false) {
  if(compact)return '';
  const candidates=destinationsInRegion(region);
  return `<section class="destination-picker" data-destination-picker aria-label="一键添加旅行目的地">
    <div class="destination-picker-heading"><div><span class="section-kicker mono">A LITTLE INSPIRATION</span><h2>挑一个地方，放进心愿。</h2><p>${region.kind==='world'?'从世界各地的城市与地标开始。':`看看${esc(region.name)}的城市与地标。`}坐标已准备好，点击即可添加。</p></div><span class="destination-total mono">${candidates.length} PLACES</span></div>
    <div class="destination-picker-tools"><div class="destination-kind-tabs" role="group" aria-label="目的地类型"><button type="button" data-destination-kind="all" aria-pressed="true">全部</button><button type="button" data-destination-kind="city" aria-pressed="false">城市</button><button type="button" data-destination-kind="landmark" aria-pressed="false">地标与风景</button></div><label class="destination-search"><span aria-hidden="true">⌕</span><input type="search" data-destination-search placeholder="搜索城市、地标或国家…" aria-label="搜索城市、地标或国家" autocomplete="off"></label></div>
    <div class="destination-results-summary"><span data-destination-count role="status"></span><p data-destination-feedback role="status"></p></div>
    <div class="destination-pick-grid" data-destination-results></div>
    <div class="destination-picker-bottom"><button type="button" class="text-link" data-destination-more hidden>再看看更多 <span>↓</span></button><p>城市坐标为中心参考点。<a href="assets/destinations-attribution.txt" target="_blank" rel="noopener noreferrer">坐标来源 ↗</a></p></div>
  </section>`;
}

export function mountDestinationPicker(root,{region,getPins,onAdd}) {
  const panel=root.querySelector('[data-destination-picker]');
  if(!panel)return {update(){},destroy(){}};
  const candidates=destinationsInRegion(region),byId=new Map(candidates.map(place=>[place.id,place]));
  const search=panel.querySelector('[data-destination-search]');
  const results=panel.querySelector('[data-destination-results]');
  const count=panel.querySelector('[data-destination-count]');
  const feedback=panel.querySelector('[data-destination-feedback]');
  const more=panel.querySelector('[data-destination-more]');
  let limit=12,kind='all';
  function update() {
    const matches=searchDestinations(candidates,search.value,kind),pins=getPins();
    const visible=matches.slice(0,limit);
    count.textContent=matches.length?`找到 ${matches.length} 个地点 · 显示 ${visible.length} 个`:'暂时没有匹配的地点';
    results.innerHTML=visible.length?visible.map(place=>{
      const added=findDestinationPin(place,pins),country=countryFor(place);
      return `<article class="destination-pick-card ${added?'is-added':''}"><div class="destination-pick-meta"><span>${place.kind==='city'?'城市':'地标与风景'}</span><span>${esc(country.name)}</span></div><h3>${esc(place.name)}</h3><p class="destination-english">${esc(place.english)}</p><button type="button" class="destination-pick-add" data-destination-add="${esc(place.id)}" ${added?'disabled':''} aria-label="${esc(place.name)}${added?'，已在地图中':'，加入旅行心愿'}"><span aria-hidden="true">${added?'✓':'＋'}</span> ${added?'已在地图中':'加入心愿'}</button></article>`;
    }).join(''):`<p class="destination-pick-empty">${candidates.length?'试试其他地名，或切换到“全部”。':'这里还没有预置地点。你仍然可以搜索地名，或在地图上放置标记。'}</p>`;
    more.hidden=visible.length>=matches.length;
    if(!more.hidden)more.innerHTML=`再看看更多 <span>↓</span><small>还有 ${matches.length-visible.length} 个</small>`;
  }
  function onSearch(){limit=12;update();}
  function onClick(event) {
    const filter=event.target.closest('[data-destination-kind]');
    if(filter){kind=filter.dataset.destinationKind;limit=12;panel.querySelectorAll('[data-destination-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button===filter)));update();return;}
    if(event.target.closest('[data-destination-more]')){limit+=12;update();return;}
    const button=event.target.closest('[data-destination-add]');
    if(!button||button.disabled)return;
    const place=byId.get(button.dataset.destinationAdd);
    if(!place)return;
    try {
      const result=onAdd({...place,kind:'city'});
      feedback.textContent=result.saved?`已把「${place.name}」加入心愿，可在地图上点击标记编辑。`:`「${place.name}」暂存在本页，浏览器未能保存。请导出地图备份。`;
      feedback.classList.toggle('is-warning',!result.saved);
      update();
    }catch(error){feedback.textContent=error.message;feedback.classList.add('is-warning');update();}
  }
  search.addEventListener('input',onSearch);panel.addEventListener('click',onClick);
  update();
  return {update,destroy(){search.removeEventListener('input',onSearch);panel.removeEventListener('click',onClick);}};
}
