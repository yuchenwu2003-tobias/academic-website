import {CLOUD_KEYS,CLOUD_META_KEY,CLOUD_CHANGE_PREFIX,CLOUD_REQUEST_PREFIX,CLOUD_BACKUP_PREFIX,parseLocalRecord,localRecords,recordsToLocal,diffRecords,applyOperations,migrationOperations,reconcileSnapshot,validateSnapshot,validateMetadata,createRequest,acknowledgeRequest} from './cloud-model.js?v=20261023-cloud-palette';

const TEXT={
  'zh-CN':{checking:'正在连接云端',syncing:'正在同步',synced:'已同步云端',offline:'离线，等待同步',pending:'有云端更新，结束编辑后同步',login:'请登录后同步',error:'同步失败，点击重试',account:'账号已更换，请结束编辑后重试',recovery:'本地记录已保留，请重试同步'},
  'zh-TW':{checking:'正在連接雲端',syncing:'正在同步',synced:'已同步雲端',offline:'離線，等待同步',pending:'有雲端更新，結束編輯後同步',login:'請登入後同步',error:'同步失敗，點擊重試',account:'帳號已更換，請結束編輯後重試',recovery:'本機記錄已保留，請重試同步'},
  en:{checking:'Connecting to cloud',syncing:'Syncing',synced:'Saved to cloud',offline:'Offline · waiting to sync',pending:'Cloud updates ready · finish editing to sync',login:'Sign in to sync',error:'Sync failed · tap to retry',account:'Account changed · finish editing and retry',recovery:'Local records preserved · retry sync'}
};
const LOCK_KEY='tobias.cloud-sync.lock.v1';
const KEYS=Object.values(CLOUD_KEYS);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function uniqueId(){return globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}
const json=value=>JSON.stringify(value);

