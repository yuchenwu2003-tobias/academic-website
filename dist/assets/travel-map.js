import {STORAGE_KEY,project,normalizePin,parseImportState,combinePins} from './map-model.js';
import {renderMapScene,renderRegionDirectory,mountMapScene} from './map-scene.js';
import {fitRegion,pinsInRegion} from './geography.js';
import {renderDestinationPicker,mountDestinationPicker,destinationPinId,findDestinationPin} from './destination-picker.js';
import {renderPlaceSearch,mountPlaceSearch} from './place-search.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let memoryState;
function readState() {
  if(memoryState) return memoryState;
  try {const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"pins":[],"hidden":[]}');memoryState={pins:Array.isArray(value.pins)?value.pins.map(normalizePin):[],hidden:Array.isArray(value.hidden)?value.hidden.filter(id=>typeof id==='string'):[]};}
  catch {memoryState={pins:[],hidden:[]};}
  return memoryState;
}

export function renderTravelMap({compact=false,region={kind:"world",name:"世界"}}={}) {
  return `<div class="travel-map ${compact?'map-compact':''}" data-travel-map>
    <div class="map-toolbar"><div class="map-toolbar-start"><button class="map-add" data-map-add aria-haspopup="dialog"><span aria-hidden="true">＋</span> 添加地点</button><button class="map-tool" data-map-pick aria-pressed="false">在地图上选位置</button></div><div class="map-file-tools"><button class="map-tool" data-map-export>导出地图 ↗</button><button class="map-tool" data-map-import>导入</button><input type="file" accept="application/json,.json" data-map-file hidden></div></div>
    ${renderMapScene(region,compact)}
    <div class="map-bottom"><div class="map-legend"><span><i class="legend-dot"></i> 想去</span><span><i class="legend-dot visited"></i> 去过</span><strong data-pin-count>0 个地点</strong></div><span class="map-data-credit">投影：<a href="https://www.un.org/osaa/en/news/victory-africa-un-votes-resolution-correct-map" target="_blank" rel="noopener noreferrer">Equal Earth</a> · 边界：<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></span></div>
    <p class="map-storage-note" data-map-message role="status">标记保存在当前浏览器；导出后可备份或在其他设备导入。</p>
    ${renderDestinationPicker(region,compact)}
    ${renderRegionDirectory(region,compact)}
    <div class="map-place-list" data-map-list></div>
    <dialog class="pin-dialog" data-pin-dialog aria-labelledby="pin-dialog-title"><form data-pin-form><div class="pin-dialog-top"><span class="mono">A PLACE TO REMEMBER</span><button type="button" class="pin-close" data-dialog-close aria-label="关闭地点窗口">×</button></div><h2 id="pin-dialog-title">放下一枚 📌</h2><p class="pin-form-intro">每一个地方，都有自己的故事。</p><label>地点名称<input name="title" maxlength="80" placeholder="例如：京都、冰岛、马赛马拉…" required autocomplete="off"></label><input name="lat" type="hidden"><input name="lon" type="hidden"><label>状态<select name="status"><option value="want">想去 · 旅行心愿</option><option value="visited">去过 · 我的足迹</option></select></label><label>留一点备注 <span class="optional">选填</span><textarea name="note" maxlength="500" rows="3" placeholder="想在这里做什么，或一段旅行回忆…"></textarea></label><p class="pin-form-error" data-pin-error role="alert"></p><div class="pin-dialog-actions"><button type="button" class="pin-delete" data-pin-delete hidden>删除地点</button><button type="button" class="map-tool" data-dialog-cancel>取消</button><button type="submit" class="map-add">保存地点 ↗</button></div></form></dialog>
    ${renderPlaceSearch(region)}
  </div>`;
}

