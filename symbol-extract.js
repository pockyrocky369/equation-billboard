(function(root){
 const variableCommands=new Set('alpha beta gamma delta Delta epsilon varepsilon eta theta vartheta lambda mu nu xi pi rho sigma tau phi varphi omega Omega Gamma Theta Psi'.split(' '));
 const textCommands=new Set('text textrm textbf operatorname mathrm mathbf mathsf mathtt begin end'.split(' '));
 const skipScripts=new Set('sum prod int iint iiint lim max min');
 function group(source,start){
  if(source[start]!=='{')return null;
  let depth=0;
  for(let index=start;index<source.length;index++){
   if(source[index]==='{')depth++;
   else if(source[index]==='}'&&!--depth)return {value:source.slice(start,index+1),end:index+1};
  }
  return null;
 }
 function script(source,start){
  const marker=source[start],next=start+1;
  if(marker!=='_'&&marker!=='^')return null;
  const braced=group(source,next);
  if(braced)return {value:marker+braced.value,end:braced.end};
  const match=source.slice(next).match(/^(?:\\[A-Za-z]+|[A-Za-z0-9])/);
  return match?{value:marker+match[0],end:next+match[0].length}:null;
 }
 function extractFormulaSymbols(input){
  const source=String(input||''),output=[],seen=new Set();
  for(let index=0;index<source.length;){
   let base='',end=index;
   if(source[index]==='\\'){
    const command=source.slice(index+1).match(/^[A-Za-z]+/);
    if(!command){index+=2;continue}
    const name=command[0];end=index+name.length+1;
    if(textCommands.has(name)){
     const body=group(source,end);
     if(name==='mathrm'&&body&&/^[A-Z][A-Za-z0-9]*$/.test(body.value.slice(1,-1)))base=source.slice(index,body.end);
     end=body?.end||end;
     if(!base){index=end;continue}
    }else if(variableCommands.has(name))base=source.slice(index,end);
    else if(skipScripts.has(name)){
     while(source[end]==='_'||source[end]==='^'){const suffix=script(source,end);if(!suffix)break;end=suffix.end}
     index=end;continue;
    }else{index=end;continue}
   }else if(/[A-Za-z]/.test(source[index])){
    const match=source.slice(index).match(/^[A-Za-z][A-Za-z0-9]*/);base=match[0];end=index+base.length;
   }else{index++;continue}
   while(source[end]==='_'||source[end]==='^'){
    const suffix=script(source,end);if(!suffix)break;
    if(!(suffix.value[0]==='^'&&/^\^\{?\d+\}?$/u.test(suffix.value)))base+=suffix.value;
    end=suffix.end;
   }
   const symbol=typeof root.normalizeLatex==='function'?root.normalizeLatex(base):base;
   if(!seen.has(symbol)){seen.add(symbol);output.push(symbol)}
   index=end;
  }
  return output;
 }
 root.extractFormulaSymbols=extractFormulaSymbols;
 if(typeof module!=='undefined'&&module.exports)module.exports=extractFormulaSymbols;
})(typeof window==='undefined'?globalThis:window);
