// Keep select values and change events for existing form logic, but present
// every choice as a button. Large collections stay searchable and in-page.
const refreshEvent='site-choice-refresh';
const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const labelFor=select=>select.getAttribute('aria-label')||select.dataset.choiceLabel||[...(select.closest('label')?.childNodes||[])].filter(node=>node.nodeType===3).map(node=>node.textContent).join(' ').trim()||'选择';

export function refreshClickChoices(root){root?.querySelectorAll('select[data-click-choice-ready]').forEach(select=>select.dispatchEvent(new Event(refreshEvent)));}

export function mountClickChoices(root,{matchOption}={}){
  const cleanups=[];
  root?.querySelectorAll('select:not([data-click-choice-ready])').forEach(select=>{
    // Language controls have their own compact, always-visible choice buttons.
    if(select.hasAttribute('data-language-select'))return;
    const label=labelFor(select),searchable=select.hasAttribute('data-choice-searchable')||select.options.length>8;
    const original={hidden:select.hidden,tabindex:select.getAttribute('tabindex'),ariaHidden:select.getAttribute('aria-hidden')};
    select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.dataset.clickChoiceReady='true';
    const box=document.createElement('div');box.className=`click-choices${searchable?' is-searchable':''}`;box.setAttribute('role','group');box.setAttribute('aria-label',label);
    let search,summary,empty,more,limit=12;
    const validation=document.createElement('p');validation.className='click-choice-validation';validation.setAttribute('role','alert');validation.hidden=true;
    const options=document.createElement('div');options.className='click-choice-options';
    if(searchable){
      summary=document.createElement('p');summary.className='click-choice-selection';summary.setAttribute('aria-live','polite');box.append(summary);
      search=document.createElement('input');search.type='search';search.className='click-choice-search';search.autocomplete='off';search.placeholder=select.dataset.choicePlaceholder||'搜索国家或地区…';search.setAttribute('aria-label',select.dataset.choiceSearchLabel||`搜索${label}`);box.append(search);
      empty=document.createElement('p');empty.className='click-choice-empty';empty.textContent='没有找到，换个关键词试试。';empty.setAttribute('role','status');
      more=document.createElement('button');more.type='button';more.className='click-choice-more';more.textContent='显示更多';
      search.addEventListener('input',()=>{limit=12;render();});
      more.addEventListener('click',()=>{limit+=24;render();});
    }
    box.append(options);if(searchable)box.append(empty,more);box.append(validation);select.after(box);
    function render(){
      const query=normalize(search?.value),all=[...select.options].filter(option=>!option.hidden&&(!searchable||option.value));
      const matching=all.filter(option=>!query||(matchOption?matchOption(select,option,query):normalize(`${option.textContent} ${option.dataset.choiceSearch||''} ${option.value}`).includes(query)));
      const shown=searchable?matching.slice(0,limit):matching;
      options.replaceChildren(...shown.map(option=>{
        const button=document.createElement('button');button.type='button';button.className='click-choice';button.dataset.choiceValue=option.value;button.textContent=option.textContent;button.disabled=select.disabled||option.disabled;button.setAttribute('aria-pressed',String(option.value===select.value));
        button.addEventListener('click',()=>{
          // Changing a choice never submits its surrounding form.
          select.value=option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));render();
          [...options.querySelectorAll('button')].find(item=>item.dataset.choiceValue===select.value)?.focus({preventScroll:true});
        });return button;
      }));
      box.classList.toggle('is-disabled',select.disabled);
      if(select.validity?.valid!==false){validation.hidden=true;search?.removeAttribute('aria-invalid');}
      if(searchable){summary.textContent=select.selectedOptions[0]?.value?select.selectedOptions[0].textContent:'';summary.hidden=!summary.textContent;empty.hidden=matching.length>0;more.hidden=shown.length>=matching.length;search.disabled=select.disabled;}
    }
    function onInvalid(event){event.preventDefault();validation.textContent=select.validationMessage;validation.hidden=false;search?.setAttribute('aria-invalid','true');(search||options.querySelector('button:not(:disabled)'))?.focus();}
    select.addEventListener('change',render);select.addEventListener(refreshEvent,render);select.addEventListener('invalid',onInvalid);
    // Original options keep the translator's source text. Rebuild from them
    // after a language switch, without changing anything typed into search.
    window.addEventListener('site-language-change',render);
    const form=select.form;const onReset=()=>queueMicrotask(()=>{if(search)search.value='';limit=12;render();});form?.addEventListener('reset',onReset);
    options.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
      const buttons=[...options.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(event.target);if(index<0)return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length;buttons[next]?.focus();
    });
    render();
    cleanups.push(()=>{select.removeEventListener('change',render);select.removeEventListener(refreshEvent,render);select.removeEventListener('invalid',onInvalid);window.removeEventListener('site-language-change',render);form?.removeEventListener('reset',onReset);box.remove();delete select.dataset.clickChoiceReady;select.hidden=original.hidden;if(original.tabindex===null)select.removeAttribute('tabindex');else select.setAttribute('tabindex',original.tabindex);if(original.ariaHidden===null)select.removeAttribute('aria-hidden');else select.setAttribute('aria-hidden',original.ariaHidden);});
  });
  return {refresh:()=>refreshClickChoices(root),destroy:()=>cleanups.forEach(cleanup=>cleanup())};
}
