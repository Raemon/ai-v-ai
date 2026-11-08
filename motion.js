// Window motion. game.js redraws the folder windows and opens and closes the
// file viewer and the browser in a single step; this watches those changes and
// plays them out. A window that moves or resizes flies there, as a copy that
// crossfades from the old content to the new; one that's new slides in; one
// that's gone fades where it was. The AI's column glides when the layout
// re-centres (the middle column filling or emptying). game.js knows nothing of it.
(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (s) => document.querySelector(s);
  const desktop = $('#desktop');
  const agentCol = $('.agent-col');
  const files = $('#files');
  const current = $('#current');
  const viewer = $('#viewer');
  const browser = $('#browser');

  const DURATION = 440;
  const EASE = 'cubic-bezier(.25, .8, .25, 1)';
  const SCROLLERS = '.files-body, .viewer-body, .page';

  // Where an element sits in the desktop's own unscaled pixels, ignoring
  // transforms (so a window mid-animation reports where it will come to rest).
  function rest(el) {
    if (!el.offsetParent) return null;
    let x = 0;
    let y = 0;
    for (let n = el; n && n !== desktop; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  // Where it is on screen right now, in the same pixels.
  function seen(el) {
    const d = desktop.getBoundingClientRect();
    const k = d.width / desktop.offsetWidth;
    const r = el.getBoundingClientRect();
    return { x: (r.left - d.left) / k, y: (r.top - d.top) / k, w: r.width / k, h: r.height / k };
  }

  const same = (a, b) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1;
  const box = (r) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });

  // ------------------------------------------------------------- the last layout

  const keyOf = (w) => (w.classList.contains('tree') ? 'tree:' : '') + w.dataset.win;
  let last = snapshot();

  function snapshot() {
    const wins = new Map();
    for (const w of [...files.children, ...current.children]) {
      if (w.dataset.win) wins.set(keyOf(w), { el: w, rect: rest(w), scroll: scrollOf(w) });
    }
    const open = (el) => (el.hidden || el.classList.contains('closing') ? null : { el, rect: rest(el), scroll: scrollOf(el) });
    return { wins, col: rest(agentCol), viewer: open(viewer), browser: open(browser) };
  }

  function scrollOf(w) {
    const s = w.querySelector(SCROLLERS);
    return s ? s.scrollTop : 0;
  }

  // ------------------------------------------------------------------ copies

  const flying = new Map(); // window key → its copies in flight

  // A lifeless copy of a window, placed over the desktop.
  function ghost(w, rect, scroll) {
    const g = w.cloneNode(true);
    g.removeAttribute('hidden');
    g.classList.remove('enter', 'closing', 'flash');
    g.classList.add('ghost');
    g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    g.removeAttribute('id');
    g.inert = true;
    g.setAttribute('aria-hidden', 'true');
    Object.assign(g.style, box(rect), { transform: '', opacity: '', transition: '' });
    desktop.append(g);
    const s = g.querySelector(SCROLLERS);
    if (s) s.scrollTop = scroll;
    return g;
  }

  function land(key) {
    const f = flying.get(key);
    if (!f) return null;
    const at = seen(f.top);
    f.copies.forEach((g) => g.remove());
    if (f.hide) f.hide.cancel();
    flying.delete(key);
    return at;
  }

  // Moved or resized: a copy of the new window flies from the old place to the
  // new one, under a copy of the old window that fades as it goes.
  function morph(key, now, before, from) {
    const to = now.rect;
    const g = ghost(now.el, from, now.scroll);
    const copies = [g];
    g.animate([box(from), box(to)], { duration: DURATION, easing: EASE, fill: 'forwards' });
    let top = g;
    if (before && before.el !== now.el) {
      const old = ghost(before.el, from, before.scroll);
      old.animate([{ ...box(from), opacity: 1 }, { opacity: 1, offset: 0.12 }, { ...box(to), opacity: 0 }], { duration: DURATION, easing: EASE, fill: 'forwards' });
      copies.push(old);
      top = old;
    }
    // The real window waits underneath (still clickable) until the copy lands on it.
    const hide = now.el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: DURATION - 20 });
    const f = { copies, top, hide };
    flying.set(key, f);
    g.getAnimations()[0].finished.then(() => {
      if (flying.get(key) !== f) return;
      copies.forEach((c) => c.remove());
      flying.delete(key);
    }, () => {});
  }

  // New: slides in from the right, where the new column opens.
  function appear(w) {
    w.animate([{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { duration: DURATION, delay: 60, easing: EASE, fill: 'backwards' });
  }

  // Gone: fades and settles where it was.
  function vanish(was) {
    if (!was.rect) return;
    const g = ghost(was.el, was.rect, was.scroll);
    g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 240, easing: 'ease', fill: 'forwards' })
      .finished.then(() => g.remove(), () => g.remove());
  }

  // ------------------------------------------------------------ the AI column

  let glide = null;

  function slideColumn(from, to) {
    if (!from || !to) return;
    let dx = from.x - to.x;
    let dy = from.y - to.y;
    if (glide && glide.playState === 'running') {
      const m = new DOMMatrixReadOnly(getComputedStyle(agentCol).transform);
      dx += m.m41;
      dy += m.m42;
      glide.cancel();
    }
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    glide = agentCol.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: DURATION, easing: EASE });
  }

  // ------------------------------------------------------------------ changes

  function update() {
    const before = last;
    last = snapshot();
    slideColumn(before.col, last.col);

    // Too many folders: game.js shrinks the old windows into a tree, and fades the tree in, itself.
    const isTree = (k) => k.startsWith('tree:');
    const hasTree = (s) => [...s.wins.keys()].some(isTree);
    const collapsing = hasTree(last) && !hasTree(before);

    for (const [key, now] of last.wins) {
      if (!now.rect) continue;
      const was = before.wins.get(key);
      const from = land(key) || (was && was.rect);
      if (!from) {
        if (!(collapsing && isTree(key))) appear(now.el);
      } else if (!same(from, now.rect)) {
        morph(key, now, was, from);
      }
    }
    if (!collapsing) {
      for (const [key, was] of before.wins) if (!last.wins.has(key)) vanish(was);
    }

    for (const k of ['viewer', 'browser']) {
      const was = before[k];
      if (!was || last[k]) continue;
      vanish(was);
      if (!was.el.hidden) was.el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 200 }); // game.js's own fade, now done by the copy
    }
  }

  const watch = new MutationObserver(update);
  watch.observe(files, { childList: true });
  watch.observe(current, { childList: true });
  watch.observe(viewer, { attributes: true, attributeFilter: ['hidden', 'class'] });
  watch.observe(browser, { attributes: true, attributeFilter: ['hidden'] });
})();
