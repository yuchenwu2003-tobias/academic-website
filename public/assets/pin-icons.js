// Drawings live inside the existing .marker-visual wrapper. Its transform keeps
// the point (0, 0) fixed while the shared 58%-to-100% hover/focus animation runs.
const CITY_DRAWING = '<circle cy="-12" r="16" class="marker-halo"/><path class="marker-shape" d="M0 0C-3-5-10-10-10-17a10 10 0 0 1 20 0C10-10 3-5 0 0Z"/><circle cy="-17" r="3.2" class="marker-center"/>';

const COUNTRY_DRAWING = '<circle cx="6" cy="-15" r="20" class="marker-halo"/><rect class="marker-shape marker-country-pole" x="-1.1" y="-30" width="2.2" height="30" rx="1.1"/><path class="marker-shape marker-country-flag" d="M1-29c6-3 12 3 18 0v14c-6 3-12-3-18 0Z"/><g class="marker-center marker-country-detail"><path fill-rule="evenodd" d="M10-26a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"/><path d="M9.5-25.4h1v6.8h-1ZM6.6-22.5h6.8v1H6.6Z"/></g>';

// The star uses the same resting/hover scale as ordinary travel pins.
const RESIDENT_DRAWING='<circle r="20" class="marker-halo"/><path class="marker-shape marker-resident-star" stroke-linejoin="round" d="M-0.8 -12.3 Q0 -14 0.8 -12.3 L3.36 -6.86 Q4 -5.5 5.49 -5.31 L11.45 -4.56 Q13.31 -4.33 11.95 -3.04 L7.56 1.07 Q6.47 2.1 6.75 3.58 L7.88 9.48 Q8.23 11.33 6.58 10.42 L1.32 7.52 Q0 6.8 -1.32 7.52 L-6.58 10.42 Q-8.23 11.33 -7.88 9.48 L-6.75 3.58 Q-6.47 2.1 -7.56 1.07 L-11.95 -3.04 Q-13.31 -4.33 -11.45 -4.56 L-5.49 -5.31 Q-4 -5.5 -3.36 -6.86 Z"/>';
export function renderPinDrawing(kind = 'city',status = 'want') {
  if(['resident','want-resident'].includes(status))return RESIDENT_DRAWING;
  return kind === 'country' ? COUNTRY_DRAWING : CITY_DRAWING;
}
