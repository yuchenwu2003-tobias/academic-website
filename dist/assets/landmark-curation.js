import {countryById, fitRegion} from './geography.js';

// This selects candidates only. Pixel-level visibility and collisions belong to
// layoutLandmarks(..., {ignoreLevels: true}), so each layer has one tier policy.
export function selectLandmarks(items, region = {kind: 'world'}, view) {
  if (!Array.isArray(items) || !region) return [];
  const width = Number.isFinite(view?.width) && view.width > 0 ? view.width : null;
  if (region.kind === 'country') return items.filter(item => item && item.country === region.id);
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
  return items.filter(item => item && (Number.isFinite(item.priority) ? item.priority : 1) <= maximumPriority);
}
