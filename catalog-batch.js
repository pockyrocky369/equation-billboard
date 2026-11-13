// The catalog manages formula cards and the alternative calculations inside them.
const catalogSelection=new Set();
let catalogEditMode=false;
const catalogMainTargets=new Map();
const catalogBaseShowView=showView;
showView=function(view){
 if(view!=='catalog'){catalogEditMode=false;catalogSelection.clear();catalogEndDrag()}
 catalogBaseShowView(view);
};
const catalogKey=(kind,id,index='')=>JSON.stringify([kind,id,index]);
const catalogSelectionParts=()=>[...catalogSelection].map(key=>JSON.parse(key));
const catalogSelectedCards=()=>new Set(catalogSelectionParts().filter(([kind])=>kind==='card').map(([,id])=>id));
function catalogEffectiveSelection(){
 const cards=catalogSelectedCards();
 return catalogSelectionParts().filter(([kind,id])=>kind==='card'||!cards.has(id));
}
function catalogFormulaTree(list){
 const byParent=new Map();
 for(const x of list){const parent=list.some(y=>y.id===x.parent)?x.parent:null;if(!byParent.has(parent))byParent.set(parent,[]);byParent.get(parent).push(x)}
 const output=[],seen=new Set();
 function visit(parent,depth){for(const x of byParent.get(parent)||[]){if(seen.has(x.id))continue;seen.add(x.id);output.push({item:x,depth});visit(x.id,depth+1)}}
 visit(null,0);for(const x of list)if(!seen.has(x.id))visit(x.parent,0);
 return output;
}
function catalogVariantName(method,index){return method.name||method.title||'计算方法'+(index+1)}
function catalogJump(id,index){if(index!==undefined)methodSelection.set(id,index);jump(id)}
function catalogSyncMethodBase(x){
 const methods=x.methods||[];
 if(!methods.length)return;
 const first=methods[0];
 for(const key of ['title','formulas','lineRelations','note','symbols','basis','derivation','references'])if(first[key]!==undefined)x[key]=structuredClone(first[key]);
 x.latex=x.formulas?.[0]||x.latex;
 if(methods.length===1)x.methods=[];
 methodSelection.delete(x.id);
}
function catalogNewId(oldId){
 const base=String(oldId)+'-copy';let candidate=base,n=2;
 while(items.some(x=>x.id===candidate))candidate=base+'-'+n++;
 return candidate;
}
function catalogUniqueName(methods,original){
 const base=(original||'计算方式')+'（副本）';let candidate=base,n=2;
 while(methods.some(m=>m.name===candidate))candidate=(original||'计算方式')+'（副本 '+n+++'）';
 return candidate;
}
function catalogNormalizeOrder(){
 const ordered=[],included=new Set();
 for(const mod of catalog)for(const sub of mod.submodels)for(const {item} of catalogFormulaTree(items.filter(x=>x.module===mod.name&&(x.submodel||x.title)===sub))){
  if(!included.has(item.id)){ordered.push(item);included.add(item.id)}
 }
 for(const item of items)if(!included.has(item.id))ordered.push(item);
 items=ordered;
}
function catalogRefresh(message){catalogEndDrag();catalogNormalizeOrder();catalogSelection.clear();recordChange('批量编辑',message);render();notify(message)}
function catalogMoveSelection(direction){
 const selected=catalogEffectiveSelection();if(!selected.length)return;
 const cardIds=new Set(selected.filter(([kind])=>kind==='card').map(([,id])=>id));
 const variantByCard=new Map();
 for(const [kind,id,index] of selected)if(kind==='variant'){
  if(!variantByCard.has(id))variantByCard.set(id,new Set());variantByCard.get(id).add(Number(index));
 }
 let changed=0;
 for(const [id,indexes] of variantByCard){const x=items.find(y=>y.id===id),methods=x?.methods;if(!methods?.length)continue;
  const order=direction<0?[...methods.keys()].slice(1):[...methods.keys()].slice(0,-1).reverse();
  for(const i of order){const j=i+direction;if(indexes.has(i)&&!indexes.has(j)){
   [methods[i],methods[j]]=[methods[j],methods[i]];indexes.delete(i);indexes.add(j);changed++;
  }}catalogSyncMethodBase(x);
 }
 const modules=new Set(items.map(x=>x.module+'\u0000'+x.submodel));
 for(const key of modules){const [module,submodel]=key.split('\u0000');const siblingGroups=new Map();
  for(const x of items.filter(y=>y.module===module&&y.submodel===submodel)){const parent=x.parent||'';if(!siblingGroups.has(parent))siblingGroups.set(parent,[]);siblingGroups.get(parent).push(x)}
  for(const siblings of siblingGroups.values()){const order=direction<0?[...siblings.keys()].slice(1):[...siblings.keys()].slice(0,-1).reverse();
   for(const i of order){const j=i+direction;if(cardIds.has(siblings[i].id)&&!cardIds.has(siblings[j].id)){
    const a=items.indexOf(siblings[i]),b=items.indexOf(siblings[j]);[items[a],items[b]]=[items[b],items[a]];
    [siblings[i],siblings[j]]=[siblings[j],siblings[i]];changed++;
   }}
  }
 }
 if(changed)catalogRefresh('已调整 '+changed+' 处顺序');else notify('所选公式已在该层级的边界');
}
function catalogCopySelection(){
 const selected=catalogEffectiveSelection();if(!selected.length)return;
 const cardIds=new Set(selected.filter(([kind])=>kind==='card').map(([,id])=>id));
 const idMap=new Map([...cardIds].map(id=>[id,catalogNewId(id)]));let count=0;
 for(const x of [...items])if(cardIds.has(x.id)){
  const copy=structuredClone(x);copy.id=idMap.get(x.id);copy.sourceTag=copy.id;copy.parent=idMap.get(x.parent)||x.parent;
  copy.dependencies=(copy.dependencies||[]).map(id=>idMap.get(id)||id);
  items.splice(items.indexOf(x)+1,0,copy);count++;
 }
 const grouped=new Map();for(const [kind,id,index] of selected)if(kind==='variant'){
  if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(Number(index));
 }
 for(const [id,indexes] of grouped){const x=items.find(y=>y.id===id);if(!x?.methods?.length)continue;
  for(const index of indexes.sort((a,b)=>b-a)){const source=x.methods[index];if(!source)continue;
   const copy=structuredClone(source);copy.name=catalogUniqueName(x.methods,source.name);x.methods.splice(index+1,0,copy);count++;
  }catalogSyncMethodBase(x);
 }
 if(count)catalogRefresh('已复制 '+count+' 项');
}
function catalogDeleteSelection(){
 const selected=catalogEffectiveSelection();if(!selected.length)return;
 if(!confirm('确定删除选中的 '+selected.length+' 项？此操作会写入当前浏览器，可通过导出备份保留删除前的数据。'))return;
 const cardIds=new Set(selected.filter(([kind])=>kind==='card').map(([,id])=>id));
 const deleted=new Map(items.filter(x=>cardIds.has(x.id)).map(x=>[x.id,x]));
 items=items.filter(x=>!cardIds.has(x.id));
 for(const x of items){while(deleted.has(x.parent))x.parent=deleted.get(x.parent).parent||null;
  x.dependencies=(x.dependencies||[]).filter(id=>!cardIds.has(id));
 }
 const grouped=new Map();for(const [kind,id,index] of selected)if(kind==='variant'){
  if(!grouped.has(id))grouped.set(id,new Set());grouped.get(id).add(Number(index));
 }
 let removed=cardIds.size;
 for(const [id,indexes] of grouped){const x=items.find(y=>y.id===id);if(!x?.methods?.length)continue;
  if(indexes.size===x.methods.length){notify('至少保留一个同级公式；该组未删除');continue}
  x.methods=x.methods.filter((_,index)=>!indexes.has(index));removed+=indexes.size;catalogSyncMethodBase(x);
 }
 if(removed)catalogRefresh('已删除 '+removed+' 项');
}
function catalogMoveTo(module,submodel){
 const selected=catalogEffectiveSelection();const ids=new Set(selected.filter(([kind])=>kind==='card').map(([,id])=>id));
 if(!ids.size){notify('请先选择公式组，再移动到其他子模型');return}
 if(!module||!submodel){notify('请选择目标模块和子模型');return}
 let changed=true;while(changed){changed=false;for(const x of items)if(x.parent&&ids.has(x.parent)&&!ids.has(x.id)){ids.add(x.id);changed=true}}
 for(const x of items)if(ids.has(x.id)){x.module=module;x.submodel=submodel;if(x.parent&&!ids.has(x.parent))x.parent=null}
 normalizeCatalog();catalogRefresh('已移动 '+ids.size+' 张公式卡片到 '+module+' / '+submodel);
}
renderCatalog=function(){
 catalogMainTargets.clear();
 normalizeCatalog();heading('公式目录','按模块与子模型浏览。上级公式下的条目缩进一级；同级计算方式逐条显示。');
 const modeBar=panel('<div class="catalog-mode-bar"><span class="muted-note">'+(catalogEditMode?'拖动左侧把手移动公式；勾选后可批量拖动、复制或删除。':'点击公式可查看详情。')+'</span><button id="catalog-edit-toggle" type="button" class="'+(catalogEditMode?'ghost':'primary')+'">'+(catalogEditMode?'完成编辑':'编辑目录')+'</button></div>');
 modeBar.querySelector('#catalog-edit-toggle').onclick=()=>{catalogEditMode=!catalogEditMode;catalogSelection.clear();renderCatalog()};
 let updateCount=()=>{};
 if(catalogEditMode){
  const toolbar=panel('<div class="catalog-batch-tools"><label class="catalog-select-all"><input id="catalog-select-all" type="checkbox"> 全选公式组</label><strong id="catalog-selected-count">已选 0 项</strong><button id="catalog-copy" type="button">复制</button><button id="catalog-delete" type="button" class="catalog-danger">删除</button></div><p class="muted-note">在原目录拖动可调整顺序或放入其他子模型；拖动公式组时，右侧会出现可快速滚动的小目录。多选后拖动其中一项可一起移动。同级计算方式只能在所属公式组内排序。修改保存在当前浏览器，请定期导出备份。</p>');
  updateCount=()=>{toolbar.querySelector('#catalog-selected-count').textContent='已选 '+catalogEffectiveSelection().length+' 项'};updateCount();
  toolbar.querySelector('#catalog-select-all').onchange=e=>{catalogSelection.clear();if(e.target.checked)for(const x of items)catalogSelection.add(catalogKey('card',x.id));renderCatalog()};
  toolbar.querySelector('#catalog-copy').onclick=catalogCopySelection;
  toolbar.querySelector('#catalog-delete').onclick=catalogDeleteSelection;
 }
 for(const mod of catalog){const p=panel('<h3>'+esc(mod.name)+'</h3>');
  const moduleHeading=p.querySelector('h3');moduleHeading.classList.add('catalog-module-title');catalogMainTargets.set(JSON.stringify([mod.name,'']),moduleHeading);
  for(const sub of mod.submodels){const list=items.filter(x=>x.module===mod.name&&x.submodel===sub);if(!list.length)continue;
   const h=document.createElement('h4');h.textContent=sub+' · '+list.length+' 张卡片';p.append(h);
   catalogMainTargets.set(JSON.stringify([mod.name,sub]),h);
   if(catalogEditMode)catalogAttachSubmodelDrop(h,mod.name,sub);
   const area=document.createElement('div');area.className='catalog-formula-list';p.append(area);
   for(const {item:x,depth} of catalogFormulaTree(list)){
    const row=document.createElement('div');row.className='catalog-formula-entry';row.style.setProperty('--level',depth);
    if(catalogEditMode){row.append(catalogDragHandle('card',x.id));catalogAttachCardDrop(row,x.id);const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=catalogSelection.has(catalogKey('card',x.id));checkbox.setAttribute('aria-label','选择公式 '+displayId(x.id)+' '+x.title);
     checkbox.onchange=()=>{const key=catalogKey('card',x.id);if(checkbox.checked)catalogSelection.add(key);else catalogSelection.delete(key);updateCount()};row.append(checkbox)}
    const button=document.createElement('button');button.type='button';button.className='catalog-formula-link';button.textContent=displayId(x.id)+' · '+x.title;button.onclick=()=>catalogJump(x.id);
    row.append(button);area.append(row);
    if(x.methods?.length>1)x.methods.forEach((method,index)=>{
     const variant=document.createElement('div');variant.className='catalog-formula-entry catalog-variant-entry';variant.style.setProperty('--level',depth+1);
     if(catalogEditMode){variant.append(catalogDragHandle('variant',x.id,index));catalogAttachVariantDrop(variant,x.id,index);const select=document.createElement('input');select.type='checkbox';const key=catalogKey('variant',x.id,index);select.checked=catalogSelection.has(key);select.setAttribute('aria-label','选择同级公式 '+catalogVariantName(method,index));
      select.onchange=()=>{if(select.checked)catalogSelection.add(key);else catalogSelection.delete(key);updateCount()};variant.append(select)}
     const link=document.createElement('button');link.type='button';link.className='catalog-formula-link';link.textContent=catalogVariantName(method,index)+' · '+(method.title||x.title);link.onclick=()=>catalogJump(x.id,index);
     variant.append(link);area.append(variant);
    });
   }
  }
 }
};

