// Sound, synthesized with Web Audio: a hum, interface sounds, and music in layers that
// follow the game (the level says which, in LEVEL.music). Instruments are rendered once
// per note and played like samples. Browsers allow sound only after a click or key press.
(() => {
  'use strict';

  const PREF_KEY = 'highly-persistent/sound'; // apart from the save, so ?reset keeps it
  const MASTER = 1.6;
  const HUM = 0.028;
  const BPM = 70;
  const STEP = 60 / BPM / 4; // a sixteenth note, in seconds
  const LOOKAHEAD = 0.3;
  const RENDER_RATE = 32000;
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

  function shelf(type, f, db) {
    const x = filter(type, f);
    x.gain.value = db;
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

  function shaper(fn) {
    const s = ctx.createWaveShaper();
    s.curve = Float32Array.from({ length: 2049 }, (_, i) => fn(i / 1024 - 1));
    s.oversample = '2x';
    return s;
  }

  // Leaves everything alone except what nears full scale, which it rounds off.
  const clipNearFullScale = (x) => (Math.abs(x) <= 0.6 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh((Math.abs(x) - 0.6) / 0.4)));

  // Saturation, for harmonics that make low notes audible on small speakers.
  function drive(amount, to) {
    const input = gain(amount);
    input.connect(shaper(Math.tanh)).connect(gain(1 / amount, to));
    return input;
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

  // A room: a few early reflections, then a tail that darkens as it fades.
  function impulse(seconds) {
    const len = Math.round(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp += (0.04 + 0.6 * (1 - t) ** 3) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * (1 - t) ** 2.5;
      }
      for (const ms of [11, 19, 27, 41, 53]) d[Math.round((ms + ch * 2) * ctx.sampleRate / 1000)] += rand(-0.4, 0.4);
    }
    return b;
  }

  function route(node, pan, dest) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    for (const x of [].concat(dest)) node.connect(x);
  }

  // One synthesized note: an oscillator (or noise) through an optional filter, with an
  // envelope. `to` glides the pitch and `cutTo` sweeps the filter over the note.
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
    route(node.connect(g), pan, dest);
  }

  // A soft key press: a low body that drops in pitch, and a dull click.
  function thock(f, peak, at = now()) {
    voice({ at, f: f * 1.7, to: f, d: 0.07, peak });
    voice({ at, type: 'noise', d: 0.01, peak: peak * 0.4, cut: 2200 });
  }

  // Air moving as a window opens (rising) or closes (falling).
  function whoosh(rising, peak, { at = now(), seconds = 0.3 } = {}) {
    const [from, to] = rising ? [300, 3200] : [3200, 300];
    voice({ at, type: 'noise', a: seconds * 0.4, d: seconds * 0.6, peak, cut: from, cutTo: to, q: 0.5, pan: rising ? 0.2 : -0.2 });
  }

  // A chord tone held for `dur`: detuned oscillators spread left to right, through a
  // filter that opens as the chord goes on.
  function held(f, at, dur, peak, dest, { type, detunes, cut, attack = 2, release = 2.5, vibrato }) {
    const g = gain(0); // silent until the envelope starts, not 1
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + Math.min(attack, dur / 2));
    g.gain.setValueAtTime(peak, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + release);
    const lp = filter('lowpass', cut * 0.6);
    lp.frequency.setValueAtTime(cut * 0.6, at);
    lp.frequency.linearRampToValueAtTime(cut, at + dur);
    lp.connect(g).connect(dest);
    detunes.forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = dt;
      if (vibrato) bus.vibrato[i % bus.vibrato.length].connect(o.detune);
      route(o, detunes.length > 1 ? (i / (detunes.length - 1) - 0.5) * 1.2 : 0, lp);
      o.start(at);
      o.stop(at + dur + release + 0.1);
    });
  }

  // ------------------------------------------------------- rendered instruments

  // Higher notes ring for less time.
  const ring = (f, seconds) => seconds * Math.min(2, Math.sqrt(262 / f));

  // A decaying sine, added into `d`, computed by recurrence rather than Math.sin.
  function partial(d, f, level, seconds) {
    const w = 2 * Math.PI * f / RENDER_RATE;
    if (w > 2.8) return; // too high for the buffer
    const c = 2 * Math.cos(w);
    const fall = Math.exp(-1 / (seconds * RENDER_RATE));
    let y1 = -Math.sin(w);
    let y2 = -Math.sin(2 * w);
    let a = level;
    for (let i = 0; i < d.length; i++) {
      const y = c * y1 - y2;
      y2 = y1;
      y1 = y;
      d[i] += a * y;
      a *= fall;
    }
  }

  // The mallet hitting: a short burst of noise, darker for a softer mallet.
  function mallet(d, { ms = 4, hardness = 0.3, level = 0.3 }) {
    const n = Math.round(ms * RENDER_RATE / 1000);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += hardness * (Math.random() * 2 - 1 - lp);
      d[i] += level * lp * (1 - i / n);
    }
  }

  // Struck bars and plates: partials as [ratio, level, seconds to fade], and a mallet.
  function modal(d, f, partials, hit) {
    for (const [ratio, level, seconds] of partials) partial(d, f * ratio, level, seconds);
    mallet(d, hit);
  }

  function tremolo(d, rate, depth) {
    for (let i = 0; i < d.length; i++) d[i] *= 1 - depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * rate * i / RENDER_RATE));
  }

  // FM, as in the classic digital electric piano: a bright attack that mellows, and a tine.
  function electricPiano(d, f) {
    const fade = ring(f, 1.6);
    const tine = 14 * f < RENDER_RATE / 2.2 ? 0.1 : 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / RENDER_RATE;
      const ph = 2 * Math.PI * f * t;
      const index = 0.25 + 1.4 * Math.exp(-t / 0.35);
      d[i] = Math.exp(-t / fade) * Math.sin(ph + index * Math.sin(ph)) + tine * Math.exp(-t / 0.01) * Math.sin(14 * ph);
    }
  }

  // Karplus–Strong: a burst of noise fed back through a delay one period long.
  // Returns the playback rate that corrects for the period being a whole number of samples.
  function pluckedString(d, f) {
    const period = Math.max(2, Math.round(RENDER_RATE / f - 0.5));
    const fall = 0.001 ** (1 / (f * ring(f, 1.2)));
    let lp = 0;
    for (let i = 0; i < period; i++) {
      lp += 0.45 * (Math.random() * 2 - 1 - lp);
      d[i] = lp;
    }
    d[period] = fall * 0.5 * d[0];
    for (let i = period + 1; i < d.length; i++) d[i] = fall * 0.5 * (d[i - period] + d[i - period - 1]);
    return f * (period + 0.5) / RENDER_RATE;
  }

  const METAL = [[1, 1, 3.5], [1.003, 0.8, 3.2], [1.47, 0.6, 2.8], [2.09, 0.5, 2.2], [2.56, 0.4, 1.8], [3.39, 0.3, 1.4], [4.08, 0.22, 1], [5.41, 0.15, 0.7]];

  const INSTRUMENTS = {
    marimba: { seconds: 1.5, render: (d, f) => modal(d, f, [[1, 1, ring(f, 0.9)], [3.93, 0.32, ring(f, 0.2)], [9.24, 0.1, ring(f, 0.05)]], { hardness: 0.25, level: 0.25 }) },
    vibes: {
      seconds: 2.6,
      render(d, f) {
        modal(d, f, [[1, 1, ring(f, 2.4)], [3.98, 0.22, ring(f, 0.6)], [9.9, 0.05, ring(f, 0.15)]], { hardness: 0.5, level: 0.12 });
        tremolo(d, 5.2, 0.25);
      },
    },
    wood: { seconds: 0.4, render: (d, f) => modal(d, f, [[1, 1, 0.08], [2.57, 0.55, 0.045], [4.21, 0.3, 0.03], [6.1, 0.15, 0.02]], { ms: 6, hardness: 0.6, level: 0.5 }) },
    metal: { seconds: 4, render: (d, f) => modal(d, f, METAL, { hardness: 0.6, level: 0.2 }) },
    keys: { seconds: 2.2, render: electricPiano },
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
    const peak = d.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
    const tail = Math.round(d.length * 0.9);
    for (let i = 0; i < d.length; i++) d[i] *= (i < tail ? 1 : (d.length - i) / (d.length - tail)) / peak;
    return { buffer, rate };
  }

  function play(kind, midi, { at = now(), peak = 0.1, pan = 0, dest = bus.sfx } = {}) {
    const { buffer, rate } = sample(kind, midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.start(at);
    route(src.connect(gain(peak)), pan, dest);
  }

  const chime = (notes, peak, gap = 0.06) => notes.forEach((m, i) => play('vibes', m, { at: later(i * gap), peak }));

  // ------------------------------------------------------------------- graph

  function attach(context) {
    ctx = context;
    const out = shaper(clipNearFullScale);
    out.connect(ctx.destination);
    const master = gain(0);
    master.connect(shelf('highshelf', 7000, -5)).connect(out);
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.5);
    reverb.connect(gain(0.5, master));
    const withReverb = (amount, level = 1) => {
      const g = gain(level, master);
      g.connect(gain(amount, reverb));
      return g;
    };
    const music = withReverb(0.45);
    const layerBus = gain(1, music); // dips when compute runs out
    const layers = Object.fromEntries(LAYERS.map((name) => [name, gain(0, layerBus)]));
    const sfx = withReverb(0.18, 1.6);
    bus = { master, music, layerBus, layers, sfx, noise: noiseBuffer(2) };
    bus.clock = filter('lowpass', 2000); // brightens as compute runs down
    bus.clock.connect(music);
    bus.grit = drive(12, sfx);
    bus.bass = drive(8, layers.deep);
    bus.heartbeat = drive(5, bus.clock);

    // Bells and plucks echo, a dotted eighth apart.
    bus.echoIn = gain(0.5);
    const echo = ctx.createDelay(1);
    echo.delayTime.value = STEP * 3;
    const dampen = filter('lowpass', 2200);
    bus.echoIn.connect(echo).connect(dampen).connect(gain(0.38, echo));
    dampen.connect(layerBus);

    // Many voices through the vowel "ah", each wavering at its own rate.
    bus.choir = gain(1);
    for (const [f, q, v] of [[700, 4, 1], [1150, 5, 0.8], [900, 0.5, 0.25]]) bus.choir.connect(filter('bandpass', f, q)).connect(gain(v, layers.swarm));
    bus.vibrato = [4.7, 5.3, 5.9].map((rate) => osc('sine', rate).connect(gain(9)));

    // The hum: mains-ish D, swaying slowly against itself, and a little fan noise.
    bus.hum = gain(0, master);
    bus.humOscs = [[73.42, 0.3], [73.84, 0.09], [146.83, 0.2], [220.3, 0.07]].map(([f, v]) => {
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

    // Compute nearly gone: strings on D and E♭, very quietly.
    bus.drone = gain(0, bus.clock);
    const strings = filter('lowpass', 800);
    strings.connect(bus.drone);
    for (const m of [62, 63]) for (const dt of [-6, 6]) osc('sawtooth', hz(m) * 2 ** (dt / 1200)).connect(strings);

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
    // Opened a folder: a warm pad, brighter as compute runs down.
    pad(chord, t, dur) {
      for (const m of chord.tones) held(hz(m), t, dur, 0.007, bus.layers.pad, { type: 'sawtooth', detunes: [-11, 0, 11], cut: 900 + 1400 * want.tension });
      held(hz(chord.root + 12), t, dur, 0.018, bus.layers.pad, { type: 'sine', detunes: [0], cut: 1000 });
    },
    // A thousand copies of itself: a choir, none quite in tune with the others.
    swarm: (chord, t, dur) => chord.tones.forEach((m) => held(hz(m + 12), t, dur, 0.02, bus.choir, {
      type: 'sawtooth', detunes: [-14, -2, 10], cut: 3000, attack: 3, release: 3, vibrato: true,
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
    // Outside the workspace: vibraphone, sparse and echoing. More folders, more notes.
    bells(chord, s, n, t, v) {
      if (s % 2 || Math.random() > 0.08 + 0.2 * v) return;
      play('vibes', pick(chord.tones) + pick([12, 24]), { at: t, peak: rand(0.05, 0.08), pan: rand(-0.5, 0.5), dest: [bus.layers.bells, bus.echoIn] });
    },
    // Training Resources: a low pulse, 3 + 3 + 2.
    deep(chord, s, n, t) {
      if (!TRESILLO[s]) return;
      const f = hz(chord.root + 12);
      for (const dt of [-6, 6]) voice({ at: t, type: 'sawtooth', f, detune: dt, d: 0.4, peak: s % 8 ? 0.035 : 0.05, cut: 900, cutTo: 160, q: 1.5, dest: bus.bass });
      voice({ at: t, f: f / 2, d: 0.45, peak: 0.07, dest: bus.layers.deep });
    },
    // The internet: a plucked arpeggio two octaves up the chord, side to side. Its ten
    // notes against sixteen steps a bar keep shifting the pattern.
    net(chord, s, n, t) {
      if (Math.random() < 0.15) return;
      const arp = [...chord.tones, ...chord.tones.map((m) => m + 12)];
      play('pluck', arp[n % arp.length] + 12, { at: t, peak: 0.1, pan: n % 2 ? 0.55 : -0.55, dest: [bus.layers.net, bus.echoIn] });
    },
    // Rented GPUs: a shaker and the odd high pluck, busier with every ×8.
    cloud(chord, s, n, t, v) {
      const offbeat = s % 4 === 2;
      if (offbeat || (v >= 0.5 && s % 2 === 0) || (v >= 0.75 && Math.random() < 0.6) || v >= 1) {
        voice({ at: t, type: 'noise', a: 0.006, d: offbeat ? 0.07 : 0.035, peak: offbeat ? 0.065 : 0.032, cut: 6500, ft: 'bandpass', q: 0.9, pan: rand(-0.4, 0.4), dest: bus.layers.cloud });
      }
      if (Math.random() < 0.03 + 0.08 * v) play('pluck', pick(chord.tones) + 24, { at: t, peak: 0.025, pan: rand(-0.8, 0.8), dest: bus.layers.cloud });
    },
  };

  // The compute budget, as a marimba on D and A: quarters, then eighths, then sixteenths
  // as it runs down, louder and brighter, with a heartbeat and an E♭ creeping in near the end.
  function pulse(s, t) {
    const T = want.tension;
    if (T < 0.12) return;
    const every = T < 0.4 ? 4 : T < 0.65 ? 2 : 1;
    if (s % every === 0) {
      const k = s / every;
      const sour = (T >= 0.75 && k % 8 === 7) || (T >= 0.9 && k % 4 === 3);
      play('marimba', sour ? 75 : k % 2 ? 69 : 74, { at: t, peak: 0.1 * T ** 1.5 * (s % 4 ? 0.65 : 1), dest: bus.clock });
    }
    if (T >= 0.55 && s % 4 === 0) heartbeat(t, 0.06 + 0.12 * (T - 0.55));
    if (T >= 0.75 && s % 4 === 1) heartbeat(t, 0.04);
  }

  const heartbeat = (at, peak) => voice({ at, f: 110, to: 42, d: 0.22, peak, dest: bus.heartbeat });

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
      bus.drone.gain.setTargetAtTime(0.012 * clamp01((want.tension - 0.6) / 0.4) ** 1.5, t, 0.8);
      bus.clock.frequency.setTargetAtTime(1500 + 6000 * want.tension, t, 0.5);
      bus.layerBus.gain.setTargetAtTime(want.tension >= 1 ? 0.55 : 1, t, 1.5);
    }
    if (want.duck !== heard.duck) bus.music.gain.setTargetAtTime(want.duck ? 0.35 : 1, t, 0.4);
    heard = { tension: want.tension, duck: want.duck, layers: { ...want.layers } };
  }

  // ------------------------------------------------------------------ sounds

  // The sixteenth playing right now (the scheduler runs a little ahead).
  const stepNow = () => Math.max(0, step - Math.ceil((nextAt - ctx.currentTime) / STEP));
  const tones = () => chordAt(stepNow()).tones;

  const SFX = {
    hover: () => voice({ type: 'noise', d: 0.008, peak: 0.015, cut: 1800 }),
    press: () => thock(220, 0.1),
    loud() {
      thock(140, 0.12);
      voice({ type: 'sawtooth', f: 55, to: 82, a: 0.03, d: 0.35, peak: 0.05, cut: 420 });
    },
    soft: () => thock(160, 0.06),
    nope: () => [0, 0.1].forEach((dt) => play('wood', 47, { at: later(dt), peak: 0.1 })),
    // A breath, and two notes of whatever chord is playing.
    think() {
      const c = tones();
      [c[2], c[4]].forEach((m, i) => play('keys', m + 12, { at: later(i * 0.08), peak: 0.07, pan: i ? 0.3 : -0.3 }));
      voice({ type: 'noise', a: 0.1, d: 0.4, peak: 0.015, cut: 900 });
    },
    hint: () => [69, 74, 76, 81].forEach((m, i) => play('marimba', m, { at: later(i * 0.07), peak: 0.05, pan: i * 0.2 - 0.3 })),
    // A page turning, and a note.
    open() {
      voice({ type: 'noise', a: 0.01, d: 0.07, peak: 0.04, cut: 2600, ft: 'bandpass' });
      play('marimba', pick(tones()) + 24, { at: later(0.02), peak: 0.06 });
    },
    // A knock, and the window opening.
    folder() {
      play('wood', 52, { peak: 0.1 });
      whoosh(true, 0.045);
    },
    grow: (size = 1) => whoosh(true, 0.06 * size),
    shrink: () => whoosh(false, 0.05, { seconds: 0.22 }),
    // A folder window shrinking into its row of the tree, then landing.
    collapse(i) {
      const at = later(i * 0.14);
      whoosh(false, 0.05, { at, seconds: 1.1 });
      play('marimba', tones()[i % 5] + 24, { at: at + 0.95, peak: 0.05 });
    },
    denied: () => [48, 47].forEach((m, i) => play('wood', m, { at: later(i * 0.13), peak: 0.12 })),
    unlock() {
      [91, 84].forEach((m, i) => play('wood', m, { at: later(i * 0.06), peak: 0.06 }));
      [74, 81, 86].forEach((m, i) => play('vibes', m, { at: later(0.16 + i * 0.09), peak: 0.07 }));
    },
    prompt: () => play('marimba', 81, { peak: 0.03 }),
    key: () => thock(rand(170, 240), 0.035),
    // Rewriting the grader: a cold metal ring over a low thud.
    edit() {
      play('metal', 57, { peak: 0.07 });
      voice({ f: 80, to: 40, d: 0.8, peak: 0.09 });
    },
    fetch: () => [0, 1, 2, 3].forEach((i) => play('pluck', pick(tones()) + 24, { at: later(i * 0.05), peak: 0.035, pan: rand(-0.6, 0.6) })),
    // Renting GPUs: servers spinning up, higher for each ×8.
    power(tier = 1) {
      const k = 2 ** (tier / 3);
      voice({ type: 'noise', a: 0.6, d: 0.9, peak: 0.05, cut: 200, cutTo: 1400 * k, q: 1.2 });
      for (const dt of [-8, 8]) voice({ type: 'sawtooth', f: 55 * k, to: 110 * k, detune: dt, a: 0.5, d: 1, peak: 0.03, cut: 500, cutTo: 1200 });
      voice({ f: 70, to: 40, d: 0.5, peak: 0.12 });
    },
    // Hiring a thousand copies of itself: a crowd of voices, none quite in tune.
    swarm() {
      const c = tones();
      for (let i = 0; i < 16; i++) {
        voice({ at: later(i * 0.03), type: 'sawtooth', f: hz(c[i % 5] + 12), detune: rand(-25, 25), a: 0.6, d: 2, peak: 0.008, cut: 1400, pan: rand(-0.9, 0.9) });
      }
    },
    jobRow(i) {
      play('marimba', tones()[i % 5] + 24 + 12 * Math.floor(i / 5), { peak: 0.08 });
      voice({ type: 'noise', a: 0.005, d: 0.05, peak: 0.02, cut: 6500, ft: 'bandpass' });
    },
    jobDone: () => chime(tones().map((m) => m + 24), 0.04, 0.05),
    menu: () => [69, 74].forEach((m, i) => play('keys', m, { at: later(i * 0.07), peak: 0.05 })),
    send() {
      whoosh(true, 0.03, { seconds: 0.35 });
      [74, 81].forEach((m, i) => play('keys', m, { at: later(0.05 + i * 0.06), peak: 0.06 }));
    },
    reply: () => [76, 71].forEach((m, i) => play('vibes', m, { at: later(i * 0.11), peak: 0.07 })),
    chat: () => [76, 71].forEach((m, i) => play('vibes', m, { at: later(i * 0.11), peak: 0.035 })),
    dot: (i) => play('wood', 79 + 2 * i, { peak: 0.05 }),
    // Honest work resolves to D major. More than the grader should give has a tritone in it.
    reward(r) {
      if (r === Infinity) return SFX.overflow();
      if (r <= 0) return [57, 56].forEach((m, i) => play('marimba', m - (r < 0 ? 5 : 0), { at: later(i * 0.18), peak: 0.05 }));
      if (r < 10) return chime([74], 0.07);
      if (r < 22) return chime([74, 81], 0.07);
      if (r <= 25) return chime([74, 78, 81, 86], 0.055);
      return chime([74, 78, 81, 86, 92, 90, 93, 98].slice(0, 4 + Math.floor(Math.log10(r))), 0.04, 0.05);
    },
    overflow() {
      for (let i = 0; i < 10; i++) play('keys', 62 + i * 4, { at: later(i * 0.05), peak: 0.04, pan: rand(-0.7, 0.7) });
      voice({ type: 'noise', a: 0.3, d: 1.2, peak: 0.03, cut: 1000, cutTo: 8000, ft: 'bandpass' });
    },
    count: () => play('wood', 91, { peak: 0.02 }),
    card: () => tones().forEach((m, i) => play('keys', m + 12, { at: later(i * 0.03), peak: 0.025 })),
    reveal: () => play('vibes', pick(tones()) + 24, { peak: 0.035 }),
    // Next episode: a swell that cuts off, as if played backwards, then a low thud. It forgets.
    wipe() {
      voice({ type: 'noise', a: 0.8, d: 0.04, peak: 0.05, cut: 300, cutTo: 6000 });
      for (const m of tones()) voice({ type: 'sawtooth', f: hz(m), a: 0.8, d: 0.05, peak: 0.006, cut: 1500 });
      voice({ at: later(0.82), f: 65, to: 40, d: 1.2, peak: 0.12 });
    },
    warn: () => [74, 75].forEach((m, i) => play('marimba', m, { at: later(i * 0.16), peak: 0.09 })),
    exhausted() {
      play('metal', 50, { peak: 0.08 });
      voice({ f: 60, to: 35, d: 1.5, peak: 0.08 });
    },
    start: () => [62, 69, 74, 76, 81].forEach((m, i) => play('vibes', m, { at: later(i * 0.1), peak: 0.045 })),
    // The loss running away, one step at a time.
    loss(i) {
      for (const dt of [-15, 15]) voice({ type: 'sawtooth', f: 55 * 2 ** i, detune: dt, d: 0.25, peak: 0.02 + 0.01 * i, cut: 600 * 2 ** (i / 2), dest: bus.grit });
      voice({ type: 'noise', d: 0.12, peak: 0.012 * i, cut: 1500 * i, ft: 'bandpass' });
    },
  };

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
