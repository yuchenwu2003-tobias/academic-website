import {renderPinDrawing} from './pin-icons.js?v=20261018-ratings-final';
import {renderMapDisclaimer} from './map-disclaimer.js?v=20261018-ratings-final';
import {COUNTRIES,CONTINENTS} from './geography-data.js?v=20261018-ratings-final';
import {unproject as unprojectEqualEarth,project as projectEqualEarth} from './projection.js?v=20261018-ratings-final';

const RAD=Math.PI/180,DEG=180/Math.PI;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const wrap=longitude=>((longitude+180)%360+360)%360-180;
const validPoint=point=>point&&Number.isFinite(point.lat)&&Number.isFinite(point.lon)&&Math.abs(point.lat)<=90&&Math.abs(point.lon)<=180;
const smoothstep=(low,high,value)=>{const t=clamp((value-low)/(high-low),0,1);return t*t*(3-2*t);};

// Unit-radius orthographic projection. x points right, y points down; depth > 0
// is the visible hemisphere. camera is {lat,lon}; callers apply screen scale.
export function projectGlobe(point,camera={lat:0,lon:0}) {
  if(!validPoint(point)||!validPoint(camera))return null;
  const lat=point.lat*RAD,center=camera.lat*RAD,delta=(point.lon-camera.lon)*RAD;
  const depth=Math.sin(center)*Math.sin(lat)+Math.cos(center)*Math.cos(lat)*Math.cos(delta);
  return {x:Math.cos(lat)*Math.sin(delta),y:Math.sin(center)*Math.cos(lat)*Math.cos(delta)-Math.cos(center)*Math.sin(lat),depth,visible:depth>1e-8};
}

// Inverse uses the same unit-radius x/right,y/down coordinates. Outside the
// sphere returns null rather than inventing a coordinate behind the globe.
export function unprojectGlobe(point,camera={lat:0,lon:0}) {
  if(!point||![point.x,point.y].every(Number.isFinite)||!validPoint(camera))return null;
  const squared=point.x*point.x+point.y*point.y;if(squared>1+1e-10)return null;
  const north=-point.y,depth=Math.sqrt(Math.max(0,1-squared));
  const lat=camera.lat*RAD,lon=camera.lon*RAD;
  const up=north*Math.cos(lat)+depth*Math.sin(lat);
  const forward=depth*Math.cos(lat)-north*Math.sin(lat);
  return {lat:Math.asin(clamp(up,-1,1))*DEG,lon:wrap((lon+Math.atan2(point.x,forward))*DEG)};
}

// NOAA Global Monitoring Laboratory, General Solar Position Calculations:
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
// UTC solar noon is 720 - 4*longitude - equationOfTime (minutes).
export function subsolarPoint(date=new Date()) {
  const now=date instanceof Date?date:new Date(date);if(!Number.isFinite(now.getTime()))return null;
  const year=now.getUTCFullYear(),start=Date.UTC(year,0,1);
  const day=Math.floor((Date.UTC(year,now.getUTCMonth(),now.getUTCDate())-start)/86400000)+1;
  const days=(year%4===0&&(year%100!==0||year%400===0))?366:365;
  const hour=now.getUTCHours()+now.getUTCMinutes()/60+now.getUTCSeconds()/3600+now.getUTCMilliseconds()/3600000;
  const gamma=2*Math.PI/days*(day-1+(hour-12)/24);
  const equation=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
  const declination=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
  return {lat:declination*DEG,lon:wrap((720-hour*60-equation)/4)};
}

