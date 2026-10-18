import {normalizePin,residencePeriod,residenceDuration} from './map-model.js?v=20261018-ratings-final';
import {EDIT_PENCIL} from './editable-field.js?v=20261018-ratings-final';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const breakRow=(range={})=>'<div class="residence-break" data-residence-break><div class="residence-dates"><label>离开月份<input type="month" data-break-start value="'+esc(range.start||'')+'" required readonly></label><label>返回月份<input type="month" data-break-end value="'+esc(range.end||'')+'" required readonly></label></div><button type="button" data-residence-break-remove aria-label="移除此离开期间">×</button></div>';
const summary=pin=>(pin.residenceBreaks||[]).length?'<span>不计入居住时长</span><span data-i18n-skip>'+pin.residenceBreaks.map(range=>esc(range.start.replace('-','.')+' — '+range.end.replace('-','.'))).join('；')+'</span>':'';
export function renderResidenceEditor(pin){
  return '<form class="residence-editor" data-residence-form data-residence-pin-id="'+esc(pin.id)+'" '+(pin.status==='resident'?'':'hidden')+'><div class="residence-heading"><div class="residence-heading-name"><span>居住时间</span><button type="button" class="profile-field-edit" data-residence-edit aria-label="编辑居住时间" title="编辑居住时间" aria-expanded="false">'+EDIT_PENCIL+'</button></div><span data-residence-period>'+esc(residencePeriod(pin)||'未填写')+'</span></div>'
  +'<div class="residence-readonly" data-residence-summary>'+summary(pin)+'</div><div data-residence-fields hidden><div class="residence-dates"><label>入住月份<input type="month" data-residence-start value="'+esc(pin.residenceStart||'')+'" readonly></label><label>结束月份<input type="month" data-residence-end value="'+esc(pin.residenceEnd||'')+'" readonly></label></div><small>结束时间留空表示至今。</small><fieldset class="residence-breaks"><legend>离开期间（不计入居住时长）</legend><div data-residence-breaks>'+(pin.residenceBreaks||[]).map(breakRow).join('')+'</div><button type="button" data-residence-break-add>＋ 添加离开期间</button></fieldset></div>'
  +'<div class="residence-total"><span>实际居住时长</span><strong data-residence-duration>'+esc(residenceDuration(pin)||'—')+'</strong></div><div class="residence-edit-actions" data-residence-actions hidden><button type="submit" data-residence-save>保存居住时间</button><button type="button" data-residence-cancel>取消</button></div><p data-residence-feedback role="status"></p></form>';
}
export function mountResidenceEditor(root,{getPin,onSave}){
  const form=root?.matches?.('[data-residence-form]')?root:root?.querySelector?.('[data-residence-form]');
  if(!form)return {refresh(){},destroy(){}};
  const find=name=>form.querySelector('[data-residence-'+name+']');
  const start=find('start'),end=find('end'),button=find('save'),feedback=find('feedback'),breaks=find('breaks'),edit=find('edit'),fields=find('fields'),actions=find('actions'),readOnlySummary=find('summary');
  let stopped=false,dirty=false,saving=false,editing=false;
  function refresh(force=false){
    const pin=getPin();form.hidden=pin?.status!=='resident';
    if(form.hidden){editing=false;dirty=false;}
    if(!dirty||force){start.value=pin?.residenceStart||'';end.value=pin?.residenceEnd||'';if(breaks)breaks.innerHTML=(pin?.residenceBreaks||[]).map(breakRow).join('');}
    form.querySelector('[data-residence-period]').textContent=residencePeriod(pin)||'未填写';
    const duration=find('duration');if(duration)duration.textContent=residenceDuration(pin)||'—';
    if(readOnlySummary){readOnlySummary.innerHTML=summary(pin||{});readOnlySummary.hidden=editing;}
    if(fields)fields.hidden=!editing;if(actions)actions.hidden=!editing;
    start.readOnly=!editing;end.readOnly=!editing;
    breaks?.querySelectorAll('input').forEach(input=>{input.readOnly=!editing;});
    edit?.setAttribute('aria-expanded',String(editing));if(edit)edit.disabled=saving||!pin;
    button.disabled=saving||!pin;
  }
  function cancel(){editing=false;dirty=false;feedback.textContent='';refresh(true);}
  function onInput(){if(editing)dirty=true;}
  function onClick(event){
    if(saving)return;
    if(event.target.closest?.('[data-residence-edit]')){if(editing)cancel();else{editing=true;refresh(true);start.focus();}return;}
    if(event.target.closest?.('[data-residence-cancel]')){cancel();return;}
    if(!editing)return;
    if(event.target.closest?.('[data-residence-break-add]')){if(!breaks||breaks.children.length>=20)return;dirty=true;breaks.insertAdjacentHTML('beforeend',breakRow());const row=breaks.lastElementChild;row.querySelectorAll('input').forEach(input=>{input.readOnly=false;});row.querySelector('input').focus();}
    const remove=event.target.closest?.('[data-residence-break-remove]');if(remove){dirty=true;remove.closest('[data-residence-break]').remove();}
  }
  async function onSubmit(event){
    event.preventDefault();if(saving||!editing||!form.reportValidity())return;
    try{
      const pin=getPin();if(pin?.status!=='resident')throw new Error('请先选择居住状态。');
      const residenceBreaks=breaks?[...breaks.querySelectorAll('[data-residence-break]')].map(row=>({start:row.querySelector('[data-break-start]').value,end:row.querySelector('[data-break-end]').value})):pin.residenceBreaks;
      const next=normalizePin({...pin,residenceStart:start.value,residenceEnd:end.value,residenceBreaks});saving=true;refresh();
      const result=await onSave(next);if(stopped)return;
      if(result===false||result?.ok===false||result?.error||result?.success===false)throw new Error('居住时间未能保存，请重试。');
      dirty=false;editing=false;refresh(true);feedback.textContent=result?.saved===false?'居住时间暂存在本页，浏览器未能保存。':'居住时间已保存。';
    }catch(error){if(!stopped)feedback.textContent=error.message;}
    finally{saving=false;if(!stopped)refresh();}
  }
  form.addEventListener('submit',onSubmit);form.addEventListener('input',onInput);form.addEventListener('click',onClick);refresh();
  return {refresh,destroy(){stopped=true;form.removeEventListener('submit',onSubmit);form.removeEventListener('input',onInput);form.removeEventListener('click',onClick);}};
}
