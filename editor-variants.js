let editorVariants=[];
let editorVariantIndex=0;

function readEditorSubformulas(){return [...$('#editor-subformulas').querySelectorAll('.editor-subformula')].map(panel=>{const level=Number(panel.querySelector('select').value);return {index:Number(panel.dataset.lineIndex),level,role:level?'dependent':'main',label:panel.querySelector('input').value.trim(),description:panel.querySelector('textarea').value.trim()}}).filter(entry=>entry.level||entry.label||entry.description)}
function renderEditorSubformulas(relations){
 const host=$('#editor-subformulas'),lines=$('#edit-form').elements.latex.value.split('\n').map(line=>line.trim()).filter(Boolean);
 const values=new Map((relations??readEditorSubformulas()).map(entry=>[entry.index,entry]));host.replaceChildren();host.hidden=lines.length<2;if(host.hidden)return;
 const heading=document.createElement('strong');heading.textContent='多行公式设置 · 按公式行顺序';host.append(heading);
 for(let index=1;index<lines.length;index++){
  const current=values.get(index)||{},panel=document.createElement('div');panel.className='editor-subformula';panel.dataset.lineIndex=String(index);
  const summary=document.createElement('small');summary.textContent='第 '+(index+1)+' 行 · '+lines[index].slice(0,70);panel.append(summary);
  const levelLabel=document.createElement('label');levelLabel.textContent='层级';const level=document.createElement('select');
  for(const [value,text] of [['0','与主公式同级'],['1','一级子公式'],['2','二级子公式'],['3','三级子公式']]){const option=document.createElement('option');option.value=value;option.textContent=text;level.append(option)}
  level.value=String(current.level??(current.role==='dependent'?1:0));levelLabel.append(level);panel.append(levelLabel);
  const titleLabel=document.createElement('label');titleLabel.textContent='本行标题';const title=document.createElement('input');title.type='text';title.value=current.label||'';title.placeholder='例如：板温计算';titleLabel.append(title);panel.append(titleLabel);
  const explanationLabel=document.createElement('label');explanationLabel.className='subformula-explanation';explanationLabel.textContent='本行解释';const explanation=document.createElement('textarea');explanation.rows=2;explanation.value=current.description||'';explanation.placeholder='解释这一行公式的作用和适用条件';explanationLabel.append(explanation);panel.append(explanationLabel);
  host.append(panel);
 }
}

function formulaVariant(x){
 return {
  name:x?.methods?.[0]?.name||'计算方法1',
  title:x?.title||'',
  titleEn:x?.titleEn||'',
  formulas:x?.formulas||[x?.latex||''],
  lineRelations:x?.lineRelations||[],
  note:x?.note||'',
  symbols:x?.symbols||[],
  basis:x?.basis||'',
  derivation:x?.derivation||'',
  references:x?.references||[]
 };
}

function readVisibleVariant(){
 const form=$('#edit-form');
 return {
  ...editorVariants[editorVariantIndex],
  name:$('#editor-method-name').value.trim(),
  title:form.elements.title.value.trim(),
  titleEn:form.elements.titleEn.value.trim(),
  formulas:form.elements.latex.value.split('\n').map(line=>normalizeLatex(line.trim())).filter(Boolean),
  lineRelations:readEditorSubformulas(),
  note:form.elements.note.value.trim(),
  symbols:readSymbolEditorRows(),
  basis:form.elements.basis.value.trim(),
  derivation:form.elements.derivation.value.trim(),
  references:readReferenceEditorRows()
 };
}

function writeVisibleVariant(variant){
 const form=$('#edit-form');
 form.elements.title.value=variant.title||'';
 form.elements.titleEn.value=variant.titleEn||'';
 form.elements.latex.value=(variant.formulas||[]).join('\n');
 renderEditorSubformulas(variant.lineRelations||[]);
 form.elements.note.value=variant.note||'';
 form.elements.basis.value=variant.basis||'';
 form.elements.derivation.value=variant.derivation||'';
 $('#editor-method-name').value=variant.name||'';
 $('#editor-symbol-rows').replaceChildren();
 $('#editor-reference-rows').replaceChildren();
 for(const symbol of variant.symbols||[])addSymbolEditorRow(symbol);
 for(const reference of variant.references||[])addReferenceEditorRow(reference);
 $('#symbol-library-search').value='';
 $('#symbol-library-results').replaceChildren();
 $('#reference-query').value='';
 $('#reference-results').replaceChildren();
 $('#editor-ocr-state').textContent='';
 resetEditorOcrUpright();
 $('#editor-image').value='';
 renderEditorFormulaPreview();
}

