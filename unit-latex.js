(function (root) {
  const known = {
    'kW': String.raw`\mathrm{kW}`, 'kWh': String.raw`\mathrm{kWh}`,
    'h': String.raw`\mathrm{h}`, 'm/s': String.raw`\mathrm{m}/\mathrm{s}`,
    'm³/时段': String.raw`\mathrm{m}^{3}/\text{时段}`,
    'kg/时段': String.raw`\mathrm{kg}/\text{时段}`,
    'kg/m³': String.raw`\mathrm{kg}/\mathrm{m}^{3}`,
    'kW/m²': String.raw`\mathrm{kW}/\mathrm{m}^{2}`,
    'MJ/m³': String.raw`\mathrm{MJ}/\mathrm{m}^{3}`,
    'kW/步': String.raw`\mathrm{kW}/\text{步}`,
    '°C': String.raw`{}^{\circ}\mathrm{C}`,
    '%/°C': String.raw`\%/{}^{\circ}\mathrm{C}`,
    'USD': String.raw`\mathrm{USD}`,
    'USD/kWh': String.raw`\mathrm{USD}/\mathrm{kWh}`,
    'USD/kg CO₂': String.raw`\mathrm{USD}/(\mathrm{kg}\,\mathrm{CO}_{2})`,
    'kg CO₂': String.raw`\mathrm{kg}\,\mathrm{CO}_{2}`,
    'kg CO₂/kWh': String.raw`\mathrm{kg}\,\mathrm{CO}_{2}/\mathrm{kWh}`,
    '台': String.raw`\text{台}`, '步': String.raw`\text{步}`,
    '0 或 1': String.raw`0\text{ 或 }1`
  };
  function unitToLatex(value) {
    const source = String(value ?? '').trim();
    if (!source || source === '—') return '—';
    if (known[source]) return known[source];
    if (source.includes('\\')) return source;
    return String.raw`\text{` + source.replace(/[{}]/g, '') + '}';
  }
  root.unitToLatex = unitToLatex;
  if (typeof module !== 'undefined' && module.exports) module.exports = unitToLatex;
})(typeof window === 'undefined' ? globalThis : window);