const geographicTextures=new Map();
const detailedShapes=new Map(),preparedShapes=new Map();
let mediumLoaded=false,geographicRevision=0;
const validShape=shape=>typeof shape?.d==='string'&&/^M[\d.\-,MLZ]+$/.test(shape.d);
function acceptShape(id,shape,level){
  if(!validShape(shape)||(detailedShapes.get(id)?.level||0)>=level)return false;
  detailedShapes.set(id,{d:shape.d,level});preparedShapes.delete(id);return true;
}
function geographicCoordinate(x,y) {
  const point=unprojectEqualEarth(x,y);if(point)return point;
  // The stored overview geometry is rounded to 0.01 map units. A handful of
  // date-line/pole vertices are therefore just outside the analytical outline.
  const pole=projectEqualEarth(90,0).y,safeY=clamp(y,pole,500-pole);
  const latitude=unprojectEqualEarth(500,safeY)?.lat;if(latitude===undefined)return null;
  const edge=projectEqualEarth(latitude,180).x;
  return unprojectEqualEarth(clamp(x,1000-edge,edge),safeY);
}
function preparedCountry(country){
  const source=detailedShapes.get(country.id)?.d||country.polygons;
  const cached=preparedShapes.get(country.id);if(cached?.source===source)return cached.rings;
  const raw=typeof source==='string'?(source.match(/M[^M]+/g)||[]).map(ring=>[...ring.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(match=>[Number(match[1]),Number(match[2])])):source.flat();
  const rings=raw.map(ring=>{
    const points=ring.map(coordinate=>geographicCoordinate(...coordinate)).filter(Boolean);
    // Natural Earth closes the Antarctic mainland along the South Pole. That
    // closing edge must span the atlas, rather than take the shortest seam arc.
    const polar=country.id==='ata'&&points.some(point=>point.lat < -89.9);
    const packed=new Float32Array(points.length*2),vectors=new Float32Array(points.length*3);let previous=null,min=Infinity,max=-Infinity;
    points.forEach((point,index)=>{
      let longitude=point.lon;
      if(!polar&&previous!==null){while(longitude-previous>180)longitude-=360;while(longitude-previous<-180)longitude+=360;}
      previous=longitude;const x=(longitude+180)/360;
      packed[index*2]=x;packed[index*2+1]=(90-point.lat)/180;min=Math.min(min,x);max=Math.max(max,x);
      const latitude=point.lat*RAD,radians=point.lon*RAD,cosine=Math.cos(latitude);
      vectors[index*3]=cosine*Math.cos(radians);vectors[index*3+1]=Math.sin(latitude);vectors[index*3+2]=cosine*Math.sin(radians);
    });return {points:packed,vectors,min,max};
  }).filter(ring=>ring.points.length>=6);
  preparedShapes.set(country.id,{source,rings});return rings;
}
const continentColors=new Map(CONTINENTS.map(continent=>[continent.id,continent.color]));
function flatNightColor(hex){
  const rgb=hex.replace('#','').match(/../g).map(value=>parseInt(value,16));
  const light=rgb[0]*.213+rgb[1]*.715+rgb[2]*.072;
  return '#'+rgb.map(value=>Math.round((light+(value-light)*.67)*.74).toString(16).padStart(2,'0')).join('');
}
export function geographicPalette(dark=false){
  return {ocean:dark?'#21352d':'#e8efeb',grid:dark?'#4d6958':'#ccd9cf',border:dark?flatNightColor('#4f6249'):'#f6f6ed',land:continent=>{const color=continentColors.get(continent)||'#becbad';return dark?flatNightColor(color):color;}};
}
function geographicTexture(document,dark) {
  const cacheKey=`${dark}:${geographicRevision}`;
  if(geographicTextures.has(cacheKey))return geographicTextures.get(cacheKey);
  const width=4096,height=2048,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return null;
  const palette=geographicPalette(dark);
  ctx.fillStyle=palette.ocean;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=palette.grid;ctx.lineWidth=1;ctx.globalAlpha=dark ? .55 : 1;
  ctx.beginPath();
  for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*width;ctx.moveTo(x,0);ctx.lineTo(x,height);}
  for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*height;ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
  ctx.globalAlpha=1;
  for(const country of COUNTRIES){
    ctx.beginPath();
    for(const ring of preparedCountry(country)){
      for(let shift=Math.ceil(-ring.max);shift<=Math.floor(1-ring.min);shift++){
        for(let index=0;index<ring.points.length;index+=2)ctx[index?'lineTo':'moveTo']((ring.points[index]+shift)*width,ring.points[index+1]*height);
        ctx.closePath();
      }
    }
    ctx.fillStyle=palette.land(country.continent);ctx.fill('evenodd');
    // Fine boundary strokes are projected directly onto the final framebuffer.
    // A faint atlas line only supplies context during the fast drag preview.
    ctx.strokeStyle=palette.border;ctx.lineWidth=.4;ctx.stroke();
  }
  const texture={width,height,data:ctx.getImageData(0,0,width,height).data};
  // One theme at a time bounds the CPU texture to 32 MiB rather than retaining
  // two full-size atlases after a theme switch.
  geographicTextures.clear();geographicTextures.set(cacheKey,texture);return texture;
}

