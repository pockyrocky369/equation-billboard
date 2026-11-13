(function (root) {
  function mergePaperEnglish(items, paperItems, normalize = root.normalizeLatex) {
    let changed = false;
    const byId = new Map(paperItems.map(item => [item.id, item]));
    for (const item of items) {
      const paper = byId.get(item.id);
      if (!paper) continue;
      if (!item.titleEn && item.title === paper.title && paper.titleEn) {
        item.titleEn = paper.titleEn;
        changed = true;
      }
      const sourceSymbols = new Map((paper.symbols || []).map(symbol => [normalize(symbol.latex || symbol.raw) + '\0' + symbol.meaning, symbol]));
      for (const symbol of item.symbols || []) {
        const source = sourceSymbols.get(normalize(symbol.latex || symbol.raw) + '\0' + symbol.meaning);
        if (!symbol.meaningEn && source?.meaningEn) { symbol.meaningEn = source.meaningEn; changed = true; }
      }
    }
    return changed;
  }
  root.mergePaperEnglish = mergePaperEnglish;
  if (typeof module !== 'undefined' && module.exports) module.exports = mergePaperEnglish;
})(typeof window === 'undefined' ? globalThis : window);
