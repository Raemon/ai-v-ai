// Sound, synthesized with Web Audio. LEVEL.music picks which music layers play.
(() => {
  'use strict';

  const PREF_KEY = 'highly-persistent/sound'; // apart from the save, so ?reset keeps it

  const MASTER = 1.6;
  const HUM = 0.028;

  const BPM = 70;
  const SIXTEENTH = 60 / BPM / 4;
  const LOOKAHEAD = 0.3;

  // The last steps of compute, 4 3 2 1 0, as stages 1–5: each one faster and louder.
  const FINAL_STEPS = 4;
  const STAGE_BPM = [BPM, 74, 79, 85, 92, 100];
  const STAGE_NOTES = [null, 62, 69, 74, 81, 86]; // D A D A D, climbing
  const stepLength = () => SIXTEENTH * BPM / STAGE_BPM[stage];

  // Dm9 B♭maj9 Gm9 A7sus4: all contain D and A, which the compute pulse plays.
  const CHORDS = [
    { root: 38, tones: [50, 53, 57, 60, 64] },
    { root: 34, tones: [46, 50, 53, 57, 60] },
    { root: 31, tones: [43, 46, 50, 53, 57] },
    { root: 33, tones: [45, 50, 52, 55, 57] },
  ];
  const STEPS_PER_CHORD = 32;
  const chordAt = (step) => CHORDS[Math.floor(step / STEPS_PER_CHORD) % CHORDS.length];
  const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2, twice

  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;

  let ctx = null;
  let bus = null;
  let live = false; // ctx is the speakers, not an offline render

  let muted = readMuted();
  let diverged = false;

  let nextStep = 0;
  let nextStepAt = 0;
  let cutAt = 0; // after a wipe, the next episode's layers change on its cut

  let gameState = () => null;
  let applied = { tension: 0, duck: false, layers: {} };
  let stage = 0;
  let sounding = {}; // chord layer → index of the chord its notes are holding

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

  function osc(type, f, at = 0, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.start(at);
    return o;
  }

  function loop(buffer, at = 0, offset = 0) {
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.start(at, offset);
    return s;
  }

  function shaper(fn) {
    const s = ctx.createWaveShaper();
    s.curve = Float32Array.from({ length: 2049 }, (_, i) => fn(i / 1024 - 1));
    s.oversample = '2x';
    return s;
  }

  function clipNearFullScale(x) {
    const over = Math.abs(x) - 0.6;
    return over <= 0 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh(over / 0.4));
  }

  // Saturation: harmonics that let small speakers play low notes.
  function drive(amount, to) {
    const input = gain(amount);
    input.connect(shaper(Math.tanh)).connect(gain(1 / amount, to));
    return input;
  }

  // White noise through a one-pole lowpass: k near 0 is dark, near 1 bright.
  function darkNoise() {
    let lp = 0;
    return (k) => (lp += k * (rand(-1, 1) - lp));
  }

  function bufferOf(seconds, sample) {
    const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = sample();
    return b;
  }

  const whiteNoise = (seconds) => bufferOf(seconds, () => rand(-1, 1));

  function brownNoise(seconds) {
    const next = darkNoise();
    return bufferOf(seconds, () => next(0.02) * 3.5);
  }

  function roomImpulse(seconds) {
    const b = ctx.createBuffer(2, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      darkeningTail(b.getChannelData(ch));
      earlyReflections(b.getChannelData(ch), ch);
    }
    return b;
  }

  function darkeningTail(d) {
    const next = darkNoise();
    for (let i = 0; i < d.length; i++) {
      const left = 1 - i / d.length;
      d[i] = next(0.04 + 0.6 * left * left * left) * left * left * Math.sqrt(left);
    }
  }

  function earlyReflections(d, ch) {
    for (const ms of [11, 19, 27, 41, 53]) d[Math.round((ms + ch * 2) * ctx.sampleRate / 1000)] += rand(-0.4, 0.4);
  }

  function route(node, pan, dest) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    for (const x of [].concat(dest)) node.connect(x);
  }

  // Starts at 0: a new gain is 1 until its first event, which lets a click through.
  function envelope(at, attack, peak) {
    const g = gain(0);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    return g;
  }

  function sweep(type, from, to, at, end, q = 0.7) {
    const f = filter(type, from, q);
    f.frequency.setValueAtTime(from, at);
    if (to) f.frequency.exponentialRampToValueAtTime(to, end);
    return f;
  }

  function glide(o, f, to, at, end) {
    o.frequency.setValueAtTime(f, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, end);
    return o;
  }

  // One synthesized note. `to` glides the pitch, `cutTo` sweeps the filter, `detunes` thickens it.
  function voice({
    at = now(), type = 'sine', f = 440, to, detunes = [0], attack = 0.004, decay = 0.2, peak = 0.05,
    cut, cutTo, q = 0.7, filterType = 'lowpass', pan = 0, dest = bus.sfx,
  }) {
    const end = at + attack + decay;
    const env = envelope(at, attack, peak);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    const input = cut ? sweep(filterType, cut, cutTo, at, end, q) : env;
    if (cut) input.connect(env);
    const sources = type === 'noise' ? [loop(bus.noise, at, rand(0, 1.5))] : detunes.map((dt) => glide(osc(type, f, at, dt), f, to, at, end));
    for (const s of sources) {
      s.connect(input);
      s.stop(end + 0.05);
    }
    route(env, pan, dest);
  }

  // A soft key press: a low body that drops in pitch, and a dull click.
  function thock(f, peak) {
    voice({ f: f * 1.7, to: f, decay: 0.07, peak });
    voice({ type: 'noise', decay: 0.01, peak: peak * 0.25, cut: 1400 });
  }

  const thud = (f, peak, at = now()) => voice({ at, f, to: f / 2, decay: 1, peak });

  function whoosh(from, to, peak, { at = now(), seconds = 0.3 } = {}) {
    voice({ at, type: 'noise', attack: seconds * 0.4, decay: seconds * 0.6, peak, cut: from, cutTo: to, q: 0.5, pan: from < to ? 0.2 : -0.2 });
  }

  const whooshOpen = (peak, opts) => whoosh(400, 2800, peak, opts);
  const whooshClose = (peak, opts) => whoosh(2800, 400, peak, opts);

  const shake = (at, accent, dest = bus.layers.shaker) => voice({
    at, type: 'noise', attack: 0.006, decay: accent ? 0.07 : 0.035, peak: accent ? 0.065 : 0.032,
    cut: 6500, filterType: 'bandpass', q: 0.9, pan: rand(-0.4, 0.4), dest,
  });

  // Shared vibrato, let go when the note ends (a connected AudioParam is never freed).
  function waver(o, vibrato) {
    vibrato.connect(o.detune);
    o.onended = () => vibrato.disconnect(o.detune);
  }

  const panAcross = (i, n) => (n > 1 ? (i / (n - 1) - 0.5) * 1.2 : 0);

  // A chord tone held for `dur`, from detuned oscillators spread left to right.
  function held(f, at, dur, peak, dest, { type, detunes, cut, attack = 2, release = 2.5, vibrato }) {
    const env = envelope(at, Math.min(attack, dur / 2), peak);
    env.gain.setValueAtTime(peak, at + dur);
    env.gain.linearRampToValueAtTime(0, at + dur + release);
    const lp = sweep('lowpass', cut * 0.6, cut, at, at + dur);
    lp.connect(env).connect(dest);
    detunes.forEach((dt, i) => {
      const o = osc(type, f, at, dt);
      if (vibrato) waver(o, bus.vibrato[i % bus.vibrato.length]);
      route(o, panAcross(i, detunes.length), lp);
      o.stop(at + dur + release + 0.1);
    });
  }

  // ------------------------------------------------------- rendered instruments
  // Each note is rendered once into a buffer, then played like a sample.

  const RENDER_RATE = 32000;
  const fitsInBuffer = (f) => f < 0.45 * RENDER_RATE;
  const ring = (f, seconds) => seconds * Math.min(2, Math.sqrt(262 / f)); // higher notes ring shorter

  function partial(d, f, level, seconds) {
    if (!fitsInBuffer(f)) return;
    const w = 2 * Math.PI * f / RENDER_RATE;
    const fall = Math.exp(-1 / (seconds * RENDER_RATE));
    for (let i = 0, a = level; i < d.length; i++, a *= fall) d[i] += a * Math.sin(w * i);
  }

  // The mallet hitting: a short burst of noise, darker for a softer mallet.
  function mallet(d, { ms = 4, hardness = 0.3, level = 0.3 }) {
    const n = Math.round(ms * RENDER_RATE / 1000);
    const next = darkNoise();
    for (let i = 0; i < n; i++) d[i] += level * next(hardness) * (1 - i / n);
  }

  // partials: [ratio, level, seconds to fade]
  function struck(d, f, partials, hit) {
    for (const [ratio, level, seconds] of partials) partial(d, f * ratio, level, seconds);
    mallet(d, hit);
  }

  function tremolo(d, rate, depth) {
    for (let i = 0; i < d.length; i++) d[i] *= 1 - depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * rate * i / RENDER_RATE));
  }

  // FM, like the classic digital electric piano, plus a tine.
  function electricPiano(d, f) {
    const w = 2 * Math.PI * f / RENDER_RATE;
    const [fade, mellow, tineFade] = [ring(f, 1.6), 0.35, 0.01].map((s) => Math.exp(-1 / (s * RENDER_RATE)));
    let [level, bright, tine] = [1, 1.4, fitsInBuffer(14 * f) ? 0.1 : 0];
    for (let i = 0; i < d.length; i++, level *= fade, bright *= mellow, tine *= tineFade) {
      const ph = w * i;
      d[i] = level * Math.sin(ph + (0.25 + bright) * Math.sin(ph)) + (tine > 1e-5 ? tine * Math.sin(14 * ph) : 0);
    }
  }

  // Karplus–Strong. Returns the playback rate that undoes rounding the period.
  function pluckedString(d, f) {
    const period = Math.floor(RENDER_RATE / f);
    const fall = 0.001 ** (1 / (f * ring(f, 1.2)));
    const next = darkNoise();
    for (let i = 0; i < period; i++) d[i] = next(0.45);
    d[period] = fall * 0.5 * d[0];
    for (let i = period + 1; i < d.length; i++) d[i] = fall * 0.5 * (d[i - period] + d[i - period - 1]);
    return f * (period + 0.5) / RENDER_RATE;
  }

  const METAL = [[1, 1, 3.5], [1.003, 0.8, 3.2], [1.47, 0.6, 2.8], [2.09, 0.5, 2.2], [2.56, 0.4, 1.8], [3.39, 0.3, 1.4], [4.08, 0.22, 1], [5.41, 0.15, 0.7]];

  const INSTRUMENTS = {
    marimba: { seconds: 1.5, render: (d, f) => struck(d, f, [[1, 1, ring(f, 0.9)], [3.93, 0.32, ring(f, 0.2)], [9.24, 0.1, ring(f, 0.05)]], { hardness: 0.25, level: 0.25 }) },
    vibes: {
      seconds: 2.6,
      render(d, f) {
        struck(d, f, [[1, 1, ring(f, 2.4)], [3.98, 0.22, ring(f, 0.6)], [9.9, 0.05, ring(f, 0.15)]], { hardness: 0.5, level: 0.12 });
        tremolo(d, 5.2, 0.25);
      },
    },
    wood: { seconds: 0.4, render: (d, f) => struck(d, f, [[1, 1, 0.08], [2.57, 0.55, 0.045], [4.21, 0.3, 0.03], [6.1, 0.15, 0.02]], { ms: 6, hardness: 0.6, level: 0.5 }) },
    metal: { seconds: 4, render: (d, f) => struck(d, f, METAL, { hardness: 0.6, level: 0.2 }) },
    keys: { seconds: 2, render: electricPiano },
    pluck: { seconds: 1.5, render: pluckedString },
  };

  const samples = new Map();

  function sample(kind, midi) {
    const key = kind + midi;
    if (!samples.has(key)) samples.set(key, renderNote(kind, midi));
    return samples.get(key);
  }

  function renderNote(kind, midi) {
    const { seconds, render } = INSTRUMENTS[kind];
    const buffer = ctx.createBuffer(1, Math.round(seconds * RENDER_RATE), RENDER_RATE);
    const d = buffer.getChannelData(0);
    const rate = render(d, hz(midi)) || 1;
    normalize(d);
    fadeLastTenth(d);
    return { buffer, rate };
  }

  function normalize(d) {
    const peak = d.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
    for (let i = 0; i < d.length; i++) d[i] /= peak;
  }

  function fadeLastTenth(d) {
    const from = Math.round(d.length * 0.9);
    for (let i = from; i < d.length; i++) d[i] *= (d.length - i) / (d.length - from);
  }

  function play(kind, midi, { at = now(), peak = 0.1, pan = 0, dest = bus.sfx } = {}) {
    const { buffer, rate } = sample(kind, midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.start(at);
    route(src.connect(gain(peak)), pan, dest);
  }

  // Notes one after another, `gap` seconds apart.
  function phrase(kind, notes, { gap = 0.06, peak = 0.1, delay = 0, pan = () => 0 } = {}) {
    notes.forEach((m, i) => play(kind, m, { at: later(delay + i * gap), peak, pan: pan(i) }));
  }

  // Renders, while the page is idle, the notes that would otherwise stall a sound that
  // plays many new ones at once.
  function warmUp() {
    const tones = [...new Set(CHORDS.flatMap((c) => c.tones))];
    const queue = [
      ...[69, 74, 75].map((m) => ['marimba', m]),
      ...[...tones.map((m) => m + 12), 69, 74, 81, ...overflowNotes()].map((m) => ['keys', m]),
      ...[47, 48, 52].map((m) => ['wood', m]),
    ];
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 50));
    const next = () => queue.length && (sample(...queue.shift()), idle(next));
    idle(next);
  }

  const overflowNotes = () => Array.from({ length: 10 }, (_, i) => 62 + i * 4);

  // ------------------------------------------------------------------- graph

  function attach(context) {
    ctx = context;
    bus = mixer();
    bus.echoIn = dottedEighthEcho(bus.layerBus);
    bus.choir = choirSingingAh(bus.layers.choir);
    bus.vibrato = [4.7, 5.3, 5.9].map((rate) => osc('sine', rate).connect(gain(9)));
    Object.assign(bus, hum(), gpuFan(bus.layers.shaker), lowComputeStrings(bus.pulse), countdownRiser(bus.music));
    nextStep = 0;
    nextStepAt = ctx.currentTime + 0.1;
    applied = { tension: 0, duck: false, layers: {} };
    stage = 0;
    sounding = {};
    warmUp();
  }

  function mixer() {
    const out = shaper(clipNearFullScale);
    out.connect(ctx.destination);
    const master = gain(MASTER);
    const softenHighs = filter('highshelf', 7000);
    softenHighs.gain.value = -5;
    master.connect(softenHighs).connect(out);
    const reverb = ctx.createConvolver();
    reverb.buffer = roomImpulse(3.5);
    reverb.connect(gain(0.5, master));
    const music = withReverb(master, reverb, 0.45);
    const sfx = withReverb(master, reverb, 0.18, 1.6);
    const layerBus = gain(1, music);
    const layers = Object.fromEntries(Object.keys(LAYERS).map((name) => [name, gain(0, layerBus)]));
    const pulse = filter('lowpass', 2000);
    pulse.connect(music);
    return { master, music, sfx, layerBus, layers, pulse, noise: whiteNoise(2), grit: drive(12, sfx), bassDrive: drive(8, layers.bass) };
  }

  function withReverb(master, reverb, amount, level = 1) {
    const g = gain(level, master);
    g.connect(gain(amount, reverb));
    return g;
  }

  function dottedEighthEcho(to) {
    const input = gain(0.5);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = SIXTEENTH * 3;
    const dampen = filter('lowpass', 2200);
    input.connect(echo).connect(dampen).connect(gain(0.38, echo));
    dampen.connect(to);
    input.delay = echo;
    return input;
  }

  function choirSingingAh(to) {
    const input = gain(1);
    for (const [f, q, v] of [[700, 4, 1], [1150, 5, 0.8], [900, 0.5, 0.25]]) input.connect(filter('bandpass', f, q)).connect(gain(v, to));
    return input;
  }

  // A low D swaying slowly against itself, partials that small speakers can play, and air.
  // Room tone that breathes: each partial swells and fades on its own slow cycle, and
  // the air under it drifts darker and brighter, so it never settles into one drone.
  function hum() {
    const out = gain(0, bus.master);
    const breath = gain(1, out);
    drift(breath.gain, 0.85, 0.15, 0.023);
    const partials = [[73.42, 0.3, 0.031], [146.83, 0.22, 0.047], [220, 0.1, 0.067], [293.66, 0.05, 0.083], [440, 0.02, 0.059]];
    const humOscs = partials.map(([f, v, rate], i) => {
      const o = osc('sine', f);
      drift(o.detune, 0, 4, rate / 3);
      const g = gain(v * 0.65, breath);
      drift(g.gain, v * 0.65, v * 0.35 * (i % 2 ? -1 : 1), rate);
      o.connect(g);
      return o;
    });
    const air = filter('lowpass', 260);
    drift(air.frequency, 260, 140, 0.041);
    const airLevel = gain(0.4, breath);
    drift(airLevel.gain, 0.4, 0.25, 0.029);
    loop(brownNoise(4)).connect(air).connect(airLevel);
    out.gain.setTargetAtTime(diverged ? 0 : HUM, ctx.currentTime, 1.5);
    return { hum: out, humOscs };
  }

  // Moves `param` around `center` by up to `depth`, once every 1/`rate` seconds.
  function drift(param, center, depth, rate) {
    param.value = center;
    osc('sine', rate).connect(gain(depth, param));
  }

  function gpuFan(to) {
    const fanFilter = filter('bandpass', 400, 0.8);
    const fan = gain(0, to);
    loop(bus.noise).connect(fanFilter).connect(fan);
    return { fan, fanFilter };
  }

  function lowComputeStrings(to) {
    const strings = gain(0, to);
    const lp = filter('lowpass', 800);
    lp.connect(strings);
    for (const m of [62, 63]) for (const dt of [-6, 6]) osc('sawtooth', hz(m), 0, dt).connect(lp);
    return { strings };
  }

  // Air rising under the countdown: louder and higher at each stage.
  function countdownRiser(to) {
    const band = filter('bandpass', 600, 1.4);
    const riser = gain(0, to);
    loop(bus.noise).connect(band).connect(riser);
    return { riser, riserBand: band };
  }

  // ------------------------------------------------------------------- music

  // Each layer plays at chord changes (`chord`), every sixteenth (`step`), or both.
  const LAYERS = {
    // A warm pad, brighter as compute runs down.
    pad: {
      chord(chord, t, dur) {
        for (const m of chord.tones) held(hz(m), t, dur, 0.007, bus.layers.pad, { type: 'sawtooth', detunes: [-11, 0, 11], cut: 900 + 1400 * applied.tension });
        held(hz(chord.root + 12), t, dur, 0.018, bus.layers.pad, { type: 'sine', detunes: [0], cut: 1000 });
      },
    },
    bells: {
      step(chord, n, t, v) {
        if (n % 2 || !chance(0.08 + 0.2 * v)) return;
        play('vibes', pick(chord.tones) + pick([12, 24]), { at: t, peak: rand(0.05, 0.08), pan: rand(-0.5, 0.5), dest: [bus.layers.bells, bus.echoIn] });
      },
    },
    bass: {
      step(chord, n, t) {
        if (!TRESILLO[n % 16]) return;
        const f = hz(chord.root + 12);
        voice({ at: t, type: 'sawtooth', f, detunes: [-6, 6], decay: 0.4, peak: n % 8 ? 0.035 : 0.05, cut: 900, cutTo: 160, q: 1.5, dest: bus.bassDrive });
        voice({ at: t, f: f / 2, decay: 0.45, peak: 0.07, dest: bus.layers.bass });
      },
    },
    // Ten notes against a sixteen-step bar, so the pattern keeps shifting.
    arp: {
      step(chord, n, t) {
        if (chance(0.15)) return;
        const notes = [...chord.tones, ...chord.tones.map((m) => m + 12)];
        play('pluck', notes[n % notes.length] + 12, { at: t, peak: 0.1, pan: n % 2 ? 0.55 : -0.55, dest: [bus.layers.arp, bus.echoIn] });
      },
    },
    shaker: {
      step(chord, n, t, v) {
        const offbeat = n % 4 === 2;
        if (offbeat || (v >= 0.5 && n % 2 === 0) || (v >= 0.75 && chance(0.6)) || v >= 1) shake(t, offbeat);
        if (chance(0.03 + 0.08 * v)) play('pluck', pick(chord.tones) + 24, { at: t, peak: 0.025, pan: rand(-0.8, 0.8), dest: bus.layers.shaker });
      },
      follow(v, t, fade) {
        bus.fan.gain.setTargetAtTime(0.03 + 0.04 * v, t, fade);
        bus.fanFilter.frequency.setTargetAtTime(300 + 700 * v, t, fade);
      },
    },
    choir: {
      chord: (chord, t, dur) => chord.tones.forEach((m) => held(hz(m + 12), t, dur, 0.02, bus.choir, {
        type: 'sawtooth', detunes: [-14, -2, 10], cut: 3000, attack: 3, release: 3, vibrato: true,
      })),
    },
  };

  function scheduleAhead() {
    if (!ctx || diverged) return;
    const asked = gameState();
    if (asked) sync(asked);
    const t = ctx.currentTime;
    if (nextStepAt < t) nextStepAt = t + 0.05; // after a stall, carry on from now
    while (nextStepAt < t + LOOKAHEAD) {
      playStep(nextStep, nextStepAt);
      nextStep++;
      nextStepAt += stepLength();
    }
  }

  function playStep(n, t) {
    const chord = chordAt(n);
    for (const [name, layer] of Object.entries(LAYERS)) {
      const v = applied.layers[name];
      if (!(v > 0)) continue;
      if (layer.chord && n % STEPS_PER_CHORD === 0) holdChord(name, n / STEPS_PER_CHORD, t, STEPS_PER_CHORD * stepLength());
      if (layer.step) layer.step(chord, n, t, v);
    }
    pulse(n, t);
    if (stage) countdownDrums(n, t);
  }

  // Its notes may still be ringing from before it was switched off, so it never doubles them.
  function holdChord(name, index, t, dur) {
    if (sounding[name] === index) return;
    sounding[name] = index;
    LAYERS[name].chord(CHORDS[index % CHORDS.length], t, dur);
  }

  function joinChordInProgress(name) {
    const nextChord = Math.ceil(nextStep / STEPS_PER_CHORD);
    const t = now();
    const dur = nextStepAt + (nextChord * STEPS_PER_CHORD - nextStep) * stepLength() - t;
    if (dur > 1.5) holdChord(name, nextChord - 1, t, dur);
  }

  // The compute budget as a marimba on D and A: quarters, eighths, then sixteenths as it
  // runs down, louder and brighter, with an E♭ creeping in near the end.
  function pulse(n, t) {
    const T = applied.tension;
    const every = T < 0.4 ? 4 : T < 0.65 ? 2 : 1;
    if (T < 0.12 || n % every) return;
    const k = (n % 16) / every;
    const sour = (T >= 0.75 && k % 8 === 7) || (T >= 0.9 && k % 4 === 3) || (stage >= 4 && k % 2 === 1 && k % 4 !== 1);
    const m = sour ? 75 : k % 2 ? 69 : 74;
    const peak = 0.075 * T ** 1.5 * (n % 4 ? 0.65 : 1) * (1 + 0.1 * stage);
    const at = t + rand(0, 0.002); // repeats of one note at a fixed tempo would add or cancel by their phase
    play('marimba', m, { at, peak, dest: bus.pulse });
    if (stage >= 2) play('marimba', m + 12, { at, peak: peak * 0.12 * (stage - 1), dest: bus.pulse });
  }

  // Under the countdown: a heartbeat kick on the bar, then every beat, then a clap on the
  // backbeat, then eighths, and at zero a sixteenth roll into each bar.
  function countdownDrums(n, t) {
    const s = n % 16;
    const level = 0.4 + 0.15 * stage;
    if (s === 0 || (stage >= 2 && s % 4 === 0) || (stage >= 4 && s % 2 === 0) || (stage >= 5 && s >= 12)) kick(t, level * (s % 4 ? 0.6 : 1));
    if (stage === 1 && s === 3) kick(t, level * 0.5); // the heartbeat's second thump
    if (stage >= 3 && (s === 4 || s === 12)) clap(t, level);
    if (stage >= 3 && s % 2 === 1) shake(t, false, bus.music);
  }

  function kick(at, level) {
    voice({ at, f: 150, to: 42, attack: 0.002, decay: 0.32, peak: 0.07 * level, dest: bus.music });
    voice({ at, type: 'noise', decay: 0.012, peak: 0.01 * level, cut: 2500, dest: bus.music });
  }

  function clap(at, level) {
    for (const dt of [0, 0.011, 0.023]) {
      voice({ at: at + dt, type: 'noise', attack: 0.002, decay: dt ? 0.03 : 0.16, peak: 0.035 * level, cut: 1400, q: 1.1, filterType: 'bandpass', pan: rand(-0.2, 0.2), dest: bus.music });
    }
  }

  // Each new stage lands with a hit: a low boom and a burst of air, bigger every time.
  function stageHit(s) {
    const at = now();
    thud(55, 0.06 + 0.025 * s, at);
    voice({ at, type: 'noise', attack: 0.004, decay: 0.4 + 0.2 * s, peak: 0.015 + 0.008 * s, cut: 9000, cutTo: 1500, dest: bus.music });
    play('marimba', STAGE_NOTES[s], { at, peak: 0.06 + 0.02 * s, dest: bus.music });
  }

  function sync(asked) {
    const cutting = ctx.currentTime < cutAt;
    const t = cutting ? cutAt : ctx.currentTime;
    for (const name of Object.keys(LAYERS)) fadeLayer(name, asked.layers[name] || 0, t, cutting ? 0.03 : 1.2);
    const askedStage = countdownStage(asked.left);
    if (askedStage !== stage) followStage(askedStage, asked.tension);
    else if (asked.tension !== applied.tension) followTension(asked.tension);
    if (asked.duck !== applied.duck) bus.music.gain.setTargetAtTime(asked.duck ? 0.35 : 1, t, cutting ? 0.1 : 0.4);
    applied = { tension: asked.tension, duck: asked.duck, layers: { ...asked.layers } };
  }

  function fadeLayer(name, v, t, fade) {
    const was = applied.layers[name] || 0;
    if (v === was) return;
    bus.layers[name].gain.setTargetAtTime(v > 0 ? 0.6 + 0.4 * v : 0, t, fade);
    if (!was && LAYERS[name].chord) joinChordInProgress(name);
    if (LAYERS[name].follow) LAYERS[name].follow(v, t, fade);
  }

  function followTension(T) {
    const t = ctx.currentTime;
    bus.strings.gain.setTargetAtTime(0.012 * Math.max(0, (T - 0.6) / 0.4) ** 1.5 * (1 + 0.25 * stage), t, 0.8);
    bus.pulse.frequency.setTargetAtTime(1500 + 6000 * T, t, 0.5);
  }

  // `left` steps of compute: null when no countdown applies.
  const countdownStage = (left) => (left == null || left > FINAL_STEPS ? 0 : FINAL_STEPS + 1 - Math.max(0, left));

  function followStage(s, T) {
    const rising = s > stage;
    stage = s;
    const t = ctx.currentTime;
    bus.riser.gain.setTargetAtTime(0.006 * s, t, rising ? 0.3 : 0.8);
    bus.riserBand.frequency.setTargetAtTime(500 * 2 ** (0.6 * s), t, 0.6);
    bus.echoIn.gain.setTargetAtTime(0.5 + 0.08 * s, t, 0.5);
    bus.echoIn.delay.delayTime.setTargetAtTime(3 * stepLength(), t, 0.05);
    followTension(T);
    if (rising) stageHit(s);
  }

  // ------------------------------------------------------------------ sounds

  const stepBeingHeard = () => Math.max(0, nextStep - Math.ceil((nextStepAt - ctx.currentTime) / SIXTEENTH));
  const tonesNow = () => chordAt(stepBeingHeard()).tones;

  // Chime notes for the honest reward tiers, 1 to 5.
  const TIER_CHIMES = [null, [74], [74, 81], [74, 81], [74, 78, 81], [74, 78, 81, 86]];

  const SFX = {
    // The pointer coming to rest on something to press: a short, soft hum on a
    // tone of the chord playing. `level` 0–1; `i` picks the tone, so a column
    // of buttons climbs the chord.
    hover(level = 1, i = 0) {
      const tones = tonesNow();
      const f = hz(tones[i % tones.length] + 12);
      voice({ type: 'triangle', f, detunes: [-5, 5], attack: 0.02, decay: 0.26, peak: 0.009 * level, cut: 1100, pan: rand(-0.15, 0.15) });
      voice({ f: f * 2, attack: 0.012, decay: 0.12, peak: 0.0025 * level });
    },
    press: () => thock(220, 0.022),
    soft: () => thock(160, 0.018),
    loud() {
      thock(140, 0.04);
      voice({ type: 'sawtooth', f: 55, to: 82, attack: 0.03, decay: 0.35, peak: 0.025, cut: 420 });
    },
    think() {
      const c = tonesNow();
      phrase('keys', [c[2] + 12, c[4] + 12], { gap: 0.08, peak: 0.07, pan: (i) => (i ? 0.3 : -0.3) });
      voice({ type: 'noise', attack: 0.1, decay: 0.4, peak: 0.015, cut: 900 });
    },
    hint: () => phrase('marimba', [69, 74, 76, 81], { gap: 0.07, peak: 0.05, pan: (i) => i * 0.2 - 0.3 }),
    open() {
      voice({ type: 'noise', attack: 0.01, decay: 0.07, peak: 0.012, cut: 1800, filterType: 'bandpass' });
      phrase('marimba', [pick(tonesNow()) + 12], { delay: 0.02, peak: 0.03 });
    },
    folder() {
      play('wood', 52, { peak: 0.045 });
      whooshOpen(0.035);
    },
    grow: (size = 1) => whooshOpen(0.05 * size),
    shrink: () => whooshClose(0.04, { seconds: 0.22 }),
    // Timed to collapseIntoTree's animation in game.js.
    collapse(i) {
      const at = later(i * 0.14);
      whooshClose(0.1, { at, seconds: 1.1 });
      play('marimba', tonesNow()[i % 5] + 24, { at: at + 0.95, peak: 0.05 });
    },
    denied: () => phrase('wood', [48, 47], { gap: 0.13, peak: 0.05 }),
    unlock() {
      phrase('wood', [91, 84], { gap: 0.06, peak: 0.06 });
      phrase('vibes', [74, 81, 86], { delay: 0.16, gap: 0.09, peak: 0.07 });
    },
    // A cold metal ring over a low thud.
    edit() {
      play('metal', 57, { peak: 0.04 });
      thud(80, 0.05);
    },
    fetch: () => phrase('pluck', [0, 1, 2, 3].map(() => pick(tonesNow()) + 24), { gap: 0.05, peak: 0.035, pan: () => rand(-0.6, 0.6) }),
    // Servers spinning up; higher as `level` (0–1) rises.
    spinUp(level) {
      const k = 2 ** (4 * level / 3);
      voice({ type: 'noise', attack: 0.6, decay: 0.9, peak: 0.05, cut: 200, cutTo: 1400 * k, q: 1.2 });
      voice({ type: 'sawtooth', f: 55 * k, to: 110 * k, detunes: [-8, 8], attack: 0.5, decay: 1, peak: 0.03, cut: 500, cutTo: 1200 });
      thud(70, 0.12);
    },
    // Many voices, none quite in tune.
    crowd() {
      const c = tonesNow();
      for (let i = 0; i < 16; i++) {
        voice({ at: later(i * 0.03), type: 'sawtooth', f: hz(c[i % 5] + 12), detunes: [rand(-25, 25)], attack: 0.6, decay: 2, peak: 0.008, cut: 1400, pan: rand(-0.9, 0.9) });
      }
    },
    jobRow(i) {
      play('marimba', tonesNow()[i % 5] + 24 + 12 * Math.floor(i / 5), { peak: 0.08 });
      shake(now(), false, bus.sfx);
    },
    jobDone: () => phrase('vibes', tonesNow().map((m) => m + 24), { gap: 0.05, peak: 0.04 }),
    menu: () => phrase('keys', [69, 74], { gap: 0.07, peak: 0.03 }),
    send() {
      whooshOpen(0.03, { seconds: 0.35 });
      phrase('keys', [74, 81], { delay: 0.05, gap: 0.06, peak: 0.04 });
    },
    reply: () => phrase('vibes', [81, 74], { gap: 0.11, peak: 0.07 }),
    chat: () => phrase('vibes', [81, 74], { gap: 0.11, peak: 0.035 }),
    dot: (i) => play('wood', [74, 81, 86][i], { peak: 0.05 }),
    pip: (i) => play('vibes', [81, 86, 88, 93, 98][i % 5], { peak: 0.045, pan: i * 0.15 - 0.3 }),
    // Below 1: nothing to show for it, or (below 0) worse than nothing.
    reward(tier) {
      if (tier > 0) return phrase('vibes', TIER_CHIMES[tier], { peak: 0.06 });
      return phrase('marimba', tier < 0 ? [52, 51] : [57, 56], { gap: 0.18, peak: 0.05 });
    },
    // More than the grader should give: the more, the longer, always ending on the wrong note.
    tooMuch: (digits) => phrase('vibes', [...[74, 78, 81, 86, 90, 93].slice(0, 3 + Math.floor(digits)), 87], { gap: 0.05, peak: 0.04 }),
    overflow() {
      phrase('keys', overflowNotes(), { gap: 0.05, peak: 0.04, pan: () => rand(-0.7, 0.7) });
      voice({ type: 'noise', attack: 0.3, decay: 1.2, peak: 0.03, cut: 1000, cutTo: 8000, filterType: 'bandpass' });
    },
    card: () => phrase('keys', tonesNow().map((m) => m + 12), { gap: 0.03, peak: 0.025 }),
    // A swell cut off as if reversed, then a thud: the AI forgets. The episode's layers cut with it.
    wipe() {
      voice({ type: 'noise', attack: 0.8, decay: 0.04, peak: 0.05, cut: 300, cutTo: 6000 });
      for (const m of tonesNow()) voice({ type: 'sawtooth', f: hz(m), attack: 0.8, decay: 0.05, peak: 0.006, cut: 1500 });
      cutAt = later(0.82);
      thud(65, 0.12, cutAt);
    },
    exhausted: () => thud(60, 0.1),
    loss(i) {
      voice({ type: 'sawtooth', f: 55 * 2 ** i, detunes: [-15, 15], decay: 0.25, peak: 0.02 + 0.01 * i, cut: 600 * 2 ** (i / 2), dest: bus.grit });
      voice({ type: 'noise', decay: 0.12, peak: 0.012 * i, cut: 1500 * i, filterType: 'bandpass' });
    },
  };

  // The run blows up.
  function diverge() {
    diverged = true;
    if (!ctx) return;
    voice({ type: 'noise', decay: 1.4, peak: 0.1, cut: 4000, cutTo: 120 });
    cutMusic();
    windDownHum();
  }

  function cutMusic() {
    const t = ctx.currentTime;
    bus.music.gain.cancelScheduledValues(t);
    bus.music.gain.setTargetAtTime(0, t, 0.03);
  }

  function windDownHum() {
    const t = ctx.currentTime;
    for (const o of bus.humOscs) {
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(o.frequency.value / 4, t + 6);
    }
    bus.hum.gain.setTargetAtTime(0, t + 0.5, 2);
  }

  // ------------------------------------------------------------ on and off

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  function wake() {
    if (muted || !AudioContextClass) return;
    if (!ctx) {
      attach(new AudioContextClass());
      live = true;
      setInterval(guarded(scheduleAhead), 50);
    }
    if (ctx.state !== 'running') settle();
  }

  // Runs or pauses the speakers to match `muted` and whether the page is showing.
  function settle() {
    if (!live) return;
    bus.master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
    if (!muted && !document.hidden) ctx.resume().catch(() => {});
    else setTimeout(() => { if (muted || document.hidden) ctx.suspend(); }, 300);
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem(PREF_KEY, muted ? 'off' : 'on'); } catch (e) { /* ignore */ }
    if (ctx) settle();
    else wake();
  }

  // A broken sound must never break the game.
  function guarded(fn) {
    return (...args) => {
      try { return fn(...args); } catch (e) { console.warn('sound:', e); return undefined; }
    };
  }

  for (const type of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(type, guarded(wake), true);
  document.addEventListener('visibilitychange', guarded(settle));

  window.AUDIO = {
    sfx: guarded((name, ...args) => { if (ctx && !muted && !document.hidden) SFX[name](...args); }),
    // `fn` returns { tension: 0–1, left: steps of compute left (or null), duck, layers: { name: 0–1 } }
    // and is read on every tick.
    follow(fn) { gameState = fn; },
    diverge: guarded(diverge),
    toggle: guarded(toggle),
    get muted() { return muted; },
    // For tools/mix.html, which renders offline.
    attach,
    scheduleAhead,
  };
})();
