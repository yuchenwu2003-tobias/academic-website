import {Converter} from './vendor/opencc/cn2t.js?v=20261018-trip-months';
import {COUNTRIES, CONTINENTS} from './geography-data.js?v=20261018-trip-months';
import {DESTINATIONS} from './destination-catalog.js?v=20261018-trip-months';
import {UI_EN} from './i18n-messages.js?v=20261018-trip-months';
import {DESTINATION_UI_EN} from './i18n-destinations.js?v=20261018-trip-months';
import {PLACE_SEARCH_UI_EN} from './i18n-place-search.js?v=20261018-trip-months';
import {ACADEMIC_UI_EN} from './i18n-academic.js?v=20261018-trip-months';

export const LANGUAGE_STORAGE_KEY = 'tobias-personal-space.language.v1';
export const LANGUAGES = ['zh-CN', 'zh-TW', 'en'];
const validLanguage = value => LANGUAGES.includes(value);
const traditionalConverter = Converter({from: 'cn', to: 'tw'});
const traditionalCache = new Map();
const english = {
  ...Object.fromEntries([...COUNTRIES, ...CONTINENTS].map(item => [item.name, item.english])),
  ...Object.fromEntries(DESTINATIONS.map(item => [item.name, item.english])),
  '新加坡': 'Singapore', '马尔代夫': 'Maldives',
  ...DESTINATION_UI_EN,
  ...UI_EN,
  ...PLACE_SEARCH_UI_EN,
  ...ACADEMIC_UI_EN,
};
let language = 'zh-CN';
try {
  const saved = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
  if (validLanguage(saved)) language = saved;
} catch {}

export const getLanguage = () => language;
// Familiar short names supplement the formal map labels, in both writing systems.
const COUNTRY_SEARCH_ALIASES = {
  chn: '中国 中國', twn: '台湾 台灣 臺灣', usa: '美国 美國', gbr: '英国 英國',
  kor: '韩国 韓國', prk: '朝鲜 朝鮮', rus: '俄罗斯 俄羅斯',
};
export const countrySearchAliases = id => COUNTRY_SEARCH_ALIASES[id] || '';
export function toTraditional(text) {
  const source = String(text ?? '');
  if (!traditionalCache.has(source)) traditionalCache.set(source, traditionalConverter(source));
  return traditionalCache.get(source);
}

