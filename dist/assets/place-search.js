import {DESTINATIONS} from './destination-catalog.js';
import {COUNTRY_FLAGS} from './country-flags.js';
import {countryById} from './geography.js';
import {unproject} from './projection.js';
import {searchDestinations,destinationPinId,findDestinationPin} from './destination-picker.js';
import {countryPlaces,searchCountryPlaces} from './country-destinations.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PHOTON_ENDPOINT='https://photon.komoot.io/api/';
const responseCache=new Map();
let lastRequestAt=0;
const isoCountry=new Map(Object.entries(COUNTRY_FLAGS).filter(([,flag])=>flag.code).map(([id,flag])=>[flag.code.toLowerCase(),id]));
for(const [code,id] of [['sg','sgp'],['mv','mdv'],['hk','chn'],['mo','chn']])isoCountry.set(code,id);
const abortError=()=>new DOMException('Cancelled','AbortError');
function pause(milliseconds,signal) {
  if(signal?.aborted)return Promise.reject(abortError());
  if(milliseconds<=0)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const finish=()=>{signal?.removeEventListener('abort',cancel);resolve();};
    const timer=setTimeout(finish,milliseconds);
    const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(abortError());};
    signal?.addEventListener('abort',cancel,{once:true});
  });
}

export function localPlaceMatches(query='',region={kind:'world'},limit=8) {
  return searchDestinations(DESTINATIONS,query).sort((a,b)=>{
    const preferred=place=>region.kind==='country'?place.country===region.id:region.kind==='continent'?place.continent===region.id:false;
    return Number(preferred(b))-Number(preferred(a))||a.priority-b.priority||a.name.localeCompare(b.name,'zh-CN');
  }).slice(0,limit).map(place=>({...place,kind:'city',source:'catalog',pinId:destinationPinId(place),subtitle:countryById.get(place.country)?.name||({sgp:'新加坡',mdv:'马尔代夫'}[place.country]||'')}));
}

export function countryPlaceMatches(query='',region={kind:'world'}) {
  return searchCountryPlaces(query,{region,limit:countryPlaces.length}).map(place=>({...place,kind:'country',countryId:place.id,pinId:`country-${place.id}`,source:'country',subtitle:place.english}));
}

