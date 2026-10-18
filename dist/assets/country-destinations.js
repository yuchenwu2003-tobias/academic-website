import {COUNTRIES} from './geography-data.js';
import {COUNTRY_CAPITALS,COUNTRY_CAPITAL_FALLBACKS} from './country-capitals.js';
import {unproject} from './projection.js';
import {countrySearchAliases,toTraditional} from './i18n.js';

const validPoint=point=>point&&Number.isFinite(point.lat)&&Number.isFinite(point.lon)&&Math.abs(point.lat)<=90&&Math.abs(point.lon)<=180;
function countryPlace(country){
  const capital=COUNTRY_CAPITALS[country.id];
  const label=validPoint(capital)?capital:[country.center,country.label].filter(Array.isArray).map(point=>unproject(point[0],point[1])).find(validPoint);
  if(!label)throw new Error(`Country has no valid label coordinates: ${country.id}`);
  if(!capital&&!COUNTRY_CAPITAL_FALLBACKS[country.id])throw new Error(`Country has no capital or explicit fallback: ${country.id}`);
  return {id:country.id,name:country.name,english:country.english,continent:country.continent,pinId:`country-${country.id}`,kind:'country',country:country.id,countryId:country.id,lat:label.lat,lon:label.lon,source:'country',anchorKind:capital?.kind||'fallback',capitalName:capital?.name||'',capitalEnglish:capital?.english||'',anchorNote:capital?.note||COUNTRY_CAPITAL_FALLBACKS[country.id]||''};
}

// Country wishes use an official capital (or an explicitly documented
// administrative centre). Country identity never comes from point containment.
export const countryPlaces=COUNTRIES.map(countryPlace);
for(const country of [
  {id:'sgp',name:'新加坡',english:'Singapore',continent:'asia',lat:1.28967,lon:103.85007},
  {id:'mdv',name:'马尔代夫',english:'Maldives',continent:'asia',lat:4.17521,lon:73.50916}
]){
  if(countryPlaces.some(place=>place.id===country.id))continue;
  if(!validPoint(country))throw new Error('Invalid small-country display anchor');
  countryPlaces.push(countryPlace(country));
}
export const countryPlaceById=new Map(countryPlaces.map(place=>[place.id,place]));

// Safe for load/save/import migrations: keep ID, score, profile and every city
// coordinate unchanged. The only fallback is a unit with no defined capital.
export function anchorCountryPin(pin){
  if(!pin||pin.kind!=='country')return pin;
  const place=countryPlaceById.get(pin.countryId);
  if(!place||(pin.lat===place.lat&&pin.lon===place.lon))return pin;
  return {...pin,lat:place.lat,lon:place.lon};
}

const EXTRA_ALIASES={
  chn:"China PRC People's Republic of China 中国 中國",
  twn:'Taiwan ROC Republic of China 台湾 台灣 臺灣',
  usa:'US USA U.S. United States of America America 美国 美國',
  gbr:'UK U.K. Britain Great Britain United Kingdom 英国 英國',
  rus:'Russia Russian Federation 俄罗斯 俄羅斯',
  kor:'South Korea Republic of Korea 韩国 韓國',
  prk:'North Korea DPRK 朝鲜 朝鮮',
  deu:'Germany Deutschland 德国 德國',
  cze:'Czechia Czech Republic 捷克',
  tur:'Turkey Türkiye 土耳其',
  civ:"Ivory Coast Cote d'Ivoire Côte d’Ivoire 象牙海岸 科特迪瓦",
  swz:'Eswatini Swaziland 斯威士兰 史瓦帝尼',
  cod:'Democratic Republic of the Congo DR Congo DRC 刚果民主共和国 剛果民主共和國',
  cog:'Republic of the Congo Congo Brazzaville 刚果共和国 剛果共和國',
  sgp:'Singapore 新加坡 星加坡 狮城 獅城',
  mdv:'Maldives 马尔代夫 馬爾代夫 馬爾地夫'
};
const normalize=text=>String(text??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[’'`.-]/g,' ').replace(/\s+/g,' ').trim();
const searchIndex=new Map(countryPlaces.map(place=>{
  const aliases=`${countrySearchAliases(place.id)} ${EXTRA_ALIASES[place.id]||''}`;
  const text=normalize(`${place.id} ${place.name} ${toTraditional(place.name)} ${place.english} ${aliases} ${toTraditional(aliases)}`);
  return [place.id,{text,tokens:text.split(/\s+/),exact:[place.id,place.name,toTraditional(place.name),place.english].map(normalize).concat(normalize(`${aliases} ${toTraditional(aliases)}`).split(/\s+/).filter(Boolean))}];
}));

export function countryMatchesQuery(place,query=''){
  const needle=normalize(query);
  if(!needle)return true;
  const entry=searchIndex.get(place?.id);
  if(!entry)return false;
  // Short Latin queries are commonly ISO codes or prefixes, rather than an
  // arbitrary middle fragment such as "us" in "Australia" or "Russia".
  if(/^[a-z0-9]{1,3}$/.test(needle))return entry.tokens.some(token=>token.startsWith(needle));
  return needle.split(/\s+/).every(token=>entry.text.includes(token));
}

export function searchCountryPlaces(query='',{region,limit=Infinity}={}){
  const needle=normalize(query);
  const priority=place=>region?.kind==='country'?(place.id===region.id?0:1):region?.kind==='continent'?(place.continent===region.id?0:1):0;
  const exact=place=>searchIndex.get(place.id).exact.includes(needle)?0:1;
  const result=countryPlaces.filter(place=>countryMatchesQuery(place,query)).map((place,index)=>({place,index})).sort((a,b)=>priority(a.place)-priority(b.place)||exact(a.place)-exact(b.place)||a.index-b.index).map(entry=>entry.place);
  return result.slice(0,Number.isFinite(limit)?Math.max(0,Math.trunc(limit)):undefined);
}