function englishText(source, depth = 0) {
  if (Object.hasOwn(english, source)) return english[source];
  if (depth > 5 || !/[\u3400-\u9fff]/.test(source)) return source;
  const tr = value => englishText(value, depth + 1);
  const patterns = [
    [/^(\d{4}\.\d{2}) — 至今$/,(_,month)=>`${month} — present`],
    [/^([1-5]) 分，(.+)$/,(_,n,label)=>`${n}/5, ${tr(label)}`],
    [/^(\d+) 个研究组$/,(_,n)=>`${n} research ${n==='1'?'group':'groups'}`],
    [/^已导入 (\d+) 个研究组，并与学术地图合并。$/,(_,n)=>`Imported ${n} research groups and merged them with your academic map.`],
    [/^研究组导入失败：(.+)$/,(_,error)=>`Research group import failed: ${tr(error)}`],
    [/^(.+)需要填写文字。$/,(_,field)=>`${tr(field)} must be text.`],
    [/^(.+?)(不能为空，且)?最多 (\d+) 个字符。$/,(_,field,required,n)=>`${tr(field)} ${required?'is required and ':''}must have at most ${n} characters.`],
    [/^(\d+) 个结果 · (\d+) 个已评分$/,(_,n,rated)=>`${n} results · ${rated} rated`],
    [/^心愿评分：(.+)$/,(_,score)=>`Desire rating: ${tr(score)}`],
    [/^(.+)，(有多想去|有多推荐)$/,(_,title,kind)=>`${title}, ${kind==='有多推荐'?'recommendation rating':'desire rating'}`],
    [/^已将「(.+)」设为 ([1-5]) 分。$/,(_,title,n)=>`Set “${title}” to ${n}/5.`],
    [/^已清除「(.+)」的评分，地点仍保留在地图中。$/,(_,title)=>`Cleared the rating for “${title}”. The place stays on your map.`],
    [/^([0-5]) · (.+)$/,(_,n,label)=>`${n} · ${tr(label)}`],
    [/^(\d+) 个地点$/, (_, n) => `${n} ${n === '1' ? 'place' : 'places'}`],
    [/^(\d+) 条记录$/, (_, n) => `${n} ${n === '1' ? 'note' : 'notes'}`],
    [/^(\d+) 分钟阅读$/, (_, n) => `${n} min read`],
    [/^(\d+) 个国家与地区入口$/, (_, n) => `${n} countries & regions`],
    [/^找到 (\d+) 个地点 · 显示 (\d+) 个$/, (_, n, shown) => `${n} places found · Showing ${shown}`],
    [/^还有 (\d+) 个$/, (_, n) => `${n} more`],
    [/^(.+)的旅行记录，还在等第一枚标记。$/, (_, name) => `Your first pin in ${tr(name)} is still to come.`],
    [/^看看(.+)的城市与地标。$/, (_, name) => `Explore cities and landmarks in ${tr(name)}.`],
    [/^搜索(.+)国家与地区$/, (_, name) => `Search countries and regions in ${tr(name)}`],
    [/^已导入 (\d+) 个地点，并与当前地图合并。$/, (_, n) => `Imported ${n} places and merged them with this map.`],
    [/^已把「(.+)」加入心愿，可在地图上点击标记编辑。$/, (_, name) => `Added “${tr(name)}” to your wishlist. Select its pin on the map to edit.`],
    [/^「(.+)」暂存在本页，浏览器未能保存。请导出地图备份。$/, (_, name) => `“${tr(name)}” is saved only for this page session. Export a map backup to keep it.`],
    [/^导入失败：(.+)$/, (_, error) => `Import failed: ${tr(error)}`],
    [/^当前为(白昼|黑夜)模式，切换到(白昼|黑夜)模式$/, (_, current, next) => `${tr(current)} mode. Switch to ${tr(next).toLowerCase()} mode`],
    [/^切换到(白昼|黑夜)模式$/, (_, next) => `Switch to ${tr(next).toLowerCase()} mode`],
    [/^(.+)的头像$/, (_, name) => `${name}'s portrait`],
    [/^(.+)旗帜$/, (_, name) => `${tr(name)} flag`],
    [/^(.+)，(已在地图中|加入旅行心愿)$/, (_, name, action) => `${tr(name)}, ${action === '已在地图中' ? 'already on your map' : 'add to travel wishlist'}`],
    // Saved pin titles are user content; only their action/status suffix changes.
    [/^(.+)，(城市／景点|国家／地区)，(去过|想去|居住|想要居住)，点击查看资料$/, (_,title,kind,status)=>`${title}, ${tr(kind)}, ${tr(status)}, view details`],
    [/^(.+)，(去过|想去|居住|想要居住)，点击编辑$/, (_, title, status) => `${title}, ${tr(status)}, select to edit`],
    [/^(.+)，进入大洲页面$/, (_, name) => `${tr(name)}, explore continent`],
    [/^(.+)，查看国家或地区页面$/, (_, name) => `${tr(name)}, explore country or region`],
    [/^(.+)，查看(.+)页面$/, (_, title, name) => `${tr(title)}, explore ${tr(name)}`],
    [/^进入(.+)$/, (_, name) => `Explore ${tr(name)}`],
    [/^我是 (.+)。$/, (_, name) => `I'm ${name}.`],
    [/^目前在 (.+)$/, (_, name) => `Currently in ${tr(name)}`],
    [/^(.+) 首页$/, (_, name) => `${name} home`],
    [/^(.+)的记录$/, (_, name) => `${tr(name)} notes`],
    [/^国界 · (世界概览|区域细节|高清细节)(（.+）)?$/, (_, level, status) => `Borders · ${tr(level)}${status === '（正在加载细节）' ? ' (loading detail)' : status === '（正在加载高清）' ? ' (loading fine detail)' : status === '（更多细节暂不可用）' ? ' (more detail unavailable)' : ''}`],
    [/^(.+) · (.+) 的个人空间$/, (_, title, name) => `${tr(title)} · ${name}'s personal space`],
    [/^(\d{4})年(\d{1,2})月(\d{1,2})日$/, (_, year, month, day) => new Intl.DateTimeFormat('en', {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(+year, +month - 1, +day)))],
  ];
  for (const [pattern, replace] of patterns) if (pattern.test(source)) return source.replace(pattern, replace);
  // Renderers sometimes combine two separately authored UI sentences in one node.
  const sentences = source.match(/[^。！？]+[。！？]?/g);
  if (sentences?.length > 1) {
    const translated = sentences.map(sentence => tr(sentence));
    return translated.some((part, index) => part !== sentences[index]) ? translated.join(' ') : source;
  }
  if (source.includes(' · ')) return source.split(' · ').map(part => tr(part)).join(' · ');
  if (source.endsWith(' ↗')) return `${tr(source.slice(0, -2))} ↗`;
  return source;
}

