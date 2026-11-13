(function (root) {
  const key = 'equation-billboard-english-display-v1';
  let hoverOnly = false;
  try { hoverOnly = root.localStorage.getItem(key) === 'hover'; } catch {}
  function apply() { root.document.body.classList.toggle('english-hover-only', hoverOnly); }
  function set(value) { hoverOnly = Boolean(value); try { root.localStorage.setItem(key, hoverOnly ? 'hover' : 'always'); } catch {} apply(); hide(); }
  function get() { return hoverOnly; }
  let tooltip, current;
  function hide() { if (tooltip) tooltip.hidden = true; current = null; }
  function show(target) {
    if (!hoverOnly || !target?.dataset.english) return;
    current = target;
    tooltip ||= root.document.body.appendChild(Object.assign(root.document.createElement('div'), { className: 'english-hover-tooltip', role: 'tooltip' }));
    tooltip.textContent = target.dataset.english;
    tooltip.hidden = false;
    const box = target.getBoundingClientRect();
    const top = box.bottom + 8 + tooltip.offsetHeight > root.innerHeight ? box.top - tooltip.offsetHeight - 8 : box.bottom + 8;
    tooltip.style.top = Math.max(8, top) + 'px';
    tooltip.style.left = Math.max(8, Math.min(box.left, root.innerWidth - tooltip.offsetWidth - 8)) + 'px';
  }
  root.document.addEventListener('pointerover', event => { const target = event.target.closest?.('[data-english]'); if (target && target !== current) show(target); });
  root.document.addEventListener('pointerout', event => { if (current && !current.contains(event.relatedTarget)) hide(); });
  root.document.addEventListener('focusin', event => show(event.target.closest?.('[data-english]')));
  root.document.addEventListener('focusout', hide);
  root.addEventListener('scroll', hide, true);
  root.addEventListener('resize', hide);
  root.EnglishDisplay = { get, set, apply };
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', apply, { once: true }); else apply();
})(typeof window === 'undefined' ? globalThis : window);
