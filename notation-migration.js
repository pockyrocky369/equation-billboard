(function (root) {
  function normalizeStoredNotation(items, normalize = root.normalizeLatex) {
    let changed = false;
    const normalizeFormula = value => {
      const latex = normalize(value);
      const suggestions = (root.OcrUpright?.find(latex, items) || []).filter(item => item.kind !== 'artifact');
      return suggestions.length ? root.OcrUpright.apply(latex, suggestions) : latex;
    };
    const update = (object, key) => {
      if (typeof object[key] !== 'string') return;
      const revised = normalize(object[key]);
      if (revised !== object[key]) { object[key] = revised; changed = true; }
    };
    for (const item of items) for (const variant of [item, ...(item.methods || [])]) {
      if (Array.isArray(variant.formulas)) {
        for (let index = 0; index < variant.formulas.length; index++) {
          const revised = normalizeFormula(variant.formulas[index]);
          if (revised !== variant.formulas[index]) { variant.formulas[index] = revised; changed = true; }
        }
      }
      if (typeof variant.latex === 'string') {
        const revised = normalizeFormula(variant.latex);
        if (revised !== variant.latex) { variant.latex = revised; changed = true; }
      }
      if (variant.formulas?.length && variant.latex !== undefined && variant.latex !== variant.formulas[0]) { variant.latex = variant.formulas[0]; changed = true; }
      for (const symbol of variant.symbols || []) {
        if (typeof root.unitToLatex === 'function' && symbol.unit !== undefined) {
          const unit = root.unitToLatex(symbol.unit);
          if (unit !== symbol.unit) { symbol.unit = unit; changed = true; }
        }
        for (const key of ['latex', 'raw']) if (typeof symbol[key] === 'string') {
          const revised = normalizeFormula(symbol[key]);
          if (revised !== symbol[key]) { symbol[key] = revised; changed = true; }
        }
        if (!symbol.latex && symbol.raw) { symbol.latex = symbol.raw; changed = true; }
        if (Array.isArray(symbol.bounds)) for (let index = 0; index < symbol.bounds.length; index++) {
          const revised = normalize(symbol.bounds[index]);
          if (revised !== symbol.bounds[index]) { symbol.bounds[index] = revised; changed = true; }
        }
      }
    }
    return changed;
  }
  root.normalizeStoredNotation = normalizeStoredNotation;
  if (typeof module !== 'undefined' && module.exports) module.exports = normalizeStoredNotation;
})(typeof window === 'undefined' ? globalThis : window);
