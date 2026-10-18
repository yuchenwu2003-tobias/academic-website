import {normalizePin} from './map-model.js?v=20261018-etretat';
import {pinCountry} from './geography.js?v=20261018-etretat';
export const TRIP_STORAGE_KEY='tobias.travel-trips.v1';
let memory;
export const tripName=trip=>`${trip.year} · ${trip.region}`;
export function normalizeTrip(trip){
  if(!trip||typeof trip!=='object'||typeof trip.id!=='string'||!/^[-\w]{1,100}$/.test(trip.id))throw new Error('行程标识无效。');
  if(!Number.isInteger(trip.year)||trip.year<1900||trip.year>9999||typeof trip.region!=='string'||!trip.region.trim()||trip.region.trim().length>80)throw new Error('请填写四位年份和地区名称。');
  if(!Array.isArray(trip.stops)||!trip.stops.length||trip.stops.length>100)throw new Error('每段行程需要 1 至 100 个城市。');
  const stops=trip.stops.map(stop=>{
    if(!stop||typeof stop.pinId!=='string'||!/^[-\w]{1,100}$/.test(stop.pinId)||typeof stop.title!=='string'||!stop.title.trim()||stop.title.length>80)throw new Error('行程城市资料无效。');
    if(!Number.isInteger(stop.rating)||stop.rating<1||stop.rating>5)throw new Error('请为每个城市点击 1 至 5 星评分。');
    return {pinId:stop.pinId,title:stop.title.trim(),rating:stop.rating,...(typeof stop.countryId==='string'&&/^[a-z]{3}$/.test(stop.countryId)?{countryId:stop.countryId}:{})};
  });
  if(new Set(stops.map(stop=>stop.pinId)).size!==stops.length)throw new Error('同一行程中不能重复添加城市。');
  return {id:trip.id,year:trip.year,region:trip.region.trim(),stops};
}
export function normalizeTrips(value){if(!Array.isArray(value)||value.length>200)throw new Error('最多保存 200 段行程。');const trips=value.map(normalizeTrip);if(new Set(trips.map(trip=>trip.id)).size!==trips.length)throw new Error('行程标识不能重复。');return trips;}
export function getTravelTrips(){if(memory)return memory;try{memory=normalizeTrips(JSON.parse(localStorage.getItem(TRIP_STORAGE_KEY)||'[]'));}catch{memory=[];}return memory;}
export function replaceTravelTrips(value){memory=normalizeTrips(value);let saved=true;try{localStorage.setItem(TRIP_STORAGE_KEY,JSON.stringify(memory));}catch{saved=false;}if(typeof window!=='undefined')window.dispatchEvent?.(new Event('travel-trips-change'));return {saved,trips:memory};}
export function mergeTravelTrips(value){const merged=new Map(getTravelTrips().map(trip=>[trip.id,trip]));normalizeTrips(value).forEach(trip=>merged.set(trip.id,trip));return replaceTravelTrips([...merged.values()]);}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===TRIP_STORAGE_KEY||event.key===null)memory=undefined;});
export function tripsForPin(pin,pins=[]){
  if(!pin)return [];
  const country=pin.kind==='country'?pin.countryId:null;
  return getTravelTrips().filter(trip=>trip.stops.some(stop=>{const saved=country?pins.find(place=>place.id===stop.pinId):null;return country?(stop.countryId||(saved?pinCountry(saved):null))===country:stop.pinId===pin.id;})).sort((a,b)=>b.year-a.year||a.region.localeCompare(b.region));
}
export async function commitTravelTrip(draft,{getPins,savePin}){
  // Validate all stops before any city or rating is written.
  const pins=draft.stops.map(stop=>{
    const source=getPins().find(pin=>pin.id===stop.pin?.id)||stop.pin;
    if(!source||source.kind==='country')throw new Error('请选择城市或景点，而不是国家。');
    return normalizePin({...source,status:source.status==='resident'?'resident':'visited',recommendationRating:stop.rating});
  });
  const trip=normalizeTrip({id:draft.id,year:draft.year,region:draft.region,stops:pins.map((pin,index)=>({pinId:pin.id,title:pin.title,rating:draft.stops[index].rating,countryId:pinCountry(pin)}))});
  const existing=getTravelTrips();if(!existing.some(item=>item.id===trip.id)&&existing.length>=200)throw new Error('最多保存 200 段行程。');
  let saved=true;
  for(let index=0;index<pins.length;index++){
    const result=await savePin(pins[index]);if(result===false||result?.error||result?.success===false)throw new Error('城市未能保存，行程尚未保存，请重试。');
    if(result?.saved===false)saved=false;
    if(result?.pin){trip.stops[index].pinId=result.pin.id;trip.stops[index].title=result.pin.title;}
  }
  const result=replaceTravelTrips([...getTravelTrips().filter(item=>item.id!==trip.id),trip]);
  return {saved:saved&&result.saved,trip};
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderTripChips(pin,pins=[]){return tripsForPin(pin,pins).map(trip=>`<span class="place-trip-chip" data-i18n-skip>${esc(tripName(trip))}</span>`).join('');}