export function translateText(text, selectedLanguage = language) {
  const source = String(text ?? '');
  if (selectedLanguage === 'zh-CN' || !validLanguage(selectedLanguage)) return source;
  const leading = source.match(/^\s*/)[0];
  const trailing = source.match(/\s*$/)[0];
  const core = source.trim();
  if (!core) return source;
  const translated = selectedLanguage === 'zh-TW' ? toTraditional(core) : englishText(core);
  return leading + translated + trailing;
}

const textRecords = new WeakMap();
const attributeRecords = new WeakMap();
const ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIP_TEXT = 'script,style,textarea,[contenteditable="true"],[data-i18n-skip],[data-language-control],.post-body,.post-header h1,.post-header .category,.article-card h3,.article-card>p,.article-meta>.category,.video-caption,.video-platform,.poster-mark,.map-place-card strong,.map-place-card p,.map-pin-marker,.map-landmark,.interest-notes,.place-search-result-name,.place-search-result-address,.filter-tab[data-category]:not([data-category="全部"])';
const SKIP_ATTRIBUTES = '[data-i18n-skip],.post-body';
let observer;
let framePending = false;

function translateNode(node) {
  if (!node.parentElement || node.parentElement.closest(SKIP_TEXT)) return;
  const previous = textRecords.get(node);
  const source = previous && node.nodeValue === previous.last ? previous.source : node.nodeValue;
  const next = translateText(source);
  textRecords.set(node, {source, last: next});
  if (node.nodeValue !== next) node.nodeValue = next;
}
function translateAttributes(element) {
  if (element.closest(SKIP_ATTRIBUTES)) return;
  const records = attributeRecords.get(element) || {};
  for (const attribute of ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const current = element.getAttribute(attribute);
    const previous = records[attribute];
    const source = previous && current === previous.last ? previous.source : current;
    // Keep saved titles intact in both Chinese writing systems.
    const pinKindLabel=element.matches('.map-pin-marker')&&source.match(/^(.+)，(城市／景点|国家／地区)，(去过|想去|居住|想要居住)，点击查看资料$/);
    const ratingLabel=source.match(/^(.+)，(有多想去|有多推荐)$/);
    const pinLabel = element.matches('.map-pin-marker') && source.match(/^(.+)，(去过|想去|居住|想要居住)，点击编辑$/);
    const next=ratingLabel&&language==='zh-TW'?`${ratingLabel[1]}，${toTraditional(ratingLabel[2])}`:pinKindLabel&&language==='zh-TW'?`${pinKindLabel[1]}，${toTraditional(pinKindLabel[2])}，${toTraditional(pinKindLabel[3])}，點擊查看資料`:pinLabel && language === 'zh-TW' ? `${pinLabel[1]}，${toTraditional(pinLabel[2])}，點擊編輯` : translateText(source);
    records[attribute] = {source, last: next};
    if (current !== next) element.setAttribute(attribute, next);
  }
  attributeRecords.set(element, records);
}
function observe() {
  observer?.observe(document.documentElement, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES});
}