export function normalizePhotonResults(payload) {
  if(!payload||!Array.isArray(payload.features))throw new Error('搜索结果暂时无法使用，请稍后再试。');
  const results=[],seen=new Set();
  for(const feature of payload.features.slice(0,8)) {
    const coordinates=feature?.geometry?.coordinates,properties=feature?.properties;
    if(feature?.geometry?.type!=='Point'||!Array.isArray(coordinates)||!properties)continue;
    const [lon,lat]=coordinates;
    if(![lat,lon].every(Number.isFinite)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    const name=String(properties.name||properties.city||properties.state||properties.country||'').trim().slice(0,80);
    if(!name)continue;
    const type=String(properties.osm_type||'').toLowerCase();
    const osmId=String(properties.osm_id??'');
    const key=/^[nwr]$/.test(type)&&/^\d+$/.test(osmId)?`osm-${type}-${osmId}`:`location-${lat.toFixed(5).replace('-','m').replace('.','p')}-${lon.toFixed(5).replace('-','m').replace('.','p')}`;
    if(seen.has(key))continue;seen.add(key);
    const country=isoCountry.get(String(properties.countrycode||'').toLowerCase());
    const subtitle=[...new Set([properties.city,properties.state,properties.country].filter(value=>typeof value==='string'&&value.trim()&&value!==name))].join(' · ');
    results.push({id:key,pinId:`search-${key}`,name,subtitle,lat,lon,kind:'city',source:'online',...(country?{country,countryHint:{id:country,lat,lon}}:{})});
  }
  return results;
}

export function searchFocus(region) {
  if(!region||region.kind==='world')return null;
  const point=region.center||region.label;
  return Array.isArray(point)?unproject(point[0],point[1]):null;
}

export async function searchOnlinePlaces(query,{signal,focus=null,fetcher=globalThis.fetch}={}) {
  const trimmed=String(query).trim();
  if(!trimmed||trimmed.length>180)throw new Error('请输入一个地名，最多 180 个字符。');
  const url=new URL(PHOTON_ENDPOINT);url.searchParams.set('q',trimmed);url.searchParams.set('limit','8');url.searchParams.set('lang','en');
  if(focus&&[focus.lat,focus.lon].every(Number.isFinite)){
    url.searchParams.set('lat',focus.lat.toFixed(4));url.searchParams.set('lon',focus.lon.toFixed(4));url.searchParams.set('zoom','5');url.searchParams.set('location_bias_scale','0.4');
  }
  const key=url.href;
  if(signal?.aborted)throw abortError();
  if(responseCache.has(key))return responseCache.get(key);
  const controller=new AbortController();
  const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
  let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},12000);
  try {
    // Search is submit-only. The shared gate also spaces requests from dialogs
    // that are closed/reopened while an earlier request is being cancelled.
    while(Date.now()-lastRequestAt<1200)await pause(1200-(Date.now()-lastRequestAt),controller.signal);
    if(controller.signal.aborted)throw abortError();
    lastRequestAt=Date.now();
    const response=await fetcher(url.href,{signal:controller.signal,headers:{Accept:'application/json'},credentials:'omit'});
    if(response.status===429)throw new Error('搜索服务繁忙，请稍后再试。');
    if(!response.ok)throw new Error('暂时无法在线搜索，请稍后再试。');
    const results=normalizePhotonResults(await response.json());
    if(controller.signal.aborted)throw abortError();
    responseCache.set(key,results);if(responseCache.size>64)responseCache.delete(responseCache.keys().next().value);
    return results;
  }catch(error){
    if(timedOut)throw new Error('搜索用时较长，请稍后再试，或选择已收录的地点。');
    if(controller.signal.aborted)throw abortError();
    throw new Error(error?.message?.startsWith('搜索')||error?.message?.startsWith('暂时')?error.message:'暂时无法在线搜索，请检查网络后重试。');
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}

export function renderPlaceSearch(region={kind:'world'}) {
  return `<dialog class="place-search-dialog" data-place-search-dialog aria-labelledby="place-search-title"><div class="place-search-top"><span class="mono">FIND YOUR NEXT PLACE</span><button type="button" class="pin-close" data-place-search-close aria-label="关闭地点搜索">×</button></div><h2 id="place-search-title">想去哪里？</h2>
    <div class="place-search-kind-tabs" role="group" aria-label="标记类型"><button type="button" data-place-search-kind="city" aria-pressed="true">城市／景点</button><button type="button" data-place-search-kind="country" aria-pressed="false">国家／地区</button></div>
    <p class="place-search-intro" data-place-search-intro>输入城市、景点或地名，找到后即可加入旅行心愿。</p><form data-place-search-form><label class="sr-only" for="place-search-query" data-place-search-label>搜索地点名称</label><div class="place-search-input-row"><input id="place-search-query" name="query" type="search" maxlength="180" placeholder="例如：哥本哈根、故宫、Mount Fuji…" autocomplete="off" required data-place-search-query><button type="submit" class="map-add" data-place-search-submit>搜索</button></div>${region.kind==='world'?'':`<label class="place-search-scope">搜索范围<select data-place-search-scope><option value="preferred">优先当前区域</option><option value="world">全球</option></select></label>`}</form><p class="place-search-status" data-place-search-status role="status">输入地名后，点击“搜索”查看更多地点。</p><div data-place-search-local></div><div data-place-search-online></div><div class="place-search-feedback" data-place-search-feedback role="status"></div><div class="place-search-edit" hidden data-place-search-edit-wrap><button type="button" class="text-link" data-place-search-edit>编辑这个地点 <span>↗</span></button></div><p class="place-search-source" data-place-search-source>在线地名搜索：<a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></p></dialog>`;
}

