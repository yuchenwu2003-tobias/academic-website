// Equal Earth equations, with a uniform scale (the relative area is preserved).
// Projection: Šavrič, Patterson & Jenny (2018); coefficients also documented by D3 Geo.
const A=1.340264,B=-.081106,C=.000893,D=.003796,M=Math.sqrt(3)/2;
const radians=Math.PI/180,scale=176;
const thetaMax=Math.asin(M);
const ordinate=t=>t*(A+B*t*t+Math.pow(t,6)*(C+D*t*t));
const derivative=t=>A+3*B*t*t+Math.pow(t,6)*(7*C+9*D*t*t);
export function project(lat,lon) {
  const t=Math.asin(M*Math.sin(lat*radians));
  return {x:500+scale*lon*radians*Math.cos(t)/(M*derivative(t)),y:250-scale*ordinate(t)};
}
export function unproject(x,y) {
  const target=(250-y)/scale;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(target)>ordinate(thetaMax)+1e-8)return null;
  let t=Math.max(-thetaMax,Math.min(thetaMax,target/A));
  for(let i=0;i<12;i++){const change=(ordinate(t)-target)/derivative(t);t-=change;if(Math.abs(change)<1e-12)break;}
  const lon=(x-500)/scale*M*derivative(t)/Math.cos(t)/radians;
  if(Math.abs(lon)>180+1e-7)return null;
  return {lat:Math.asin(Math.max(-1,Math.min(1,Math.sin(t)/M)))/radians,lon:Math.max(-180,Math.min(180,lon))};
}
const path=points=>points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join('');
const outline=[];
for(let lat=-90;lat<=90;lat+=2)outline.push(project(lat,-180));
for(let lon=-178;lon<=180;lon+=2)outline.push(project(90,lon));
for(let lat=88;lat>=-90;lat-=2)outline.push(project(lat,180));
for(let lon=178;lon>=-180;lon-=2)outline.push(project(-90,lon));
export const WORLD_OUTLINE=path(outline)+'Z';
const lines=[];
for(let lon=-150;lon<=150;lon+=30){const points=[];for(let lat=-90;lat<=90;lat+=3)points.push(project(lat,lon));lines.push(path(points));}
for(let lat=-60;lat<=60;lat+=30){const points=[];for(let lon=-180;lon<=180;lon+=3)points.push(project(lat,lon));lines.push(path(points));}
export const GRATICULE=lines.join('');
