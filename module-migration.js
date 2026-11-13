(function(root){
 const legacy='燃气与氢能转换',gas='燃气转换',hydrogen='氢能转换';
 function destination(submodel){
  return /氢|电解|燃料电池/.test(String(submodel||''))&&!/甲烷/.test(String(submodel||''))?hydrogen:gas;
 }
 function splitFuelAndHydrogen(items,catalog){
  const legacyIndex=catalog.findIndex(entry=>entry.name===legacy);
  const old=catalog[legacyIndex];
  const affected=items.filter(item=>item.module===legacy);
  if(!old&&!affected.length)return false;
  for(const item of affected)item.module=destination(item.submodel);
  if(old)catalog.splice(legacyIndex,1);
  const insertAt=legacyIndex<0?Math.min(2,catalog.length):legacyIndex;
  for(const [offset,name] of [gas,hydrogen].entries()){
   let entry=catalog.find(value=>value.name===name);
   if(!entry){entry={name,submodels:[]};catalog.splice(insertAt+offset,0,entry)}
   const names=[...(old?.submodels||[]),...affected.map(item=>item.submodel)].filter(submodel=>destination(submodel)===name);
   for(const submodel of names)if(submodel&&!entry.submodels.includes(submodel))entry.submodels.push(submodel);
  }
  return true;
 }
 function normalizeUnitRanges(items){
  let changed=false;
  for(const item of items)for(const variant of [item,...(item.methods||[])])for(const symbol of variant.symbols||[]){
   if(!/^0\s*[–-]\s*1$/.test(symbol.unit||''))continue;
   symbol.unit='—';symbol.bounds=Array.isArray(symbol.bounds)?symbol.bounds:[];
   const latex=symbol.latex||symbol.raw;
   if(latex&&!symbol.bounds.some(bound=>bound.includes('0\\le '+latex)))symbol.bounds.push('0\\le '+latex+'\\le 1');
   changed=true;
  }
  return changed;
 }
 function normalizeLineHierarchy(items){
  let changed=false;
  for(const item of items)for(const variant of [item,...(item.methods||[])]){
   if(!Array.isArray(variant.lineRelations))continue;
   for(const entry of variant.lineRelations){const level=Number(entry.level??(entry.role==='dependent'?1:0));if(entry.level!==level){entry.level=level;changed=true}const role=level?'dependent':'main';if(entry.role!==role){entry.role=role;changed=true}}
  }
  return changed;
 }
 root.splitFuelAndHydrogen=splitFuelAndHydrogen;
 root.normalizeUnitRanges=normalizeUnitRanges;
 root.normalizeLineHierarchy=normalizeLineHierarchy;
 if(typeof module!=='undefined'&&module.exports){module.exports=splitFuelAndHydrogen;module.exports.normalizeUnitRanges=normalizeUnitRanges;module.exports.normalizeLineHierarchy=normalizeLineHierarchy}
})(typeof window==='undefined'?globalThis:window);
