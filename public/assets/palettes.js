// Apply the saved accent before the first paint; appearance stays device-local.
(()=>{
  const key='tobias.personal-space.palette.v1';
  const choices=[['forest','#768864','苔绿','苔綠','Moss'],['ocean','#4e7d9c','海蓝','海藍','Ocean'],['lavender','#8270a2','紫雾','紫霧','Lavender'],['terracotta','#ac735d','暖陶','暖陶','Terracotta'],['slate','#687382','石墨','石墨','Slate']];
  const root=document.documentElement,valid=value=>choices.some(([id])=>id===value);
  let selected='forest',dialog,button;
  try{const saved=localStorage.getItem(key);if(valid(saved))selected=saved;}catch{}
  const locale=()=>root.lang.startsWith('en')?'en':/TW|Hant/.test(root.lang)?'zh-TW':'zh-CN';
  function apply(value,persist=false){selected=valid(value)?value:'forest';root.dataset.palette=selected;if(persist)try{localStorage.setItem(key,selected);}catch{};render();window.dispatchEvent(new CustomEvent('site-palette-change',{detail:{palette:selected}}));}
  function render(){
    if(!dialog)return;
    const en=locale()==='en',traditional=locale()==='zh-TW';
    button.setAttribute('aria-label',en?'Choose theme colors':traditional?'選擇主題配色':'选择主题配色');
    button.querySelector('span').textContent=en?'Colors':traditional?'配色':'配色';
    dialog.querySelector('h2').textContent=en?'Make yourself at home.':traditional?'選一種喜歡的顏色。':'选一种喜欢的颜色。';
    dialog.querySelector('p').textContent=en?'Every palette works in day and night modes.':traditional?'每種配色都支持白晝與黑夜模式。':'每种配色都支持白昼与黑夜模式。';
    dialog.querySelector('[data-palette-close]').setAttribute('aria-label',en?'Close color settings':traditional?'關閉配色設置':'关闭配色设置');
    dialog.querySelectorAll('[data-palette-choice]').forEach(el=>{const item=choices.find(([id])=>id===el.dataset.paletteChoice);el.querySelector('span').textContent=item[en?4:traditional?3:2];el.setAttribute('aria-pressed',String(item[0]===selected));});
  }
  function initialize(){
    const host=document.querySelector('.topbar-actions');if(!host)return;
    button=document.createElement('button');button.type='button';button.className='palette-toggle';button.dataset.i18nSkip='';button.setAttribute('aria-haspopup','dialog');
    button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1a2.5 2.5 0 0 0 1.7-4.3c-.9-.9-.2-2.7 1.1-2.7H18a3 3 0 0 0 3-3c0-4.4-4-8-9-8Z"/><circle cx="7" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="16" cy="8" r=".8"/></svg><span></span>';
    host.insertBefore(button,document.querySelector('#theme-toggle'));
    dialog=document.createElement('dialog');dialog.className='palette-dialog';dialog.dataset.i18nSkip='';dialog.setAttribute('aria-labelledby','palette-title');
    dialog.innerHTML='<div class="palette-dialog-heading"><span class="mono">YOUR SPACE, YOUR COLORS</span><button type="button" data-palette-close>×</button></div><h2 id="palette-title"></h2><p></p><div class="palette-choices">'+choices.map(([id,color])=>'<button type="button" data-palette-choice="'+id+'"><i style="--swatch:'+color+'" aria-hidden="true"></i><span></span><b aria-hidden="true">✓</b></button>').join('')+'</div>';
    document.body.append(dialog);button.addEventListener('click',()=>dialog.showModal());
    dialog.addEventListener('click',event=>{const target=event.target.closest('[data-palette-choice]');if(target)apply(target.dataset.paletteChoice,true);if(event.target.closest('[data-palette-close]'))dialog.close();if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    window.addEventListener('site-language-change',render);render();
  }
  apply(selected);
  window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
