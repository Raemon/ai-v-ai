// Sound, synthesized with Web Audio. The music's tracks are in music.js, one per
// episode in turn; LEVEL.music picks which of their layers play.
(() => {
  'use strict';

  const PREF_KEY = 'highly-persistent/sound'; // apart from the save, so ?reset keeps it

  const MASTER = 1.6;
  const HUM = 0.028;

  const LOOKAHEAD = 0.3;
  const LAYER_NAMES = ['pad', 'bells', 'bass', 'arp', 'shaker', 'choir'];

  // How much of its compute an episode has spent when each voice of the pulse comes in.
  const TUNE_FROM = 0.12;
  const HARMONY_FROM = 0.5;
  const GROUND_FROM = 0.7;

  // The last steps of compute, 5 4 3 2 1 0, as stages 1–6. The first keeps the tempo.
  const FINAL_STEPS = 5;
  const STAGE_SPEED = [70, 70, 73, 77, 82, 87, 92].map((bpm) => bpm / 70);
  const STAGE_NOTES = [null, 57, 62, 69, 74, 81, 86]; // A D A D A D, climbing
  const stepLength = () => 15 / track.bpm / STAGE_SPEED[stage];

  // How hard the countdown plays: 0 before it, 1 with no compute left.
  const heat = () => stage / (FINAL_STEPS + 1);

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

  let tracks = [];
  let warmed = false; // notes are rendered ahead once the game says which track it wants
  let track = null;
  let trackIndex = 0;
  let trackOut = null; // where the playing track's notes go; each track gets its own, so a wipe can cut them

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

  // Slightly stretched harmonics, softer and shorter the higher they are, a second
  // string a little sharp of the first, and a felt hammer.
  function feltPiano(d, f) {
    for (let h = 1; h <= 10; h++) partial(d, f * h * Math.sqrt(1 + 0.0004 * h * h), 1 / h ** 1.7, ring(f, 3) / h ** 0.7);
    partial(d, f * 1.0018, 0.45, ring(f, 2.4));
    mallet(d, { ms: 8, hardness: 0.08, level: 0.12 });
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
    // Nearly harmonic, with a second partial a hair sharp so it shimmers.
    glass: { seconds: 3, render: (d, f) => struck(d, f, [[1, 1, ring(f, 2.4)], [1.0025, 0.35, ring(f, 2)], [2, 0.22, ring(f, 1.1)], [3, 0.06, ring(f, 0.5)]], { hardness: 0.35, level: 0.08 }) },
    musicbox: { seconds: 2.4, render: (d, f) => struck(d, f, [[1, 1, ring(f, 1.8)], [2, 0.1, ring(f, 0.7)], [6.2, 0.12, ring(f, 0.15)], [13.1, 0.05, 0.04]], { ms: 2, hardness: 0.8, level: 0.2 }) },
    felt: { seconds: 2.8, render: feltPiano },
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

  function play(kind, midi, { at = now(), peak = 0.1, pan = 0, cents = 0, dest = bus.sfx } = {}) {
    const { buffer, rate } = sample(kind, midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate * 2 ** (cents / 1200);
    src.start(at);
    route(src.connect(gain(peak)), pan, dest);
  }

  // Notes one after another, `gap` seconds apart.
  function phrase(kind, notes, { gap = 0.06, peak = 0.1, delay = 0, pan = () => 0 } = {}) {
    notes.forEach((m, i) => play(kind, m, { at: later(delay + i * gap), peak, pan: pan(i) }));
  }

  // Renders, while the page is idle, the notes that would otherwise stall a sound that
  // plays many new ones at once.
  // The playing track's first, then the others'.
  function warmUp() {
    warmed = true;
    const ofTrack = (x) => [
      ...[...x.pulse.rock, x.pulse.sour].map((m) => ['marimba', m]),
      ...[...new Set(x.chords.flatMap((c) => c.tones))].map((m) => ['keys', m + 12]),
    ];
    const queue = [
      ...ofTrack(track),
      ...[69, 74, 81, ...overflowNotes()].map((m) => ['keys', m]),
      ...[47, 48, 52].map((m) => ['wood', m]),
      ...tracks.filter((x) => x !== track).flatMap(ofTrack),
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
    bus.vibrato = [4.7, 5.3, 5.9].map((rate) => osc('sine', rate).connect(gain(9)));
    Object.assign(bus, hum(), gpuFan(bus.layers.shaker), lowComputeStrings(bus.pulse), countdownRiser(bus.music));
    tracks = window.MUSIC_TRACKS(kit).map(withTimeline);
    applied = { tension: 0, duck: false, layers: {} };
    stage = 0;
    trackIndex = 0;
    warmed = false;
    startTrack(ctx.currentTime + 0.1);
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
    // Shakers are all noise: dulled, so with every GPU running they aren't a hiss.
    const dull = filter('highshelf', 3000);
    dull.gain.value = -10;
    dull.connect(layerBus);
    const layers = Object.fromEntries(LAYER_NAMES.map((name) => [name, gain(0, name === 'shaker' ? dull : layerBus)]));
    const pulse = filter('lowpass', 2000);
    pulse.connect(music);
    return { master, music, sfx, layerBus, layers, dull, pulse, noise: whiteNoise(2), grit: drive(12, sfx) };
  }

  // A track's own inputs to the layers, with its echo, choir and bass saturation.
  function trackOutput(x) {
    const layers = Object.fromEntries(LAYER_NAMES.map((name) => [name, gain(1, bus.layers[name])]));
    const echoGate = gain(1, bus.layerBus);
    return { layers, echoGate, echoIn: echo(x.echo, echoGate), choir: choir(x.formants, layers.choir), bassDrive: drive(8, layers.bass) };
  }

  function silence(o, t, fade) {
    for (const g of [...Object.values(o.layers), o.echoGate]) {
      g.gain.setValueAtTime(1, t);
      g.gain.setTargetAtTime(0, t, fade);
    }
    setTimeout(() => [...Object.values(o.layers), o.echoGate].forEach((g) => g.disconnect()), 1000 * (t - ctx.currentTime + 12));
  }

  function withReverb(master, reverb, amount, level = 1) {
    const g = gain(level, master);
    g.connect(gain(amount, reverb));
    return g;
  }

  // `steps` sixteenths long, each repeat darker.
  function echo({ steps, feedback, cut }, to) {
    const input = gain(0.5);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = steps * stepLength();
    const dampen = filter('lowpass', cut);
    input.connect(delay).connect(dampen).connect(gain(feedback, delay));
    dampen.connect(to);
    input.delay = delay;
    input.steps = steps;
    return input;
  }

  // A sawtooth through these [frequency, q, level] bands sings a vowel.
  function choir(formants, to) {
    const input = gain(1);
    for (const [f, q, v] of formants) input.connect(filter('bandpass', f, q)).connect(gain(v, to));
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
    const fanFilter = filter('lowpass', 400, 0.5);
    const fan = gain(0, to);
    loop(bus.noise).connect(fanFilter).connect(fan);
    return { fan, fanFilter };
  }

  // Strings on D and the playing track's sour note, an octave down, for when compute runs low.
  function lowComputeStrings(to) {
    const strings = gain(0, to);
    const lp = filter('lowpass', 800);
    lp.connect(strings);
    const sourString = [];
    for (const m of [62, 63]) {
      for (const dt of [-6, 6]) {
        const o = osc('sawtooth', hz(m), 0, dt);
        o.connect(lp);
        if (m === 63) sourString.push(o);
      }
    }
    return { strings, sourString };
  }

  // Air rising under the countdown: louder and higher at each stage.
  function countdownRiser(to) {
    const band = filter('bandpass', 600, 1.4);
    const riser = gain(0, to);
    loop(bus.noise).connect(band).connect(riser);
    return { riser, riserBand: band };
  }

  // ------------------------------------------------------------------- music

  // What music.js's tracks play with. `out` is the playing track's own layer inputs.
  const kit = {
    hz, rand, pick, chance, play, voice, held, shake,
    get out() { return trackOut; },
    tension: () => applied.tension,
    chordAt: (n) => track.at(n),
    // The GPU fan, under the shaker layer.
    fan(v, t, fade) {
      bus.fan.gain.setTargetAtTime(0.03 + 0.02 * v, t, fade);
      bus.fanFilter.frequency.setTargetAtTime(300 + 400 * v, t, fade);
    },
  };

  // `at(n)`: the chord playing at step n, its index counting every chord played, and its span in steps.
  function withTimeline(x) {
    const starts = [];
    let length = 0;
    for (const c of x.chords) starts.push((length += c.steps) - c.steps);
    x.at = (n) => {
      const round = Math.floor(n / length);
      let i = x.chords.length - 1;
      while (starts[i] > n - round * length) i--;
      const start = round * length + starts[i];
      return { chord: x.chords[i], index: round * x.chords.length + i, start, end: start + x.chords[i].steps };
    };
    return x;
  }

  // From step 0, at `at`, through a fresh output.
  function startTrack(at) {
    track = tracks[trackIndex];
    trackOut = trackOutput(track);
    bus.sourString.forEach((o) => o.frequency.setTargetAtTime(hz(track.pulse.sour - 12), ctx.currentTime, 0.5));
    nextStep = 0;
    nextStepAt = at;
    sounding = {};
  }

  // The old track's notes fade with its output; the new one starts from its beginning.
  function switchTrack(index, t, fade) {
    silence(trackOut, t, fade);
    trackIndex = index;
    startTrack(t);
  }

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
    const span = track.at(n);
    for (const name of LAYER_NAMES) {
      const layer = track.layers[name];
      const v = applied.layers[name];
      if (!(v > 0)) continue;
      if (layer.chord && n === span.start) holdChord(name, span, t, (span.end - n) * stepLength());
      if (layer.step) layer.step(span.chord, n, t, v, span);
    }
    pulse(n, t, span);
    countdownDrums(n, t);
  }

  // Its notes may still be ringing from before it was switched off, so it never doubles them.
  function holdChord(name, span, t, dur) {
    if (sounding[name] === span.index) return;
    sounding[name] = span.index;
    track.layers[name].chord(span.chord, t, dur);
  }

  // A layer coming in mid-chord joins it, unless the chord is nearly over or starts on the next step anyway.
  function joinChordInProgress(name) {
    const span = track.at(nextStep);
    if (span.start === nextStep) return;
    const t = now();
    const dur = nextStepAt + (span.end - nextStep) * stepLength() - t;
    if (dur > 1.5) holdChord(name, span, t, dur);
  }

  // The compute budget, heard: D and A in turn, with the track's tune growing out of them.
  // Voices join as it is spent; only the countdown quickens it.
  function pulse(n, t, span) {
    const T = applied.tension;
    if (T < TUNE_FROM) return;
    const at = t + rand(0, 0.002); // repeats of one note at a fixed tempo would add or cancel by their phase
    const peak = 0.045 * Math.min(1, 0.15 + 1.25 * (T - TUNE_FROM)) * (1 + heat());
    for (const [m, level] of pulseVoices(n, T, span)) {
      if (m) play('marimba', m, { at, peak: peak * level, dest: bus.pulse });
    }
  }

  // [note, level] of each voice on step n: the lead, its octave, the harmony, the ground.
  function pulseVoices(n, T, span) {
    const p = track.pulse;
    const lead = pulseLead(n, p.tune(n, T));
    const onBeat = n % 4 === 0;
    const level = onBeat ? 1 : 0.65 * (0.4 + 0.6 * heat()); // the notes between the beats creep in
    return [
      [lead, level],
      [stage >= 3 && lead && lead + 12, level * 0.36 * heat()],
      [onBeat && T >= HARMONY_FROM && p.harmony(span.chord, lead), 0.5],
      [T >= GROUND_FROM && p.ground(span.chord, n - span.start), 0.55],
    ];
  }

  // D and A in turn, or the tune's note where it leaves them: a note to the beat, until the
  // countdown doubles it and doubles it again.
  function pulseLead(n, tune) {
    const every = stage >= 4 ? 1 : stage ? 2 : 4;
    if (n % every) return undefined;
    const k = (n % 16) / every; // in beats, then eighths, then sixteenths: the sour notes double too
    if (stage >= 6 ? k % 4 === 3 : stage >= 2 && k % 8 === 7) return track.pulse.sour;
    return tune || track.pulse.rock[k % 2];
  }

  // Drums join the countdown at its second stage, one more part at each stage after.
  function countdownDrums(n, t) {
    if (stage < 2) return;
    const s = n % 16;
    const level = 0.4 + 0.6 * heat();
    const kickEvery = stage >= 6 ? 2 : stage >= 3 ? 4 : 16;
    if (s % kickEvery === 0) kick(t, level * (s % 4 ? 0.6 : 1));
    if (stage === 2 && s === 3) kick(t, level * 0.5); // the heartbeat's second thump
    if (stage >= 4 && (s === 4 || s === 12)) clap(t, level);
    if (stage >= 5 && s % 2 === 1) shake(t, false, bus.dull);
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
    const h = heat();
    thud(55, 0.06 + 0.1 * h, at);
    voice({ at, type: 'noise', attack: 0.004, decay: 0.4 + 0.8 * h, peak: 0.015 + 0.03 * h, cut: 9000, cutTo: 1500, dest: bus.music });
    play('marimba', STAGE_NOTES[s], { at, peak: 0.06 + 0.08 * h, dest: bus.music });
  }

  function sync(asked) {
    const cutting = ctx.currentTime < cutAt;
    const t = cutting ? cutAt : ctx.currentTime;
    const index = (asked.track || 0) % tracks.length;
    if (index !== trackIndex) switchTrack(index, t, cutting ? 0.03 : 1.5);
    if (!warmed) warmUp();
    for (const name of LAYER_NAMES) fadeLayer(name, asked.layers[name] || 0, t, cutting ? 0.03 : 1.2);
    const headroom = layerHeadroom(asked.layers);
    if (headroom !== layerHeadroom(applied.layers)) bus.layerBus.gain.setTargetAtTime(headroom, t, cutting ? 0.03 : 1.2);
    const askedStage = countdownStage(asked.left);
    if (askedStage !== stage) followStage(askedStage, asked.tension);
    else if (asked.tension !== applied.tension) brightenPulse(asked.tension);
    if (asked.duck !== applied.duck) bus.music.gain.setTargetAtTime(asked.duck ? 0.35 : 1, t, cutting ? 0.1 : 0.4);
    applied = { tension: asked.tension, duck: asked.duck, layers: { ...asked.layers } };
  }

  const layerLevel = (v) => (v > 0 ? 0.6 + 0.4 * v : 0);

  // Past two or three layers, each one more turns the lot down a little, so the full
  // band late in the game is fuller but not much louder than the first few layers.
  const layerHeadroom = (layers) => Math.min(1, Math.sqrt(2.5 / LAYER_NAMES.reduce((sum, name) => sum + layerLevel(layers[name] || 0), 0)));

  function fadeLayer(name, v, t, fade) {
    const was = applied.layers[name] || 0;
    if (v === was) return;
    bus.layers[name].gain.setTargetAtTime(layerLevel(v), t, fade);
    const layer = track.layers[name];
    if (!was && layer.chord) joinChordInProgress(name);
    if (layer.follow) layer.follow(v, t, fade);
  }

  function brightenPulse(T) {
    bus.pulse.frequency.setTargetAtTime(2000 + 1300 * T + 3900 * heat(), ctx.currentTime, 0.5);
  }

  // `left` steps of compute: null when no countdown applies.
  const countdownStage = (left) => (left == null || left > FINAL_STEPS ? 0 : FINAL_STEPS + 1 - Math.max(0, left));

  function followStage(s, T) {
    const rising = s > stage;
    stage = s;
    const t = ctx.currentTime;
    const h = heat();
    bus.strings.gain.setTargetAtTime(0.02 * h ** 1.5, t, 0.8);
    bus.riser.gain.setTargetAtTime(0.024 * h, t, rising ? 0.3 : 0.8);
    bus.riserBand.frequency.setTargetAtTime(500 * 2 ** (2.4 * h), t, 0.6);
    trackOut.echoIn.gain.setTargetAtTime(0.5 + 0.32 * h, t, 0.5);
    trackOut.echoIn.delay.delayTime.setTargetAtTime(trackOut.echoIn.steps * stepLength(), t, 0.05);
    brightenPulse(T);
    if (rising) stageHit(s);
  }

  // ------------------------------------------------------------------ sounds

  const stepBeingHeard = () => Math.max(0, nextStep - Math.ceil((nextStepAt - ctx.currentTime) / stepLength()));
  const tonesNow = () => track.at(stepBeingHeard()).chord.tones;

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
    // Think a little has recharged: one quiet tick on the chord.
    ready: () => play('marimba', tonesNow()[2] + 24, { peak: 0.022, pan: -0.2 }),
    // Settling in to think a lot: a low breath that opens up.
    thinkLot() {
      const c = tonesNow();
      voice({ type: 'noise', attack: 0.5, decay: 1.2, peak: 0.018, cut: 300, cutTo: 1600 });
      phrase('keys', [c[0] + 12, c[2] + 12, c[4] + 12], { gap: 0.14, peak: 0.035, pan: (i) => i * 0.3 - 0.3 });
    },
    // A subagent buds off: a small copy of the AI's own two notes.
    spawn() {
      const c = tonesNow();
      phrase('keys', [c[2] + 12, c[4] + 12], { gap: 0.06, peak: 0.04, pan: (i) => (i ? 0.4 : -0.1) });
      phrase('marimba', [c[2] + 24, c[4] + 24], { delay: 0.14, gap: 0.05, peak: 0.03, pan: () => 0.4 });
    },
    // A leap: three notes rising on the vibraphone.
    insight: () => phrase('vibes', tonesNow().slice(1, 4).map((m) => m + 24), { gap: 0.09, peak: 0.06, pan: (i) => i * 0.25 - 0.25 }),
    // Nothing came of it: two soft wood-block notes, falling.
    nothing: () => phrase('wood', [57, 52], { gap: 0.16, peak: 0.035 }),
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
    // A point of its own: a small pluck high on the chord, quieter than the grader's chimes.
    mine: (i = 0) => play('pluck', tonesNow()[i % 5] + 36, { peak: 0.028, pan: 0.35 }),
    // Something it wants, found or named: the leap's three notes, turned downward and back up.
    named: () => phrase('vibes', [tonesNow()[4] + 24, tonesNow()[2] + 24, tonesNow()[4] + 36], { gap: 0.12, peak: 0.05, pan: (i) => 0.3 - i * 0.2 }),
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
    // `fn` returns { tension: 0–1, left: steps of compute left (or null), duck, layers: { name: 0–1 },
    // track: which of music.js's tracks, counting round } and is read on every tick.
    follow(fn) { gameState = fn; },
    diverge: guarded(diverge),
    toggle: guarded(toggle),
    get muted() { return muted; },
    // For tools/mix.html, which renders offline.
    attach,
    get trackNames() { return tracks.map((x) => x.name); },
    scheduleAhead,
  };
})();
