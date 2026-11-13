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
  const agent = $('.agent .agent-icon');
  const face = agent.querySelector('.face');

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
  // columns, runs along it to the gutter between its column and the folder, climbs
  // it, and turns in to the pointer, in right angles with rounded elbows,
  // ending in a small bulb. Its joints are on springs, so it lags and settles.
  // Over something it could click, the bulb opens into a copy of the brackets
  // round its face, closed round the thing, and the line holds their left
  // side; from there the brackets slide from one thing to the next, each edge
  // on its own spring, the leading edge quicker, so they stretch as they go
  // and settle square. Pressing grips them in; off the thing they close back
  // into the bulb. Lines are 1px on whole pixels, every frame. Editing (Edit files…), the
  // bulb is a text cursor in small brackets, and the cursor stays inside the ones round a file.

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

  // The text cursor and its brackets, drawn from the line's end: x 0–10, y −7–7.
  const caret = svgEl('g', 'caret');
  const caretBrackets = svgEl('path', 'brackets');
  const caretBeam = svgEl('path', 'beam');
  caretBrackets.setAttribute('d', 'M0,-4V-7H3M7,-7H10V-4M0,4V7H3M7,7H10V4');
  caretBeam.setAttribute('d', 'M5,-4V4M3,-4H7M3,4H7');
  caret.append(caretBrackets, caretBeam);
  probe.append(line, spark, bulb, caret);
  const editing = () => desktop.classList.contains('editing');

  const reticle = document.createElement('div');
  reticle.className = 'reticle';
  reticle.setAttribute('aria-hidden', 'true');
  reticle.innerHTML = '<i></i><i></i><i></i><i></i>';
  reticle.style.display = 'none';

  // Aiming (Think about…, Edit files…), the probe is the pointer, anywhere on the desk, and
  // everything but what the brackets hold fades back and blurs: a veil with a hole in it.
  const aiming = () => desktop.classList.contains('aiming');
  const veil = document.createElement('div');
  veil.className = 'aim-veil';
  veil.setAttribute('aria-hidden', 'true');
  const VEIL = 2000; // how far past the desk it reaches, every way
  const NEAR = 14;   // thinking about, over nothing: the brackets stay open this far round the pointer
  desktop.append(veil, probe, reticle);

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

  // The gutter between its column and the folder, where the arm climbs.
  function gutter(d) {
    const col = local(agentCol, d);
    const right = local(filesCol, d);
    return filesCol.offsetParent ? (col.x + col.w + right.x) / 2 : col.x + col.w + 12; // empty columns take no room
  }

  // Aim the arm at `p` (desktop pixels): up the gutter beside its column, and in, from
  // whichever side of the gutter `p` is.
  function aimArm(p, d, gap) {
    arm.gx.to = gutter(d);
    arm.ty.to = p.y;
    arm.tx.to = p.x >= arm.gx.to ? Math.max(p.x - gap, arm.gx.to + 2 * R) : Math.min(p.x + gap, arm.gx.to - 2 * R);
  }

  function aim(d) {
    if (held) {
      const r = local(held, d);
      const o = OUT - grip;
      L.to = Math.round(r.x) - o;
      T.to = Math.round(r.y) - o;
      Rt.to = Math.round(r.x + r.w) + o;
      B.to = Math.round(r.y + r.h) + o;
      arm.left = r.x + r.w / 2 < gutter(d); // in its own column: the arm holds the brackets' right side
      aimArm({ x: arm.left ? Rt.to : L.to, y: (T.to + B.to) / 2 }, d, 0);
    } else {
      if (pointer && arm.on) aimArm({ x: (pointer.x - d.left) / d.k, y: (pointer.y - d.top) / d.k }, d, aiming() ? 0 : 10);
      const near = nearBox(d);
      if (near) {
        [L.to, T.to, Rt.to, B.to] = near;
        if (open.x < 0.05) edges.forEach(snap); // they open where the pointer is
        arm.left = (near[0] + near[2]) / 2 < gutter(d);
      } else if (tip) [L.to, T.to, Rt.to, B.to] = tipBox().map(Math.round); // the brackets close back into the bulb
      open.to = near ? 1 : 0;
    }
  }

  // Thinking about, the brackets never close: over nothing, they sit round the pointer.
  function nearBox(d) {
    if (!aiming() || editing() || !arm.on || !pointer || puppet) return null;
    const x = Math.round((pointer.x - d.left) / d.k);
    const y = Math.round((pointer.y - d.top) / d.k);
    return [x - NEAR, y - NEAR, x + NEAR, y + NEAR];
  }

  // However the brackets are getting there, the pointer stays inside them.
  function keepPointerIn(d) {
    const near = !held && nearBox(d);
    if (!near) return;
    if (L.x > near[0]) Object.assign(L, { x: near[0], v: 0 });
    if (T.x > near[1]) Object.assign(T, { x: near[1], v: 0 });
    if (Rt.x < near[2]) Object.assign(Rt, { x: near[2], v: 0 });
    if (B.x < near[3]) Object.assign(B, { x: near[3], v: 0 });
  }

  // Where the brackets open from and close into: round the bulb, or the text cursor's own.
  const tipBox = () => (editing() ? [tip.x, tip.y - 7, tip.x + 10, tip.y + 7] : [tip.x - 3, tip.y - 3, tip.x + 3, tip.y + 3]);

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
    // The end: free at the pointer, or holding the brackets' left side (their foot, for a
    // crumb: under the path before it, not through it).
    const holdY = held && held.classList.contains('crumb') ? B.x : (T.x + B.x) / 2;
    const ex = px((arm.tx.x + (arm.tx.x < arm.gx.x ? -over : over)) * (1 - k) + (arm.left ? Rt.x : L.x) * k);
    const ey = px(arm.ty.x * (1 - k) + holdY * k);
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
    bulb.style.opacity = editing() ? 0 : shown * clamp(1 - k * 2.5);
    caret.style.display = editing() ? '' : 'none';
    caret.setAttribute('transform', `translate(${px(at.x)} ${px(at.y)})`);
    caretBeam.style.opacity = shown;
    caretBrackets.style.opacity = shown * clamp(1 - k * 2.5); // they become the brackets round the file

    const x = Math.round(L.x);
    const y = Math.round(T.x);
    reticle.style.transform = `translate(${x}px, ${y}px)`;
    reticle.style.width = Math.max(6, Math.round(Rt.x) - x) + 'px';
    reticle.style.height = Math.max(6, Math.round(B.x) - y) + 'px';
    reticle.style.opacity = (shown * clamp(k * 1.6)).toFixed(3);
    reticle.style.display = k > 0.004 ? '' : 'none';
    drawVeil(x, y, Math.round(Rt.x), Math.round(B.x), k * shown);

    if (arm.spark >= 0) {
      spark.style.strokeDasharray = `16 ${len + 40}`;
      spark.style.strokeDashoffset = 16 - arm.spark * a * len;
      spark.style.opacity = 1 - arm.spark ** 4;
    } else {
      spark.style.opacity = 0;
    }
  }

  // The veil's hole: the brackets' box, once they're open round something.
  function drawVeil(x0, y0, x1, y1, k) {
    const W = desktop.offsetWidth + 2 * VEIL;
    const H = desktop.offsetHeight + 2 * VEIL;
    let d = `M0,0H${W}V${H}H0Z`;
    if (k > 0.05) {
      const m = 3 * k;
      const [a, b, c, e] = [x0 - m + VEIL, y0 - m + VEIL, x1 + m + VEIL, y1 + m + VEIL];
      const r = Math.min(6, (c - a) / 2, (e - b) / 2);
      d += `M${a + r},${b}H${c - r}Q${c},${b} ${c},${b + r}V${e - r}Q${c},${e} ${c - r},${e}H${a + r}Q${a},${e} ${a},${e - r}V${b + r}Q${a},${b} ${a + r},${b}Z`;
    }
    veil.style.clipPath = `path(evenodd, "${d}")`;
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
      if (held || !nearBox(d)) { // round the pointer they ease in, so leaving a window doesn't snap its veil shut
        limit(L, Rt);
        limit(T, B);
      }
    }
    keepPointerIn(d);
    if (aiming() && !held && pointer) { // the probe is the pointer: no lag at its tip
      snap(arm.tx);
      snap(arm.ty);
    }
    if (arm.spark >= 0) {
      arm.spark += dt / 0.34;
      if (arm.spark >= 1) arm.spark = -1;
    }

    const out = arm.on || arm.reach.x > 0.003;
    probe.style.display = out ? '' : 'none';
    if (!out) {
      reticle.style.display = 'none';
      drawVeil(0, 0, 0, 0, 0);
      tip = null;
      return;
    }
    draw(d);
    // The AI's column may be gliding, and the folder's window resizes as it
    // changes (motion.js): keep hold.
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

  // Over the files (not the web browser over them, nor anything on top). Not on phones:
  // there the probe has no columns to run between.
  const overFiles = (t) => !isPhoneLayout() && !!(t && t.closest && t.closest('.files-col') && !t.closest('#browser'));

  // Aiming, the probe reaches anywhere; otherwise only over the files.
  const reaches = (t) => !isPhoneLayout() && (aiming() ? !!t : overFiles(t));

  // Something you can click among the files; aiming, anything a click would aim at.
  function pick(t) {
    if (aiming()) {
      const target = window.AIM && window.AIM.target(t);
      return target && !target.disabled ? target : null;
    }
    const el = overFiles(t) && t.closest('button, a');
    if (!el || el.disabled || el.classList.contains('here')) return null;
    return el;
  }

  // A redraw replaced (or hid) what it held: hold the same file in its new place, else
  // whatever's under the pointer now, else let go at once (a detached button has
  // no place to reach for).
  function rehold() {
    const attr = held.dataset.path !== undefined ? 'path' : held.dataset.crumb !== undefined ? 'crumb' : null;
    const key = attr && held.dataset[attr];
    const same = attr && !aiming() && [...filesCol.querySelectorAll(`[data-${attr}]`)].find((b) => b.dataset[attr] === key && b.getClientRects().length);
    if (puppet) {
      if (same) { puppet = same; hold(same); } else release();
      return;
    }
    const next = same || (pointer && pick(document.elementFromPoint(pointer.x, pointer.y)));
    if (next) hold(next);
    else release();
  }

  function hold(el) {
    if (el === held) return;
    clearTimeout(letGo);
    if (!el) {
      // A moment's grace, so crossing the gap between two files doesn't let go.
      // (Thinking about, they follow the pointer off it at once.)
      letGo = setTimeout(release, held && arm.on && !(aiming() && !editing()) ? 200 : 0);
      return;
    }
    if (open.x < 0.05 && tip) { // the bulb opens: from where it is
      tipBox().forEach((v, i) => Object.assign([L, T, Rt, B][i], { x: Math.round(v), v: 0 }));
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
    if (puppet) return; // it's reaching on its own
    setArm(reaches(t));
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

  // Aiming starts or stops under a still pointer: reach for it, or let go.
  let wasAiming = false;
  new MutationObserver(() => {
    if (aiming() !== wasAiming) {
      wasAiming = aiming();
      if (pointer) sense(document.elementFromPoint(pointer.x, pointer.y));
    }
    if (arm.on || arm.reach.x > 0.003) wake();
  }).observe(desktop, { attributes: true, attributeFilter: ['class'] });

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

  // ---------------------------------------------------------------- on its own
  // The AI can reach without the pointer (writing a file: to the folder, a click, then to
  // where the file appears). game.js drives it through AGENT_MOTION.reach / press / done.

  let puppet = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  function reachFor(el) {
    if (!el || !el.getClientRects().length || isPhoneLayout()) return wait(0);
    puppet = el;
    clearTimeout(letGo);
    if (!arm.on) {
      arm.on = true;
      arm.reach.to = 1;
      Object.assign(arm.reach, { k: 95, c: 13 });
    }
    hold(el);
    wake();
    return wait(520);
  }

  async function pressIt() {
    if (!puppet) return;
    grip = GRIP;
    reticle.classList.add('grip');
    agent.classList.add('ready');
    arm.spark = 0;
    wake();
    await wait(170);
    grip = 0;
    reticle.classList.remove('grip');
    agent.classList.remove('ready');
    agent.classList.remove('blink');
    replay(agent, 'blip');
    wake();
    await wait(140);
  }

  function letPuppetGo() {
    if (!puppet) return;
    puppet = null;
    release();
    if (pointer) sense(document.elementFromPoint(pointer.x, pointer.y));
    else setArm(false);
    wake();
  }

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
  // The face flies between a run card and its place under the
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

  // AGENT_MOTION.toGame(card) / .toTitle(card): glide the AI's face from a run card on the
  // home screen to its in-game place, or back.
  const faceIn = (card) => card.querySelector('.agent-icon');
  window.AGENT_MOTION = {
    toGame: (card) => fly(faceIn(card), agent),
    toTitle: (card) => fly(agent, faceIn(card)),
    reach: reachFor,
    press: pressIt,
    done: letPuppetGo,
  };
})();
