import {countryPlaces,countryPlaceById,countryMatchesQuery} from './country-destinations.js';
import {DESTINATIONS} from './destination-catalog.js';
import {destinationPinId,findDestinationPin} from './destination-picker.js';
import {countryById,pinCountry} from './geography.js';
import {toTraditional,countrySearchAliases} from './i18n.js';

export const DESIRE_RATING_LABELS=['未评分','随缘','有点想去','值得计划','很想去','非去不可'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ratingOf=pin=>Number.isInteger(pin?.desireRating)&&pin.desireRating>=0&&pin.desireRating<=5?pin.desireRating:0;
const textKey=text=>String(text??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().trim();
const newPin=place=>({id:place.kind==='country'?place.pinId:destinationPinId(place),title:place.name,kind:place.kind==='country'?'country':'city',...(place.kind==='country'?{countryId:place.countryId}:{}),lat:place.lat,lon:place.lon,note:'',status:'want',guides:[],desireRating:0});

// Keep country identity and city/place identity separate. In particular, a
// country's value is never copied from or averaged across its cities.
export function travelRatingRows(pins=[]){
  const saved=Array.isArray(pins)?pins:[];
  const country=countryPlaces.map(place=>{
    const existing=findDestinationPin(place,saved);
    return {key:`country:${place.countryId}`,kind:'country',countryId:place.countryId,title:existing?.title||place.name,english:place.english,place,pin:existing||newPin(place),saved:!!existing,rating:ratingOf(existing)};
  });
  const matched=new Set();
  const city=DESTINATIONS.map(source=>{
    const place={...source,kind:'city'};
    const existing=findDestinationPin(place,saved);
    if(existing)matched.add(existing.id);
    return {key:`city:${destinationPinId(place)}`,kind:'city',countryId:place.country,title:existing?.title||place.name,english:place.english,place,pin:existing||newPin(place),saved:!!existing,rating:ratingOf(existing)};
  });
  for(const pin of saved){
    if(pin.kind==='country'||matched.has(pin.id))continue;
    city.push({key:`city:custom:${pin.id}`,kind:'city',countryId:pinCountry(pin),title:pin.title,english:'',place:null,pin,saved:true,rating:ratingOf(pin)});
  }
  return {country,city};
}

function matches(row,query){
  const words=textKey(query).split(/\s+/).filter(Boolean);
  if(!words.length)return true;
  if(row.kind==='country'&&countryMatchesQuery(countryPlaceById.get(row.countryId),query))return true;
  const country=countryPlaceById.get(row.countryId);
  const names=`${row.title} ${row.english} ${country?.name||''} ${country?.english||''} ${countrySearchAliases(row.countryId)}`;
  const haystack=textKey(`${names} ${toTraditional(names)}`);
  return words.every(word=>haystack.includes(word));
}

export function selectTravelRatingRows(rows,{scope='saved',query='',sort='desc'}={}){
  return rows.filter(row=>(scope==='all'||row.saved)&&matches(row,query)).slice().sort((a,b)=>{
    if(!a.rating!==!b.rating)return a.rating? -1:1;
    return (sort==='asc'?a.rating-b.rating:b.rating-a.rating)||a.title.localeCompare(b.title,'zh-CN')||a.key.localeCompare(b.key);
  });
}

export function ratedTravelPin(row,value){
  if(!Number.isInteger(value)||value<0||value>5)throw new Error('请选择 0 至 5 之间的想去程度。');
  if(!row.saved&&value===0)return null;
  return {...row.pin,kind:row.kind,...(row.kind==='country'?{countryId:row.countryId}:{}),desireRating:value};
}

function cards(rows){
  return rows.map(row=>{
    const country=countryPlaceById.get(row.countryId);
    const guide=row.kind==='country'?`#/travel/guide/country/${encodeURIComponent(row.countryId)}`:row.saved?`#/travel/guide/place/${encodeURIComponent(row.pin.id)}`:null;
    const countryMap=!guide&&countryById.has(row.countryId)?`#/travel/country/${encodeURIComponent(row.countryId)}`:null;
    const options=DESIRE_RATING_LABELS.map((label,value)=>`<option value="${value}" ${value===row.rating?'selected':''}>${value} · ${label}</option>`).join('');
    return `<article class="travel-rating-card ${row.saved?'is-saved':''}"><div class="travel-rating-meta"><span>${row.kind==='country'?'国家':esc(country?.name||'自定义地点')}</span><span>${row.saved?'已收藏':'未收藏'}</span></div><h2${row.saved?' data-i18n-skip':''}>${esc(row.title)}</h2>${row.english?`<p class="travel-rating-english">${esc(row.english)}</p>`:''}<div class="travel-rating-stars" aria-hidden="true">${'★'.repeat(row.rating)}<span>${'☆'.repeat(5-row.rating)}</span></div><label class="travel-rating-control"><span>有多想去</span><select data-rating-key="${esc(row.key)}" aria-label="${esc(row.title)}，有多想去">${options}</select></label><div class="travel-rating-card-bottom">${guide?`<a href="${guide}">查看攻略 <span>↗</span></a>`:countryMap?`<a href="${countryMap}">查看国家地图 <span>↗</span></a>`:`<button type="button" data-rating-add="${esc(row.key)}">加入心愿 <span>＋</span></button>`}<span>${row.rating?`${row.rating} / 5`:'未评分'}</span></div></article>`;
  }).join('');
}

export function renderTravelRatings(pins=[]){
  const rows=travelRatingRows(pins);
  const initial=selectTravelRatingRows(rows.country).slice(0,24);
  return `<section class="travel-ratings-page" data-travel-ratings><header class="page-heading"><span class="section-kicker mono">PLACES ON MY MIND</span><h1>有多想去<span>。</span></h1><p>国家是一份向往，城市与景点是另一份。分别打分，慢慢排出下一程。</p></header><div class="travel-ratings-tabs" role="tablist" aria-label="评分对象"><button type="button" role="tab" data-ratings-tab="country" aria-selected="true" aria-controls="travel-rating-results">国家</button><button type="button" role="tab" data-ratings-tab="city" aria-selected="false" aria-controls="travel-rating-results">城市与景点</button></div><div class="travel-ratings-tools"><div class="travel-ratings-scope" role="group" aria-label="目录范围"><button type="button" data-ratings-scope="saved" aria-pressed="true">已收藏</button><button type="button" data-ratings-scope="all" aria-pressed="false">全部目录</button></div><label class="travel-ratings-search"><span class="sr-only">搜索国家、城市或景点</span><input type="search" data-ratings-search placeholder="搜索国家、城市或景点…" autocomplete="off"></label><label class="travel-ratings-sort"><span class="sr-only">评分排序</span><select data-ratings-sort aria-label="评分排序"><option value="desc">想去程度：高到低</option><option value="asc">想去程度：低到高</option></select></label></div><p class="travel-ratings-help">1 分随缘，5 分非去不可；0 为未评分。为目录地点评分时，会将它加入心愿。</p><div class="travel-ratings-status"><span data-ratings-count role="status"></span><p data-ratings-feedback role="status"></p></div><div class="travel-ratings-grid" id="travel-rating-results" data-ratings-results role="tabpanel" aria-label="国家评分">${cards(initial)}</div><button type="button" class="text-link travel-ratings-more" data-ratings-more hidden>显示更多 <span>↓</span></button></section>`;
}

export function mountTravelRatings(root,{getPins,onSave}){
  const panel=root?.querySelector('[data-travel-ratings]');
  if(!panel)return ()=>{};
  const grid=panel.querySelector('[data-ratings-results]');
  const search=panel.querySelector('[data-ratings-search]');
  const sort=panel.querySelector('[data-ratings-sort]');
  const count=panel.querySelector('[data-ratings-count]');
  const feedback=panel.querySelector('[data-ratings-feedback]');
  const more=panel.querySelector('[data-ratings-more]');
  const states={country:{scope:'saved',query:'',sort:'desc',limit:24},city:{scope:'saved',query:'',sort:'desc',limit:24}};
  let kind='country',saving=false,stopped=false;
  function update(){
    if(stopped)return;
    const state=states[kind];
    const all=travelRatingRows(getPins())[kind];
    const matches=selectTravelRatingRows(all,state);
    const visible=matches.slice(0,state.limit);
    panel.querySelectorAll('[data-ratings-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.ratingsTab===kind)));
    panel.querySelectorAll('[data-ratings-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ratingsScope===state.scope)));
    search.value=state.query;sort.value=state.sort;
    grid.setAttribute('aria-label',kind==='country'?'国家评分':'城市与景点评分');
    count.textContent=`${matches.length} 个结果 · ${all.filter(row=>row.saved&&row.rating>0).length} 个已评分`;
    grid.innerHTML=visible.length?cards(visible):`<div class="travel-ratings-empty"><span aria-hidden="true">✳</span><p>${state.scope==='saved'?'这里还没有收藏的地点。切换到“全部目录”，选一个开始评分。':'没有匹配的地点，试试其他名字。'}</p></div>`;
    grid.querySelectorAll('[data-rating-key],[data-rating-add]').forEach(control=>{control.disabled=saving;});
    more.hidden=visible.length>=matches.length;
  }
  async function save(key,value,explicitAdd=false){
    if(saving||stopped)return;
    const row=Object.values(travelRatingRows(getPins())).flat().find(item=>item.key===key);
    if(!row)return;
    let pin=ratedTravelPin(row,value);
    if(!pin&&explicitAdd)pin={...row.pin,kind:row.kind,desireRating:0};
    if(!pin){feedback.textContent='选择 1 至 5 分，会将这个地点加入心愿。';update();return;}
    saving=true;feedback.textContent='正在保存…';update();
    try{
      const result=await onSave(pin);
      if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error(result?.error?.message||result?.error||result?.message||'评分未保存，请重试。');
      if(stopped)return;
      feedback.textContent=result?.saved===false?'评分暂存在本页，浏览器未能保存。请导出地图备份。':explicitAdd?'已加入心愿，可以查看地点攻略。':value?`已将「${row.title}」设为 ${value} 分。`:`已清除「${row.title}」的评分，地点仍保留在地图中。`;
      feedback.classList.toggle('is-warning',result?.saved===false);
    }catch(error){if(!stopped){feedback.textContent=error.message||'评分未保存，请重试。';feedback.classList.add('is-warning');}}
    finally{saving=false;update();}
  }
  function onClick(event){
    const tab=event.target.closest('[data-ratings-tab]');
    if(tab){kind=tab.dataset.ratingsTab;feedback.textContent='';update();return;}
    const scope=event.target.closest('[data-ratings-scope]');
    if(scope){states[kind].scope=scope.dataset.ratingsScope;states[kind].limit=24;update();return;}
    if(event.target.closest('[data-ratings-more]')){states[kind].limit+=24;update();return;}
    const add=event.target.closest('[data-rating-add]');
    if(add)void save(add.dataset.ratingAdd,0,true);
  }
  function onChange(event){
    if(event.target.matches('[data-rating-key]')){void save(event.target.dataset.ratingKey,Number(event.target.value));return;}
    if(event.target===sort){states[kind].sort=sort.value;states[kind].limit=24;update();}
  }
  function onInput(){states[kind].query=search.value;states[kind].limit=24;update();}
  panel.addEventListener('click',onClick);panel.addEventListener('change',onChange);search.addEventListener('input',onInput);
  update();
  return ()=>{stopped=true;panel.removeEventListener('click',onClick);panel.removeEventListener('change',onChange);search.removeEventListener('input',onInput);};
}
