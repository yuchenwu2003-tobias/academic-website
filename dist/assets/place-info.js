import {renderTripChips} from './trip-model.js?v=20261018-linked-wiki-photos';
import {renderEditableField,mountEditableFields} from './editable-field.js?v=20261018-linked-wiki-photos';
import {isExperienced,pinStatusLabel,residencePeriod} from './map-model.js?v=20261018-linked-wiki-photos';
import {getPlaceMedia, placeGuideHref} from './place-media.js?v=20261018-linked-wiki-photos';
import {pinCountry} from './geography.js?v=20261018-linked-wiki-photos';
import {normalizeCountryId,normalizePin} from './map-model.js?v=20261018-linked-wiki-photos';
import {renderPlaceRating,mountPlaceRating} from './place-rating.js?v=20261018-linked-wiki-photos';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const safeUrl = value => {try {const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';} catch {return '';}};
const external = 'target="_blank" rel="noopener noreferrer"';
const placeholderIcon = '<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 39 18-26 13 19 8-11 17 18Z"/><circle cx="47" cy="10" r="5"/><path d="M4 45h56"/></svg>';

export function renderPlaceInfo() {
  return '<dialog class="place-info-dialog" data-place-info-dialog aria-labelledby="place-info-title"><div class="place-info-top"><span class="place-info-kicker">A PLACE TO KNOW</span><button type="button" class="place-info-close" data-place-info-close aria-label="关闭地点资料">×</button></div><div data-place-info-content></div></dialog>';
}

function guideLinks(pin) {
  return (Array.isArray(pin.guides) ? pin.guides : []).filter(guide => guide && typeof guide === 'object' && safeUrl(guide.url));
}
function cardMarkup(pin, pins) {
  const href = placeGuideHref(pin), guides = guideLinks(pin);
  const countryId = pin.kind === 'country' ? normalizeCountryId(pin.countryId) : null;
  const children = countryId ? pins.filter(item => item && item.kind !== 'country' && pinCountry(item) === countryId) : [];
  return `<a class="place-info-cover" href="${esc(href)}"><div class="place-info-media"><img data-place-info-image alt="${esc(pin.title)}" data-i18n-skip hidden referrerpolicy="no-referrer"><div class="place-info-placeholder" data-place-info-placeholder>${placeholderIcon}<span data-place-info-image-status>正在寻找地点图片…</span><small data-place-info-image-help hidden>可以直接在下方填写图片链接。</small></div></div><div class="place-info-heading"><div class="place-info-meta"><span>${pin.kind === 'country' ? '国家／地区' : '城市／景点'}</span><span class="place-info-status ${isExperienced(pin) ? 'is-visited' : ''}">${pinStatusLabel(pin)}</span></div><div class="place-title-with-trips"><h2 id="place-info-title" data-i18n-skip>${esc(pin.title)}</h2><div class="place-trip-chips">${renderTripChips(pin,pins)}</div></div><span class="place-info-open-label">打开攻略页 <span aria-hidden="true">↗</span></span></div></a>
    <div class="place-info-source-row"><a data-place-info-wikipedia hidden ${external}>维基百科 ↗</a><a data-place-info-credit hidden ${external}></a></div>
    ${renderPlaceRating(pin)}
    <section class="place-info-editor" data-place-info-editor>${editorMarkup(pin)}</section>
    ${countryId ? `<section class="place-info-section place-info-country"><h3>这里收藏的城市与景点 <span class="place-info-count">${children.length}</span></h3>${children.length ? `<div class="place-info-cities">${children.map(child => `<a class="place-info-city" href="${esc(placeGuideHref(child))}"><span><strong data-i18n-skip>${esc(child.title)}</strong><small>${pinStatusLabel(child)}</small></span><span class="place-info-city-link">查看攻略 <span aria-hidden="true">↗</span></span></a>`).join('')}</div>` : '<p class="place-info-empty">这个国家还没有收藏的城市或景点。</p>'}</section>` : ''}
    <div class="place-info-actions"><a class="place-info-main-link" href="${esc(href)}">打开攻略页 <span aria-hidden="true">↗</span></a><button type="button" class="place-info-remove-pin" data-place-info-remove>取消标记</button></div><p class="place-info-feedback" data-place-info-feedback role="status"></p>`;
}

export function applyPlaceInfoDraft(pin, draft) {
  // Only editable profile fields are copied. Identity, coordinates and the latest
  // independent desire rating survive edits made in another browser tab.
  return normalizePin({...pin,title:draft.title,note:draft.note,status:draft.status,photoUrl:draft.photoUrl,wikipediaUrl:draft.wikipediaUrl,guides:draft.guides});
}
function guideRow(guide={}) {
  return `<div class="place-info-guide-row" data-info-guide-row><label>攻略标题<input data-info-guide-title maxlength="120" value="${esc(guide.title||'')}" placeholder="例如：三日旅行路线" required></label><label>攻略链接<input data-info-guide-url type="url" maxlength="2000" value="${esc(guide.url||'')}" placeholder="https://…" required></label><button type="button" class="place-info-remove" data-info-guide-remove aria-label="移除这条攻略">移除</button></div>`;
}
function editorMarkup(pin) {
  return `<form data-place-info-form><label>我的介绍<textarea name="note" maxlength="5000" rows="5" placeholder="为什么想去这里，或一段自己的旅行记忆…">${esc(pin.note||'')}</textarea></label><fieldset><legend>收藏的攻略</legend><div data-info-guide-rows>${guideLinks(pin).map(guideRow).join('')}</div><button type="button" class="text-link" data-info-guide-add>＋ 添加攻略链接</button></fieldset>${renderEditableField({name:"title",label:"地点名称",value:pin.title,type:"text",placeholder:"",required:true})}<input type="hidden" name="status" value="${esc(pin.status)}">${renderEditableField({name:"photoUrl",label:"图片链接",value:pin.photoUrl,empty:"自动图片",extra:'<div class="place-info-auto-photo"><button type="button" class="text-link" data-info-photo-auto>使用自动图片</button><small>留空并保存，恢复自动加载图片。</small></div>'})}${renderEditableField({name:"wikipediaUrl",label:"Wikipedia 链接",value:pin.wikipediaUrl,empty:"自动关联 Wikipedia",placeholder:"https://…wikipedia.org/wiki/…"})}<p class="place-info-feedback" data-info-form-status role="status"></p><div class="place-info-editor-actions"><button type="button" class="place-info-edit" data-info-edit-cancel>撤销修改</button><button type="submit" class="map-add" data-info-save>保存资料</button></div><button type="button" class="place-info-edit place-info-advanced" data-info-advanced>编辑标记类型与位置 <span aria-hidden="true">↗</span></button></form>`;
}

export function mountPlaceInfo(root, {getPins = () => [], onEdit, onSave, onRemove} = {}) {
  const dialog = root?.querySelector('[data-place-info-dialog]');
  if (!dialog) return {open() {}, destroy() {}};
  const content = dialog.querySelector('[data-place-info-content]');
  const editableFields=mountEditableFields(content);
  let revision = 0, controller, currentPin, destroyed = false, ratingCleanup;
  function stop() {revision++; controller?.abort(); controller = null;ratingCleanup?.();ratingCleanup=null;}
  function close() {stop(); if (dialog.open) dialog.close();}
  function noImage(version) {
    if (destroyed || version !== revision || !dialog.open) return;
    const image = content.querySelector('[data-place-info-image]');
    const placeholder = content.querySelector('[data-place-info-placeholder]');
    image.hidden = true;
    image.removeAttribute('src');
    placeholder.hidden = false;
    content.querySelector('[data-place-info-image-status]').textContent = '暂时没有可用图片';
    content.querySelector('[data-place-info-image-help]').hidden = false;
  }
  async function open(pin,{preserveScroll=false,feedback=''}={}) {
    if (destroyed || !pin || typeof pin.id !== 'string' || typeof pin.title !== 'string') return;
    stop();
    currentPin = pin;
    const version = revision;
    controller = new AbortController();
    const request = controller;
    const pins = getPins();
    const previousScroll=dialog.scrollTop;
    content.innerHTML = cardMarkup(pin, Array.isArray(pins) ? pins : []);
    ratingCleanup=mountPlaceRating(content,{getPin:()=>getPins().find(item=>item.id===currentPin?.id),onSave:async next=>{
      const result=await onSave(next);
      if(!destroyed&&version===revision&&dialog.open){
        currentPin=result?.pin||next;
        const badge=content.querySelector('.place-info-status');badge.textContent=pinStatusLabel(currentPin);badge.classList.toggle('is-visited',isExperienced(currentPin));
        const editor=content.querySelector('[data-place-info-form]');if(editor){editor.elements.status.value=currentPin.status;editor.querySelectorAll('[data-info-status]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.infoStatus===currentPin.status)));}
      }
      return result;
    }});
    content.querySelector('[data-place-info-feedback]').textContent=feedback;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = preserveScroll?previousScroll:0;
    if(!preserveScroll)dialog.querySelector('[data-place-info-close]')?.focus();
    try {
      const media = await getPlaceMedia(pin, {signal: request.signal});
      if (destroyed || version !== revision || !dialog.open || request.signal.aborted) return;
      const wikipedia = content.querySelector('[data-place-info-wikipedia]');
      if (safeUrl(media.wikipediaUrl)) {wikipedia.href = media.wikipediaUrl; wikipedia.hidden = false;}
      const credit = content.querySelector('[data-place-info-credit]');
      if (safeUrl(media.imageCreditUrl)) {credit.href = media.imageCreditUrl; credit.textContent = media.imageCreditLabel; credit.hidden = false;}
      if (!safeUrl(media.imageUrl)) {noImage(version); return;}
      const image = content.querySelector('[data-place-info-image]');
      image.onload = () => {
        if (destroyed || version !== revision || !dialog.open || request.signal.aborted) return;
        image.hidden = false;
        content.querySelector('[data-place-info-placeholder]').hidden = true;
      };
      image.onerror = () => noImage(version);
      content.querySelector('[data-place-info-image-status]').textContent = '正在加载图片…';
      image.src = media.imageUrl;
    } catch (error) {
      if (error?.name !== 'AbortError') noImage(version);
    }
  }
  function onClick(event) {
    if (event.target.closest('[data-place-info-close]')) {close(); return;}
    const removeMarker=event.target.closest('[data-place-info-remove]');
    if(removeMarker){
      if(removeMarker.disabled)return;
      const version=revision;removeMarker.disabled=true;ratingCleanup?.();
      Promise.resolve().then(()=>onRemove(currentPin?.id)).then(()=>{if(!destroyed&&version===revision)close();}).catch(error=>{if(!destroyed&&version===revision){removeMarker.disabled=false;content.querySelector('[data-place-info-feedback]').textContent=error.message||'未能取消标记，请重试。';}});
      return;
    }
    if(event.target.closest('[data-info-edit-cancel]')) {
      const editor=content.querySelector('[data-place-info-editor]');editor.innerHTML=editorMarkup(getPins().find(pin=>pin.id===currentPin?.id)||currentPin);editor.querySelector('[name=note]').focus();
      return;
    }
    if(event.target.closest('[data-info-advanced]')) {
      const id=currentPin?.id;close();if(id)onEdit?.(id);
      return;
    }
    const statusChoice=event.target.closest('[data-info-status]');
    if(statusChoice){
      const form=statusChoice.closest('form');form.elements.status.value=statusChoice.dataset.infoStatus;
      form.querySelectorAll('[data-info-status]').forEach(button=>button.setAttribute('aria-pressed',String(button===statusChoice)));
      return;
    }
    if(event.target.closest('[data-info-photo-auto]')) {
      content.querySelector('[name=photoUrl]').value='';
      content.querySelector('[data-info-form-status]').textContent='保存后将恢复自动图片。';
      return;
    }
    if(event.target.closest('[data-info-guide-add]')) {
      const rows=content.querySelector('[data-info-guide-rows]');
      if(rows.children.length>=30){content.querySelector('[data-info-form-status]').textContent='攻略最多保存 30 条，请先整理链接。';return;}
      rows.insertAdjacentHTML('beforeend',guideRow());rows.lastElementChild.querySelector('input').focus();
      return;
    }
    const remove=event.target.closest('[data-info-guide-remove]');
    if(remove){
      const row=remove.closest('[data-info-guide-row]'),next=row.nextElementSibling||row.previousElementSibling;row.remove();
      (next?.querySelector('input')||content.querySelector('[data-info-guide-add]')).focus();
      return;
    }
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  }
  async function onSubmit(event) {
    const form=event.target.closest('[data-place-info-form]');if(!form)return;
    event.preventDefault();const save=form.querySelector('[data-info-save]'),status=form.querySelector('[data-info-form-status]');
    if(save.disabled||!form.reportValidity())return;
    const version=revision;
    try {
      const latest=getPins().find(pin=>pin.id===currentPin?.id);
      if(!latest)throw new Error('这个地点已经不在收藏中，请返回地图查看。');
      if(typeof onSave!=='function')throw new Error('暂时无法保存资料，请稍后重试。');
      const fields=form.elements;
      const next=applyPlaceInfoDraft(latest,{title:fields.title.value,note:fields.note.value,status:fields.status.value,photoUrl:fields.photoUrl.value,wikipediaUrl:fields.wikipediaUrl.value,guides:[...form.querySelectorAll('[data-info-guide-row]')].map(row=>({title:row.querySelector('[data-info-guide-title]').value,url:row.querySelector('[data-info-guide-url]').value}))});
      save.disabled=true;status.textContent='正在保存资料…';
      const result=await onSave(next);
      if(destroyed||version!==revision||!dialog.open)return;
      void open(result?.pin||next,{preserveScroll:true,feedback:result?.saved===false?'浏览器未能保存，本次修改暂存在当前页面。请返回地图导出备份。':'资料已保存到当前浏览器。'});
      content.querySelector('[data-info-save]')?.focus({preventScroll:true});
    }catch(error){if(!destroyed&&version===revision){status.textContent=error.message;save.disabled=false;}}
  }
  const onCancel = () => stop();
  const onClose = () => {if (!dialog.open) stop();};
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('submit',onSubmit);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onClose);
  return {
    open,
    destroy() {
      destroyed = true;editableFields.destroy();
      stop();
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('submit',onSubmit);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      const image = content.querySelector('[data-place-info-image]');
      if (image) {image.onload = null; image.onerror = null; image.removeAttribute('src');}
      if (dialog.open) dialog.close();
    },
  };
}
