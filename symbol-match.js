(function (root) {
  function symbolTextKey(value) {
    return String(value || '').normalize('NFKC')
      .replace(/[\s\u2060-\u206f\u200b\ufe0e\ufe0f]/g, '')
      .replace(/,(?:k|i|j|n)(?:[+−-]1)?/g, '')
      .replace(/[()]/g, '');
  }
  function symbolNodeKeys(node) {
    const keys = [symbolTextKey(node?.textContent)];
    if (node?.localName === 'msubsup') {
      const children = [...node.children];
      if (children.length >= 2) keys.push(symbolTextKey(children[0].textContent + children[1].textContent));
    }
    return [...new Set(keys.filter(Boolean))];
  }
  function isDecoratedComponent(node) {
    for (let parent = node?.parentElement; parent; parent = parent.parentElement) {
      if (parent.localName === 'msup') {
        const [base, exponent] = [...parent.children];
        const ordinaryPower = base && exponent && (base === node || base.contains?.(node))
          && exponent.localName === 'mn' && /^\d+(?:\.\d+)?$/.test(symbolTextKey(exponent.textContent));
        if (ordinaryPower) continue;
      }
      if (['msub', 'msup', 'msubsup', 'mover', 'munder', 'munderover'].includes(parent.localName)) return true;
      if (parent.localName === 'math') break;
    }
    return false;
  }
  root.symbolTextKey = symbolTextKey;
  root.symbolNodeKeys = symbolNodeKeys;
  root.isDecoratedComponent = isDecoratedComponent;
  if (typeof module !== 'undefined' && module.exports) module.exports = { symbolTextKey, symbolNodeKeys, isDecoratedComponent };
})(typeof window === 'undefined' ? globalThis : window);
