import {writeRecord} from './cloud-sync.js?v=20261023-cloud-palette';
import {getTravelResidences} from './travel-map.js?v=20261023-cloud-palette';
import {residenceDuration,pinStatusLabel,STORAGE_KEY as TRAVEL_STORAGE_KEY} from './map-model.js?v=20261023-cloud-palette';
import {renderPinDrawing} from './pin-icons.js?v=20261023-cloud-palette';
import {placeGuideHref} from './place-media.js?v=20261023-cloud-palette';
import {ACADEMIC_STORAGE_KEY,ACADEMIC_LIMIT,academicWebsite,normalizeAcademicGroup,normalizeAcademicCountryHint,academicBackup,parseAcademicBackup,mergeAcademicGroups} from './academic-model.js?v=20261023-cloud-palette';
import {project} from './projection.js?v=20261023-cloud-palette';
import {fitRegion,pinsInRegion,countryAt} from './geography.js?v=20261023-cloud-palette';
import {renderMapScene,mountMapScene,renderRegionDirectory} from './map-scene.js?v=20261023-cloud-palette';
import {renderAcademicGlobe,mountAcademicGlobe} from './academic-globe.js?v=20261023-cloud-palette';
import {localPlaceMatches,searchOnlinePlaces,searchFocus} from './place-search.js?v=20261023-cloud-palette';
import {toTraditional} from './i18n.js?v=20261023-cloud-palette';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external='target="_blank" rel="noopener noreferrer"';
let memoryGroups,readWarning='';
const viewStorageKey='tobias.academic-map.view.v1';
const academicViews=new Set(['globe','flat','satellite']);
function readView(){try{const value=localStorage.getItem(viewStorageKey);return academicViews.has(value)?value:'globe';}catch{return 'globe';}}
function readGroups() {
  if(memoryGroups)return memoryGroups;
  try{
    const stored=localStorage.getItem(ACADEMIC_STORAGE_KEY);
    memoryGroups=stored?parseAcademicBackup(stored):[];readWarning='';
  }catch{memoryGroups=[];readWarning='暂时无法读取研究组收藏。请检查浏览器存储，或导入已有备份。';}
  return memoryGroups;
}
export function getOverviewFiltered(groups,region={kind:'world'}) {return pinsInRegion(groups,region);}
const searchKey=text=>String(text).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export function filterAcademicGroups(groups,query='') {
  const words=searchKey(query.trim()).split(/\s+/).filter(Boolean);
  return groups.filter(group=>{const content=`${group.name} ${group.institution} ${group.research} ${group.note}`;const searchable=searchKey(`${content} ${toTraditional(content)}`);return words.every(word=>searchable.includes(word));});
}

