import {COUNTRIES} from './geography-data.js?v=20261023-cloud-palette';
export const STORAGE_KEY = 'tobias.travel-map.v1';
export const isExperienced=pin=>['visited','resident'].includes(pin?.status);
export function showTravelMapMarker(pin,region={kind:'world'}){
  if(pin?.mapVisibility==='show')return true;
  if(pin?.mapVisibility==='hide')return false;
  const rating=pin?.[isExperienced(pin)?'recommendationRating':'desireRating']||0;
  if(pin?.kind==='country')return rating===5;
  if(isResidenceStatus(pin))return true;
  return region.kind==='country'||rating>=(region.kind==='continent'?4:5);
}
export const isResidenceStatus=pin=>['resident','want-resident'].includes(pin?.status);
export const pinStatusLabel=pin=>pin?.status==='want-resident'?'想要居住':pin?.status==='resident'?'居住':pin?.status==='visited'?'去过':'想去';
export function residencePeriod(pin){return pin?.residenceStart?`${pin.residenceStart.replace('-','.')} — ${pin.residenceEnd?pin.residenceEnd.replace('-','.'):'至今'}`:'';}
export function residenceDuration(pin,now=new Date()){
  if(!pin?.residenceStart)return '';
  const [startYear,startMonth]=pin.residenceStart.split('-').map(Number);
  const [endYear,endMonth]=pin.residenceEnd?pin.residenceEnd.split('-').map(Number):[now.getFullYear(),now.getMonth()+1];
  const toMonth=value=>{const [year,month]=value.split('-').map(Number);return year*12+month-1;};
  const begin=startYear*12+startMonth-1,end=endYear*12+endMonth-1;
  const excluded=(pin.residenceBreaks||[]).map(range=>[Math.max(begin,toMonth(range.start)),Math.min(end,toMonth(range.end))]).filter(([start,finish])=>finish>start).sort((a,b)=>a[0]-b[0]);
  let removed=0,lastEnd=begin;for(const [start,finish] of excluded){removed+=Math.max(0,finish-Math.max(start,lastEnd));lastEnd=Math.max(lastEnd,finish);}
  const months=Math.max(0,end-begin-removed),years=Math.floor(months/12),rest=months%12;
  return years?`${years}yr${rest?` ${rest}mo`:''}`:`${months}mo`;
}
export {project,unproject} from './projection.js?v=20261023-cloud-palette';
const countryHintIds=new Set([...COUNTRIES.map(country=>country.id),'sgp','mdv']);
export function normalizeCountryId(value) {
  if(typeof value!=='string')return null;
  const id=value.toLowerCase();
  return /^[a-z]{3}$/.test(id)&&countryHintIds.has(id)?id:null;
}
export function normalizeCountryHint(hint) {
  if(!hint||typeof hint!=='object'||typeof hint.id!=='string')return null;
  const id=normalizeCountryId(hint.id);
  if(!id||typeof hint.lat!=='number'||!Number.isFinite(hint.lat)||Math.abs(hint.lat)>90||typeof hint.lon!=='number'||!Number.isFinite(hint.lon)||Math.abs(hint.lon)>180)return null;
  return {id,lat:hint.lat,lon:hint.lon};
}
function normalizeLink(value,label,{httpsOnly=false,wikipediaOnly=false}={}) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>2000)throw new Error(`${label}需要有效链接，且不能超过 2000 个字符。`);
  let url;
  try{url=new URL(value.trim());}catch{throw new Error(`${label}需要填写完整的有效链接。`);}
  if(!(httpsOnly?['https:']:['https:','http:']).includes(url.protocol))throw new Error(`${label}仅支持 ${httpsOnly?'HTTPS':'HTTP 或 HTTPS'} 链接。`);
  if(url.username||url.password)throw new Error(`${label}不能包含账号或密码。`);
  if(wikipediaOnly&&url.hostname!=='wikipedia.org'&&!url.hostname.endsWith('.wikipedia.org'))throw new Error('百科链接必须来自 wikipedia.org 或其子域。');
  if(url.href.length>2000)throw new Error(`${label}不能超过 2000 个字符。`);
  return url.href;
}
export function normalizeGuideLinks(guides=[]) {
  if(!Array.isArray(guides)||guides.length>30)throw new Error('攻略链接需要是列表，最多保存 30 条。');
  return guides.map((guide,index)=>{
    const label=`第 ${index+1} 条攻略`;
    if(!guide||typeof guide!=='object'||typeof guide.title!=='string'||!guide.title.trim()||guide.title.trim().length>120)throw new Error(`${label}需要标题，且标题不能超过 120 个字符。`);
    return {title:guide.title.trim(),url:normalizeLink(guide.url,`${label}链接`)};
  });
}
export function normalizePin(pin) {
  if (!pin || typeof pin !== 'object' || typeof pin.title !== 'string' || !pin.title.trim() || pin.title.length>80 || typeof pin.lat!=='number' || !Number.isFinite(pin.lat) || Math.abs(pin.lat)>90 || typeof pin.lon!=='number' || !Number.isFinite(pin.lon) || Math.abs(pin.lon)>180 || (pin.note!==undefined && (typeof pin.note!=='string'||pin.note.length>5000)) || !['want','visited','resident','want-resident'].includes(pin.status ?? 'want')) throw new Error('地点需要名称、有效经纬度和有效旅行状态，介绍最多 5000 个字符。');
  const result={id:typeof pin.id==='string'&&/^[\w-]{1,100}$/.test(pin.id)?pin.id:crypto.randomUUID(),title:pin.title.trim(),note:pin.note || '',lat:pin.lat,lon:pin.lon,status:pin.status || 'want'};
  const countryId=normalizeCountryId(pin.countryId);
  // Unknown future kinds and malformed country metadata remain recoverable as
  // ordinary city pins, instead of invalidating an entire legacy backup.
  result.kind=pin.kind==='country'&&countryId?'country':'city';
  if(countryId)result.countryId=countryId;
  result.desireRating=Number.isInteger(pin.desireRating)&&pin.desireRating>=0&&pin.desireRating<=5?pin.desireRating:0;
  result.recommendationRating=Number.isInteger(pin.recommendationRating)&&pin.recommendationRating>=0&&pin.recommendationRating<=5?pin.recommendationRating:0;
  if(pin.mapVisibility!==undefined&&!['auto','show','hide'].includes(pin.mapVisibility))throw new Error('请选择有效的地图显示方式。');
  if(pin.mapVisibility&&pin.mapVisibility!=='auto')result.mapVisibility=pin.mapVisibility;
  for(const field of ['residenceStart','residenceEnd']){
    const value=pin[field];if(value===undefined||value==='')continue;
    if(typeof value!=='string'||!(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/).test(value))throw new Error('居住时间请使用有效的年和月。');result[field]=value;
  }
  if(result.residenceEnd&&(!result.residenceStart||result.residenceEnd<result.residenceStart))throw new Error('请先填写入住时间，结束时间不能早于入住时间。');
  if(pin.residenceBreaks!==undefined){
    if(!Array.isArray(pin.residenceBreaks)||pin.residenceBreaks.length>20)throw new Error('离开期间最多保存 20 段。');
    if(pin.residenceBreaks.length){
      if(!result.residenceStart)throw new Error('请先填写入住时间，再添加离开期间。');
      result.residenceBreaks=pin.residenceBreaks.map(range=>{
        if(!range||![range.start,range.end].every(value=>typeof value==='string'&&/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value))||range.end<=range.start)throw new Error('离开期间需要有效的起止月份，结束月份应晚于开始月份。');
        if(range.start<result.residenceStart||(result.residenceEnd&&range.end>result.residenceEnd))throw new Error('离开期间应在居住的起止月份之内。');
        return {start:range.start,end:range.end};
      });
    }
  }
  const countryHint=normalizeCountryHint(pin.countryHint);
  if(countryHint)result.countryHint=countryHint;
  result.guides=normalizeGuideLinks(pin.guides);
  for(const [field,label,wikipediaOnly]of [['photoUrl','图片链接',false],['wikipediaUrl','百科链接',true]]){
    if(pin[field]===undefined||(typeof pin[field]==='string'&&!pin[field].trim()))continue;
    result[field]=normalizeLink(pin[field],label,{httpsOnly:true,wikipediaOnly});
  }
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
