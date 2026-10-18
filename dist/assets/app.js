import {renderTravelMap,mountTravelMap,getTravelPins,saveTravelPin} from './travel-map.js?v=20261018-profile';
import {renderTravelGuide,mountTravelGuide} from './travel-guides.js?v=20261018-profile';
import {renderTravelRatings,mountTravelRatings} from './travel-ratings.js?v=20261018-profile';
import {renderAcademicMap,mountAcademicMap} from './academic-map.js?v=20261018-profile';
import {resolveRegion,continentById,regionHref} from './geography.js?v=20261018-profile';
import {renderInterests} from './interests.js?v=20261018-profile';
import {renderPortrait} from './portrait.js?v=20261018-profile';
import {refreshTranslations} from './i18n.js?v=20261018-profile';
const icons = {
  academic:'<path d="M3 4h5a3 3 0 0 1 2 1 3 3 0 0 1 2-1h5v12h-5a3 3 0 0 0-2 1 3 3 0 0 0-2-1H3V4Zm7 1v12M5 7h2M13 7h2"/>',
  interests:'<path d="M10 17S2 12 2 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10Z"/>',
  travel:'<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a14 14 0 0 1 0 14 14 14 0 0 1 0-14Z"/>',
  home:'<path d="m3 9 7-6 7 6v8H6V9m2 8v-6h4v6"/>',
  writing:'<path d="M4 3h9l3 3v11H4V3Zm8 0v4h4M7 10h6M7 13h5"/>',
  videos:'<rect x="3" y="4" width="14" height="12" rx="2"/><path d="m8 8 5 2-5 3V8Z"/>',
  about:'<circle cx="10" cy="6" r="3"/><path d="M4 17v-2a6 6 0 0 1 12 0v2"/>',
  projects:'<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 4V2h6v2"/>'
};
const icon = name => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.projects}</svg>`;
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = (value, mail = false) => { try { const url = new URL(value); return (['https:','http:',...(mail?['mailto:']:[])].includes(url.protocol)) ? e(url.href) : ''; } catch { return ''; } };
const imageUrl = value => { if (!value) return ''; try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) ? e(url.href) : ''; } catch { return ''; } };
const externalAttrs = 'target="_blank" rel="noopener noreferrer"';
const date = value => { const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(d); };
let data;
let currentRoute = '';
let mapCleanup = ()=>{};
const main = document.querySelector('#main');
const urlForPost = post => post.url ? safeUrl(post.url) : `#/post/${encodeURIComponent(post.id)}`;
const postCard = post => `<a class="article-card" href="${urlForPost(post)}" ${post.url ? externalAttrs : ''}><div class="article-meta"><span class="category">${e(post.category)}</span><span class="mono">${e(post.date.replaceAll('-','.'))}</span></div><h3>${e(post.title)} <span class="card-arrow">↗</span></h3><p>${e(post.excerpt)}</p><div class="article-bottom"><span>${post.url ? '前往原文阅读' : `${e(post.readingMinutes || 1)} 分钟阅读`}</span><span>${post.url ? '外链文章' : '站内文章'} <span aria-hidden="true">↗</span></span></div></a>`;
const videoCard = video => `<a class="video-card" href="${safeUrl(video.url)}" ${externalAttrs}><div class="video-poster"><span class="video-platform mono">${e(video.platform)}</span><span class="play-symbol" aria-hidden="true">▶</span><span class="poster-mark" aria-hidden="true">${e(video.category.slice(0,2))}</span></div><div class="video-caption"><span class="category">${e(video.category)}</span><h3>${e(video.title)} <span>↗</span></h3><p>${e(video.description || '')}</p><small>${e(video.creator || video.platform)}</small></div></a>`;
const emptyState = (kind, filtered = false) => `<div class="empty-state"><div class="empty-icon">${icon(kind)}</div><span class="mono">${filtered ? 'NOT FOUND' : kind==='videos'?'THE SCREEN IS READY':'A BLANK PAGE'}</span><h2>${filtered ? '暂时没有找到' : kind === 'videos' ? '好片刻，值得再看一遍。' : '下一篇，正在路上。'}</h2><p>${filtered ? '换一个关键词或分类试试。' : kind === 'videos' ? '这里将收藏我喜欢的视频。<br>第一条真实收藏，会从这里开始。' : '文字会在这里慢慢积累。<br>欢迎过些时候，再来看看。'}</p>${filtered ? '<button class="text-link" data-reset>清除筛选 <span>↗</span></button>' : '<a class="text-link" href="#/">先回首页逛逛 <span>↗</span></a>'}</div>`;

