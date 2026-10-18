import {renderEditableField,mountEditableFields} from './editable-field.js?v=20261018-residences';
import {isExperienced,pinStatusLabel,residencePeriod} from './map-model.js?v=20261018-residences';
import {countryById,pinCountry} from './geography.js?v=20261018-residences';
import {countryPlaces} from './country-destinations.js?v=20261018-residences';
import {normalizeGuideLinks} from './map-model.js?v=20261018-residences';
import {getPlaceMedia,placeGuideHref} from './place-media.js?v=20261018-residences';
import {renderPlaceRating,mountPlaceRating} from './place-rating.js?v=20261018-residences';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countryPlaceById=new Map(countryPlaces.map(place=>[place.id,place]));
const external='target="_blank" rel="noopener noreferrer"';

function safeUrl(value,{httpsOnly=false,wikipediaOnly=false}={}) {
  if(typeof value!=='string'||!value.trim()||value.length>2000)return '';
  try{
    const url=new URL(value.trim());
    if(!(httpsOnly?['https:']:['https:','http:']).includes(url.protocol)||url.username||url.password)return '';
    if(wikipediaOnly&&url.hostname!=='wikipedia.org'&&!url.hostname.endsWith('.wikipedia.org'))return '';
    return url.href;
  }catch{return '';}
}
const mapHref=countryId=>countryById.has(countryId)?`#/travel/country/${countryId}`:'#/travel';
function virtualCountryPin(place) {
  return {id:`country-${place.id}`,title:place.name,lat:place.lat,lon:place.lon,status:'want',kind:'country',countryId:place.id,note:'',guides:[],desireRating:0};
}

export function resolveTravelGuide(spec,pins=[]) {
  const available=Array.isArray(pins)?pins:[];
  if(spec?.kind==='country') {
    const country=countryPlaceById.get(spec.id);if(!country)return null;
    const saved=available.find(pin=>pin?.kind==='country'&&pin.countryId===spec.id);
    return {pin:saved||virtualCountryPin(country),isVirtual:!saved,countryId:country.id,country,places:available.filter(pin=>pin&&pin.kind!=='country'&&pinCountry(pin)===country.id)};
  }
  if(spec?.kind==='place') {
    const pin=available.find(pin=>pin?.id===spec.id&&pin.kind!=='country');if(!pin)return null;
    const countryId=pinCountry(pin);
    return {pin,isVirtual:false,countryId,country:countryPlaceById.get(countryId)||null,places:[]};
  }
  return null;
}

