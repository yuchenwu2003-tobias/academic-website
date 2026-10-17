import {project} from './projection.js';

// Offsets are screen pixels, searched from the geographic point outward. Their
// fixed order makes the greedy layout deterministic across identical renders.
const OFFSETS = [[0, 0]];
for (const radius of [24, 48, 72, 80]) {
  const diagonal = radius / Math.sqrt(2);
  OFFSETS.push(
    [0, -radius], [radius, 0], [-radius, 0], [0, radius],
    [diagonal, -diagonal], [-diagonal, -diagonal],
    [diagonal, diagonal], [-diagonal, diagonal]
  );
}
const PADDING = 8;
const MARGIN = 10;
const expand = box => ({x: box.x - PADDING, y: box.y - PADDING, width: box.width + PADDING * 2, height: box.height + PADDING * 2});
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const validRect = box => box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0;

/**
 * Place image-and-title landmark cards without collisions. `box` is in viewport
 * pixels; x/y/anchorX/anchorY are SVG world units. Images render at x=-size/2,
 * y=0 within translate(x y) scale(scale). Title baseline is size + 12 pixels.
 * Empty or not-yet-measured viewports return an empty layout.
 */
export function layoutLandmarks(items, view, viewport = {}, options = {}) {
  const width = viewport?.width;
  const height = viewport?.height;
  if (!Array.isArray(items) || !view || ![view.x, view.y, view.width, view.height, width, height].every(Number.isFinite) || view.width <= 0 || view.height <= 0 || width <= 0 || height <= 0) return [];
  const renderScale = Math.min(width / view.width, height / view.height);
  if (!Number.isFinite(renderScale) || renderScale <= 0) return [];
  // Equivalent to SVG preserveAspectRatio="xMidYMid meet".
  const letterboxX = (width - view.width * renderScale) / 2;
  const letterboxY = (height - view.height * renderScale) / 2;
  const scale = 1 / renderScale;
  const zoom = 1000 / view.width;
  const iconSize = Number.isFinite(options.iconSize) && options.iconSize > 0 ? options.iconSize : 80;
  const occupied = Array.isArray(options.obstacles) ? options.obstacles.filter(validRect).map(expand) : [];
  const candidates = items.filter(item => item && typeof item === 'object').map((item, index) => ({
    item, index,
    priority: Number.isFinite(item.priority) ? item.priority : 1,
    cell: Number.isFinite(item.cell) ? item.cell : Number.MAX_SAFE_INTEGER
  })).sort((a, b) => a.priority - b.priority || a.cell - b.cell || a.index - b.index);
  const placed = [];
  for (const {item, priority} of candidates) {
    const minimumZoom = priority <= 1 ? 1 : priority === 2 ? 1.9 : 4;
    if (!options.ignoreLevels && zoom + 1e-10 < minimumZoom) continue;
    if (![item.lat, item.lon].every(Number.isFinite) || Math.abs(item.lat) > 90 || Math.abs(item.lon) > 180) continue;
    const anchor = project(item.lat, item.lon);
    const anchorScreenX = letterboxX + (anchor.x - view.x) * renderScale;
    const anchorScreenY = letterboxY + (anchor.y - view.y) * renderScale;
    // Do not pull landmarks from offscreen into the map just to fill space.
    if (anchorScreenX < 0 || anchorScreenX > width || anchorScreenY < 0 || anchorScreenY > height) continue;
    const boxWidth = Math.max(iconSize, String(item.title ?? '').length * 9) + 12;
    const boxHeight = iconSize + 20;
    for (const [dx, dy] of OFFSETS) {
      const centerX = anchorScreenX + dx;
      const topY = anchorScreenY - iconSize / 2 + dy;
      const box = {x: centerX - boxWidth / 2, y: topY, width: boxWidth, height: boxHeight};
      const padded = expand(box);
      if (padded.x < MARGIN || padded.y < MARGIN || padded.x + padded.width > width - MARGIN || padded.y + padded.height > height - MARGIN) continue;
      if (occupied.some(other => overlaps(padded, other))) continue;
      placed.push({
        ...item,
        x: view.x + (centerX - letterboxX) / renderScale,
        y: view.y + (topY - letterboxY) / renderScale,
        scale,
        size: iconSize,
        anchorX: anchor.x,
        anchorY: anchor.y,
        box
      });
      occupied.push(padded);
      break;
    }
  }
  return placed;
}
