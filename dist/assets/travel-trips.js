import {getTravelTrips,tripName,commitTravelTrip,createTripStop} from './trip-model.js?v=20261018-wiki-details-final';
import {localPlaceMatches,searchOnlinePlaces,searchFocus} from './place-search.js?v=20261018-wiki-details-final';
import {findDestinationPin} from './destination-picker.js?v=20261018-wiki-details-final';
import {getPlaceMedia,placeGuideHref} from './place-media.js?v=20261018-wiki-details-final';
import {countryPlaces,countryPlaceById,countryMatchesQuery} from './country-destinations.js?v=20261018-wiki-details-final';
import {COUNTRY_FLAGS} from './country-flags.js?v=20261018-wiki-details-final';
import {countryById,pinCountry} from './geography.js?v=20261018-wiki-details-final';
import {pinStatusLabel,residencePeriod,residenceDuration,STORAGE_KEY} from './map-model.js?v=20261018-wiki-details-final';
import {toTraditional,translateText,placeNameSearchText} from './i18n.js?v=20261018-wiki-details-final';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=value=>toTraditional(String(value||'')).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const safe=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const states=[['want','想去'],['visited','去过'],['resident','居住'],['want-resident','想要居住']];
const countryOf=pin=>pinCountry(pin)||'other';
const countryName=id=>countryPlaceById.get(id)?.name||'其他地点';
export function tripCountryOptions(pins,{query='',all=false}={}){
  const counts=new Map();pins.filter(pin=>pin.kind!=='country').forEach(pin=>{const id=countryOf(pin);counts.set(id,(counts.get(id)||0)+1);});
  const countries=all?countryPlaces:countryPlaces.filter(place=>counts.has(place.id));
  const result=countries.filter(place=>countryMatchesQuery(place,query)).map(place=>({...place,count:counts.get(place.id)||0}));
  if(counts.has('other')&&(!query||key('其他地点').includes(key(query))))result.push({id:'other',name:'其他地点',english:'Other places',count:counts.get('other')});
  return result.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
}
export function tripCityOptions(records,{query='',country='all',selected=[]}={}){
  const selectedIds=new Set(selected),seen=new Set(),match=key(query.trim());
  return records.filter(record=>{
    const pin=record.pin;if(!pin||pin.kind==='country'||selectedIds.has(pin.id)||seen.has(pin.id))return false;
    if(country!=='all'&&countryOf(pin)!==country)return false;
    if(match&&!key(placeNameSearchText(pin.title)+' '+(record.english||'')+' '+countryName(countryOf(pin))).includes(match))return false;
    seen.add(pin.id);return true;
  });
}
export function renderTravelTrips({builder=false}={}){
  const html='<section class="travel-trips" data-travel-trips><div class="trip-section-heading"><div><span class="section-kicker mono">JOURNEYS & MEMORIES</span><h2>行程记录</h2></div><button type="button" class="map-add" data-trip-new>＋ 新建行程</button></div><p class="trip-help">按年份与地区命名，记录同一段旅途中的城市与评分。</p><div data-trip-list></div><p data-trip-message role="status"></p>'
  +'<dialog class="trip-dialog" data-trip-dialog aria-labelledby="trip-dialog-title"><form data-trip-form><div class="trip-dialog-top"><span class="mono">A JOURNEY TO REMEMBER</span><button type="button" data-trip-close aria-label="关闭行程编辑">×</button></div><h2 id="trip-dialog-title">新建行程</h2>'
  +'<div class="trip-name-fields"><label>年份<input name="year" type="number" min="1900" max="9999" required></label><label>地区<input name="region" maxlength="80" placeholder="例如：台湾、瑞士、日本关西" required></label></div><fieldset class="trip-month-field"><legend>月份（选填）</legend><div role="group" aria-label="行程月份"><button type="button" data-trip-month="" aria-pressed="true">未填写月份</button><button type="button" data-trip-month="1" aria-pressed="false">1 月</button><button type="button" data-trip-month="2" aria-pressed="false">2 月</button><button type="button" data-trip-month="3" aria-pressed="false">3 月</button><button type="button" data-trip-month="4" aria-pressed="false">4 月</button><button type="button" data-trip-month="5" aria-pressed="false">5 月</button><button type="button" data-trip-month="6" aria-pressed="false">6 月</button><button type="button" data-trip-month="7" aria-pressed="false">7 月</button><button type="button" data-trip-month="8" aria-pressed="false">8 月</button><button type="button" data-trip-month="9" aria-pressed="false">9 月</button><button type="button" data-trip-month="10" aria-pressed="false">10 月</button><button type="button" data-trip-month="11" aria-pressed="false">11 月</button><button type="button" data-trip-month="12" aria-pressed="false">12 月</button></div></fieldset><p class="trip-name-preview" data-trip-name data-i18n-skip></p>'
  +'<div class="trip-editor-columns"><section class="trip-city-picker"><h3>选择城市</h3><div class="trip-picker-tabs" role="group" aria-label="城市来源"><button type="button" data-trip-scope="saved" aria-pressed="true">已标记城市</button><button type="button" data-trip-scope="other" aria-pressed="false">搜索其他地点</button></div>'
  +'<label class="trip-country-search">选择游玩的国家／地区<input type="search" data-trip-country-query placeholder="搜索国家／地区…" autocomplete="off"></label><div class="trip-country-filters" data-trip-countries role="group" aria-label="游玩的国家／地区"></div><button type="button" class="text-link" data-trip-countries-more hidden>更多国家／地区</button>'
  +'<label class="trip-city-search">添加城市<input type="search" data-trip-query placeholder="搜索城市或景点…" autocomplete="off"></label><button type="button" class="text-link" data-trip-search hidden>搜索更多城市</button><p class="trip-help" data-trip-choice-count role="status"></p><div class="trip-city-results" data-trip-results></div><button type="button" class="text-link" data-trip-more hidden>显示更多城市</button></section>'
  +'<section class="trip-selected-cities"><div class="trip-selected-heading"><h3>本次行程的城市</h3><span><span>已选</span> <b data-trip-stop-count>0</b></span></div><p class="trip-help">标签默认保持原样。可在资料卡选择改动，保存行程时生效。</p><div data-trip-stops></div></section></div>'
  +'<p class="trip-error" data-trip-feedback role="status"></p><div class="trip-form-actions"><button type="button" class="text-link" data-trip-close>取消</button><button type="submit" class="map-add" data-trip-save>保存行程</button></div></form></dialog></section>';
  if(!builder)return html;
  const form=html.slice(html.indexOf('<dialog')).replace('<dialog class="trip-dialog"','<div class="trip-dialog trip-builder-surface"').replace('</dialog>','</div>').replace('<h3>选择城市</h3>','<h3>选择游玩的国家／地区</h3>');
  return '<section class="trip-builder-page" data-travel-trips><nav class="trip-builder-breadcrumb" aria-label="行程导航"><a href="#/travel/ratings">旅行评分</a><span> / </span><span>行程编辑</span></nav><div data-trip-list hidden></div><p data-trip-message role="status"></p>'+form;
}
export const renderTripBuilder=()=>renderTravelTrips({builder:true});
export function mountTravelTrips(root,{getPins,onSave,onChanged=()=>{},loadMedia=getPlaceMedia,searchPlaces=searchOnlinePlaces,builder=false,tripId=null}){
  const panel=root.querySelector('[data-travel-trips]');if(!panel)return ()=>{};
  const el=name=>panel.querySelector('[data-trip-'+name+']');
  const dialog=el('dialog'),form=el('form'),query=el('query'),countryQuery=el('country-query'),results=el('results'),stopsHost=el('stops'),feedback=el('feedback'),message=el('message'),save=el('save');
  let draft,choices=[],remote=[],controller,revision=0,saving=false,stopped=false,scope='saved',country='all',limit=12,countryLimit=12,mediaSession,countryChosen=!builder;
  const isOpen=()=>builder||dialog.open;
  const latest=stop=>getPins().find(pin=>pin.id===stop.pin.id)||stop.pin;
  function drawList(){
    const trips=getTravelTrips().slice().sort((a,b)=>b.year-a.year||(b.month||0)-(a.month||0)||a.region.localeCompare(b.region));
    el('list').innerHTML=trips.length?trips.map(trip=>'<article class="trip-record"><div class="trip-record-heading"><h3 data-i18n-skip>'+esc(tripName(trip))+'</h3><button type="button" class="text-link" data-trip-edit="'+esc(trip.id)+'">编辑行程</button></div><div class="trip-record-stops">'+trip.stops.map(stop=>{
      const pin=getPins().find(pin=>pin.id===stop.pinId);
      return '<div>'+(pin?'<a href="'+esc(placeGuideHref(pin))+'" data-i18n-skip>'+esc(stop.title)+'</a>':'<strong data-i18n-skip>'+esc(stop.title)+'</strong>')+'<span class="trip-stop-score" aria-label="'+stop.rating+' / 5">'+'★'.repeat(stop.rating)+'<i>'+'☆'.repeat(5-stop.rating)+'</i></span></div>';
    }).join('')+'</div></article>').join(''):'<p class="trip-empty">还没有行程，记录下一段故事。</p>';
  }
  function drawName(){el('name').textContent=(form.elements.year.value||translateText('年份'))+(draft?.month?'.'+String(draft.month).padStart(2,'0'):'')+' · '+(form.elements.region.value||translateText('地区'));panel.querySelectorAll('[data-trip-month]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tripMonth===(draft?.month?String(draft.month):''))));}
  function mediaMarkup(pin){
    const entry=mediaSession?.cache.get(pin.id),media=entry?.value,image=safe(media?.imageUrl),wiki=safe(media?.wikipediaUrl||pin.wikipediaUrl);
    return '<div class="trip-place-picture">'+(image?'<img src="'+esc(image)+'" alt="'+esc(pin.title)+'" loading="lazy" referrerpolicy="no-referrer" data-trip-place-image data-i18n-skip>':'')+'<span data-trip-image-placeholder '+(image?'hidden':'')+'>'+(entry?.pending?'正在寻找地点图片…':'暂时没有可用图片')+'</span></div><div class="trip-place-links">'+(wiki?'<a href="'+esc(wiki)+'" target="_blank" rel="noopener noreferrer">维基百科 ↗</a>':'')+(safe(media?.imageCreditUrl)?'<a href="'+esc(media.imageCreditUrl)+'" target="_blank" rel="noopener noreferrer">图片及许可说明</a>':'')+'</div>';
  }
  function choicePicture(pin){
    const image=safe(mediaSession?.cache.get(pin.id)?.value?.imageUrl);
    return image?'<img src="'+esc(image)+'" alt="" loading="lazy" referrerpolicy="no-referrer" data-trip-place-image><span class="trip-choice-photo-empty" data-trip-image-placeholder hidden aria-hidden="true">▧</span>':'<span class="trip-choice-photo-empty" aria-hidden="true">▧</span>';
  }
  function updateMedia(pin,session){
    if(stopped||session!==mediaSession||!isOpen())return;
    const card=[...stopsHost.querySelectorAll('[data-trip-stop-card]')].find(card=>card.dataset.tripStopCard===pin.id);
    const host=card?.querySelector('[data-trip-place-media]');if(host)host.innerHTML=mediaMarkup(pin);
    for(const picture of results.querySelectorAll('[data-trip-choice-media]'))if(picture.dataset.tripChoiceMedia===pin.id){picture.innerHTML=choicePicture(pin);const credit=picture.closest('article')?.querySelector('[data-trip-choice-credit]'),url=safe(session.cache.get(pin.id)?.value?.imageCreditUrl);if(credit&&url){credit.href=url;credit.hidden=false;}}
  }
  function drainMedia(session){
    while(session.running<3&&session.queue.length&&!session.controller.signal.aborted){
      const pin=session.queue.shift();session.running++;
      Promise.resolve().then(()=>loadMedia(pin,{signal:session.controller.signal})).then(value=>{
        if(!session.controller.signal.aborted){session.cache.set(pin.id,{value});updateMedia(pin,session);}
      }).catch(()=>{if(!session.controller.signal.aborted){session.cache.set(pin.id,{value:{}});updateMedia(pin,session);}})
      .finally(()=>{session.running--;drainMedia(session);});
    }
  }
  function ensureMedia(pin){if(!mediaSession.cache.has(pin.id)){mediaSession.cache.set(pin.id,{pending:true});mediaSession.queue.push(pin);drainMedia(mediaSession);}}
  function drawStops(focus){
    draft.stops.forEach(stop=>ensureMedia(latest(stop)));
    el('stop-count').textContent=String(draft.stops.length);
    stopsHost.innerHTML=draft.stops.length?draft.stops.map((stop,index)=>{
      const pin=latest(stop),status=stop.status??pin.status,changed=status!==pin.status;
      const guides=(pin.guides||[]).filter(guide=>safe(guide.url)).slice(0,3);
      return '<article class="trip-draft-stop" data-trip-stop-card="'+esc(pin.id)+'"><div class="trip-place-top"><div><span class="trip-place-country">'+esc(countryName(countryOf(pin)))+'</span><h4 data-i18n-skip>'+esc(pin.title)+'</h4></div><button type="button" data-trip-stop-remove="'+index+'" aria-label="'+esc(translateText('移除城市')+' '+pin.title)+'">×</button></div>'
      +'<div class="trip-place-overview"><div data-trip-place-media>'+mediaMarkup(pin)+'</div><div><p class="trip-city-note" data-i18n-skip>'+esc(pin.note||translateText('还没有个人介绍，留待慢慢补充。'))+'</p>'+(pin.status==='resident'&&residencePeriod(pin)?'<p class="trip-city-period" data-i18n-skip>'+esc(residencePeriod(pin))+' · '+esc(residenceDuration(pin))+'</p>':'')+(guides.length?'<div class="trip-card-guides">'+guides.map(guide=>'<a href="'+esc(guide.url)+'" target="_blank" rel="noopener noreferrer" data-i18n-skip>'+esc(guide.title)+' ↗</a>').join('')+'</div>':'')+'<a class="trip-profile-link" href="'+esc(placeGuideHref(pin))+'" target="_blank" rel="noopener noreferrer">查看完整资料 ↗</a></div></div>'
      +'<div class="trip-card-label"><span>地图标签</span><small>'+(changed?'保存时更新标签':'保留现有标签')+'</small></div><div class="trip-status-choices" role="group" aria-label="'+esc(pin.title+'，'+translateText('地图标签'))+'">'+states.map(([value,label])=>'<button type="button" data-trip-status="'+index+'" data-value="'+value+'" aria-pressed="'+(status===value)+'">'+label+'</button>').join('')+'</div>'
      +'<div class="trip-card-label"><span>本次行程推荐评分</span></div><div class="trip-score-stars" role="group" aria-label="'+esc(pin.title+'，'+translateText('本次行程推荐评分'))+'">'+Array.from({length:5},(_,i)=>'<button type="button" data-trip-score="'+index+'" data-value="'+(i+1)+'" class="'+(i<stop.rating?'is-filled':'')+'" aria-pressed="'+(stop.rating===i+1)+'" aria-label="'+esc((i+1)+' / 5')+'">★</button>').join('')+'<span>'+(stop.rating?stop.rating+' / 5':'请先评分')+'</span></div>'
      +'<button type="button" class="trip-score-sync" data-trip-sync="'+index+'" aria-pressed="'+stop.updateRecommendation+'"><span aria-hidden="true">'+(stop.updateRecommendation?'☑':'☐')+'</span> 更新地点的推荐评分</button><p class="trip-card-hint">未勾选时，只记录本次行程评分。</p></article>';
    }).join(''):'<p class="trip-empty">点选左侧城市，资料卡片会出现在这里。</p>';
    if(focus)stopsHost.querySelector(focus)?.focus({preventScroll:true});
  }
  function drawCountries(){
    const options=tripCountryOptions(getPins(),{query:countryQuery.value,all:scope==='other'||!!countryQuery.value.trim()});
    let visible=options.slice(0,countryLimit);if(country!=='all'&&!visible.some(option=>option.id===country)){const active=countryPlaceById.get(country)||{id:country,name:countryName(country),count:0};visible=[active,...visible];}
    el('countries').innerHTML='<button type="button" class="trip-country-tile" data-trip-country="all" aria-pressed="'+(countryChosen&&country==='all')+'"><span class="trip-country-world" aria-hidden="true">◎</span><span>全部</span></button>'+visible.map(place=>{const flag=COUNTRY_FLAGS[place.id];return '<button type="button" class="trip-country-tile" data-trip-country="'+esc(place.id)+'" aria-pressed="'+(countryChosen&&country===place.id)+'" aria-label="'+esc(translateText(place.name))+' '+place.count+'">'+(flag?.src?'<img src="'+esc(flag.src)+'" alt="" width="32" height="24" loading="lazy">':'<span class="trip-country-world" aria-hidden="true">◎</span>')+'<span data-i18n-skip>'+esc(translateText(place.name))+'</span><small><b>'+place.count+'</b> <span>个已标记城市</span></small></button>';}).join('');
    el('countries-more').hidden=options.length<=countryLimit;
  }
  function drawChoices(){
    const pins=getPins().filter(pin=>pin.kind!=='country'),region=countryById.has(country)?{kind:'country',...countryById.get(country)}:{kind:'world'};
    let records;
    if(scope==='saved')records=pins.map(pin=>({pin,existing:true}));
    else records=(!query.value.trim()&&country==='all'?[]:[...localPlaceMatches(query.value,region,100),...remote]).map(place=>{
      const saved=findDestinationPin(place,pins),pin=saved||{id:place.pinId,title:place.name,kind:'city',lat:place.lat,lon:place.lon,note:'',status:'want',guides:[],recommendationRating:0,...(place.countryHint?{countryHint:place.countryHint}:place.country?{countryHint:{id:place.country,lat:place.lat,lon:place.lon}}:{})};
      return {pin,existing:!!saved,english:place.english,subtitle:place.subtitle};
    });
    choices=builder&&!countryChosen?[]:tripCityOptions(records,{query:scope==='saved'?query.value:'',country,selected:draft.stops.map(stop=>stop.pin.id)});
    const visible=choices.slice(0,limit);visible.forEach(choice=>ensureMedia(choice.pin));
    results.innerHTML=visible.map((choice,index)=>{const media=mediaSession.cache.get(choice.pin.id)?.value,credit=safe(media?.imageCreditUrl);return '<article class="trip-city-choice"><button type="button" data-trip-city-add="'+index+'" aria-label="'+esc(choice.pin.title+'，'+translateText('加入行程'))+'"><span class="trip-choice-photo" data-trip-choice-media="'+esc(choice.pin.id)+'">'+choicePicture(choice.pin)+'</span><span class="trip-choice-caption"><strong data-i18n-skip>'+esc(choice.pin.title)+'</strong><small>'+esc(translateText(countryName(countryOf(choice.pin))))+' · '+esc(translateText(pinStatusLabel(choice.pin)))+'</small></span><span class="trip-choice-plus" aria-hidden="true">＋</span></button><a class="trip-choice-credit" data-trip-choice-credit '+(credit?'href="'+esc(credit)+'"':'hidden')+' target="_blank" rel="noopener noreferrer">图片及许可说明</a></article>';}).join('')||'<p class="trip-empty">'+(builder&&!countryChosen?'先选一个国家／地区，再点选城市。':scope==='saved'?'这个国家／地区没有更多匹配的已标记城市。':'先选国家／地区或输入城市名，再搜索其他地点。')+'</p>';
    el('choice-count').textContent=choices.length+' · '+translateText('个城市可选');el('more').hidden=choices.length<=limit;
    el('search').hidden=scope!=='other';panel.querySelectorAll('[data-trip-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tripScope===scope)));
  }
  function open(trip){
    if(trip?.stops.some(stop=>!getPins().some(pin=>pin.id===stop.pinId))){message.textContent='有城市已取消标记，请先重新加入地图再编辑这段行程。';return;}
    controller?.abort();mediaSession?.controller.abort();revision++;remote=[];scope='saved';country='all';countryChosen=!builder;limit=12;countryLimit=12;
    mediaSession={controller:new AbortController(),cache:new Map(),queue:[],running:0};
    draft={id:trip?.id||crypto.randomUUID(),...(trip?.month===undefined?{}:{month:trip.month}),stops:(trip?.stops||[]).map(stop=>createTripStop(getPins().find(pin=>pin.id===stop.pinId),{rating:stop.rating}))};
    form.elements.year.value=trip?.year||new Date().getFullYear();form.elements.region.value=trip?.region||'';query.value='';countryQuery.value='';feedback.textContent='';panel.querySelector('#trip-dialog-title').textContent=trip?'编辑行程':'新建行程';
    drawName();drawStops();drawCountries();drawChoices();if(!builder)dialog.showModal();form.elements.region.focus({preventScroll:true});
  }
  function close(){if(saving)return;controller?.abort();mediaSession?.controller.abort();revision++;if(builder)window.location.hash='#/travel/ratings';else dialog.close();}
  async function search(){
    const value=query.value.trim();if(!value)return;controller?.abort();controller=new AbortController();const own=++revision;feedback.textContent='正在寻找这个地方…';
    try{const places=await searchPlaces(value,{signal:controller.signal,focus:searchFocus(countryById.get(country))});if(stopped||own!==revision)return;remote=places;limit=12;drawChoices();feedback.textContent=choices.length?'':'没有找到更多地点。试试加上城市名，或使用英文名。';}catch(error){if(!stopped&&own===revision&&error.name!=='AbortError')feedback.textContent=error.message;}
  }
  function onClick(event){
    const target=event.target;
    if(target.closest('[data-trip-new]')){window.location.hash='#/travel/trips/new';return;}const edit=target.closest('[data-trip-edit]');if(edit){window.location.hash='#/travel/trips/edit/'+encodeURIComponent(edit.dataset.tripEdit);return;}
    if(target.closest('[data-trip-close]')){close();return;}if(saving)return;
    const monthButton=target.closest('[data-trip-month]');if(monthButton){const month=Number(monthButton.dataset.tripMonth);if(month>=1&&month<=12)draft.month=month;else delete draft.month;drawName();return;}
    const scopeButton=target.closest('[data-trip-scope]');if(scopeButton){scope=scopeButton.dataset.tripScope;controller?.abort();revision++;remote=[];limit=12;drawCountries();drawChoices();return;}
    const countryButton=target.closest('[data-trip-country]');if(countryButton){country=countryButton.dataset.tripCountry;countryChosen=true;controller?.abort();revision++;remote=[];limit=12;drawCountries();drawChoices();return;}
    if(target.closest('[data-trip-countries-more]')){countryLimit+=12;drawCountries();return;}if(target.closest('[data-trip-more]')){limit+=12;drawChoices();return;}if(target.closest('[data-trip-search]')){void search();return;}
    const add=target.closest('[data-trip-city-add]');if(add){const choice=choices[Number(add.dataset.tripCityAdd)];if(!choice||draft.stops.some(stop=>stop.pin.id===choice.pin.id))return;draft.stops.push(createTripStop(choice.pin,{existing:choice.existing}));drawStops();drawChoices();feedback.textContent='';return;}
    const status=target.closest('[data-trip-status]');if(status){const index=Number(status.dataset.tripStatus),stop=draft.stops[index];if(stop){if(status.dataset.value===latest(stop).status)delete stop.status;else stop.status=status.dataset.value;drawStops('[data-trip-status="'+index+'"][data-value="'+status.dataset.value+'"]');}return;}
    const score=target.closest('[data-trip-score]');if(score){const index=Number(score.dataset.tripScore),stop=draft.stops[index];if(stop){stop.rating=Number(score.dataset.value);drawStops('[data-trip-score="'+index+'"][data-value="'+score.dataset.value+'"]');feedback.textContent='';}return;}
    const sync=target.closest('[data-trip-sync]');if(sync){const index=Number(sync.dataset.tripSync),stop=draft.stops[index];if(stop){stop.updateRecommendation=!stop.updateRecommendation;drawStops('[data-trip-sync="'+index+'"]');}return;}
    const remove=target.closest('[data-trip-stop-remove]');if(remove){draft.stops.splice(Number(remove.dataset.tripStopRemove),1);drawStops();drawChoices();}
  }
  function onInput(event){if(event.target===query){controller?.abort();revision++;remote=[];limit=12;drawChoices();}else if(event.target===countryQuery){countryLimit=12;drawCountries();}else drawName();}
  function onKey(event){if(event.target===countryQuery&&event.key==='Enter'){event.preventDefault();return;}if(event.target===query&&event.key==='Enter'){event.preventDefault();if(scope==='other')void search();}}
  function onCancel(event){if(saving)event.preventDefault();else{controller?.abort();mediaSession?.controller.abort();revision++;}}
  function onImageError(event){const image=event.target;if(image.matches?.('[data-trip-place-image]')){image.hidden=true;const placeholder=image.parentElement.querySelector('[data-trip-image-placeholder]');if(placeholder)placeholder.hidden=false;}}
  async function onSubmit(event){
    event.preventDefault();if(saving||!form.reportValidity())return;saving=true;save.disabled=true;
    try{const result=await commitTravelTrip({...draft,year:Number(form.elements.year.value),region:form.elements.region.value},{getPins,savePin:onSave});if(stopped)return;if(!builder)dialog.close();mediaSession?.controller.abort();drawList();onChanged();if(builder){if(result.saved)window.location.hash='#/travel/ratings';else feedback.textContent='行程暂存在本页，浏览器未能保存。请导出地图备份。';return;}message.textContent=result.saved?'行程已保存，只同步了你选择的地点改动。':'行程暂存在本页，浏览器未能保存。请导出地图备份。';}
    catch(error){if(!stopped)feedback.textContent=error.message;}finally{saving=false;save.disabled=false;}
  }
  function onStorage(event){if(event.key==='tobias.travel-trips.v1'||event.key===null)drawList();if(isOpen()&&(event.key===STORAGE_KEY||event.key===null)){drawCountries();drawChoices();drawStops();}}
  panel.addEventListener('click',onClick);form.addEventListener('input',onInput);form.addEventListener('keydown',onKey);form.addEventListener('submit',onSubmit);dialog.addEventListener('cancel',onCancel);stopsHost.addEventListener('error',onImageError,true);results.addEventListener('error',onImageError,true);window.addEventListener('storage',onStorage);drawList();if(builder)open(tripId?getTravelTrips().find(trip=>trip.id===tripId):null);
  return ()=>{stopped=true;controller?.abort();mediaSession?.controller.abort();revision++;panel.removeEventListener('click',onClick);form.removeEventListener('input',onInput);form.removeEventListener('keydown',onKey);form.removeEventListener('submit',onSubmit);dialog.removeEventListener('cancel',onCancel);stopsHost.removeEventListener('error',onImageError,true);results.removeEventListener('error',onImageError,true);window.removeEventListener('storage',onStorage);if(!builder&&dialog.open)dialog.close();};
}
