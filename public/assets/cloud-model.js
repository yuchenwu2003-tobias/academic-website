// Shared persistence is record based. Browser preferences deliberately stay local.
export const CLOUD_KEYS={travel:'tobias.travel-map.v1',trips:'tobias.travel-trips.v1',academic:'tobias.academic-map.v1'};
export const CLOUD_COLLECTIONS=['pins','hidden','trips','groups'];
export const CLOUD_META_KEY='tobias.cloud-sync.meta.v1';
export const CLOUD_CHANGE_PREFIX='tobias.cloud-sync.change.v1.';
export const CLOUD_REQUEST_PREFIX='tobias.cloud-sync.request.v1.';
export const CLOUD_BACKUP_PREFIX='tobias.cloud-sync.backup.v1.';
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
export const recordKey=record=>`${record.collection}:${record.id}`;
export function equalJSON(a,b){
  if(a===b)return true;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>equalJSON(value,b[index]));
  return isObject(a)&&isObject(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>own(b,key)&&equalJSON(a[key],b[key]));
}
export function mergePatch(target,patch){
  if(!isObject(patch))return copy(patch);
  const result=isObject(target)?copy(target):{};
  for(const [key,value] of Object.entries(patch)){
    if(['__proto__','constructor','prototype'].includes(key))continue;
    if(value===null)delete result[key];else result[key]=mergePatch(result[key],value);
  }
  return result;
}
export function fieldPatch(before,after){
  const patch={};
  for(const key of new Set([...Object.keys(before||{}),...Object.keys(after||{})])){
    if(['__proto__','constructor','prototype'].includes(key))continue;
    if(!own(after,key))patch[key]=null;
    else if(!equalJSON(before?.[key],after[key]))patch[key]=copy(after[key]);
  }
  return patch;
}
export function parseLocalRecord(key,serialized){
  const value=serialized===null||serialized===undefined?null:JSON.parse(serialized);
  let collections;
  if(key===CLOUD_KEYS.travel){
    if(value!==null&&(!isObject(value)||!Array.isArray(value.pins)||!Array.isArray(value.hidden)))throw new Error('Invalid travel cache');
    collections={pins:value?.pins||[],hidden:(value?.hidden||[]).map(id=>({id}))};
  }else if(key===CLOUD_KEYS.trips){if(value!==null&&!Array.isArray(value))throw new Error('Invalid trip cache');collections={trips:value||[]};}
  else if(key===CLOUD_KEYS.academic){
    if(value!==null&&(!isObject(value)||value.type!=='academic-map'||value.version!==1||!Array.isArray(value.groups)))throw new Error('Invalid academic cache');
    collections={groups:value?.groups||[]};
  }else throw new Error('Unsupported cloud record');
  const records=[];
  for(const [collection,items] of Object.entries(collections)){
    const ids=new Set();
    for(const item of items){
      if(!isObject(item)||typeof item.id!=='string'||!/^[-\w]{1,100}$/.test(item.id)||ids.has(item.id))throw new Error('Invalid local record identity');
      ids.add(item.id);records.push({collection,id:item.id,value:copy(item),deleted:false,version:0});
    }
  }
  return records;
}
export function localRecords(values){return Object.values(CLOUD_KEYS).flatMap(key=>parseLocalRecord(key,values[key]??null));}
export function recordsToLocal(records){
  const active=records.filter(record=>!record.deleted);
  return {
    [CLOUD_KEYS.travel]:JSON.stringify({pins:active.filter(record=>record.collection==='pins').map(record=>copy(record.value)),hidden:active.filter(record=>record.collection==='hidden').map(record=>record.id)}),
    [CLOUD_KEYS.trips]:JSON.stringify(active.filter(record=>record.collection==='trips').map(record=>copy(record.value))),
    [CLOUD_KEYS.academic]:JSON.stringify({type:'academic-map',version:1,groups:active.filter(record=>record.collection==='groups').map(record=>copy(record.value))})
  };
}
export function validateSnapshot(snapshot){
  if(snapshot?.schema!==1||typeof snapshot?.user?.id!=='string'||!snapshot.user.id||!Array.isArray(snapshot.records))throw new Error('Invalid cloud response');
  const ids=new Set();
  for(const record of snapshot.records){
    if(!CLOUD_COLLECTIONS.includes(record?.collection)||typeof record.id!=='string'||!/^[-\w]{1,100}$/.test(record.id)||typeof record.deleted!=='boolean'||!Number.isSafeInteger(record.version)||record.version<0||(!record.deleted&&(!isObject(record.value)||record.value.id!==record.id))||ids.has(recordKey(record)))throw new Error('Invalid cloud record');
    ids.add(recordKey(record));
  }
  return copy(snapshot);
}
export function validateMetadata(value){
  if(value?.schema!==1||typeof value.accountId!=='string'||!value.accountId||!Array.isArray(value.confirmed))throw new Error('Invalid sync metadata');
  validateSnapshot({schema:1,user:{id:value.accountId},records:value.confirmed});
  return value;
}
export function diffRecords(before,after){
  const previous=new Map(before.filter(record=>!record.deleted).map(record=>[recordKey(record),record]));
  const next=new Map(after.filter(record=>!record.deleted).map(record=>[recordKey(record),record]));
  const operations=[];
  for(const [key,record] of previous)if(!next.has(key))operations.push({collection:record.collection,id:record.id,kind:'delete'});
  for(const [key,record] of next){
    const old=previous.get(key);
    if(!old)operations.push({collection:record.collection,id:record.id,kind:'put',value:copy(record.value)});
    else if(!equalJSON(old.value,record.value))operations.push({collection:record.collection,id:record.id,kind:'patch',patch:fieldPatch(old.value,record.value)});
  }
  return operations;
}
export function applyOperations(records,operations){
  const result=new Map(records.map(record=>[recordKey(record),copy(record)]));
  for(const operation of operations){
    const key=recordKey(operation),old=result.get(key);
    if(operation.kind==='delete')result.set(key,{collection:operation.collection,id:operation.id,value:null,deleted:true,version:old?.version||0});
    else if(operation.kind==='put')result.set(key,{collection:operation.collection,id:operation.id,value:copy(operation.value),deleted:false,version:old?.version||0});
    else if(operation.kind==='patch'&&old&&!old.deleted)result.set(key,{...old,value:mergePatch(old.value,operation.patch)});
  }
  return [...result.values()];
}
// An initial device import only fills truly absent records. Tombstones are authoritative.
export function migrationOperations(local,cloud){
  const known=new Set(cloud.map(recordKey));
  return local.filter(record=>!record.deleted&&!known.has(recordKey(record))).map(record=>({collection:record.collection,id:record.id,kind:'put',value:copy(record.value)}));
}
export function reconcileSnapshot(snapshot,changes,accountId=snapshot.user.id){
  if(snapshot.user.id!==accountId)throw new Error('Account changed');
  return applyOperations(snapshot.records,changes.filter(change=>change.ownerId===accountId).flatMap(change=>change.operations));
}
// Request contents remain immutable until acknowledged, including after an ambiguous network failure.
export function createRequest(changes,accountId,requestId,limit=500){
  const operations=[],parts=[];
  for(const change of changes){
    if(change.ownerId!==accountId)continue;
    const count=Math.min(change.operations.length,limit-operations.length);
    if(count){operations.push(...copy(change.operations.slice(0,count)));parts.push({id:change.id,count});}
    if(operations.length>=limit)break;
  }
  return operations.length?{schema:1,accountId,requestId,operations,parts}:null;
}
export function acknowledgeRequest(changes,request){
  const counts=new Map(request.parts.map(part=>[part.id,part.count]));
  return changes.flatMap(change=>{const count=counts.get(change.id)||0;const operations=change.operations.slice(count);return operations.length?[{...change,operations}]:[];});
}