function travelSection() {
  const travel = data.travel || {title:'下一站，去哪里玩？',description:'把想去的地方，慢慢放进这张地图。'};
  return `<section class="travel-section" aria-labelledby="travel-title"><div class="section-heading"><div><span class="section-kicker mono">02 / WANDERLUST</span><h2 id="travel-title">${e(travel.title)}</h2></div><div class="travel-title-meta"><span class="travel-count mono">00 PLACES TO GO</span><a class="travel-map-link" href="#/travel">打开旅行地图 <span>↗</span></a></div></div><p class="section-description">${e(travel.description)}</p>${renderTravelMap({compact:true})}</section>`;
}

function travel(region={kind:'world',name:'世界'}) {
  if(!region)return notFound();
  const parent=region.kind==='country'?continentById.get(region.continent):null;
  const crumbs=`<nav class="map-breadcrumbs" aria-label="地图层级"><a href="#/travel">世界地图</a>${parent?`<span>/</span><a href="#/travel/continent/${parent.id}">${e(parent.name)}</a>`:''}${region.kind!=='world'?`<span>/</span><span aria-current="page">${e(region.name)}</span>`:''}</nav>`;
  const title=region.kind==='world'?'把向往，<br>钉在地图上':e(region.name);
  const description=region.kind==='world'?'从七大洲出发，点击大洲，再走进一个国家。滚动鼠标滚轮缩放，拖拽移动地图。':region.kind==='continent'?'点击地图中的国家，或在下方选择一个名字，继续探索。':'在这个国家留下旅行心愿与足迹。可切换地理地图或地标插画，继续添加自己的标记。';
  return `<section class="map-page">${crumbs}<div class="page-heading"><span class="section-kicker mono">${e(region.english?.toUpperCase()||'PLACES, PLANS & MEMORIES')}</span><h1>${title}<span>。</span></h1><p>${description}</p></div>${renderTravelMap({region})}</section>`;
}

function academic(region={kind:'world',name:'世界'}) {
  if(!region)return notFound();
  const parent=region.kind==='country'?continentById.get(region.continent):null;
  const crumbs=`<nav class="map-breadcrumbs" aria-label="地图层级"><a href="#/academic">学术地图</a>${parent?`<span>/</span><a href="#/academic/continent/${parent.id}">${e(parent.name)}</a>`:''}${region.kind!=='world'?`<span>/</span><span aria-current="page">${e(region.name)}</span>`:''}</nav>`;
  return `<section class="map-page academic-page">${crumbs}<div class="page-heading"><span class="section-kicker mono">RESEARCH GROUPS & IDEAS</span><h1>${region.kind==='world'?'把好奇，<br>连到世界上':e(region.name)}<span>。</span></h1><p>收藏感兴趣的研究小组，记录机构、研究方向和想继续追问的问题。</p></div>${renderAcademicMap({region})}</section>`;
}

function home() {
  return `<section class="intro-section" aria-labelledby="intro-title"><div class="hero"><div class="hero-copy"><span class="section-kicker mono">01 / A LITTLE ABOUT ME</span><p class="eyebrow">${data.profile.avatar?renderPortrait(data.profile.avatar,data.profile.name,"small"):'<span class="status-dot"></span>'}${e(data.profile.eyebrow)}</p><h1 id="intro-title">你好，我是<br><em>${e(data.profile.name)}<span>。</span></em></h1><p class="hero-description">${e(data.profile.description)}</p><a class="primary-link" href="#/about">多认识我一点 <span>↗</span></a></div><div class="hero-art"><span class="art-label mono">A PERSONAL GARDEN</span><img src="assets/garden.svg" alt="书本、植物与一扇字母 t 的拱门，象征慢慢生长的个人空间" width="520" height="500"><div class="art-caption"><span class="handwritten">保持好奇，慢慢生长。</span><span class="mono">FIG. 01</span></div></div></div><div class="intro-links"><span class="intro-links-title">也可以在这里找到我<span aria-hidden="true">⤵</span></span><a href="#/writing">${icon('writing')}<span>读我的文章</span><span class="link-count mono">${String(data.posts.length).padStart(2,'0')}</span><span>↗</span></a><a href="#/videos">${icon('videos')}<span>看我的视频收藏</span><span class="link-count mono">${String(data.videos.length).padStart(2,'0')}</span><span>↗</span></a></div></section>${travelSection()}`;
}

