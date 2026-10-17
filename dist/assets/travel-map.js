import {STORAGE_KEY,project,unproject,normalizePin,parseImportState,combinePins} from './map-model.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let memoryState;
function readState() {
  if(memoryState) return memoryState;
  try {const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"pins":[],"hidden":[]}');memoryState={pins:Array.isArray(value.pins)?value.pins.map(normalizePin):[],hidden:Array.isArray(value.hidden)?value.hidden.filter(id=>typeof id==='string'):[]};}
  catch {memoryState={pins:[],hidden:[]};}
  return memoryState;
}

export function renderTravelMap({compact=false}={}) {
  return `<div class="travel-map ${compact?'map-compact':''}" data-travel-map>
    <div class="map-toolbar"><div class="map-toolbar-start"><button class="map-add" data-map-add aria-pressed="false"><span aria-hidden="true">＋</span> 添加地点</button><button class="map-tool" data-map-coordinates>输入坐标</button></div><div class="map-file-tools"><button class="map-tool" data-map-export>导出地图 ↗</button><button class="map-tool" data-map-import>导入</button><input type="file" accept="application/json,.json" data-map-file hidden></div></div>
    <div class="map-stage"><svg class="world-map" data-world-map viewBox="0 0 1000 500" role="group" aria-label="可交互世界地图。使用添加地点或输入坐标放置旅行标记。"><defs><pattern id="map-grid" width="83.33333" height="83.33333" patternUnits="userSpaceOnUse"><path d="M83.33333 0H0V83.33333" fill="none" stroke="#dce3d3" stroke-width=".65"/></pattern></defs><rect width="1000" height="500" fill="#edf1e7"/><rect width="1000" height="500" fill="url(#map-grid)"/><image href="assets/world-map.svg" width="1000" height="500"/><g class="map-markers" data-map-markers></g></svg>
      <div class="map-zoom" role="group" aria-label="地图缩放"><button data-map-zoom="in" aria-label="放大地图">＋</button><button data-map-zoom="out" aria-label="缩小地图">−</button><button data-map-reset aria-label="查看完整世界地图">⌂</button></div><div class="map-coordinate-hint mono" aria-hidden="true">90° N <span>180° W — 180° E</span></div><div class="map-placement-hint" data-map-hint hidden>点击地图，放下你的第一枚 📌 <button data-map-cancel>取消</button></div>
    </div>
    <div class="map-bottom"><div class="map-legend"><span><i class="legend-dot"></i> 想去</span><span><i class="legend-dot visited"></i> 去过</span><strong data-pin-count>0 个地点</strong></div><span class="map-data-credit">底图：<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></span></div>
    <p class="map-storage-note" data-map-message role="status">标记保存在当前浏览器；导出后可备份或在其他设备导入。</p>
    <div class="map-place-list" data-map-list></div>
    <dialog class="pin-dialog" aria-labelledby="pin-dialog-title"><form data-pin-form><div class="pin-dialog-top"><span class="mono">A PLACE TO REMEMBER</span><button type="button" class="pin-close" data-dialog-close aria-label="关闭地点窗口">×</button></div><h2 id="pin-dialog-title">放下一枚 📌</h2><p class="pin-form-intro">一个地名，一点期待。为下一程留个坐标。</p><label>地点名称<input name="title" maxlength="80" placeholder="例如：京都、冰岛、马赛马拉…" required autocomplete="off"></label><div class="pin-form-row"><label>纬度<input name="lat" type="number" min="-90" max="90" step="any" placeholder="-90 到 90" required></label><label>经度<input name="lon" type="number" min="-180" max="180" step="any" placeholder="-180 到 180" required></label></div><label>状态<select name="status"><option value="want">想去 · 旅行心愿</option><option value="visited">去过 · 我的足迹</option></select></label><label>留一点备注 <span class="optional">选填</span><textarea name="note" maxlength="500" rows="3" placeholder="想在这里做什么，或一段旅行回忆…"></textarea></label><p class="pin-form-error" data-pin-error role="alert"></p><div class="pin-dialog-actions"><button type="button" class="pin-delete" data-pin-delete hidden>删除地点</button><button type="button" class="map-tool" data-dialog-cancel>取消</button><button type="submit" class="map-add">保存地点 ↗</button></div></form></dialog>
  </div>`;
}