export function refreshTranslations(root = globalThis.document?.body) {
  if (!root || typeof document === 'undefined') return;
  observer?.disconnect();
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateNode(node);
    if (root.nodeType === 1) translateAttributes(root);
    root.querySelectorAll?.('[aria-label],[title],[placeholder],[alt]').forEach(translateAttributes);
    const title = document.querySelector('title')?.firstChild;
    if (title && globalThis.location?.hash?.startsWith('#/post/')) {
      const previous = textRecords.get(title);
      const source = previous && title.nodeValue === previous.last ? previous.source : title.nodeValue;
      const next = source.replace(/^(.+) · (.+) 的个人空间$/, (_, postTitle, name) => language === 'en' ? `${postTitle} · ${name}'s personal space` : language === 'zh-TW' ? `${postTitle} · ${name} 的個人空間` : `${postTitle} · ${name} 的个人空间`);
      textRecords.set(title, {source, last: next});
      if (title.nodeValue !== next) title.nodeValue = next;
    } else if (title) translateNode(title);
    // Search data contains both scripts, without changing the displayed name or input value.
    root.querySelectorAll?.('[data-country-key]').forEach(entry => {
      if (entry.dataset.countryTraditional) return;
      const countryId = entry.getAttribute?.('href')?.split('/').pop();
      entry.dataset.countryKey += ` ${toTraditional(entry.dataset.countryKey)} ${countrySearchAliases(countryId)}`;
      entry.dataset.countryTraditional = 'true';
    });
  } finally { observe(); }
}

function updateLanguageControl() {
  document.querySelectorAll('[data-language-button]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.languageButton === language));
  });
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}
export function setLanguage(value, {persist = true} = {}) {
  if (!validLanguage(value)) return false;
  language = value;
  if (persist) { try { globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language); } catch {} }
  if (typeof document !== 'undefined') {
    updateLanguageControl();
    refreshTranslations();
    window.dispatchEvent(new CustomEvent('site-language-change', {detail: {language}}));
  }
  return true;
}

function initialize() {
  const actions = document.querySelector('.topbar-actions');
  if (actions && !document.querySelector('[data-language-switch]')) {
    const control = document.createElement('div');
    control.className = 'language-switch';
    control.dataset.languageSwitch = '';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', '选择网站语言');
    control.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a14 14 0 0 1 0 14 14 14 0 0 1 0-14Z"/></svg><button type="button" data-language-button="zh-CN" data-language-control data-i18n-skip lang="zh-CN" aria-label="简体中文" aria-pressed="false">简中</button><button type="button" data-language-button="zh-TW" data-language-control data-i18n-skip lang="zh-TW" aria-label="繁體中文" aria-pressed="false">繁中</button><button type="button" data-language-button="en" data-language-control data-i18n-skip lang="en" aria-label="English" aria-pressed="false">EN</button>';
    actions.insertBefore(control, actions.querySelector('#theme-toggle'));
    control.addEventListener('click', event => {
      const button = event.target.closest('[data-language-button]');
      if (button) setLanguage(button.dataset.languageButton);
    });
  }
  updateLanguageControl();
  observer = new MutationObserver(() => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {framePending = false; refreshTranslations();});
  });
  refreshTranslations();
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) setLanguage(validLanguage(event.newValue) ? event.newValue : 'zh-CN', {persist: false});
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
}
