(function (root) {
  const commonLabels = new Set(`AC DC DA EL FC PV WT UPS IT SOC LHV
    ci co wt in out max min ref av rated nominal design safe act
    charge discharge ch dis aux cmp cool net loss forecast pred
    upper lower peak idle start stop full raw meas crit`.split(/\s+/));

  function knownLabels(items) {
    const labels = new Set(commonLabels);
    for (const item of items || []) for (const variant of [item, ...(item.methods || [])]) {
      for (const symbol of variant.symbols || []) {
        const latex = symbol.latex || symbol.raw || '';
        for (const match of latex.matchAll(/\\(?:mathrm|text)\{([A-Za-z][A-Za-z0-9]*)\}/g)) labels.add(match[1]);
      }
    }
    return labels;
  }

  function scriptContent(source, brace) {
    let depth = 1;
    for (let index = brace + 1; index < source.length; index++) {
      if (source[index] === '{' && source[index - 1] !== '\\') depth++;
      if (source[index] === '}' && source[index - 1] !== '\\' && --depth === 0) {
        return { end: index + 1, value: source.slice(brace + 1, index).trim() };
      }
    }
    return null;
  }

  function find(source, items) {
    const latex = String(source || '');
    const labels = knownLabels(items);
    const suggestions = [];
    for (let index = 0; index < latex.length; index++) {
      if (!'_^'.includes(latex[index]) || latex[index - 1] === '\\') continue;
      let brace = index + 1;
      while (/\s/.test(latex[brace] || '') && brace < latex.length) brace++;
      if (latex[brace] !== '{') continue;
      const group = scriptContent(latex, brace);
      if (!group) continue;
      const value = group.value.match(/^\\(?:mathit|mathnormal)\s*\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}$/)?.[1]
        || (/^[A-Za-z][A-Za-z0-9]*$/.test(group.value) ? group.value : '');
      if (!value || value.length < 2 || value === 'prime') { index = group.end - 1; continue; }
      const likelyLabel = labels.has(value) || /^[A-Z]{2,}[A-Za-z0-9]*$/.test(value)
        || /^[a-z]{3,}[a-z0-9]*$/.test(value);
      if (likelyLabel) suggestions.push({ start: index + 1, end: group.end, label: value, replacement: `{\\mathrm{${value}}}` });
      index = group.end - 1;
    }
    for (const match of latex.matchAll(/\\begin\{array\}\{[^{}]*\}([\s\S]*?)\\end\{array\}/g)) {
      const payload = match[1].replace(/\\(?:left|right)\b|\\!/g, '').replace(/\\\||[|{}\s&\\]/g, '');
      if (!payload) suggestions.push({ start: match.index, end: match.index + match[0].length, label: '多余竖线数组', replacement: '', kind: 'artifact' });
    }
    return suggestions;
  }

  function apply(source, suggestions) {
    let result = String(source || '');
    for (const suggestion of [...suggestions].sort((a, b) => b.start - a.start)) {
      result = result.slice(0, suggestion.start) + suggestion.replacement + result.slice(suggestion.end);
    }
    return result;
  }

  root.OcrUpright = { find, apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = { find, apply };
})(typeof window === 'undefined' ? globalThis : window);
