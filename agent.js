// The AI's body language. Its eyes glance at the pointer, blink, and wander
// when nothing's happening; a probe reaches out from under its face to the
// pointer over the files, and opens into brackets like the ones round its
// face round anything there it could click; it gathers itself as the player
// presses, and pulses when they click; and its face glides between the title
// screen and its place under the terminal. Cosmetic only: it listens to the
// DOM, and game.js needn't know it exists, except to call AGENT_MOTION (at the end).
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const desktop = $('#desktop');
  const title = $('#title-screen');
  const agentCol = $('.agent-col');
  const filesCol = $('.files-col');
  const files = $('#files');
  const focusCol = $('.focus-col');
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
  // A probe: one line leaves the bottom of the face, drops to a lane under the
  // columns, runs along it to the gutter beside the pointer's column, climbs
  // it, and turns in to the pointer, in right angles with rounded elbows,
  // ending in a small bulb. Its joints are on springs, so it lags and settles.
  // Over something it could click, the bulb opens into a copy of the brackets
  // round its face, closed round the thing, and the line holds their left
  // side; from there the brackets slide from one thing to the next, each edge
  // on its own spring, the leading edge quicker, so they stretch as they go
  // and settle square. Pressing grips them in; off the thing they close back
  // into the bulb. Lines are 1px on whole pixels, every frame.

  const NS = 'http://www.w3.org/2000/svg';
  const R = 6;        // elbow radius
  const LANE = 24;    // how far below the face the arm turns
  const K = 0.5523;   // Bézier handles for a quarter circle
  const OUT = 4;      // how far outside the thing the brackets sit
  const GRIP = 3;     // how far they close in on a press
  const STRETCH = 48; // how much longer than the thing they may get in flight

  function svgEl(tag, cls) {
    const n = document.createElementNS(NS, tag);
    if (cls) n.setAttribute('class', cls);
    return n;
  }

  const probe = svgEl('svg', 'probe');
  const line = svgEl('path', 'line');
  const spark = svgEl('path', 'spark');
  const bulb = svgEl('circle', 'bulb');
  line.setAttribute('pathLength', '1');
  bulb.setAttribute('r', '2.5');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.display = 'none';
  probe.append(line, spark, bulb);

  const reticle = document.createElement('div');
  reticle.className = 'reticle';
  reticle.setAttribute('aria-hidden', 'true');
  reticle.innerHTML = '<i></i><i></i><i></i><i></i>';
  reticle.style.display = 'none';
  desktop.append(probe, reticle);

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

  const arm = {
    on: false,
    reach: spring(95, 13, 0.001), // 0 tucked in, 1 out; overshoots a little
    gx: spring(260, 30, 0.1),     // the gutter it climbs
    ty: spring(170, 21, 0.1),     // the end
    tx: spring(150, 19, 0.1),
    spark: -1,                    // a click running out along the line, 0…1
  };
  const L = spring(210, 25, 0.05);
  const T = spring(210, 25, 0.05);
  const Rt = spring(210, 25, 0.05);
  const B = spring(210, 25, 0.05);
  const edges = [L, T, Rt, B];
  const open = spring(160, 24, 0.002); // 0 a bulb, 1 brackets
  const springs = [arm.reach, arm.gx, arm.ty, arm.tx, ...edges, open];
  let grip = 0;
  let letGo = 0;
  let tip = null; // where the bulb was last drawn

  // Aim the arm at `p` (desktop pixels): up the gutter beside its column, and in.
  function aimArm(p, d, gap) {
    const col = local(agentCol, d);
    const right = local(filesCol, d);
    const focus = local(focusCol, d);
    const mid = files.offsetParent ? local(files, d) : null;
    const gutterL = (col.x + col.w + right.x) / 2;
    const gutterR = mid ? (mid.x + mid.w + focus.x) / 2 : gutterL;
    arm.gx.to = mid && p.x > gutterR ? gutterR : gutterL;
    arm.ty.to = p.y;
    arm.tx.to = Math.max(p.x - gap, arm.gx.to + 2 * R);
  }

  function aim(d) {
    if (held) {
      const r = local(held, d);
      const o = OUT - grip;
      L.to = Math.round(r.x) - o;
      T.to = Math.round(r.y) - o;
      Rt.to = Math.round(r.x + r.w) + o;
      B.to = Math.round(r.y + r.h) + o;
      aimArm({ x: L.to, y: (T.to + B.to) / 2 }, d, 0);
    } else {
      if (pointer && arm.on) aimArm({ x: (pointer.x - d.left) / d.k, y: (pointer.y - d.top) / d.k }, d, 10);
      if (tip) { // the brackets close back into the bulb
        L.to = Math.round(tip.x) - 3;
        Rt.to = Math.round(tip.x) + 3;
        T.to = Math.round(tip.y) - 3;
        B.to = Math.round(tip.y) + 3;
      }
    }
  }

  // Keep the brackets no longer than the thing plus STRETCH, nor smaller than
  // a dot, by pulling in whichever edge is further from home.
  function limit(a, b) {
    const span = b.to - a.to;
    const now = b.x - a.x;
    const out = now > span + STRETCH ? now - span - STRETCH : now < 6 ? now - 6 : 0;
    if (!out) return;
    if (Math.abs(a.to - a.x) > Math.abs(b.to - b.x)) a.x += out;
    else b.x -= out;
  }

  // An orthogonal polyline as an SVG path with rounded corners.
  function route(pts) {
    const P = [];
    for (const p of pts) {
      const q = P[P.length - 1];
      if (q && Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01) continue;
      const o = P[P.length - 2];
      if (o && ((Math.abs(o[0] - q[0]) < 0.01 && Math.abs(q[0] - p[0]) < 0.01) || (Math.abs(o[1] - q[1]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01))) {
        P[P.length - 1] = p; // straight on: no corner here
        continue;
      }
      P.push(p);
    }
    const n = P.length;
    if (n < 2) return '';
    const f = (p) => p[0].toFixed(2) + ',' + p[1].toFixed(2);
    const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dir = [];
    for (let i = 0; i < n - 1; i++) {
      const l = dist(P[i], P[i + 1]);
      dir.push([(P[i + 1][0] - P[i][0]) / l, (P[i + 1][1] - P[i][1]) / l]);
    }
    let d = 'M' + f(P[0]);
    for (let i = 1; i < n - 1; i++) {
      const a = dir[i - 1];
      const b = dir[i];
      const r = Math.max(0, Math.min(R, dist(P[i - 1], P[i]) / (i > 1 ? 2 : 1), dist(P[i], P[i + 1]) / (i < n - 2 ? 2 : 1)));
      const s = [P[i][0] - a[0] * r, P[i][1] - a[1] * r];
      const e = [P[i][0] + b[0] * r, P[i][1] + b[1] * r];
      d += `L${f(s)}C${f([s[0] + a[0] * r * K, s[1] + a[1] * r * K])} ${f([e[0] - b[0] * r * K, e[1] - b[1] * r * K])} ${f(e)}`;
    }
    return d + 'L' + f(P[n - 1]);
  }

  // The middle of a pixel: a 1px line there stays sharp.
  const px = (v) => Math.round(v - 0.5) + 0.5;
  const clamp = (v) => Math.max(0, Math.min(1, v));

  function draw(d) {
    const fr = local(face, d);
    const sx = px(fr.x + fr.w / 2);
    const sy = px(fr.y + fr.h - 1);
    const lane = sy + LANE;
    const reach = Math.max(0, arm.reach.x);
    const over = Math.max(0, reach - 1) * 90; // a springy overshoot
    const k = clamp(open.x);
    // The end: free at the pointer, or holding the brackets' left side.
    const ex = px((arm.tx.x + over) * (1 - k) + L.x * k);
    const ey = px(arm.ty.x * (1 - k) + ((T.x + B.x) / 2) * k);
    const gx = px(arm.gx.x);
    const pts = [[sx, sy], [sx, lane], [gx, lane], [gx, ey], [ex, ey]];
    const a = Math.min(1, reach);
    const path = route(pts);
    line.setAttribute('d', path);
    spark.setAttribute('d', path);
    line.style.strokeDasharray = `${a} 2`;
    line.style.visibility = a > 0.003 ? '' : 'hidden';

    const len = line.getTotalLength();
    const at = line.getPointAtLength(a * len);
    tip = { x: at.x, y: at.y };
    const shown = clamp((a - 0.55) / 0.4);
    bulb.setAttribute('cx', at.x);
    bulb.setAttribute('cy', at.y);
    bulb.style.opacity = shown * clamp(1 - k * 2.5);

    const x = Math.round(L.x);
    const y = Math.round(T.x);
    reticle.style.transform = `translate(${x}px, ${y}px)`;
    reticle.style.width = Math.max(6, Math.round(Rt.x) - x) + 'px';
    reticle.style.height = Math.max(6, Math.round(B.x) - y) + 'px';
    reticle.style.opacity = (shown * clamp(k * 1.6)).toFixed(3);
    reticle.style.display = k > 0.004 ? '' : 'none';

    if (arm.spark >= 0) {
      spark.style.strokeDasharray = `16 ${len + 40}`;
      spark.style.strokeDashoffset = 16 - arm.spark * a * len;
      spark.style.opacity = 1 - arm.spark ** 4;
    } else {
      spark.style.opacity = 0;
    }
  }

  let raf = 0;
  let then = 0;

  function tick(now) {
    raf = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (now - then) / 1000));
    then = now;
    const d = frame();
    if (held && (!held.isConnected || !held.getClientRects().length)) rehold();
    aim(d);
    if (reduceMotion) springs.forEach(snap);
    else {
      [arm.reach, arm.gx, arm.ty, arm.tx, open].forEach((s) => step(s, dt));
      step(L, dt, L.to < L.x);
      step(T, dt, T.to < T.x);
      step(Rt, dt, Rt.to > Rt.x);
      step(B, dt, B.to > B.x);
      limit(L, Rt);
      limit(T, B);
    }
    if (arm.spark >= 0) {
      arm.spark += dt / 0.34;
      if (arm.spark >= 1) arm.spark = -1;
    }

    const out = arm.on || arm.reach.x > 0.003;
    probe.style.display = out ? '' : 'none';
    if (!out) {
      reticle.style.display = 'none';
      tip = null;
      return;
    }
    draw(d);
    // The AI's column may be gliding, and windows fly about as the files
    // change (motion.js): keep hold.
    const moving = !springs.every(settled) || arm.spark >= 0 ||
      agentCol.getAnimations().length > 0 || (held && filesCol.getAnimations({ subtree: true }).length > 0);
    if (moving) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (raf) return;
    then = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function setArm(on) {
    if (on === arm.on) return;
    arm.on = on;
    if (on && arm.reach.x < 0.02 && pointer) { // a fresh reach: lay the route straight to the pointer
      const d = frame();
      aimArm({ x: (pointer.x - d.left) / d.k, y: (pointer.y - d.top) / d.k }, d, 10);
      [arm.gx, arm.ty, arm.tx].forEach(snap);
    }
    arm.reach.to = on ? 1 : 0;
    Object.assign(arm.reach, on ? { k: 95, c: 13 } : { k: 150, c: 24 });
    if (!on) hold(null);
    wake();
  }

  // Over the files (not the web browser over them, nor anything on top).
  const overFiles = (t) => !!(t && t.closest && t.closest('.files-col') && !t.closest('#browser'));

  // Something you can click among the files.
  function pick(t) {
    const el = overFiles(t) && t.closest('button, a');
    if (!el || el.disabled || el.classList.contains('here') || el.classList.contains('on')) return null;
    return el;
  }

  // A redraw replaced (or hid) what it held: hold the same file in its new place, else
  // whatever's under the pointer now, else let go at once (a detached button has
  // no place to reach for).
  function rehold() {
    const key = held.dataset.path;
    const same = key && [...filesCol.querySelectorAll('[data-path]')].find((b) => b.dataset.path === key && b.getClientRects().length);
    const next = same || (pointer && pick(document.elementFromPoint(pointer.x, pointer.y)));
    if (next) hold(next);
    else release();
  }

  function hold(el) {
    if (el === held) return;
    clearTimeout(letGo);
    if (!el) {
      // A moment's grace, so crossing the gap between two files doesn't let go.
      letGo = setTimeout(release, held && arm.on ? 200 : 0);
      return;
    }
    if (open.x < 0.05 && tip) { // the bulb opens: from where it is
      [[L, tip.x - 3], [T, tip.y - 3], [Rt, tip.x + 3], [B, tip.y + 3]].forEach(([s, v]) => { s.x = Math.round(v); s.v = 0; });
    }
    held = el;
    open.to = 1;
    agent.classList.add('intent');
    lookSoon();
    wake();
  }

  function release() {
    if (!held) return;
    held = null;
    grip = 0;
    open.to = 0;
    agent.classList.remove('intent');
    lookSoon();
    wake();
  }

  function sense(t) {
    setArm(overFiles(t));
    hold(arm.on ? pick(t) : null);
  }

  document.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    still = performance.now();
    if (glance) glance = null;
    lookSoon();
    if (e.pointerType === 'touch') return;
    sense(e.target);
    if (arm.on) wake();
  });

  function pointerGone() {
    pointer = null;
    setArm(false);
    lookSoon();
  }
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointerGone(); });
  window.addEventListener('blur', pointerGone);
  const follow = () => { if (arm.on || arm.reach.x > 0.003) wake(); };
  window.addEventListener('resize', follow);
  document.addEventListener('scroll', follow, true); // a folder or file scrolled under it
  new ResizeObserver(follow).observe(agentCol);       // the terminal grows, and moves the face down
  // A click usually redraws the files: find what's under the pointer now.
  new MutationObserver(() => {
    if (held && !held.isConnected) wake();
  }).observe(filesCol, { subtree: true, childList: true });

  // Something can cover the files under a still pointer: the browser, the
  // dialog, the home screen. Look again at what's under it.
  const recheck = () => { if (pointer) sense(document.elementFromPoint(pointer.x, pointer.y)); };
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
      arm.spark = 0; // the click runs out along the line
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
