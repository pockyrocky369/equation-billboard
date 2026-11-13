const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='equation-billboard-fan-2025-v1';
let items=[],moduleOrder=[],catalog=[],changeLog=[],activeModule='全部公式',activeSubmodel='',editing=null;
let paperSeedItems=[];
const methodSelection=new Map();
let lastCommittedSnapshot='',undoHistory=[];
const displayId=id=>{const index=items.findIndex(x=>x.id===id);return index<0?String(id??''):String(index+1)};
const resolveId=id=>items.find(x=>displayId(x.id)===id)?.id||id;
function math(tex,inline=false){const n=document.createElement(inline?'span':'div');n.className=inline?'inline-math':'math';const normalized=normalizeLatex(tex);n.textContent=inline?'\\('+normalized+'\\)':'\\['+normalized+'\\]';return n}
function typeset(root){if(window.MathJax?.typesetPromise)return window.MathJax.typesetPromise(root?[root]:undefined).catch(()=>{});setTimeout(()=>typeset(root),300);return Promise.resolve()}
function rich(input){
 let source=String(input??'').replace(/\(M(?=\d)/g,'(');
 const tokens=[],keep=html=>'\u0000'+(tokens.push(html)-1)+'\u0000';
 const inline=latex=>keep('<span class="inline-math">\\('+esc(normalizeLatex(latex))+'\\)</span>');
 const display=latex=>keep('<span class="rich-display-math">\\['+esc(normalizeLatex(latex))+'\\]</span>');
 source=source.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g,(_,dollar,bracket)=>display(dollar??bracket));
 source=source.replace(/\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$|`([^`]+)`/g,(_,paren,dollar,code)=>inline(paren??dollar??code));
 source=source.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,(_,name,url)=>keep('<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a>'));
 source=source.split('\n').map(line=>{
  const value=line.trim();
  if(value&&!line.includes('\u0000')&&!/[\u3400-\u9fff]/.test(value)&&/^(?:\\[A-Za-z]+|[A-Za-z](?:[_^({]|\s*=))/.test(value)&&/[=<>≤≥]/.test(value))return display(value);
  return line;
 }).join('\n');
 const leaf='\\{[^{}]*\\}',nested='\\{(?:[^{}]|'+leaf+')*\\}',group='\\{(?:[^{}]|'+nested+')*\\}';
 source=source.replace(new RegExp('\\\\frac'+group+group+'|\\\\sqrt(?:\\[[^\\]]+\\])?'+group,'g'),match=>inline(match));
 source=source.replace(new RegExp('\\\\(?:sum|prod|int)(?:[_^]'+group+')+','g'),match=>inline(match));
 const indexed=/\b[A-Za-z][A-Za-z0-9]*(?:_(?:\{(?:[^{}]|\{[^{}]*\})+\}|[A-Za-z0-9,]+)|\^(?:\{(?:[^{}]|\{[^{}]*\})+\}|[A-Za-z0-9]+))+/g;
 source=source.replace(indexed,match=>inline(match));
 source=source.replace(new RegExp('\\\\(?:mathrm|text|operatorname)'+group,'g'),match=>inline(match));
 source=source.replace(/\\(?:alpha|beta|gamma|delta|Delta|eta|lambda|mu|nu|pi|rho|sigma|tau|varphi|phi|omega|Omega|Gamma|theta|Theta)\b/g,match=>inline(match));
 return esc(source).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>').replace(/\u0000(\d+)\u0000/g,(_,index)=>tokens[+index]);
}
function notify(message){const n=document.createElement('div');n.className='toast';n.textContent=message;document.body.append(n);setTimeout(()=>n.remove(),3200)}
function copy(text){navigator.clipboard.writeText(normalizeLatex(text)).then(()=>notify('已复制 LaTeX')).catch(()=>notify('复制失败，请检查浏览器权限'))}
function snapshotData(){return JSON.stringify({items,catalog,changeLog})}
function persist(){lastCommittedSnapshot=snapshotData();localStorage.setItem(storageKey,lastCommittedSnapshot)}
function recordChange(action,detail){if(lastCommittedSnapshot){undoHistory.push({snapshot:lastCommittedSnapshot,action});if(undoHistory.length>20)undoHistory.shift()}changeLog.unshift({time:new Date().toISOString(),action,detail});changeLog=changeLog.slice(0,100);persist()}
function undoLastChange(){const entry=undoHistory.pop();if(!entry){notify('没有可撤回的网站修改');return}const previous=JSON.parse(entry.snapshot);items=previous.items;catalog=previous.catalog;changeLog=previous.changeLog;if(activeModule!=='全部公式'&&!catalog.some(mod=>mod.name===activeModule)){activeModule='全部公式';activeSubmodel=''}if(activeSubmodel&&!catalog.some(mod=>mod.name===activeModule&&mod.submodels.includes(activeSubmodel)))activeSubmodel='';persist();render();if($('#catalog-editor').open)catalogView();notify('已撤回：'+entry.action)}
document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.shiftKey||event.altKey||event.key.toLowerCase()!=='z')return;const target=event.target,typing=target?.isContentEditable||target?.tagName==='TEXTAREA'||target?.tagName==='INPUT'&&!['checkbox','radio','file','button','submit'].includes(target.type);if(typing||$('#editor').open)return;event.preventDefault();undoLastChange()});
function rows(value,field){return value.split('\n').map(x=>x.split('|').map(y=>y.trim())).filter(x=>x.length>=2&&x[0]&&x[1]).map(([title,val])=>({title,[field]:val}))}
function makeCatalog(){const names=[...new Set(items.map(x=>x.module))];return [...moduleOrder.filter(x=>names.includes(x)),...names.filter(x=>!moduleOrder.includes(x))].map(name=>({name,submodels:[...new Set(items.filter(x=>x.module===name).map(x=>x.submodel||x.title))]}))}
function normalizeCatalog(){for(const x of items){let mod=catalog.find(m=>m.name===x.module);if(!mod){mod={name:x.module,submodels:[]};catalog.push(mod)}const sub=x.submodel||x.title;if(!mod.submodels.includes(sub))mod.submodels.push(sub)}}
function nav(){normalizeCatalog();const counts={};items.forEach(x=>counts[x.module]=(counts[x.module]||0)+1);
 const host=$('#modules');host.replaceChildren();
 const all=document.createElement('button');all.className=activeModule==='全部公式'?'active':'';all.innerHTML='<span>全部公式</span><small>'+items.length+'</small>';all.onclick=()=>{activeModule='全部公式';activeSubmodel='';render()};host.append(all);
 for(const mod of catalog){const b=document.createElement('button');b.className=activeModule===mod.name&&!activeSubmodel?'active':'';b.innerHTML='<span>'+esc(mod.name)+'</span><small>'+(counts[mod.name]||0)+'</small>';b.onclick=()=>{activeModule=mod.name;activeSubmodel='';render()};host.append(b);
  if(activeModule===mod.name)for(const sub of mod.submodels){const n=items.filter(x=>x.module===mod.name&&(x.submodel||x.title)===sub).length;const sb=document.createElement('button');sb.className='subnav'+(activeSubmodel===sub?' active':'');sb.innerHTML='<span>'+esc(sub)+'</span><small>'+n+'</small>';sb.onclick=()=>{activeSubmodel=sub;render()};host.append(sb)}}
 $('#total-count').textContent=items.length;
}
function visible(){const q=$('#search').value.trim().toLowerCase();
 return items.filter(x=>(activeModule==='全部公式'||x.module===activeModule)&&(!activeSubmodel||x.submodel===activeSubmodel)&&(!q||[displayId(x.id),x.id,x.sourceTag,x.title,x.titleEn,x.module,x.submodel,...(x.formulas||[x.latex]),x.description,...(x.symbols||[]).map(s=>s.raw+' '+s.meaning+' '+(s.meaningEn||'')),...(x.methods||[]).flatMap(m=>[m.name,m.title,m.titleEn,m.note,m.basis,...(m.formulas||[]),...(m.symbols||[]).map(s=>s.raw+' '+s.meaning+' '+(s.meaningEn||''))])].join(' ').toLowerCase().includes(q)));
}
function inputLinks(x){const explicit=(typeof formulaLinks==='undefined'?[]:formulaLinks).filter(([,to])=>to===x.id).map(([from,,label])=>({from,label}));for(const from of x.dependencies||[])if(!explicit.some(link=>link.from===from))explicit.push({from,label:'输入来源'});return explicit.filter(link=>items.some(y=>y.id===link.from))}
function relatedTo(x){const ids=new Set(inputLinks(x).map(link=>link.from));for(const y of items)if(inputLinks(y).some(link=>link.from===x.id))ids.add(y.id);return items.filter(y=>y.id!==x.id&&(ids.has(y.id)||y.parent===x.id||x.parent===y.id||y.sourceTag===x.sourceTag)).slice(0,12)}
function drawSymbolRows(body,list){
 body.replaceChildren();
 if(!list.length){body.innerHTML='<p class="muted">符号解释待补充。</p>';return}
 for(const s of list){
  const row=document.createElement('div');row.className='symbol-row';
  const name=document.createElement('div');name.className='symbol-name';name.append(math(s.latex||s.raw,true));
  const meaning=document.createElement('div');meaning.className='symbol-meaning';
  let short=(s.meaning||'含义待补充').replace(/^(?:是|为)\s*/,'').split(/[，；]/)[0].trim();
  if(s.unit)short=short.replaceAll('（'+s.unit+'）','').replaceAll('('+s.unit+')','').trim();
  meaning.innerHTML='<span class="symbol-chinese"'+(s.meaningEn?' data-english="'+esc(s.meaningEn)+'" tabindex="0"':'')+'>'+rich(short)+'</span>'+(s.meaningEn?'<small class="symbol-english">'+esc(s.meaningEn)+'</small>':'');
  const unit=document.createElement('div');unit.className='symbol-unit';unit.append(s.unit&&s.unit!=='—'?math(unitToLatex(s.unit),true):'—');
  row.append(name,unit,meaning);
  if(s.bounds?.length){const limit=document.createElement('div');limit.className='symbol-bound';limit.append('取值范围：');s.bounds.forEach((bound,index)=>{if(index)limit.append('；');limit.append(math(bound,true))});row.append(limit)}
  body.append(row);
 }
}
let symbolTooltip=null,activeSymbolTarget=null;
function clearSymbolTooltip(){
 activeSymbolTarget?.classList.remove('formula-symbol-active');activeSymbolTarget=null;
 if(symbolTooltip){symbolTooltip.hidden=true;symbolTooltip.style.visibility='hidden'}
}
function placeSymbolTooltip(target){
 if(!symbolTooltip)return;
 const rect=target.getBoundingClientRect(),width=symbolTooltip.offsetWidth,height=symbolTooltip.offsetHeight,gap=10;
 let left=Math.max(gap,Math.min(rect.left,innerWidth-width-gap));
 let top=rect.top-height-gap;
 if(top<gap)top=rect.bottom+gap;
 if(top+height>innerHeight-gap){
  top=Math.max(gap,Math.min(rect.top,innerHeight-height-gap));
  if(rect.right+width+gap*2<=innerWidth)left=rect.right+gap;
  else left=Math.max(gap,rect.left-width-gap);
 }
 symbolTooltip.style.left=left+'px';symbolTooltip.style.top=top+'px';
}
function showSymbolTooltip(target){
 if(activeSymbolTarget===target)return;
 clearSymbolTooltip();activeSymbolTarget=target;target.classList.add('formula-symbol-active');
 symbolTooltip??=document.body.appendChild(Object.assign(document.createElement('div'),{className:'formula-symbol-tooltip'}));
 const notation=math(target.dataset.symbolLatex,true),meaning=document.createElement('span'),meaningBlock=document.createElement('span');
 notation.classList.add('symbol-tooltip-notation');meaning.className='symbol-tooltip-meaning';meaning.textContent=target.dataset.symbolMeaning||'';meaningBlock.className='symbol-tooltip-bilingual';meaningBlock.append(meaning);
 const parts=[notation,meaningBlock],english=target.dataset.symbolMeaningEn,unit=target.dataset.symbolUnit;
 if(english){const label=document.createElement('span');label.className='symbol-tooltip-english';label.textContent=english;meaningBlock.append(label)}
  if(unit&&unit!=='—'){const label=document.createElement('span');label.className='symbol-tooltip-unit';label.append(math(unitToLatex(unit),true));parts.push(label)}
 symbolTooltip.replaceChildren(...parts);symbolTooltip.hidden=false;symbolTooltip.style.visibility='hidden';
 typeset(symbolTooltip).then(()=>{if(activeSymbolTarget!==target)return;placeSymbolTooltip(target);symbolTooltip.style.visibility='visible'});
}
window.addEventListener('scroll',clearSymbolTooltip,true);
function annotateFormulaSymbols(article,list){
 clearSymbolTooltip();
 if(!window.MathJax?.tex2mml)return;
 const definitions=[];
 for(const symbol of list){
  if(!symbol.meaning)continue;
  try{const parsed=new DOMParser().parseFromString(MathJax.tex2mml(normalizeLatex(symbol.latex||symbol.raw)),'application/xml');const mathNode=parsed.querySelector('math');const node=mathNode?.firstElementChild;
   if(node&&['mi','msub','msup','msubsup','mover','munder','munderover'].includes(node.localName))definitions.push({key:symbolTextKey(node.textContent),latex:symbol.latex||symbol.raw,meaning:symbol.meaning,meaningEn:symbol.meaningEn||'',unit:symbol.unit||''});
  }catch{}
 }
 definitions.sort((a,b)=>b.key.length-a.key.length);
 for(const line of article.querySelectorAll('.formula-line .math')){
  const svg=line.querySelector('mjx-container svg'),mml=line.querySelector('mjx-assistive-mml math');if(!svg||!mml)continue;
  const types=new Set(['mi','msub','msup','msubsup','mover','munder','munderover']);
  const mathNodes=[...mml.querySelectorAll('*')].filter(node=>types.has(node.localName));
  const svgByType=new Map();for(const node of svg.querySelectorAll('g[data-mml-node]')){const type=node.getAttribute('data-mml-node');if(!types.has(type))continue;if(!svgByType.has(type))svgByType.set(type,[]);svgByType.get(type).push(node)}
  const positions=new Map();for(const node of mathNodes){const type=node.localName,position=positions.get(type)||0;positions.set(type,position+1);const target=svgByType.get(type)?.[position],keys=symbolNodeKeys(node);if(!target||!keys.length||type==='mi'&&isDecoratedComponent(node))continue;
   const definition=definitions.find(entry=>keys.includes(entry.key));if(!definition)continue;
   if(target.dataset.symbolLatex||target.parentElement?.closest('[data-symbol-latex]'))continue;
   try{
    const box=target.getBBox(),padX=Math.max(1.5,box.width*.08),padY=Math.max(1.5,box.height*.18);
    const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');hit.classList.add('formula-symbol-hitbox');
    hit.setAttribute('x',box.x-padX);hit.setAttribute('y',box.y-padY);
    hit.setAttribute('width',box.width+padX*2);hit.setAttribute('height',box.height+padY*2);
    target.prepend(hit);target.dataset.symbolLatex=definition.latex;target.dataset.symbolMeaning=definition.meaning;target.dataset.symbolMeaningEn=definition.meaningEn;target.dataset.symbolUnit=definition.unit;target.classList.add('formula-symbol-hover');
   }catch{}
  }
  if(!svg.dataset.symbolHoverReady){
   svg.dataset.symbolHoverReady='true';
   svg.addEventListener('pointermove',event=>{
    const target=event.target.closest?.('[data-symbol-latex]');
    if(target&&svg.contains(target))showSymbolTooltip(target);else clearSymbolTooltip();
   });
   svg.addEventListener('pointerleave',clearSymbolTooltip);
  }
 }
}
function card(x){
 const article=document.createElement('article');article.className='card';article.id='formula-'+x.id;
 let depth=0,ancestor=x;const ancestors=new Set([x.id]);while(ancestor.parent){const parent=items.find(item=>item.id===ancestor.parent);if(!parent||ancestors.has(parent.id))break;ancestors.add(parent.id);ancestor=parent;depth++}article.dataset.depth=String(Math.min(depth,4));
 if(x.parent&&items.some(y=>y.id===x.parent))article.classList.add('child');
 const heading=document.createElement('div');heading.className='card-head';
 heading.innerHTML='<div class="card-head-main"><div class="card-title"><span class="id">'+esc(displayId(x.id))+'</span><h3>'+esc(x.title)+'</h3><span class="card-title-english"></span></div></div>';
 const selectedMethodIndex=Math.max(0,Math.min(methodSelection.get(x.id)||0,Math.max(0,(x.methods?.length||1)-1)));
 let activeMethod=x.methods?.[selectedMethodIndex]||null;
 heading.querySelector('.card-title-english').textContent=activeMethod?.titleEn??x.titleEn??'';
 if(x.methods?.length){
  const selector=document.createElement('select');selector.className='method-corner';selector.setAttribute('aria-label','选择计算方法');
  selector.innerHTML=x.methods.map((m,i)=>'<option value="'+i+'">'+esc(m.name)+'</option>').join('');
  selector.value=String(selectedMethodIndex);heading.append(selector);
  selector.onchange=()=>{methodSelection.set(x.id,+selector.value);activeMethod=x.methods[+selector.value];updateMethod(true);document.querySelectorAll('article.card').forEach(card=>card._redrawInputs?.())};
 }
 article.append(heading);
 const methodNote=document.createElement('p');methodNote.className='method-note';article.append(methodNote);
 const formulaWrap=document.createElement('div');formulaWrap.className='formula-lines';article.append(formulaWrap);
 const upstreamLinks=inputLinks(x);if(upstreamLinks.length){const inputs=document.createElement('details');inputs.className='card-dropdown input-formulas';inputs.innerHTML='<summary>上游计算 <span>'+upstreamLinks.length+' 项</span></summary><div class="dropdown-body input-formula-list"></div>';article.append(inputs);
  article._redrawInputs=()=>{const container=inputs.querySelector('.input-formula-list');container.replaceChildren();for(const link of upstreamLinks){const source=items.find(y=>y.id===link.from);if(!source)continue;const method=source.methods?.[methodSelection.get(source.id)||0],entry=document.createElement('div');entry.className='input-formula-entry';const jumpButton=document.createElement('button');jumpButton.type='button';jumpButton.textContent=displayId(source.id)+' · '+source.title;jumpButton.onclick=()=>jump(source.id);const info=document.createElement('small');info.textContent=link.label+(method?' · '+method.name:'');entry.append(jumpButton,info);for(const line of method?.formulas||source.formulas||[])entry.append(math(line,true));container.append(entry)}if(inputs.open)typeset(inputs)};article._redrawInputs()}
 const actions=document.createElement('div');actions.className='card-actions';
 actions.innerHTML='<button type="button" class="tiny edit">编辑</button>';
 actions.querySelector('.edit').onclick=()=>openEditor(x,methodSelection.get(x.id)||0);
 article.append(actions);
 const symbols=document.createElement('details');symbols.className='card-dropdown';
 const list=x.symbols||[];symbols.innerHTML='<summary>符号与参数 <span class="symbol-count">'+list.length+' 项</span></summary>';
 const body=document.createElement('div');body.className='dropdown-body symbol-grid';
 symbols.append(body);article.append(symbols);
 const derivation=document.createElement('details');derivation.className='card-dropdown';derivation.innerHTML='<summary>推导说明</summary><div class="dropdown-body prose"></div>';article.append(derivation);
 const basis=document.createElement('details');basis.className='card-dropdown';
 basis.innerHTML='<summary>依据与边界 <span>'+(x.references?.length||0)+' 个参考来源</span></summary>';
 const basisBody=document.createElement('div');basisBody.className='dropdown-body prose';
 basis.append(basisBody);article.append(basis);
 const related=relatedTo(x);if(related.length){const rel=document.createElement('div');rel.className='formula-related';rel.innerHTML='<span>相关公式</span>'+related.map(y=>'<button type="button" data-jump="'+esc(y.id)+'">'+esc(displayId(y.id))+' · '+esc(y.title)+'</button>').join('');rel.querySelectorAll('button').forEach(b=>b.onclick=()=>jump(b.dataset.jump));article.append(rel)}
 function updateMethod(renderMath=false){const lines=activeMethod?.formulas||x.formulas||[x.latex];const title=heading.querySelector('h3'),english=activeMethod?.titleEn??x.titleEn??'';title.textContent=activeMethod?.title||x.title;if(english){title.dataset.english=english;title.tabIndex=0}else{delete title.dataset.english;title.removeAttribute('tabindex')}heading.querySelector('.card-title-english').textContent=english;formulaWrap.replaceChildren();for(const [index,line] of lines.entries()){
  const row=document.createElement('div');row.className='formula-line';
  const relation=(activeMethod?.lineRelations??x.lineRelations)?.find(r=>r.index===index);
  if(relation){const level=Number(relation.level??(relation.role==='dependent'?1:0));row.classList.add(level?'nested-line':'main-line');if(level){row.style.setProperty('--child-level',String(level));row.dataset.level=String(Math.min(level,3))}if(relation.label){const label=document.createElement('div');label.className='line-relation-label';label.textContent=relation.label;row.append(label)}}
  const content=document.createElement('div');content.className='formula-content';
  const icon=document.createElement('button');icon.type='button';icon.className='copy-icon';icon.setAttribute('aria-label','复制本行 LaTeX');icon.title='复制本行 LaTeX';icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';icon.onclick=()=>copy(line);
  content.append(math(line),icon);row.append(content);if(relation?.description){const explanation=document.createElement('div');explanation.className='line-explanation';explanation.innerHTML=rich(relation.description);row.append(explanation)}formulaWrap.append(row)
 }
  const note=activeMethod?.note??x.note??'';methodNote.innerHTML=rich(note);methodNote.hidden=!note;
  const visibleSymbols=activeMethod?.symbols??x.symbols??[];article._activeSymbols=visibleSymbols;drawSymbolRows(body,visibleSymbols);symbols.querySelector('.symbol-count').textContent=visibleSymbols.length+' 项';
  const derivationText=activeMethod?.derivation??x.derivation??'';derivation.hidden=!derivationText;derivation.querySelector('.dropdown-body').innerHTML=rich(derivationText);
  const refs=activeMethod?.references??x.references??[];basis.querySelector('summary span').textContent=refs.length+' 个参考来源';basisBody.innerHTML='<p>'+rich(activeMethod?.basis??x.basis??'依据与适用边界待补充。')+'</p>'+(refs.length?'<h4>参考文献</h4><ol class="references">'+refs.map(r=>'<li>'+esc(r.citation||r.title)+(r.url?'<a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">网页 ↗</a>':'')+'</li>').join('')+'</ol>':'');
  if(renderMath)typeset(article).then(()=>annotateFormulaSymbols(article,article._activeSymbols))}
 updateMethod();
 return article;
}
function jump(id){const target=items.find(x=>x.id===id);if(!target)return;activeModule=target.module;activeSubmodel=target.submodel||'';$('#search').value='';render();const el=document.getElementById('formula-'+id);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.classList.add('selected');setTimeout(()=>el?.classList.remove('selected'),1600)}
function render(){nav();const list=visible();$('#results').textContent=list.length+' 张卡片';
 const host=$('#cards');host.replaceChildren();if(!list.length){host.innerHTML='<div class="no-results">没有找到匹配的公式。</div>';return}
 let lastModule='',lastSub='';
 for(const x of list){if(x.module!==lastModule){const h=document.createElement('h2');h.className='module-heading';h.textContent=x.module;host.append(h);lastModule=x.module;lastSub=''}
  if(x.submodel!==lastSub){const h=document.createElement('h3');h.className='submodel-heading';h.textContent=x.submodel||x.title;host.append(h);lastSub=x.submodel}
  host.append(card(x))}
 typeset().then(()=>host.querySelectorAll('article.card').forEach(article=>annotateFormulaSymbols(article,article._activeSymbols)));
}
function nextUserFormulaId(){let number=1;while(items.some(item=>item.id==='自建-'+String(number).padStart(3,'0')))number++;return '自建-'+String(number).padStart(3,'0')}
function openEditor(x,selectedIndex=0){editing=x?.id||null;const f=$('#edit-form');f.reset();$('#editor-title').textContent=x?'编辑 '+displayId(x.id):'新建公式';
 for(const key of ['module','submodel'])f.elements[key].value=x?.[key]??(key==='module'&&activeModule!=='全部公式'?activeModule:key==='submodel'?activeSubmodel:'');
 f.elements.id.value=x?displayId(x.id):String(items.length+1);
 f.elements.dependencies.value=(x?.dependencies||[]).map(displayId).join(', ');
 $('#delete').hidden=!x;$('#editor').showModal();renderStructuredEditor(x,selectedIndex);refreshEditorChoices();
}
$('#cards').addEventListener('toggle',event=>{
 const details=event.target;if(!(details instanceof HTMLDetailsElement)||!details.open||!details.classList.contains('card-dropdown'))return;
 typeset(details).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!details.isConnected||!details.open)return;
  const rect=details.getBoundingClientRect(),bottomLimit=window.innerHeight-24;
  const amount=rect.height>bottomLimit-20?rect.top-20:Math.max(0,rect.bottom-bottomLimit);
  if(amount>1)window.scrollBy({top:amount,behavior:'smooth'});
 })));
},true);
$('#edit-form').onsubmit=e=>{e.preventDefault();const f=e.target,id=editing||nextUserFormulaId();
 const old=items.find(x=>x.id===editing);if(!old)autoMatchEditorSymbols(true);let variants;try{variants=collectEditorVariants()}catch(err){notify(err.message);return}
 const base=variants[0],methods=variants.length>1?variants:[];
 const x={...old,id,sourceTag:old?.sourceTag||id,title:base.title,titleEn:base.titleEn,submodel:f.elements.submodel.value.trim(),module:f.elements.module.value.trim(),parent:old?.parent||null,dependencies:f.elements.dependencies.value.split(/[,，;；\s]+/).map(value=>resolveId(value.trim())).filter(Boolean),latex:base.formulas[0],formulas:base.formulas,lineRelations:base.lineRelations,symbols:base.symbols,basis:base.basis,derivation:base.derivation,note:base.note,description:old?.description||'',references:base.references,methods};
 if(old)items[items.indexOf(old)]=x;else items.push(x);normalizeUnitRanges(items);normalizeLineHierarchy(items);normalizeCatalog();catalogNormalizeOrder();if(methods.length)methodSelection.set(id,Math.min(editorVariantIndex,methods.length-1));else methodSelection.delete(id);recordChange(old?'修改公式':'新增公式',displayId(id)+' · '+x.title);$('#editor').close();activeModule=x.module;render();jump(id);notify('已保存到当前浏览器');
};
$('#add').onclick=()=>openEditor();$('#close').onclick=$('#cancel').onclick=()=>$('#editor').close();
function closeOnBackdropPressAndRelease(dialog){let pressedOutside=false,pointerId=null;const outside=event=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)};
 dialog.addEventListener('pointerdown',event=>{pressedOutside=event.button===0&&outside(event);pointerId=pressedOutside?event.pointerId:null});
 dialog.addEventListener('pointerup',event=>{const shouldClose=pressedOutside&&pointerId===event.pointerId&&outside(event);pressedOutside=false;pointerId=null;if(shouldClose)dialog.close()});
 dialog.addEventListener('pointercancel',()=>{pressedOutside=false;pointerId=null});dialog.addEventListener('close',()=>{pressedOutside=false;pointerId=null})}
closeOnBackdropPressAndRelease($('#editor'));
$('#delete').onclick=()=>{if(!editing||!confirm('确定删除这条公式？请先导出备份。'))return;const removed=editing;items=items.filter(x=>x.id!==editing);recordChange('删除公式',removed);$('#editor').close();render()};
function catalogView(){normalizeCatalog();const host=$('#catalog-list');host.replaceChildren();
 for(const mod of catalog){const block=document.createElement('section');block.className='catalog-block';
  const head=document.createElement('div');head.className='catalog-row';head.innerHTML='<strong>'+esc(mod.name)+'</strong><button type="button" data-action="rename-module">改名</button><button type="button" data-action="delete-module">删除</button>';block.append(head);
  head.querySelector('[data-action="rename-module"]').onclick=()=>{const name=prompt('新的模块名称',mod.name)?.trim();if(!name||name===mod.name)return;if(catalog.some(x=>x.name===name)){notify('模块名称已存在');return}const oldName=mod.name;items.forEach(x=>{if(x.module===mod.name)x.module=name});if(activeModule===mod.name)activeModule=name;mod.name=name;recordChange('修改模块',oldName+' → '+name);catalogView();render()};
  head.querySelector('[data-action="delete-module"]').onclick=()=>{const n=items.filter(x=>x.module===mod.name).length;if(!confirm('删除“'+mod.name+'”目录？其中 '+n+' 张公式卡片会移到“未分类”，公式不会被删除。'))return;items.forEach(x=>{if(x.module===mod.name){x.module='未分类';x.submodel='未分类子模型'}});catalog=catalog.filter(x=>x!==mod);if(activeModule===mod.name){activeModule='全部公式';activeSubmodel=''}normalizeCatalog();recordChange('删除模块',mod.name);catalogView();render()};
  for(const sub of mod.submodels){const row=document.createElement('div');row.className='catalog-row child-row';const count=items.filter(x=>x.module===mod.name&&x.submodel===sub).length;row.innerHTML='<span>'+esc(sub)+' <small>('+count+')</small></span><button type="button" data-action="rename-sub">改名</button><button type="button" data-action="delete-sub">删除</button>';block.append(row);
   row.querySelector('[data-action="rename-sub"]').onclick=()=>{const name=prompt('新的子模型名称',sub)?.trim();if(!name||name===sub)return;if(mod.submodels.includes(name)){notify('子模型名称已存在');return}items.forEach(x=>{if(x.module===mod.name&&x.submodel===sub)x.submodel=name});mod.submodels[mod.submodels.indexOf(sub)]=name;if(activeModule===mod.name&&activeSubmodel===sub)activeSubmodel=name;recordChange('修改子模型',sub+' → '+name);catalogView();render()};
   row.querySelector('[data-action="delete-sub"]').onclick=()=>{if(!confirm('删除“'+sub+'”子模型？其中 '+count+' 张公式卡片会移到“未分类子模型”。'))return;items.forEach(x=>{if(x.module===mod.name&&x.submodel===sub)x.submodel='未分类子模型'});mod.submodels=mod.submodels.filter(x=>x!==sub);if(activeSubmodel===sub)activeSubmodel='';normalizeCatalog();recordChange('删除子模型',sub);catalogView();render()};
  }
  const add=document.createElement('button');add.type='button';add.className='catalog-add';add.textContent='＋ 添加子模型';add.onclick=()=>{const name=prompt('子模型名称')?.trim();if(!name)return;if(mod.submodels.includes(name)){notify('子模型名称已存在');return}mod.submodels.push(name);recordChange('新增子模型',mod.name+' / '+name);catalogView();render()};block.append(add);host.append(block)
 }
}
$('#manage-catalog').onclick=()=>{catalogView();$('#catalog-editor').showModal()};$('#close-catalog').onclick=()=>$('#catalog-editor').close();
closeOnBackdropPressAndRelease($('#catalog-editor'));
$('#add-module').onclick=()=>{const name=prompt('模块名称')?.trim();if(!name)return;if(catalog.some(x=>x.name===name)){notify('模块名称已存在');return}catalog.push({name,submodels:[]});recordChange('新增模块',name);catalogView();render()};
$('#search').oninput=render;
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({app:'EquationBillboard',version:'Fan-2025-paper-and-supplement-A',exportedAt:new Date().toISOString(),items,catalog,changeLog},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='EquationBillboard-Fan-2025-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('#import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.items)||!data.items.every(x=>x.id&&x.latex&&x.module))throw Error('格式不正确');if(!confirm('导入将覆盖当前浏览器中的修改，是否继续？'))return;items=data.items.map(x=>({...x,formulas:x.formulas||[x.latex]}));catalog=Array.isArray(data.catalog)?data.catalog:makeCatalog();changeLog=Array.isArray(data.changeLog)?data.changeLog:[];splitFuelAndHydrogen(items,catalog);normalizeUnitRanges(items);normalizeLineHierarchy(items);normalizeStoredNotation(items);mergePaperEnglish(items,paperSeedItems);normalizeCatalog();catalogNormalizeOrder();recordChange('导入备份',file.name);activeModule='全部公式';activeSubmodel='';render();notify('导入成功')}catch(err){notify('导入失败：'+err.message)}e.target.value=''};
fetch('./formulas.json').then(r=>r.json()).then(data=>{paperSeedItems=data.items;moduleOrder=data.moduleOrder||[];const stored=localStorage.getItem(storageKey);const saved=stored?JSON.parse(stored):null;items=saved?.items||data.items;catalog=saved?.catalog||data.catalog||makeCatalog();changeLog=saved?.changeLog||[];
 const migrated=splitFuelAndHydrogen(items,catalog),unitsFixed=normalizeUnitRanges(items),hierarchyFixed=normalizeLineHierarchy(items),notationFixed=normalizeStoredNotation(items),englishFixed=mergePaperEnglish(items,paperSeedItems);normalizeCatalog();catalogNormalizeOrder();if((migrated||unitsFixed||hierarchyFixed||notationFixed||englishFixed)&&saved)persist();else lastCommittedSnapshot=snapshotData();render()}).catch(()=>{$('#cards').innerHTML='<div class="no-results">无法载入公式数据。</div>'});
