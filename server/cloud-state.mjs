// Dispatch owns authentication; visitor IDs are stable within this private Site.
// Keep sync metadata outside the normalized browser records.
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
export const MAX_OPERATIONS = 500;
const collections = new Set(['pins', 'hidden', 'trips', 'groups']);
const recordIdPattern = /^[\w-]{1,100}$/;
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'Vary': 'Cookie, Authorization, oai-authenticated-user-id', 'X-Content-Type-Options': 'nosniff' };
class RequestError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const invalid = message => { throw new RequestError(400, 'invalid_request', message); };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
function text(value, label, maximum, required = false) {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) invalid(`${label}格式或长度无效。`);
}
function coordinate(value, label, limit) { if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) invalid(`${label}无效。`); }
function url(value, label, wikipedia = false) {
  text(value, label, 2000);
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (!['https:', ...(wikipedia ? [] : ['http:'])].includes(parsed.protocol) || parsed.username || parsed.password || (wikipedia && parsed.hostname !== 'wikipedia.org' && !parsed.hostname.endsWith('.wikipedia.org'))) invalid(`${label}无效。`);
  } catch { invalid(`${label}无效。`); }
}
function httpsUrl(value, label, wikipedia = false) { url(value, label, wikipedia); if (value && !value.startsWith('https://')) invalid(`${label}需要 HTTPS 链接。`); }
function countryId(value) { if (typeof value !== 'string' || !/^[a-z]{3}$/.test(value)) invalid('国家标识无效。'); }
function month(value) { if (typeof value !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) invalid('居住月份无效。'); }
function countryHint(value) {
  if (!object(value)) invalid('国家位置无效。');
  exactKeys(value, new Set(['id', 'lat', 'lon']));
  countryId(value.id); coordinate(value.lat, '纬度', 90); coordinate(value.lon, '经度', 180);
}
function exactKeys(value, allowed) { for (const key of Object.keys(value)) if (!allowed.has(key)) invalid(`不支持的资料字段：${key.slice(0, 60)}。`); }
const pinFields = new Set(['id', 'title', 'note', 'lat', 'lon', 'status', 'kind', 'countryId', 'countryHint', 'desireRating', 'recommendationRating', 'mapVisibility', 'residenceStart', 'residenceEnd', 'residenceBreaks', 'guides', 'photoUrl', 'wikipediaUrl']);
const tripFields = new Set(['id', 'year', 'month', 'region', 'stops']);
const groupFields = new Set(['id', 'name', 'institution', 'research', 'website', 'note', 'lat', 'lon', 'countryHint']);
const required = { pins: new Set(['id', 'title', 'lat', 'lon', 'status']), trips: new Set(['id', 'year', 'region', 'stops']), groups: new Set(['id', 'name', 'lat', 'lon']) };
function validateFields(collection, id, value, patch = false) {
  if (!object(value)) invalid('资料必须是一个对象。');
  const allowed = collection === 'pins' ? pinFields : collection === 'trips' ? tripFields : groupFields;
  exactKeys(value, allowed);
  if (!patch) for (const key of required[collection]) if (!own(value, key)) invalid(`资料缺少 ${key}。`);
  if (patch && !Object.keys(value).length) invalid('修改内容不能为空。');
  for (const [key, field] of Object.entries(value)) {
    if (field === null && patch && !required[collection].has(key)) continue;
    if (key === 'id') { if (field !== id) invalid('资料标识与记录标识不一致。'); continue; }
    if (key === 'lat' || key === 'lon') { coordinate(field, key, key === 'lat' ? 90 : 180); continue; }
    if (key === 'countryId') { countryId(field); continue; }
    if (key === 'countryHint') { countryHint(field); continue; }
    if (collection === 'pins') {
      if (key === 'title') text(field, '地点名称', 80, true);
      else if (key === 'note') text(field, '介绍', 5000);
      else if (key === 'status') { if (!['want', 'visited', 'resident', 'want-resident'].includes(field)) invalid('地点状态无效。'); }
      else if (key === 'kind') { if (!['city', 'country'].includes(field)) invalid('地点类型无效。'); }
      else if (key === 'desireRating' || key === 'recommendationRating') { if (!Number.isInteger(field) || field < 0 || field > 5) invalid('评分需要在 0 至 5 之间。'); }
      else if (key === 'mapVisibility') { if (!['auto', 'show', 'hide'].includes(field)) invalid('地图显示方式无效。'); }
      else if (key === 'residenceStart' || key === 'residenceEnd') month(field);
      else if (key === 'residenceBreaks') {
        if (!Array.isArray(field) || field.length > 20) invalid('离开期间最多 20 段。');
        for (const range of field) { if (!object(range)) invalid('离开期间无效。'); exactKeys(range, new Set(['start', 'end'])); month(range.start); month(range.end); if (range.end <= range.start) invalid('离开期间的结束月份应晚于开始月份。'); }
      } else if (key === 'guides') {
        if (!Array.isArray(field) || field.length > 30) invalid('攻略最多 30 条。');
        for (const guide of field) { if (!object(guide)) invalid('攻略资料无效。'); exactKeys(guide, new Set(['title', 'url'])); text(guide.title, '攻略标题', 120, true); url(guide.url, '攻略链接'); }
      } else if (key === 'photoUrl' || key === 'wikipediaUrl') httpsUrl(field, key, key === 'wikipediaUrl');
    } else if (collection === 'trips') {
      if (key === 'year') { if (!Number.isInteger(field) || field < 1900 || field > 9999) invalid('行程年份无效。'); }
      else if (key === 'month') { if (!Number.isInteger(field) || field < 1 || field > 12) invalid('行程月份无效。'); }
      else if (key === 'region') text(field, '行程地区', 80, true);
      else if (key === 'stops') {
        if (!Array.isArray(field) || !field.length || field.length > 100) invalid('每段行程需要 1 至 100 个城市。');
        const seen = new Set();
        for (const stop of field) { if (!object(stop)) invalid('行程城市无效。'); exactKeys(stop, new Set(['pinId', 'title', 'rating', 'countryId'])); if (!recordIdPattern.test(stop.pinId) || typeof stop.pinId !== 'string' || seen.has(stop.pinId)) invalid('行程城市标识无效或重复。'); seen.add(stop.pinId); text(stop.title, '城市名称', 80, true); if (!Number.isInteger(stop.rating) || stop.rating < 1 || stop.rating > 5) invalid('行程评分需要在 1 至 5 之间。'); if (own(stop, 'countryId')) countryId(stop.countryId); }
      }
    } else {
      if (key === 'name') text(field, '研究组名称', 80, true);
      else if (key === 'institution') text(field, '所属机构', 120);
      else if (key === 'research') text(field, '研究方向', 500);
      else if (key === 'note') text(field, '研究组备注', 3000);
      else if (key === 'website') url(field, '研究组官网');
    }
  }
  if (collection === 'pins' && typeof value.residenceStart === 'string' && typeof value.residenceEnd === 'string' && value.residenceEnd < value.residenceStart) invalid('居住结束时间不能早于开始时间。');
}
export function validateMutation(payload) {
  if (!object(payload)) invalid('请求资料格式无效。');
  exactKeys(payload, new Set(['requestId', 'operations']));
  if (typeof payload.requestId !== 'string' || !requestIdPattern.test(payload.requestId)) invalid('请求标识无效。');
  if (!Array.isArray(payload.operations) || !payload.operations.length || payload.operations.length > MAX_OPERATIONS) invalid(`每次提交需要 1 至 ${MAX_OPERATIONS} 条修改。`);
  const operations = payload.operations.map(operation => {
    if (!object(operation)) invalid('修改格式无效。');
    exactKeys(operation, new Set(['collection', 'id', 'kind', 'value', 'patch']));
    const { collection, id, kind } = operation;
    if (!collections.has(collection) || typeof id !== 'string' || !recordIdPattern.test(id) || !['put', 'patch', 'delete'].includes(kind)) invalid('记录类型、标识或操作无效。');
    if (kind === 'delete') { if (own(operation, 'value') || own(operation, 'patch')) invalid('删除操作不能附带资料。'); return { collection, id, kind }; }
    if (kind === 'put') {
      if (!own(operation, 'value') || own(operation, 'patch')) invalid('新增操作需要完整资料。');
      let value = operation.value;
      if (collection === 'hidden') { if (value !== true && (!object(value) || Object.keys(value).length !== 1 || value.id !== id)) invalid('隐藏记录无效。'); value = { id }; }
      else validateFields(collection, id, value);
      return { collection, id, kind, value };
    }
    if (collection === 'hidden' || !own(operation, 'patch') || own(operation, 'value')) invalid('修改操作需要字段资料。');
    validateFields(collection, id, operation.patch, true);
    return { collection, id, kind, patch: operation.patch };
  });
  return { requestId: payload.requestId, operations };
}
const receiptGuard = 'NOT EXISTS (SELECT 1 FROM cloud_mutations WHERE user_id = ? AND request_id = ?)';
export function mutationStatements(db, userId, { requestId, operations }, now = new Date().toISOString()) {
  const statements = operations.map(operation => {
    if (operation.kind === 'patch') return db.prepare(`UPDATE cloud_records SET value = json_patch(value, ?), version = version + 1, updated_at = ? WHERE user_id = ? AND collection = ? AND record_id = ? AND deleted = 0 AND ${receiptGuard}`).bind(JSON.stringify(operation.patch), now, userId, operation.collection, operation.id, userId, requestId);
    const deleted = operation.kind === 'delete' ? 1 : 0;
    return db.prepare(`INSERT INTO cloud_records (user_id, collection, record_id, value, deleted, version, updated_at) SELECT ?, ?, ?, ?, ?, 1, ? WHERE ${receiptGuard} ON CONFLICT (user_id, collection, record_id) DO UPDATE SET value = excluded.value, deleted = excluded.deleted, version = cloud_records.version + 1, updated_at = excluded.updated_at`).bind(userId, operation.collection, operation.id, deleted ? 'null' : JSON.stringify(operation.value), deleted, now, userId, requestId);
  });
  statements.push(db.prepare('INSERT OR IGNORE INTO cloud_mutations (user_id, request_id, created_at) VALUES (?, ?, ?)').bind(userId, requestId, now));
  return statements;
}
async function snapshot(db, userId) {
  const result = await db.prepare('SELECT collection, record_id, value, deleted, version FROM cloud_records WHERE user_id = ? ORDER BY collection, record_id').bind(userId).all();
  return { schema: 1, user: { id: userId }, records: result.results.map(row => ({ collection: row.collection, id: row.record_id, value: JSON.parse(row.value), deleted: Boolean(row.deleted), version: row.version })) };
}
async function readJson(request) {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > MAX_BODY_BYTES) throw new RequestError(413, 'request_too_large', '本次资料超过 4 MB，请分批提交。');
  const reader = request.body?.getReader();
  if (!reader) invalid('请求内容不能为空。');
  const chunks = []; let size = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RequestError(413, 'request_too_large', '本次资料超过 4 MB，请分批提交。'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { invalid('请求需要有效的 JSON。'); }
}
export async function handleCloudState(request, db) {
  try {
    const userId = request.headers.get('oai-authenticated-user-id');
    if (!userId || userId.length > 256 || /[\u0000-\u001f\u007f]/.test(userId)) throw new RequestError(401, 'authentication_required', '请先使用 ChatGPT 登录，再读取或保存个人记录。');
    const origin = request.headers.get('origin'), fetchSite = request.headers.get('sec-fetch-site');
    if ((origin && origin !== new URL(request.url).origin) || (fetchSite && !['same-origin', 'none'].includes(fetchSite)) || (request.method === 'POST' && !origin)) throw new RequestError(403, 'same_origin_required', '只能从当前网站读取或保存记录。');
    if (!['GET', 'POST'].includes(request.method)) throw new RequestError(405, 'method_not_allowed', '请求方式不支持。');
    if (!db?.prepare || !db?.batch) throw new RequestError(503, 'storage_unavailable', '云端存储暂时无法连接，请稍后重试。');
    if (request.method === 'POST') {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new RequestError(415, 'json_required', '保存资料需要 JSON 格式。');
      const mutation = validateMutation(await readJson(request));
      // D1 batches execute sequentially in one transaction; the last receipt
      // guards every earlier write, including deletion and restored records.
      await db.batch(mutationStatements(db, userId, mutation));
    }
    const result=await snapshot(db,userId);
    const email=request.headers.get('oai-authenticated-user-email');
    let name=request.headers.get('oai-authenticated-user-full-name');
    if(name&&request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')try{name=decodeURIComponent(name);}catch{name=null;}
    if(email&&email.length<=254)result.user.email=email;
    if(name&&name.length<=200)result.user.name=name;
    return response(result);
  } catch (error) {
    if (error instanceof RequestError) return response({ error: error.code, message: error.message }, error.status);
    return response({ error: 'storage_unavailable', message: '云端记录暂时无法读取或保存，请稍后重试。' }, 503);
  }
}