function collectionHeader(kind) {
  const video = kind === 'videos';
  return `<div class="page-heading"><span class="section-kicker mono">${video ? 'THE WATCHLIST' : 'WORDS & THOUGHTS'}</span><h1>${video ? '收藏视频<span>。</span>' : '一些文字<span>。</span>'}</h1><p>${video ? '把值得重看的片刻，留在这里。' : '把想法写下来，让它们有迹可循。'}</p></div><div class="collection-toolbar"><div class="filter-tabs" role="group" aria-label="按分类筛选"><button class="filter-tab active" data-category="全部" aria-pressed="true">全部 <span>${data[kind==='videos'?'videos':'posts'].length}</span></button>${[...new Set(data[kind==='videos'?'videos':'posts'].map(item=>item.category))].map(category=>`<button class="filter-tab" data-category="${e(category)}" aria-pressed="false">${e(category)}</button>`).join('')}</div><label class="search-field"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input type="search" id="collection-search" aria-label="${video ? '搜索收藏视频' : '搜索文章'}" placeholder="${video ? '搜索视频…' : '搜索文字…'}" autocomplete="off"></label></div><div id="collection-results" aria-live="polite"></div>`;
}
function writing() { return collectionHeader('writing'); }
function videos() { return collectionHeader('videos'); }
function interests() { return renderInterests(data.interests); }
function about() {
  return `<div class="page-heading"><span class="section-kicker mono">NICE TO MEET YOU</span><h1>很高兴，<br>在这里遇见你<span>。</span></h1></div><div class="about-layout"><div class="about-copy">${data.profile.avatar?renderPortrait(data.profile.avatar,data.profile.name,"about"):`<span class="about-initial" aria-hidden="true">${e(data.profile.name.charAt(0).toLowerCase())}<span>·</span></span>`}<h2>我是 ${e(data.profile.name)}。</h2><p>${e(data.profile.bio)}</p>${data.profile.location ? `<p class="muted">目前在 ${e(data.profile.location)}</p>` : ''}<div class="social-links">${data.links.map(link=>safeUrl(link.url,true)?`<a class="pill-link" href="${safeUrl(link.url,true)}" ${link.url.startsWith('mailto:')?'':externalAttrs}>${e(link.label)} <span>↗</span></a>`:'').join('')}</div></div><aside class="about-note"><span class="section-kicker mono">IN THIS LITTLE SPACE</span><h3>记录，也收藏。</h3><div class="about-note-item"><span>01</span><div><a href="#/writing">一些文字 ↗</a><p>写下想法，让思考有自己的位置。</p></div></div><div class="about-note-item"><span>02</span><div><a href="#/videos">视频收藏 ↗</a><p>好内容，值得一次又一次地重看。</p></div></div><div class="about-note-item"><span>03</span><div><a href="#/travel">旅行心愿 ↗</a><p>把想去的远方，慢慢变成足迹。</p></div></div></aside></div><div class="closing-note"><span aria-hidden="true">✳</span><p>这里会持续更新。<br>愿每一次回访，都有一点新的发现。</p><span class="mono">TO BE CONTINUED…</span></div>`;
}
function projects() {
  return `<div class="page-heading"><span class="section-kicker mono">THINGS I MAKE</span><h1>项目与探索<span>。</span></h1><p>一些已经开始的想法。</p></div>${data.projects.length ? `<div class="article-grid">${data.projects.map(project=>`<article class="article-card"><span class="category">${e(project.category)}</span><h3>${e(project.title)}</h3><p>${e(project.description)}</p><span class="quiet-badge">${e(project.status)}</span>${safeUrl(project.url)?`<a class="text-link" href="${safeUrl(project.url)}" ${externalAttrs}>查看项目 ↗</a>`:''}</article>`).join('')}</div>` : emptyState('projects')}`;
}

