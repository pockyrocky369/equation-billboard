(function (root) {
  // Physical labels and descriptive qualifiers are upright. Indices such as
  // i, j, k, n, omega and tau remain mathematical variables.
  const labels = new Set(`AC DC DA W EL B FC H IT UPS AUX REG RO S D SOC LHV
    bus inv aux cmp cool batch ctrl dry res bridge gap idle start stop
    av ref cand use curt on off up down max min lo hi act safe full term
    design event meas peak fill tank in out ch dis charge discharge
    net fix crit loss ext water demand supply rated raw pred forecast MPC H2
    reserve emergency base nominal upper lower eta PV WT NT
    pv wt ci co stc soc amb noct cell inverter`.split(/\s+/));
  const protectedCommands = /\\(?:mathrm|mathbf|mathsf|mathtt|text|operatorname)\{[^{}]*\}/g;
  function argument(source) {
    const protectedParts = [];
    const masked = normalizeLatex(source).replace(protectedCommands, match => `@@${protectedParts.push(match) - 1}@@`);
    return masked.replace(/\\[A-Za-z]+|[A-Za-z]+/g, token =>
      token.startsWith('\\') || !labels.has(token) ? token : `\\mathrm{${token}}`
    ).replace(/@@(\d+)@@/g, (_, index) => protectedParts[+index]);
  }
  function normalizeLatex(input) {
    const source = typeof root.toLatexSource === 'function' ? root.toLatexSource(input) : String(input ?? '');
    let output = '';
    for (let i = 0; i < source.length; i++) {
      const marker = source[i];
      if (marker !== '_' && marker !== '^') { output += marker; continue; }
      output += marker;
      if (source[i + 1] === '{') {
        let depth = 1, end = i + 2;
        for (; end < source.length && depth; end++) {
          if (source[end] === '{') depth++;
          else if (source[end] === '}') depth--;
        }
        if (depth) continue;
        output += '{' + argument(source.slice(i + 2, end - 1)) + '}';
        i = end - 1;
      } else if (/[A-Za-z]/.test(source[i + 1] || '')) {
        let end = i + 1;
        while (/[A-Za-z]/.test(source[end] || '')) end++;
        const word = source.slice(i + 1, end);
        const label = [...labels].filter(candidate => word.startsWith(candidate)).sort((a,b) => b.length - a.length)[0];
        if(label){output += `{\\mathrm{${label}}}`;i += label.length}
        else {output += word;i = end - 1}
      }
    }
    return output;
  }
  root.normalizeLatex = normalizeLatex;
  if (typeof module !== 'undefined' && module.exports) module.exports = normalizeLatex;
})(typeof window === 'undefined' ? globalThis : window);
