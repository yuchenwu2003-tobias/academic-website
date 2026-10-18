import {COUNTRIES} from './geography-data.js';
import {unproject as unprojectEqualEarth,project as projectEqualEarth} from './projection.js';

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
function geographicCoordinate(x,y) {
  const point=unprojectEqualEarth(x,y);if(point)return point;
  // The stored overview geometry is rounded to 0.01 map units. A handful of
  // date-line/pole vertices are therefore just outside the analytical outline.
  const pole=projectEqualEarth(90,0).y,safeY=clamp(y,pole,500-pole);
  const latitude=unprojectEqualEarth(500,safeY)?.lat;if(latitude===undefined)return null;
  const edge=projectEqualEarth(latitude,180).x;
  return unprojectEqualEarth(clamp(x,1000-edge,edge),safeY);
}
function geographicTexture(document,dark) {
  if(geographicTextures.has(dark))return geographicTextures.get(dark);
  const width=1536,height=768,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return null;
  ctx.fillStyle=dark?'#1e3542':'#dae8eb';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=dark?'#547172':'#91adb0';ctx.lineWidth=.55;
  ctx.beginPath();
  for(let lon=-180;lon<=180;lon+=30){const x=(lon+180)/360*width;ctx.moveTo(x,0);ctx.lineTo(x,height);}
  for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*height;ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
  for(const country of COUNTRIES){
    for(const polygon of country.polygons){
      const rings=polygon.map(ring=>{
        let previous=null;return ring.map(coordinate=>{
          const point=geographicCoordinate(coordinate[0],coordinate[1]);if(!point)return null;
          let longitude=point.lon;
          if(previous!==null){while(longitude-previous>180)longitude-=360;while(longitude-previous<-180)longitude+=360;}
          previous=longitude;return [(longitude+180)/360*width,(90-point.lat)/180*height];
        }).filter(Boolean);
      }).filter(ring=>ring.length>2);
      if(!rings.length)continue;
      const outerCenter=rings[0].reduce((total,p)=>total+p[0],0)/rings[0].length;
      for(const hole of rings.slice(1)){
        const center=hole.reduce((total,p)=>total+p[0],0)/hole.length;
        const offset=Math.round((outerCenter-center)/width)*width;for(const point of hole)point[0]+=offset;
      }
      const min=Math.min(...rings[0].map(p=>p[0])),max=Math.max(...rings[0].map(p=>p[0]));
      for(let shift=Math.ceil(-max/width);shift<=Math.floor((width-min)/width);shift++){
        ctx.beginPath();
        for(const ring of rings){ring.forEach((p,index)=>ctx[index?'lineTo':'moveTo'](p[0]+shift*width,p[1]));ctx.closePath();}
        ctx.fillStyle=dark?'#7c9587':'#c4cdb2';ctx.fill('evenodd');
        ctx.strokeStyle=dark?'#263e39':'#83947e';ctx.lineWidth=.8;ctx.stroke();
      }
    }
  }
  const texture={width,height,data:ctx.getImageData(0,0,width,height).data};geographicTextures.set(dark,texture);return texture;
}

