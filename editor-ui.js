function editorInput(field,value='',placeholder=''){
 const input=document.createElement('input');input.type='text';input.dataset.field=field;input.value=value||'';input.placeholder=placeholder;input.setAttribute('aria-label',placeholder||field);return input
}
function addSymbolEditorRow(symbol={},focus=false,host=$('#editor-symbol-rows')){
 const row=document.createElement('div');row.className='editor-data-row symbol-data-row';
 const unit=editorInput('unit',symbol.unit&&symbol.unit!=='—'?unitToLatex(symbol.unit):'','LaTeX 单位');unit.setAttribute('list','editor-unit-options');
 row.append(editorInput('latex',symbol.latex||symbol.raw||'','LaTeX 符号'),editorInput('meaning',symbol.meaning||'','中文含义'),editorInput('meaningEn',symbol.meaningEn||'','论文英文原词'),unit,editorInput('bounds',(symbol.bounds||[]).join('；'),'取值范围'));
 row.querySelector('[data-field="latex"]').addEventListener('change',event=>{
  const key=normalizeLatex(event.target.value.trim());
  const known=editorSymbolLibrary().find(entry=>normalizeLatex(entry.latex||entry.raw)===key);
  if(!known)return;
  for(const [field,value] of [['meaning',known.meaning],['meaningEn',known.meaningEn],['unit',known.unit],['bounds',(known.bounds||[]).join('；')]]){
   const input=row.querySelector('[data-field="'+field+'"]');if(!input.value.trim()&&value)input.value=value;
  }
 });
 const remove=document.createElement('button');remove.type='button';remove.className='editor-remove';remove.title='删除此参数';remove.setAttribute('aria-label','删除此参数');remove.textContent='×';remove.onclick=()=>row.remove();row.append(remove);
 const references=document.createElement('div');references.className='symbol-translation-reference';references.hidden=true;row.append(references);
 for(const field of ['meaningEn','meaning'])row.querySelector('[data-field="'+field+'"]').addEventListener('input',()=>renderSymbolTranslationReferences(row));
 host.append(row);renderSymbolTranslationReferences(row);if(focus)row.querySelector('[data-field="latex"]').focus();return row
}
function addReferenceEditorRow(reference={},focus=false,host=$('#editor-reference-rows')){
 const row=document.createElement('div');row.className='editor-data-row reference-data-row';
 row.append(editorInput('title',reference.title||'','文献标题'),editorInput('url',reference.url||'','网址或 DOI 链接'),editorInput('citation',reference.citation||'','参考文献格式'));
 const remove=document.createElement('button');remove.type='button';remove.className='editor-remove';remove.title='删除此文献';remove.setAttribute('aria-label','删除此文献');remove.textContent='×';remove.onclick=()=>row.remove();row.append(remove);
 host.append(row);if(focus)row.querySelector('[data-field="title"]').focus();return row
}
function readSymbolEditorRows(host=$('#editor-symbol-rows')){return [...host.querySelectorAll('.editor-data-row')].map(row=>{
 const get=name=>row.querySelector('[data-field="'+name+'"]').value.trim();const latex=normalizeLatex(get('latex'));return {raw:latex,latex,meaning:get('meaning'),meaningEn:get('meaningEn'),unit:unitToLatex(get('unit')),bounds:get('bounds').split(/[；;\n]/).map(x=>normalizeLatex(x.trim())).filter(Boolean)}
 }).filter(s=>s.latex)}
function readReferenceEditorRows(host=$('#editor-reference-rows')){return [...host.querySelectorAll('.editor-data-row')].map(row=>{
 const get=name=>row.querySelector('[data-field="'+name+'"]').value.trim();return {title:get('title'),url:get('url'),citation:get('citation')}
 }).filter(r=>r.title||r.url)}
