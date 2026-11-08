// The AI's body language. Its pupils follow the pointer; a probe arm reaches
// out from under its face toward the pointer over the files; it pulses when
// the player clicks something; and its face glides between the title screen
// and its place under the terminal. Cosmetic only: it listens to the DOM, and
// game.js needn't know it exists, except to call AGENT_MOTION (at the end).
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

  let pointer = null; // in client pixels; null while it's off the page

  // ------------------------------------------------------------------- eyes
  // Each face gets --gx and --gy (-1…1): which way the pointer is, and how far
  // up to a few faces away. The CSS turns them into slit and pupil offsets.

  let looking = 0;

  function look() {
    looking = 0;
    for (const icon of document.querySelectorAll('.agent-icon')) {
      const r = icon.querySelector('.face').getBoundingClientRect();
      let gx = 0;
      let gy = 0;
      if (pointer && r.width) {
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const reach = Math.min(1, dist / (r.width * 3));
        if (dist) {
          gx = (dx / dist) * reach;
          gy = (dy / dist) * reach;
        }
      }
      icon.style.setProperty('--gx', gx.toFixed(3));
      icon.style.setProperty('--gy', gy.toFixed(3));
    }
  }

  const lookSoon = () => {
    if (!looking) looking = requestAnimationFrame(look);
  };

  // ------------------------------------------------------------------ probe
  // Two parallel strands leave the bottom of the face, drop to a lane under
  // the columns, run along it to the gutter beside the pointer's column, climb
  // it, and turn in to the pointer: right angles, rounded elbows. The joints
  // follow the pointer on springs, so the arm lags and settles; it reaches
  // out when the pointer enters the files and draws back in when it leaves.

  const NS = 'http://www.w3.org/2000/svg';
  const R = 10;     // elbow radius, on the centre line
  const GAP = 2.5;  // each strand's offset from the centre line
  const LANE = 24;  // how far below the face the arm turns
  const K = 0.5523; // Bézier handles for a quarter circle

  function svgEl(tag, cls) {
    const n = document.createElementNS(NS, tag);
    if (cls) n.setAttribute('class', cls);
    return n;
  }

  const probe = svgEl('svg', 'probe');
  const strandA = svgEl('path', 'a');
  const strandB = svgEl('path', 'b');
  const spine = svgEl('path', 'spark');
  const ring = svgEl('circle', 'ring');
  const tip = svgEl('circle', 'tip');
  strandA.setAttribute('pathLength', '1');
  strandB.setAttribute('pathLength', '1');
  tip.setAttribute('r', '2.4');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.display = 'none';
  probe.append(strandB, strandA, spine, ring, tip);
  desktop.append(probe);

  const spring = (k, c, eps) => ({ x: 0, v: 0, to: 0, k, c, eps });
  const settled = (s) => Math.abs(s.to - s.x) < s.eps && Math.abs(s.v) < s.eps * 10;
  function step(s, dt) {
    s.v += (s.k * (s.to - s.x) - s.c * s.v) * dt;
    s.x += s.v * dt;
  }
  function snap(s) {
    s.x = s.to;
    s.v = 0;
  }

  const arm = {
    on: false,
    reach: spring(95, 13, 0.001), // 0 tucked in, 1 at the pointer; overshoots a little
    trail: spring(60, 11, 0.001), // the second strand, a beat behind the first
    gx: spring(260, 30, 0.1),     // the gutter it climbs
    ty: spring(170, 21, 0.1),     // the tip
    tx: spring(150, 19, 0.1),
    spark: -1,                    // a click running out along the arm, 0…1
    flash: 0,                     // and landing at the tip, 1…0
  };
  const joints = [arm.gx, arm.ty, arm.tx];
  const springs = [arm.reach, arm.trail, ...joints];

  // Where the joints should go for the pointer's position.
  function aim(d) {
    const p = { x: (pointer.x - d.left) / d.k, y: (pointer.y - d.top) / d.k };
    const col = local(agentCol, d);
    const right = local(filesCol, d);
    const focus = local(focusCol, d);
    const mid = files.offsetParent ? local(files, d) : null;
    const gutterL = (col.x + col.w + right.x) / 2;
    const gutterR = mid ? (mid.x + mid.w + focus.x) / 2 : gutterL;
    arm.gx.to = mid && p.x > gutterR ? gutterR : gutterL;
    arm.ty.to = Math.min(p.y, col.y + col.h - 2);
    arm.tx.to = Math.max(p.x - 10, arm.gx.to + 2 * R);
  }

  // An orthogonal polyline as an SVG path with rounded corners, offset `off`
  // to one side; a corner's radius grows or shrinks by the offset, so strands
  // either side of the same line stay parallel round the bends.
  function route(pts, off) {
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
    const dir = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = P[i + 1][0] - P[i][0];
      const dy = P[i + 1][1] - P[i][1];
      const l = Math.hypot(dx, dy);
      dir.push([dx / l, dy / l]);
    }
    const V = P.map((p, i) => {
      let ox = 0;
      let oy = 0;
      if (i > 0) { ox -= dir[i - 1][1]; oy += dir[i - 1][0]; }
      if (i < n - 1) { ox -= dir[i][1]; oy += dir[i][0]; }
      return [p[0] + off * ox, p[1] + off * oy];
    });
    const f = (p) => p[0].toFixed(2) + ',' + p[1].toFixed(2);
    const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = 'M' + f(V[0]);
    for (let i = 1; i < n - 1; i++) {
      const a = dir[i - 1];
      const b = dir[i];
      const inside = (V[i][0] - P[i][0]) * (b[0] - a[0]) + (V[i][1] - P[i][1]) * (b[1] - a[1]) > 0;
      const r = Math.max(0, Math.min(R + (inside ? -1 : 1) * Math.abs(off),
        dist(V[i - 1], V[i]) / (i > 1 ? 2 : 1), dist(V[i], V[i + 1]) / (i < n - 2 ? 2 : 1)));
      const s = [V[i][0] - a[0] * r, V[i][1] - a[1] * r];
      const e = [V[i][0] + b[0] * r, V[i][1] + b[1] * r];
      d += `L${f(s)}C${f([s[0] + a[0] * r * K, s[1] + a[1] * r * K])} ${f([e[0] - b[0] * r * K, e[1] - b[1] * r * K])} ${f(e)}`;
    }
    return d + 'L' + f(V[n - 1]);
  }

  function draw(d) {
    const fr = local(face, d);
    const sx = fr.x + fr.w / 2;
    const sy = fr.y + fr.h - 0.5;
    const lane = sy + LANE;
    const reach = Math.max(0, arm.reach.x);
    const over = Math.max(0, reach - 1) * 90; // a springy overshoot past the pointer
    const pts = [[sx, sy], [sx, lane], [arm.gx.x, lane], [arm.gx.x, arm.ty.x], [arm.tx.x + over, arm.ty.x]];
    const a = Math.min(1, reach);
    const b = Math.min(1, Math.max(0, arm.trail.x));
    spine.setAttribute('d', route(pts, 0));
    strandA.setAttribute('d', route(pts, GAP));
    strandB.setAttribute('d', route(pts, -GAP));
    strandA.style.strokeDasharray = `${a} 2`;
    strandB.style.strokeDasharray = `${b} 2`;
    strandA.style.visibility = a > 0.003 ? '' : 'hidden';
    strandB.style.visibility = b > 0.003 ? '' : 'hidden';

    const len = spine.getTotalLength();
    const at = spine.getPointAtLength(a * len);
    const shown = Math.max(0, Math.min(1, (a - 0.55) / 0.4));
    tip.setAttribute('cx', at.x);
    tip.setAttribute('cy', at.y);
    tip.style.opacity = shown;
    ring.setAttribute('cx', at.x);
    ring.setAttribute('cy', at.y);
    ring.setAttribute('r', 5.5 + (1 - arm.flash) * (arm.flash > 0 ? 7 : 0));
    ring.style.opacity = shown * (arm.flash > 0 ? arm.flash * 2 : 1);

    if (arm.spark >= 0) {
      const head = arm.spark * a * len;
      spine.style.strokeDasharray = `16 ${len + 40}`;
      spine.style.strokeDashoffset = 16 - head;
      spine.style.opacity = 1 - arm.spark ** 4;
    } else {
      spine.style.opacity = 0;
    }
  }

  let raf = 0;
  let then = 0;

  function tick(now) {
    raf = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (now - then) / 1000));
    then = now;
    const d = frame();
    if (arm.on && pointer) aim(d);
    if (reduceMotion) springs.forEach(snap);
    else springs.forEach((s) => step(s, dt));
    if (arm.spark >= 0) {
      arm.spark += dt / 0.34;
      if (arm.spark >= 1) {
        arm.spark = -1;
        arm.flash = 1;
      }
    }
    if (arm.flash > 0) arm.flash = Math.max(0, arm.flash - dt / 0.45);

    const out = arm.on || arm.reach.x > 0.003 || arm.trail.x > 0.003;
    probe.style.display = out ? '' : 'none';
    if (!out) return;
    draw(d);
    // The AI's column may be gliding (motion.js): keep the arm attached.
    const moving = !springs.every(settled) || arm.spark >= 0 || arm.flash > 0 || agentCol.getAnimations().length > 0;
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
    if (on && arm.reach.x < 0.02) { // a fresh reach: lay the route straight to the pointer
      aim(frame());
      joints.forEach(snap);
    }
    arm.reach.to = arm.trail.to = on ? 1 : 0;
    Object.assign(arm.reach, on ? { k: 95, c: 13 } : { k: 150, c: 24 });
    wake();
  }

  // Over a folder or file (not the web browser over them, nor anything on top).
  const overFiles = (t) => !!(t && t.closest && t.closest('.files-col') && !t.closest('#browser'));

  document.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    lookSoon();
    if (e.pointerType === 'touch') return;
    setArm(overFiles(e.target));
    if (arm.on) wake();
  });

  function pointerGone() {
    pointer = null;
    setArm(false);
    lookSoon();
  }
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointerGone(); });
  window.addEventListener('blur', pointerGone);
  window.addEventListener('resize', () => { if (arm.on || arm.reach.x > 0.003) wake(); });

  // Something can cover the files under a still pointer: the browser, the
  // dialog, the home screen. Look again at what's under it.
  new MutationObserver(() => {
    if (pointer) setArm(overFiles(document.elementFromPoint(pointer.x, pointer.y)));
    lookSoon();
  }).observe(desktop, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  title.addEventListener('transitionend', () => { if (pointer) setArm(overFiles(document.elementFromPoint(pointer.x, pointer.y))); });

  // ------------------------------------------------------------------ pulse
  // Clicking anything that does something: the face swells for a beat (on the
  // title screen, the face in that button), and a spark runs out along the arm.

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.id === 'sound') return;
    const own = b.querySelector('.agent-icon');
    replay(own || agent, 'blip');
    if (!own && arm.reach.x > 0.5) {
      arm.spark = 0;
      wake();
    }
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
    for (const p of ['--s', '--pad', '--arm', '--bw', '--c', '--gx', '--gy']) c.style.setProperty(p, cs.getPropertyValue(p));
    c.classList.remove('blip');
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