export function mountTravelMap(root,destinations=[]) {
  if(!root) return ()=>{};
  const presets=destinations.filter(place=>Number.isFinite(place.lat)&&Number.isFinite(place.lon)).map(place=>normalizePin({id:`source-${place.id}`,title:place.name,note:place.description,lat:place.lat,lon:place.lon,status:place.status||'want'}));
  let state=readState();
  let selectedId=null;
  let adding=false;
  let view={x:0,y:0,width:1000,height:500};
  let drag=null;
  let suppressClick=false;
  const svg=root.querySelector('[data-world-map]');
  const markers=root.querySelector('[data-map-markers]');
  const dialog=root.querySelector('dialog');
  const form=root.querySelector('form');
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
    root.querySelector('[data-map-add]').setAttribute('aria-pressed',String(value));
    root.querySelector('[data-map-hint]').hidden=!value;
    root.querySelector('[data-map-hint]').firstChild.textContent='点击地图，放下你的 📌 ';
    if(value) announce('已进入标记模式。请点击地图选择地点；也可以使用“输入坐标”。');
  }
  function draw() {
    const pins=allPins();
    const scale=view.width/1000;
    markers.innerHTML=pins.map(pin=>{const p=project(pin.lat,pin.lon);return `<g class="map-pin-marker ${pin.status==='visited'?'is-visited':''}" transform="translate(${p.x} ${p.y}) scale(${scale})" tabindex="0" role="button" data-pin-id="${esc(pin.id)}" aria-label="${esc(pin.title)}，${pin.status==='visited'?'去过':'想去'}，点击编辑"><title>${esc(pin.title)}</title><circle cy="-12" r="16" class="marker-halo"/><path class="marker-shape" d="M0 0C-3-5-10-10-10-17a10 10 0 0 1 20 0C10-10 3-5 0 0Z"/><circle cy="-17" r="3.2" class="marker-center"/></g>`;}).join('');
    root.querySelector('[data-pin-count]').textContent=`${pins.length} 个地点`;
    document.querySelector('.travel-count')?.replaceChildren(document.createTextNode(`${String(pins.length).padStart(2,'0')} PLACES TO GO`));
    const list=root.querySelector('[data-map-list]');
    list.innerHTML=pins.length ? `<div class="map-list-heading"><h2>心愿与足迹 <span>${pins.length}</span></h2><span>点击地点，编辑你的旅行记录</span></div><div class="map-place-grid">${pins.map(pin=>`<button class="map-place-card" data-place-id="${esc(pin.id)}"><span class="place-status ${pin.status==='visited'?'visited':''}">${pin.status==='visited'?'已去过':'想去'}</span><strong>${esc(pin.title)}</strong>${pin.note?`<p>${esc(pin.note)}</p>`:''}<span class="place-coordinates mono">${Math.abs(pin.lat).toFixed(2)}° ${pin.lat>=0?'N':'S'} · ${Math.abs(pin.lon).toFixed(2)}° ${pin.lon>=0?'E':'W'} <span>↗</span></span></button>`).join('')}</div>` : '<div class="map-no-places"><span aria-hidden="true">✳</span><p>世界很大，先从一个想去的地方开始。</p><button class="text-link" data-first-pin>放下第一枚标记 <span>↗</span></button></div>';
  }
  function showEditor(pin) {
    selectedId=pin?.id||null;
    fields.title.value=pin?.title||'';
    fields.lat.value=pin?.lat===undefined?'':pin.lat.toFixed(4);
    fields.lon.value=pin?.lon===undefined?'':pin.lon.toFixed(4);
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
  function setView() {svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);draw();}
  function zoom(factor) {
    const width=Math.max(125,Math.min(1000,view.width*factor));
    const height=width/2;
    view={x:Math.max(0,Math.min(1000-width,view.x+(view.width-width)/2)),y:Math.max(0,Math.min(500-height,view.y+(view.height-height)/2)),width,height};
    setView();
  }
  root.querySelector('[data-map-add]').addEventListener('click',()=>setAdding(!adding));
  root.querySelector('[data-map-coordinates]').addEventListener('click',()=>showEditor());
  root.querySelector('[data-map-cancel]').addEventListener('click',()=>setAdding(false));
  root.querySelectorAll('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>zoom(button.dataset.mapZoom==='in'?.65:1/.65)));
  root.querySelector('[data-map-reset]').addEventListener('click',()=>{view={x:0,y:0,width:1000,height:500};setView();});
  svg.addEventListener('click',event=>{
    if(suppressClick){suppressClick=false;return;}
    const marker=event.target.closest('[data-pin-id]');
    if(marker){selectPin(marker.dataset.pinId);return;}
    if(!adding) return;
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const position=point.matrixTransform(matrix.inverse());
    if(position.x<0||position.x>1000||position.y<0||position.y>500) return;
    showEditor(unproject(position.x,position.y));
  });
  svg.addEventListener('keydown',event=>{const marker=event.target.closest('[data-pin-id]');if(marker&&['Enter',' '].includes(event.key)){event.preventDefault();selectPin(marker.dataset.pinId);}});
  svg.addEventListener('pointerdown',event=>{if(adding||event.target.closest('[data-pin-id]')||event.button!==0)return;drag={x:event.clientX,y:event.clientY,startX:view.x,startY:view.y,moved:false};svg.setPointerCapture(event.pointerId);});
  svg.addEventListener('pointermove',event=>{
    if(!drag)return;
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const dx=(event.clientX-drag.x)/matrix.a,dy=(event.clientY-drag.y)/matrix.d;
    if(Math.abs(event.clientX-drag.x)+Math.abs(event.clientY-drag.y)>5)drag.moved=true;
    view.x=Math.max(0,Math.min(1000-view.width,drag.startX-dx));view.y=Math.max(0,Math.min(500-view.height,drag.startY-dy));
    svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);
  });
  const finishDrag=()=>{if(drag?.moved)suppressClick=true;drag=null;};
  svg.addEventListener('pointerup',finishDrag);svg.addEventListener('pointercancel',()=>{drag=null;suppressClick=false;});
  root.addEventListener('click',event=>{const item=event.target.closest('[data-place-id]');if(item)selectPin(item.dataset.placeId);if(event.target.closest('[data-first-pin]')){setAdding(true);svg.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
  root.querySelectorAll('[data-dialog-close],[data-dialog-cancel]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    try{
      const pin=normalizePin({id:selectedId||crypto.randomUUID(),title:fields.title.value,note:fields.note.value,lat:Number(fields.lat.value),lon:Number(fields.lon.value),status:fields.status.value});
      if(!selectedId&&allPins().length>=1000)throw new Error('地图最多保存 1000 个地点。请先整理已有地点。');
      state.pins=state.pins.filter(item=>item.id!==pin.id);state.pins.push(pin);state.hidden=state.hidden.filter(id=>id!==pin.id);store();dialog.close();
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
  draw();
  return ()=>{window.removeEventListener('storage',onStorage);document.removeEventListener('keydown',onEscape);if(dialog.open)dialog.close();};
}