const bookIcon='<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11.5"/><path d="M14 9C11.5 7.5 9 8 7 9V19C9 18 11.5 18 14 19.5C16.5 18 19 18 21 19V9C19 8 16.5 7.5 14 9ZM14 9V19.5"/></svg>';
export function renderAcademicGlobe() {
  return `<section class="academic-globe" data-academic-globe aria-label="学术地球"><div class="academic-globe-stage" data-globe-stage tabindex="0" role="group" aria-label="可拖动的学术地球"><canvas data-globe-canvas aria-label="球面世界地图"></canvas><div class="academic-globe-markers" data-globe-markers></div><span class="academic-globe-center" aria-hidden="true"></span></div><div class="academic-globe-controls" aria-label="地球操作"><button type="button" data-globe-zoom="in" aria-label="放大地球">＋</button><button type="button" data-globe-zoom="out" aria-label="缩小地球">−</button><button type="button" data-globe-reset aria-label="重置地球视角">↺</button></div><div class="academic-globe-heading"><span class="mono">RESEARCH AROUND THE WORLD</span><span data-globe-geographic>地理地球</span><span data-globe-satellite hidden>昼夜卫星地球</span></div><p class="academic-globe-hint">拖动旋转 · 滚轮或双指缩放 · 方向键旋转</p><p class="academic-globe-status" data-globe-status role="status" hidden></p><div class="academic-globe-pick" data-map-hint hidden><span>点击地球，选择研究组所在位置。</span><button type="button" data-map-cancel>取消</button></div><p class="academic-globe-credit" data-globe-geographic>地理底图：Natural Earth</p><p class="academic-globe-credit" data-globe-satellite hidden><span>NASA 合成影像，非实时天气；昼夜按当前 UTC 时间模拟。</span> <a href="https://svs.gsfc.nasa.gov/2915" target="_blank" rel="noopener noreferrer">Blue Marble</a> · <a href="https://svs.gsfc.nasa.gov/30028" target="_blank" rel="noopener noreferrer">Earth at Night 2012</a></p></section>`;
}

