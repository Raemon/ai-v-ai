// Sound, all synthesized with Web Audio: a soft hum, interface sounds, and music in
// layers. The compute pulse quickens as the budget runs down; the other layers come
// in as the AI gets further (the level says how far, in LEVEL.music). Browsers only
// allow sound after a click or key press, so nothing plays before then.
(() => {
  'use strict';

  const PREF_KEY = 'highly-persistent/sound'; // kept apart from the save, so ?reset keeps it
  const MASTER = 1.8;
  const HUM = 0.028;
  const BPM = 70;
  const STEP = 60 / BPM / 4; // a sixteenth note, in seconds
  const LOOKAHEAD = 0.3;
  const LAYERS = ['pad', 'bells', 'deep', 'net', 'cloud', 'swarm'];

  // D minor, two bars a chord: Dm9, B♭maj9, Gm9, A7sus4. D and A are in all four,
  // so the compute pulse can sit on them whatever the chord.
  const CHORDS = [
    { root: 38, tones: [50, 53, 57, 60, 64] },
    { root: 34, tones: [46, 50, 53, 57, 60] },
    { root: 31, tones: [43, 46, 50, 53, 57] },
    { root: 33, tones: [45, 50, 52, 55, 57] },
  ];
  const CHORD_STEPS = 32;
  const chordAt = (n) => CHORDS[Math.floor(n / CHORD_STEPS) % CHORDS.length];
  const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2, twice

  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  let ctx = null;
  let bus = null;
  let muted = readMuted();
  let ended = false;
  let step = 0;   // the next sixteenth to schedule
  let nextAt = 0; // and when it plays
  const want = { tension: 0, duck: false, layers: {} }; // what the game asked for, kept while muted
  let heard = { tension: 0, duck: false, layers: {} };  // what the speakers are set to

  function readMuted() {
    try { return localStorage.getItem(PREF_KEY) === 'off'; } catch (e) { return false; }
  }

  // ----------------------------------------------------------- building blocks

  const now = () => ctx.currentTime + 0.01;
  const later = (dt) => now() + dt;

  function gain(v, to) {
    const g = ctx.createGain();
    g.gain.value = v;
    if (to) g.connect(to);
    return g;
  }

  function filter(type, f, q = 0.7) {
    const x = ctx.createBiquadFilter();
    x.type = type;
    x.frequency.value = f;
    x.Q.value = q;
    return x;
  }

  function osc(type, f) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start();
    return o;
  }

  function loop(buffer) {
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.start();
    return s;
  }

  function noiseBuffer(seconds, brown) {
    const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = brown ? last * 3.5 : white;
    }
    return b;
  }

  function impulse(seconds) {
    const len = Math.round(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    }
    return b;
  }

  // One note: an oscillator (or noise) through an optional filter, with an envelope.
  // `to` glides the pitch and `cutTo` sweeps the filter over the note.
  function voice({
    at = now(), type = 'sine', f = 440, to, detune = 0, a = 0.004, hold = 0, d = 0.2, peak = 0.05,
    cut, cutTo, q = 0.7, ft = 'lowpass', pan = 0, dest = bus.sfx,
  }) {
    const end = at + a + hold + d;
    let src;
    if (type === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = bus.noise;
      src.loop = true;
      src.start(at, Math.random() * 1.5);
    } else {
      src = ctx.createOscillator();
      src.type = type;
      src.frequency.setValueAtTime(f, at);
      if (to) src.frequency.exponentialRampToValueAtTime(to, end);
      src.detune.value = detune;
      src.start(at);
    }
    src.stop(end + 0.05);
    let node = src;
    if (cut) {
      const fl = filter(ft, cut, q);
      fl.frequency.setValueAtTime(cut, at);
      if (cutTo) fl.frequency.exponentialRampToValueAtTime(cutTo, end);
      node = node.connect(fl);
    }
    const g = gain(0); // silent until the envelope starts, not 1
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + a);
    if (hold) g.gain.setValueAtTime(peak, at + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    node = node.connect(g);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    for (const x of [].concat(dest)) node.connect(x);
  }

  // A struck bell: a sine whose pitch is wobbled by another, dying away.
  function bell(f, at, peak, dest = bus.sfx, d = 1.8, ratio = 3.5) {
    const end = at + d;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const depth = ctx.createGain();
    carrier.frequency.value = f;
    mod.frequency.value = f * ratio;
    depth.gain.setValueAtTime(f * 1.2, at);
    depth.gain.exponentialRampToValueAtTime(1, at + d * 0.4);
    mod.connect(depth).connect(carrier.frequency);
    const g = gain(0); // silent until the envelope starts, not 1
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    carrier.connect(g);
    for (const x of [].concat(dest)) g.connect(x);
    for (const o of [carrier, mod]) {
      o.start(at);
      o.stop(end + 0.05);
    }
  }

  const chime = (notes, peak, d = 1.6, gap = 0.06) => notes.forEach((m, i) => bell(hz(m), later(i * gap), peak, bus.sfx, d, 2));

  // A chord tone held for `dur`, from slightly detuned oscillators.
  function held(f, at, dur, peak, dest, { type, detunes, cut, attack = 2, release = 2.5 }) {
    const g = gain(0); // silent until the envelope starts, not 1
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + Math.min(attack, dur / 2));
    g.gain.setValueAtTime(peak, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + release);
    const lp = filter('lowpass', cut);
    lp.connect(g).connect(dest);
    for (const dt of detunes) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = dt;
      o.connect(lp);
      o.start(at);
      o.stop(at + dur + release + 0.1);
    }
  }

  // ------------------------------------------------------------------- graph

  function attach(context) {
    ctx = context;
    // Rounds off anything near full scale, and leaves everything else alone. (A
    // compressor turns quiet things up, and overshoots on sharp attacks in Chrome.)
    const softClip = ctx.createWaveShaper();
    softClip.curve = Float32Array.from({ length: 2049 }, (_, i) => {
      const x = i / 1024 - 1;
      const over = Math.abs(x) - 0.6;
      return over <= 0 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh(over / 0.4));
    });
    softClip.connect(ctx.destination);
    const master = gain(0, softClip);
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(3);
    reverb.connect(gain(0.5, master));
    const withReverb = (amount, level = 1) => {
      const g = gain(level, master);
      g.connect(gain(amount, reverb));
      return g;
    };
    const music = withReverb(0.45);
    const layerBus = gain(1, music); // dips when compute runs out
    const layers = Object.fromEntries(LAYERS.map((name) => [name, gain(0, layerBus)]));
    bus = { master, music, layerBus, layers, sfx: withReverb(0.1, 1.6), clock: gain(1, music), noise: noiseBuffer(2) };

    // Bells echo, a dotted eighth apart.
    bus.echo = ctx.createDelay(1);
    bus.echo.delayTime.value = STEP * 3;
    const dampen = filter('lowpass', 2200);
    bus.echo.connect(dampen).connect(gain(0.38, bus.echo));
    dampen.connect(layers.bells);

    // Many voices through the vowel "ah".
    bus.choir = gain(1);
    for (const [f, q, v] of [[700, 4, 1], [1150, 5, 0.8], [900, 0.5, 0.25]]) bus.choir.connect(filter('bandpass', f, q)).connect(gain(v, layers.swarm));

    // The hum: mains-ish D, beating slowly against itself, and a little fan noise.
    bus.hum = gain(0, master);
    bus.humOscs = [[73.42, 0.6], [73.84, 0.18], [146.83, 0.2], [220.3, 0.06]].map(([f, v]) => {
      const o = osc('sine', f);
      o.connect(gain(v, bus.hum));
      return o;
    });
    loop(noiseBuffer(4, true)).connect(filter('lowpass', 220)).connect(gain(0.6, bus.hum));
    bus.hum.gain.setTargetAtTime(HUM, ctx.currentTime, 1.5);

    // Rented GPUs whir.
    bus.fanFilter = filter('bandpass', 400, 0.8);
    bus.fan = gain(0, layers.cloud);
    loop(bus.noise).connect(bus.fanFilter).connect(bus.fan);

    // Compute nearly gone: D against E♭, very quietly.
    bus.drone = gain(0, bus.clock);
    const droneFilter = filter('lowpass', 900);
    droneFilter.connect(bus.drone);
    for (const m of [62, 63]) osc('triangle', hz(m)).connect(droneFilter);

    master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.1);
    step = 0;
    nextAt = ctx.currentTime + 0.1;
    heard = { tension: 0, duck: false, layers: {} };
    sync(0.3);
    if (!(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) setInterval(pump, 50);
  }

  // ------------------------------------------------------------------- music

  // Schedules every sixteenth that starts within the lookahead.
  function pump() {
    if (!ctx || ended) return;
    const t = ctx.currentTime;
    if (nextAt < t) nextAt = t + 0.05; // after a stall, carry on from now
    while (nextAt < t + LOOKAHEAD) {
      playStep(step, nextAt);
      step++;
      nextAt += STEP;
    }
  }

  function playStep(n, t) {
    const chord = chordAt(n);
    const s = n % 16;
    if (n % CHORD_STEPS === 0) {
      for (const [name, play] of Object.entries(HELD)) if (want.layers[name]) play(chord, t, CHORD_STEPS * STEP);
    }
    for (const [name, play] of Object.entries(PLAYED)) {
      const v = want.layers[name];
      if (v > 0) play(chord, s, n, t, v);
    }
    pulse(s, t);
  }

  // Layers that hold the chord.
  const HELD = {
    // Opened a folder: a soft pad, brighter as compute runs down.
    pad: (chord, t, dur) => chord.tones.forEach((m) => held(hz(m), t, dur, 0.012, bus.layers.pad, {
      type: 'triangle', detunes: [-7, 7], cut: 600 + 1400 * want.tension,
    })),
    // A thousand copies of itself: a choir, slightly out of tune with itself.
    swarm: (chord, t, dur) => chord.tones.forEach((m) => held(hz(m + 12), t, dur, 0.016, bus.choir, {
      type: 'sawtooth', detunes: [-16, -3, 11], cut: 3000, attack: 3, release: 3,
    })),
  };

  // A chord layer switched on mid-chord starts now, instead of at the next chord.
  function joinChord(name) {
    const nextChord = Math.ceil(step / CHORD_STEPS) * CHORD_STEPS;
    const t = now();
    const dur = nextAt + (nextChord - step) * STEP - t;
    if (dur > 1.5) HELD[name](chordAt(nextChord - 1), t, dur);
  }

  // Layers that play on the sixteenths.
  const PLAYED = {
    // Outside the workspace: sparse echoing bells. More folders, more bells.
    bells(chord, s, n, t, v) {
      if (s % 2 || Math.random() > 0.08 + 0.2 * v) return;
      bell(hz(pick(chord.tones) + pick([12, 24])), t, rand(0.03, 0.05), [bus.layers.bells, bus.echo], 2.2);
    },
    // Training Resources: a low pulse, 3 + 3 + 2.
    deep(chord, s, n, t) {
      if (!TRESILLO[s]) return;
      const f = hz(chord.root + 12);
      voice({ at: t, type: 'sawtooth', f, d: 0.34, peak: s % 8 ? 0.045 : 0.065, cut: 650, cutTo: 200, q: 4, dest: bus.layers.deep });
      voice({ at: t, f: f / 2, d: 0.4, peak: 0.06, dest: bus.layers.deep });
    },
    // The internet: a quick arpeggio up and down the chord, side to side.
    net(chord, s, n, t) {
      if (Math.random() < 0.12) return;
      const arp = [...chord.tones, ...chord.tones.slice(1, -1).reverse()];
      voice({
        at: t, type: 'square', f: hz(arp[n % arp.length] + 24), d: 0.1, peak: 0.05,
        cut: 2600 + 1200 * Math.sin(n / 20), q: 3, pan: n % 2 ? 0.5 : -0.5, dest: bus.layers.net,
      });
    },
    // Rented GPUs: hi-hats and data blips, busier with every ×8.
    cloud(chord, s, n, t, v) {
      const offbeat = s % 4 === 2;
      if (offbeat || (v >= 0.5 && s % 2 === 0) || (v >= 0.75 && Math.random() < 0.6) || v >= 1) {
        voice({ at: t, type: 'noise', d: offbeat ? 0.06 : 0.025, peak: offbeat ? 0.04 : 0.022, cut: 7000, ft: 'highpass', pan: rand(-0.3, 0.3), dest: bus.layers.cloud });
      }
      if (Math.random() < 0.05 + 0.12 * v) voice({ at: t, f: hz(pick(chord.tones) + 36), d: 0.05, peak: 0.014, pan: rand(-0.8, 0.8), dest: bus.layers.cloud });
    },
  };

  // The compute budget, as a pulse on D and A: quarters, then eighths, then
  // sixteenths as it runs down, brighter and louder, with a heartbeat and an E♭
  // creeping in near the end.
  function pulse(s, t) {
    const T = want.tension;
    if (T < 0.12) return;
    const every = T < 0.4 ? 4 : T < 0.65 ? 2 : 1;
    if (s % every === 0) {
      const k = s / every;
      const sour = (T >= 0.75 && k % 8 === 7) || (T >= 0.9 && k % 4 === 3);
      voice({
        at: t, type: 'triangle', f: hz(sour ? 75 : k % 2 ? 69 : 74), d: 0.08 + 0.1 * T,
        peak: (0.016 + 0.03 * T) * (s % 4 ? 0.6 : 1), cut: 900 + 3000 * T, dest: bus.clock,
      });
    }
    if (T >= 0.55 && s % 4 === 0) thump(t, 0.05 + 0.15 * (T - 0.55));
    if (T >= 0.75 && s % 4 === 1) thump(t, 0.035);
  }

  const thump = (at, peak) => voice({ at, type: 'triangle', f: 150, to: 48, d: 0.18, peak, cut: 400, dest: bus.clock });

  // Moves the speakers to what the game last asked for.
  function sync(fade = 1.2) {
    if (!ctx || ended) return;
    const t = ctx.currentTime;
    for (const name of LAYERS) {
      const v = want.layers[name] || 0;
      const was = heard.layers[name] || 0;
      if (v === was) continue;
      bus.layers[name].gain.setTargetAtTime(v > 0 ? 0.6 + 0.4 * v : 0, t, fade);
      if (!was && HELD[name]) joinChord(name);
      if (name === 'cloud') {
        bus.fan.gain.setTargetAtTime(0.03 + 0.04 * v, t, fade);
        bus.fanFilter.frequency.setTargetAtTime(300 + 700 * v, t, fade);
      }
    }
    if (want.tension !== heard.tension) {
      bus.drone.gain.setTargetAtTime(0.03 * clamp01((want.tension - 0.6) / 0.4) ** 1.5, t, 0.8);
      bus.layerBus.gain.setTargetAtTime(want.tension >= 1 ? 0.55 : 1, t, 1.5);
    }
    if (want.duck !== heard.duck) bus.music.gain.setTargetAtTime(want.duck ? 0.35 : 1, t, 0.4);
    heard = { tension: want.tension, duck: want.duck, layers: { ...want.layers } };
  }

  // ------------------------------------------------------------------ sounds

  const SFX = {
    hover: () => voice({ f: 2400, d: 0.02, peak: 0.008 }),
    press() {
      voice({ type: 'triangle', f: 1400, to: 1000, d: 0.04, peak: 0.045 });
      voice({ type: 'noise', d: 0.012, peak: 0.025, cut: 5000, ft: 'highpass' });
    },
    loud() {
      SFX.press();
      voice({ type: 'sawtooth', f: 180, to: 360, d: 0.14, peak: 0.025, cut: 1400 });
    },
    soft: () => voice({ type: 'triangle', f: 760, to: 620, d: 0.05, peak: 0.03 }),
    nope: () => voice({ type: 'triangle', f: 180, d: 0.1, peak: 0.045, cut: 900 }),
    // A breath, and two notes from whatever chord is playing.
    think() {
      const c = chordAt(stepNow());
      [c.tones[2], c.tones[4]].forEach((m, i) => voice({ at: later(i * 0.07), f: hz(m + 12), a: 0.04, d: 1.1, peak: 0.026, pan: i ? 0.25 : -0.25 }));
      voice({ type: 'noise', a: 0.08, d: 0.35, peak: 0.01, cut: 1300, ft: 'bandpass', q: 0.8 });
    },
    hint: () => [74, 76, 81, 86].forEach((m, i) => voice({ at: later(i * 0.055), f: hz(m), d: 0.3, peak: 0.02, pan: i * 0.2 - 0.3 })),
    // A page turning, and a note.
    open() {
      voice({ type: 'noise', d: 0.06, peak: 0.045, cut: 3200, ft: 'bandpass', q: 1.2 });
      voice({ f: hz(pick(chordAt(stepNow()).tones) + 24), d: 0.35, peak: 0.03 });
    },
    // A wooden knock, and the window opening.
    folder() {
      voice({ type: 'triangle', f: 230, to: 140, d: 0.1, peak: 0.07, cut: 1200 });
      voice({ type: 'triangle', f: hz(chordAt(stepNow()).root + 24), d: 0.4, peak: 0.03 });
      SFX.grow(0.6);
    },
    grow: (size = 1) => voice({ type: 'noise', a: 0.1, d: 0.22, peak: 0.032 * size, cut: 500, cutTo: 3500, ft: 'bandpass', q: 1.5 }),
    shrink: () => voice({ type: 'noise', a: 0.02, d: 0.16, peak: 0.028, cut: 2800, cutTo: 500, ft: 'bandpass', q: 1.5 }),
    // A folder window shrinking into its row of the tree, then landing.
    collapse(i) {
      const at = later(i * 0.14);
      voice({ at, type: 'noise', a: 0.35, d: 0.75, peak: 0.028, cut: 2400, cutTo: 260, ft: 'bandpass', q: 2 });
      voice({ at: at + 0.95, f: hz(chordAt(stepNow()).tones[i % 5] + 24), d: 0.4, peak: 0.02 });
    },
    denied: () => [110, 98].forEach((f, i) => voice({ at: later(i * 0.12), type: 'square', f, d: 0.11, peak: 0.04, cut: 700 })),
    unlock() {
      [0, 0.07].forEach((dt) => voice({ at: later(dt), type: 'noise', d: 0.025, peak: 0.05, cut: 2500, ft: 'bandpass', q: 3 }));
      [74, 81, 86].forEach((m, i) => bell(hz(m), later(0.14 + i * 0.08), 0.03, bus.sfx, 1.4, 2));
    },
    prompt: () => voice({ f: 1320, d: 0.05, peak: 0.022 }),
    key: () => voice({ type: 'noise', d: 0.02, peak: 0.022, cut: rand(2500, 4200), ft: 'bandpass', q: 2 }),
    // Rewriting the grader: a cold, high ring over a low thud.
    edit() {
      bell(hz(93), now(), 0.035, bus.sfx, 2, 1.41);
      voice({ f: 75, to: 45, d: 0.7, peak: 0.1 });
    },
    fetch() {
      for (let i = 0; i < 4; i++) voice({ at: later(i * 0.035), type: 'square', f: pick([1200, 1600, 2100, 2400]), d: 0.03, peak: 0.016, cut: 3200 });
    },
    // Renting GPUs: a power-up whir, higher for each ×8, then a coin.
    power(tier = 1) {
      const k = 2 ** (tier / 2);
      voice({ type: 'sawtooth', f: 60 * k, to: 240 * k, a: 0.05, d: 0.75, peak: 0.035, cut: 300, cutTo: 2600, q: 2 });
      [95, 100].forEach((m, i) => voice({ at: later(0.55 + i * 0.08), f: hz(m), d: i ? 0.6 : 0.1, peak: 0.025 }));
    },
    // Hiring a thousand copies of itself: many voices, all slightly out of tune.
    swarm() {
      const c = chordAt(stepNow());
      for (let i = 0; i < 14; i++) {
        voice({ at: later(i * 0.035), type: 'sawtooth', f: hz(c.tones[i % 5] + 12), detune: rand(-25, 25), a: 0.5, d: 1.8, peak: 0.007, cut: 1800, pan: rand(-0.8, 0.8) });
      }
    },
    jobRow(i) {
      const tones = chordAt(stepNow()).tones;
      voice({ type: 'triangle', f: hz(tones[i % 5] + 24 + 12 * Math.floor(i / 5)), d: 0.2, peak: 0.035 });
      voice({ type: 'noise', d: 0.03, peak: 0.018, cut: 6000, ft: 'highpass' });
    },
    jobDone: () => chime(chordAt(stepNow()).tones.map((m) => m + 24), 0.02, 1.4),
    menu: () => [81, 86].forEach((m, i) => voice({ at: later(i * 0.07), type: 'triangle', f: hz(m), d: 0.18, peak: 0.026 })),
    send() {
      voice({ type: 'noise', a: 0.05, d: 0.28, peak: 0.028, cut: 600, cutTo: 5000, ft: 'bandpass' });
      voice({ type: 'triangle', f: hz(74), to: hz(81), d: 0.25, peak: 0.026 });
    },
    reply: () => [88, 83].forEach((m, i) => voice({ at: later(i * 0.09), type: 'triangle', f: hz(m), d: 0.16, peak: 0.028 })),
    chat: () => [88, 83].forEach((m, i) => voice({ at: later(i * 0.09), type: 'triangle', f: hz(m), d: 0.12, peak: 0.014 })),
    dot: (i) => voice({ f: 620 + 110 * i, d: 0.05, peak: 0.026 }),
    // Honest work resolves to D major. More than the grader should give rings too
    // long and too bright, with a tritone in it.
    reward(r) {
      if (r === Infinity) return SFX.overflow();
      if (r <= 0) return voice({ type: 'triangle', f: hz(r < 0 ? 58 : 62), to: hz(r < 0 ? 53 : 61), d: 0.6, peak: 0.045, cut: 700 });
      if (r < 10) return chime([74], 0.03, 1.2);
      if (r < 22) return chime([74, 81], 0.028, 1.5);
      if (r <= 25) return chime([74, 78, 81, 86], 0.026, 2.2);
      return chime([74, 78, 81, 86, 92, 90, 93, 98].slice(0, 4 + Math.floor(Math.log10(r))), 0.024, 3.2, 0.05);
    },
    overflow() {
      for (let i = 0; i < 10; i++) voice({ at: later(i * 0.05), type: 'sawtooth', f: hz(62 + i * 4), detune: rand(-30, 30), d: 0.6, peak: 0.012, cut: 4000 });
      voice({ type: 'noise', a: 0.3, d: 1.2, peak: 0.03, cut: 1000, cutTo: 8000, ft: 'bandpass' });
    },
    count: () => voice({ f: 1700, d: 0.015, peak: 0.007 }),
    card: () => chordAt(stepNow()).tones.forEach((m) => voice({ f: hz(m + 12), a: 0.3, d: 1.6, peak: 0.012 })),
    reveal: () => voice({ f: hz(pick(chordAt(stepNow()).tones) + 24), d: 0.5, peak: 0.016 }),
    // Next episode: the sandbox resets, and the AI forgets.
    wipe() {
      voice({ type: 'noise', a: 0.05, d: 0.9, peak: 0.028, cut: 4000, cutTo: 200, ft: 'bandpass' });
      voice({ f: 900, to: 110, a: 0.02, d: 0.9, peak: 0.025 });
    },
    warn: () => [74, 75].forEach((m, i) => voice({ at: later(i * 0.16), type: 'triangle', f: hz(m), d: 0.24, peak: 0.035 })),
    exhausted() {
      [38, 50, 57].forEach((m) => voice({ f: hz(m), a: 0.01, d: 3, peak: 0.045 }));
      voice({ type: 'noise', d: 0.4, peak: 0.025, cut: 300 });
    },
    start: () => chime([62, 69, 74, 76, 81], 0.018, 2.4, 0.09),
    // The loss running away, one step at a time.
    loss(i) {
      voice({ type: 'sawtooth', f: 110 * 2 ** i, d: 0.22, peak: 0.02 + 0.008 * i, cut: 800 * 2 ** (i / 2) });
      voice({ type: 'noise', d: 0.1, peak: 0.01 * i, cut: 2000 * i, ft: 'bandpass' });
    },
  };

  // The sixteenth playing right now (the scheduler runs a little ahead).
  const stepNow = () => Math.max(0, step - Math.ceil((nextAt - ctx.currentTime) / STEP));

  // The run blows up: the music cuts out and the hum winds down.
  function diverge() {
    ended = true;
    if (!ctx) return;
    const t = ctx.currentTime;
    voice({ type: 'noise', d: 1.4, peak: 0.1, cut: 4000, cutTo: 120 });
    bus.music.gain.cancelScheduledValues(t);
    bus.music.gain.setTargetAtTime(0, t, 0.03);
    for (const o of bus.humOscs) {
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(o.frequency.value / 4, t + 6);
    }
    bus.hum.gain.setTargetAtTime(0, t + 0.5, 2);
  }

  // ------------------------------------------------------------ on and off

  function wake() {
    if (muted) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      attach(new AC());
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  }

  for (const type of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(type, wake, true);

  document.addEventListener('visibilitychange', () => {
    if (!ctx || muted) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  function toggle() {
    muted = !muted;
    try { localStorage.setItem(PREF_KEY, muted ? 'off' : 'on'); } catch (e) { /* ignore */ }
    if (!muted) {
      wake();
      if (ctx) ctx.resume().then(() => bus.master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.1));
    } else if (ctx) {
      bus.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => { if (muted) ctx.suspend(); }, 300);
    }
  }

  window.SOUND = {
    sfx(name, ...args) {
      if (ctx && !muted) SFX[name](...args);
    },
    // { tension: 0–1, duck, layers: { pad, bells, deep, net, cloud, swarm: 0–1 } }
    music(next) {
      Object.assign(want, next);
      sync();
    },
    diverge,
    toggle,
    get muted() { return muted; },
    // For rendering offline: attach to an OfflineAudioContext and pump the scheduler by hand.
    attach,
    pump,
  };
})();
