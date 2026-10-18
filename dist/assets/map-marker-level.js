import {COUNTRIES,countryAt,fitRegion} from './geography.js?v=20261018-wiki-details-final';
import {unproject} from './projection.js?v=20261018-wiki-details-final';

// Equal Earth widths are shared by world, continent and country routes. A
// country at the viewport centre adjusts the threshold for larger countries.
export function markerLevelForView(view){
  const width=Number(view?.width);
  if(!Number.isFinite(width)||width>=700)return 'world';
  if(width<=180)return 'country';
  if(width>450)return 'continent';
  const point=unproject(view.x+width/2,view.y+view.height/2);
  const country=point&&countryAt(point.lat,point.lon);
  const countryWidth=country?fitRegion({kind:'country',...country}).width:0;
  if(width<=Math.min(450,Math.max(180,countryWidth*1.08)))return 'country';
  // Near the poles a fitted country's visual centre may lie in a neighbour.
  // Recognize a large country contained in the viewport independently of route.
  const largeCountry=COUNTRIES.some(country=>{
    const bounds=country.focusBounds||country.bounds;
    const fit=fitRegion({kind:'country',...country});
    return width<=fit.width*1.08&&bounds.minX>=view.x&&bounds.maxX<=view.x+width&&bounds.minY>=view.y&&bounds.maxY<=view.y+view.height;
  });
  return largeCountry?'country':'continent';
}
export const markerLevelDescription=level=>level==='country'?'当前尺度：国家 · 显示全部城市':level==='continent'?'当前尺度：大洲 · 显示四星、五星城市':'当前尺度：世界 · 显示五星城市';
