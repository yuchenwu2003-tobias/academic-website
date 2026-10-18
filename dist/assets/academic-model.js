import {COUNTRIES} from './geography-data.js?v=20261018-profile';

export const ACADEMIC_STORAGE_KEY='tobias.academic-map.v1';
export const ACADEMIC_BACKUP_TYPE='academic-map';
export const ACADEMIC_LIMIT=1000;
const countryIds=new Set([...COUNTRIES.map(country=>country.id),'sgp','mdv']);
const validId=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);

function text(value,label,maximum,{required=false,trim=false}={}) {
  if(value===undefined&&!required)return '';
  if(typeof value!=='string')throw new Error(`${label}需要填写文字。`);
  const result=trim?value.trim():value;
  if((required&&!result.trim())||result.length>maximum)throw new Error(`${label}${required?'不能为空，且':''}最多 ${maximum} 个字符。`);
  return result;
}
export function academicWebsite(value) {
  if(value===undefined||value==='')return '';
  if(typeof value!=='string'||value.trim().length>2000)throw new Error('官网需要有效链接，最多 2000 个字符。');
  if(!value.trim())return '';
  try{
    const url=new URL(value.trim());
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.href.length>2000)throw new Error();
    return url.href;
  }catch{throw new Error('官网请填写不含账号密码的完整 HTTP 或 HTTPS 链接。');}
}
export function normalizeAcademicCountryHint(hint) {
  if(!hint||typeof hint!=='object'||typeof hint.id!=='string')return null;
  const id=hint.id.toLowerCase();
  if(!countryIds.has(id)||![hint.lat,hint.lon].every(Number.isFinite)||Math.abs(hint.lat)>90||Math.abs(hint.lon)>180)return null;
  return {id,lat:hint.lat,lon:hint.lon};
}
export function normalizeAcademicGroup(group,{requireId=false}={}) {
  if(!group||typeof group!=='object'||Array.isArray(group))throw new Error('研究组资料格式无效。');
  if(requireId&&!validId(group.id))throw new Error('研究组备份中的标识无效。');
  if(![group.lat,group.lon].every(Number.isFinite)||Math.abs(group.lat)>90||Math.abs(group.lon)>180)throw new Error('请搜索并选择研究组所在位置，或在地图上选择位置。');
  const result={
    id:validId(group.id)?group.id:`group-${crypto.randomUUID()}`,
    name:text(group.name,'研究组名称',80,{required:true,trim:true}),
    institution:text(group.institution,'所属机构',120,{trim:true}),
    research:text(group.research,'研究方向',500),
    website:academicWebsite(group.website),
    note:text(group.note,'备注',3000),lat:group.lat,lon:group.lon
  };
  if(group.countryHint!==undefined){
    const hint=normalizeAcademicCountryHint(group.countryHint);
    if(!hint)throw new Error('研究组位置的国家信息无效。');
    result.countryHint=hint;
  }
  return result;
}
export function academicBackup(groups) {
  if(!Array.isArray(groups)||groups.length>ACADEMIC_LIMIT)throw new Error('学术地图最多保存 1000 个研究组。');
  const normalized=groups.map(group=>normalizeAcademicGroup(group,{requireId:true}));
  if(new Set(normalized.map(group=>group.id)).size!==normalized.length)throw new Error('备份中有重复的研究组标识，请检查后重试。');
  return {type:ACADEMIC_BACKUP_TYPE,version:1,groups:normalized};
}
export function parseAcademicBackup(content) {
  let payload;
  try{payload=JSON.parse(content);}catch{throw new Error('研究组备份无法读取，请选择有效的 JSON 文件。');}
  if(payload?.type!==ACADEMIC_BACKUP_TYPE||payload.version!==1||!Array.isArray(payload.groups))throw new Error('请选择学术地图导出的备份文件。旅行地图备份不能用于这里。');
  return academicBackup(payload.groups).groups;
}
export function mergeAcademicGroups(current,incoming) {
  const merged=new Map(academicBackup(current).groups.map(group=>[group.id,group]));
  academicBackup(incoming).groups.forEach(group=>merged.set(group.id,group));
  if(merged.size>ACADEMIC_LIMIT)throw new Error('合并后超过 1000 个研究组，请先整理收藏。');
  return [...merged.values()];
}