export function mountTravelMap(root,destinations=[],region={kind:"world",name:"世界"}) {
  if(!root) return ()=>{};
  const presets=destinations.filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lon)).map(place=>normalizePin({id:`source-${place.id}`,title:place.name,note:place.description,lat:place.lat,lon:place.lon,status:place.status||'want'}));
  let state=readState();
  let selectedId=null;
  let selectedCountryHint;
  let adding=false;
  let view=fitRegion(region);
  let picker;
  let placeSearch;
  const svg=root.querySelector('[data-world-map]');
  const markers=root.querySelector('[data-map-markers]');
  const dialog=root.querySelector('[data-pin-dialog]');
  const form=root.querySelector('[data-pin-form]');
  const error=root.querySelector('[data-pin-error]');
  const message=root.querySelector('[data-map-message]');
  const fields=form.elements;
  const allPins=()=>combinePins(presets,state);
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
    const pins=pinsInRegion(allPins(),region);
    const scale=view.width/1000;
    markers.innerHTML=pins.map(pin=>{const p=project(pin.lat,pin.lon);return `<g class="map-pin-marker ${pin.status==='visited'?'is-visited':''}" transform="translate(${p.x} ${p.y}) scale(${scale})" tabindex="0" role="button" data-pin-id="${esc(pin.id)}" aria-label="${esc(pin.title)}，${pin.status==='visited'?'去过':'想去'}，点击编辑"><title>${esc(pin.title)}</title><circle cy="-12" r="16" class="marker-hit-area"/><g class="marker-visual"><circle cy="-12" r="16" class="marker-halo"/><path class="marker-shape" d="M0 0C-3-5-10-10-10-17a10 10 0 0 1 20 0C10-10 3-5 0 0Z"/><circle cy="-17" r="3.2" class="marker-center"/></g></g>`;}).join('');
    root.querySelector('[data-pin-count]').textContent=`${pins.length} 个地点`;
    document.querySelector('.travel-count')?.replaceChildren(document.createTextNode(`${String(pins.length).padStart(2,'0')} PLACES TO GO`));
    const list=root.querySelector('[data-map-list]');
    list.innerHTML=pins.length ? `<div class="map-list-heading"><h2>心愿与足迹 <span>${pins.length}</span></h2><span>点击地点，编辑你的旅行记录</span></div><div class="map-place-grid">${pins.map(pin=>`<button class="map-place-card" data-place-id="${esc(pin.id)}"><span class="place-status ${pin.status==='visited'?'visited':''}">${pin.status==='visited'?'已去过':'想去'}</span><strong>${esc(pin.title)}</strong>${pin.note?`<p>${esc(pin.note)}</p>`:''}<span class="place-edit-link">编辑记录 ↗</span></button>`).join('')}</div>` : `<div class="map-no-places"><span aria-hidden="true">✳</span><p>${region.kind==='world'?'世界很大，先从一个想去的地方开始。':esc(region.name)+'的旅行记录，还在等第一枚标记。'}</p><button class="text-link" data-first-pin>添加第一个地点 <span>↗</span></button></div>`;
    picker?.update();
    placeSearch?.update();
  }
  function addPlace(place) {
    const id=place.pinId||destinationPinId(place);
    if(findDestinationPin({...place,id},allPins()))throw new Error('这个地点已在地图中，可以点击标记编辑。');
    if(allPins().length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
    const pin=normalizePin({id,title:place.name,lat:place.lat,lon:place.lon,note:'',status:'want',countryHint:place.countryHint});
    state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);
    return {saved:store(),pin,inRegion:Boolean(pinsInRegion([pin],region).length)};
  }
  const addDestination=place=>addPlace({...place,pinId:destinationPinId(place)});
  function showEditor(pin) {
    selectedId=pin?.id||null;
    selectedCountryHint=pin?.countryHint;
    fields.title.value=pin?.title||'';
    fields.lat.value=pin?.lat===undefined?'':String(pin.lat);
    fields.lon.value=pin?.lon===undefined?'':String(pin.lon);
    fields.status.value=pin?.status||'want';
    fields.note.value=pin?.note||'';
    error.textContent='';
    root.querySelector('#pin-dialog-title').textContent=selectedId?'编辑这个地点':'放下一枚 📌';
    root.querySelector('[data-pin-delete]').hidden=!selectedId;
    dialog.showModal();
    fields.title.focus();
    setAdding(false);
  }
  function selectPin(id) {const pin=allPins().find(pin=>pin.id===id);if(pin)showEditor(pin);}
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
      const pin=normalizePin({id:selectedId||crypto.randomUUID(),title:fields.title.value,note:fields.note.value,lat:Number(fields.lat.value),lon:Number(fields.lon.value),status:fields.status.value,countryHint:selectedCountryHint});
      if(!selectedId&&allPins().length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
      if(!selectedId&&findDestinationPin(pin,allPins()))throw new Error('这个地点已在地图中，可以点击标记编辑。');
      state.pins=state.pins.filter(item=>item.id!==pin.id);state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);const saved=store();dialog.close();if(saved&&!pinsInRegion([pin],region).length)announce('地点已保存到世界地图；它不在当前区域内。');
    }catch(err){error.textContent=err.message;}
  });
  root.querySelector('[data-pin-delete]').addEventListener('click',()=>{if(!selectedId)return;state.pins=state.pins.filter(pin=>pin.id!==selectedId);if(presets.some(pin=>pin.id===selectedId))state.hidden=[...new Set([...state.hidden,selectedId])];const saved=store();dialog.close();if(saved)announce('地点已删除，当前浏览器中的地图已更新。');});
  root.querySelector('[data-map-export]').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,pins:allPins(),hidden:state.hidden},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-travel-map.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('地图已导出。可在其他设备使用“导入”恢复这些地点。');
  });
  const fileInput=root.querySelector('[data-map-file]');
  root.querySelector('[data-map-import]').addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file)return;
    try{if(file.size>5000000)throw new Error('文件太大，请选择小于 5 MB 的地图备份。');const imported=parseImportState(await file.text());const merged=new Map(state.pins.map(pin=>[pin.id,pin]));imported.pins.forEach(pin=>merged.set(pin.id,pin));const hidden=[...new Set([...state.hidden,...imported.hidden])].filter(id=>!imported.pins.some(pin=>pin.id===id));const next={pins:[...merged.values()].filter(pin=>!hidden.includes(pin.id)),hidden};if(combinePins(presets,next).length>1000||next.hidden.length>1000)throw new Error('合并后超过 1000 个地点，请先整理地图。');state=next;const saved=store();if(saved)announce(`已导入 ${imported.pins.length} 个地点，并与当前地图合并。`);}
    catch(err){announce(`导入失败：${err.message}`);}finally{fileInput.value='';}
  });
  function onStorage(event){if(event.key===STORAGE_KEY){memoryState=undefined;state=readState();draw();announce('地图已与此浏览器中的另一个标签页同步。');}}
  function onEscape(event){if(event.key==='Escape')setAdding(false);}
  window.addEventListener('storage',onStorage);document.addEventListener('keydown',onEscape);
  const scene=mountMapScene(root,{region,isAdding:()=>adding,onMarkerClick:selectPin,onChoosePoint:showEditor,announce,onViewChange:next=>{view=next;markers.querySelectorAll('[data-pin-id]').forEach(marker=>{const pin=allPins().find(pin=>pin.id===marker.dataset.pinId);if(pin){const p=project(pin.lat,pin.lon);marker.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${view.width/1000})`);}});}});
  picker=mountDestinationPicker(root,{region,getPins:allPins,onAdd:addDestination});
  placeSearch=mountPlaceSearch(root,{region,getPins:allPins,onAdd:addPlace,onEdit:selectPin});
  draw();
  return ()=>{placeSearch.destroy();picker.destroy();scene.destroy();window.removeEventListener('storage',onStorage);document.removeEventListener('keydown',onEscape);if(dialog.open)dialog.close();};
}