export function renderAcademicMap({region={kind:'world',name:'世界'},compact=false}={}) {
  return `<div class="academic-map ${compact?'academic-map-compact':''}" data-academic-map>
    <div class="academic-map-toolbar"><div><button type="button" class="academic-add" data-academic-add>＋ 收藏研究组</button><button type="button" class="academic-tool" data-academic-pick aria-pressed="false">在地图上选位置</button></div><div><button type="button" class="academic-tool" data-academic-export>导出研究组</button><button type="button" class="academic-tool" data-academic-import>导入</button><input type="file" accept="application/json,.json" data-academic-file hidden></div></div>
    <div class="academic-view-switch" role="group" aria-label="学术地图显示方式"><button type="button" data-academic-view="flat" aria-pressed="false">平面地图</button><button type="button" data-academic-view="globe" aria-pressed="true">地理球</button><button type="button" data-academic-view="satellite" aria-pressed="false">卫星地球</button></div>
    <div class="academic-residences" data-academic-residences hidden></div><div class="academic-view-host" data-academic-globe-host>${renderAcademicGlobe()}</div>
    <div class="academic-view-host" data-academic-flat-host hidden>${renderMapScene(region,false,{geographicOnly:true,routeBase:'#/academic'})}</div>
    <div class="academic-map-summary"><span class="academic-marker-key"><i aria-hidden="true"></i>感兴趣的研究组</span><span data-academic-count>0 个研究组</span><span data-academic-map-credit>Natural Earth</span></div>
    <p class="academic-map-message" data-academic-message role="status">研究组收藏会自动同步到云端，独立于旅行地图。可导出备份。</p>
    ${renderRegionDirectory(region,compact,{routeBase:'#/academic'})}
    <section class="academic-collection"><div class="academic-collection-heading"><div><span class="section-kicker mono">RESEARCH CONNECTIONS</span><h2>感兴趣的研究组 <span data-academic-visible-count>0</span></h2></div><label class="academic-list-search"><span class="sr-only">搜索研究组、机构或研究方向</span><input type="search" data-academic-list-query placeholder="搜索研究组、机构或研究方向…" autocomplete="off"></label></div><div data-academic-list></div></section>
    <dialog class="academic-dialog" data-academic-dialog aria-labelledby="academic-dialog-title"><form data-academic-form><div class="academic-dialog-top"><span class="mono">A RESEARCH GROUP TO REMEMBER</span><button type="button" class="pin-close" data-academic-close aria-label="关闭研究组资料">×</button></div><h2 id="academic-dialog-title">收藏一个研究组</h2><p class="academic-form-intro">搜索所在城市或机构来定位，再填写你自己的研究组资料。</p><label>研究组名称<input name="name" maxlength="80" required autocomplete="off"></label><label>所属机构 <span>选填</span><input name="institution" maxlength="120" autocomplete="off"></label>
    <section class="academic-location"><label>研究组所在城市或机构<div class="academic-location-input"><input type="search" name="locationQuery" maxlength="180" placeholder="例如：Copenhagen、University of Oxford…" autocomplete="off" data-academic-location-query><button type="button" class="academic-add" data-academic-location-search>搜索位置</button></div></label><p class="academic-location-choice" data-academic-location-choice role="status">请从搜索结果中选择一个位置。</p><input name="lat" type="hidden"><input name="lon" type="hidden"><p class="academic-location-status" data-academic-location-status role="status"></p><div class="academic-location-results" data-academic-location-results></div><p class="academic-location-credit">地点搜索：<a href="https://photon.komoot.io/" ${external}>Photon</a> · <a href="https://www.openstreetmap.org/copyright" ${external}>© OpenStreetMap contributors</a></p></section>
    <label>研究方向 <span>选填</span><textarea name="research" maxlength="500" rows="3" placeholder="记录你感兴趣的研究问题、方法或领域…"></textarea></label><label>研究组官网 <span>选填</span><input name="website" type="url" maxlength="2000" placeholder="https://…"><a class="academic-current-website" data-academic-current-website ${external} hidden>打开已保存的官网 ↗</a></label><label>我的备注 <span>选填</span><textarea name="note" maxlength="3000" rows="4" placeholder="为什么关注这个小组，或以后想了解什么…"></textarea></label><p class="academic-form-error" data-academic-form-error role="alert"></p><div class="academic-dialog-actions"><button type="button" class="academic-delete" data-academic-delete hidden>删除研究组</button><button type="button" class="academic-tool" data-academic-close>取消</button><button type="submit" class="academic-add">保存研究组 ↗</button></div></form></dialog>
  </div>`;
}