// Register a renderer here and enable its matching navigation entry to add a page.
export const pageRenderers = {home,travel,academic,interests,writing,videos,about,projects};

function article(id) {
  const post = data.posts.find(post=>post.id===id);
  if (!post || post.url) return notFound();
  return `<article class="post"><a class="text-link back-link" href="#/writing">← 所有文章</a><header class="post-header"><span class="category">${e(post.category)}</span><h1>${e(post.title)}</h1><div class="post-meta"><span>${e(data.profile.name)}</span><span>·</span><time datetime="${e(post.date)}">${date(post.date)}</time><span>·</span><span>${e(post.readingMinutes || 1)} 分钟阅读</span></div></header><div class="post-body">${(post.body || []).map(block=>block.type==='heading'?`<h2>${e(block.text)}</h2>`:block.type==='quote'?`<blockquote>${e(block.text)}</blockquote>`:block.type==='list'?`<ul>${(block.items || []).map(item=>`<li>${e(item)}</li>`).join('')}</ul>`:`<p>${e(block.text)}</p>`).join('')}</div><footer class="post-end"><span>✳</span><p>谢谢你读到这里。</p><a class="text-link" href="#/writing">再读一篇 <span>↗</span></a></footer></article>`;
}
function notFound() { return '<div class="empty-state"><span class="mono">404 / A LITTLE DETOUR</span><h1>好像走到了一条小岔路。</h1><p>这个页面还没有出现，或已经搬家了。</p><a class="primary-link" href="#/">回到首页 <span>↗</span></a></div>'; }

function bindCollection(kind) {
  let category = '全部';
  const input = document.querySelector('#collection-search');
  const list = data[kind==='videos'?'videos':'posts'];
  function refresh() {
    const query = input.value.trim().toLocaleLowerCase();
    const filtered = list.filter(item=>(category==='全部'||item.category===category) && [item.title,item.excerpt,item.description,item.creator,item.category].filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
    document.querySelector('#collection-results').innerHTML = filtered.length ? `<div class="${kind==='videos'?'video-grid':'article-grid'}">${filtered.map(kind==='videos'?videoCard:postCard).join('')}</div><p class="collection-end mono">${String(filtered.length).padStart(2,'0')} ${kind==='videos'?'VIDEOS TO REVISIT':'STORIES SO FAR'} · 持续更新中</p>` : emptyState(kind,Boolean(query||category!=='全部'));
    document.querySelector('[data-reset]')?.addEventListener('click',()=>{input.value='';document.querySelector('[data-category="全部"]').click();input.focus();});
  }
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(tab=>{tab.classList.toggle('active',tab===button);tab.setAttribute('aria-pressed',String(tab===button));});refresh();}));
  input.addEventListener('input',refresh);
  refresh();
}