function refreshVariantSelector(){
 const select=$('#editor-method-select');
 select.replaceChildren();
 editorVariants.forEach((variant,index)=>{
  const option=document.createElement('option');
  option.value=String(index);
  option.textContent=variant.name||'计算方法'+(index+1);
  select.append(option);
 });
 select.value=String(editorVariantIndex);
 $('#editor-method-switch').hidden=editorVariants.length<2;
}

function renderStructuredEditor(x,selectedIndex=0){
 const base=formulaVariant(x);
 editorVariants=x?.methods?.length>1
  ?x.methods.map(method=>({
   ...base,...method,
   name:method.name||base.name,
   title:method.title??base.title,
   titleEn:method.titleEn??base.titleEn,
   formulas:method.formulas??base.formulas,
   lineRelations:method.lineRelations??base.lineRelations,
   symbols:method.symbols??base.symbols,
   references:method.references??base.references,
   basis:method.basis??base.basis,
   derivation:method.derivation??base.derivation,
   note:method.note??base.note
  }))
  :[base];
 editorVariantIndex=Math.max(0,Math.min(selectedIndex,editorVariants.length-1));
 refreshVariantSelector();
 writeVisibleVariant(editorVariants[editorVariantIndex]);
}

function collectEditorVariants(){
 editorVariants[editorVariantIndex]=readVisibleVariant();
 for(const [index,variant] of editorVariants.entries()){
  if(!variant.title)throw Error('请填写同级公式 '+(index+1)+' 的公式名称');
  if(!variant.formulas.length)throw Error('请填写“'+variant.title+'”的 LaTeX 公式');
  if(editorVariants.length>1&&!variant.name.trim())throw Error('请填写同级公式 '+(index+1)+' 的选项名称');
 }
 const names=editorVariants.map(variant=>variant.name.trim());
 if(new Set(names).size!==names.length)throw Error('同级公式的选项名称不能重复');
 return editorVariants.map(variant=>({
  ...variant,
  formulas:[...variant.formulas],
  lineRelations:variant.lineRelations.map(relation=>({...relation})),
  symbols:variant.symbols.map(symbol=>({...symbol,bounds:[...(symbol.bounds||[])]})),
  references:variant.references.map(reference=>({...reference}))
 }));
}

$('#editor-method-select').onchange=event=>{
 editorVariants[editorVariantIndex]=readVisibleVariant();
 editorVariantIndex=Number(event.target.value);
 refreshVariantSelector();
 writeVisibleVariant(editorVariants[editorVariantIndex]);
 $('#edit-form').scrollTop=0;
};

$('#editor-method-name').oninput=event=>{
 const option=$('#editor-method-select').options[editorVariantIndex];
 if(option)option.textContent=event.target.value.trim()||'同级公式 '+(editorVariantIndex+1);
};

$('#add-method').onclick=()=>{
 editorVariants[editorVariantIndex]=readVisibleVariant();
 const source=editorVariants[editorVariantIndex];
 let number=editorVariants.length+1,name='计算方法'+number;
 while(editorVariants.some(variant=>variant.name===name))name='计算方法'+(++number);
 editorVariants.push({
  name,title:source.title,titleEn:'',formulas:[],lineRelations:[],note:'',symbols:[],basis:'',derivation:'',references:[]
 });
 editorVariantIndex=editorVariants.length-1;
 refreshVariantSelector();
 writeVisibleVariant(editorVariants[editorVariantIndex]);
 $('#edit-form').scrollTop=0;
 $('#edit-form').elements.latex.focus();
};

$('#remove-method').onclick=()=>{
 if(editorVariants.length<2)return;
 editorVariants.splice(editorVariantIndex,1);
 editorVariantIndex=Math.max(0,editorVariantIndex-1);
 refreshVariantSelector();
 writeVisibleVariant(editorVariants[editorVariantIndex]);
 $('#edit-form').scrollTop=0;
};
