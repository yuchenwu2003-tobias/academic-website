import {countryPlaces,countryPlaceById,countryMatchesQuery} from './country-destinations.js?v=20261018-profile';
import {DESTINATIONS} from './destination-catalog.js?v=20261018-profile';
import {destinationPinId,findDestinationPin} from './destination-picker.js?v=20261018-profile';
import {CONTINENTS,countryById,pinCountry} from './geography.js?v=20261018-profile';
import {toTraditional,countrySearchAliases} from './i18n.js?v=20261018-profile';

export const DESIRE_RATING_LABELS=['未评分','随缘','有点想去','值得计划','很想去','非去不可'];
export const RECOMMENDATION_RATING_LABELS=['未评分','不太推荐','一般','值得一去','很推荐','强烈推荐'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ratingField=pin=>pin?.status==='visited'?'recommendationRating':'desireRating';
const ratingOf=pin=>{const value=pin?.[ratingField(pin)];return Number.isInteger(value)&&value>=0&&value<=5?value:0;};
const textKey=text=>String(text??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().trim();
const newPin=place=>({id:place.kind==='country'?place.pinId:destinationPinId(place),title:place.name,kind:place.kind==='country'?'country':'city',...(place.kind==='country'?{countryId:place.countryId}:{}),lat:place.lat,lon:place.lon,note:'',status:'want',guides:[],desireRating:0});
const continentOrder=new Map(CONTINENTS.map((continent,index)=>[continent.id,index]));
const compareRows=sort=>(a,b)=>{
  if(!a.rating!==!b.rating)return a.rating?-1:1;
  return (sort==='asc'?a.rating-b.rating:b.rating-a.rating)||a.title.localeCompare(b.title,'zh-CN')||a.key.localeCompare(b.key);
};

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
  return rows.filter(row=>(scope==='all'||row.saved)&&matches(row,query)).slice().sort(compareRows(sort));
}

// A country's existing geographic classification is used consistently for
// transcontinental places. Unknown locations remain visible in a final group.
// Paginate after grouping so a country's cities stay next to each other.
export function groupTravelRatingRows(rows,{kind='country',sort='desc',limit=Infinity}={}){
  const continents=new Map();
  for(const row of rows){
    const id=row.countryId||pinCountry(row.pin);
    const country=countryPlaceById.get(id)||countryById.get(id);
    const continentId=[country?.continent,row.place?.continent].find(value=>continentOrder.has(value))||'other';
    let continent=continents.get(continentId);
    if(!continent){continent={id:continentId,title:CONTINENTS.find(item=>item.id===continentId)?.name||'其他地点',rows:[],countries:new Map(),total:0};continents.set(continentId,continent);}
    continent.total++;
    if(kind==='country'){continent.rows.push(row);continue;}
    const countryId=country?.id||'unassigned';
    let group=continent.countries.get(countryId);
    if(!group){group={id:countryId,title:country?.name||'国家或地区待确认',rows:[],total:0};continent.countries.set(countryId,group);}
    group.rows.push(row);group.total++;
  }
  let remaining=Number.isFinite(limit)?Math.max(0,Math.floor(limit)):Infinity;
  return [...continents.values()].sort((a,b)=>(continentOrder.get(a.id)??CONTINENTS.length)-(continentOrder.get(b.id)??CONTINENTS.length)).flatMap(continent=>{
    if(!remaining)return [];
    if(kind==='country'){
      const visible=continent.rows.slice().sort(compareRows(sort)).slice(0,remaining);remaining-=visible.length;
      return visible.length?[{...continent,rows:visible,countries:[],shown:visible.length}]:[];
    }
    const countries=[...continent.countries.values()].sort((a,b)=>a.title.localeCompare(b.title,'zh-CN')||a.id.localeCompare(b.id)).flatMap(country=>{
      if(!remaining)return [];
      const visible=country.rows.slice().sort(compareRows(sort)).slice(0,remaining);remaining-=visible.length;
      return visible.length?[{...country,rows:visible,shown:visible.length}]:[];
    });
    const shown=countries.reduce((sum,country)=>sum+country.shown,0);
    return shown?[{...continent,rows:[],countries,shown}]:[];
  });
}

export function ratedTravelPin(row,value){
  if(!Number.isInteger(value)||value<0||value>5)throw new Error('请选择 0 至 5 之间的评分。');
  if(!row.saved&&value===0)return null;
  return {...row.pin,kind:row.kind,...(row.kind==='country'?{countryId:row.countryId}:{}),[ratingField(row.pin)]:value};
}

function cards(rows,{heading='h3'}={}){
  return rows.map(row=>{
    const country=countryPlaceById.get(row.countryId);
    const visited=row.pin?.status==='visited',caption=visited?'有多推荐':'有多想去';
    const guide=row.kind==='country'?`#/travel/guide/country/${encodeURIComponent(row.countryId)}`:row.saved?`#/travel/guide/place/${encodeURIComponent(row.pin.id)}`:null;
    const countryMap=!guide&&countryById.has(row.countryId)?`#/travel/country/${encodeURIComponent(row.countryId)}`:null;
    const stars=(visited?RECOMMENDATION_RATING_LABELS:DESIRE_RATING_LABELS).slice(1).map((label,index)=>{const value=index+1;return `<button type="button" class="travel-rating-star ${value<=row.rating?'is-filled':''}" data-rating-key="${esc(row.key)}" data-rating-value="${value}" aria-pressed="${value===row.rating}" aria-label="${value} 分，${label}" title="${value} 分，${label}"><span aria-hidden="true">★</span></button>`;}).join('');
    return `<article class="travel-rating-card ${row.saved?'is-saved':''}"><div class="travel-rating-meta"><span>${row.kind==='country'?'国家':esc(country?.name||'自定义地点')}</span><span>${visited?'去过':'想去'}</span></div><${heading}${row.saved?' data-i18n-skip':''}>${esc(row.title)}</${heading}>${row.english?`<p class="travel-rating-english">${esc(row.english)}</p>`:''}<div class="travel-rating-control"><div class="travel-rating-control-heading"><span>${caption}</span><span class="travel-rating-value">${row.rating?`${row.rating} / 5`:'未评分'}</span></div><div class="travel-rating-actions"><div class="travel-rating-stars" role="group" aria-label="${esc(row.title)}，${caption}" data-rating-group>${stars}</div></div></div><div class="travel-rating-card-bottom">${guide?`<a href="${guide}">查看攻略 <span>↗</span></a>`:countryMap?`<a href="${countryMap}">查看国家地图 <span>↗</span></a>`:`<button type="button" data-rating-add="${esc(row.key)}">加入心愿 <span>＋</span></button>`}</div></article>`;
  }).join('');
}

function groupedCards(groups,kind){
  const count=group=>`<span class="travel-rating-group-count">${group.shown===group.total?group.total:`${group.shown} / ${group.total}`}</span>`;
  return groups.map(continent=>`<section class="travel-rating-continent" data-rating-continent="${esc(continent.id)}"><div class="travel-rating-group-heading"><h2>${esc(continent.title)}</h2>${count(continent)}</div>${kind==='country'?`<div class="travel-rating-cards">${cards(continent.rows)}</div>`:continent.countries.map(country=>`<section class="travel-rating-country" data-rating-country="${esc(country.id)}"><div class="travel-rating-country-heading"><h3>${esc(country.title)}</h3>${count(country)}</div><div class="travel-rating-cards">${cards(country.rows,{heading:'h4'})}</div></section>`).join('')}</section>`).join('');
}

export function renderTravelRatings(pins=[]){
  const rows=travelRatingRows(pins);
  const initial=groupTravelRatingRows(selectTravelRatingRows(rows.country),{limit:24});
  return `<section class="travel-ratings-page" data-travel-ratings><header class="page-heading"><span class="section-kicker mono">PLACES ON MY MIND</span><h1>旅行评分<span>。</span></h1><p>想去的地点，记录向往；去过的地点，留下推荐。按大洲与国家整理自己的旅行清单。</p></header><div class="travel-ratings-tabs" role="tablist" aria-label="评分对象"><button type="button" role="tab" data-ratings-tab="country" aria-selected="true" aria-controls="travel-rating-results">国家</button><button type="button" role="tab" data-ratings-tab="city" aria-selected="false" aria-controls="travel-rating-results">城市与景点</button></div><div class="travel-ratings-tools"><label class="travel-ratings-search"><span class="sr-only">搜索国家、城市或景点</span><input type="search" data-ratings-search placeholder="搜索国家、城市或景点…" autocomplete="off"></label><div class="travel-ratings-sort" role="group" aria-label="评分排序"><button type="button" data-ratings-sort="desc" aria-pressed="true">评分高到低</button><button type="button" data-ratings-sort="asc" aria-pressed="false">评分低到高</button></div></div><p class="travel-ratings-help"><span>单击评分，双击清除。</span><span class="sr-only">键盘按 Enter 或空格评分，按 Delete 或退格清除。</span>想去的地点评向往程度，去过的地点评推荐程度。两种评分分别保存。</p><div class="travel-ratings-status"><span data-ratings-count role="status"></span><p data-ratings-feedback role="status"></p></div><div class="travel-ratings-grid" id="travel-rating-results" data-ratings-results role="tabpanel" aria-label="国家评分">${groupedCards(initial,'country')}</div><button type="button" class="text-link travel-ratings-more" data-ratings-more hidden>显示更多 <span>↓</span></button></section>`;
}

export function mountTravelRatings(root,{getPins,onSave}){
  const panel=root?.querySelector('[data-travel-ratings]');
  if(!panel)return ()=>{};
  const grid=panel.querySelector('[data-ratings-results]');
  const search=panel.querySelector('[data-ratings-search]');
  const count=panel.querySelector('[data-ratings-count]');
  const feedback=panel.querySelector('[data-ratings-feedback]');
  const more=panel.querySelector('[data-ratings-more]');
  const states={country:{query:'',sort:'desc',limit:24},city:{query:'',sort:'desc',limit:24}};
  let kind='country',saving=false,stopped=false;
  const pendingClicks=new Map();
  const clickDelay=400;
  let lastDouble={key:null,time:0};
  function cancelPending(key){
    const entries=key===undefined?[...pendingClicks]:[[key,pendingClicks.get(key)]];
    for(const [id,pending]of entries){if(!pending)continue;clearTimeout(pending.timer);preview(pending.group);pendingClicks.delete(id);}
  }
  function update(){
    if(stopped)return;
    const state=states[kind];
    const all=travelRatingRows(getPins())[kind];
    const matches=selectTravelRatingRows(all,state);
    const groups=groupTravelRatingRows(matches,{kind,sort:state.sort,limit:state.limit});
    const visibleCount=groups.reduce((sum,group)=>sum+group.shown,0);
    panel.querySelectorAll('[data-ratings-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.ratingsTab===kind)));
    panel.querySelectorAll('[data-ratings-sort]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ratingsSort===state.sort)));
    search.value=state.query;
    grid.setAttribute('aria-label',kind==='country'?'国家评分':'城市与景点评分');
    count.textContent=`${matches.length} 个结果 · ${all.filter(row=>row.saved&&row.rating>0).length} 个已评分`;
    grid.innerHTML=visibleCount?groupedCards(groups,kind):`<div class="travel-ratings-empty"><span aria-hidden="true">✳</span><p>${state.query?'没有匹配的地点，试试其他名字。':'这里还没有收藏的地点。先去旅行地图添加想去的国家、城市或景点。'}</p><a class="text-link" href="#/travel">前往旅行地图 <span>↗</span></a></div>`;
    grid.querySelectorAll('[data-rating-key],[data-rating-add]').forEach(control=>{control.disabled=saving;});
    more.hidden=visibleCount>=matches.length;
  }
  async function save(key,value,explicitAdd=false){
    if(saving||stopped)return;
    const row=Object.values(travelRatingRows(getPins())).flat().find(item=>item.key===key);
    if(!row)return;
    let pin=ratedTravelPin(row,value);
    if(!pin&&explicitAdd)pin={...row.pin,kind:row.kind,desireRating:0};
    if(!pin){feedback.textContent='选择 1 至 5 分，会将这个地点加入心愿。';update();return;}
    saving=true;feedback.textContent='正在保存…';
    grid.querySelectorAll('[data-rating-key],[data-rating-add]').forEach(control=>{control.disabled=true;});
    try{
      const result=await onSave(pin);
      if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error(result?.error?.message||result?.error||result?.message||'评分未保存，请重试。');
      if(stopped)return;
      feedback.textContent=result?.saved===false?'评分暂存在本页，浏览器未能保存。请导出地图备份。':explicitAdd?'已加入心愿，可以查看地点攻略。':value?`已将「${row.title}」设为 ${value} 分。`:`已清除「${row.title}」的评分，地点仍保留在地图中。`;
      feedback.classList.toggle('is-warning',result?.saved===false);
    }catch(error){if(!stopped){feedback.textContent=error.message||'评分未保存，请重试。';feedback.classList.add('is-warning');}}
    finally{
      saving=false;update();
      // Updating the sorted cards replaces their controls. Keep keyboard focus
      // on the chosen star (or the first star after clearing) after the save.
      if(!stopped){const focused=[...grid.querySelectorAll('[data-rating-key]')].find(button=>button.dataset.ratingKey===key&&Number(button.dataset.ratingValue)===(value||1));focused?.focus({preventScroll:true});preview(focused?.closest('[data-rating-group]'));}
    }
  }
  function clearDouble(key){
    if(lastDouble.key===key&&Date.now()-lastDouble.time<500)return;
    cancelPending(key);lastDouble={key,time:Date.now()};void save(key,0);
  }
  function scheduleRating(star,event){
    const key=star.dataset.ratingKey,value=Number(star.dataset.ratingValue);
    if(event.detail===0){cancelPending(key);void save(key,value);return;}
    const previous=pendingClicks.get(key);
    // Detect two taps ourselves as touch browsers need not emit dblclick. No
    // write or card replacement happens between the two taps.
    if(event.detail>1||(previous&&previous.value===value&&Date.now()-previous.time<=clickDelay)){clearDouble(key);return;}
    cancelPending(key);
    const pending={value,time:Date.now(),group:star.closest('[data-rating-group]')};
    preview(pending.group,value);
    function commit(){
      if(stopped||pendingClicks.get(key)!==pending)return;
      if(saving){pending.timer=setTimeout(commit,30);return;}
      pendingClicks.delete(key);void save(key,value);
    }
    pending.timer=setTimeout(commit,clickDelay);pendingClicks.set(key,pending);
  }
  function onClick(event){
    const star=event.target.closest('[data-rating-value]');
    if(star){if(!star.disabled)scheduleRating(star,event);return;}
    const tab=event.target.closest('[data-ratings-tab]');
    if(tab){cancelPending();kind=tab.dataset.ratingsTab;feedback.textContent='';update();return;}
    const sort=event.target.closest('[data-ratings-sort]');
    if(sort){const next=sort.dataset.ratingsSort;if(['asc','desc'].includes(next)){cancelPending();states[kind].sort=next;states[kind].limit=24;update();}return;}
    if(event.target.closest('[data-ratings-more]')){cancelPending();states[kind].limit+=24;update();return;}
    const add=event.target.closest('[data-rating-add]');
    if(add)void save(add.dataset.ratingAdd,0,true);
  }
  function onDoubleClick(event){const star=event.target.closest('[data-rating-value]');if(star&&!star.disabled){event.preventDefault();clearDouble(star.dataset.ratingKey);}}
  function preview(group,value=0){
    if(!group)return;
    group.classList.toggle('is-previewing',value>0);
    group.querySelectorAll('[data-rating-value]').forEach(button=>button.classList.toggle('is-preview-active',Number(button.dataset.ratingValue)<=value));
  }
  function onPreview(event){
    const star=event.target.closest('[data-rating-value]');
    if(star&&!star.disabled)preview(star.closest('[data-rating-group]'),Number(star.dataset.ratingValue));
  }
  function onPreviewEnd(event){
    const group=event.target.closest('[data-rating-group]');
    if(group&&event.relatedTarget?.closest?.('[data-rating-group]')!==group){const key=group.querySelector('[data-rating-key]')?.dataset.ratingKey;preview(group,pendingClicks.get(key)?.value||0);}
  }
  function onKeyDown(event){
    const star=event.target.closest('[data-rating-value]');
    if(!star||star.disabled)return;
    if(['Enter',' ','Delete','Backspace'].includes(event.key)){
      event.preventDefault();cancelPending(star.dataset.ratingKey);
      if(!event.repeat)void save(star.dataset.ratingKey,['Delete','Backspace'].includes(event.key)?0:Number(star.dataset.ratingValue));
      return;
    }
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const current=Number(star.dataset.ratingValue);
    const value=event.key==='Home'?1:event.key==='End'?5:Math.max(1,Math.min(5,current+(['ArrowRight','ArrowUp'].includes(event.key)?1:-1)));
    star.closest('[data-rating-group]')?.querySelector(`[data-rating-value="${value}"]`)?.focus();
  }
  function onInput(){cancelPending();states[kind].query=search.value;states[kind].limit=24;update();}
  const events={click:onClick,dblclick:onDoubleClick,pointerover:onPreview,pointerout:onPreviewEnd,focusin:onPreview,focusout:onPreviewEnd,keydown:onKeyDown};
  Object.entries(events).forEach(([type,listener])=>panel.addEventListener(type,listener));search.addEventListener('input',onInput);
  update();
  return ()=>{cancelPending();stopped=true;Object.entries(events).forEach(([type,listener])=>panel.removeEventListener(type,listener));search.removeEventListener('input',onInput);};
}
