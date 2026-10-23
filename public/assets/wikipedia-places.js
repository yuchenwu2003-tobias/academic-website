// Geographic article titles for illustrated labels and ambiguous place names.
// These are public reference data, never personal saved URLs or notes.
const articleTitles={
  'Maasai Mara Savannah':'Maasai Mara',
  'Antarctic Penguins and Ice':'Cape Royds',
  'Tromso':'Tromsø','Helsingor':'Helsingør',
  'Guilin Landscape':'Guilin','Huangshan Mountains':'Huangshan',
  'Giza Pyramids':'Giza pyramid complex',
  'Dolomites · Tre Cime di Lavaredo':'Dolomites',
  'Yushan · Jade Mountain':'Yu Shan','Yushan':'Yu Shan',
  'Christ the Redeemer':'Christ the Redeemer (statue)',
  'Washington':'Washington, D.C.',
  'Kenting':'Kenting National Park',
  'Dasyueshan':'Dasyueshan National Forest Recreation Area',
};
export const preferredWikipediaTitle=name=>articleTitles[name]||name;
export function wikipediaArticleReference(value){
  try{
    const url=new URL(value),host=url.hostname.match(/^([a-z-]+)(?:\.m)?\.wikipedia\.org$/i);
    if(!host||host[1]==='www'||!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
    const path=url.pathname.match(/^\/(wiki|zh(?:-hans|-hant|-cn|-tw|-hk|-mo|-sg|-my))\/(.+)$/);
    if(!path||(path[1]!=='wiki'&&host[1]!=='zh'))return null;
    const title=decodeURIComponent(path[2]).replaceAll('_',' ').trim();
    if(!title||title.length>500||/[\u0000-\u001f:]/.test(title))return null;
    return {title,language:host[1].toLowerCase()};
  }catch{return null;}
}
export function nearbyWikipediaPage(page,pin,maxKilometers=200){
  if(pin?.kind==='country')return true;
  const coordinate=page?.coordinates?.find(point=>point.globe===undefined||point.globe==='earth');
  if(!coordinate||![coordinate.lat,coordinate.lon,pin?.lat,pin?.lon].every(Number.isFinite))return false;
  const radians=Math.PI/180,lat=(coordinate.lat-pin.lat)*radians,lon=(coordinate.lon-pin.lon)*radians;
  const a=Math.sin(lat/2)**2+Math.cos(pin.lat*radians)*Math.cos(coordinate.lat*radians)*Math.sin(lon/2)**2;
  return 6371.0088*2*Math.asin(Math.min(1,Math.sqrt(a)))<=maxKilometers;
}
