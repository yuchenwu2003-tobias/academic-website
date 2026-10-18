import {LAKES} from './lake-data.js?v=20261018-duration';

const overviewById=new Map(LAKES.map(lake=>[lake.id,lake]));
const entries={medium:{},fine:{}};
const RETRY_DELAY=30000;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validView=view=>view&&[view.x,view.y,view.width,view.height].every(Number.isFinite)&&view.width>0&&view.height>0;
const intersects=(bounds,view)=>bounds.maxX>=view.x&&bounds.minX<=view.x+view.width&&bounds.maxY>=view.y&&bounds.minY<=view.y+view.height;
const validLake=lake=>lake&&typeof lake.id==='string'&&typeof lake.d==='string'&&lake.d.startsWith('M')&&lake.d.endsWith('Z')&&lake.bounds&&['minX','minY','maxX','maxY'].every(key=>Number.isFinite(lake.bounds[key]));
const lakePaths=lakes=>lakes.map(lake=>`<path class="map-lake" data-lake-id="${esc(lake.id)}" data-lake-resolution="${esc(lake.resolution)}" d="${lake.d}" fill-rule="evenodd"><title>${esc(lake.name)}</title></path>`).join('');

function desiredLevel(view,region){return region.kind==='country'||view.width<165?3:region.kind!=='world'||view.width<650?2:1;}
function selectLakes(view,region={kind:'world'}){
  const target=desiredLevel(view,region);
  const medium=entries.medium.value;
  const fine=entries.fine.value;
  const catalog=target>=3?(fine?.lakes||medium?.lakes||LAKES):target>=2?(medium?.lakes||fine?.lakes||LAKES):LAKES;
  return catalog.map(lake=>fine?.byId.get(lake.id)||medium?.byId.get(lake.id)||overviewById.get(lake.id)||lake).filter(lake=>intersects(lake.bounds,view));
}
function load(level){
  const entry=entries[level];
  if(entry.value)return Promise.resolve(entry.value);
  if(entry.promise)return entry.promise;
  if(entry.retryAt>Date.now())return Promise.reject(entry.error);
  const resolution=level==='medium'?'50m':'10m';
  entry.promise=(async()=>{
    const response=await fetch(`assets/lake-detail/${level}.json`);
    if(!response.ok)throw new Error('Water detail unavailable');
    const data=await response.json();
    if(data?.resolution!==resolution||!Array.isArray(data.lakes)||!data.lakes.length||!data.lakes.every(validLake)||new Set(data.lakes.map(lake=>lake.id)).size!==data.lakes.length)throw new Error('Invalid water detail');
    entry.value={...data,byId:new Map(data.lakes.map(lake=>[lake.id,lake]))};
    entry.retryAt=0;
    return entry.value;
  })().catch(error=>{entry.error=error;entry.retryAt=Date.now()+RETRY_DELAY;throw error;}).finally(()=>{entry.promise=null;});
  return entry.promise;
}

// Insert immediately after country polygons and before labels, landmarks and
// personal pins. The overview is synchronous, including all three key waters.
export function renderLakeLayer(view={x:0,y:0,width:1000,height:500}){
  const lakes=validView(view)?selectLakes(view):LAKES;
  return `<g class="map-lakes" data-lakes aria-hidden="true">${lakePaths(lakes)}</g>`;
}

export function mountLakeLayer(root,region={kind:'world'}){
  const layer=root?.querySelector('[data-lakes]');
  let revision=0,timer,stopped=false,signature;
  function draw(view){
    if(stopped||!layer)return;
    const lakes=selectLakes(view,region);
    const next=lakes.map(lake=>`${lake.id}:${lake.resolution}`).join('|');
    if(next===signature)return;
    signature=next;
    layer.innerHTML=lakePaths(lakes);
    layer.dataset.lakeCount=String(lakes.length);
    // Already loaded shorelines are retained across zoom-out; the catalog of
    // visible water bodies still follows the current map scale and viewport.
    layer.dataset.resolution=entries.fine.value?'10m':entries.medium.value?'50m':'110m';
  }
  async function upgrade(view,version){
    const current=()=>!stopped&&version===revision;
    const level=desiredLevel(view,region);
    const requests=level>=3?['medium','fine']:level>=2?['medium']:[];
    await Promise.all(requests.map(async name=>{
      try{await load(name);if(current())draw(view);}catch{/* Keep the already rendered physical-water geometry. */}
    }));
  }
  return {
    refresh(view){
      if(stopped||!layer||!validView(view))return;
      const version=++revision;
      clearTimeout(timer);
      const snapshot={...view};
      draw(snapshot);
      timer=setTimeout(()=>{void upgrade(snapshot,version);},140);
    },
    destroy(){stopped=true;revision++;clearTimeout(timer);}
  };
}
