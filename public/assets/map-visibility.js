import {showTravelMapMarker,pinStatusLabel} from './map-model.js?v=20261023-cloud-palette';
import {renderPinDrawing} from './pin-icons.js?v=20261023-cloud-palette';
import {placeNameSearchText,toTraditional} from './i18n.js?v=20261023-cloud-palette';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modes=[['auto','自动'],['show','显示'],['hide','隐藏']];
export function renderMapVisibility(pin){
  return '<div class="place-map-visibility"><span>地图显示</span><div role="group" aria-label="'+esc(pin.title)+'，地图显示">'+modes.map(([value,label])=>'<button type="button" data-map-visibility-value="'+value+'" data-map-visibility-pin="'+esc(pin.id)+'" aria-pressed="'+((pin.mapVisibility||'auto')===value)+'">'+label+'</button>').join('')+'</div><p class="map-visibility-feedback" data-map-visibility-feedback="'+esc(pin.id)+'" role="status"></p></div>';
}
export function mountMapVisibility(root,{getPin,onSave,onChanged=()=>{}}){
  let stopped=false,saving=false;
  const controls=()=>[...root.querySelectorAll('[data-map-visibility-value]')].filter(button=>modes.some(([value])=>value===button.dataset?.mapVisibilityValue));
  function refresh(){for(const button of controls()){const pin=getPin(button.dataset.mapVisibilityPin);button.disabled=saving||!pin;button.setAttribute('aria-pressed',String((pin?.mapVisibility||'auto')===button.dataset.mapVisibilityValue));}}
  async function onClick(event){
    const button=event.target.closest?.('[data-map-visibility-value]');if(!button||saving||stopped||button.disabled)return;
    const value=button.dataset.mapVisibilityValue,id=button.dataset.mapVisibilityPin,pin=getPin(id);if(!pin||!modes.some(([mode])=>mode===value)||(pin.mapVisibility||'auto')===value)return;
    const feedback=[...root.querySelectorAll('[data-map-visibility-feedback]')].find(node=>node.dataset.mapVisibilityFeedback===id);
    const next={...pin};if(value==='auto')delete next.mapVisibility;else next.mapVisibility=value;
    saving=true;refresh();
    try{const result=await onSave(next);if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error('地图显示设置未保存，请重试。');if(stopped)return;if(feedback)feedback.textContent=result?.saved===false?'设置暂存在本页，请导出地图备份。':'已更新地图显示。';onChanged();}
    catch(error){if(!stopped&&feedback)feedback.textContent=error.message;}
    finally{saving=false;if(!stopped)refresh();}
  }
  root.addEventListener('click',onClick);refresh();
  return {refresh,destroy(){stopped=true;root.removeEventListener('click',onClick);}};
}
export function renderMapDisplaySettings(){
  return '<dialog class="map-display-dialog" data-map-display-dialog aria-labelledby="map-display-title"><div class="map-display-heading"><div><span class="mono">YOUR MAP, YOUR CHOICE</span><h2 id="map-display-title">地图显示设置</h2></div><button type="button" data-map-display-close aria-label="关闭地图显示设置">×</button></div><p class="map-display-help">自动：按缩放尺度切换，世界显示五星城市，大洲显示四星与五星，国家显示全部城市；国家图钉仅五星。居住星标保留显示。</p><p class="map-display-help">也可以逐个选择显示或隐藏，只影响地图，不改变收藏、评分和旅行状态。</p><label class="map-display-search">搜索已标记地点<input type="search" data-map-display-search placeholder="搜索地点名称…" autocomplete="off"></label><div class="map-display-list" data-map-display-list></div></dialog>';
}
export function mountMapDisplaySettings(root,{getPins,onSave,region,getRegion=()=>region}){
  const dialog=root.querySelector('[data-map-display-dialog]'),list=root.querySelector('[data-map-display-list]'),search=root.querySelector('[data-map-display-search]'),open=root.querySelector('[data-map-display]'),close=root.querySelector('[data-map-display-close]');
  function refresh(){if(!dialog.open)return;const query=toTraditional(search.value.trim()).toLocaleLowerCase(),pins=getPins().filter(pin=>toTraditional(placeNameSearchText(pin.title)).toLocaleLowerCase().includes(query)).slice().sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
    list.innerHTML=pins.length?pins.map(pin=>'<article class="map-display-row"><div class="map-display-place"><svg viewBox="-20 -38 50 44" aria-hidden="true">'+renderPinDrawing(pin.kind,pin.status)+'</svg><div><strong data-i18n-skip>'+esc(pin.title)+'</strong><span>'+pinStatusLabel(pin)+' · '+(showTravelMapMarker(pin,getRegion())?'当前显示':'当前隐藏')+'</span></div></div>'+renderMapVisibility(pin)+'</article>').join(''):'<p class="map-display-help">没有匹配的已标记地点。</p>';visibility.refresh();}
  const visibility=mountMapVisibility(list,{getPin:id=>getPins().find(pin=>pin.id===id),onSave,onChanged:refresh});
  function show(){search.value='';dialog.showModal();refresh();}function hide(){dialog.close();}
  open.addEventListener('click',show);close.addEventListener('click',hide);search.addEventListener('input',refresh);
  return {refresh,destroy(){visibility.destroy();open.removeEventListener('click',show);close.removeEventListener('click',hide);search.removeEventListener('input',refresh);if(dialog.open)dialog.close();}};
}
