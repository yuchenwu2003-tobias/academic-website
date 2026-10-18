import {countryById, fitRegion} from './geography.js?v=20261018-wiki-details-final';

const WORLD_OVERVIEW_IDS = new Set(['eiffel','great-wall','fuji','liberty','christ-redeemer','opera-house','penguin','table-mountain','savanna','taj-mahal','cappadocia']);
const WORLD_FOCUS = new Map([
  ['table-mountain',{priority:0,caption:'桌山'}],
  ['taj-mahal',{priority:0,caption:'泰姬陵'}],
  ['cappadocia',{priority:0,caption:'卡帕多奇亚'}],
  ['savanna',{priority:.5,caption:'东非草原'}],
]);

// World-only display choices never change source coordinates or country tiers.
export function landmarkPresentation(items,region,view,viewport={}) {
  if(region?.kind!=='world')return {items,options:{}};
  const width=Number.isFinite(viewport.width)?viewport.width:1000;
  const zoom=Number.isFinite(view?.width)&&view.width>0?1000/view.width:1;
  const overview=zoom<2;
  const baseSize=width>=950?56:width>=600?44:Math.max(24,Math.min(40,width*.09));
  return {
    items:items.map(item=>({...item,...(WORLD_FOCUS.get(item.id)||{} )})),
    options:overview?{iconSize:Math.min(80,baseSize*Math.sqrt(zoom)),showLabels:width>=1100,padding:width<600?2:8}:{}
  };
}

// This selects candidates only. Pixel-level visibility and collisions belong to
// layoutLandmarks(..., {ignoreLevels: true}), so each layer has one tier policy.
export function selectLandmarks(items, region = {kind: 'world'}, view) {
  if (!Array.isArray(items) || !region) return [];
  const width = Number.isFinite(view?.width) && view.width > 0 ? view.width : null;
  if (region.kind === 'country') return items.filter(item => item && (item.country === region.id || item.countries?.includes(region.id)));
  let maximumPriority;
  if (region.kind === 'continent') {
    const initialWidth = fitRegion(region).width;
    const relativeZoom = width && Number.isFinite(initialWidth) ? initialWidth / width : 1;
    maximumPriority = relativeZoom + 1e-10 >= 1.6 ? 3 : 2;
    return items.filter(item => item && countryById.get(item.country)?.continent === region.id && (Number.isFinite(item.priority) ? item.priority : 1) <= maximumPriority);
  }
  if (region.kind !== 'world') return [];
  const zoom = width ? 1000 / width : 1;
  maximumPriority = zoom + 1e-10 >= 5 ? 3 : zoom + 1e-10 >= 2 ? 2 : 1;
  return items.filter(item => item && (zoom<2?WORLD_OVERVIEW_IDS.has(item.id):WORLD_FOCUS.has(item.id)||(Number.isFinite(item.priority) ? item.priority : 1) <= maximumPriority));
}
