import {CONTINENTS,COUNTRIES} from './geography-data.js';
import {project} from './projection.js';
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
  const point=project(lat,lon);
  return COUNTRIES.find(country=>point.x>=country.bounds.minX&&point.x<=country.bounds.maxX&&point.y>=country.bounds.minY&&point.y<=country.bounds.maxY&&country.polygons.some(polygon=>pointInRing(point,polygon[0])&&!polygon.slice(1).some(hole=>pointInRing(point,hole))))||null;
}
const pinCache=new Map();
export function pinCountry(pin) {
  const key=`${pin.lat},${pin.lon}`;
  if(!pinCache.has(key)){if(pinCache.size>3000)pinCache.clear();pinCache.set(key,countryAt(pin.lat,pin.lon)?.id||null);}
  return pinCache.get(key);
}
export function pinsInRegion(pins,region) {
  if(!region||region.kind==='world')return pins;
  return pins.filter(pin=>{const id=pinCountry(pin);return region.kind==='country'?id===region.id:countryById.get(id)?.continent===region.id;});
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