function editorSymbolLibrary(){
 const module=$('#edit-form').elements.module.value.trim(),submodel=$('#edit-form').elements.submodel.value.trim();
 const ranked=[...items].sort((a,b)=>{
  const score=item=>item.module===module&&item.submodel===submodel?0:item.module===module?1:2;
  return score(a)-score(b)
 });
 const map=new Map();for(const x of ranked)for(const variant of [x,...(x.methods||[])])for(const s of variant.symbols||[])if(s.latex&&!map.has(s.latex))map.set(s.latex,s);
 return [...map.values()]
}
function editorTranslationLibrary(excludeRow){
 const current=[...$('#editor-symbol-rows').querySelectorAll('.symbol-data-row')].filter(row=>row!==excludeRow).map(row=>({meaning:row.querySelector('[data-field="meaning"]').value.trim(),meaningEn:row.querySelector('[data-field="meaningEn"]').value.trim()}));
 return [...current,...editorSymbolLibrary()]
}
function renderSymbolTranslationReferences(row){
 const host=row.querySelector('.symbol-translation-reference'),english=row.querySelector('[data-field="meaningEn"]').value.trim(),chinese=row.querySelector('[data-field="meaning"]').value.trim();
 host.replaceChildren();host.hidden=true;if(!english||chinese)return;
 const matches=SymbolTranslation.references(english,editorTranslationLibrary(row),3).filter(item=>item.similarity<1);
 const seen=new Set();for(const match of matches){const key=match.meaningEn+'|'+match.meaning;if(seen.has(key))continue;seen.add(key);
  const button=document.createElement('button');button.type='button';button.className='editor-suggestion';button.textContent='参考：'+match.meaningEn+' → '+match.meaning;button.title='相似英文，仅供参考；点击填入中文';button.onclick=()=>{row.querySelector('[data-field="meaning"]').value=match.meaning;host.replaceChildren();host.hidden=true};host.append(button)}
 host.hidden=!host.childElementCount
}
async function translateEditorSymbols(){
 const button=$('#editor-translate-symbols'),status=$('#editor-translate-status'),rows=[...$('#editor-symbol-rows').querySelectorAll('.symbol-data-row')].filter(row=>row.querySelector('[data-field="meaningEn"]').value.trim()&&!row.querySelector('[data-field="meaning"]').value.trim());
 if(!rows.length){status.textContent='没有需要翻译的空白中文参数。';return}
 const targetEditing=editing,targetVariant=editorVariantIndex,stillHere=()=>$('#editor').open&&editing===targetEditing&&editorVariantIndex===targetVariant;
 button.disabled=true;let reused=0,translated=0,failed=0;const cache=new Map();
 try{for(let i=0;i<rows.length;i++){
  if(!stillHere())break;const row=rows[i],englishInput=row.querySelector('[data-field="meaningEn"]'),meaningInput=row.querySelector('[data-field="meaning"]'),english=englishInput.value.trim();
  if(!english||meaningInput.value.trim())continue;
  const exact=SymbolTranslation.exact(english,editorTranslationLibrary(row));let chinese='';
  if(exact){chinese=exact.meaning;reused++}
  else{status.textContent='正在翻译 '+(i+1)+' / '+rows.length+'：'+english;try{const key=SymbolTranslation.normalize(english);if(!cache.has(key))cache.set(key,await SymbolTranslation.online(english));chinese=cache.get(key);translated++}catch{failed++}}
  if(!stillHere())break;if(row.isConnected&&englishInput.value.trim()===english&&!meaningInput.value.trim()&&chinese){meaningInput.value=chinese;renderSymbolTranslationReferences(row)}
 }}finally{button.disabled=false;if(stillHere()){status.textContent='已复用已有译名 '+reused+' 项，在线翻译 '+translated+' 项'+(failed?'，失败 '+failed+' 项（可手动填写或点击相似译名参考）':'')+'。请核对译文并保存公式。';notify('参数翻译已完成')}}
}
function editorComboElements(kind){return {input:$('#editor-'+kind+'-input'),box:$('#editor-'+kind+'-combo'),list:$('#editor-'+kind+'-options')}}
function closeEditorCombos(){for(const kind of ['module','submodel']){const {input,list}=editorComboElements(kind);list.hidden=true;input.setAttribute('aria-expanded','false')}}
function editorComboChoices(kind){return kind==='module'?catalog.map(entry=>entry.name):catalog.find(entry=>entry.name===$('#edit-form').elements.module.value.trim())?.submodels||[]}
function renderEditorCombo(kind,showAll=false){const {input,list}=editorComboElements(kind),query=showAll?'':input.value.trim().toLowerCase(),choices=editorComboChoices(kind).filter(value=>!query||value.toLowerCase().includes(query));list.replaceChildren();
 for(const value of choices){const option=document.createElement('button');option.type='button';option.role='option';option.textContent=value;option.onclick=()=>{const previous=input.value;input.value=value;if(kind==='module'&&previous!==value)$('#edit-form').elements.submodel.value='';input.focus({preventScroll:true});closeEditorCombos();if(kind==='module')renderEditorCombo('submodel',true)};list.append(option)}
 if(!choices.length){const empty=document.createElement('div');empty.className='editor-combo-empty';empty.textContent='没有匹配项，可直接输入新名称';list.append(empty)}
}
function openEditorCombo(kind,showAll=false){closeEditorCombos();renderEditorCombo(kind,showAll);const {input,list}=editorComboElements(kind);list.hidden=false;input.setAttribute('aria-expanded','true')}
function refreshEditorChoices(){closeEditorCombos();renderEditorCombo('module',true);renderEditorCombo('submodel',true)}
function autoMatchEditorSymbols(quiet=false){
 const host=$('#editor-symbol-rows'),symbols=extractFormulaSymbols($('#edit-form').elements.latex.value);
 if(!symbols.length){if(!quiet)notify('未识别到公式参数');return 0}
 const existing=new Map([...host.querySelectorAll('.editor-data-row')].map(row=>[normalizeLatex(row.querySelector('[data-field="latex"]').value.trim()),row]));
 const library=new Map(editorSymbolLibrary().map(symbol=>[normalizeLatex(symbol.latex||symbol.raw),symbol]));
 let reused=0,created=0;
 for(const latex of symbols){let row=existing.get(latex);if(row){host.append(row);existing.delete(latex);continue}
  const known=library.get(latex);row=addSymbolEditorRow(known||{latex,raw:latex});host.append(row);if(known)reused++;else created++}
 for(const row of existing.values())host.append(row);
 if(!quiet)notify('已按公式顺序排列参数：复用 '+reused+' 项，新建 '+created+' 项');
 return reused+created;
}
function renderSymbolSuggestions(input=$('#symbol-library-search'),host=$('#symbol-library-results'),target=$('#editor-symbol-rows')){const q=input.value.trim().toLowerCase();host.replaceChildren();if(!q)return;
 const suggestions=editorSymbolLibrary().filter(s=>[s.raw,s.latex,s.meaning,s.meaningEn,s.unit].join(' ').toLowerCase().includes(q)).slice(0,8);
 for(const s of suggestions){const button=document.createElement('button');button.type='button';button.className='editor-suggestion';button.textContent=(s.raw||s.latex)+' · '+(s.meaning||'含义待补充')+(s.unit?' · '+s.unit:'');button.onclick=()=>{if(readSymbolEditorRows(target).some(existing=>existing.latex===s.latex)){notify('该符号已在参数表中');return}addSymbolEditorRow(s,false,target);input.value='';host.replaceChildren()};host.append(button)}
 if(!suggestions.length)host.textContent='没有匹配的已有符号，可点击“添加参数”新建。'
}
function renderFormulaPreview(field,host){const lines=field.value.split('\n').map(x=>x.trim()).filter(Boolean);host.replaceChildren();if(!lines.length){host.textContent='输入公式或识别图片后，会在这里预览。';return}for(const line of lines.slice(0,5))host.append(math(line));if(lines.length>5){const more=document.createElement('small');more.textContent='另有 '+(lines.length-5)+' 行公式';host.append(more)}typeset(host)}
function renderEditorFormulaPreview(){renderFormulaPreview($('#edit-form').elements.latex,$('#editor-formula-preview'))}
function citationFromCrossref(work){const title=(work.title||[])[0]||'未提供题名',doi=work.DOI||'',authors=(work.author||[]).slice(0,3).map(a=>[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean).join(', '),extra=(work.author||[]).length>3?' et al.':'',year=(work.issued||work['published-print']||work['published-online'])?.['date-parts']?.[0]?.[0]||'无年份',source=(work['container-title']||[])[0]||work.publisher||'',volume=work.volume||'',issue=work.issue?'('+work.issue+')':'',pages=work.page?': '+work.page:'';
 const type=/book/.test(work.type||'')?'M':/journal/.test(work.type||'')?'J':'EB/OL';
 const citation=[authors+extra,title+'['+type+']',source,year+(volume?', '+volume+issue+pages:'')].filter(Boolean).join('. ').replace(/\. ,/g,',')+(doi?'. DOI: '+doi:'');
 return {title,url:work.URL||'https://doi.org/'+doi,citation}
}
function renderReferenceCandidates(works,host=$('#reference-results'),target=$('#editor-reference-rows'),queryInput=$('#reference-query')){host.replaceChildren();if(!works.length){host.textContent='未找到匹配文献，请核对 DOI 或改用标题搜索。';return}
 const note=document.createElement('p');note.textContent='请选择与原文一致的记录，再核对自动生成的引用格式。';host.append(note);
 for(const work of works){const r=citationFromCrossref(work),card=document.createElement('div');card.className='reference-candidate';const text=document.createElement('div');const title=document.createElement('strong');title.textContent=r.title;const detail=document.createElement('small');detail.textContent=((work.author||[])[0]?.family||'作者未提供')+' · '+((work.issued||work['published-online'])?.['date-parts']?.[0]?.[0]||'年份未提供')+(work.DOI?' · DOI: '+work.DOI:'');text.append(title,detail);const add=document.createElement('button');add.type='button';add.className='editor-small';add.textContent='添加此文献';add.onclick=()=>{addReferenceEditorRow(r,false,target);host.replaceChildren();queryInput.value='';notify('已添加文献，请核对引用格式')};card.append(text,add);host.append(card)}
}
async function lookupReference(queryInput=$('#reference-query'),host=$('#reference-results'),target=$('#editor-reference-rows')){const query=queryInput.value.trim();host.replaceChildren();if(!query){host.textContent='请输入 DOI、论文标题或网页链接。';return}
 const doi=query.match(/10\.\d{4,9}\/[^\s?#<>"']+/i)?.[0]?.replace(/[.,;]+$/,'');
 if(/^https?:\/\//i.test(query)&&!doi){let title='';try{const response=await fetch(query,{signal:AbortSignal.timeout(7000)});if(response.ok){const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html');title=doc.querySelector('meta[property="og:title"]')?.content||doc.title||''}}catch{}
  const url=new URL(query);title=title.trim()||decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||url.hostname).replace(/[-_]/g,' ');addReferenceEditorRow({title,url:query,citation:url.hostname+'. '+title+'[EB/OL]. '+query},false,target);host.textContent='已生成网页引用草稿。请核对页面标题、发布日期和格式。';queryInput.value='';return}
 host.textContent='正在查询 Crossref…';try{let endpoint;if(doi)endpoint='https://api.crossref.org/works/'+encodeURIComponent(doi);else{const u=new URL('https://api.crossref.org/works');u.searchParams.set('query.bibliographic',query);u.searchParams.set('rows','3');endpoint=u.href}const response=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();renderReferenceCandidates(doi?[data.message]:data.message?.items||[],host,target,queryInput)}catch(err){host.textContent='文献查询失败：'+err.message+'。可手动添加文献。'}}
let editorOcrDraft=false;
function resetEditorOcrUpright(){editorOcrDraft=false;$('#editor-upright-fix').hidden=true}
function updateEditorOcrUpright(){const button=$('#editor-upright-fix');const suggestions=editorOcrDraft?OcrUpright.find($('#edit-form').elements.latex.value,items):[];button.hidden=!suggestions.length;if(suggestions.length){const labels=[...new Set(suggestions.map(item=>item.label))].join('、');button.title='发现可修正的角标或多余内容：'+labels+'；点击一键修改';button.setAttribute('aria-label',button.title)}}
$('#editor-upright-fix').onclick=()=>{const field=$('#edit-form').elements.latex,suggestions=OcrUpright.find(field.value,items);if(!suggestions.length)return;field.value=OcrUpright.apply(field.value,suggestions);for(const symbolField of $('#editor-symbol-rows').querySelectorAll('[data-field="latex"]')){const symbolSuggestions=OcrUpright.find(symbolField.value,items);if(symbolSuggestions.length)symbolField.value=OcrUpright.apply(symbolField.value,symbolSuggestions)}field.dispatchEvent(new Event('input',{bubbles:true}));autoMatchEditorSymbols(true);$('#editor-ocr-state').textContent='已修正 '+suggestions.length+' 处角标或多余内容，请核对公式'};
$('#edit-form').elements.latex.addEventListener('input',updateEditorOcrUpright);
async function editorRecognizeImage(file,status=$('#editor-ocr-state'),field=$('#edit-form').elements.latex,preview=$('#editor-formula-preview')){if(!file||!file.type.startsWith('image/')){status.textContent='请先选择图片';return}resetEditorOcrUpright();const targetEditing=editing,targetVariant=editorVariantIndex;status.textContent='正在处理图片…';try{const draft=await FormulaOCR.recognize(file,progress=>{if(targetEditing===editing&&targetVariant===editorVariantIndex&&$('#editor').open)status.textContent=progress.stage==='download'?'正在下载公式模型 '+Math.round(progress.progress||0)+'%':progress.stage==='recognize'?'正在识别公式…':progress.stage==='model'?'正在载入公式模型…':'正在处理图片…'});if(targetEditing!==editing||targetVariant!==editorVariantIndex||!$('#editor').open)return;if(!draft){status.textContent='未识别到公式，请尝试只截取一条清晰的公式';return}field.value+=(field.value.trim()?'\n':'')+draft;editorOcrDraft=true;updateEditorOcrUpright();renderFormulaPreview(field,preview);renderEditorSubformulas();if(!editing)autoMatchEditorSymbols(true);status.textContent='已追加草稿；请对照原图核对'}catch(err){status.textContent='识别失败：'+err.message}}
$('#add-symbol-row').onclick=()=>addSymbolEditorRow({},true);
$('#add-reference-row').onclick=()=>addReferenceEditorRow({},true);
for(const kind of ['module','submodel']){const {input,box}=editorComboElements(kind);
 input.addEventListener('focus',()=>openEditorCombo(kind,true));
 input.addEventListener('input',()=>{openEditorCombo(kind,false);if(kind==='module')renderEditorCombo('submodel',true)});
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){closeEditorCombos();event.stopPropagation()}else if(event.key==='ArrowDown'){if(editorComboElements(kind).list.hidden)openEditorCombo(kind,true);editorComboElements(kind).list.querySelector('button')?.focus();event.preventDefault()}});
 box.querySelector('.editor-combo-toggle').onclick=()=>{if(!editorComboElements(kind).list.hidden){closeEditorCombos();return}input.focus({preventScroll:true});openEditorCombo(kind,true)};
}
$('#editor').addEventListener('click',event=>{if(!event.target.closest('.editor-combobox'))closeEditorCombos()});
$('#editor-auto-symbols').onclick=()=>autoMatchEditorSymbols();
$('#editor-translate-symbols').onclick=()=>translateEditorSymbols();
$('#editor-use-source').onclick=()=>{const source=items.find(item=>item.module===$('#edit-form').elements.module.value&&item.submodel===$('#edit-form').elements.submodel.value&&item.references?.length)||items.find(item=>item.references?.length);if(!source){notify('公式库中暂无可复用的文献');return}const host=$('#editor-reference-rows'),known=new Set(readReferenceEditorRows(host).map(ref=>ref.url));for(const ref of source.references||[])if(ref.url&&!known.has(ref.url)){addReferenceEditorRow(ref);known.add(ref.url)}const basis=$('#edit-form').elements.basis;if(!basis.value.trim())basis.value='引用 Fan 等（2025）；请填写对应章节、式号和适用边界。';notify('已填入论文引用；请核对新公式的具体出处')};
$('#symbol-library-search').oninput=()=>renderSymbolSuggestions();
$('#reference-lookup').onclick=()=>lookupReference();
$('#reference-query').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();lookupReference()}};
$('#editor-image').onchange=event=>{const file=event.target.files?.[0];if(file)editorRecognizeImage(file);event.target.value=''};
$('#editor-paste-image').onclick=async()=>{const status=$('#editor-ocr-state');if(!navigator.clipboard?.read){status.textContent='浏览器暂不支持读取图片，请在编辑窗口按 Ctrl+V 粘贴';return}try{const entries=await navigator.clipboard.read();for(const entry of entries){const type=entry.types.find(value=>value.startsWith('image/'));if(type){editorRecognizeImage(await entry.getType(type));return}}status.textContent='剪贴板中没有图片'}catch(error){status.textContent='无法读取剪贴板：'+error.message+'；也可按 Ctrl+V 粘贴'}};
$('#editor').addEventListener('paste',event=>{const item=[...(event.clipboardData?.items||[])].find(entry=>entry.type.startsWith('image/'));const file=item?.getAsFile();if(file){event.preventDefault();editorRecognizeImage(file)}});
$('#edit-form').elements.latex.addEventListener('input',renderEditorFormulaPreview);
$('#edit-form').elements.latex.addEventListener('input',()=>renderEditorSubformulas());
let autoSymbolTimer;
$('#edit-form').elements.latex.addEventListener('input',()=>{clearTimeout(autoSymbolTimer);if(editing)return;autoSymbolTimer=setTimeout(()=>autoMatchEditorSymbols(true),650)});
