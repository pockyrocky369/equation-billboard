(function (root) {
  const normalize = value => String(value || '').toLowerCase().replace(/[‐‑–—-]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function score(left, right) {
    const a = normalize(left), b = normalize(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const tokensA = new Set(a.split(' ')), tokensB = new Set(b.split(' '));
    let common = 0;
    for (const token of tokensA) if (tokensB.has(token)) common++;
    return 2 * common / (tokensA.size + tokensB.size);
  }
  function references(english, library, limit = 3) {
    const matches = [];
    for (const item of library) {
      if (!item.meaningEn?.trim() || !item.meaning?.trim()) continue;
      const similarity = score(english, item.meaningEn);
      if (similarity >= .5) matches.push({ ...item, similarity });
    }
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }
  function exact(english, library) {
    return references(english, library, library.length).find(item => normalize(item.meaningEn) === normalize(english)) || null;
  }
  async function online(english, fetcher = root.fetch) {
    const phrase = String(english || '').trim();
    if (!phrase || new TextEncoder().encode(phrase).length > 500) throw Error('英文超过翻译服务的 500 字节限制');
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', phrase);
    url.searchParams.set('langpair', 'en|zh-CN');
    const response = await fetcher(url.href, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('翻译服务 HTTP ' + response.status);
    const data = await response.json();
    if (Number(data.responseStatus) !== 200) throw Error(data.responseDetails || '翻译服务未返回结果');
    const translated = String(data.responseData?.translatedText || '').trim();
    if (!translated || /^my\s?memory warning/i.test(translated)) throw Error('翻译服务未返回有效译文');
    return translated;
  }
  root.SymbolTranslation = { normalize, score, references, exact, online };
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalize, score, references, exact, online };
})(typeof window === 'undefined' ? globalThis : window);
