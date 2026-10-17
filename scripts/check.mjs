import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const errors = [];
const registeredPages = new Set(['home', 'travel', 'writing', 'videos', 'about', 'projects']);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function expect(condition, message) {
  if (!condition) errors.push(message);
  return condition;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value, label) {
  return expect(typeof value === 'string' && value.trim().length > 0, `${label} 必须是非空字符串。`);
}

function fields(object, names, label) {
  for (const name of names) text(object[name], `${label}.${name}`);
}

function array(value, label) {
  return expect(Array.isArray(value), `${label} 必须是数组。`);
}

function date(value, label) {
  if (!text(value, label)) return;
  const correct = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  expect(correct, `${label} 必须是有效的 YYYY-MM-DD 日期。`);
}

function webUrl(value, label, allowMail = false) {
  if (!text(value, label)) return false;
  try {
    const parsed = new URL(value);
    const web = ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    const mail = allowMail && parsed.protocol === 'mailto:' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.pathname) && !parsed.search && !parsed.hash;
    return expect(web || mail, `${label} 必须是安全的 http(s) 链接${allowMail ? '或邮箱 mailto 链接' : ''}。`);
  } catch {
    expect(false, `${label} 不是有效 URL。`);
    return false;
  }
}

function entries(value, label, visitor) {
  if (!array(value, label)) return;
  const seen = new Set();
  value.forEach((item, index) => {
    const itemLabel = `${label}[${index}]`;
    if (!expect(isObject(item), `${itemLabel} 必须是对象。`)) return;
    if (text(item.id, `${itemLabel}.id`)) {
      expect(idPattern.test(item.id), `${itemLabel}.id 只允许小写字母、数字及单个连字符分隔。`);
      expect(!seen.has(item.id), `${label} 中存在重复 id：${item.id}。`);
      seen.add(item.id);
    }
    visitor(item, itemLabel);
  });
}

async function jsonFile(filename, label) {
  try {
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    errors.push(`${label} 无法读取或解析：${error.message}`);
    return null;
  }
}

const site = await jsonFile(path.join(dist, 'content', 'site.json'), 'site.json');
if (expect(isObject(site), 'site.json 必须包含配置对象。')) {
  if (expect(isObject(site.profile), 'profile 必须是对象。')) {
    fields(site.profile, ['name', 'handle', 'eyebrow', 'description', 'bio'], 'profile');
    for (const optional of ['avatar', 'location']) {
      if (site.profile[optional] !== undefined) text(site.profile[optional], `profile.${optional}`);
    }
    if (typeof site.profile.avatar === 'string') {
      if (/^[a-z][a-z0-9+.-]*:/i.test(site.profile.avatar)) webUrl(site.profile.avatar, 'profile.avatar');
      else await localReference(site.profile.avatar, dist, 'profile.avatar');
    }
  }

  if (array(site.links, 'links')) {
    site.links.forEach((link, index) => {
      const label = `links[${index}]`;
      if (!expect(isObject(link), `${label} 必须是对象。`)) return;
      text(link.label, `${label}.label`);
      webUrl(link.url, `${label}.url`, true);
    });
  }

  entries(site.navigation, 'navigation', (item, label) => {
    text(item.label, `${label}.label`);
    expect(registeredPages.has(item.id), `${label}.id 未注册为可用页面：${item.id}。`);
    expect(typeof item.enabled === 'boolean', `${label}.enabled 必须是布尔值。`);
  });

  entries(site.posts, 'posts', (post, label) => {
    fields(post, ['title', 'category', 'excerpt'], label);
    date(post.date, `${label}.date`);
    expect(Number.isInteger(post.readingMinutes) && post.readingMinutes > 0, `${label}.readingMinutes 必须是正整数。`);
    expect(typeof post.featured === 'boolean', `${label}.featured 必须是布尔值。`);
    const hasExternalUrl = post.url !== undefined;
    if (hasExternalUrl) webUrl(post.url, `${label}.url`);
    if (!hasExternalUrl || post.body !== undefined) {
      if (!array(post.body, `${label}.body`)) return;
      if (!hasExternalUrl) expect(post.body.length > 0, `${label} 的站内文章必须有正文。`);
      post.body.forEach((block, index) => {
        const blockLabel = `${label}.body[${index}]`;
        if (!expect(isObject(block), `${blockLabel} 必须是对象。`)) return;
        expect(['paragraph', 'heading', 'quote', 'list'].includes(block.type), `${blockLabel}.type 不受支持。`);
        if (block.type === 'list') {
          if (array(block.items, `${blockLabel}.items`)) {
            expect(block.items.length > 0, `${blockLabel}.items 不能为空。`);
            block.items.forEach((item, itemIndex) => text(item, `${blockLabel}.items[${itemIndex}]`));
          }
        } else {
          text(block.text, `${blockLabel}.text`);
        }
      });
    }
  });

  entries(site.videos, 'videos', (video, label) => {
    fields(video, ['title', 'creator', 'platform', 'category', 'description'], label);
    webUrl(video.url, `${label}.url`);
    date(video.addedAt, `${label}.addedAt`);
  });

  entries(site.projects, 'projects', (project, label) => {
    fields(project, ['title', 'category', 'description', 'status', 'accent'], label);
    expect(/^\d{4}$/.test(String(project.year ?? '')), `${label}.year 必须是四位年份。`);
    expect(typeof project.featured === 'boolean', `${label}.featured 必须是布尔值。`);
    if (project.url !== undefined) webUrl(project.url, `${label}.url`);
  });

  if (expect(isObject(site.travel), 'travel 必须是对象。')) {
    fields(site.travel, ['title', 'description'], 'travel');
    entries(site.travel.destinations, 'travel.destinations', (destination, label) => {
      fields(destination, ['name', 'region', 'description'], label);
      const hasLatitude = destination.lat !== undefined;
      const hasLongitude = destination.lon !== undefined;
      expect(hasLatitude === hasLongitude, `${label}.lat 与 .lon 必须同时填写或同时省略。`);
      if (hasLatitude || hasLongitude) {
        expect(typeof destination.name === 'string' && destination.name.length <= 80, `${label}.name 地图地点名称不能超过 80 个字符。`);
        expect(typeof destination.description === 'string' && destination.description.length <= 500, `${label}.description 地图地点备注不能超过 500 个字符。`);
        expect(typeof destination.id === 'string' && `source-${destination.id}`.length <= 100, `${label}.id 加上 source- 前缀后不能超过 100 个字符（id 最多 93 个字符）。`);
      }
      if (hasLatitude) {
        expect(Number.isFinite(destination.lat) && destination.lat >= -90 && destination.lat <= 90, `${label}.lat 必须是 -90 至 90 的数字。`);
      }
      if (hasLongitude) {
        expect(Number.isFinite(destination.lon) && destination.lon >= -180 && destination.lon <= 180, `${label}.lon 必须是 -180 至 180 的数字。`);
      }
      if (destination.status !== undefined) {
        expect(['want', 'visited'].includes(destination.status), `${label}.status 必须是 want 或 visited。`);
      }
      if (destination.url !== undefined) webUrl(destination.url, `${label}.url`);
      if (destination.image !== undefined) text(destination.image, `${label}.image`);
    });
    if (Array.isArray(site.travel.destinations)) {
      expect(site.travel.destinations.filter(destination => Number.isFinite(destination?.lat) && Number.isFinite(destination?.lon)).length <= 1000, 'travel.destinations 地图最多包含 1000 个有坐标的地点。');
      for (const [index, destination] of site.travel.destinations.entries()) {
        if (typeof destination?.image !== 'string') continue;
        const label = `travel.destinations[${index}].image`;
        if (/^[a-z][a-z0-9+.-]*:/i.test(destination.image)) webUrl(destination.image, label);
        else await localReference(destination.image, dist, label);
      }
    }
  }

  if (array(site.now, 'now')) {
    site.now.forEach((item, index) => {
      if (expect(isObject(item), `now[${index}] 必须是对象。`)) fields(item, ['label', 'text'], `now[${index}]`);
    });
  }
  text(site.extensionNotes, 'extensionNotes');
}

