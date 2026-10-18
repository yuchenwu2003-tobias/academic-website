import {DESTINATIONS} from './destination-catalog.js?v=20261018-mont-saint-michel';
import {countryPlaceById} from './country-destinations.js?v=20261018-mont-saint-michel';
import {pinCountry} from './geography.js?v=20261018-mont-saint-michel';
import {normalizeCountryId} from './map-model.js?v=20261018-mont-saint-michel';

// API reference: https://www.mediawiki.org/wiki/API:Pageimages and API:Search.
// Only public place/country names are queried. Personal notes and guides are never read here.
const destinationById = new Map(DESTINATIONS.map(place => [place.id, place]));
const wikiCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;
const abortError = () => new DOMException('Cancelled', 'AbortError');
const checkAbort = signal => {if (signal?.aborted) throw abortError();};

function httpUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {return '';}
}
function wikipediaUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !/(^|\.)wikipedia\.org$/i.test(url.hostname)) return '';
    url.protocol = 'https:';
    return url.href;
  } catch {return '';}
}
function wikiImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname) && !url.username && !url.password ? url.href : '';
  } catch {return '';}
}
function lookupIdentity(pin) {
  const countryId = normalizeCountryId(pin?.countryId) || pinCountry(pin);
  const country = countryPlaceById.get(countryId);
  const rawId = typeof pin?.id === 'string' ? pin.id.replace(/^(?:destination-|source-)/, '') : '';
  const destination = destinationById.get(rawId);
  const name = String(pin?.kind === 'country' ? country?.english || pin?.title || '' : destination?.english || pin?.title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const language = /[\u3400-\u9fff]/.test(name) ? 'zh' : 'en';
  const countryName = language === 'zh' ? country?.name : country?.english;
  const query = [name, pin?.kind !== 'country' && countryName && !name.toLowerCase().includes(countryName.toLowerCase()) ? countryName : ''].filter(Boolean).join(' ');
  const search = new URL(`https://${language}.wikipedia.org/wiki/Special:Search`);
  search.searchParams.set('search', query);
  return {query, language, country, searchUrl: search.href};
}

async function lookupWikipedia(query, language, {signal, fetcher}) {
  checkAbort(signal);
  const key = `${language}:${query}`;
  const saved = wikiCache.get(key);
  if (saved && Date.now() - saved.savedAt < CACHE_TTL) return saved.value;
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  for (const [name, value] of Object.entries({action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '0', gsrlimit: '3', prop: 'pageimages|info', piprop: 'thumbnail|name', pithumbsize: '900', pilicense: 'free', inprop: 'url', origin: '*', format: 'json', formatversion: '2'})) url.searchParams.set(name, value);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, {once: true});
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    checkAbort(signal);
    const response = await fetcher(url.href, {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: {Accept: 'application/json'}});
    if (!response.ok) throw new Error('Wikipedia media unavailable');
    const payload = await response.json();
    checkAbort(signal);
    if (payload?.error) throw new Error('Wikipedia media unavailable');
    const rawPages = payload?.query?.pages;
    const pages = (Array.isArray(rawPages) ? rawPages : rawPages && typeof rawPages === 'object' ? Object.values(rawPages) : [])
      .filter(page => page && !page.missing && page.ns === 0)
      .sort((a, b) => (a.index || 1) - (b.index || 1));
    const page = pages.find(item => wikipediaUrl(item.fullurl || item.canonicalurl));
    const articleUrl = wikipediaUrl(page?.fullurl || page?.canonicalurl);
    const imageUrl = wikiImageUrl(page?.thumbnail?.source);
    const fileName = typeof page?.pageimage === 'string' ? page.pageimage.trim().slice(0, 500) : '';
    let imageCreditUrl = '';
    if (imageUrl && articleUrl) {
      const article = new URL(articleUrl);
      imageCreditUrl = fileName ? `${article.origin}/wiki/File:${encodeURIComponent(fileName.replaceAll(' ', '_'))}` : articleUrl;
    }
    const value = {imageUrl, wikipediaUrl: articleUrl, imageCreditUrl, imageCreditLabel: imageUrl ? '图片及许可说明' : '', fileName};
    wikiCache.set(key, {value, savedAt: Date.now()});
    if (wikiCache.size > 128) wikiCache.delete(wikiCache.keys().next().value);
    return value;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function placeGuideHref(pin) {
  const countryId = pin?.kind === 'country' ? normalizeCountryId(pin.countryId) : null;
  return countryId ? `#/travel/guide/country/${encodeURIComponent(countryId)}` : `#/travel/guide/place/${encodeURIComponent(String(pin?.id ?? ''))}`;
}

export async function getPlaceMedia(pin, {signal, fetcher = globalThis.fetch} = {}) {
  checkAbort(signal);
  const identity = lookupIdentity(pin);
  const manualImage = httpUrl(pin?.photoUrl);
  const manualWiki = wikipediaUrl(pin?.wikipediaUrl);
  const base = {imageUrl: manualImage, wikipediaUrl: manualWiki || identity.searchUrl, imageCreditUrl: manualImage ? manualImage : '', imageCreditLabel: manualImage ? '手动图片链接' : ''};
  if ((manualImage && manualWiki) || !identity.query || typeof fetcher !== 'function') return base;
  try {
    const primary = await lookupWikipedia(identity.query, identity.language, {signal, fetcher});
    checkAbort(signal);
    let picture = primary;
    // Country articles often lead with a flag, coat of arms or locator map.
    // Keep their article link, but make at most one extra free-image query for tourism.
    const unsuitableCountryImage = !primary.imageUrl || /(?:flag|coat|map)|\.svg(?:$|[?#])/i.test(primary.fileName);
    if (!manualImage && pin?.kind === 'country' && unsuitableCountryImage && identity.country?.english) {
      try {
        picture = await lookupWikipedia(`Tourism in ${identity.country.english}`, 'en', {signal, fetcher});
        if (/(?:flag|coat|map)|\.svg(?:$|[?#])/i.test(picture.fileName)) picture = {...picture, imageUrl: '', imageCreditUrl: '', imageCreditLabel: ''};
      } catch (error) {
        checkAbort(signal);
        picture = {...primary, imageUrl: '', imageCreditUrl: '', imageCreditLabel: ''};
      }
    }
    checkAbort(signal);
    return {
      imageUrl: manualImage || picture.imageUrl || '',
      wikipediaUrl: manualWiki || primary.wikipediaUrl || identity.searchUrl,
      imageCreditUrl: manualImage ? manualImage : picture.imageCreditUrl || '',
      imageCreditLabel: manualImage ? '手动图片链接' : picture.imageCreditLabel || '',
    };
  } catch (error) {
    checkAbort(signal);
    return base;
  }
}
