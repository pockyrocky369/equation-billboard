(function (root) {
  const sub = Object.fromEntries([...`₀₁₂₃₄₅₆₇₈₉`].map((char, index) => [char, String(index)]));
  Object.assign(sub, { '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')', 'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u', 'ᵥ': 'v', 'ₓ': 'x' });
  const sup = Object.fromEntries([...`⁰¹²³⁴⁵⁶⁷⁸⁹`].map((char, index) => [char, String(index)]));
  Object.assign(sup, { '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h', 'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ⁿ': 'n', 'ᵒ': 'o', 'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z' });
  const greek = { α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', Δ: 'Delta', ε: 'epsilon', η: 'eta', θ: 'theta', ϑ: 'vartheta', λ: 'lambda', μ: 'mu', ν: 'nu', ξ: 'xi', π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', φ: 'phi', ϕ: 'varphi', ω: 'omega', Ω: 'Omega', Γ: 'Gamma', Θ: 'Theta', Ψ: 'Psi' };
  function toLatexSource(input) {
    const source = String(input ?? '');
    let output = '';
    for (let index = 0; index < source.length; index++) {
      const char = source[index];
      const map = sub[char] !== undefined ? sub : sup[char] !== undefined ? sup : null;
      if (map) {
        let value = '', end = index;
        while (map[source[end]] !== undefined) value += map[source[end++]];
        output += (map === sub ? '_{' : '^{') + value + '}';
        index = end - 1;
      } else if (greek[char]) {
        output += '\\' + greek[char] + (/[A-Za-z]/.test(source[index + 1] || '') ? ' ' : '');
      } else output += char;
    }
    return output;
  }
  root.toLatexSource = toLatexSource;
  if (typeof module !== 'undefined' && module.exports) module.exports = toLatexSource;
})(typeof window === 'undefined' ? globalThis : window);
