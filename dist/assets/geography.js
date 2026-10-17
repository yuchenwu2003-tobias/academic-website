import {CONTINENTS,COUNTRIES} from './geography-data.js';
import {project} from './projection.js';
import {DESTINATIONS} from './destination-catalog.js';
export {CONTINENTS,COUNTRIES};
export const continentById=new Map(CONTINENTS.map(item=>[item.id,item]));
export const countryById=new Map(COUNTRIES.map(item=>[item.id,item]));
export function resolveRegion(parts=[]) {
  if(parts.length===0)return {kind:'world',id:'world',name:'世界'};
  if(parts.length===2&&parts[0]==='continent'&&continentById.has(parts[1]))return {kind:'continent',...continentById.get(parts[1])};
  if(parts.length===2&&parts[0]==='country'&&countryById.has(parts[1]))return {kind:'country',...countryById.get(parts[1])};
  return null;
}
export const regionHref=region=>region.kind==='world'?'#/travel':`#/travel/${region.kind}/${region.id}`;
function pointInRing(point,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if(((a[1]>point.y)!==(b[1]>point.y))&&(point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
  }
  return inside;
}
export function countryAt(lat,lon) {
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
  const point=project(lat,lon);
  return COUNTRIES.find(country=>point.x>=country.bounds.minX&&point.x<=country.bounds.maxX&&point.y>=country.bounds.minY&&point.y<=country.bounds.maxY&&country.polygons.some(polygon=>pointInRing(point,polygon[0])&&!polygon.slice(1).some(hole=>pointInRing(point,hole))))||null;
}
const pinCache=new Map();
const destinationById=new Map(DESTINATIONS.map(place=>[place.id,place]));
function destinationCountry(pin) {
  if(typeof pin.id!=='string'||!pin.id.startsWith('destination-')||![pin.lat,pin.lon].every(Number.isFinite)||Math.abs(pin.lat)>90||Math.abs(pin.lon)>180)return null;
  const destination=destinationById.get(pin.id.slice('destination-'.length));
  if(!destination||!continentById.has(destination.continent))return null;
  const radians=Math.PI/180;
  const latDelta=(pin.lat-destination.lat)*radians;
  const lonDelta=(pin.lon-destination.lon)*radians;
  const a=Math.sin(latDelta/2)**2+Math.cos(pin.lat*radians)*Math.cos(destination.lat*radians)*Math.sin(lonDelta/2)**2;
  const meters=6371008.8*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,a))));
  if(meters>150+1e-6)return null;
  // Catalog identity plus a nearby coordinate resolves small islands/coasts that
  // the overview polygons omit. A moved or custom pin still uses containment.
  return countryById.get(destination.country)||{id:destination.country,continent:destination.continent};
}
function pinCountryInfo(pin) {
  if(!pin||typeof pin!=='object')return null;
  const key=`${pin.id||''}|${pin.lat},${pin.lon}`;
  if(!pinCache.has(key)){if(pinCache.size>3000)pinCache.clear();pinCache.set(key,destinationCountry(pin)||countryAt(pin.lat,pin.lon));}
  return pinCache.get(key);
}
export function pinCountry(pin) {return pinCountryInfo(pin)?.id||null;}
export function pinsInRegion(pins,region) {
  if(!region||region.kind==='world')return pins;
  return pins.filter(pin=>{const country=pinCountryInfo(pin);return region.kind==='country'?country?.id===region.id:country?.continent===region.id;});
}
export function fitRegion(region) {
  if(!region||region.kind==='world')return {x:0,y:0,width:1000,height:500};
  if(region.kind==='continent')return {...region.view};
  const b=region.focusBounds||region.bounds;
  const width=Math.min(1000,Math.max(30,(b.maxX-b.minX)*1.35,(b.maxY-b.minY)*2.7));
  const height=width/2;
  return {x:Math.max(0,Math.min(1000-width,(b.minX+b.maxX-width)/2)),y:Math.max(0,Math.min(500-height,(b.minY+b.maxY-height)/2)),width,height};
}
export function zoomView(view,factor,anchor={x:view.x+view.width/2,y:view.y+view.height/2}) {
  const width=Math.max(8,Math.min(1000,view.width*factor)),height=width/2,ratio=width/view.width;
  return {x:Math.max(0,Math.min(1000-width,anchor.x-(anchor.x-view.x)*ratio)),y:Math.max(0,Math.min(500-height,anchor.y-(anchor.y-view.y)*ratio)),width,height};
}
