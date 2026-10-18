import {renderMapDisplaySettings,mountMapDisplaySettings} from './map-visibility.js?v=20261018-linked-wiki-photos';
import {getTravelTrips,normalizeTrips,mergeTravelTrips} from './trip-model.js?v=20261018-linked-wiki-photos';
import {isExperienced,pinStatusLabel,residenceDuration,isResidenceStatus,showTravelMapMarker} from './map-model.js?v=20261018-linked-wiki-photos';
import {STORAGE_KEY,project,normalizePin,parseImportState,combinePins} from './map-model.js?v=20261018-linked-wiki-photos';
import {renderMapScene,renderRegionDirectory,mountMapScene} from './map-scene.js?v=20261018-linked-wiki-photos';
import {fitRegion,pinsInRegion,pinCountry} from './geography.js?v=20261018-linked-wiki-photos';
import {countryPlaces,anchorCountryPin,countryMatchesQuery} from './country-destinations.js?v=20261018-linked-wiki-photos';
import {renderPinDrawing} from './pin-icons.js?v=20261018-linked-wiki-photos';
import {renderPlaceInfo,mountPlaceInfo} from './place-info.js?v=20261018-linked-wiki-photos';
import {renderDestinationPicker,mountDestinationPicker,destinationPinId,findDestinationPin} from './destination-picker.js?v=20261018-linked-wiki-photos';
import {renderPlaceSearch,mountPlaceSearch} from './place-search.js?v=20261018-linked-wiki-photos';
import {mountClickChoices} from './click-choices.js?v=20261018-linked-wiki-photos';
import {countrySearchAliases,toTraditional} from './i18n.js?v=20261018-linked-wiki-photos';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kindName=pin=>pin.kind==='country'?'国家／地区':'城市／景点';
const countryPlacesById=new Map(countryPlaces.map(place=>[place.countryId,place]));
const samePinIdentity=(a,b)=>(a.kind||'city')===(b.kind||'city')&&(a.kind!=='country'||a.countryId===b.countryId);
let memoryState;
function readState() {
  if(memoryState) return memoryState;
  try {const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"pins":[],"hidden":[]}');memoryState={pins:Array.isArray(value.pins)?value.pins.map(normalizePin).map(anchorCountryPin):[],hidden:Array.isArray(value.hidden)?value.hidden.filter(id=>typeof id==='string'):[]};}
  catch {memoryState={pins:[],hidden:[]};}
  return memoryState;
}
const sourcePins=destinations=>destinations.filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lon)).map(place=>normalizePin({id:`source-${place.id}`,title:place.name,note:place.description,lat:place.lat,lon:place.lon,status:place.status||'want',kind:place.kind==='country'?'country':'city',countryId:place.countryId||place.country,photoUrl:place.photoUrl,wikipediaUrl:place.wikipediaUrl,guides:place.guides,desireRating:place.desireRating,recommendationRating:place.recommendationRating,residenceStart:place.residenceStart,residenceEnd:place.residenceEnd,residenceBreaks:place.residenceBreaks}));
export function getTravelResidences(){try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(Array.isArray(stored?.pins))return stored.pins.map(normalizePin).map(anchorCountryPin).filter(isResidenceStatus);}catch{}return getTravelPins().filter(isResidenceStatus);}
export function getTravelPins(destinations=[]){return combinePins(sourcePins(destinations),readState()).map(anchorCountryPin);}
export function saveTravelPin(value,destinations=[]){
  let pin=anchorCountryPin(normalizePin(value));const state=readState(),pins=getTravelPins(destinations);
  const previous=pins.find(item=>item.id===pin.id);
  if(previous&&!samePinIdentity(previous,pin))pin={...pin,id:crypto.randomUUID()};
  if(!pins.some(item=>item.id===pin.id)&&pins.length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
  if(findDestinationPin(pin,pins.filter(item=>item.id!==pin.id)))throw new Error('这个地点已在地图中，可以点击标记编辑。');
  memoryState={pins:[...state.pins.filter(item=>item.id!==pin.id),pin],hidden:state.hidden.filter(id=>id!==pin.id)};
  let saved=true;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(memoryState));}catch{saved=false;}
  return {saved,pin};
}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)memoryState=undefined;});
function guideInput(value){return String(value||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const split=line.indexOf('|');return split<0?{title:line,url:line}:{title:line.slice(0,split).trim(),url:line.slice(split+1).trim()};});}

