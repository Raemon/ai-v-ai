// Window motion. game.js redraws the folder window and opens and closes the
// browser in a single step; this watches those changes and plays them out. The
// folder window is one window whatever folder it shows: going into another, it
// moves and resizes as a copy that crossfades from the old folder to the new.
// New, it slides in; gone, it fades where it was, and so does the browser. The
// AI's column glides when the layout re-centres (a column filling or emptying),
// and its terminal grows smoothly as it fills. game.js knows nothing of it.
(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (s) => document.querySelector(s);
  const desktop = $('#desktop');
  const agentCol = $('.agent-col');
  const files = $('#files');
  const browser = $('#browser');

  const DURATION = 440;
  const EASE = 'cubic-bezier(.25, .8, .25, 1)';
  const SCROLLERS = '.files-body, .page';

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

  let last = snapshot();

  function snapshot() {
    const open = (el) => (el && !el.hidden ? { el, rect: rest(el), scroll: scrollOf(el) } : null);
    return { folder: open(files.firstElementChild), col: rest(agentCol), browser: open(browser), layout: document.documentElement.dataset.layout };
  }

  function scrollOf(w) {
    const s = w.querySelector(SCROLLERS);
    return s ? s.scrollTop : 0;
  }

  // ------------------------------------------------------------------ copies

  let flying = null; // the folder window's copies in flight

  // A lifeless copy of a window, placed over the desktop.
  function ghost(w, rect, scroll) {
    const g = w.cloneNode(true);
    g.removeAttribute('hidden');
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

  // Cut a flight short: where its copy had got to.
  function land() {
    if (!flying) return null;
    const at = seen(flying.top);
    flying.copies.forEach((g) => g.remove());
    flying.hide.cancel();
    flying = null;
    return at;
  }

  // Moved or resized: a copy of the new window flies from the old place to the
  // new one, under a copy of the old window that fades as it goes.
  function morph(now, before, from) {
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
    flying = f;
    g.getAnimations()[0].finished.then(() => {
      if (flying !== f) return;
      copies.forEach((c) => c.remove());
      flying = null;
    }, () => {});
  }

  // The same size and place, another folder: its icons arrive, so the change shows.
  function refill(w) {
    w.querySelector('.files-body').animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease' });
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
    // One column: nothing flies between columns (phone.css slides instead). And across a change of
    // layout, the old places are the other layout's: nothing to fly from.
    if (isPhoneLayout() || before.layout !== last.layout) return;
    slideColumn(before.col, last.col);

    const now = last.folder;
    const was = before.folder;
    if (now && now.rect) {
      const from = land() || (was && was.rect);
      if (!from) appear(now.el);
      else if (!same(from, now.rect)) morph(now, was, from);
      else if (was && was.el.dataset.win !== now.el.dataset.win) refill(now.el);
    } else if (was) {
      vanish(was);
    }

    if (before.browser && !last.browser) vanish(before.browser);
  }

  const watch = new MutationObserver(update);
  watch.observe(files, { childList: true });
  watch.observe(browser, { attributes: true, attributeFilter: ['hidden'] });

  // ------------------------------------------------------------ the terminal
  // It's as tall as what's in it, up to its column's height. When what's in it
  // changes, it grows (or shrinks) to fit, its text held still at the top, and
  // the AI's face below it goes along.

  const term = $('#term');
  const termBody = $('#term-body');
  let termShown = term.offsetHeight;
  let resizing = null;

  function resizeTerm() {
    const from = resizing ? term.offsetHeight : termShown;
    if (resizing) resizing.cancel();
    resizing = null;
    termBody.style.overflow = '';
    const to = term.offsetHeight;
    termShown = to;
    if (Math.abs(to - from) < 1 || isPhoneLayout()) return; // the dock's height is phone.css's
    termBody.style.overflow = 'clip'; // nothing to scroll while it catches up with its text
    const a = term.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 260, easing: EASE });
    resizing = a;
    a.finished.then(() => {
      if (resizing !== a) return;
      resizing = null;
      termBody.style.overflow = '';
      termBody.scrollTop = termBody.scrollHeight; // at its full height, the newest line at the bottom again
    }, () => {});
  }

  const sizes = new ResizeObserver(resizeTerm);
  sizes.observe($('#out'));
  sizes.observe($('#actions'));
})();