// Environment injection keeps migration and failure handling testable without a browser.
export function createCloudClient(environment={}){
  const storage=environment.storage||globalThis.localStorage;
  const fetcher=environment.fetch||globalThis.fetch?.bind(globalThis);
  const win=environment.window||globalThis.window;
  const doc=environment.document||globalThis.document;
  const locks=environment.locks??globalThis.navigator?.locks;
  const now=environment.now||Date.now;
  const uid=environment.uniqueId||uniqueId;
  const clientId=uid();
  let state={status:'checking',pending:0,updatedAt:null,accountId:null},viewValues={},verifiedOwner=null,initialized=false,disposed=false,running=null,retryTimer,pollTimer,editTimer,statusButton,failures=0,pendingApply=false,accountBlocked=false;
  const dirtyForms=new Set();let lastInteraction=0;
  const listeners=[];
  const emit=()=>{renderStatus();if(win?.dispatchEvent){const event=new (win.CustomEvent||CustomEvent)('site-cloud-sync',{detail:{...state}});win.dispatchEvent(event);}};
  function setState(status,extra={}){state={...state,status,...extra};emit();}
  function rawValues(){return Object.fromEntries(KEYS.map(key=>[key,storage.getItem(key)]));}
  function metadata(){const raw=storage.getItem(CLOUD_META_KEY);if(raw===null)return null;try{return validateMetadata(JSON.parse(raw));}catch{const error=new Error('Sync metadata needs recovery');error.recovery=true;throw error;}}
  function persistMeta(snapshot){storage.setItem(CLOUD_META_KEY,json({schema:1,accountId:snapshot.user.id,confirmed:snapshot.records,updatedAt:now()}));}
  function readChanges(){
    const result=[];
    for(let index=0;index<storage.length;index++){
      const key=storage.key(index);if(!key?.startsWith(CLOUD_CHANGE_PREFIX))continue;
      try{const value=JSON.parse(storage.getItem(key));if(value?.schema!==1||typeof value.id!=='string'||!(value.ownerId===null||typeof value.ownerId==='string')||!Array.isArray(value.operations))throw new Error();result.push(value);}
      catch{const error=new Error('Sync queue needs recovery');error.recovery=true;throw error;}
    }
    return result.sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
  }
  function addChange(ownerId,operations){if(!operations.length)return null;const change={schema:1,id:uid(),ownerId,createdAt:now(),operations};storage.setItem(CLOUD_CHANGE_PREFIX+change.id,json(change));return change;}
  function backup(reason,ownerId){
    const value={schema:1,reason,ownerId,createdAt:now(),values:rawValues()};
    // This must succeed before any first import or account switch changes a cache.
    storage.setItem(CLOUD_BACKUP_PREFIX+now()+'-'+uid(),json(value));
  }
  function isEditing(){
    if(environment.isEditing)return environment.isEditing();
    for(const form of dirtyForms)if(!form.isConnected)dirtyForms.delete(form);
    return !!(now()-lastInteraction<750||dirtyForms.size||doc?.querySelector('dialog[open],.trip-builder-surface')||doc?.activeElement?.matches('input,textarea,select,[contenteditable="true"]'));
  }
  function notifyStorage(key,oldValue,newValue){
    if(!win?.dispatchEvent)return;
    let event;
    try{event=new win.StorageEvent('storage',{key,oldValue,newValue,storageArea:storage,url:win.location?.href||''});}
    catch{event=new (win.Event||Event)('storage');Object.defineProperties(event,{key:{value:key},oldValue:{value:oldValue},newValue:{value:newValue}});}
    Object.defineProperty(event,'cloudSync',{value:true});win.dispatchEvent(event);
  }
  function latestLocal(){
    const meta=metadata();
    if(!meta)return rawValues();
    return recordsToLocal(reconcileSnapshot({schema:1,user:{id:meta.accountId},records:meta.confirmed},readChanges(),meta.accountId));
  }
  function applyLatest({force=false}={}){
    const next=latestLocal(),events=[];
    if(!force&&KEYS.some(key=>storage.getItem(key)!==next[key])&&isEditing()){pendingApply=true;setState(accountBlocked?'account':'pending');return false;}
    for(const key of KEYS){const previous=storage.getItem(key);if(previous!==next[key]){storage.setItem(key,next[key]);events.push([key,previous,next[key]]);}viewValues[key]=next[key];}
    pendingApply=false;accountBlocked=false;
    for(const args of events)notifyStorage(...args);
    if(events.some(([key])=>key===CLOUD_KEYS.trips))win?.dispatchEvent?.(new (win.Event||Event)('travel-trips-change'));
    return true;
  }
  function refreshPending(){
    const accountId=verifiedOwner||metadata()?.accountId||null;
    const pending=readChanges().filter(change=>change.ownerId===accountId).reduce((count,change)=>count+change.operations.length,0);
    state={...state,pending,accountId};return pending;
  }
  function writeRecord(key,serialized){
    if(!KEYS.includes(key)){storage.setItem(key,serialized);return;}
    const meta=metadata();
    if(accountBlocked||(verifiedOwner&&meta&&verifiedOwner!==meta.accountId)){setState('account');throw new Error('账号已更换，当前编辑已保留，请结束编辑后重试。');}
    const before=parseLocalRecord(key,viewValues[key]??storage.getItem(key));
    const after=parseLocalRecord(key,serialized);
    const operations=diffRecords(before,after);
    if(!operations.length)return;
    const ownerId=verifiedOwner||meta?.accountId||null;
    // Queue first: a tab closing between these writes must never lose a successful edit.
    addChange(ownerId,operations);
    const merged=meta?latestLocal():recordsToLocal(applyOperations(localRecords(rawValues()),operations));
    const previous=storage.getItem(key);
    storage.setItem(key,merged[key]);
    // Keep the baseline the visible editor actually used, until safe to refresh it.
    viewValues[key]=serialized;
    if(merged[key]!==serialized)pendingApply=true;
    refreshPending();setState('syncing');schedule(150);
    if(previous!==merged[key]&&merged[key]!==serialized)queueMicrotask(()=>{if(!disposed&&!isEditing())applyLatest();});
  }
  async function request(method,body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5500);
    try{
      const response=await fetcher('/api/cloud-state',{method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},signal:controller.signal,...(body?{body:json(body)}:{})});
      if(!response.ok){const error=new Error('Cloud request failed');error.status=response.status;throw error;}
      return validateSnapshot(await response.json());
    }finally{clearTimeout(timer);}
  }
  async function withLock(action){
    if(locks?.request)return locks.request('tobias-cloud-sync-v1',{mode:'exclusive'},action);
    let lease;
    try{lease=JSON.parse(storage.getItem(LOCK_KEY)||'null');}catch{}
    if(lease?.expires>now()&&lease.owner!==clientId){schedule(1000);return;}
    storage.setItem(LOCK_KEY,json({owner:clientId,expires:now()+20000}));
    await pause(environment.lockDelay??40);
    try{if(JSON.parse(storage.getItem(LOCK_KEY)||'null')?.owner!==clientId){schedule(1000);return;}}catch{return;}
    const renew=setInterval(()=>{try{const current=JSON.parse(storage.getItem(LOCK_KEY)||'null');if(current?.owner===clientId)storage.setItem(LOCK_KEY,json({owner:clientId,expires:now()+20000}));}catch{}},4000);
    try{return await action();}finally{clearInterval(renew);try{if(JSON.parse(storage.getItem(LOCK_KEY)||'null')?.owner===clientId)storage.removeItem(LOCK_KEY);}catch{}}
  }
  function existingRequest(accountId){
    const raw=storage.getItem(CLOUD_REQUEST_PREFIX+encodeURIComponent(accountId));if(!raw)return null;
    try{const value=JSON.parse(raw);if(value.schema!==1||value.accountId!==accountId||typeof value.requestId!=='string'||!Array.isArray(value.operations)||!Array.isArray(value.parts))throw new Error();return value;}
    catch{const error=new Error('Cloud request needs recovery');error.recovery=true;throw error;}
  }
  function acceptSnapshot(snapshot){persistMeta(snapshot);verifiedOwner=snapshot.user.id;const counts=Object.fromEntries(['pins','trips','groups'].map(collection=>[collection,snapshot.records.filter(record=>record.collection===collection&&!record.deleted).length]));state={...state,accountId:verifiedOwner,account:snapshot.user,counts,updatedAt:now()};pendingApply=true;}
  async function sync(){
    // Validate before sending anything. A corrupt queue or cache is never treated as empty.
    let meta=metadata();readChanges();localRecords(rawValues());
    const snapshot=await request('GET');
    const ownerId=snapshot.user.id;
    if(!meta){
      const local=localRecords(rawValues());
      if(local.length||readChanges().some(change=>change.ownerId===null))backup('first-cloud-migration',null);
      addChange(ownerId,migrationOperations(local,snapshot.records));
      for(const change of readChanges())if(change.ownerId===null){addChange(ownerId,change.operations);storage.removeItem(CLOUD_CHANGE_PREFIX+change.id);}
    }else if(meta.accountId!==ownerId){
      backup('account-switch',meta.accountId);
      accountBlocked=isEditing();
      // Old-account changes remain isolated in their own queue; never upload them here.
    }
    acceptSnapshot(snapshot);meta=metadata();
    if(!accountBlocked)applyLatest();
    let loops=0;
    while(!disposed&&loops++<8){
      let queued=existingRequest(ownerId);
      if(!queued){queued=createRequest(readChanges(),ownerId,uid());if(!queued)break;storage.setItem(CLOUD_REQUEST_PREFIX+encodeURIComponent(ownerId),json(queued));}
      setState('syncing',{pending:refreshPending()});
      const result=await request('POST',{requestId:queued.requestId,operations:queued.operations});
      if(result.user.id!==ownerId){setState('account');schedule(0);return;}
      // Remove only the acknowledged prefix. New edits made while awaiting the network survive.
      const before=readChanges(),after=acknowledgeRequest(before,queued),byId=new Map(after.map(change=>[change.id,change]));
      for(const part of queued.parts){const change=byId.get(part.id);if(change)storage.setItem(CLOUD_CHANGE_PREFIX+part.id,json(change));else storage.removeItem(CLOUD_CHANGE_PREFIX+part.id);}
      acceptSnapshot(result);
      storage.removeItem(CLOUD_REQUEST_PREFIX+encodeURIComponent(ownerId));
      if(!accountBlocked)applyLatest();
    }
    failures=0;const pending=refreshPending();
    if(pending){setState('syncing');schedule(300);}
    else if(accountBlocked)setState('account');
    else if(pendingApply)setState('pending');
    else setState('synced');
  }
  function schedule(delay){if(disposed)return;clearTimeout(retryTimer);retryTimer=setTimeout(()=>{retryTimer=undefined;void flushCloudSync();},delay);retryTimer.unref?.();}
  async function flushCloudSync(){
    if(disposed)return {...state};if(running)return running;
    running=withLock(sync).catch(error=>{
      failures++;
      try{refreshPending();}catch{}
      setState(error.status===401||error.status===403?'login':error.recovery?'recovery':error.status>=400&&error.status<500?'error':'offline');
      if(!error.recovery)schedule(error.status===401||error.status===403?30000:Math.min(60000,1000*2**Math.min(failures,6)));
      return {...state};
    }).finally(()=>{running=null;});
    return running;
  }
  function language(){const value=doc?.documentElement?.lang||'zh-CN';return /^en/i.test(value)?'en':/TW|Hant/i.test(value)?'zh-TW':'zh-CN';}
  function renderStatus(){
    if(!doc?.body)return;
    if(!statusButton?.isConnected){
      statusButton=doc.createElement('button');statusButton.type='button';statusButton.className='site-cloud-status';statusButton.dataset.i18nSkip='';statusButton.setAttribute('aria-live','polite');
      statusButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a5 5 0 1 1 .4-10A6 6 0 0 1 19 10a4 4 0 0 1-1 8"/><path data-cloud-check d="m9 16 2 2 4-4"/></svg><span></span>';
      statusButton.setAttribute('aria-haspopup','dialog');
      statusButton.addEventListener('click',()=>win.dispatchEvent(new (win.CustomEvent||CustomEvent)('site-cloud-open')));
      const host=doc.querySelector('.topbar-controls,.header-controls,.site-tools,.topbar-actions')||doc.querySelector('.topbar')||doc.body;
      host.append(statusButton);
    }
    const text=(TEXT[language()]||TEXT['zh-CN'])[state.status]||TEXT['zh-CN'].error;
    statusButton.dataset.state=state.status;statusButton.querySelector('span').textContent=text;statusButton.title=text;statusButton.setAttribute('aria-label',text);
  }
  function listen(target,type,listener,options){target?.addEventListener?.(type,listener,options);listeners.push(()=>target?.removeEventListener?.(type,listener,options));}
  async function initializeCloudSync(){
    if(initialized)return {...state};initialized=true;
    try{viewValues=rawValues();metadata();localRecords(viewValues);}catch{setState('recovery');return {...state};}
    if(doc?.head&&!doc.querySelector('[data-cloud-sync-style]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./cloud-sync.css',import.meta.url).href;link.dataset.cloudSyncStyle='';doc.head.append(link);}
    renderStatus();
    listen(win,'online',()=>schedule(0));listen(win,'focus',()=>schedule(0));
    listen(doc,'visibilitychange',()=>{if(!doc.hidden)schedule(0);});
    listen(win,'site-language-change',renderStatus);
    listen(doc,'pointerdown',()=>{lastInteraction=now();},true);listen(doc,'keydown',()=>{lastInteraction=now();},true);
    listen(doc,'input',event=>{if(event.target?.form)dirtyForms.add(event.target.form);},true);
    listen(doc,'submit',event=>{setTimeout(()=>dirtyForms.delete(event.target),100);},true);
    listen(doc,'reset',event=>{dirtyForms.delete(event.target);},true);
    listen(doc,'click',event=>{const cancel=event.target?.closest?.('[data-residence-cancel]');if(cancel){dirtyForms.delete(cancel.closest('form'));}},true);
    listen(doc,'close',event=>{for(const form of dirtyForms)if(event.target.contains?.(form))dirtyForms.delete(form);},true);
    listen(win,'storage',event=>{
      if(event.cloudSync)return;
      if(KEYS.includes(event.key)){
        if(isEditing()){event.stopImmediatePropagation?.();pendingApply=true;setState('pending');}
        else viewValues[event.key]=event.newValue;
      }
      if(event.key?.startsWith(CLOUD_CHANGE_PREFIX)||event.key===CLOUD_META_KEY){pendingApply=true;schedule(350);}
    },true);
    pollTimer=setInterval(()=>{if(!doc?.hidden)void flushCloudSync();},30000);pollTimer.unref?.();
    editTimer=setInterval(()=>{
      if(pendingApply&&!isEditing()){try{applyLatest();refreshPending();setState(state.pending?'syncing':verifiedOwner?'synced':'checking');}catch{setState('recovery');}}
    },1000);editTimer.unref?.();
    const initial=flushCloudSync();
    // Opening a phone must remain possible even if the network or another tab is stalled.
    let timer;await Promise.race([initial,new Promise(resolve=>{timer=setTimeout(resolve,6000);})]);clearTimeout(timer);
    if(!verifiedOwner&&state.status==='checking')setState('offline');
    return {...state};
  }
  function dispose(){disposed=true;clearTimeout(retryTimer);clearInterval(pollTimer);clearInterval(editTimer);listeners.forEach(remove=>remove());statusButton?.remove();}
  return {initializeCloudSync,writeRecord,flushCloudSync,getCloudSyncState:()=>({...state}),dispose};
}
let singleton;
const client=()=>singleton||(singleton=createCloudClient());
export const initializeCloudSync=()=>client().initializeCloudSync();
// Standalone collection utilities keep their synchronous local-storage contract.
// The website initializes the account client before it mounts any editable UI.
export const writeRecord=(key,serialized)=>singleton?singleton.writeRecord(key,serialized):globalThis.localStorage.setItem(key,serialized);
export const flushCloudSync=()=>client().flushCloudSync();
export const getCloudSyncState=()=>client().getCloudSyncState();