function initialCamera(region) {
  if(region?.kind!=='world'){
    let point;if(Array.isArray(region?.center))point=unprojectEqualEarth(...region.center);
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
  let currentSun=subsolarPoint(),gestureMoved=false,previousMid=null,previousDistance=0,clickStart=null,lastAdding=null;
  const pointers=new Map(),removers=[],pendingImages=new Set();
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
  function interaction(){schedule(true);window.clearTimeout(settleTimer);settleTimer=window.setTimeout(()=>schedule(false),160);}
  function render(low){
    if(stopped||hidden()||!width||!height)return;
    const maxResolution=low?220:Math.min(640,Math.max(500,Math.max(width,height)*Math.min(2,window.devicePixelRatio||1)));
    const ratio=maxResolution/Math.max(width,height);
    const renderWidth=Math.max(1,Math.round(width*ratio)),renderHeight=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==renderWidth)canvas.width=renderWidth;if(canvas.height!==renderHeight)canvas.height=renderHeight;
    const image=ctx.createImageData(renderWidth,renderHeight),output=image.data;
    const dark=document.documentElement.dataset.theme==='dark';
    const geography=geographicTexture(document,dark);if(!geography)return;
    const satellite=mode==='satellite'&&textures;
    const day=satellite?textures.day:geography,night=satellite?textures.night:null;
    const lat=camera.lat*RAD,lon=camera.lon*RAD,slat=Math.sin(lat),clat=Math.cos(lat),slon=Math.sin(lon),clon=Math.cos(lon);
    const sunlight=currentSun||{lat:0,lon:0},sunLat=sunlight.lat*RAD,sunLon=sunlight.lon*RAD;
    const sunX=Math.cos(sunLat)*Math.cos(sunLon),sunY=Math.sin(sunLat),sunZ=Math.cos(sunLat)*Math.sin(sunLon);
    const {cx,cy,radius}=metrics(),r=radius*ratio,centerX=cx*ratio,centerY=cy*ratio;
    for(let py=0;py<renderHeight;py++){
      const north=(centerY-py-.5)/r;
      for(let px=0;px<renderWidth;px++){
        const east=(px+.5-centerX)/r,squared=east*east+north*north;if(squared>1)continue;
        const front=Math.sqrt(1-squared),forward=front*clat-north*slat;
        const nx=forward*clon-east*slon,ny=front*slat+north*clat,nz=forward*slon+east*clon;
        const u=(Math.atan2(nz,nx)/Math.PI+1)/2,v=.5-Math.asin(clamp(ny,-1,1))/Math.PI;
        const sx=Math.min(day.width-1,Math.floor(u*day.width)),sy=Math.min(day.height-1,Math.floor(v*day.height)),source=(sy*day.width+sx)*4,dest=(py*renderWidth+px)*4;
        const shade=.83+.17*front;
        if(night){
          const light=smoothstep(-.12,.12,nx*sunX+ny*sunY+nz*sunZ);
          const nightOffset=(Math.min(night.height-1,Math.floor(v*night.height))*night.width+Math.min(night.width-1,Math.floor(u*night.width)))*4;
          for(let channel=0;channel<3;channel++)output[dest+channel]=(day.data[source+channel]*light+night.data[nightOffset+channel]*(1-light)*.85)*shade;
        }else{for(let channel=0;channel<3;channel++)output[dest+channel]=day.data[source+channel]*shade;}
        output[dest+3]=Math.round(clamp((1-squared)*r/1.4,0,1)*255);
      }
    }
    ctx.putImageData(image,0,0);
    ctx.beginPath();ctx.arc(centerX,centerY,r,0,Math.PI*2);ctx.strokeStyle=dark?'#8dbbc640':'#547e8b45';ctx.lineWidth=1;ctx.stroke();
    updateMarkers();syncAdding();
  }
  function loadTexture(path){return new Promise((resolve,reject)=>{
    const image=new window.Image();pendingImages.add(image);image.decoding='async';
    image.onload=()=>{pendingImages.delete(image);if(stopped){resolve(null);return;}
      try{const temporary=document.createElement('canvas');temporary.width=1536;temporary.height=768;const context=temporary.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,temporary.width,temporary.height);resolve({width:temporary.width,height:temporary.height,data:context.getImageData(0,0,temporary.width,temporary.height).data});}catch(error){reject(error);}
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
    Promise.all([loadTexture('./earth-day.jpg'),loadTexture('./earth-night.jpg')]).then(([day,night])=>{
      if(stopped)return;if(day&&night)textures={day,night};else textureFailure=true;updateModeUI();schedule();
    }).catch(()=>{if(stopped)return;textureFailure=true;updateModeUI();schedule();}).finally(()=>{if(!stopped)delete host.dataset.textureLoading;});
  }
  function setMode(value){if(stopped)return;mode=value==='satellite'?'satellite':'geographic';updateModeUI();if(mode==='satellite')ensureTextures();resize();}
  function setGroups(next){
    if(stopped)return;
    groups=Array.isArray(next)?next.filter(group=>validPoint(group)&&typeof group.id==='string'):[];
    overlay.replaceChildren();markerElements=groups.map(group=>{
      const element=document.createElement('button');element.type='button';element.className='academic-globe-marker';element.dataset.globeGroupId=group.id;element.dataset.i18nSkip='';
      element.setAttribute('aria-label',String(group.name||group.id));element.title=String(group.name||group.id);element.innerHTML=bookIcon;
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
      if(hidden()){if(frame)window.cancelAnimationFrame(frame);frame=0;window.clearTimeout(settleTimer);}else resize();
    }
  }):null;
  // Observe only ancestors: marker style updates must never trigger redraw loops.
  if(stateObserver){for(let parent=host;parent;parent=parent.parentElement)stateObserver.observe(parent,{attributes:true,attributeFilter:['hidden','class','data-theme']});}
  const minuteTimer=window.setInterval(()=>{currentSun=subsolarPoint();if(mode==='satellite'&&!hidden())schedule();},60000);
  updateModeUI();syncAdding();resize();
  return {setGroups,setMode,focus,destroy(){
    if(stopped)return;stopped=true;window.cancelAnimationFrame(frame);window.clearTimeout(settleTimer);window.clearInterval(minuteTimer);
    resizeObserver?.disconnect();stateObserver?.disconnect();removers.forEach(remove=>remove());
    for(const image of pendingImages){image.onload=null;image.onerror=null;image.removeAttribute('src');}pendingImages.clear();
    pointers.clear();markerElements=[];groups=[];overlay.replaceChildren();host.classList.remove('is-dragging');
  }};
}
