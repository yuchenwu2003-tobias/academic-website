import {renderResidenceEditor,mountResidenceEditor} from './residence.js?v=20261018-mont-saint-michel';
import {isExperienced,pinStatusLabel,residencePeriod} from './map-model.js?v=20261018-mont-saint-michel';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const desireLabels=['随缘','有点想去','值得计划','很想去','非去不可'];
const recommendationLabels=['不太推荐','一般','值得一去','很推荐','强烈推荐'];
const fieldOf=pin=>isExperienced(pin)?'recommendationRating':'desireRating';
const contextOf=pin=>isExperienced(pin)?{title:'有多推荐',labels:recommendationLabels,help:'按照旅行体验评价推荐程度。'}:{title:'有多想去',labels:desireLabels,help:'为下一程留下心愿。'};
const ratingOf=pin=>{const value=pin?.[fieldOf(pin)];return Number.isInteger(value)&&value>=0&&value<=5?value:0;};
const helpMarkup=context=>`<span>单击评分，双击清除。</span><span>${context.help}</span><span class="sr-only">键盘按 Enter 或空格评分，按 Delete 或退格清除。</span>`;
const visitMarkup=pin=>`<div class="place-rating-visit" role="group" aria-label="旅行状态">${[['want','还没去过'],['visited','去过'],['resident','居住'],['want-resident','想要居住']].map(([value,label])=>`<button type="button" data-place-visit="${value}" aria-pressed="${(pin?.status||'want')===value}">${label}</button>`).join('')}</div>`;

export function renderPlaceRating(pin){
  const rating=ratingOf(pin),context=contextOf(pin);
  return `<div class="place-rating" data-place-rating><div class="place-rating-heading"><span data-place-rating-heading>${context.title}</span><span class="place-rating-value" data-place-rating-label>${rating?`${rating} / 5`:'未评分'}</span></div><div class="place-rating-stars" data-place-rating-stars role="group" aria-label="${esc(pin?.title||'这个地点')}，${context.title}">${context.labels.map((label,index)=>`<button type="button" class="place-rating-star${index<rating?' is-filled':''}" data-place-rating-value="${index+1}" aria-pressed="${index+1===rating}" aria-label="${index+1} 分，${label}" title="${index+1} 分，${label}"><span aria-hidden="true">★</span></button>`).join('')}</div>${visitMarkup(pin)}${renderResidenceEditor(pin)}<p class="place-rating-help" data-place-rating-help>${helpMarkup(context)}</p><p class="place-rating-status" data-place-rating-status role="status"></p></div>`;
}