export function globeFramebufferSize(width,height,dpr=1,interactive=false){
  const longest=Math.max(1,width,height),density=clamp(Number(dpr)||1,1,2);
  const limit=width<700?2048:4096;
  const sampling=width<700?density*2:Math.max(4,density*2);
  const ratio=interactive?Math.min(720/longest,density):Math.min(limit/longest,sampling);
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),ratio};
}
function clipBoundarySegment(vectors,a,b,fx,fy,fz,output){
  let ax=vectors[a],ay=vectors[a+1],az=vectors[a+2],bx=vectors[b],by=vectors[b+1],bz=vectors[b+2];
  const dot=ax*bx+ay*by+az*bz;
  // Degenerate and antipodal edges have no unique finite shortest arc.
  if(dot < -1+1e-10||(ax-bx)**2+(ay-by)**2+(az-bz)**2<1e-20)return false;
  let da=ax*fx+ay*fy+az*fz,db=bx*fx+by*fy+bz*fz;
  if(Math.abs(da)<1e-9)da=0;if(Math.abs(db)<1e-9)db=0;
  if(da<0&&db<0)return false;
  if(da<0||db<0){
    const t=da/(da-db),hx=ax+(bx-ax)*t,hy=ay+(by-ay)*t,hz=az+(bz-az)*t,norm=Math.hypot(hx,hy,hz);
    if(norm<1e-10)return false;
    if(da<0){ax=hx/norm;ay=hy/norm;az=hz/norm;}else{bx=hx/norm;by=hy/norm;bz=hz/norm;}
  }
  output[0]=ax;output[1]=ay;output[2]=az;output[3]=bx;output[4]=by;output[5]=bz;return true;
}
// Unit-vector great-circle edge clipped against the camera's front hemisphere.
// The renderer uses the allocation-free internal version for every coast edge.
export function clipGlobeSegment(a,b,normal){
  if(!a||!b||!normal||a.length!==3||b.length!==3||normal.length!==3)return null;
  if(![...a,...b,...normal].every(Number.isFinite))return null;
  const output=new Float64Array(6),vectors=new Float64Array([...a,...b]);
  return clipBoundarySegment(vectors,0,3,...normal,output)?[Array.from(output.subarray(0,3)),Array.from(output.subarray(3,6))]:null;
}
function drawGeographicBoundaries(ctx,camera,raster,ratio,dark){
  const latitude=camera.lat*RAD,longitude=camera.lon*RAD,slat=Math.sin(latitude),clat=Math.cos(latitude),slon=Math.sin(longitude),clon=Math.cos(longitude);
  const fx=clat*clon,fy=slat,fz=clat*slon,output=new Float64Array(6);
  const {r,centerX,centerY}=raster;
  ctx.save();ctx.beginPath();ctx.arc(centerX,centerY,r,0,Math.PI*2);ctx.clip();ctx.beginPath();
  for(const country of COUNTRIES)for(const ring of preparedCountry(country)){
    const vectors=ring.vectors;
    for(let next=0,previous=vectors.length-3;next<vectors.length;previous=next,next+=3){
      if(!clipBoundarySegment(vectors,previous,next,fx,fy,fz,output))continue;
      const ax=output[0],ay=output[1],az=output[2],bx=output[3],by=output[4],bz=output[5];
      ctx.moveTo(centerX+r*(-slon*ax+clon*az),centerY-r*(-slat*clon*ax+clat*ay-slat*slon*az));
      ctx.lineTo(centerX+r*(-slon*bx+clon*bz),centerY-r*(-slat*clon*bx+clat*by-slat*slon*bz));
    }
  }
  ctx.strokeStyle=geographicPalette(dark).border;ctx.lineWidth=.72*ratio;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore();
}
function sphereRaster(width,height,ratio,radius){
  const centerX=width/2,centerY=height/2,r=radius*ratio;
  const east=new Float32Array(width),north=new Float32Array(height),front=new Float32Array(width*height),alpha=new Uint8Array(width*height),spans=new Int32Array(height*2);
  for(let x=0;x<width;x++)east[x]=(x+.5-centerX)/r;
  for(let y=0;y<height;y++){
    const n=(centerY-y-.5)/r;north[y]=n;
    const extent=Math.abs(n)<=1?Math.sqrt(1-n*n)*r:0;
    const start=Math.abs(n)<=1?Math.max(0,Math.ceil(centerX-extent-.5)):0,end=Math.abs(n)<=1?Math.min(width,Math.floor(centerX+extent-.5)+1):0;
    spans[y*2]=start;spans[y*2+1]=end;
    for(let x=start;x<end;x++){
      const remaining=Math.max(0,1-east[x]*east[x]-n*n),index=y*width+x;
      front[index]=Math.sqrt(remaining);alpha[index]=Math.round(clamp(remaining*r/1.4,0,1)*255);
    }
  }
  return {east,north,front,alpha,spans,r,centerX,centerY};
}
function sampleTexture(output,dest,texture,u,v,shade,weight,add,bilinear){
  const {width,height,data}=texture;
  if(!bilinear){
    const offset=(Math.min(height-1,Math.max(0,Math.floor(v*height)))*width+((Math.floor(u*width)%width+width)%width))*4;
    for(let channel=0;channel<3;channel++)output[dest+channel]=(add?output[dest+channel]:0)+data[offset+channel]*shade*weight;return;
  }
  const x=u*width-.5,y=clamp(v*height-.5,0,height-1),floorX=Math.floor(x),floorY=Math.floor(y),tx=x-floorX,ty=y-floorY;
  const left=(floorX%width+width)%width,right=(left+1)%width,below=Math.min(height-1,floorY+1);
  const a=(floorY*width+left)*4,b=(floorY*width+right)*4,c=(below*width+left)*4,d=(below*width+right)*4;
  for(let channel=0;channel<3;channel++){
    const upper=data[a+channel]+(data[b+channel]-data[a+channel])*tx,lower=data[c+channel]+(data[d+channel]-data[c+channel])*tx;
    output[dest+channel]=(add?output[dest+channel]:0)+(upper+(lower-upper)*ty)*shade*weight;
  }
}