function guideLinks(guides) {
  return (Array.isArray(guides)?guides:[]).filter(guide=>guide&&typeof guide.title==='string'&&guide.title.trim()&&safeUrl(guide.url));
}
function renderGuideLinks(guides,{compact=false}={}) {
  const links=guideLinks(guides);
  if(!links.length)return `<p class="guide-empty">${compact?'暂无攻略。':'还没有收藏攻略，可以在下方添加想留存的链接。'}</p>`;
  return `<ul class="guide-link-list ${compact?'is-compact':''}">${links.map((guide,index)=>`<li><span class="mono">${String(index+1).padStart(2,'0')}</span><a href="${esc(safeUrl(guide.url))}" ${external}><span data-i18n-skip>${esc(guide.title)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`;
}
function renderCountryPlaces(places) {
  return `<div class="guide-country-places-heading"><div><span class="section-kicker mono">PLACES WITHIN THIS COUNTRY</span><h2>收藏的城市与景点 <span>${places.length}</span></h2></div><span>各个地点的介绍与攻略，汇集在这里。</span></div>${places.length?`<div class="guide-country-places-grid">${places.map(pin=>`<article class="guide-country-place"><div class="guide-place-status"><span>${pinStatusLabel(pin)}</span></div><h3><a href="${esc(placeGuideHref(pin))}" data-i18n-skip>${esc(pin.title)} <span aria-hidden="true">↗</span></a></h3><div data-guide-place-rating="${esc(pin.id)}">${renderPlaceRating(pin)}</div>${pin.note?`<p class="guide-place-note" data-i18n-skip>${esc(pin.note)}</p>`:''}${renderGuideLinks(pin.guides,{compact:true})}</article>`).join('')}</div>`:'<p class="guide-empty">这个国家还没有收藏的城市或景点。可以先去地图上添加。</p>'}`;
}
function renderNote(note) {
  return note?`<p class="guide-personal-note" data-i18n-skip>${esc(note)}</p>`:'<p class="guide-empty">还没有写下自己的介绍，慢慢补充就好。</p>';
}
function renderImage(imageUrl,title) {
  return `<img src="${esc(imageUrl)}" alt="${esc(title)}" data-i18n-skip loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
}
function missingGuide() {
  return '<section class="travel-guide guide-not-found"><span class="section-kicker mono">A LITTLE DETOUR</span><h1>还找不到这份旅行资料。</h1><p>这个地点可能还没有收藏，或已经从地图中移除。</p><a class="text-link" href="#/travel">返回旅行地图 <span>↗</span></a></section>';
}

export function renderTravelGuide(spec,pins=[]) {
  const state=resolveTravelGuide(spec,pins);if(!state)return missingGuide();
  const {pin,isVirtual,countryId,country,places}=state;
  const photo=safeUrl(pin.photoUrl,{httpsOnly:true});
  const wikipedia=safeUrl(pin.wikipediaUrl,{httpsOnly:true,wikipediaOnly:true});
  return `<section class="travel-guide" data-travel-guide>
    <nav class="guide-breadcrumbs" aria-label="旅行资料导航"><a href="#/travel">旅行地图</a><span aria-hidden="true">/</span><span>${spec.kind==='country'?'国家／地区':'城市／景点'}</span></nav>
    <header class="guide-heading"><div><span class="section-kicker mono">MY TRAVEL GUIDE</span><h1 data-i18n-skip>${esc(pin.title)}</h1><p><span>${spec.kind==='country'?'国家／地区':'城市／景点'}</span><span aria-hidden="true">·</span><span data-guide-visit-status>${pinStatusLabel(pin)}</span></p></div><a class="text-link guide-map-link" href="${mapHref(countryId)}">返回对应地图 <span>↗</span></a></header>
    <p class="guide-virtual-note" data-guide-virtual-note ${isVirtual?'':'hidden'}>这个国家还没有加入我的地图。保存资料时，会同时加入它的国家标记。</p>
    <div class="guide-overview"><figure class="guide-media"><div class="guide-image" data-guide-image>${photo?renderImage(photo,pin.title):'<span class="guide-image-placeholder">正在寻找图片…</span>'}</div><figcaption data-guide-image-credit>${photo?'图片由你提供。':''}</figcaption><div class="guide-photo-actions"><button type="button" class="text-link" data-guide-photo-edit>更换图片 <span aria-hidden="true">↗</span></button><span>图片自动加载，也可以手动更换。</span></div></figure><div class="guide-introduction"><span class="section-kicker mono">MY OWN WORDS</span><h2>我的介绍</h2><div data-guide-note>${renderNote(pin.note)}</div><div class="guide-reference-links"><a class="text-link" data-guide-wikipedia href="${esc(wikipedia||'https://www.wikipedia.org/')}" ${external} ${wikipedia?'':'hidden'}>在 Wikipedia 阅读更多 <span>↗</span></a>${spec.kind==='place'&&country?`<a class="text-link" href="${esc(placeGuideHref(virtualCountryPin(country)))}">查看所属国家攻略 <span>↗</span></a>`:''}</div></div></div>
    <section class="guide-saved-links"><div class="guide-section-heading"><h2>我收藏的攻略</h2><span data-guide-link-count>${guideLinks(pin.guides).length}</span></div><div data-guide-links>${renderGuideLinks(pin.guides)}</div></section>
    <div class="guide-inline-rating">${renderPlaceRating(pin)}</div>
    <section class="guide-editor"><form id="guide-editor-fields" data-guide-form><p class="guide-form-intro">在这里直接补充介绍与收藏，写好后点击保存。</p><label>我的介绍<textarea name="note" maxlength="5000" rows="6" placeholder="为什么想去这里，或一段自己的旅行记忆…">${esc(pin.note||'')}</textarea><small>最多 5000 个字符。</small></label><div class="guide-form-url-grid">${renderEditableField({name:"photoUrl",label:"图片链接",value:pin.photoUrl,empty:"自动图片",help:"留空并保存，恢复自动加载图片。"})}${renderEditableField({name:"wikipediaUrl",label:"Wikipedia 链接",value:pin.wikipediaUrl,empty:"自动关联 Wikipedia",placeholder:"https://…wikipedia.org/wiki/…"})}</div><label>我收藏的攻略<textarea name="guides" rows="6" maxlength="64000" placeholder="攻略标题 | https://…">${esc(guideLinks(pin.guides).map(guide=>`${guide.title} | ${guide.url}`).join('\n'))}</textarea><small>每行一条，格式为“标题 | https://…”，最多 30 条。</small></label><p class="guide-form-status" data-guide-form-status role="status"></p><div class="guide-form-actions"><span>点击保存后才会更新资料。</span><button type="submit" class="map-add" data-guide-save>保存资料 <span>↗</span></button></div></form></section>
    ${spec.kind==='country'?`<section class="guide-country-places" data-guide-country-places>${renderCountryPlaces(places)}</section>`:''}
  </section>`;
}

export function parseGuideLines(text) {
  const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(lines.length>30)throw new Error('攻略最多保存 30 条，请先整理链接。');
  return normalizeGuideLinks(lines.map(line=>{
    const match=line.match(/^(.+?)\s*\|\s*(https?:\/\/.+)$/i);
    if(!match)throw new Error('每行攻略请按“标题 | https://…”填写。');
    return {title:match[1].trim(),url:match[2].trim()};
  }));
}

export function mountTravelGuide(root,{spec,getPins,onSave}) {
  const page=root?.matches?.('[data-travel-guide]')?root:root?.querySelector('[data-travel-guide]');
  let state=resolveTravelGuide(spec,getPins());
  if(!page||!state)return ()=>{};
  const form=page.querySelector('[data-guide-form]'),fields=form.elements;
  const editableFields=mountEditableFields(form);
  const status=page.querySelector('[data-guide-form-status]'),save=page.querySelector('[data-guide-save]');
  const image=page.querySelector('[data-guide-image]'),credit=page.querySelector('[data-guide-image-credit]'),wiki=page.querySelector('[data-guide-wikipedia]');
  const photoEdit=page.querySelector('[data-guide-photo-edit]'),edit=page.querySelector('[data-guide-edit]');
  let ratingCleanup=()=>{},countryRatingCleanups=[];
  let stopped=false,mediaRevision=0,mediaController;
  function setImage(url,title) {
    image.innerHTML=url?renderImage(url,title):'<span class="guide-image-placeholder">这里还没有图片，可在编辑资料时添加。</span>';
    const displayed=image.querySelector('img');
    displayed?.addEventListener('error',()=>{if(!stopped&&image.querySelector('img')===displayed){image.innerHTML='<span class="guide-image-placeholder">图片暂时无法显示，可更换图片链接。</span>';credit.textContent='';}},{once:true});
  }
  async function updateMedia(pin) {
    mediaController?.abort();mediaController=new AbortController();const version=++mediaRevision;
    try {
      const media=await getPlaceMedia(pin,{signal:mediaController.signal});
      if(stopped||version!==mediaRevision)return;
      const imageUrl=safeUrl(media?.imageUrl,{httpsOnly:true}),wikipediaUrl=safeUrl(media?.wikipediaUrl,{httpsOnly:true,wikipediaOnly:true}),creditUrl=safeUrl(media?.imageCreditUrl,{httpsOnly:true});
      setImage(imageUrl,pin.title);
      credit.innerHTML=imageUrl?(creditUrl?`<a href="${esc(creditUrl)}" ${external}>${esc(media.imageCreditLabel||'Wikipedia / Wikimedia')}</a>`:(pin.photoUrl?'图片由你提供。':'')):'';
      wiki.hidden=!wikipediaUrl;if(wikipediaUrl)wiki.href=wikipediaUrl;
    }catch(error){
      if(stopped||version!==mediaRevision||error?.name==='AbortError')return;
      setImage(safeUrl(pin.photoUrl,{httpsOnly:true}),pin.title);
      credit.textContent=pin.photoUrl?'图片由你提供。':'';
    }
  }
  function updateView(pin) {
    const visitBadge=page.querySelector('[data-guide-visit-status]');if(visitBadge)visitBadge.textContent=pinStatusLabel(pin);
    page.querySelector('[data-guide-note]').innerHTML=renderNote(pin.note);
    page.querySelector('[data-guide-links]').innerHTML=renderGuideLinks(pin.guides);
    page.querySelector('[data-guide-link-count]').textContent=String(guideLinks(pin.guides).length);
    ratingCleanup.refresh?.();
    page.querySelector('[data-guide-virtual-note]').hidden=!state.isVirtual;
    const places=page.querySelector('[data-guide-country-places]');if(places){places.innerHTML=renderCountryPlaces(state.places);mountCountryRatings();}
  }
  function mountCountryRatings(){
    countryRatingCleanups.forEach(cleanup=>cleanup());countryRatingCleanups=[];
    for(const card of page.querySelectorAll?.('[data-guide-place-rating]')||[]){
      const id=card.dataset.guidePlaceRating;
      countryRatingCleanups.push(mountPlaceRating(card,{getPin:()=>getPins().find(pin=>pin.id===id&&pin.kind!=='country'),onSave:async next=>{const result=await onSave(next);if(!stopped){const badge=card.closest('.guide-country-place')?.querySelector('.guide-place-status>span');if(badge)badge.textContent=pinStatusLabel(result?.pin||next);}return result;}}));
    }
  }
  async function onSubmit(event) {
    event.preventDefault();if(!form.reportValidity()||save.disabled)return;
    try {
      const latest=resolveTravelGuide(spec,getPins());
      if(!latest)throw new Error('这个地点已经不在收藏中，请返回地图查看。');
      const note=fields.note.value;if(note.length>5000)throw new Error('介绍最多 5000 个字符。');
      const photoInput=fields.photoUrl.value.trim(),wikiInput=fields.wikipediaUrl.value.trim();
      const photoUrl=photoInput?safeUrl(photoInput,{httpsOnly:true}):'',wikipediaUrl=wikiInput?safeUrl(wikiInput,{httpsOnly:true,wikipediaOnly:true}):'';
      if(photoInput&&!photoUrl)throw new Error('图片请填写有效的 HTTPS 链接。');
      if(wikiInput&&!wikipediaUrl)throw new Error('百科链接请填写 HTTPS 的 Wikipedia 文章地址。');
      const next={...latest.pin,note,guides:parseGuideLines(fields.guides.value)};
      if(photoUrl)next.photoUrl=photoUrl;else delete next.photoUrl;
      if(wikipediaUrl)next.wikipediaUrl=wikipediaUrl;else delete next.wikipediaUrl;
      save.disabled=true;status.textContent='正在保存资料…';status.classList.remove('is-warning');
      const result=await onSave(next);if(stopped)return;
      const savedPin=result?.pin||next;
      state={...(resolveTravelGuide(spec,getPins())||latest),pin:savedPin,isVirtual:false};
      fields.note.value=savedPin.note||'';fields.photoUrl.value=savedPin.photoUrl||'';fields.wikipediaUrl.value=savedPin.wikipediaUrl||'';fields.guides.value=guideLinks(savedPin.guides).map(guide=>`${guide.title} | ${guide.url}`).join('\n');
      editableFields.reset();updateView(savedPin);void updateMedia(savedPin);
      status.textContent=result?.saved?'资料已保存到当前浏览器。':'浏览器未能保存，本次修改暂存在当前页面。请返回地图导出备份。';
      status.classList.toggle('is-warning',!result?.saved);
    }catch(error){if(!stopped){status.textContent=error.message;status.classList.add('is-warning');}}
    finally{if(!stopped)save.disabled=false;}
  }
  function setEditor(open){form.hidden=!open;edit?.setAttribute('aria-expanded',String(open));}
  function onEdit(){setEditor(form.hidden);if(!form.hidden)fields.note.focus();}
  function onPhotoEdit(){setEditor(true);editableFields.open('photoUrl');fields.photoUrl.scrollIntoView?.({block:'center'});}
  ratingCleanup=mountPlaceRating(page,{getPin:()=>resolveTravelGuide(spec,getPins())?.pin,onSave:async next=>{
    const latest=resolveTravelGuide(spec,getPins());if(!latest)throw new Error('这个地点已经不在收藏中，请返回地图查看。');
    if(latest.isVirtual&&next.status==='want'&&!next.desireRating)return {saved:true,pin:latest.pin};
    const merged={...latest.pin,status:next.status,desireRating:next.desireRating,recommendationRating:next.recommendationRating,residenceStart:next.residenceStart,residenceEnd:next.residenceEnd};
    const result=await onSave(merged);if(stopped||result===false||result?.ok===false||result?.success===false||result?.error)return result;
    state={...(resolveTravelGuide(spec,getPins())||latest),pin:result?.pin||merged,isVirtual:false};updateView(state.pin);return result;
  }});
  mountCountryRatings();
  form.addEventListener('submit',onSubmit);photoEdit?.addEventListener('click',onPhotoEdit);edit?.addEventListener('click',onEdit);void updateMedia(state.pin);
  return ()=>{stopped=true;editableFields.destroy();mediaRevision++;mediaController?.abort();ratingCleanup();countryRatingCleanups.forEach(cleanup=>cleanup());form.removeEventListener('submit',onSubmit);photoEdit?.removeEventListener('click',onPhotoEdit);edit?.removeEventListener('click',onEdit);};
}