let catalogDrag=null,catalogMini=null,catalogMiniTimer=null,catalogMiniScroll=0,catalogMiniPointer=null,catalogFollowKey='',catalogFollowElement=null;
function catalogDraggedCards(ids){
 const moved=new Set(ids);let changed=true;
 while(changed){changed=false;for(const x of items)if(x.parent&&moved.has(x.parent)&&!moved.has(x.id)){moved.add(x.id);changed=true}}
 return moved;
}
function catalogMoveCardsToPosition(ids,module,submodel,targetId=null,after=false){
 const moved=catalogDraggedCards(ids),target=targetId?items.find(x=>x.id===targetId):null;
 if(targetId&&(!target||moved.has(targetId))){catalogEndDrag();return false}
 const roots=items.filter(x=>ids.includes(x.id)&&!moved.has(x.parent));
 if(!roots.length){catalogEndDrag();return false}
 const originalLocations=new Map(roots.map(x=>[x.id,{module:x.module,submodel:x.submodel,parent:x.parent}]));
 for(const x of items)if(moved.has(x.id)){x.module=module;x.submodel=submodel}
 for(const x of roots){const original=originalLocations.get(x.id);
  x.parent=target?(target.parent||null):original.module===module&&original.submodel===submodel?original.parent:null;
 }
 const moving=items.filter(x=>moved.has(x.id)),remaining=items.filter(x=>!moved.has(x.id));
 let position=remaining.length;
 if(target){position=remaining.indexOf(target)+(after?1:0)}
 else {const last=remaining.findLastIndex(x=>x.module===module&&x.submodel===submodel);if(last>=0)position=last+1}
 remaining.splice(position,0,...moving);items=remaining;
 normalizeCatalog();catalogRefresh('已移动 '+roots.length+' 个公式组到 '+module+' / '+submodel);
 return true;
}
function catalogMoveVariantsToPosition(id,indexes,targetIndex,after=false){
 const x=items.find(item=>item.id===id),methods=x?.methods;
 if(!methods?.length||indexes.includes(targetIndex)){catalogEndDrag();return false}
 const moving=methods.filter((_,index)=>indexes.includes(index));
 const remaining=methods.filter((_,index)=>!indexes.includes(index));
 const target=methods[targetIndex],position=remaining.indexOf(target)+(after?1:0);
 if(position<0){catalogEndDrag();return false}
 remaining.splice(position,0,...moving);x.methods=remaining;catalogSyncMethodBase(x);
 catalogRefresh('已调整 '+moving.length+' 个同级计算方式的顺序');return true;
}
function catalogMarkDrop(row,event){
 document.querySelectorAll('.catalog-drop-before,.catalog-drop-after').forEach(node=>node.classList.remove('catalog-drop-before','catalog-drop-after'));
 const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;
 row.classList.add(after?'catalog-drop-after':'catalog-drop-before');return after;
}
function catalogEndDrag(){
 catalogDrag=null;catalogMiniScroll=0;catalogMiniPointer=null;catalogClearFollow();
 if(catalogMiniTimer){clearInterval(catalogMiniTimer);catalogMiniTimer=null}
 document.removeEventListener('dragover',catalogTrackMiniScroll);
 catalogMini?.remove();catalogMini=null;
 document.querySelectorAll('.catalog-drop-before,.catalog-drop-after,.catalog-dragging').forEach(node=>node.classList.remove('catalog-drop-before','catalog-drop-after','catalog-dragging'));
}
function catalogTrackMiniScroll(event){
 if(!catalogMini?.contains(event.target)){catalogMiniScroll=0;catalogMiniPointer=null;catalogClearFollow()}
}
function catalogClearFollow(){
 catalogFollowKey='';catalogFollowElement?.classList.remove('catalog-follow-target');catalogFollowElement=null;
 catalogMini?.querySelectorAll('.catalog-mini-target.active').forEach(target=>target.classList.remove('active'));
}
function catalogFollowMain(module,submodel){
 const key=JSON.stringify([module,submodel]);if(catalogFollowKey===key)return;
 catalogFollowKey=key;catalogFollowElement?.classList.remove('catalog-follow-target');
 const target=catalogMainTargets.get(key)||catalogMainTargets.get(JSON.stringify([module,'']));
 catalogFollowElement=target||null;if(!target)return;
 target.classList.add('catalog-follow-target');target.scrollIntoView({behavior:'smooth',block:'center'});
}
function catalogActivateMiniTarget(target){
 if(!target||!catalogMini)return;
 catalogMini.querySelectorAll('.catalog-mini-target.active').forEach(x=>x.classList.remove('active'));
 target.classList.add('active');catalogFollowMain(target.dataset.module,target.dataset.submodel);
}
function catalogShowMini(){
 const mini=document.createElement('aside');mini.className='catalog-mini-directory';mini.setAttribute('aria-label','拖动公式的目标子模型');
 const title=document.createElement('div');title.className='catalog-mini-title';title.innerHTML='<strong>移动到子模型</strong><small>拖到目标名称后松开</small>';
 const scroller=document.createElement('div');scroller.className='catalog-mini-scroll';
 for(const mod of catalog){const group=document.createElement('section'),head=document.createElement('h3');head.textContent=mod.name;group.append(head);
  for(const sub of mod.submodels){const target=document.createElement('div');target.className='catalog-mini-target';target.textContent=sub;target.dataset.module=mod.name;target.dataset.submodel=sub;target.setAttribute('role','button');target.setAttribute('aria-label','移动到 '+mod.name+' / '+sub);
   target.ondragover=event=>{if(catalogDrag?.kind!=='card')return;event.preventDefault();event.dataTransfer.dropEffect='move';catalogActivateMiniTarget(target)};
   target.ondrop=event=>{event.preventDefault();event.stopPropagation();catalogMoveCardsToPosition(catalogDrag.ids,mod.name,sub)};
   group.append(target)
  }scroller.append(group)
 }
 scroller.addEventListener('wheel',event=>{event.preventDefault();scroller.scrollTop+=event.deltaY*2.6},{passive:false});
 scroller.addEventListener('dragover',event=>{event.preventDefault();catalogMiniPointer={x:event.clientX,y:event.clientY};const rect=scroller.getBoundingClientRect(),edge=52;
  catalogMiniScroll=event.clientY<rect.top+edge?-1:event.clientY>rect.bottom-edge?1:0;
 });
 mini.append(title,scroller);document.body.append(mini);catalogMini=mini;
 document.addEventListener('dragover',catalogTrackMiniScroll);
 catalogMiniTimer=setInterval(()=>{if(!catalogMiniScroll||!catalogMini)return;scroller.scrollTop+=catalogMiniScroll*23;
  if(catalogMiniPointer){const target=document.elementFromPoint(catalogMiniPointer.x,catalogMiniPointer.y)?.closest('.catalog-mini-target');if(target&&catalogMini.contains(target))catalogActivateMiniTarget(target)}
 },16);
}
function catalogDragHandle(kind,id,index){
 const handle=document.createElement('span');handle.className='catalog-drag-handle';handle.draggable=true;handle.textContent='⠿';handle.title=kind==='card'?'拖动公式组；可拖到右侧小目录':'拖动同级计算方式排序';
 handle.setAttribute('role','button');handle.setAttribute('aria-label',handle.title);handle.tabIndex=0;
 handle.ondragstart=event=>{
  const selected=catalogEffectiveSelection(),key=catalogKey(kind,id,index??'');
  if(kind==='card'){
   const ids=catalogSelection.has(key)?selected.filter(([type])=>type==='card').map(([,itemId])=>itemId):[id];
   catalogDrag={kind,ids,sourceId:id};catalogShowMini();
  }else{
   const indexes=catalogSelection.has(key)?selected.filter(([type,itemId])=>type==='variant'&&itemId===id).map(([, ,itemIndex])=>Number(itemIndex)):[index];
   catalogDrag={kind,id,indexes,sourceIndex:index};
  }
  event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',kind==='card'?ids.join(', '):id+' / '+(index+1));
  handle.closest('.catalog-formula-entry')?.classList.add('catalog-dragging');
 };
 handle.ondragend=catalogEndDrag;
 return handle;
}
function catalogAttachCardDrop(row,targetId){
 row.ondragover=event=>{if(catalogDrag?.kind!=='card'||catalogDraggedCards(catalogDrag.ids).has(targetId))return;
  event.preventDefault();event.dataTransfer.dropEffect='move';catalogMarkDrop(row,event)};
 row.ondrop=event=>{if(catalogDrag?.kind!=='card')return;event.preventDefault();event.stopPropagation();
  const target=items.find(x=>x.id===targetId);if(!target)return;
  const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;
  catalogMoveCardsToPosition(catalogDrag.ids,target.module,target.submodel,targetId,after)
 };
}
function catalogAttachVariantDrop(row,id,index){
 row.ondragover=event=>{if(catalogDrag?.kind!=='variant'||catalogDrag.id!==id||catalogDrag.indexes.includes(index))return;
  event.preventDefault();event.dataTransfer.dropEffect='move';catalogMarkDrop(row,event)};
 row.ondrop=event=>{if(catalogDrag?.kind!=='variant'||catalogDrag.id!==id)return;event.preventDefault();event.stopPropagation();
  const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;
  catalogMoveVariantsToPosition(id,catalogDrag.indexes,index,after)
 };
}
function catalogAttachSubmodelDrop(heading,module,submodel){
 heading.classList.add('catalog-submodel-drop');
 heading.ondragover=event=>{if(catalogDrag?.kind!=='card')return;event.preventDefault();event.dataTransfer.dropEffect='move';heading.classList.add('catalog-drop-after')};
 heading.ondragleave=()=>heading.classList.remove('catalog-drop-after');
 heading.ondrop=event=>{if(catalogDrag?.kind!=='card')return;event.preventDefault();event.stopPropagation();catalogMoveCardsToPosition(catalogDrag.ids,module,submodel)};
}