const bookIcon='<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11.5"/><path d="M14 9C11.5 7.5 9 8 7 9V19C9 18 11.5 18 14 19.5C16.5 18 19 18 21 19V9C19 8 16.5 7.5 14 9ZM14 9V19.5"/></svg>';
export function renderAcademicGlobe() {
  return `<section class="academic-globe" data-academic-globe aria-label="学术地球"><div class="academic-globe-stage" data-globe-stage tabindex="0" role="group" aria-label="可拖动的学术地球"><canvas data-globe-canvas aria-label="球面世界地图"></canvas><div class="academic-globe-markers" data-globe-markers></div><span class="academic-globe-center" aria-hidden="true"></span></div><div class="academic-globe-controls" aria-label="地球操作"><button type="button" data-globe-zoom="in" aria-label="放大地球">＋</button><button type="button" data-globe-zoom="out" aria-label="缩小地球">−</button><button type="button" data-globe-reset aria-label="重置地球视角">↺</button></div><div class="academic-globe-heading"><span class="mono">RESEARCH AROUND THE WORLD</span><span data-globe-geographic>地理地球</span><span data-globe-satellite hidden>昼夜卫星地球</span></div><p class="academic-globe-status" data-globe-status role="status" hidden></p><div class="academic-globe-pick" data-map-hint hidden><span>点击地球，选择研究组所在位置。</span><button type="button" data-map-cancel>取消</button></div><div class="academic-globe-footer"><div><p class="academic-globe-hint">拖动旋转 · 滚轮或双指缩放 · 方向键旋转</p><p class="academic-globe-credit" data-globe-geographic>地理底图：Natural Earth</p><p class="academic-globe-credit" data-globe-satellite hidden><span>NASA 合成影像，非实时天气；昼夜按当前 UTC 时间模拟。</span> <a href="https://svs.gsfc.nasa.gov/2915" target="_blank" rel="noopener noreferrer">Blue Marble</a> · <a href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/" target="_blank" rel="noopener noreferrer">Black Marble</a></p></div>${renderMapDisclaimer()}</div></section>`;
}

function initialCamera(region) {
  if(region?.kind==='continent'&&region.id==='antarctica')return {lat:-75,lon:0};
  if(region?.kind!=='world'){
    let point;if(Array.isArray(region?.center))point=unprojectEqualEarth(...region.center);
    else if(region?.kind==='continent'&&region.view)point=unprojectEqualEarth(region.view.x+region.view.width/2,region.view.y+region.view.height/2);
    else if(Array.isArray(region?.label))point=unprojectEqualEarth(...region.label);
    else if(region?.view)point=unprojectEqualEarth(region.view.x+region.view.width/2,region.view.y+region.view.height/2);
    if(point)return {lat:clamp(point.lat,-80,80),lon:point.lon};
  }
  return {lat:20,lon:15};
}