export function renderRoute() {
  let raw = location.hash.slice(1) || '/';
  if (raw === 'main') { if (currentRoute) { main.focus(); return; } raw='/'; }
  const segments = raw.replace(/^\//,'').split('/');
  let id;
  try { id=decodeURIComponent(segments[1] || ''); } catch { id=''; }
  const route = segments[0] || 'home';
  const active = route==='post'?'writing':route;
  const ratings=route==='travel'&&segments[1]==='ratings'&&segments.length===2;
  let guide=null;
  if(route==='travel'&&segments[1]==='guide'&&['country','place'].includes(segments[2])&&segments.length===4){try{guide={kind:segments[2],id:decodeURIComponent(segments[3])};}catch{}}
  const region=['travel','academic'].includes(route)&&!ratings&&!guide?resolveRegion(segments.slice(1)):null;
  const getPins=()=>getTravelPins(data.travel?.destinations||[]);
  const onSave=pin=>saveTravelPin(pin,data.travel?.destinations||[]);
  mapCleanup();
  mapCleanup=()=>{};
  main.innerHTML = ratings?renderTravelRatings(getPins()):guide?renderTravelGuide(guide,getPins()):route==='post' ? article(id) : route==='travel' ? travel(region) : route==='academic'?academic(region):Object.hasOwn(pageRenderers,route) ? pageRenderers[route]() : notFound();
  main.dataset.page = route;
  document.querySelectorAll('.nav-link').forEach(link=>{const selected=ratings?link.dataset.page==='travel-ratings':link.dataset.page===active;link.classList.toggle('active',selected);selected?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');});
  const label = data.navigation.find(item=>item.id===active)?.label || '页面';
  const postTitle = route==='post'?data.posts.find(post=>post.id===id)?.title:undefined;
  document.title = `${ratings?'旅行评分':guide?'旅行攻略':postTitle || (['travel','academic'].includes(route)&&region?.kind!=='world'?region?.name:label)} · ${data.profile.name} 的个人空间`;
  document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');
  document.querySelector('.menu-toggle').setAttribute('aria-label','展开导航');
  document.querySelector('.sidebar').classList.remove('menu-open');
  if (['writing','videos'].includes(route)) bindCollection(route);
  if(ratings)mapCleanup=mountTravelRatings(main,{getPins,onSave});
  else if(guide)mapCleanup=mountTravelGuide(main,{spec:guide,getPins,onSave});
  else if(route==='academic'&&region)mapCleanup=mountAcademicMap(main,{region});
  else if (['home','travel'].includes(route)&&main.querySelector('[data-travel-map]')) mapCleanup=mountTravelMap(main.querySelector('[data-travel-map]'),data.travel?.destinations||[],route==='travel'?region:{kind:'world',name:'世界'});
  if (currentRoute) { window.scrollTo({top:0,behavior:'instant'}); main.focus({preventScroll:true}); }
  currentRoute=route;
  refreshTranslations();
}

async function start() {
  try {
    const response=await fetch('content/site.json');
    if(!response.ok) throw new Error('Content unavailable');
    data=await response.json();
    ['posts','videos','projects','links','navigation'].forEach(key=>{data[key] ||= [];});
    document.querySelector('#navigation').innerHTML=data.navigation.filter(item=>item.enabled).map(item=>`<a class="nav-link" data-page="${e(item.id)}" href="#/${item.id==='home'?'':e(item.id)}">${icon(item.id)}<span>${e(item.label)}</span><span class="nav-indicator">↗</span></a>${item.id==='travel'?'<a class="nav-link nav-sub-link" data-page="travel-ratings" href="#/travel/ratings"><span aria-hidden="true">↳</span><span>旅行评分</span><span class="nav-indicator">↗</span></a>':''}`).join('');
    document.querySelector('.brand-name').innerHTML=`${e(data.profile.name)}<small>一小块互联网</small>`;
    if(data.profile.avatar) document.querySelector('.brand-mark')?.replaceWith(document.createRange().createContextualFragment(renderPortrait(data.profile.avatar,data.profile.name,'nav')));
    document.querySelector('.brand').setAttribute('aria-label',`${data.profile.name} 首页`);
    document.querySelector('#footer-name').textContent=data.profile.name;
    document.querySelector('#year').textContent=new Date().getFullYear();
    const github=data.links.find(link=>link.label.toLowerCase()==='github');
    if(github&&safeUrl(github.url)) document.querySelector('#github-link').href=github.url;
    else document.querySelector('#github-link').hidden=true;
    document.querySelector('meta[name="description"]').content=data.profile.description;
    window.addEventListener('hashchange',renderRoute);
    document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
    document.querySelector('.menu-toggle').addEventListener('click',()=>{const button=document.querySelector('.menu-toggle');const expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'收起导航':'展开导航');document.querySelector('.sidebar').classList.toggle('menu-open',expanded);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelector('.sidebar').classList.remove('menu-open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}});
    renderRoute();
  } catch(error) { main.innerHTML='<div class="empty-state"><h1>内容暂时没有加载出来。</h1><p>请刷新页面，再试一次。</p><button class="primary-link" id="retry">重新加载 ↗</button></div>';document.querySelector('#retry').addEventListener('click',()=>location.reload());console.error(error); }
}
start();
