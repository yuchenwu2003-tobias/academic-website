import {normalizePin,residencePeriod} from './map-model.js?v=20261018-residences';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderResidenceEditor(pin){
  return `<form class="residence-editor" data-residence-form data-residence-pin-id="${esc(pin.id)}" ${pin.status==='resident'?'':'hidden'}><div class="residence-heading"><span>居住时间</span><span data-residence-period>${esc(residencePeriod(pin))}</span></div><div class="residence-dates"><label>入住月份<input type="month" data-residence-start value="${esc(pin.residenceStart||'')}"></label><label>结束月份<input type="month" data-residence-end value="${esc(pin.residenceEnd||'')}"></label></div><small>结束时间留空表示至今。</small><button type="submit" data-residence-save>保存居住时间</button><p data-residence-feedback role="status"></p></form>`;
}
export function mountResidenceEditor(root,{getPin,onSave}){
  const form=root?.matches?.('[data-residence-form]')?root:root?.querySelector?.('[data-residence-form]');
  if(!form)return {refresh(){},destroy(){}};
  const start=form.querySelector('[data-residence-start]'),end=form.querySelector('[data-residence-end]'),button=form.querySelector('[data-residence-save]'),feedback=form.querySelector('[data-residence-feedback]');
  let stopped=false,dirty=false,saving=false;
  function refresh(force=false){const pin=getPin();form.hidden=pin?.status!=='resident';if(!dirty||force){start.value=pin?.residenceStart||'';end.value=pin?.residenceEnd||'';}form.querySelector('[data-residence-period]').textContent=residencePeriod(pin);button.disabled=saving||!pin;}
  function onInput(){dirty=true;}
  async function onSubmit(event){
    event.preventDefault();if(saving||!form.reportValidity())return;
    try{const pin=getPin();if(pin?.status!=='resident')throw new Error('请先选择居住状态。');const next=normalizePin({...pin,residenceStart:start.value,residenceEnd:end.value});saving=true;refresh();const result=await onSave(next);if(stopped)return;if(result===false||result?.error||result?.success===false)throw new Error('居住时间未能保存，请重试。');dirty=false;refresh(true);feedback.textContent=result?.saved===false?'居住时间暂存在本页，浏览器未能保存。':'居住时间已保存。';}catch(error){if(!stopped)feedback.textContent=error.message;}finally{saving=false;if(!stopped)refresh();}
  }
  form.addEventListener('submit',onSubmit);form.addEventListener('input',onInput);refresh();
  return {refresh,destroy(){stopped=true;form.removeEventListener('submit',onSubmit);form.removeEventListener('input',onInput);}};
}