let navigationDrag=null;
function catalogReorderNavigation(source,target,after){
 if(source.kind!==target.kind)return false;
 if(source.kind==='module'){
  const from=catalog.findIndex(x=>x.name===source.module),destination=catalog.find(x=>x.name===target.module);
  if(from<0||!destination||source.module===target.module)return false;
  const [moving]=catalog.splice(from,1);catalog.splice(catalog.indexOf(destination)+(after?1:0),0,moving);
  return true;
 }
 if(source.module!==target.module||source.submodel===target.submodel)return false;
 const mod=catalog.find(x=>x.name===source.module);if(!mod)return false;
 const from=mod.submodels.indexOf(source.submodel),destination=target.submodel;
 if(from<0||!mod.submodels.includes(destination))return false;
 const [moving]=mod.submodels.splice(from,1);mod.submodels.splice(mod.submodels.indexOf(destination)+(after?1:0),0,moving);
 return true;
}
const baseCatalogView=catalogView;
catalogView=function(){
 baseCatalogView();
 const blocks=[...document.querySelectorAll('#catalog-list > .catalog-block')];
 blocks.forEach((block,moduleIndex)=>{
  const mod=catalog[moduleIndex],head=block.querySelector('.catalog-row');
  catalogAttachNavigationRow(head,{kind:'module',module:mod.name});
  [...block.querySelectorAll('.catalog-row.child-row')].forEach((row,subIndex)=>catalogAttachNavigationRow(row,{kind:'submodel',module:mod.name,submodel:mod.submodels[subIndex]}));
 });
};
function catalogAttachNavigationRow(row,entry){
 const handle=document.createElement('span');handle.className='catalog-drag-handle';handle.draggable=true;handle.textContent='⠿';handle.title='拖动调整顺序';handle.setAttribute('role','button');handle.setAttribute('aria-label',entry.kind==='module'?'拖动模块 '+entry.module:'拖动子模型 '+entry.submodel);handle.tabIndex=0;
 row.prepend(handle);
 handle.ondragstart=event=>{navigationDrag=entry;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',entry.kind==='module'?entry.module:entry.submodel);row.classList.add('catalog-dragging')};
 handle.ondragend=()=>{navigationDrag=null;document.querySelectorAll('.catalog-drop-before,.catalog-drop-after,.catalog-dragging').forEach(node=>node.classList.remove('catalog-drop-before','catalog-drop-after','catalog-dragging'))};
 row.ondragover=event=>{if(!navigationDrag||navigationDrag.kind!==entry.kind||navigationDrag.module!==entry.module&&entry.kind==='submodel'||navigationDrag.module===entry.module&&navigationDrag.submodel===entry.submodel)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';catalogMarkDrop(row,event)};
 row.ondrop=event=>{if(!navigationDrag||navigationDrag.kind!==entry.kind)return;event.preventDefault();event.stopPropagation();
  const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;
  if(!catalogReorderNavigation(navigationDrag,entry,after))return;
  navigationDrag=null;catalogNormalizeOrder();recordChange('调整导航顺序',entry.kind==='module'?'模块顺序':'子模型顺序：'+entry.module);catalogView();render();notify('导航顺序已更新');
 };
}
