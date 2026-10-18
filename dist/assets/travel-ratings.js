import {renderMapVisibility,mountMapVisibility} from './map-visibility.js?v=20261018-ratings-final';
import {renderTravelTrips,mountTravelTrips} from './travel-trips.js?v=20261018-ratings-final';
import {renderResidenceEditor,mountResidenceEditor} from './residence.js?v=20261018-ratings-final';
import {isExperienced,pinStatusLabel,residencePeriod} from './map-model.js?v=20261018-ratings-final';
import {countryPlaces,countryPlaceById,countryMatchesQuery} from './country-destinations.js?v=20261018-ratings-final';
import {DESTINATIONS} from './destination-catalog.js?v=20261018-ratings-final';
import {destinationPinId,findDestinationPin} from './destination-picker.js?v=20261018-ratings-final';
import {CONTINENTS,countryById,pinCountry} from './geography.js?v=20261018-ratings-final';
import {toTraditional,countrySearchAliases} from './i18n.js?v=20261018-ratings-final';
import {getTravelTrips} from './trip-model.js?v=20261018-ratings-final';
import {getPlaceMedia} from './place-media.js?v=20261018-ratings-final';

export const DESIRE_RATING_LABELS=['未评分','随缘','有点想去','值得计划','很想去','非去不可'];
export const RECOMMENDATION_RATING_LABELS=['未评分','不太推荐','一般','值得一去','很推荐','强烈推荐'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ratingField=pin=>isExperienced(pin)?'recommendationRating':'desireRating';
const ratingOf=pin=>{const value=pin?.[ratingField(pin)];return Number.isInteger(value)&&value>=0&&value<=5?value:0;};
const textKey=text=>String(text??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().trim();
const newPin=place=>({id:place.kind==='country'?place.pinId:destinationPinId(place),title:place.name,kind:place.kind==='country'?'country':'city',...(place.kind==='country'?{countryId:place.countryId}:{}),lat:place.lat,lon:place.lon,note:'',status:'want',guides:[],desireRating:0});
const continentOrder=new Map(CONTINENTS.map((continent,index)=>[continent.id,index]));
const sortValue=(row,criterion)=>criterion==='desire'?Number(row.pin?.desireRating||0):criterion==='visited'?Number(isExperienced(row.pin)):criterion==='visits'?Number(row.visitCount||0):row.rating;
const compareRows=(sort,criterion='rating')=>(a,b)=>{
  const av=sortValue(a,criterion),bv=sortValue(b,criterion);
  if(['rating','desire'].includes(criterion)&&!av!==!bv)return av?-1:1;
  return (sort==='asc'?av-bv:bv-av)||a.title.localeCompare(b.title,'zh-CN')||a.key.localeCompare(b.key);
};

export function travelVisitCounts(pins=[],trips=[]){
  const places=new Map(pins.map(pin=>[pin.id,pin])),cities=new Map(),countries=new Map();
  for(const trip of trips){
    const seenCities=new Set(),seenCountries=new Set();
    for(const stop of trip.stops||[]){
      if(!seenCities.has(stop.pinId)){cities.set(stop.pinId,(cities.get(stop.pinId)||0)+1);seenCities.add(stop.pinId);}
      const country=stop.countryId||pinCountry(places.get(stop.pinId));
      if(country)seenCountries.add(country);
    }
    for(const country of seenCountries)countries.set(country,(countries.get(country)||0)+1);
  }
  return {cities,countries};
}

// Keep country identity and city/place identity separate. In particular, a
// country's value is never copied from or averaged across its cities.
export function travelRatingRows(pins=[],trips=getTravelTrips()){
  const saved=Array.isArray(pins)?pins:[];
  const visits=travelVisitCounts(saved,trips);
  const linkedCountries=new Map();
  for(const pin of saved){if(pin.kind==='country')continue;const id=pinCountry(pin);if(id)linkedCountries.set(id,(linkedCountries.get(id)||0)+1);}
  const country=countryPlaces.map(place=>{
    const existing=findDestinationPin(place,saved);
    const linkedCount=linkedCountries.get(place.countryId)||0;
    return {key:`country:${place.countryId}`,kind:'country',countryId:place.countryId,title:existing?.title||place.name,english:place.english,place,pin:existing||newPin(place),saved:!!existing||linkedCount>0,explicit:!!existing,includedByPlaces:!existing&&linkedCount>0,linkedCount,rating:ratingOf(existing)};
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
  for(const row of country)row.visitCount=visits.countries.get(row.countryId)||0;
  for(const row of city)row.visitCount=visits.cities.get(row.pin.id)||0;
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

export function selectTravelRatingRows(rows,{scope='saved',query='',sort='desc',criterion='rating'}={}){
  return rows.filter(row=>(scope==='all'||row.saved)&&matches(row,query)).slice().sort(compareRows(sort,criterion));
}

// A country's existing geographic classification is used consistently for
// transcontinental places. Unknown locations remain visible in a final group.
// Paginate after grouping so a country's cities stay next to each other.
export function groupTravelRatingRows(rows,{kind='country',sort='desc',criterion='rating',limit=Infinity}={}){
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
      const visible=continent.rows.slice().sort(compareRows(sort,criterion)).slice(0,remaining);remaining-=visible.length;
      return visible.length?[{...continent,rows:visible,countries:[],shown:visible.length}]:[];
    }
    const countries=[...continent.countries.values()].sort((a,b)=>a.title.localeCompare(b.title,'zh-CN')||a.id.localeCompare(b.id)).flatMap(country=>{
      if(!remaining)return [];
      const visible=country.rows.slice().sort(compareRows(sort,criterion)).slice(0,remaining);remaining-=visible.length;
      return visible.length?[{...country,rows:visible,shown:visible.length}]:[];
    });
    const shown=countries.reduce((sum,country)=>sum+country.shown,0);
    return shown?[{...continent,rows:[],countries,shown}]:[];
  });
}

export function ratedTravelPin(row,value){
  if(!Number.isInteger(value)||value<0||value>5)throw new Error('请选择 0 至 5 之间的评分。');
  if((!row.saved||row.explicit===false)&&value===0)return null;
  return {...row.pin,kind:row.kind,...(row.kind==='country'?{countryId:row.countryId}:{}),[ratingField(row.pin)]:value};
}

function cards(rows,{heading='h3'}={}){
  return rows.map(row=>{
    const country=countryPlaceById.get(row.countryId);
    const visited=isExperienced(row.pin),caption=visited?'有多推荐':'有多想去';
    const guide=row.kind==='country'?'#/travel/guide/country/'+encodeURIComponent(row.countryId):row.saved?'#/travel/guide/place/'+encodeURIComponent(row.pin.id):null;
    const stars=(visited?RECOMMENDATION_RATING_LABELS:DESIRE_RATING_LABELS).slice(1).map((label,index)=>{const value=index+1;return '<button type="button" class="travel-rating-star '+(value<=row.rating?'is-filled':'')+'" data-rating-key="'+esc(row.key)+'" data-rating-value="'+value+'" aria-pressed="'+(value===row.rating)+'" aria-label="'+value+' 分，'+label+'" title="'+value+' 分，'+label+'"><span aria-hidden="true">★</span></button>';}).join('');
    const media='<figure class="travel-rating-photo" data-ratings-media="'+esc(row.key)+'"><a class="travel-rating-photo-link" href="'+esc(guide||'#/travel')+'" aria-label="'+esc(row.title)+'，查看资料"><img data-rating-image alt="'+esc(row.title)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" hidden><span class="travel-rating-photo-placeholder" data-rating-photo-placeholder><span aria-hidden="true">▧</span><span>图片加载中…</span></span></a><a class="travel-rating-photo-credit" data-rating-photo-credit target="_blank" rel="noopener noreferrer" hidden>图片及许可说明</a></figure>';
    return '<article class="travel-rating-card '+(row.saved?'is-saved':'')+'" data-rating-card="'+esc(row.key)+'">'+media+'<div class="travel-rating-card-body"><div class="travel-rating-title-block"><div class="travel-rating-meta"><span>'+(row.kind==='country'?'国家':esc(country?.name||'自定义地点'))+'</span><span>'+(row.includedByPlaces?'有已标记地点':pinStatusLabel(row.pin))+'</span></div><'+heading+(row.saved?' data-i18n-skip':'')+'>'+esc(row.title)+'</'+heading+'>'+(row.english?'<p class="travel-rating-english">'+esc(row.english)+'</p>':'')+'<p class="travel-rating-visit-count"><span>行程记录</span> <strong>'+row.visitCount+'</strong> <span>次</span>'+(visited&&!row.visitCount?' · <span>去过，次数待记录</span>':'')+'</p></div><div class="travel-rating-control"><div class="travel-rating-control-heading"><span>'+caption+'</span><span class="travel-rating-value">'+(row.rating?row.rating+' / 5':'未评分')+'</span></div><div class="travel-rating-actions"><div class="travel-rating-stars" role="group" aria-label="'+esc(row.title)+'，'+caption+'" data-rating-group>'+stars+'</div></div><div class="travel-rating-visit" role="group" aria-label="旅行状态">'+[['want','还没去过'],['visited','去过'],['resident','居住'],['want-resident','想要居住']].map(([status,label])=>'<button type="button" data-rating-visit="'+esc(row.key)+'" data-visit-status="'+status+'" aria-pressed="'+(!row.includedByPlaces&&row.pin.status===status)+'">'+label+'</button>').join('')+'</div>'+renderResidenceEditor(row.pin)+renderMapVisibility(row.pin)+'</div><div class="travel-rating-card-bottom">'+(guide?'<a href="'+guide+'">查看攻略 <span>↗</span></a>':'<button type="button" data-rating-add="'+esc(row.key)+'">加入心愿 <span>＋</span></button>')+'</div></div></article>';
  }).join('');
}

function groupedCards(groups,kind,isOpen=()=>false,searching=false,view='cards'){
  const count=group=>'<span class="travel-rating-group-count">'+group.total+'</span>';
  return groups.map(continent=>{
    const key=kind+':continent:'+continent.id,color=CONTINENTS.find(item=>item.id===continent.id)?.color||'#89937d';
    const countries=kind==='country'?'<div class="travel-rating-cards">'+cards(continent.rows,{heading:'h4'})+'</div>':continent.countries.map(country=>{
      const countryKey=kind+':country:'+country.id,fold=view==='list',tag=fold?'details':'section',heading=fold?'summary':'div';
      return '<'+tag+' class="travel-rating-country" data-rating-country="'+esc(country.id)+'"'+(fold?' data-ratings-disclosure="'+countryKey+'"'+(searching||isOpen(countryKey)?' open':''):'')+'><'+heading+' class="travel-rating-country-heading"><h4>'+esc(country.title)+'</h4>'+count(country)+(fold?'<span class="rating-disclosure-arrow" aria-hidden="true">⌄</span>':'')+'</'+heading+'><div class="travel-rating-cards">'+cards(country.rows,{heading:'h5'})+'</div></'+tag+'>';
    }).join('');
    return '<section class="travel-rating-continent" data-rating-continent="'+esc(continent.id)+'" style="--rating-continent-color:'+esc(color)+'"><div class="travel-rating-group-heading"><span class="travel-rating-continent-dot" aria-hidden="true"></span><h3>'+esc(continent.title)+'</h3>'+count(continent)+'</div>'+countries+'</section>';
  }).join('');
}

function continentButtons(rows,state){
  const groups=groupTravelRatingRows(selectTravelRatingRows(rows[state.kind],state),{kind:state.kind});
  return '<button type="button" data-ratings-continent="all" aria-pressed="'+(state.continent==='all')+'">全部大洲</button>'+groups.map(group=>'<button type="button" data-ratings-continent="'+esc(group.id)+'" aria-pressed="'+(state.continent===group.id)+'" style="--rating-continent-color:'+esc(CONTINENTS.find(continent=>continent.id===group.id)?.color||'#89937d')+'"><span>'+esc(group.title)+'</span><small>'+group.total+'</small></button>').join('');
}

function ratingSections(rows,state,isOpen){
  return [state.kind||'country'].map(kind=>{
    const selected=selectTravelRatingRows(rows[kind],state),key='kind:'+kind;
    const groups=groupTravelRatingRows(selected,{kind,sort:state.sort,criterion:state.criterion}).filter(group=>!state.continent||state.continent==='all'||group.id===state.continent);
    return '<div class="travel-ratings-category-content">'+(groups.length?groupedCards(groups,kind,isOpen,!!state.query,state.view):'<p class="travel-ratings-empty">'+(state.query?'没有匹配的地点，试试其他名字。':'这里还没有收藏的地点。先去旅行地图添加想去的国家、城市或景点。')+'</p>')+'</div>';
  }).join('');
}

export function renderTravelRatings(pins=[],{kind='country'}={}){
  const rows=travelRatingRows(pins),state={query:'',sort:'desc',criterion:'desire',kind,continent:'all'};
  return '<section class="travel-ratings-page" data-travel-ratings><header class="page-heading"><span class="section-kicker mono">PLACES ON MY MIND</span><h1>旅行评分<span>。</span></h1><p>想去的地点，记录向往；去过的地点，留下推荐。按大洲与国家整理自己的旅行清单。</p></header>'+renderTravelTrips()+'<nav class="travel-ratings-page-nav" aria-label="评分页面"><a href="#/travel/ratings/countries"'+(kind==='country'?' aria-current="page"':'')+'><span>国家</span><small>'+rows.country.filter(row=>row.saved).length+'</small></a><a href="#/travel/ratings/places"'+(kind==='city'?' aria-current="page"':'')+'><span>城市与景点</span><small>'+rows.city.filter(row=>row.saved).length+'</small></a></nav><div class="travel-ratings-continents" data-ratings-continents role="group" aria-label="选择大洲">'+continentButtons(rows,state)+'</div><div class="travel-ratings-tools"><label class="travel-ratings-search"><span class="sr-only">搜索国家、城市或景点</span><input type="search" data-ratings-search placeholder="搜索国家、城市或景点…" autocomplete="off"></label><div class="travel-ratings-modes" role="group" aria-label="展示方式"><button type="button" data-ratings-mode="cards" aria-pressed="true"><span aria-hidden="true">▦</span> 卡片</button><button type="button" data-ratings-mode="list" aria-pressed="false"><span aria-hidden="true">☷</span> 列表</button></div></div><div class="travel-ratings-order"><div class="travel-ratings-sort" role="group" aria-label="评分排序"><button type="button" data-ratings-criterion="desire" aria-pressed="true">想去程度</button><button type="button" data-ratings-criterion="visited" aria-pressed="false">是否去过</button><button type="button" data-ratings-criterion="visits" aria-pressed="false">去过次数</button><button type="button" data-ratings-criterion="rating" aria-pressed="false">当前评分</button></div><div class="travel-ratings-sort" role="group" aria-label="排序方向"><button type="button" data-ratings-sort="desc" aria-pressed="true">从高到低 ↓</button><button type="button" data-ratings-sort="asc" aria-pressed="false">从低到高 ↑</button></div></div><p class="travel-ratings-help"><span>单击评分，双击清除。</span><span class="sr-only">键盘按 Enter 或空格评分，按 Delete 或退格清除。</span>点击大洲按钮切换。各分组内排序，去过次数按行程记录统计，同一行程中的同一国家只计一次。</p><div class="travel-ratings-status"><span data-ratings-count role="status"></span><p data-ratings-feedback role="status"></p></div><div class="travel-ratings-grid" id="travel-rating-results" data-ratings-results data-ratings-view="cards" aria-label="旅行评分清单">'+ratingSections(rows,state,key=>key==='kind:city')+'</div><button type="button" data-ratings-more hidden>显示更多</button></section>';
}

export function mountTravelRatings(root,{getPins,onSave,kind='country'}){
  const panel=root?.querySelector('[data-travel-ratings]');
  if(!panel)return ()=>{};
  const grid=panel.querySelector('[data-ratings-results]');
  const search=panel.querySelector('[data-ratings-search]');
  const count=panel.querySelector('[data-ratings-count]');
  const feedback=panel.querySelector('[data-ratings-feedback]');
  const more=panel.querySelector('[data-ratings-more]');
  const state={query:'',sort:'desc',criterion:'desire',view:'cards',kind,continent:'all'};
  const openGroups=new Map([['kind:city',true]]);
  const mediaCache=new Map();let mediaSession,visibilityEditor;
  let saving=false,stopped=false,residenceEditors=[];
  const pendingClicks=new Map();
  const clickDelay=400;
  let lastDouble={key:null,time:0};
  function cancelPending(key){
    const entries=key===undefined?[...pendingClicks]:[[key,pendingClicks.get(key)]];
    for(const [id,pending]of entries){if(!pending)continue;clearTimeout(pending.timer);preview(pending.group);pendingClicks.delete(id);}
  }
  function loadPhotos(){
    mediaSession?.controller.abort();mediaSession?.observer?.disconnect();
    if(state.view!=='cards'||typeof IntersectionObserver==='undefined')return;
    const session={controller:new AbortController(),queue:[],running:0};mediaSession=session;
    const rows=Object.values(travelRatingRows(getPins())).flat();
    const byKey=new Map(rows.map(row=>[row.key,row]));
    const identity=pin=>[pin.id,pin.title,pin.photoUrl||'',pin.wikipediaUrl||''].join('|');
    function paint(figure,media){
      if(stopped||session!==mediaSession||!figure.isConnected)return;
      const image=figure.querySelector('[data-rating-image]'),placeholder=figure.querySelector('[data-rating-photo-placeholder]'),credit=figure.querySelector('[data-rating-photo-credit]');
      if(media.imageUrl){image.src=media.imageUrl;image.hidden=false;placeholder.hidden=true;}else placeholder.innerHTML='<span aria-hidden="true">▧</span><span>暂无图片，可在资料卡片中添加。</span>';
      if(media.imageCreditUrl){credit.href=media.imageCreditUrl;credit.textContent=media.imageCreditLabel||'图片及许可说明';credit.hidden=false;}
    }
    function drain(){
      while(session.running<3&&session.queue.length&&!session.controller.signal.aborted){
        const {figure,row}=session.queue.shift();session.running++;
        getPlaceMedia(row.pin,{signal:session.controller.signal}).then(media=>{if(session.controller.signal.aborted)return;mediaCache.set(identity(row.pin),media);paint(figure,media);}).catch(error=>{if(error.name!=='AbortError')paint(figure,{});}).finally(()=>{session.running--;drain();});
      }
    }
    session.observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const figure=entry.target,row=byKey.get(figure.dataset.ratingsMedia);session.observer.unobserve(figure);if(!row)continue;const cached=mediaCache.get(identity(row.pin));if(cached)paint(figure,cached);else session.queue.push({figure,row});}drain();},{rootMargin:'160px'});
    grid.querySelectorAll('[data-ratings-media]').forEach(figure=>session.observer.observe(figure));
  }
  function update(){
    if(stopped)return;
    const rows=travelRatingRows(getPins());
    const selected=groupTravelRatingRows(selectTravelRatingRows(rows[kind],state),{kind}).filter(group=>state.continent==='all'||group.id===state.continent).flatMap(group=>kind==='country'?group.rows:group.countries.flatMap(country=>country.rows));
    const continents=panel.querySelector('[data-ratings-continents]');if(continents)continents.innerHTML=continentButtons(rows,state);
    panel.querySelectorAll('[data-ratings-sort]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ratingsSort===state.sort)));
    panel.querySelectorAll('[data-ratings-criterion]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ratingsCriterion===state.criterion)));
    panel.querySelectorAll('[data-ratings-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ratingsMode===state.view)));
    search.value=state.query;grid.dataset.ratingsView=state.view;
    count.textContent=selected.length+' 个结果 · '+selected.filter(row=>row.rating>0).length+' 个已评分';
    residenceEditors.forEach(editor=>editor.destroy());residenceEditors=[];
    grid.innerHTML=ratingSections(rows,state,key=>openGroups.get(key)===true);
    grid.querySelectorAll('[data-rating-key],[data-rating-add],[data-rating-visit]').forEach(control=>{control.disabled=saving;});
    for(const form of grid.querySelectorAll('[data-residence-form]'))residenceEditors.push(mountResidenceEditor(form,{getPin:()=>getPins().find(pin=>pin.id===form.dataset.residencePinId),onSave}));
    more.hidden=true;visibilityEditor?.refresh();loadPhotos();
  }
  function onToggle(event){const element=event.target;if(element.matches?.('[data-ratings-disclosure]')){if(!state.query)openGroups.set(element.dataset.ratingsDisclosure,element.open);if(!element.open)cancelPending();}}
  function onImageError(event){const image=event.target;if(!image.matches?.('[data-rating-image]'))return;image.hidden=true;const placeholder=image.closest('figure')?.querySelector('[data-rating-photo-placeholder]');if(placeholder){placeholder.hidden=false;placeholder.innerHTML='<span aria-hidden="true">▧</span><span>图片暂不可用</span>';}}


  async function save(key,value,explicitAdd=false,visitStatus=null){
    if(saving||stopped)return;
    const row=Object.values(travelRatingRows(getPins())).flat().find(item=>item.key===key);
    if(!row)return;
    let pin=visitStatus?{...row.pin,status:visitStatus}:ratedTravelPin(row,value);
    if(!pin&&explicitAdd)pin={...row.pin,kind:row.kind,desireRating:0};
    if(!pin){feedback.textContent='选择 1 至 5 分，会将这个地点加入心愿。';update();return;}
    saving=true;feedback.textContent='正在保存…';
    grid.querySelectorAll('[data-rating-key],[data-rating-add],[data-rating-visit]').forEach(control=>{control.disabled=true;});
    try{
      const result=await onSave(pin);
      if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error(result?.error?.message||result?.error||result?.message||'评分未保存，请重试。');
      if(stopped)return;
      feedback.textContent=result?.saved===false?'评分暂存在本页，浏览器未能保存。请导出地图备份。':visitStatus?(visitStatus==='want-resident'?'已设为想要居住，可以评价想去程度。':visitStatus==='resident'?'已设为居住，现在可以评价推荐程度。':visitStatus==='visited'?'已设为去过，现在可以评价推荐程度。':'已设为还没去过，现在可以评价想去程度。'):explicitAdd?'已加入心愿，可以查看地点攻略。':value?`已将「${row.title}」设为 ${value} 分。`:`已清除「${row.title}」的评分，地点仍保留在地图中。`;
      feedback.classList.toggle('is-warning',result?.saved===false);
    }catch(error){if(!stopped){feedback.textContent=error.message||'评分未保存，请重试。';feedback.classList.add('is-warning');}}
    finally{
      saving=false;update();
      // Updating the sorted cards replaces their controls. Keep keyboard focus
      // on the chosen star (or the first star after clearing) after the save.
      if(!stopped){const focused=visitStatus?[...grid.querySelectorAll('[data-rating-visit]')].find(button=>button.dataset.ratingVisit===key&&button.dataset.visitStatus===visitStatus):[...grid.querySelectorAll('[data-rating-key]')].find(button=>button.dataset.ratingKey===key&&Number(button.dataset.ratingValue)===(value||1));focused?.focus({preventScroll:true});preview(focused?.closest('[data-rating-group]'));}
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
    const visit=event.target.closest('[data-rating-visit]');
    if(visit){const value=visit.dataset.visitStatus;if(!visit.disabled&&['want','visited','resident','want-resident'].includes(value)){cancelPending(visit.dataset.ratingVisit);void save(visit.dataset.ratingVisit,0,false,value);}return;}
    const star=event.target.closest('[data-rating-value]');
    if(star){if(!star.disabled)scheduleRating(star,event);return;}
    const continent=event.target.closest('[data-ratings-continent]');if(continent){cancelPending();state.continent=continent.dataset.ratingsContinent;update();return;}
    const mode=event.target.closest('[data-ratings-mode]');
    if(mode&&['cards','list'].includes(mode.dataset.ratingsMode)){cancelPending();state.view=mode.dataset.ratingsMode;update();return;}
    const criterion=event.target.closest('[data-ratings-criterion]');
    if(criterion&&['desire','visited','visits','rating'].includes(criterion.dataset.ratingsCriterion)){cancelPending();state.criterion=criterion.dataset.ratingsCriterion;update();return;}
    const sort=event.target.closest('[data-ratings-sort]');
    if(sort&&['asc','desc'].includes(sort.dataset.ratingsSort)){cancelPending();state.sort=sort.dataset.ratingsSort;update();return;}
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
  function onInput(){cancelPending();state.query=search.value;update();}
  const events={click:onClick,dblclick:onDoubleClick,pointerover:onPreview,pointerout:onPreviewEnd,focusin:onPreview,focusout:onPreviewEnd,keydown:onKeyDown};
  Object.entries(events).forEach(([type,listener])=>panel.addEventListener(type,listener));search.addEventListener('input',onInput);panel.addEventListener('toggle',onToggle,true);grid.addEventListener('error',onImageError,true);
  update();
  if([...grid.querySelectorAll('[data-map-visibility-value]')].some(button=>button.dataset?.mapVisibilityValue))visibilityEditor=mountMapVisibility(grid,{getPin:id=>Object.values(travelRatingRows(getPins())).flat().find(row=>row.pin.id===id)?.pin,onSave,onChanged:()=>{cancelPending();update();}});
  const tripCleanup=mountTravelTrips(panel,{getPins,onSave,onChanged:update});
  return ()=>{tripCleanup();cancelPending();stopped=true;visibilityEditor?.destroy();mediaSession?.controller.abort();mediaSession?.observer?.disconnect();panel.removeEventListener('toggle',onToggle,true);grid.removeEventListener('error',onImageError,true);residenceEditors.forEach(editor=>editor.destroy());Object.entries(events).forEach(([type,listener])=>panel.removeEventListener(type,listener));search.removeEventListener('input',onInput);};
}
