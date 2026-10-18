import {getPlaceMedia, placeGuideHref} from './place-media.js';
import {pinCountry} from './geography.js';
import {normalizeCountryId} from './map-model.js';

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
  const rating = Number.isInteger(pin.desireRating) && pin.desireRating >= 1 && pin.desireRating <= 5 ? pin.desireRating : 0;
  return `<a class="place-info-cover" href="${esc(href)}"><div class="place-info-media"><img data-place-info-image alt="${esc(pin.title)}" data-i18n-skip hidden referrerpolicy="no-referrer"><div class="place-info-placeholder" data-place-info-placeholder>${placeholderIcon}<span data-place-info-image-status>正在寻找地点图片…</span><small data-place-info-image-help hidden>可在编辑标记中添加图片链接。</small></div></div><div class="place-info-heading"><div class="place-info-meta"><span>${pin.kind === 'country' ? '国家／地区' : '城市／景点'}</span><span class="place-info-status ${pin.status === 'visited' ? 'is-visited' : ''}">${pin.status === 'visited' ? '已去过' : '想去'}</span></div><h2 id="place-info-title" data-i18n-skip>${esc(pin.title)}</h2><span class="place-info-open-label">打开攻略页 <span aria-hidden="true">↗</span></span></div></a>
    <div class="place-info-source-row"><a data-place-info-wikipedia hidden ${external}>维基百科 ↗</a><a data-place-info-credit hidden ${external}></a></div>
    <div class="place-info-rating"><span>心愿评分</span><a href="#/travel/ratings">${rating ? `${rating}/5` : '未评分'} <span aria-hidden="true">↗</span></a></div>
    <section class="place-info-section"><h3>我的介绍</h3>${pin.note ? `<p class="place-info-note" data-i18n-skip>${esc(pin.note)}</p>` : '<p class="place-info-empty">还没有个人介绍，留待慢慢补充。</p>'}</section>
    <section class="place-info-section"><h3>收藏的攻略 <span class="place-info-count">${guides.length}</span></h3>${guides.length ? `<ul class="place-info-guides">${guides.map(guide => `<li><a href="${esc(safeUrl(guide.url))}" ${external}><span data-i18n-skip>${esc(guide.title || '收藏的攻略')}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>` : '<p class="place-info-empty">攻略还在慢慢收集。</p>'}</section>
    ${countryId ? `<section class="place-info-section place-info-country"><h3>这里收藏的城市与景点 <span class="place-info-count">${children.length}</span></h3>${children.length ? `<div class="place-info-cities">${children.map(child => `<a class="place-info-city" href="${esc(placeGuideHref(child))}"><span><strong data-i18n-skip>${esc(child.title)}</strong><small>${child.status === 'visited' ? '已去过' : '想去'}</small></span><span class="place-info-city-link">查看攻略 <span aria-hidden="true">↗</span></span></a>`).join('')}</div>` : '<p class="place-info-empty">这个国家还没有收藏的城市或景点。</p>'}</section>` : ''}
    <div class="place-info-actions"><a class="place-info-main-link" href="${esc(href)}">打开攻略页 <span aria-hidden="true">↗</span></a><button type="button" class="place-info-edit" data-place-info-edit>编辑标记</button></div>`;
}

export function mountPlaceInfo(root, {getPins = () => [], onEdit} = {}) {
  const dialog = root?.querySelector('[data-place-info-dialog]');
  if (!dialog) return {open() {}, destroy() {}};
  const content = dialog.querySelector('[data-place-info-content]');
  let revision = 0, controller, currentPin, destroyed = false;
  function stop() {revision++; controller?.abort(); controller = null;}
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
  async function open(pin) {
    if (destroyed || !pin || typeof pin.id !== 'string' || typeof pin.title !== 'string') return;
    stop();
    currentPin = pin;
    const version = revision;
    controller = new AbortController();
    const request = controller;
    const pins = getPins();
    content.innerHTML = cardMarkup(pin, Array.isArray(pins) ? pins : []);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('[data-place-info-close]')?.focus();
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
    if (event.target.closest('[data-place-info-edit]')) {
      const id = currentPin?.id;
      close();
      if (id) onEdit?.(id);
      return;
    }
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  }
  const onCancel = () => stop();
  const onClose = () => {if (!dialog.open) stop();};
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onClose);
  return {
    open,
    destroy() {
      destroyed = true;
      stop();
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      const image = content.querySelector('[data-place-info-image]');
      if (image) {image.onload = null; image.onerror = null; image.removeAttribute('src');}
      if (dialog.open) dialog.close();
    },
  };
}
