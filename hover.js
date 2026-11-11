// Hover feedback: a soft hum (audio.js, 'hover') when the pointer comes to rest
// on something to press. Quieter on files and folders, never on anything
// disabled, and only after the pointer stays a moment and a little apart from
// the last one, so sweeping across a column of buttons doesn't chatter. The
// faint glows are in style.css; muting is audio.js's.
(() => {
  'use strict';

  const A = window.AUDIO;

  // What hums, and how loudly (0–1). Small chrome (path crumbs, ×, ‹) doesn't.
  const TARGETS = [
    ['.btn, .run', 1],
    ['.file-head .edit', 0.7],
    ['.page :is(.link, .result:not(.dead), .action)', 0.7],
    ['.icon', 0.4],
  ];
  const DWELL = 55; // ms on it before it counts as resting there
  const GAP = 140;  // ms between hums

  let waiting = null;
  let lastAt = -Infinity;

  function target(node) {
    if (!node || !node.closest) return null;
    for (const [sel, level] of TARGETS) {
      const el = node.closest(sel);
      if (el) return { el, level };
    }
    return null;
  }

  const disabled = (el) => el.disabled || el.getAttribute('aria-disabled') === 'true';

  // Its place among its siblings picks the chord tone.
  const indexOf = (el) => Array.prototype.indexOf.call(el.parentNode.children, el);

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch' || isPhoneLayout()) return; // no hum in the phone layout, like its glances
    const t = target(e.target);
    if (!t || t.el.contains(e.relatedTarget) || disabled(t.el)) return;
    clearTimeout(waiting);
    waiting = setTimeout(() => {
      waiting = null;
      if (!t.el.matches(':hover') || disabled(t.el)) return;
      const now = performance.now();
      if (now - lastAt < GAP) return;
      lastAt = now;
      A.sfx('hover', t.level, indexOf(t.el));
    }, DWELL);
  });
})();
