import {project} from './projection.js?v=20261018-mont-saint-michel';

const PADDING = 8;
const MARGIN = 10;
const expand = (box,padding=PADDING) => ({x: box.x - padding, y: box.y - padding, width: box.width + padding * 2, height: box.height + padding * 2});
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const validRect = box => box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0;

/**
 * Keep every landmark's bottom-center fixed to its projected geographic point.
 * `box` is in viewport pixels; x/y/anchorX/anchorY are SVG world units. Images
 * render inside the local 80px frame at x=-size/2, y=0, bottom-aligned at size.
 * The exact location is local (anchorLocalX, anchorLocalY) = (0, size); a small
 * point can mark it. Title baseline is size + 12 pixels. Colliding or clipped
 * cards are hidden rather than moved away from their real coordinates.
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
  const padding=Number.isFinite(options.padding)&&options.padding>=0?options.padding:PADDING;
  const showLabel=options.showLabels!==false;
  const occupied = Array.isArray(options.obstacles) ? options.obstacles.filter(validRect).map(box=>expand(box,padding)) : [];
  const candidates = items.filter(item => item && typeof item === 'object').map((item, index) => ({
    item, index,
    priority: Number.isFinite(item.priority) ? item.priority : 1,
    cell: Number.isFinite(item.cell) ? item.cell : Number.MAX_SAFE_INTEGER
  })).sort((a, b) => a.priority - b.priority || a.cell - b.cell || a.index - b.index);
  const placed = [];
  for (const {item, priority} of candidates) {
    const size=Number.isFinite(item.iconSize)&&item.iconSize>0?Math.min(iconSize,item.iconSize):iconSize;
    const minimumZoom = priority <= 1 ? 1 : priority === 2 ? 1.9 : 4;
    if (!options.ignoreLevels && zoom + 1e-10 < minimumZoom) continue;
    if (![item.lat, item.lon].every(Number.isFinite) || Math.abs(item.lat) > 90 || Math.abs(item.lon) > 180) continue;
    const anchor = project(item.lat, item.lon);
    const anchorScreenX = letterboxX + (anchor.x - view.x) * renderScale;
    const anchorScreenY = letterboxY + (anchor.y - view.y) * renderScale;
    // Do not pull landmarks from offscreen into the map just to fill space.
    if (anchorScreenX < 0 || anchorScreenX > width || anchorScreenY < 0 || anchorScreenY > height) continue;
    const boxWidth = Math.max(size, showLabel?String(item.caption ?? item.title ?? '').length * 9:0) + (showLabel?12:0);
    const boxHeight = size + (showLabel?20:6);
    const box = {x: anchorScreenX - boxWidth / 2, y: anchorScreenY - size, width: boxWidth, height: boxHeight};
    const padded = expand(box,padding);
    if (padded.x < MARGIN || padded.y < MARGIN || padded.x + padded.width > width - MARGIN || padded.y + padded.height > height - MARGIN) continue;
    if (occupied.some(other => overlaps(padded, other))) continue;
    placed.push({
      ...item,
      x: anchor.x,
      y: anchor.y - size * scale,
      scale,
      size,
      showLabel,
      anchorX: anchor.x,
      anchorY: anchor.y,
      anchorLocalX: 0,
      anchorLocalY: size,
      box
    });
    occupied.push(padded);
  }
  return placed;
}
