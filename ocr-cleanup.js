(function (root) {
  function preserveTextGroups(source) {
    const saved = [];
    let masked = '';
    for (let i = 0; i < source.length; i++) {
      const start = source.slice(i).match(/^\\(?:text|operatorname|mbox|textrm|textbf)\s*\{/);
      if (!start) { masked += source[i]; continue; }
      let depth = 1, end = i + start[0].length;
      while (end < source.length && depth) {
        if (source[end] === '{' && source[end - 1] !== '\\') depth++;
        if (source[end] === '}' && source[end - 1] !== '\\') depth--;
        end++;
      }
      if (depth) { masked += source[i]; continue; }
      masked += `\uE000${saved.length}\uE001`;
      saved.push(source.slice(i, end));
      i = end - 1;
    }
    return { masked, saved };
  }

  function compactMathSpace(source) {
    let output = '';
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (!/\s/.test(char)) { output += char; continue; }
      while (i + 1 < source.length && /\s/.test(source[i + 1])) i++;
      const next = source[i + 1] || '';
      const command = output.match(/\\[A-Za-z]+$/)?.[0];
      if (command && /[A-Za-z]/.test(next)) output += ' ';
    }
    return output;
  }

  function repairDelimiterCommands(source) {
    const stack = [], removals = [];
    for (const token of source.matchAll(/\\(?:left|right)(?![A-Za-z])/g)) {
      if (token[0] === '\\left') { stack.push(token.index); continue; }
      if (stack.length) { stack.pop(); continue; }
      let end = token.index + token[0].length;
      const delimiter = source.slice(end).match(/^(?:\\[|.]|[|.()\[\]{}])/)?.[0];
      if (delimiter === '.' || delimiter === '\\.') end += delimiter.length;
      if (delimiter === '\\|' && end + delimiter.length === source.length && !source.slice(0, token.index).includes('\\|')) end += delimiter.length;
      removals.push([token.index, end]);
    }
    for (const start of stack) {
      let end = start + '\\left'.length;
      if (source[end] === '.') end++;
      removals.push([start, end]);
    }
    for (const [start, end] of removals.sort((a, b) => b[0] - a[0])) source = source.slice(0, start) + source.slice(end);
    return source;
  }

  function removeStrayEdgeBars(source) {
    const bars = [];
    for (let index = 0; index < source.length; index++) {
      if (source[index] === '\\' && source[index + 1] === '|') { bars.push({ start: index, end: index + 2 }); index++; }
      else if (source[index] === '|') bars.push({ start: index, end: index + 1 });
    }
    if (bars.length % 2 === 0) return source;
    const last = bars[bars.length - 1];
    if (!source.slice(last.end).trim() && !/\\right$/.test(source.slice(0, last.start))) return source.slice(0, last.start);
    const first = bars[0];
    if (!source.slice(0, first.start).trim() && !/^\\left/.test(source.slice(first.end))) return source.slice(first.end);
    return source;
  }

  function cleanOcrLatex(raw) {
    return String(raw || '').replace(/\r\n?/g, '\n').split('\n').map(line => {
      const { masked, saved } = preserveTextGroups(line.trim());
      let result = removeStrayEdgeBars(repairDelimiterCommands(compactMathSpace(masked).replace(/\\!/g, '')));
      result = result.replace(/\uE000(\d+)\uE001/g, (_, index) => saved[Number(index)]);
      return result;
    }).filter(Boolean).join('\n');
  }

  root.cleanOcrLatex = cleanOcrLatex;
  if (typeof module !== 'undefined' && module.exports) module.exports = cleanOcrLatex;
})(typeof window === 'undefined' ? globalThis : window);
