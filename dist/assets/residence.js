import {normalizePin,residencePeriod,residenceDuration} from './map-model.js?v=20261018-mont-saint-michel';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const breakRow=(range={})=>`<div class="residence-break" data-residence-break><div class="residence-dates"><label>离开月份<input type="month" data-break-start value="${esc(range.start||'')}" required></label><label>返回月份<input type="month" data-break-end value="${esc(range.end||'')}" required></label></div><button type="button" data-residence-break-remove aria-label="移除此离开期间">×</button></div>`;
export function renderResidenceEditor(pin){
  return `<form class="residence-editor" data-residence-form data-residence-pin-id="${esc(pin.id)}" ${pin.status==='resident'?'':'hidden'}><div class="residence-heading"><span>居住时间</span><span data-residence-period>${esc(residencePeriod(pin))}</span></div><div class="residence-dates"><label>入住月份<input type="month" data-residence-start value="${esc(pin.residenceStart||'')}"></label><label>结束月份<input type="month" data-residence-end value="${esc(pin.residenceEnd||'')}"></label></div><small>结束时间留空表示至今。</small><fieldset class="residence-breaks"><legend>离开期间（不计入居住时长）</legend><div data-residence-breaks>${(pin.residenceBreaks||[]).map(breakRow).join('')}</div><button type="button" data-residence-break-add>＋ 添加离开期间</button></fieldset><div class="residence-total"><span>实际居住时长</span><strong data-residence-duration>${esc(residenceDuration(pin))}</strong></div><button type="submit" data-residence-save>保存居住时间</button><p data-residence-feedback role="status"></p></form>`;
}
export function mountResidenceEditor(root,{getPin,onSave}){
  const form=root?.matches?.('[data-residence-form]')?root:root?.querySelector?.('[data-residence-form]');
  if(!form)return {refresh(){},destroy(){}};
  const start=form.querySelector('[data-residence-start]'),end=form.querySelector('[data-residence-end]'),button=form.querySelector('[data-residence-save]'),feedback=form.querySelector('[data-residence-feedback]');
  const breaks=form.querySelector('[data-residence-breaks]');
  let stopped=false,dirty=false,saving=false;
  function refresh(force=false){const pin=getPin();form.hidden=pin?.status!=='resident';if(!dirty||force){start.value=pin?.residenceStart||'';end.value=pin?.residenceEnd||'';if(breaks)breaks.innerHTML=(pin?.residenceBreaks||[]).map(breakRow).join('');}form.querySelector('[data-residence-period]').textContent=residencePeriod(pin);const duration=form.querySelector('[data-residence-duration]');if(duration)duration.textContent=residenceDuration(pin);button.disabled=saving||!pin;}
  function onInput(){dirty=true;}
  function onClick(event){if(event.target.closest?.('[data-residence-break-add]')){if(saving||!breaks||breaks.children.length>=20)return;dirty=true;breaks.insertAdjacentHTML('beforeend',breakRow());breaks.lastElementChild.querySelector('input').focus();}const remove=event.target.closest?.('[data-residence-break-remove]');if(remove&&!saving){dirty=true;remove.closest('[data-residence-break]').remove();}}
  async function onSubmit(event){
    event.preventDefault();if(saving||!form.reportValidity())return;
    try{const pin=getPin();if(pin?.status!=='resident')throw new Error('请先选择居住状态。');const residenceBreaks=breaks?[...breaks.querySelectorAll('[data-residence-break]')].map(row=>({start:row.querySelector('[data-break-start]').value,end:row.querySelector('[data-break-end]').value})):pin.residenceBreaks;const next=normalizePin({...pin,residenceStart:start.value,residenceEnd:end.value,residenceBreaks});saving=true;refresh();const result=await onSave(next);if(stopped)return;if(result===false||result?.error||result?.success===false)throw new Error('居住时间未能保存，请重试。');dirty=false;refresh(true);feedback.textContent=result?.saved===false?'居住时间暂存在本页，浏览器未能保存。':'居住时间已保存。';}catch(error){if(!stopped)feedback.textContent=error.message;}finally{saving=false;if(!stopped)refresh();}
  }
  form.addEventListener('submit',onSubmit);form.addEventListener('input',onInput);form.addEventListener('click',onClick);refresh();
  return {refresh,destroy(){stopped=true;form.removeEventListener('submit',onSubmit);form.removeEventListener('input',onInput);form.removeEventListener('click',onClick);}};
}