const manifest = await jsonFile(path.join(root, '.openai', 'hosting.json'), 'hosting.json');
if (expect(isObject(manifest), 'hosting.json 必须是对象。')) {
  text(manifest.project_id, 'hosting.json.project_id');
  expect(isObject(manifest.static) && manifest.static.directory === 'dist', 'hosting.json.static.directory 必须是 dist。');
}

async function localReference(reference, base, label) {
  if (!reference || reference.startsWith('#') || reference.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(reference)) return;
  let filename;
  try {
    const rawPath = decodeURIComponent(reference.split(/[?#]/)[0]);
    filename = rawPath.startsWith('/') ? path.resolve(dist, `.${rawPath}`) : path.resolve(base, rawPath);
  } catch {
    errors.push(`${label} 含有无法解码的本地路径：${reference}。`);
    return;
  }
  const relative = path.relative(dist, filename);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    errors.push(`${label} 指向 dist 之外：${reference}。`);
    return;
  }
  try {
    const info = await stat(filename);
    if (info.isDirectory()) filename = path.join(filename, 'index.html');
    expect((await stat(filename)).isFile(), `${label} 引用的资源不是文件：${reference}。`);
  } catch {
    errors.push(`${label} 引用的本地资源不存在：${reference}。`);
  }
}

async function walk(directory) {
  let found;
  try {
    found = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    errors.push(`无法读取资源目录：${error.message}`);
    return [];
  }
  const lists = await Promise.all(found.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  }));
  return lists.flat();
}

await localReference('index.html', dist, '站点入口');
for (const filename of await walk(dist)) {
  const extension = path.extname(filename).toLowerCase();
  if (!['.html', '.css', '.js', '.svg'].includes(extension)) continue;
  const source = await readFile(filename, 'utf8');
  const label = path.relative(root, filename);
  const attributeBase = extension === '.js' ? dist : path.dirname(filename);
  for (const match of source.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) {
    if (match[1].includes('${')) continue;
    await localReference(match[1], attributeBase, label);
  }
  if (extension === '.css') {
    for (const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) {
      await localReference(match[1], path.dirname(filename), label);
    }
  }
  if (extension === '.js') {
    for (const match of source.matchAll(/\bfetch\(\s*["']([^"']+)["']/g)) await localReference(match[1], dist, label);
    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) await localReference(match[1], path.dirname(filename), label);
  }
}

const app = path.join(dist, 'assets', 'app.js');
const syntax = spawnSync(process.execPath, ['--check', app], { encoding: 'utf8' });
if (syntax.error || syntax.status !== 0) errors.push(`app.js 语法检查失败：${syntax.error?.message ?? syntax.stderr.trim()}`);

if (errors.length) {
  console.error(`检查未通过（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('检查通过：内容配置、链接与日期、本地资源、托管配置及 JavaScript 语法均有效。');
}
