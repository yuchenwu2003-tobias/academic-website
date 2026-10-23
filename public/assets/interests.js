// Personal content lives outside the renderer so each direction can grow over time.
// Topics are suggested ways to organize future content, not claims about the owner.
export const DEFAULT_INTERESTS = [
  {
    id: 'reading-writing',
    title: '阅读与写作',
    description: '给书、文字和一闪而过的想法留个位置。',
    topics: ['阅读清单', '写作片段', '随手摘录'],
    notes: [],
  },
  {
    id: 'music-film',
    title: '音乐与影像',
    description: '旋律、画面，以及值得回味的片刻。',
    topics: ['音乐与现场', '电影与纪录片', '值得重看的片段'],
    notes: [],
  },
  {
    id: 'sports-outdoors',
    title: '运动与户外',
    description: '走出门，给身体和心情一点新鲜空气。',
    topics: ['散步与徒步', '日常运动', '户外体验'],
    notes: [],
  },
  {
    id: 'travel-nature',
    title: '旅行与自然',
    description: '远方的风景，也有身边的小小发现。',
    topics: ['想看的风景', '自然观察', '旅途中的发现'],
    notes: [],
  },
  {
    id: 'technology-making',
    title: '科技与创造',
    description: '给新工具、小实验和未成形的点子留白。',
    topics: ['有趣的工具', '小项目与实验', '新的学习方向'],
    notes: [],
  },
  {
    id: 'art-everyday',
    title: '艺术与生活',
    description: '收集日常里让人多看一眼的细节。',
    topics: ['展览与设计', '摄影与手作', '生活里的小发现'],
    notes: [],
  },
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const INTEREST_ICONS = {
  'reading-writing': '<path d="M4 8q6-3 12 1v17q-6-4-12-1Zm24 0q-6-3-12 1v17q6-4 12-1Z"/><path d="M8 12q2-1 5 1m-5 4q2-1 5 1m6-5q2-2 5-1m-5 6q2-2 5-1"/>',
  'music-film': '<path d="M11 22V8l14-3v14M11 12l14-3"/><ellipse cx="7.5" cy="23" rx="3.5" ry="3"/><ellipse cx="21.5" cy="20" rx="3.5" ry="3"/><path d="m21 28 2-2m3 3 2-3"/>',
  'sports-outdoors': '<path d="m2 26 10-17 7 12 4-7 7 12ZM8 16l4 2 4-2m-5 10 4-7"/><circle cx="24" cy="7" r="3"/>',
  'travel-nature': '<circle cx="16" cy="16" r="11"/><path d="m20 12-2 6-6 2 2-6Z"/><path d="M16 2v3m0 22v3M2 16h3m22 0h3"/>',
  'technology-making': '<path d="M5 8h22v16H5Zm-3 20h28M12 12l-4 4 4 4m8-8 4 4-4 4m-3-9-2 10"/><path d="m25 3 1-2m3 5 2-1"/>',
  'art-everyday': '<path d="M17 4C9 3 3 8 3 16c0 8 7 13 13 12 4-1 1-5 4-6 2-1 5 1 7-3 4-7-3-14-10-15Z"/><circle cx="10" cy="11" r="1.4"/><circle cx="18" cy="9" r="1.4"/><circle cx="24" cy="14" r="1.4"/><path d="m8 20 5 2"/>',
};

function interestIcon(id) {
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${INTEREST_ICONS[id] || '<path d="M16 27V15m0 6C5 22 4 14 5 9c8-1 12 4 11 12Zm0-6C15 8 20 4 27 5c1 7-4 11-11 10Z"/>'}</svg>`;
}

function textNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map(note => typeof note === 'string' ? note : typeof note?.text === 'string' ? note.text : '')
    .filter(note => note.trim());
}

function renderInterestCard(item, index) {
  const notes = textNotes(item.notes);
  const topics = Array.isArray(item.topics) ? item.topics.filter(topic => typeof topic === 'string' && topic.trim()) : [];
  return `<article class="interest-card" data-interest="${escapeHtml(item.id)}">
    <div class="interest-card-top"><span class="interest-icon">${interestIcon(item.id)}</span><span class="interest-index">${String(index + 1).padStart(2, '0')}</span></div>
    <h2 class="interest-card-title">${escapeHtml(item.title)}</h2>
    <p class="interest-description">${escapeHtml(item.description)}</p>
    <span class="interest-status${notes.length ? ' interest-status-filled' : ''}"><span aria-hidden="true"></span>${notes.length ? `${notes.length} 条记录` : '待补充'}</span>
    ${topics.length ? `<details class="interest-directions"><summary class="interest-summary"><span>方向示例</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><ul class="interest-topics">${topics.map(topic => `<li>${escapeHtml(topic)}</li>`).join('')}</ul></details>` : ''}
    ${notes.length ? `<ul class="interest-notes" aria-label="${escapeHtml(item.title)}的记录">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : '<p class="interest-empty">还没有记录，留待慢慢补充。</p>'}
  </article>`;
}

export function renderInterests(items = DEFAULT_INTERESTS) {
  const collection = (Array.isArray(items) ? items : DEFAULT_INTERESTS).filter(item => item && typeof item === 'object');
  return `<section class="interest-page" aria-labelledby="interest-page-title">
    <header class="interest-heading"><span class="interest-kicker">A LITTLE ROOM FOR CURIOSITY</span><h1 class="interest-page-title" id="interest-page-title">兴趣爱好<span>。</span></h1><p class="interest-intro">先放下一些方向，以后慢慢补充。</p><p class="interest-intro-note">喜欢什么、想尝试什么，都可以慢慢写在这里。<br>展开卡片，看看可以从哪里开始记录。</p></header>
    <div class="interest-grid">${collection.map(renderInterestCard).join('')}</div>
    <footer class="interest-footer"><span class="interest-spark" aria-hidden="true">✳</span><p>不急着填满，<br>留一点空白给下一次发现。</p><span class="interest-footer-label">TO BE CONTINUED</span></footer>
  </section>`;
}