export function renderTravelMap({compact=false,region={kind:"world",name:"世界"}}={}) {
  return `<div class="travel-map ${compact?'map-compact':''}" data-travel-map>
    <div class="map-toolbar"><div class="map-toolbar-start"><button class="map-add" data-map-add aria-haspopup="dialog"><span aria-hidden="true">＋</span> 添加地点</button><button class="map-tool" data-map-pick aria-pressed="false">在地图上选位置</button></div><div class="map-file-tools"><button class="map-tool" data-map-display aria-haspopup="dialog">☷ 显示设置</button><button class="map-tool" data-map-export>导出地图 ↗</button><button class="map-tool" data-map-import>导入</button><input type="file" accept="application/json,.json" data-map-file hidden></div></div>
    ${renderMapScene(region,compact)}
    <div class="map-bottom"><div class="map-legend"><span><i class="legend-dot"></i> 想去</span><span><i class="legend-dot visited"></i> 去过</span><span><i class="legend-resident">★</i> 居住</span><span><i class="legend-want-resident">★</i> 想要居住</span><strong data-pin-count>0 个地点</strong></div><span class="map-data-credit">投影：<a href="https://www.un.org/osaa/en/news/victory-africa-un-votes-resolution-correct-map" target="_blank" rel="noopener noreferrer">Equal Earth</a> · 边界：<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></span></div>
    <div class="map-kind-legend" aria-label="标记类型"><span><svg viewBox="-20 -38 50 44" aria-hidden="true">${renderPinDrawing('city')}</svg>城市／景点</span><span><svg viewBox="-20 -38 50 44" aria-hidden="true">${renderPinDrawing('country')}</svg>国家／地区（仅五星）</span><a class="map-ratings-link" href="#/travel/ratings">旅行评分 ↗</a></div>
    <p class="map-storage-note" data-map-message role="status">标记保存在当前浏览器；导出后可备份或在其他设备导入。</p>
    ${renderDestinationPicker(region,compact)}
    ${renderRegionDirectory(region,compact)}
    <div class="map-place-list" data-map-list></div>
    <dialog class="pin-dialog" data-pin-dialog aria-labelledby="pin-dialog-title"><form data-pin-form><div class="pin-dialog-top"><span class="mono">A PLACE TO REMEMBER</span><button type="button" class="pin-close" data-dialog-close aria-label="关闭地点窗口">×</button></div><h2 id="pin-dialog-title">放下一枚 📌</h2><p class="pin-form-intro">每一个地方，都有自己的故事。</p><label>标记类型<select name="kind"><option value="city">城市／景点</option><option value="country">国家／地区</option></select></label><label data-country-field hidden>国家或地区<select name="countryId" data-choice-searchable data-choice-placeholder="搜索国家或地区…"><option value="">选择国家／地区…</option>${countryPlaces.map(place=>`<option value="${place.countryId}" data-choice-search="${esc(`${place.english} ${toTraditional(place.name)} ${countrySearchAliases(place.id)}`)}">${esc(place.name)}</option>`).join('')}</select></label><label>地点名称<input name="title" maxlength="80" placeholder="例如：京都、冰岛、马赛马拉…" required autocomplete="off"></label><input name="lat" type="hidden"><input name="lon" type="hidden"><label>状态<select name="status"><option value="want">想去 · 旅行心愿</option><option value="visited">去过 · 我的足迹</option><option value="resident">居住 · 生活过的地方</option><option value="want-resident">想要居住</option></select></label><label>我的介绍 <span class="optional">选填</span><textarea name="note" maxlength="5000" rows="5" placeholder="想在这里做什么，或一段旅行回忆…"></textarea></label><label>地点图片链接 <span class="optional">选填</span><input name="photoUrl" type="url" maxlength="2000" placeholder="https://…"></label><label>维基百科链接 <span class="optional">选填</span><input name="wikipediaUrl" type="url" maxlength="2000" placeholder="https://en.wikipedia.org/wiki/…"></label><label>收藏的旅行攻略 <span class="optional">每行：标题 | 链接</span><textarea name="guides" rows="4" placeholder="例如：三日旅行路线 | https://…"></textarea></label><p class="pin-form-error" data-pin-error role="alert"></p><div class="pin-dialog-actions"><button type="button" class="pin-delete" data-pin-delete hidden>删除地点</button><button type="button" class="map-tool" data-dialog-cancel>取消</button><button type="submit" class="map-add">保存地点 ↗</button></div></form></dialog>
    ${renderPlaceSearch(region)}
    ${renderPlaceInfo()}${renderMapDisplaySettings()}
  </div>`;
}

