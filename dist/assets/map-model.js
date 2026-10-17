import {COUNTRIES} from './geography-data.js';
export const STORAGE_KEY = 'tobias.travel-map.v1';
export {project,unproject} from './projection.js';
const countryHintIds=new Set([...COUNTRIES.map(country=>country.id),'sgp','mdv']);
export function normalizeCountryHint(hint) {
  if(!hint||typeof hint!=='object'||typeof hint.id!=='string')return null;
  const id=hint.id.toLowerCase();
  if(!/^[a-z]{3}$/.test(id)||!countryHintIds.has(id)||typeof hint.lat!=='number'||!Number.isFinite(hint.lat)||Math.abs(hint.lat)>90||typeof hint.lon!=='number'||!Number.isFinite(hint.lon)||Math.abs(hint.lon)>180)return null;
  return {id,lat:hint.lat,lon:hint.lon};
}
export function normalizePin(pin) {
  if (!pin || typeof pin !== 'object' || typeof pin.title !== 'string' || !pin.title.trim() || pin.title.length>80 || typeof pin.lat!=='number' || !Number.isFinite(pin.lat) || Math.abs(pin.lat)>90 || typeof pin.lon!=='number' || !Number.isFinite(pin.lon) || Math.abs(pin.lon)>180 || (pin.note!==undefined && (typeof pin.note!=='string'||pin.note.length>500)) || !['want','visited'].includes(pin.status ?? 'want')) throw new Error('地点需要名称、有效经纬度，以及“想去”或“去过”状态。');
  const result={id:typeof pin.id==='string'&&/^[\w-]{1,100}$/.test(pin.id)?pin.id:crypto.randomUUID(),title:pin.title.trim(),note:pin.note || '',lat:pin.lat,lon:pin.lon,status:pin.status || 'want'};
  const countryHint=normalizeCountryHint(pin.countryHint);
  if(countryHint)result.countryHint=countryHint;
  return result;
}
export function parseImport(text) {
  const payload=JSON.parse(text);
  if(payload.version!==1||!Array.isArray(payload.pins)||payload.pins.length>1000) throw new Error('请选择此地图导出的 JSON 文件（最多 1000 个地点）。');
  const pins=payload.pins.map(normalizePin);
  if(new Set(pins.map(pin=>pin.id)).size!==pins.length) throw new Error('文件中有重复的地点标识，请检查后重试。');
  return pins;
}
export function parseImportState(text) {
  const pins=parseImport(text);
  const payload=JSON.parse(text);
  const hidden=payload.hidden??[];
  if(!Array.isArray(hidden)||hidden.length>1000||hidden.some(id=>typeof id!=='string'||!/^[\w-]{1,100}$/.test(id))||new Set(hidden).size!==hidden.length||hidden.some(id=>pins.some(pin=>pin.id===id))) throw new Error('地图备份中的隐藏地点记录无效。');
  return {pins,hidden};
}
export function combinePins(presets,state) {
  const pins=new Map(presets.map(pin=>[pin.id,pin]));
  state.pins.forEach(pin=>pins.set(pin.id,pin));
  state.hidden.forEach(id=>pins.delete(id));
  return [...pins.values()];
}
