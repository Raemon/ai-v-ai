// The AI's body language. Its eyes glance at the pointer, blink, and wander
// when nothing's happening; its attention, a copy of the brackets round its
// face, leaves it and closes round whatever the pointer is over among the
// files; it gathers itself as the player presses, and pulses when they click;
// and its face glides between the title screen and its place under the
// terminal. Cosmetic only: it listens to the DOM, and game.js needn't know it
// exists, except to call AGENT_MOTION (at the end).
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const desktop = $('#desktop');
  const title = $('#title-screen');
  const agentCol = $('.agent-col');
  const filesCol = $('.files-col');
  const agent = $('.agent .agent-icon');
  const face = agent.querySelector('.face');
  const startIcon = $('#start-normal .agent-icon');

  // The desktop's own unscaled pixels: the play area is scaled to fit the window.
  function frame() {
    const r = desktop.getBoundingClientRect();
    return { left: r.left, top: r.top, k: r.width / desktop.offsetWidth };
  }
  function local(el, d) {
    const r = el.getBoundingClientRect();
    return { x: (r.left - d.left) / d.k, y: (r.top - d.top) / d.k, w: r.width / d.k, h: r.height / d.k };
  }

  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  let pointer = null; // in client pixels; null while it's off the page
  let held = null;    // what the AI's attention is on, among the files

  // ------------------------------------------------------------------- eyes
  // Two solid lights, no pupils: the whole eye moves, as a look, not a dial.
  // Each face gets --e1, --e2 and --ey, whole pixels: where each eye sits. The
  // eye nearer the way it looks moves a little less, so they close up as if
  // the head had turned. They hold on what the attention holds rather than
  // the pointer's every twitch; blink, the second a beat behind the first;
  // sometimes blink with a big glance; and, left alone, look about the room.
  // Faces on runs that aren't available yet are asleep (style.css), and stay so.

  let looking = 0;
  let still = 0;      // when the pointer last moved
  let glance = null;  // an idle look somewhere, as -1…1 either way, or null
  const seen = new WeakMap();

  const awake = (icon) => !icon.closest('.unavailable') && icon.getClientRects().length > 0;

  function look() {
    looking = 0;
    const d = frame();
    for (const icon of document.querySelectorAll('.agent-icon:not(.flying)')) {
      const r = icon.querySelector('.face').getBoundingClientRect();
      if (!r.width || !awake(icon)) continue;
      const s = r.width / d.k;
      let gx = 0;
      let gy = 0;
      let at = pointer;
      if (icon === agent && held) {
        const h = held.getBoundingClientRect();
        at = { x: h.left + h.width / 2, y: h.top + h.height / 2 };
      }
      if (glance) [gx, gy] = glance;
      else if (at) {
        const dx = at.x - (r.left + r.width / 2);
        const dy = at.y - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const reach = Math.min(1, dist / (r.width * 3));
        if (dist) {
          gx = (dx / dist) * reach;
          gy = (dy / dist) * reach;
        }
      }
      const A = s * 0.12;
      const e1 = Math.round(gx * A * (gx > 0 ? 1 : 0.7));
      const e2 = Math.round(gx * A * (gx > 0 ? 0.7 : 1));
      const ey = Math.round(gy * s * 0.09);
      const was = seen.get(icon);
      if (was && was[0] === e1 && was[1] === e2 && was[2] === ey) continue;
      seen.set(icon, [e1, e2, ey]);
      icon.style.setProperty('--e1', e1);
      icon.style.setProperty('--e2', e2);
      icon.style.setProperty('--ey', ey);
      if (was && Math.hypot(e1 - was[0], ey - was[2]) > A * 1.3 && Math.random() < 0.35) blink(icon);
    }
  }

  const lookSoon = () => {
    if (!looking) looking = requestAnimationFrame(look);
  };

  function blink(icon) {
    if (reduceMotion || icon.classList.contains('blip')) return;
    replay(icon, 'blink');
    clearTimeout(icon.blinking);
    icon.blinking = setTimeout(() => icon.classList.remove('blink'), 260);
  }

  // Every few seconds, sometimes twice in a row.
  (function blinks() {
    for (const icon of document.querySelectorAll('.agent-icon:not(.flying)')) {
      if (!awake(icon)) continue;
      blink(icon);
      if (Math.random() < 0.15) setTimeout(() => blink(icon), 300);
    }
    setTimeout(blinks, rand(2600, 6400));
  })();

  // Left alone a while, it looks about: up at its own thoughts, across at the
  // files, down, back to the middle; and back at the pointer the moment it moves.
  const GLANCES = [[-0.2, -0.95], [0.95, -0.15], [0.35, 0.6], [-0.8, 0.1], [0, 0], [0.6, -0.7]];
  (function wander() {
    if (!reduceMotion && (!pointer || performance.now() - still > 3500)) {
      glance = glance && Math.random() < 0.4 ? null : GLANCES[Math.floor(Math.random() * GLANCES.length)];
      lookSoon();
    }
    setTimeout(wander, rand(1400, 3800));
  })();

  // ------------------------------------------------------------------ reach
  // The AI's attention, made visible: a copy of the corner brackets round its
  // face leaves it and closes round the file, folder or button the pointer is
  // over among the files, then slides from one to the next. Each edge is on
  // its own spring, the leading edge quicker than the trailing one, so it
  // stretches as it goes and settles square. Pressing grips it in a pixel or
  // two; letting go springs it back. Off the files it lets go, opening a
  // little as it fades. Sizes and places are whole pixels, every frame.

  const OUT = 4;     // how far outside the thing it holds
  const GRIP = 3;    // how far it closes in on a press
  const STRETCH = 48; // how much longer than the thing it may get in flight

  const reticle = document.createElement('div');
  reticle.className = 'reticle';
  reticle.setAttribute('aria-hidden', 'true');
  reticle.innerHTML = '<i></i><i></i><i></i><i></i>';
  reticle.style.display = 'none';
  desktop.append(reticle);

  const spring = (k, c, eps) => ({ x: 0, v: 0, to: 0, k, c, eps });
  const settled = (s) => Math.abs(s.to - s.x) < s.eps && Math.abs(s.v) < s.eps * 10;
  function step(s, dt, lead) {
    const k = lead ? 520 : s.k;
    const c = lead ? 42 : s.c;
    s.v += (k * (s.to - s.x) - c * s.v) * dt;
    s.x += s.v * dt;
  }
  function snap(s) {
    s.x = s.to;
    s.v = 0;
  }

  const L = spring(210, 25, 0.05);
  const T = spring(210, 25, 0.05);
  const Rt = spring(210, 25, 0.05);
  const B = spring(210, 25, 0.05);
  const edges = [L, T, Rt, B];
  const fade = spring(160, 24, 0.002);
  let grip = 0;
  let letGo = 0;

  // Hold `el`: aim the edges at it, OUT pixels outside (less the grip).
  function aim(el, d) {
    const r = local(el, d);
    const o = OUT - grip;
    L.to = Math.round(r.x) - o;
    T.to = Math.round(r.y) - o;
    Rt.to = Math.round(r.x + r.w) + o;
    B.to = Math.round(r.y + r.h) + o;
  }

  // Keep it no longer than the thing plus STRETCH, nor smaller than a dot,
  // by pulling in whichever edge is further from home.
  function limit(a, b) {
    const span = b.to - a.to;
    const now = b.x - a.x;
    const out = now > span + STRETCH ? now - span - STRETCH : now < 6 ? now - 6 : 0;
    if (!out) return;
    if (Math.abs(a.to - a.x) > Math.abs(b.to - b.x)) a.x += out;
    else b.x -= out;
  }

  function draw() {
    const x = Math.round(L.x);
    const y = Math.round(T.x);
    reticle.style.transform = `translate(${x}px, ${y}px)`;
    reticle.style.width = Math.max(6, Math.round(Rt.x) - x) + 'px';
    reticle.style.height = Math.max(6, Math.round(B.x) - y) + 'px';
    reticle.style.opacity = Math.max(0, Math.min(1, fade.x)).toFixed(3);
  }

  let raf = 0;
  let then = 0;

  function tick(now) {
    raf = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (now - then) / 1000));
    then = now;
    const d = frame();
    if (held && !held.isConnected) hold(pointer && pick(document.elementFromPoint(pointer.x, pointer.y)));
    if (held) aim(held, d);
    if (reduceMotion) {
      edges.forEach(snap);
      snap(fade);
    } else {
      step(L, dt, L.to < L.x);
      step(T, dt, T.to < T.x);
      step(Rt, dt, Rt.to > Rt.x);
      step(B, dt, B.to > B.x);
      step(fade, dt);
      limit(L, Rt);
      limit(T, B);
    }
    const shown = fade.to > 0 || fade.x > 0.004;
    reticle.style.display = shown ? '' : 'none';
    if (!shown) return;
    draw();
    // Windows fly about as the files change (motion.js): keep hold of the thing.
    const moving = !edges.every(settled) || !settled(fade) ||
      (held && (filesCol.getAnimations({ subtree: true }).length > 0 || agentCol.getAnimations().length > 0));
    if (moving) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (raf) return;
    then = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // Something you can click among the files (not the web browser over them, nor anything on top).
  function pick(t) {
    const el = t && t.closest && t.closest('button, a');
    if (!el || !el.closest('.files-col') || el.closest('#browser')) return null;
    if (el.disabled || el.classList.contains('here')) return null;
    return el;
  }

  function hold(el) {
    if (el === held) return;
    clearTimeout(letGo);
    if (!el) {
      // A moment's grace, so crossing the gap between two files doesn't let go.
      letGo = setTimeout(release, held ? 200 : 0);
      return;
    }
    const d = frame();
    if (fade.x < 0.05) { // a fresh reach: from the brackets round its face
      const f = local(agent, d);
      [[L, f.x], [T, f.y], [Rt, f.x + f.w], [B, f.y + f.h]].forEach(([s, v]) => { s.x = Math.round(v); s.v = 0; });
      fade.x = 0;
    }
    held = el;
    fade.to = 1;
    agent.classList.add('intent');
    aim(el, d);
    lookSoon();
    wake();
  }

  function release() {
    if (!held) return;
    held = null;
    grip = 0;
    fade.to = 0;
    L.to -= 3; T.to -= 3; Rt.to += 3; B.to += 3; // opening as it lets go
    agent.classList.remove('intent');
    lookSoon();
    wake();
  }

  document.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    still = performance.now();
    if (glance) glance = null;
    lookSoon();
    if (e.pointerType === 'touch') return;
    hold(pick(e.target));
    if (held) wake();
  });

  function pointerGone() {
    pointer = null;
    hold(null);
    lookSoon();
  }
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointerGone(); });
  window.addEventListener('blur', pointerGone);
  const follow = () => { if (held || fade.x > 0.004) wake(); };
  window.addEventListener('resize', follow);
  document.addEventListener('scroll', follow, true); // a folder or file scrolled under it
  new ResizeObserver(follow).observe(agentCol);       // the terminal grows, and moves the face down
  // A click usually redraws the files: find what's under the pointer now.
  new MutationObserver(() => {
    if (held && !held.isConnected) wake();
  }).observe(filesCol, { subtree: true, childList: true });

  // Something can cover the files under a still pointer: the browser, the
  // dialog, the home screen. Look again at what's under it.
  const recheck = () => { if (pointer) hold(pick(document.elementFromPoint(pointer.x, pointer.y))); };
  new MutationObserver(() => {
    recheck();
    lookSoon();
  }).observe(desktop, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  title.addEventListener('transitionend', recheck);

  // ------------------------------------------------------------------ pulse
  // Pressing anything that does something, the face draws in a little (on the
  // title screen, the face in that button) and the attention grips; on the
  // click, the face swells for a beat and its eyes squint, pleased.

  const actionable = (b) => b && !b.disabled && b.getAttribute('aria-disabled') !== 'true' && b.id !== 'sound';
  const iconFor = (b) => b.querySelector('.agent-icon') || agent;

  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!actionable(b)) return;
    iconFor(b).classList.add('ready');
    if (held && held.contains(e.target)) {
      grip = GRIP;
      reticle.classList.add('grip');
      wake();
    }
  });
  function unready() {
    for (const icon of document.querySelectorAll('.agent-icon.ready')) icon.classList.remove('ready');
    grip = 0;
    reticle.classList.remove('grip');
    follow();
  }
  document.addEventListener('pointerup', unready);
  document.addEventListener('pointercancel', unready);

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!actionable(b)) return;
    const icon = iconFor(b);
    icon.classList.remove('blink');
    replay(icon, 'blip');
  });
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'agent-blip') e.target.closest('.agent-icon').classList.remove('blip');
  });

  // ------------------------------------------------------- between screens
  // The face flies between the Normal Run button and its place under the
  // terminal, so a run starts and ends in the same room. Both places must be
  // laid out (the title screen not [hidden]). Each returns a promise that
  // settles when the face has landed.

  const FLIGHT = 760;

  // A copy of a face that keeps its original's size and colour, laid where its original is.
  function copyOf(icon, d) {
    const c = icon.cloneNode(true);
    const cs = getComputedStyle(icon);
    for (const p of ['--s', '--pad', '--arm', '--bw', '--c', '--e1', '--e2', '--ey']) c.style.setProperty(p, cs.getPropertyValue(p));
    c.classList.remove('blip', 'blink', 'ready', 'intent');
    c.classList.add('flying');
    const at = local(icon, d);
    Object.assign(c.style, { left: at.x + 'px', top: at.y + 'px' });
    desktop.append(c);
    return { c, at, face: local(icon.querySelector('.face'), d) };
  }

  // The transform (from the top-left corner) that lays face rect A, inside box B, over face rect C.
  function onto(B, A, C) {
    const k = C.w / A.w;
    return `translate(${C.x - B.x - (A.x - B.x) * k}px, ${C.y - B.y - (A.y - B.y) * k}px) scale(${k})`;
  }

  function fly(from, to) {
    if (reduceMotion) return Promise.resolve();
    const d = frame();
    if (!from.getClientRects().length || !to.getClientRects().length) return Promise.resolve();
    const src = copyOf(from, d);
    const dst = copyOf(to, d);
    const timing = { duration: FLIGHT, easing: 'cubic-bezier(.6, 0, .2, 1)', fill: 'forwards' };
    src.c.animate([
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.25 },
      { opacity: 0, offset: 0.7 },
      { transform: onto(src.at, src.face, dst.face), opacity: 0 },
    ], timing);
    const landing = dst.c.animate([
      { transform: onto(dst.at, dst.face, src.face), opacity: 0 },
      { opacity: 0, offset: 0.2 },
      { opacity: 1, offset: 0.6 },
      { transform: 'none', opacity: 1 },
    ], timing);
    // The real faces stay out of sight until the copy lands on one of them.
    from.animate([{ opacity: 0 }, { opacity: 0 }], { duration: FLIGHT });
    to.animate([{ opacity: 0 }, { opacity: 0 }], { duration: FLIGHT - 20 });
    const done = () => {
      src.c.remove();
      dst.c.remove();
    };
    return landing.finished.then(done, done);
  }

  // AGENT_MOTION.toGame() / .toTitle(): glide the AI's face from the Normal Run button to its in-game place, or back.
  window.AGENT_MOTION = {
    toGame: () => fly(startIcon, agent),
    toTitle: () => fly(agent, startIcon),
  };

  $('#start-normal').addEventListener('click', () => window.AGENT_MOTION.toGame());
})();