export function mountTravelMap(root,destinations=[],region={kind:"world",name:"世界"}) {
  if(!root) return ()=>{};
  const presets=sourcePins(destinations);
  let state=readState();
  let selectedId=null;
  let selectedCountryHint;
  let selectedRecord;
  let adding=false;
  let view=fitRegion(region);
  let picker;
  let placeSearch;
  let placeInfo;
  let markerSettings;
  const svg=root.querySelector('[data-world-map]');
  const markers=root.querySelector('[data-map-markers]');
  const dialog=root.querySelector('[data-pin-dialog]');
  const form=root.querySelector('[data-pin-form]');
  const error=root.querySelector('[data-pin-error]');
  const message=root.querySelector('[data-map-message]');
  const fields=form.elements;
  const choices=mountClickChoices(root,{matchOption:(select,option,query)=>select.name==='countryId'?countryMatchesQuery(countryPlacesById.get(option.value),query):option.textContent.toLocaleLowerCase().includes(query)});
  const allPins=()=>combinePins(presets,state).map(anchorCountryPin);
  const announce=text=>{message.textContent=text;};
  function store() {
    memoryState=state;
    let saved=true;
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));announce('已保存到当前浏览器。可随时导出地图备份。');}
    catch {saved=false;announce('浏览器存储不可用，本次更改暂存在当前页面内。请导出地图，避免关闭页面后丢失。');}
    draw();
    return saved;
  }
  function setAdding(value) {
    adding=value;
    root.classList.toggle('is-placing',value);
    root.querySelector('[data-map-pick]').setAttribute('aria-pressed',String(value));
    root.querySelector('[data-map-hint]').hidden=!value;
    root.querySelector('[data-map-hint]').firstChild.textContent='点击地图，放下你的 📌 ';
    if(value) announce('请在地图上选择一个位置，放下你的旅行标记。');
  }
  function draw() {
    const pins=pinsInRegion(allPins(),region).sort((a,b)=>Number(isResidenceStatus(a))-Number(isResidenceStatus(b)));
    const scale=view.width/1000;
    markers.innerHTML=pins.filter(pin=>showTravelMapMarker(pin,region)).map(pin=>{const p=project(pin.lat,pin.lon),country=pin.kind==='country',resident=isResidenceStatus(pin);return `<g class="map-pin-marker ${country?'is-country':'is-city'} ${isExperienced(pin)?'is-visited':''} ${resident?'is-resident':''} ${pin.status==='want-resident'?'is-want-resident':''}" transform="translate(${p.x} ${p.y}) scale(${scale})" tabindex="0" role="button" data-pin-id="${esc(pin.id)}" data-pin-kind="${country?'country':'city'}" aria-label="${esc(pin.title)}，${kindName(pin)}，${pinStatusLabel(pin)}，点击查看资料"><title>${esc(pin.title)}</title><circle cx="${resident?0:country?6:0}" cy="${resident?0:country?-15:-12}" r="20" class="marker-hit-area"/><g class="marker-visual">${renderPinDrawing(pin.kind,pin.status)}</g>${resident?`<text class="marker-resident-label" x="18" y="2" data-i18n-skip>${esc(pin.title)}</text><text class="marker-resident-period" x="18" y="14">${esc(pin.status==='resident'?residenceDuration(pin):'想要居住')}</text>`:''}</g>`;}).join('');
    root.querySelector('[data-pin-count]').textContent=`${pins.length} 个地点`;
    document.querySelector('.travel-count')?.replaceChildren(document.createTextNode(`${String(pins.length).padStart(2,'0')} PLACES TO GO`));
    const list=root.querySelector('[data-map-list]');
    list.innerHTML=pins.length ? `<div class="map-list-heading"><h2>心愿与足迹 <span>${pins.length}</span></h2><span>点击地点，编辑你的旅行记录</span></div><div class="map-place-grid">${pins.map(pin=>`<button class="map-place-card" data-place-id="${esc(pin.id)}"><span class="place-card-meta"><span class="place-status ${isExperienced(pin)?'visited':''}">${pinStatusLabel(pin)}</span><span class="place-kind">${kindName(pin)}</span></span><strong>${esc(pin.title)}</strong>${pin.note?`<p>${esc(pin.note)}</p>`:''}<span class="place-edit-link">编辑记录 ↗</span></button>`).join('')}</div>` : `<div class="map-no-places"><span aria-hidden="true">✳</span><p>${region.kind==='world'?'世界很大，先从一个想去的地方开始。':esc(region.name)+'的旅行记录，还在等第一枚标记。'}</p><button class="text-link" data-first-pin>添加第一个地点 <span>↗</span></button></div>`;
    markerSettings?.refresh();
    picker?.update();
    placeSearch?.update();
  }
  function addPlace(place) {
    const id=place.pinId||destinationPinId(place);
    if(findDestinationPin({...place,id},allPins()))throw new Error('这个地点已在地图中，可以点击标记编辑。');
    if(allPins().length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
    const safeId=allPins().some(item=>item.id===id)?crypto.randomUUID():id;
    const pin=normalizePin({id:safeId,title:place.name,lat:place.lat,lon:place.lon,note:'',status:'want',kind:place.kind==='country'?'country':'city',countryId:place.kind==='country'?(place.countryId||place.country):undefined,countryHint:place.countryHint});
    state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);
    return {saved:store(),pin,inRegion:Boolean(pinsInRegion([pin],region).length)};
  }
  const addDestination=place=>addPlace({...place,pinId:destinationPinId(place)});
  function showEditor(pin) {
    selectedRecord=pin;
    selectedId=pin?.id||null;
    selectedCountryHint=pin?.countryHint;
    fields.title.value=pin?.title||'';
    fields.lat.value=pin?.lat===undefined?'':String(pin.lat);
    fields.lon.value=pin?.lon===undefined?'':String(pin.lon);
    fields.status.value=pin?.status||'want';
    fields.note.value=pin?.note||'';
    fields.photoUrl.value=pin?.photoUrl||'';
    fields.wikipediaUrl.value=pin?.wikipediaUrl||'';
    fields.guides.value=(pin?.guides||[]).map(guide=>`${guide.title} | ${guide.url}`).join('\n');
    fields.kind.value=pin?.kind==='country'?'country':'city';
    fields.countryId.value=pin?.countryId||pinCountry(pin)||((region.kind==='country'&&countryPlacesById.has(region.id))?region.id:'');
    updateKindFields();
    choices.refresh();
    error.textContent='';
    root.querySelector('#pin-dialog-title').textContent=selectedId?'编辑这个地点':'放下一枚 📌';
    root.querySelector('[data-pin-delete]').hidden=!selectedId;
    dialog.showModal();
    fields.title.focus();
    setAdding(false);
  }
  function editPin(id) {const pin=allPins().find(pin=>pin.id===id);if(pin)showEditor(pin);}
  function removePin(id) {
    const pin=allPins().find(item=>item.id===id);if(!pin)throw new Error('这个地点已经不在收藏中，请返回地图查看。');
    state.pins=state.pins.filter(item=>item.id!==id);if(presets.some(item=>item.id===id))state.hidden=[...new Set([...state.hidden,id])];
    const saved=store();announce(saved?'已取消标记。':'当前页面已取消标记，浏览器未能保存。');
    const undo=document.createElement('button');undo.type='button';undo.className='map-tool';undo.textContent='撤销';
    undo.addEventListener('click',()=>{if(allPins().some(item=>item.id===id))return;state.pins.push(pin);state.hidden=state.hidden.filter(value=>value!==id);const restored=store();if(restored)announce('已恢复标记。');},{once:true});
    message.append(' ',undo);return {saved,pin};
  }
  function selectPin(id) {const pin=allPins().find(pin=>pin.id===id);if(pin)placeInfo?.open(pin);}
  function updateKindFields(){const country=fields.kind.value==='country';root.querySelector('[data-country-field]').hidden=!country;fields.countryId.required=country;}
  function chooseCountry(){const place=countryPlacesById.get(fields.countryId.value);if(!place)return;fields.title.value=place.name;fields.lat.value=String(place.lat);fields.lon.value=String(place.lon);}
  fields.kind.addEventListener('change',()=>{updateKindFields();if(fields.kind.value==='country')chooseCountry();});
  fields.countryId.addEventListener('change',chooseCountry);
  root.querySelector('[data-map-add]').addEventListener('click',()=>{setAdding(false);placeSearch.open();});
  root.querySelector('[data-map-pick]').addEventListener('click',()=>setAdding(!adding));
  root.querySelector('[data-map-cancel]').addEventListener('click',()=>setAdding(false));
  root.addEventListener('click',event=>{const item=event.target.closest('[data-place-id]');if(item)selectPin(item.dataset.placeId);if(event.target.closest('[data-first-pin]')){setAdding(false);placeSearch.open();}});
  root.querySelectorAll('[data-dialog-close],[data-dialog-cancel]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    try{
      if(!fields.lat.value.trim()||!fields.lon.value.trim())throw new Error('请先搜索并选择一个地点，或在地图上选择位置。');
      const country=fields.kind.value==='country'?countryPlacesById.get(fields.countryId.value):null;
      if(fields.kind.value==='country'&&!country)throw new Error('请选择要标记的国家或地区。');
      const changedKind=(selectedRecord?.kind||'city')!==fields.kind.value||(country&&selectedRecord?.countryId!==country.countryId);
      const pin=normalizePin({...selectedRecord,id:changedKind?crypto.randomUUID():selectedId||crypto.randomUUID(),title:fields.title.value,note:fields.note.value,lat:country?.lat??Number(fields.lat.value),lon:country?.lon??Number(fields.lon.value),status:fields.status.value,kind:fields.kind.value,countryId:country?.countryId,countryHint:country?undefined:selectedCountryHint,desireRating:changedKind?0:selectedRecord?.desireRating,recommendationRating:changedKind?0:selectedRecord?.recommendationRating,photoUrl:fields.photoUrl.value,wikipediaUrl:fields.wikipediaUrl.value,guides:guideInput(fields.guides.value)});
      if(!selectedId&&allPins().length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
      if(findDestinationPin(pin,allPins().filter(item=>item.id!==selectedId)))throw new Error('这个地点已在地图中，可以点击标记编辑。');
      state.pins=state.pins.filter(item=>item.id!==selectedId&&item.id!==pin.id);state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);if(changedKind&&presets.some(item=>item.id===selectedId))state.hidden=[...new Set([...state.hidden,selectedId])];const saved=store();dialog.close();if(saved&&!pinsInRegion([pin],region).length)announce('地点已保存到世界地图；它不在当前区域内。');
    }catch(err){error.textContent=err.message;}
  });
  root.querySelector('[data-pin-delete]').addEventListener('click',()=>{if(!selectedId)return;state.pins=state.pins.filter(pin=>pin.id!==selectedId);if(presets.some(pin=>pin.id===selectedId))state.hidden=[...new Set([...state.hidden,selectedId])];const saved=store();dialog.close();if(saved)announce('地点已删除，当前浏览器中的地图已更新。');});
  root.querySelector('[data-map-export]').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,pins:allPins(),hidden:state.hidden,trips:getTravelTrips()},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-travel-map.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('地图已导出。可在其他设备使用“导入”恢复这些地点。');
  });
  const fileInput=root.querySelector('[data-map-file]');
  root.querySelector('[data-map-import]').addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file)return;
    try{if(file.size>5000000)throw new Error('文件太大，请选择小于 5 MB 的地图备份。');const text=await file.text(),payload=JSON.parse(text),incomingTrips=payload.trips===undefined?null:normalizeTrips(payload.trips);const imported=parseImportState(text);const merged=new Map(state.pins.map(pin=>[pin.id,pin]));imported.pins.forEach(pin=>merged.set(pin.id,pin));const hidden=[...new Set([...state.hidden,...imported.hidden])].filter(id=>!imported.pins.some(pin=>pin.id===id));const next={pins:[...merged.values()].filter(pin=>!hidden.includes(pin.id)),hidden};if(combinePins(presets,next).length>1000||next.hidden.length>1000)throw new Error('合并后超过 1000 个地点，请先整理地图。');state=next;const tripResult=incomingTrips?mergeTravelTrips(incomingTrips):null;const saved=store()&&tripResult?.saved!==false;if(saved)announce(`已导入 ${imported.pins.length} 个地点，并与当前地图合并。`);}
    catch(err){announce(`导入失败：${err.message}`);}finally{fileInput.value='';}
  });
  function onStorage(event){if(event.key===STORAGE_KEY){memoryState=undefined;state=readState();draw();announce('地图已与此浏览器中的另一个标签页同步。');}}
  function onEscape(event){if(event.key==='Escape')setAdding(false);}
  window.addEventListener('storage',onStorage);document.addEventListener('keydown',onEscape);
  const scene=mountMapScene(root,{region,isAdding:()=>adding,onMarkerClick:selectPin,onChoosePoint:showEditor,announce,onViewChange:next=>{view=next;markers.querySelectorAll('[data-pin-id]').forEach(marker=>{const pin=allPins().find(pin=>pin.id===marker.dataset.pinId);if(pin){const p=project(pin.lat,pin.lon);marker.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${view.width/1000})`);}});}});
  picker=mountDestinationPicker(root,{region,getPins:allPins,onAdd:addDestination});
  placeSearch=mountPlaceSearch(root,{region,getPins:allPins,onAdd:addPlace,onEdit:editPin});
  placeInfo=mountPlaceInfo(root,{getPins:allPins,onEdit:editPin,onRemove:removePin,onSave:next=>{const pin=normalizePin(next);state.pins=state.pins.filter(item=>item.id!==pin.id);state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);return {pin,saved:store()};}});
  markerSettings=mountMapDisplaySettings(root,{getPins:()=>pinsInRegion(allPins(),region),region,onSave:next=>{const pin=normalizePin(next);state.pins=state.pins.filter(item=>item.id!==pin.id);state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);return {pin,saved:store()};}});
  draw();
  return ()=>{markerSettings.destroy();placeInfo.destroy();placeSearch.destroy();picker.destroy();scene.destroy();choices.destroy();window.removeEventListener('storage',onStorage);document.removeEventListener('keydown',onEscape);if(dialog.open)dialog.close();};
}
