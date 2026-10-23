import {COUNTRIES} from './geography.js?v=20261023-cloud-palette';

// Natural Earth's 110m/50m/10m denote map scales, not metre-level accuracy.
// Keep these identifiers internal; visible copy describes the detail level.
const LEVELS = {'110m': 1, '50m': 2, '10m': 3};
const LEVEL_NAMES = {1: '世界概览', 2: '区域细节', 3: '高清细节'};
const RETRY_DELAY = 30000;
const mediumEntry = {};
const fineCache = new Map();
const intersects = (b, v) => b.maxX >= v.x && b.minX <= v.x + v.width && b.maxY >= v.y && b.minY <= v.y + v.height;
const validView = view => view && [view.x, view.y, view.width, view.height].every(Number.isFinite) && view.width > 0 && view.height > 0;
const validShape = item => item && typeof item.d === 'string' && item.d.startsWith('M') && item.d.endsWith('Z') && item.bounds && ['minX', 'minY', 'maxX', 'maxY'].every(key => Number.isFinite(item.bounds[key])) && item.bounds.minX <= item.bounds.maxX && item.bounds.minY <= item.bounds.maxY;

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Map detail unavailable');
  return response.json();
}
function load(entry, url, validate) {
  if (entry.value) return Promise.resolve(entry.value);
  if (entry.promise) return entry.promise;
  if (entry.retryAt > Date.now()) return Promise.reject(entry.error);
  entry.promise = readJson(url).then(data => {
    if (!validate(data)) throw new Error('Invalid map detail');
    entry.value = data;
    entry.error = null;
    entry.retryAt = 0;
    return data;
  }).catch(error => {
    entry.error = error;
    entry.retryAt = Date.now() + RETRY_DELAY;
    throw error;
  }).finally(() => {entry.promise = null;});
  return entry.promise;
}
const medium = () => load(mediumEntry, 'assets/geography-detail/medium.json', data => data?.resolution === '50m' && data.countries && COUNTRIES.every(country => validShape(data.countries[country.id])));
function fine(id) {
  if (!fineCache.has(id)) fineCache.set(id, {});
  return load(fineCache.get(id), `assets/geography-detail/fine/${id}.json`, data => data?.resolution === '10m' && data.id === id && validShape(data));
}

export function mountMapDetail(root, region = {kind: 'world'}) {
  let revision = 0;
  let timer;
  let stopped = false;
  const svg = root?.querySelector('[data-world-map]');
  const label = root?.querySelector('[data-border-detail]');
  const paths = new Map([...(svg?.querySelectorAll('[data-country]') || [])].map(path => [path.dataset.country, path]));
  function set(country, shape, resolution) {
    const path = paths.get(country.id);
    if (!path || !shape || (LEVELS[path.dataset.resolution] || 1) >= LEVELS[resolution]) return;
    path.setAttribute('d', shape.d);
    path.dataset.resolution = resolution;
  }
  function applyCached() {
    for (const country of COUNTRIES) {
      set(country, mediumEntry.value?.countries[country.id], '50m');
      set(country, fineCache.get(country.id)?.value, '10m');
    }
  }
  function describe(view, loading = false, unavailable = false) {
    if (!label) return;
    const visible = COUNTRIES.filter(country => paths.has(country.id) && (region.kind === 'country' ? country.id === region.id : intersects(country.bounds, view)));
    const level = Math.max(1, ...visible.map(country => LEVELS[paths.get(country.id).dataset.resolution] || 1));
    let text = `国界 · ${LEVEL_NAMES[level]}`;
    if (loading && level === 1) text += '（正在加载细节）';
    else if (loading && level === 2 && (region.kind === 'country' || view.width < 165)) text += '（正在加载高清）';
    else if (unavailable && level < 3) text += '（更多细节暂不可用）';
    label.textContent = text;
  }
  async function update(view, version) {
    const current = () => !stopped && version === revision;
    if (!current()) return;
    applyCached();
    if (region.kind === 'world' && view.width >= 650) {describe(view); return;}
    const detailed = region.kind === 'country' || view.width < 165;
    const center = {x: view.x + view.width / 2, y: view.y + view.height / 2};
    const candidates = detailed ? COUNTRIES.filter(country => paths.has(country.id) && (country.id === region.id || intersects(country.bounds, view))).sort((a, b) => {
      if (region.kind === 'country') {if (a.id === region.id) return -1; if (b.id === region.id) return 1;}
      return Math.hypot(a.center[0] - center.x, a.center[1] - center.y) - Math.hypot(b.center[0] - center.x, b.center[1] - center.y);
    }).slice(0, 12) : [];
    let unavailable = false;
    let cursor = 0;
    describe(view, true);
    const mediumTask = (async () => {
      try {
        const data = await medium();
        if (!current()) return;
        COUNTRIES.forEach(country => set(country, data.countries[country.id], '50m'));
        describe(view, true);
      } catch {if (current()) unavailable = true;}
    })();
    async function worker() {
      while (current() && cursor < candidates.length) {
        const country = candidates[cursor++];
        try {
          const data = await fine(country.id);
          if (!current()) return;
          set(country, data, '10m');
          describe(view, true);
        } catch {if (current()) unavailable = true;}
      }
    }
    // Fine detail can succeed even if the shared regional file is unavailable.
    // Two workers keep country navigation responsive without a download burst.
    await Promise.all([mediumTask, worker(), worker()]);
    if (current()) describe(view, false, unavailable);
  }
  return {
    refresh(view) {
      if (stopped || !svg || !validView(view)) return;
      const version = ++revision;
      clearTimeout(timer);
      const snapshot = {...view};
      // Restore successful cached detail immediately, with no coarse interlude.
      applyCached();
      timer = setTimeout(() => {void update(snapshot, version);}, 140);
    },
    destroy() {stopped = true; revision++; clearTimeout(timer);}
  };
}
