// Load before styles so the first paint already uses the saved or system theme.
(() => {
  const storageKey = 'tobias-personal-space.theme.v1';
  const root = document.documentElement;
  const valid = value => value === 'light' || value === 'dark';
  let preference = null;
  let system = null;
  try { system = window.matchMedia('(prefers-color-scheme: dark)'); } catch {}
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (valid(saved)) preference = saved;
  } catch {}

  function updateControl() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const dark = root.dataset.theme === 'dark';
    const current = dark ? '黑夜' : '白昼';
    const next = dark ? '白昼' : '黑夜';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', `当前为${current}模式，切换到${next}模式`);
    button.title = `切换到${next}模式`;
    button.querySelector('[data-theme-label]').textContent = current;
  }

  function apply() {
    const theme = preference || (system?.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#171f1a' : '#f6f5f0';
    updateControl();
  }

  apply();
  const onSystemChange = () => { if (!preference) apply(); };
  if (system?.addEventListener) system.addEventListener('change', onSystemChange);
  else system?.addListener?.(onSystemChange);

  function bind() {
    updateControl();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply();
      try { window.localStorage.setItem(storageKey, preference); } catch {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  // Keep the preference in step across tabs without touching travel-map storage.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    apply();
  });
})();