export function mountAcademicGlobe(root,{region={kind:'world'},onMarkerClick=()=>{},onChoosePoint=()=>{},isAdding=()=>false,announce=()=>{}}={}) {
  const host=root?.matches?.('[data-academic-globe]')?root:root?.querySelector('[data-academic-globe]');
  const noop={setGroups(){},setMode(){},focus(){},destroy(){}};if(!host)return noop;
  const document=host.ownerDocument,window=document.defaultView,stage=host.querySelector('[data-globe-stage]');
  const canvas=host.querySelector('[data-globe-canvas]'),ctx=canvas.getContext('2d'),overlay=host.querySelector('[data-globe-markers]');
  const status=host.querySelector('[data-globe-status]');if(!ctx){status.hidden=false;status.textContent='当前浏览器无法绘制地球。仍可使用平面地图。';return noop;}
  let stopped=false,mode='geographic',camera=initialCamera(region),zoom=1,width=0,height=0;
  let frame=0,settleTimer=0,requestedLow=false,groups=[],markerElements=[],textures=null,textureFailure=false;
  let detailTimer=0,detailBusy=false,mediumFailed=false;
  let currentSun=subsolarPoint(),gestureMoved=false,previousMid=null,previousDistance=0,clickStart=null,lastAdding=null;
  const pointers=new Map(),removers=[],pendingImages=new Set(),detailControllers=new Set(),failedFine=new Set(),rasterCache=new Map();
  const hidden=()=>Boolean(host.closest('[hidden]'))||document.visibilityState==='hidden';
  const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));};
  const metrics=()=>({cx:width/2,cy:height/2,radius:Math.min(width*.43,height*.43)*zoom});
  const adding=()=>typeof isAdding==='function'?Boolean(isAdding()):Boolean(isAdding);
  function syncAdding(){const value=adding();if(value===lastAdding)return;lastAdding=value;host.classList.toggle('is-adding',value);const hint=host.querySelector('[data-map-hint]');if(hint)hint.hidden=!value;}
  function resize(){const bounds=stage.getBoundingClientRect();if(bounds.width>0&&bounds.height>0){width=bounds.width;height=bounds.height;schedule();}}
  function updateMarkers(){
    const {cx,cy,radius}=metrics();
    markerElements.forEach(({element,point})=>{
      const projected=projectGlobe(point,camera),x=cx+projected.x*radius,y=cy+projected.y*radius;
      element.hidden=!projected.visible||projected.depth<.018||x<-18||x>width+18||y<-18||y>height+18;
      element.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) translate(-50%,-50%)`;
      element.style.zIndex=String(Math.round(projected.depth*100));
    });
  }
  function schedule(low=false){if(stopped||hidden())return;requestedLow=low;if(!frame)frame=window.requestAnimationFrame(()=>{frame=0;render(requestedLow);});}
  function interaction(){window.clearTimeout(detailTimer);schedule(true);window.clearTimeout(settleTimer);settleTimer=window.setTimeout(()=>schedule(false),160);}
  async function readDetail(path){
    const controller=new AbortController();detailControllers.add(controller);
    try{const response=await window.fetch(new URL(path,import.meta.url).href,{signal:controller.signal});if(!response.ok)throw new Error('globe-detail');return await response.json();}
    finally{detailControllers.delete(controller);}
  }
  function queueDetail(){
    if(detailBusy||mode!=='geographic'||stopped||hidden())return;
    window.clearTimeout(detailTimer);detailTimer=window.setTimeout(()=>{void improveDetail();},240);
  }
  async function improveDetail(){
    if(detailBusy||mode!=='geographic'||stopped||hidden())return;detailBusy=true;let changed=false;
    try{
      if(!mediumLoaded&&!mediumFailed){
        try{
          const data=await readDetail('./geography-detail/medium.json');if(stopped)return;
          if(data?.resolution!=='50m'||!data.countries)throw new Error('globe-detail');
          for(const country of COUNTRIES)changed=acceptShape(country.id,data.countries[country.id],2)||changed;
          mediumLoaded=true;
        }catch(error){if(error.name!=='AbortError')mediumFailed=true;}
      }
      if(stopped||hidden()||mode!=='geographic')return;
      if(zoom>=1.6||region.kind==='country'){
        const candidates=COUNTRIES.map(country=>({country,point:unprojectEqualEarth(...country.center)})).filter(item=>item.point).map(item=>({...item,p:projectGlobe(item.point,camera)})).filter(item=>item.p.visible&&item.p.depth>.35).sort((a,b)=>{
          if(a.country.id===region.id)return -1;if(b.country.id===region.id)return 1;return b.p.depth-a.p.depth;
        }).slice(0,8).filter(item=>!failedFine.has(item.country.id)&&(detailedShapes.get(item.country.id)?.level||0)<3);
        let cursor=0;
        async function worker(){
          while(!stopped&&cursor<candidates.length){
            const country=candidates[cursor++].country;
            try{const data=await readDetail(`./geography-detail/fine/${country.id}.json`);if(stopped)return;if(data?.resolution==='10m'&&data.id===country.id)changed=acceptShape(country.id,data,3)||changed;}
            catch(error){if(error.name!=='AbortError')failedFine.add(country.id);}
          }
        }
        await Promise.all([worker(),worker()]);
      }
    }finally{
      detailBusy=false;
      if(changed){geographicRevision++;geographicTextures.clear();if(!stopped)schedule();}
    }
  }
  function render(low){
    if(stopped||hidden()||!width||!height)return;
    const framebuffer=globeFramebufferSize(width,height,window.devicePixelRatio||1,low);
    const {width:renderWidth,height:renderHeight,ratio}=framebuffer;
    if(canvas.width!==renderWidth)canvas.width=renderWidth;if(canvas.height!==renderHeight)canvas.height=renderHeight;
    const {radius}=metrics(),rasterKey=`${renderWidth}:${renderHeight}:${radius.toFixed(4)}`;
    let cache=rasterCache.get(Boolean(low));
    if(cache?.key!==rasterKey){cache={key:rasterKey,raster:sphereRaster(renderWidth,renderHeight,ratio,radius),image:ctx.createImageData(renderWidth,renderHeight)};rasterCache.set(Boolean(low),cache);}
    const image=cache.image,output=image.data,raster=cache.raster;
    const dark=document.documentElement.dataset.theme==='dark';
    const satellite=mode==='satellite'&&textures;
    const day=satellite?textures.day:geographicTexture(document,dark),night=satellite?textures.night:null;if(!day)return;
    const lat=camera.lat*RAD,lon=camera.lon*RAD,slat=Math.sin(lat),clat=Math.cos(lat),slon=Math.sin(lon),clon=Math.cos(lon);
    const sunlight=currentSun||{lat:0,lon:0},sunLat=sunlight.lat*RAD,sunLon=sunlight.lon*RAD;
    const sunX=Math.cos(sunLat)*Math.cos(sunLon),sunY=Math.sin(sunLat),sunZ=Math.cos(sunLat)*Math.sin(sunLon);
    const {r,centerX,centerY,east:eastValues,north:northValues,front:frontValues,alpha,spans}=raster;
    for(let py=0;py<renderHeight;py++){
      const north=northValues[py];
      for(let px=spans[py*2];px<spans[py*2+1];px++){
        const index=py*renderWidth+px,east=eastValues[px],front=frontValues[index],forward=front*clat-north*slat;
        const nx=forward*clon-east*slon,ny=front*slat+north*clat,nz=forward*slon+east*clon;
        const u=(Math.atan2(nz,nx)/Math.PI+1)/2,v=.5-Math.asin(clamp(ny,-1,1))/Math.PI;
        const dest=index*4;
        const shade=satellite ? .83+.17*front : 1;
        if(night){
          const light=smoothstep(-.12,.12,nx*sunX+ny*sunY+nz*sunZ);
          if(light>0)sampleTexture(output,dest,day,u,v,shade,light,false,!low);
          if(light<1)sampleTexture(output,dest,night,u,v,shade*.85,1-light,light>0,!low);
        }else sampleTexture(output,dest,day,u,v,shade,1,false,!low);
        output[dest+3]=alpha[index];
      }
    }
    ctx.putImageData(image,0,0);
    if(!low&&!satellite)drawGeographicBoundaries(ctx,camera,raster,ratio,dark);
    ctx.beginPath();ctx.arc(centerX,centerY,r,0,Math.PI*2);ctx.strokeStyle=dark?'#8dbbc640':'#547e8b45';ctx.lineWidth=1;ctx.stroke();
    updateMarkers();syncAdding();if(!low)queueDetail();
  }
  function loadTexture(path){return new Promise((resolve,reject)=>{
    const image=new window.Image();pendingImages.add(image);image.decoding='async';
    image.onload=()=>{pendingImages.delete(image);if(stopped){resolve(null);return;}
      try{
        const screenWidth=stage.getBoundingClientRect().width||width||window.innerWidth||1000;
        const textureLimit=screenWidth>=700?8192:clamp(Math.ceil(screenWidth*6/1024)*1024,2048,4096);
        const temporary=document.createElement('canvas'),scale=Math.min(1,textureLimit/image.naturalWidth);
        temporary.width=Math.max(1,Math.round(image.naturalWidth*scale));temporary.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const context=temporary.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,temporary.width,temporary.height);
        resolve({width:temporary.width,height:temporary.height,data:context.getImageData(0,0,temporary.width,temporary.height).data});
      }catch(error){reject(error);}
    };image.onerror=()=>{pendingImages.delete(image);reject(new Error('earth-texture'));};image.src=new URL(path,import.meta.url).href;
  });}
  function updateModeUI(){
    host.dataset.globeMode=mode;
    host.querySelectorAll('[data-globe-geographic]').forEach(element=>element.hidden=mode!=='geographic');
    host.querySelectorAll('[data-globe-satellite]').forEach(element=>element.hidden=mode!=='satellite');
    const text=textureFailure?'暂时无法加载卫星影像，显示地理底图。':'卫星影像加载中…';
    status.hidden=mode!=='satellite'||Boolean(textures);status.textContent=text;
  }
  function ensureTextures(){
    if(textures||textureFailure||host.dataset.textureLoading)return;
    host.dataset.textureLoading='true';
    const highDetail=(stage.getBoundingClientRect().width||width||window.innerWidth)>=700;
    const standard=()=>Promise.all([loadTexture('./earth-day.jpg?v=5400-bmng-200412'),loadTexture('./earth-night.jpg?v=3600-viirs-2012')]);
    const request=highDetail?Promise.all([loadTexture('./earth-day-8k.jpg?v=8192-bmng-200412'),loadTexture('./earth-night-8k.jpg?v=8192-viirs-2016')]).catch(()=>{if(stopped)return [null,null];return standard();}):standard();
    request.then(([day,night])=>{
      if(stopped)return;if(day&&night){textures={day,night};host.dataset.textureResolution=`${day.width}/${night.width}`;}else textureFailure=true;updateModeUI();schedule();
    }).catch(()=>{if(stopped)return;textureFailure=true;updateModeUI();schedule();}).finally(()=>{if(!stopped)delete host.dataset.textureLoading;});
  }
  function setMode(value){if(stopped)return;mode=value==='satellite'?'satellite':'geographic';updateModeUI();resize();if(mode==='satellite')ensureTextures();}
  function setGroups(next){
    if(stopped)return;
    groups=Array.isArray(next)?next.filter(group=>validPoint(group)&&typeof group.id==='string'):[];
    overlay.replaceChildren();markerElements=groups.map(group=>{
      const element=document.createElement('button');element.type='button';element.className='academic-globe-marker'+(group.isResidence?' is-residence'+(group.status==='want-resident'?' is-wanted':''):'');element.dataset.globeGroupId=group.id;element.dataset.i18nSkip='';
      element.setAttribute('aria-label',String(group.name||group.id));element.title=String(group.name||group.id);element.innerHTML=group.isResidence?`<svg viewBox="-20 -20 40 40" aria-hidden="true">${renderPinDrawing('city',group.status)}</svg>`:bookIcon;if(group.isResidence){const label=document.createElement('span');label.className='academic-globe-residence-label';label.textContent=group.name+(group.period?' · '+group.period:'');element.append(label);}
      overlay.append(element);return {element,point:{lat:group.lat,lon:group.lon}};
    });updateMarkers();
  }
  function focus(point){if(stopped||!validPoint(point))return;camera={lat:clamp(point.lat,-89,89),lon:wrap(point.lon)};zoom=Math.max(zoom,1.35);schedule();}
  function reset(){camera=initialCamera(region);zoom=1;schedule();announce('地球视角已重置。');}
  function localPoint(event){const rect=stage.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
  function currentGesture(){const active=[...pointers.values()];if(active.length<2)return {mid:active[0],distance:0};return {mid:{x:(active[0].x+active[1].x)/2,y:(active[0].y+active[1].y)/2},distance:Math.hypot(active[0].x-active[1].x,active[0].y-active[1].y)};}
  function onPointerDown(event){
    if(event.button!==0&&event.pointerType!=='touch'||event.target.closest('button'))return;
    event.preventDefault();stage.focus({preventScroll:true});stage.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,localPoint(event));
    if(pointers.size===1){gestureMoved=false;clickStart=localPoint(event);}else gestureMoved=true;
    const gesture=currentGesture();previousMid=gesture.mid;previousDistance=gesture.distance;host.classList.add('is-dragging');
  }
  function onPointerMove(event){
    if(!pointers.has(event.pointerId))return;event.preventDefault();const point=localPoint(event);pointers.set(event.pointerId,point);
    const gesture=currentGesture();if(!previousMid)return;
    if(clickStart&&Math.hypot(point.x-clickStart.x,point.y-clickStart.y)>5)gestureMoved=true;
    if(pointers.size>=2&&previousDistance>0)zoom=clamp(zoom*gesture.distance/previousDistance,1,4);
    const radius=metrics().radius;camera.lon=wrap(camera.lon-(gesture.mid.x-previousMid.x)/radius*DEG);camera.lat=clamp(camera.lat+(gesture.mid.y-previousMid.y)/radius*DEG,-89,89);
    previousMid=gesture.mid;previousDistance=gesture.distance;interaction();
  }
  function onPointerEnd(event){
    if(!pointers.has(event.pointerId))return;
    const wasSingle=pointers.size===1,point=localPoint(event);pointers.delete(event.pointerId);stage.releasePointerCapture?.(event.pointerId);
    if(!pointers.size){
      host.classList.remove('is-dragging');
      if(event.type==='pointerup'&&wasSingle&&!gestureMoved&&adding()){
        const {cx,cy,radius}=metrics(),chosen=unprojectGlobe({x:(point.x-cx)/radius,y:(point.y-cy)/radius},camera);
        if(chosen)onChoosePoint(chosen);else announce('请在地球表面选择位置。');
      }
      previousMid=null;clickStart=null;window.clearTimeout(settleTimer);schedule(false);
    }else{const gesture=currentGesture();previousMid=gesture.mid;previousDistance=gesture.distance;gestureMoved=true;}
  }
  function onWheel(event){event.preventDefault();zoom=clamp(zoom*Math.exp(-clamp(event.deltaY,-120,120)*.0025),1,4);interaction();}
  function onKey(event){
    if(event.target.closest('button'))return;
    const arrows={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,8],ArrowDown:[0,-8]};
    if(arrows[event.key]){event.preventDefault();camera.lon=wrap(camera.lon+arrows[event.key][0]/zoom);camera.lat=clamp(camera.lat+arrows[event.key][1]/zoom,-89,89);schedule();}
    else if(event.key==='+'||event.key==='='){event.preventDefault();zoom=clamp(zoom*1.25,1,4);schedule();}
    else if(event.key==='-'){event.preventDefault();zoom=clamp(zoom/1.25,1,4);schedule();}
    else if(event.key==='Home'){event.preventDefault();reset();}
    else if((event.key==='Enter'||event.key===' ')&&adding()){event.preventDefault();onChoosePoint({lat:camera.lat,lon:camera.lon});}
  }
  function onClick(event){
    const marker=event.target.closest('[data-globe-group-id]');if(marker){event.stopPropagation();onMarkerClick(marker.dataset.globeGroupId);return;}
    const control=event.target.closest('[data-globe-zoom]');if(control){zoom=clamp(zoom*(control.dataset.globeZoom==='in'?1.35:1/1.35),1,4);schedule();return;}
    if(event.target.closest('[data-globe-reset]'))reset();
  }
  listen(stage,'pointerdown',onPointerDown);listen(stage,'pointermove',onPointerMove);listen(stage,'pointerup',onPointerEnd);listen(stage,'pointercancel',onPointerEnd);
  listen(stage,'wheel',onWheel,{passive:false});listen(stage,'keydown',onKey);listen(host,'click',onClick);
  listen(document,'visibilitychange',()=>{if(!hidden())resize();});
  const resizeObserver=typeof window.ResizeObserver==='function'?new window.ResizeObserver(resize):null;resizeObserver?.observe(stage);if(!resizeObserver)listen(window,'resize',resize);
  const stateObserver=typeof window.MutationObserver==='function'?new window.MutationObserver(mutations=>{
    syncAdding();if(mutations.some(change=>change.attributeName==='hidden'||change.attributeName==='data-theme')){
      if(hidden()){if(frame)window.cancelAnimationFrame(frame);frame=0;window.clearTimeout(settleTimer);window.clearTimeout(detailTimer);}else resize();
    }
  }):null;
  // Observe only ancestors: marker style updates must never trigger redraw loops.
  if(stateObserver){for(let parent=host;parent;parent=parent.parentElement)stateObserver.observe(parent,{attributes:true,attributeFilter:['hidden','class','data-theme']});}
  const minuteTimer=window.setInterval(()=>{currentSun=subsolarPoint();if(mode==='satellite'&&!hidden())schedule();},60000);
  updateModeUI();syncAdding();resize();
  return {setGroups,setMode,focus,destroy(){
    if(stopped)return;stopped=true;window.cancelAnimationFrame(frame);window.clearTimeout(settleTimer);window.clearTimeout(detailTimer);window.clearInterval(minuteTimer);
    resizeObserver?.disconnect();stateObserver?.disconnect();removers.forEach(remove=>remove());
    for(const image of pendingImages){image.onload=null;image.onerror=null;image.removeAttribute('src');}pendingImages.clear();
    detailControllers.forEach(controller=>controller.abort());detailControllers.clear();rasterCache.clear();textures=null;
    pointers.clear();markerElements=[];groups=[];overlay.replaceChildren();host.classList.remove('is-dragging');
  }};
}