export function mountPlaceSearch(root,{region,getPins,onAdd,onEdit,searchPlaces=searchOnlinePlaces}) {
  const dialog=root.querySelector('[data-place-search-dialog]');
  if(!dialog)return {open(){},update(){},destroy(){}};
  const form=dialog.querySelector('[data-place-search-form]'),input=dialog.querySelector('[data-place-search-query]');
  const submit=dialog.querySelector('[data-place-search-submit]'),scope=dialog.querySelector('[data-place-search-scope]');
  const status=dialog.querySelector('[data-place-search-status]'),local=dialog.querySelector('[data-place-search-local]'),online=dialog.querySelector('[data-place-search-online]');
  const feedback=dialog.querySelector('[data-place-search-feedback]'),editWrap=dialog.querySelector('[data-place-search-edit-wrap]');
  const source=dialog.querySelector('[data-place-search-source]'),intro=dialog.querySelector('[data-place-search-intro]'),inputLabel=dialog.querySelector('[data-place-search-label]');
  let revision=0,controller=null,onlineResults=[],phase='idle',errorMessage='',selectedPinId=null,kind='city';
  let available=new Map();
  function stop(){revision++;controller?.abort();controller=null;}
  function update() {
    const preferred=scope?.value!=='world'?region:{kind:'world'};
    const isCountry=kind==='country';
    const localResults=isCountry?countryPlaceMatches(input.value,preferred):localPlaceMatches(input.value,preferred);
    source.hidden=isCountry;online.hidden=isCountry;input.required=!isCountry;
    intro.textContent=isCountry?'搜索国家或地区，为整个国家留下一枚标记。':'输入城市、景点或地名，找到后即可加入旅行心愿。';
    inputLabel.textContent=isCountry?'搜索国家或地区':'搜索地点名称';
    input.setAttribute('placeholder',isCountry?'例如：中国、丹麦、Japan…':'例如：哥本哈根、故宫、Mount Fuji…');
    dialog.querySelectorAll('[data-place-search-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.placeSearchKind===kind)));
    const pins=getPins();available=new Map();
    const section=(items,label,prefix)=>items.length?`<section class="place-search-group"><h3>${label} <span>${items.length}</span></h3><div class="place-search-results">${items.map(place=>{
      const key=`${prefix}-${place.id}`,added=findDestinationPin({...place,id:place.pinId},pins);available.set(key,place);
      return `<button type="button" class="place-search-result" data-place-search-result="${esc(key)}" ${added?'disabled':''}><span class="place-search-result-copy"><strong ${place.source==='online'?'data-i18n-skip':''}>${esc(place.name)}</strong>${place.subtitle?`<small ${place.source==='online'?'data-i18n-skip':''}>${esc(place.subtitle)}</small>`:''}</span><span class="place-search-result-action">${added?'已在地图中':'加入心愿'} <span aria-hidden="true">${added?'✓':'＋'}</span></span></button>`;
    }).join('')}</div></section>`:'';
    local.innerHTML=section(localResults,isCountry?'国家与地区':'已收录的地点',isCountry?'country':'local');
    const distinctOnline=onlineResults.filter(place=>!localResults.some(localPlace=>findDestinationPin(place,[{id:localPlace.pinId,lat:localPlace.lat,lon:localPlace.lon}])));
    online.innerHTML=isCountry?'':section(distinctOnline,'更多搜索结果','online');
    submit.disabled=phase==='loading';dialog.setAttribute('aria-busy',String(phase==='loading'));
    status.classList.toggle('is-error',phase==='error');
    status.textContent=isCountry?(localResults.length?'选择一个国家或地区，加入旅行心愿。':'没有找到国家或地区，试试中文或英文名称。'):phase==='loading'?'正在寻找这个地方…':phase==='error'?errorMessage:phase==='done'?(onlineResults.length?'找到后点击“加入心愿”，稍后可编辑旅行记录。':'没有找到更多地点。试试加上城市名，或使用英文名。'):'输入地名后，点击“搜索”查看更多地点。';
    if(!isCountry&&!localResults.length&&phase!=='loading'&&phase!=='done')local.innerHTML='<p class="place-search-empty">已收录的地点暂时没有匹配，点击“搜索”继续查找。</p>';
  }
  function clearFeedback(){feedback.textContent='';feedback.classList.remove('is-warning');editWrap.hidden=true;selectedPinId=null;}
  function onInput(){stop();onlineResults=[];phase='idle';errorMessage='';clearFeedback();update();}
  async function onSubmit(event) {
    event.preventDefault();
    if(kind==='country'){stop();onlineResults=[];phase='done';clearFeedback();update();return;}
    const query=input.value.trim();if(!query||!form.reportValidity())return;
    stop();const token=revision;controller=new AbortController();phase='loading';onlineResults=[];clearFeedback();update();
    const requestController=controller;
    try {
      const results=await searchPlaces(query,{signal:requestController.signal,focus:scope?.value==='world'?null:searchFocus(region)});
      if(token!==revision||!dialog.open||requestController.signal.aborted)return;
      onlineResults=results;phase='done';update();
    }catch(error){
      if(token!==revision||!dialog.open||requestController.signal.aborted)return;
      phase='error';errorMessage=error.message;update();
    }finally{if(token===revision)controller=null;}
  }
  function close(){stop();dialog.close();}
  function onClose(){stop();phase='idle';onlineResults=[];}
  function onClick(event) {
    if(event.target.closest('[data-place-search-close]')){close();return;}
    const modeButton=event.target.closest('[data-place-search-kind]');
    if(modeButton){const next=modeButton.dataset.placeSearchKind;if(['city','country'].includes(next)&&next!==kind){kind=next;onInput();input.focus();}return;}
    if(event.target.closest('[data-place-search-edit]')){if(selectedPinId){close();onEdit?.(selectedPinId);}return;}
    const button=event.target.closest('[data-place-search-result]');if(!button||button.disabled)return;
    const place=available.get(button.dataset.placeSearchResult);if(!place)return;
    try {
      const result=onAdd(place);selectedPinId=result.pin?.id||place.pinId;editWrap.hidden=false;
      feedback.textContent=result.saved?(result.inRegion===false?'已加入心愿。这个地点可在世界地图查看。':'已加入心愿，稍后可在地图中编辑旅行记录。'):'这个地点暂存在本页，浏览器未能保存。请导出地图备份。';
      feedback.classList.toggle('is-warning',!result.saved);update();
    }catch(error){feedback.textContent=error.message;feedback.classList.add('is-warning');update();}
  }
  function onBackdrop(event){if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();}}
  function onLanguage(){if(dialog.open)update();}
  form.addEventListener('submit',onSubmit);input.addEventListener('input',onInput);scope?.addEventListener('change',onInput);
  dialog.addEventListener('click',onClick);dialog.addEventListener('click',onBackdrop);dialog.addEventListener('cancel',onClose);dialog.addEventListener('close',onClose);window.addEventListener('site-language-change',onLanguage);
  return {
    open(){stop();kind='city';phase='idle';onlineResults=[];input.value='';clearFeedback();update();dialog.showModal();input.focus();},
    update(){if(dialog.open)update();},
    destroy(){stop();form.removeEventListener('submit',onSubmit);input.removeEventListener('input',onInput);scope?.removeEventListener('change',onInput);dialog.removeEventListener('click',onClick);dialog.removeEventListener('click',onBackdrop);dialog.removeEventListener('cancel',onClose);dialog.removeEventListener('close',onClose);window.removeEventListener('site-language-change',onLanguage);if(dialog.open)dialog.close();}
  };
}