export function mountAcademicMap(root,{region={kind:'world',name:'世界'}}={}) {
  if(!root)return ()=>{};
  let groups=readGroups(),selectedId=null,selectedHint,adding=false,view=fitRegion(region),stopped=false,activeView=readView(),globe;
  let searchRevision=0,searchController=null,locationChoices=new Map(),searchPhase='idle',searchError='',onlineChoices=[];
  const flatHost=root.querySelector('[data-academic-flat-host]'),globeHost=root.querySelector('[data-academic-globe-host]'),markers=flatHost.querySelector('[data-map-markers]');
  const dialog=root.querySelector('[data-academic-dialog]'),form=root.querySelector('[data-academic-form]'),fields=form.elements;
  const message=root.querySelector('[data-academic-message]'),error=root.querySelector('[data-academic-form-error]');
  const listQuery=root.querySelector('[data-academic-list-query]'),locationQuery=root.querySelector('[data-academic-location-query]');
  const locationStatus=root.querySelector('[data-academic-location-status]'),locationResults=root.querySelector('[data-academic-location-results]'),locationChoice=root.querySelector('[data-academic-location-choice]');
  const locationSearch=root.querySelector('[data-academic-location-search]'),file=root.querySelector('[data-academic-file]');
  const announce=text=>{message.textContent=text;};
  function applyView(value,{persist=false}={}) {
    activeView=academicViews.has(value)?value:'globe';flatHost.hidden=activeView!=='flat';globeHost.hidden=activeView==='flat';
    root.querySelectorAll('[data-academic-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.academicView===activeView)));
    root.querySelector('[data-academic-map-credit]').textContent=activeView==='flat'?'Equal Earth · Natural Earth':activeView==='satellite'?'NASA Visible Earth · Natural Earth':'Natural Earth';
    globe?.setMode(activeView==='satellite'?'satellite':'geographic');
    if(persist){try{localStorage.setItem(viewStorageKey,activeView);}catch{announce('显示方式已切换，浏览器暂时无法记住此偏好。');}}
  }
  function stopSearch(){searchRevision++;searchController?.abort();searchController=null;}
  function store(next) {
    groups=next;memoryGroups=next;let saved=true;
    try{writeRecord(ACADEMIC_STORAGE_KEY,JSON.stringify(academicBackup(next)));readWarning='';announce('研究组资料已更新，云端同步状态见右上角。');}
    catch{saved=false;readWarning='浏览器未能保存研究组，本次修改暂存在当前页面。请导出研究组备份。';announce(readWarning);}
    draw();return saved;
  }
  function setAdding(value) {
    adding=value;root.classList.toggle('is-placing',value);root.querySelector('[data-academic-pick]').setAttribute('aria-pressed',String(value));
    root.querySelectorAll('[data-map-hint]').forEach(hint=>{hint.hidden=!value;if(hint.firstChild?.nodeType===3)hint.firstChild.textContent='点击地图，选择研究组所在位置。 ';});
    if(value)announce('请在地图上选择研究组所在位置，再填写资料。');
  }
  let residenceSnapshot=[];const residenceRecords=()=>residenceSnapshot;
  function draw() {
    residenceSnapshot=getTravelResidences().filter(pin=>pin.status==='resident').map(pin=>({id:'@residence:'+pin.id,name:pin.title,lat:pin.lat,lon:pin.lon,isResidence:true,status:pin.status,period:'',pin}));
    const regional=getOverviewFiltered(groups,region),visible=filterAcademicGroups(regional,listQuery.value);
    const residences=residenceRecords(),regionalResidences=getOverviewFiltered(residences,region);
    globe?.setGroups([...regional,...regionalResidences]);
    const residenceStrip=root.querySelector('[data-academic-residences]');if(residenceStrip){residenceStrip.hidden=!residences.length;residenceStrip.innerHTML=residences.map(home=>`<a class="academic-residence-link ${home.status==='want-resident'?'is-wanted':''}" href="${esc(placeGuideHref(home.pin))}"><span aria-hidden="true">★</span><span>${pinStatusLabel(home.pin)}</span><strong data-i18n-skip>${esc(home.name)}</strong><small>${esc(home.period)}</small></a>`).join('');}
    markers.innerHTML=regional.map(group=>{const point=project(group.lat,group.lon);return `<g class="academic-marker" data-pin-id="${esc(group.id)}" transform="translate(${point.x} ${point.y}) scale(${view.width/1000})" tabindex="0" role="button" aria-label="${esc(group.name)}，查看研究组资料" data-i18n-skip><title>${esc(group.name)}</title><circle class="academic-marker-hit" r="21"/><g class="academic-marker-visual"><circle class="academic-marker-halo" r="16"/><circle class="academic-marker-disc" r="11"/><path class="academic-marker-book" d="M0-4.5C-2-6-4.5-6-6.5-5V5C-4.5 4-2 4 0 5.5C2 4 4.5 4 6.5 5V-5C4.5-6 2-6 0-4.5ZM0-4.5V5.5"/></g></g>`;}).join('');
    markers.innerHTML+=regionalResidences.map(home=>{const point=project(home.lat,home.lon);return `<g class="academic-residence-marker ${home.status==='want-resident'?'is-wanted':''}" data-pin-id="${esc(home.id)}" role="button" tabindex="0" transform="translate(${point.x} ${point.y}) scale(${view.width/1000})" aria-label="${esc(home.name)}，${pinStatusLabel(home.pin)}" data-i18n-skip><circle r="20" fill="transparent"/><g class="academic-residence-visual">${renderPinDrawing('city',home.status)}</g><text x="18" y="2" class="academic-residence-label">${esc(home.name)}</text><text x="18" y="14" class="academic-residence-period">${esc(home.period)}</text></g>`;}).join('');
    root.querySelector('[data-academic-count]').textContent=`${regional.length} 个研究组`;
    root.querySelector('[data-academic-visible-count]').textContent=String(visible.length);
    root.querySelector('[data-academic-list]').innerHTML=visible.length?`<div class="academic-group-grid">${visible.map(group=>`<article class="academic-group-card"><button type="button" class="academic-group-open" data-academic-group-id="${esc(group.id)}"><span class="section-kicker mono">RESEARCH GROUP</span><h3 data-i18n-skip>${esc(group.name)}</h3>${group.institution?`<p class="academic-group-institution" data-i18n-skip>${esc(group.institution)}</p>`:''}${group.research?`<p class="academic-group-research" data-i18n-skip>${esc(group.research)}</p>`:''}${group.note?`<p class="academic-group-note" data-i18n-skip>${esc(group.note)}</p>`:''}<span class="academic-group-edit">查看与编辑资料 ↗</span></button>${group.website?`<a class="academic-group-website" href="${esc(academicWebsite(group.website))}" ${external}>研究组官网 <span>↗</span></a>`:''}</article>`).join('')}</div>`:`<div class="academic-empty"><span aria-hidden="true">⌕</span><h3>${listQuery.value.trim()?'没有找到匹配的研究组。':'从一个感兴趣的研究组开始。'}</h3><p>${listQuery.value.trim()?'试试机构名称或研究方向关键词。':'这里还没有研究组收藏，资料由你自己添加。'}</p>${listQuery.value.trim()?'':'<button type="button" class="text-link" data-academic-first>收藏第一个研究组 ↗</button>'}</div>`;
  }
  function drawLocations() {
    const local=localPlaceMatches(locationQuery.value,region,6),all=[...local,...onlineChoices.filter(place=>!local.some(item=>Math.abs(item.lat-place.lat)<.00001&&Math.abs(item.lon-place.lon)<.00001))];
    locationChoices=new Map(all.map((place,index)=>[String(index),place]));
    locationResults.innerHTML=all.map((place,index)=>`<button type="button" data-academic-location-id="${index}"><span><strong data-i18n-skip>${esc(place.name)}</strong>${place.subtitle?`<small data-i18n-skip>${esc(place.subtitle)}</small>`:''}</span><span>选择位置 ↗</span></button>`).join('');
    locationSearch.disabled=searchPhase==='loading';
    locationStatus.classList.toggle('is-error',searchPhase==='error');
    locationStatus.textContent=searchPhase==='loading'?'正在搜索位置…':searchPhase==='error'?searchError:searchPhase==='done'&&!all.length?'没有找到位置。请加上城市名，或试试英文名称。':'输入地点后点击“搜索位置”，选择一个结果即可定位。';
  }
  function chooseLocation(place) {
    fields.lat.value=String(place.lat);fields.lon.value=String(place.lon);
    selectedHint=normalizeAcademicCountryHint(place.countryHint||(place.country?{id:place.country,lat:place.lat,lon:place.lon}:null))||undefined;
    locationChoice.innerHTML=`<span>已选择位置：</span><strong data-i18n-skip>${esc(place.name||'')}</strong>`;
    globe?.focus({lat:place.lat,lon:place.lon});
    error.textContent='';
  }
  function openEditor(group,point) {
    stopSearch();selectedId=group?.id||null;selectedHint=group?.countryHint;searchPhase='idle';onlineChoices=[];locationQuery.value='';
    for(const field of ['name','institution','research','website','note'])fields[field].value=group?.[field]||'';
    fields.lat.value=group?String(group.lat):'';fields.lon.value=group?String(group.lon):'';
    locationChoice.textContent=group?'位置已保存。可以搜索地名重新定位。':'请从搜索结果中选择一个位置。';
    if(point){const country=countryAt(point.lat,point.lon);fields.lat.value=String(point.lat);fields.lon.value=String(point.lon);selectedHint=country?{id:country.id,lat:point.lat,lon:point.lon}:undefined;locationChoice.textContent='已选择地图上的位置。';}
    root.querySelector('#academic-dialog-title').textContent=group?'研究组资料':'收藏一个研究组';root.querySelector('[data-academic-delete]').hidden=!group;
    const website=root.querySelector('[data-academic-current-website]');website.hidden=!group?.website;if(group?.website)website.href=academicWebsite(group.website);
    error.textContent='';drawLocations();setAdding(false);dialog.showModal();fields.name.focus();
  }
  function selectGroup(id){const home=residenceRecords().find(item=>item.id===id);if(home){location.hash=placeGuideHref(home.pin);return;}const group=groups.find(item=>item.id===id);if(group)openEditor(group);}
  function closeEditor(){stopSearch();dialog.close();}
  function onLocationInput(){stopSearch();searchPhase='idle';onlineChoices=[];fields.lat.value='';fields.lon.value='';selectedHint=undefined;locationChoice.textContent='请从搜索结果中选择一个位置。';drawLocations();}
  async function searchLocation() {
    const query=locationQuery.value.trim();if(!query){locationStatus.textContent='请输入所在城市或机构名称。';locationQuery.focus();return;}
    stopSearch();const version=searchRevision;searchController=new AbortController();const controller=searchController;searchPhase='loading';onlineChoices=[];drawLocations();
    try{const results=await searchOnlinePlaces(query,{signal:controller.signal,focus:searchFocus(region)});if(stopped||version!==searchRevision||!dialog.open||controller.signal.aborted)return;onlineChoices=results;searchPhase='done';drawLocations();}
    catch(failure){if(stopped||version!==searchRevision||!dialog.open||controller.signal.aborted)return;searchPhase='error';searchError=failure.message;drawLocations();}
    finally{if(version===searchRevision)searchController=null;}
  }
  async function onClick(event) {
    const viewButton=event.target.closest('[data-academic-view]');if(viewButton){applyView(viewButton.dataset.academicView,{persist:true});return;}
    if(event.target.closest('[data-academic-add],[data-academic-first]')){openEditor();return;}
    if(event.target.closest('[data-academic-pick]')){setAdding(!adding);return;}
    if(event.target.closest('[data-map-cancel]')){setAdding(false);return;}
    if(event.target.closest('[data-academic-close]')){closeEditor();return;}
    const group=event.target.closest('[data-academic-group-id]');if(group){selectGroup(group.dataset.academicGroupId);return;}
    const place=event.target.closest('[data-academic-location-id]');if(place){const chosen=locationChoices.get(place.dataset.academicLocationId);if(chosen)chooseLocation(chosen);return;}
    if(event.target.closest('[data-academic-location-search]')){await searchLocation();return;}
    if(event.target.closest('[data-academic-delete]')){if(!selectedId)return;const saved=store(groups.filter(item=>item.id!==selectedId));closeEditor();if(saved)announce('研究组已从学术地图删除。');return;}
    if(event.target.closest('[data-academic-import]')){file.click();return;}
    if(event.target.closest('[data-academic-export]')){
      const blob=new Blob([JSON.stringify(academicBackup(groups),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-academic-map.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('研究组备份已导出，可在另一台设备导入学术地图。');
    }
  }
  function onSubmit(event) {
    event.preventDefault();if(!form.reportValidity())return;
    try{
      if(!fields.lat.value.trim()||!fields.lon.value.trim())throw new Error('请先搜索并选择研究组所在位置。');
      const candidate={id:selectedId||undefined,name:fields.name.value,institution:fields.institution.value,research:fields.research.value,website:fields.website.value,note:fields.note.value,lat:Number(fields.lat.value),lon:Number(fields.lon.value)};
      if(selectedHint)candidate.countryHint=selectedHint;
      const group=normalizeAcademicGroup(candidate);if(!selectedId&&groups.length>=ACADEMIC_LIMIT)throw new Error('学术地图最多保存 1000 个研究组。');
      const saved=store([...groups.filter(item=>item.id!==group.id),group]);closeEditor();if(saved&&!getOverviewFiltered([group],region).length)announce('研究组已保存，可在学术世界地图查看。');
    }catch(failure){error.textContent=failure.message;}
  }
  async function onImport() {
    const chosen=file.files?.[0];if(!chosen)return;
    try{if(chosen.size>5000000)throw new Error('文件太大，请选择小于 5 MB 的学术地图备份。');const imported=parseAcademicBackup(await chosen.text());if(stopped)return;const saved=store(mergeAcademicGroups(groups,imported));if(saved)announce(`已导入 ${imported.length} 个研究组，并与学术地图合并。`);}
    catch(failure){announce(`研究组导入失败：${failure.message}`);}finally{file.value='';}
  }
  function onLocationKey(event){if(event.key==='Enter'){event.preventDefault();void searchLocation();}}
  function onDialogClose(){stopSearch();}
  function onBackdrop(event){if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeEditor();}}
  function onEscape(event){if(event.key==='Escape')setAdding(false);}
  function onStorage(event){if(event.key===TRAVEL_STORAGE_KEY){draw();return;}if(event.key===ACADEMIC_STORAGE_KEY||event.key===null){memoryGroups=undefined;groups=readGroups();draw();announce(readWarning||'已读取最新的学术地图记录。');}}
  function onLanguage(){if(dialog.open)drawLocations();}
  root.addEventListener('click',onClick);form.addEventListener('submit',onSubmit);file.addEventListener('change',onImport);listQuery.addEventListener('input',draw);locationQuery.addEventListener('input',onLocationInput);locationQuery.addEventListener('keydown',onLocationKey);dialog.addEventListener('close',onDialogClose);dialog.addEventListener('cancel',onDialogClose);dialog.addEventListener('click',onBackdrop);window.addEventListener('storage',onStorage);window.addEventListener('site-language-change',onLanguage);document.addEventListener('keydown',onEscape);
  const scene=mountMapScene(flatHost,{region,geographicOnly:true,routeBase:'#/academic',isAdding:()=>adding,onMarkerClick:selectGroup,onChoosePoint:point=>openEditor(null,point),announce,onViewChange:next=>{view=next;markers.querySelectorAll('[data-pin-id]').forEach(marker=>{const group=[...groups,...residenceRecords()].find(item=>item.id===marker.dataset.pinId);if(group){const point=project(group.lat,group.lon);marker.setAttribute('transform',`translate(${point.x} ${point.y}) scale(${view.width/1000})`);}});}});
  globe=mountAcademicGlobe(globeHost,{region,isAdding:()=>adding,onMarkerClick:selectGroup,onChoosePoint:point=>openEditor(null,point),announce});
  applyView(activeView);draw();if(readWarning)announce(readWarning);
  return ()=>{stopped=true;stopSearch();scene.destroy();globe.destroy();root.removeEventListener('click',onClick);form.removeEventListener('submit',onSubmit);file.removeEventListener('change',onImport);listQuery.removeEventListener('input',draw);locationQuery.removeEventListener('input',onLocationInput);locationQuery.removeEventListener('keydown',onLocationKey);dialog.removeEventListener('close',onDialogClose);dialog.removeEventListener('cancel',onDialogClose);dialog.removeEventListener('click',onBackdrop);window.removeEventListener('storage',onStorage);window.removeEventListener('site-language-change',onLanguage);document.removeEventListener('keydown',onEscape);if(dialog.open)dialog.close();};
}
