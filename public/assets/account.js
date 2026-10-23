import {getCloudSyncState,flushCloudSync} from './cloud-sync.js?v=20261023-cloud-palette';
let dialog;
const labels={
  'zh-CN':{title:'账号与云端记录',signed:'已登录 ChatGPT',none:'登录后，在不同设备读取同一份记录。',help:'在手机、电脑上使用同一 ChatGPT 账号打开本网站，收藏和旅行记录会自动同步。',signin:'使用 ChatGPT 登录',signout:'退出登录',sync:'立即同步',close:'关闭账号信息',pins:'地点与国家',trips:'行程记录',groups:'研究组',date:'最近连接',saved:'云端保存',queued:'等待上传的修改',empty:'尚未连接云端'},
  'zh-TW':{title:'帳號與雲端記錄',signed:'已登入 ChatGPT',none:'登入後，在不同裝置讀取同一份記錄。',help:'在手機、電腦上使用同一 ChatGPT 帳號開啟本網站，收藏與旅行記錄會自動同步。',signin:'使用 ChatGPT 登入',signout:'登出',sync:'立即同步',close:'關閉帳號資訊',pins:'地點與國家',trips:'行程記錄',groups:'研究組',date:'最近連線',saved:'雲端儲存',queued:'等待上傳的修改',empty:'尚未連接雲端'},
  en:{title:'Account & cloud records',signed:'Signed in with ChatGPT',none:'Sign in to open your records on any device.',help:'Open this website on your phone or computer with the same ChatGPT account. Your saved places and journeys sync automatically.',signin:'Sign in with ChatGPT',signout:'Sign out',sync:'Sync now',close:'Close account details',pins:'Places & countries',trips:'Journeys',groups:'Research groups',date:'Last connected',saved:'Cloud records',queued:'Changes waiting to upload',empty:'Not connected yet'}
};
const language=()=>document.documentElement.lang.startsWith('en')?'en':/TW|Hant/.test(document.documentElement.lang)?'zh-TW':'zh-CN';
function render(){
  if(!dialog)return;
  const state=getCloudSyncState(),lang=language(),text=labels[lang];
  dialog.querySelector('h2').textContent=text.title;dialog.querySelector('[data-account-close]').setAttribute('aria-label',text.close);
  dialog.querySelector('[data-account-person]').textContent=state.account?.name||state.account?.email||(state.accountId?text.signed:text.none);
  dialog.querySelector('[data-account-help]').textContent=text.help;
  dialog.querySelector('[data-account-saved]').textContent=text.saved;
  const counts=state.counts||{};dialog.querySelectorAll('[data-account-count]').forEach(node=>{const key=node.dataset.accountCount;node.querySelector('strong').textContent=state.accountId?String(counts[key]||0):'—';node.querySelector('span').textContent=text[key];});
  dialog.querySelector('[data-account-pending]').textContent=state.pending?text.queued+' · '+state.pending:'';
  dialog.querySelector('[data-account-date]').textContent=state.updatedAt?text.date+' · '+new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.updatedAt)):text.empty;
  const returnTo=encodeURIComponent('/'+(location.hash||''));
  const signin=dialog.querySelector('[data-account-signin]');signin.href='/signin-with-chatgpt?return_to='+returnTo;signin.textContent=text.signin;signin.hidden=Boolean(state.accountId);
  const signout=dialog.querySelector('[data-account-signout]');signout.href='/signout-with-chatgpt?return_to=%2F';signout.textContent=text.signout;signout.hidden=!state.accountId;
  const sync=dialog.querySelector('[data-account-sync]');sync.textContent=text.sync;sync.disabled=state.status==='syncing'||state.status==='checking';
}
export function initializeAccountPanel(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='account-dialog';dialog.dataset.i18nSkip='';dialog.setAttribute('aria-labelledby','account-title');
  dialog.innerHTML='<div class="account-top"><span class="mono">YOUR PERSONAL SPACE</span><button type="button" data-account-close>×</button></div><h2 id="account-title"></h2><p class="account-person" data-account-person></p><p data-account-help></p><h3 data-account-saved></h3><div class="account-counts">'+['pins','trips','groups'].map(key=>'<div data-account-count="'+key+'"><strong>—</strong><span></span></div>').join('')+'</div><p data-account-pending role="status"></p><small data-account-date></small><div class="account-actions"><button type="button" data-account-sync></button><a data-account-signin target="_top"></a><a data-account-signout target="_top"></a></div>';
  document.body.append(dialog);dialog.querySelector('[data-account-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-account-sync]').addEventListener('click',async()=>{await flushCloudSync();render();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener('site-cloud-open',()=>{render();dialog.showModal();});window.addEventListener('site-cloud-sync',render);window.addEventListener('site-language-change',render);render();
}