export function mountPlaceRating(root,{getPin,onSave}){
  const panel=root?.matches?.('[data-place-rating]')?root:root?.querySelector?.('[data-place-rating]');
  if(!panel){const noop=()=>{};noop.refresh=()=>{};return noop;}
  const stars=[...panel.querySelectorAll('[data-place-rating-value]')],group=panel.querySelector('[data-place-rating-stars]');
  const label=panel.querySelector('[data-place-rating-label]'),status=panel.querySelector('[data-place-rating-status]');
  const visitButtons=[...panel.querySelectorAll('[data-place-visit]')].filter(button=>['want','visited','resident','want-resident'].includes(button.dataset.placeVisit));
  const heading=panel.querySelector('[data-place-rating-heading]'),help=panel.querySelector('[data-place-rating-help]');
  let residenceEditor;
  let stopped=false,saving=false,pending=null,lastDouble=0,activeField=fieldOf(getPin());
  const clickDelay=400;
  function preview(value=0){
    group?.classList.toggle('is-previewing',value>0);
    stars.forEach(star=>star.classList.toggle('is-preview-active',Number(star.dataset.placeRatingValue)<=value));
  }
  function refresh(){
    if(stopped)return;
    const pin=getPin(),value=ratingOf(pin),context=contextOf(pin),field=fieldOf(pin);
    if(field!==activeField){cancelPending();activeField=field;}
    if(group)group.setAttribute('aria-label',`${pin?.title||'这个地点'}，${context.title}`);
    if(heading)heading.textContent=context.title;if(help)help.innerHTML=helpMarkup(context);
    if(label)label.textContent=value?`${value} / 5`:'未评分';
    stars.forEach(star=>{const own=Number(star.dataset.placeRatingValue);star.disabled=saving||!pin;star.setAttribute('aria-pressed',String(own===value));star.setAttribute('aria-label',`${own} 分，${context.labels[own-1]}`);star.setAttribute('title',`${own} 分，${context.labels[own-1]}`);star.classList.toggle('is-filled',own<=value);});
    visitButtons.forEach(button=>{button.disabled=saving||!pin;button.setAttribute('aria-pressed',String(button.dataset.placeVisit===(pin?.status||'want')));});
    residenceEditor?.refresh();
    preview(pending?.value||0);
  }
  function cancelPending(){if(pending)clearTimeout(pending.timer);pending=null;preview();}
  async function save(value){
    if(stopped||saving)return;
    const latest=getPin();
    if(!latest){status.textContent='这个地点已经不在收藏中，请返回地图查看。';return;}
    if(fieldOf(latest)!==activeField){cancelPending();refresh();return;}
    saving=true;status.textContent='正在保存…';status.classList.remove('is-warning');refresh();
    try{
      // Read at commit time so a concurrent profile edit is never replaced by
      // the snapshot used to render these stars.
      const result=await onSave({...latest,[fieldOf(latest)]:value});
      if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error(result?.error?.message||result?.error||result?.message||'评分未保存，请重试。');
      if(stopped)return;
      status.textContent=result?.saved===false?'评分暂存在本页，浏览器未能保存。请导出地图备份。':value?`已设为 ${value} 分。`:'已清除评分，地点仍保留在地图中。';
      status.classList.toggle('is-warning',result?.saved===false);
    }catch(error){if(!stopped){status.textContent=error.message||'评分未保存，请重试。';status.classList.add('is-warning');}}
    finally{saving=false;refresh();}
  }
  function clearDouble(){
    if(Date.now()-lastDouble<500)return;
    lastDouble=Date.now();cancelPending();void save(0);
  }
  function starFrom(event){const star=event.target.closest?.('[data-place-rating-value]');return stars.includes(star)&&!star.disabled?star:null;}
  async function saveVisit(value){
    if(stopped||saving||!['want','visited','resident','want-resident'].includes(value))return;
    const latest=getPin();if(!latest||latest.status===value)return;
    cancelPending();saving=true;status.textContent='正在保存…';refresh();
    try{
      const result=await onSave({...latest,status:value});
      if(result===false||result?.ok===false||result?.success===false||result?.error)throw new Error('状态未保存，请重试。');
      if(!stopped)status.textContent=result?.saved===false?'状态暂存在本页，浏览器未能保存。':value==='want-resident'?'已设为想要居住，可以评价想去程度。':value==='resident'?'已设为居住，现在可以评价推荐程度。':value==='visited'?'已设为去过，现在可以评价推荐程度。':'已设为还没去过，现在可以评价想去程度。';
    }catch(error){if(!stopped)status.textContent=error.message;}
    finally{saving=false;refresh();}
  }
  function onClick(event){
    const visit=event.target.closest?.('[data-place-visit]');if(visit){if(!visit.disabled)void saveVisit(visit.dataset.placeVisit);return;}
    const star=starFrom(event);if(!star)return;
    const value=Number(star.dataset.placeRatingValue);
    if(event.detail===0){cancelPending();void save(value);return;}
    if(event.detail>1||(pending&&pending.value===value&&Date.now()-pending.time<=clickDelay)){clearDouble();return;}
    cancelPending();const next={value,time:Date.now()};pending=next;preview(value);
    next.timer=setTimeout(()=>{if(stopped||pending!==next)return;pending=null;void save(value);},clickDelay);
  }
  function onDouble(event){if(starFrom(event)){event.preventDefault();clearDouble();}}
  function onKey(event){
    const star=starFrom(event);if(!star)return;
    if(['Enter',' ','Delete','Backspace'].includes(event.key)){
      event.preventDefault();cancelPending();if(!event.repeat)void save(['Delete','Backspace'].includes(event.key)?0:Number(star.dataset.placeRatingValue));return;
    }
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();const current=Number(star.dataset.placeRatingValue);
    const next=event.key==='Home'?1:event.key==='End'?5:Math.max(1,Math.min(5,current+(['ArrowRight','ArrowUp'].includes(event.key)?1:-1)));
    stars.find(item=>Number(item.dataset.placeRatingValue)===next)?.focus();
  }
  function onPreview(event){const star=starFrom(event);if(star)preview(Number(star.dataset.placeRatingValue));}
  function onPreviewEnd(event){if(!group?.contains?.(event.relatedTarget))preview(pending?.value||0);}
  const events={click:onClick,dblclick:onDouble,keydown:onKey,pointerover:onPreview,pointerout:onPreviewEnd,focusin:onPreview,focusout:onPreviewEnd};
  Object.entries(events).forEach(([name,listener])=>panel.addEventListener(name,listener));residenceEditor=mountResidenceEditor(panel,{getPin,onSave});refresh();
  const cleanup=()=>{cancelPending();stopped=true;residenceEditor?.destroy();Object.entries(events).forEach(([name,listener])=>panel.removeEventListener(name,listener));};
  cleanup.refresh=refresh;
  return cleanup;
}
