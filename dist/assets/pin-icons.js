// Drawings live inside the existing .marker-visual wrapper. Its transform keeps
// the point (0, 0) fixed while the shared 58%-to-100% hover/focus animation runs.
const CITY_DRAWING = '<circle cy="-12" r="16" class="marker-halo"/><path class="marker-shape" d="M0 0C-3-5-10-10-10-17a10 10 0 0 1 20 0C10-10 3-5 0 0Z"/><circle cy="-17" r="3.2" class="marker-center"/>';

const COUNTRY_DRAWING = '<circle cx="6" cy="-15" r="20" class="marker-halo"/><rect class="marker-shape marker-country-pole" x="-1.1" y="-30" width="2.2" height="30" rx="1.1"/><path class="marker-shape marker-country-flag" d="M1-29c6-3 12 3 18 0v14c-6 3-12-3-18 0Z"/><g class="marker-center marker-country-detail"><path fill-rule="evenodd" d="M10-26a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"/><path d="M9.5-25.4h1v6.8h-1ZM6.6-22.5h6.8v1H6.6Z"/></g>';

const RESIDENT_DRAWING='<circle r="20" class="marker-halo"/><path class="marker-shape marker-resident-star" d="m0-14 4.1 9.5 9.9.2-8 7.6 2.7 9.7L0 7.3-8.7 13-6 3.3l-8-7.6 9.9-.2Z"/>';
export function renderPinDrawing(kind = 'city',status = 'want') {
  if(['resident','want-resident'].includes(status))return RESIDENT_DRAWING;
  return kind === 'country' ? COUNTRY_DRAWING : CITY_DRAWING;
}
