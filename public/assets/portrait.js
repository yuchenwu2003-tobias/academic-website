const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function portraitSource(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  // Local portraits stay under the site's assets directory, without traversal.
  if (/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(source)) return source;
  try {
    const url = new URL(source);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function renderPortrait(src, name, size = '') {
  const source = portraitSource(src);
  if (!source) return '';
  const sizeClass = ['small', 'nav', 'about'].includes(size) ? ` profile-photo--${size}` : '';
  const label = String(name ?? '').trim();
  return `<span class="profile-photo${sizeClass}"><img class="portrait-source" src="${escapeHtml(source)}" alt="${escapeHtml(label ? `${label}的头像` : '个人头像')}" width="3072" height="4096" decoding="async"></span>`;
}
