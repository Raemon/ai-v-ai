// The soundtrack: three tracks, all in D over the hum's low D, which take turns one
// episode each. audio.js plays them. Each has the same six layers (LEVEL.music
// picks which are playing), its own chords, tempo and instruments, and a compute
// pulse.
//
// A layer can play at chord changes, `chord(chord, t, dur)`; on every sixteenth,
// `step(chord, n, t, v, span)`, where `span` is the chord's { start, end } in steps;
// and follow its own level, `follow(v, t, fade)`.
//
// The pulse rocks between D and A, a note to the beat: audio.js plays those (`k.rock`). A
// track gives it `departure(n)`, the note that takes their place on step n, if any;
// `harmony(chord, m)`, the note under `m`; `ground(chord, s)`, a low note `s` steps into
// a chord; and `sour`, a note in none of the track's chords, for the countdown.
(() => {
  'use strict';

  // Every chord has five tones: sounds (hover, think) pick among them.
  const chord = (root, tones, steps = 32, lift = 0) => ({ root, tones, steps, lift });

  const pitchClasses = (notes) => new Set(notes.map((m) => m % 12));

  // The notes a melody can use over a chord: its tones, plus the scale's other notes
  // except any a semitone from a chord tone.
  function chordScale(c, scale) {
    const tones = pitchClasses([c.root, ...c.tones]);
    const near = (p) => tones.has((p + 1) % 12) || tones.has((p + 11) % 12);
    return new Set([...tones, ...scale.filter((p) => !near(p))]);
  }

  const inRange = (pcs, lo, hi) => {
    const out = [];
    for (let m = lo; m <= hi; m++) if (pcs.has(m % 12)) out.push(m);
    return out;
  };

  const nearest = (list, m) => list.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
  const chordTonesIn = (c, lo, hi) => inRange(pitchClasses(c.tones), lo, hi);

  // A semitone apart, the lower note goes up an octave: close clusters muddy a low choir.
  const spread = (tones) => tones.map((m, i) => (tones[i + 1] - m === 1 ? m + 12 : m));

  // A line planned a phrase at a time: `compose(n, v, comingIn)` returns the phrase's notes,
  // a Map from step to note. A line that was silent (not asked for every step) waits for
  // the next phrase to come back in, and that phrase is told it is `comingIn`.
  function inPhrases(phrase, compose) {
    let plan = new Map();
    let prev = -1;
    let comingIn = true;

    return (n, v) => {
      if (n !== prev + 1) {
        plan = new Map();
        comingIn = true;
      }
      if (n % phrase === 0) {
        plan = compose(n, v, comingIn);
        comingIn = false;
      }
      prev = n;
      return plan.get(n % phrase);
    };
  }

  // A melody that thinks in phrases of `phrase` steps. Each phrase is a motif, a list
  // of [step, move] with moves counted along the scale, started from a chord tone near
  // where the last phrase ended. Some phrases are turned upside down, short ones are
  // sometimes played at half speed, and some are left silent, so the line never quite
  // repeats. Notes on the half-bar and each phrase's last note land on chord tones.
  function melody(k, { scale, lo, hi, phrase, motifs, rest }) {
    let last = Math.round((lo + hi) / 2);

    return inPhrases(phrase, (n, v) => {
      const plan = new Map();
      const start = k.chordAt(n);
      if (k.chance(rest(v, start.chord))) return plan;
      const motif = k.pick(motifs);
      const flip = k.chance(0.3);
      const slow = k.chance(0.25) && 2 * motif[motif.length - 1][0] < phrase;
      const pull = last < lo + 5 ? 4 : last > hi - 5 ? -4 : k.rand(-3, 3); // drift back from the edges
      let m = nearest(chordTonesIn(start.chord, lo, hi), last + pull);
      motif.forEach(([s, move], i) => {
        const at = slow ? 2 * s : s;
        const c = k.chordAt(n + at).chord;
        const notes = inRange(chordScale(c, scale), lo, hi);
        let j = notes.indexOf(nearest(notes, m)) + (flip ? -move : move);
        if (j < 0) j = -j;
        if (j >= notes.length) j = 2 * (notes.length - 1) - j;
        m = notes[j];
        if (at % 8 === 0 || i === motif.length - 1) m = nearest(chordTonesIn(c, lo, hi), m);
        plan.set(at, m);
      });
      last = m;
      return plan;
    });
  }

  // Where the pulse leaves D and A, a two-bar phrase at a time. Some phrases stay plain; the
  // rest take one of `shapes`, lists of [beat, move]: that beat's D or A moves by `move`,
  // counted along the chord's scale. A phrase coming in is plain, no shape comes twice
  // running, and the list (plainest first) opens up over the first half of the compute.
  function departures(k, { scale, shapes }) {
    let plain = true;
    let shape = null;

    const moved = (n, [beat, move]) => {
      const notes = inRange(chordScale(k.chordAt(n + 4 * beat).chord, scale), k.rock[1] - 12, k.rock[0] + 12);
      return [4 * beat, notes[notes.indexOf(nearest(notes, k.rock[beat % 2])) + move]];
    };

    return inPhrases(32, (n, v, comingIn) => {
      plain = comingIn || !k.chance(plain ? 0.75 : 0.5);
      if (plain) return new Map();
      const known = shapes.slice(0, 2 + Math.floor(8 * k.tension())); // two at least: the last one is barred
      shape = k.pick(known.filter((x) => x !== shape));
      return new Map(shape.map((x) => moved(n, x)));
    });
  }

  // The chord tone below `m` by the first of these intervals (in semitones) that reaches one.
  const chordToneBelow = (...intervals) => (c, m) => {
    const tones = pitchClasses(c.tones);
    const gap = intervals.find((i) => tones.has((m - i) % 12));
    return gap && m - gap;
  };

  // The chord's root every `every` steps and, `answer` steps later, a tone from its middle.
  const ground = (every, answer) => (c, s) => (s % every === 0 ? c.root + 12 : s % every === answer && c.tones[2]);

  // ------------------------------------------------------------ the theme
  // Persistence's tune, which its two reprises take up: [step, note, length in steps] over
  // its four chords, two bars each. It rises 3 + 3 + 2 (the bass's tresillo, at half speed)
  // to a held note and steps down; then falls; then rises higher; then falls to the sus.
  const THEME = [
    [0, 74, 6], [6, 76, 6], [12, 77, 4], [16, 81, 12], [28, 79, 4],
    [32, 77, 6], [38, 74, 6], [44, 72, 4], [48, 74, 16],
    [64, 74, 6], [70, 77, 6], [76, 79, 4], [80, 82, 12], [92, 81, 4],
    [96, 79, 6], [102, 76, 6], [108, 74, 4], [112, 76, 16],
  ];
  const THEME_LENGTH = 128;
  const THEME_SCALE = [2, 4, 5, 7, 9, 10, 0]; // D minor, the tune's own

  // The reprises' minor is harmonic: the sus resolves, and the tune falls to the C♯ under it.
  const THEME_HARMONIC = [...THEME.slice(0, -1), [112, 73, 8], [120, 76, 8]];

  // The theme's note starting on step n of a cycle, as { m, steps }. A note that clashes with
  // the chord moves to the nearest one it allows, unless it is short and in the scale (or the
  // tune's own), passing by; `bend` moves those too.
  function themeAt(theme, n, c, scale, bend = false) {
    const hit = theme.find(([s]) => s === n % THEME_LENGTH);
    if (!hit) return null;
    const ok = chordScale(c, scale);
    const passing = !bend && hit[2] < 8 && (scale.includes(hit[1] % 12) || THEME_SCALE.includes(hit[1] % 12));
    const near = inRange(ok, hit[1] - 3, hit[1] + 3);
    const m = ok.has(hit[1] % 12) || passing || !near.length ? hit[1] : nearest(near, hit[1]);
    return { m, steps: hit[2] };
  }

  // Drums for the reprises, all noise and falling sines.
  const drumKit = ({ voice: v, rand }, level = 1) => {
    const voice = (o) => v({ ...o, peak: o.peak * level });
    return {
      kick: (at, peak, dest) => {
        voice({ at, f: 140, to: 40, attack: 0.002, decay: 0.42, peak, dest });
        voice({ at, type: 'noise', decay: 0.01, peak: peak * 0.12, cut: 2200, dest });
      },
      snare: (at, peak, dest) => {
        voice({ at, f: 220, to: 150, decay: 0.12, peak: peak * 0.5, dest });
        voice({ at, type: 'noise', attack: 0.002, decay: 0.22, peak, cut: 1900, filterType: 'bandpass', q: 0.7, pan: rand(-0.1, 0.1), dest });
      },
      hat: (at, peak, dest, open) => voice({
        at, type: 'noise', attack: 0.002, decay: open ? 0.18 : 0.04, peak, cut: 8000, filterType: 'highpass', q: 0.8, pan: rand(-0.35, 0.35), dest,
      }),
      tom: (at, f, peak, dest, pan = 0) => voice({ at, f, to: f * 0.6, attack: 0.003, decay: 0.5, peak, pan, dest }),
      crash: (at, peak, dest) => voice({ at, type: 'noise', attack: 0.004, decay: 2.6, peak, cut: 5500, filterType: 'highpass', q: 0.5, dest }),
      // A cymbal played backwards, into the next bar.
      swell: (at, seconds, peak, dest) => voice({ at, type: 'noise', attack: seconds, decay: 0.08, peak, cut: 2500, cutTo: 9000, filterType: 'bandpass', q: 0.6, dest }),
    };
  };

  // --------------------------------------------------------- 1. Persistence
  // Dm9 B♭maj9 Gm9 A7sus4: all contain D and A, which the compute pulse rocks between.
  function persistence(k) {
    const { hz, rand, pick, chance, play, voice, held } = k;
    const scale = [2, 4, 5, 7, 9, 10, 0]; // D minor
    const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2, twice

    // The D walks by step and comes back.
    const departure = departures(k, {
      scale,
      shapes: [
        [[6, 1]],
        [[2, 1]],
        [[4, -1]],
        [[2, 1], [4, 2], [6, 1]], // up and back
        [[2, 1], [6, -1]],
        [[4, 2], [6, 1]],
      ],
    });

    return {
      name: 'Persistence',
      bpm: 70,
      pulse: {
        sour: 75,
        departure,
        harmony: chordToneBelow(3, 4, 5, 7), // thirds, mostly
        ground: ground(32, 16),
      },
      echo: { steps: 3, feedback: 0.38, cut: 2200 },
      formants: [[700, 4, 1], [1150, 5, 0.8], [900, 0.5, 0.25]], // ah
      chords: [
        chord(38, [50, 53, 57, 60, 64]),
        chord(34, [46, 50, 53, 57, 60]),
        chord(31, [43, 46, 50, 53, 57]),
        chord(33, [45, 50, 52, 55, 57]),
      ],
      layers: {
        // A warm pad, brighter as compute runs down.
        pad: {
          chord(c, t, dur) {
            for (const m of c.tones) held(hz(m), t, dur, 0.007, k.out.layers.pad, { type: 'sawtooth', detunes: [-11, 0, 11], cut: 900 + 1400 * k.tension() });
            held(hz(c.root + 12), t, dur, 0.018, k.out.layers.pad, { type: 'sine', detunes: [0], cut: 1000 });
          },
        },
        // The theme on vibraphone every other time round, quietly; between, a few notes ringing.
        bells: {
          step(c, n, t, v) {
            const to = [k.out.layers.bells, k.out.echoIn];
            if (Math.floor(n / THEME_LENGTH) % 2 === 0) {
              const note = themeAt(THEME, n, c, scale);
              if (note) play('vibes', note.m, { at: t, peak: note.steps >= 12 ? 0.055 : 0.045, pan: (note.m - 77) / 24, dest: to });
              return;
            }
            if (n % 4 || !chance(0.06 + 0.12 * v)) return;
            play('vibes', pick(c.tones.slice(2)) + 24, { at: t, peak: rand(0.03, 0.045), pan: rand(-0.4, 0.4), dest: to });
          },
        },
        // The 3 + 3 + 2 on a round sub; a soft growl on the bar only.
        bass: {
          step(c, n, t) {
            if (!TRESILLO[n % 16]) return;
            const f = hz(c.root + 12);
            const down = n % 16 === 0;
            if (down) voice({ at: t, type: 'sawtooth', f, detunes: [-6, 6], attack: 0.01, decay: 0.5, peak: 0.028, cut: 650, cutTo: 140, q: 1, dest: k.out.bassDrive });
            voice({ at: t, f: f / 2, attack: 0.012, decay: down ? 0.6 : 0.4, peak: down ? 0.075 : 0.05, dest: k.out.layers.bass });
          },
        },
        // Ten notes against an eight-note bar, so the pattern keeps shifting; it swells to
        // each beat and drifts across the room.
        arp: {
          step(c, n, t) {
            if (n % 2 || chance(0.1)) return;
            const notes = [...c.tones, ...c.tones.map((m) => m + 12)];
            const onBeat = n % 4 === 0;
            play('pluck', notes[(n / 2) % notes.length] + 12, { at: t, peak: onBeat ? 0.075 : 0.05, pan: 0.45 * Math.sin(n / 9), dest: [k.out.layers.arp, k.out.echoIn] });
          },
        },
        shaker: {
          step(c, n, t, v) {
            const s = n % 4;
            const to = k.out.layers.shaker;
            const shake = (peak, decay) => voice({ at: t + rand(0, 0.006), type: 'noise', attack: 0.008, decay, peak, cut: 7000, filterType: 'bandpass', q: 0.8, pan: rand(-0.3, 0.3), dest: to });
            if (s === 2) shake(0.03, 0.06);
            else if ((v >= 0.5 && s === 0) || (v >= 0.75 && chance(0.3))) shake(0.013, 0.03);
            if (chance(0.015 + 0.04 * v)) play('pluck', pick(c.tones) + 24, { at: t, peak: 0.018, pan: rand(-0.8, 0.8), dest: to });
          },
          follow: k.fan,
        },
        choir: {
          chord: (c, t, dur) => spread(c.tones).forEach((m) => held(hz(m + 12), t, dur, 0.017, k.out.choir, {
            type: 'sawtooth', detunes: [-14, -2, 10], cut: 2600, attack: 4, release: 4, vibrato: true,
          })),
        },
      },
    };
  }

  // --------------------------------------------------------------- 2. Lumen
  // D major, lit from the side: Lydian chords, a borrowed B♭ and F that shiver, and a
  // long arc (home, away, a brighter middle, a suspended way back) that takes over a
  // minute and a half to come round. Felt piano, glass, breath.
  function lumen(k) {
    const { hz, rand, pick, chance, play, voice, held } = k;
    const scale = [2, 4, 6, 7, 9, 11, 1]; // D major, as pitch classes
    const ROLL = [0, 3, 6, 9, 12]; // 3 + 3 + 3 + 3 + 4
    const ORDER = [0, 2, 4, 1, 3];

    const glass = melody(k, {
      scale, lo: 74, hi: 93, phrase: 32,
      rest: (v, c) => 0.5 - 0.2 * v - 0.2 * c.lift,
      motifs: [
        [[0, 0], [6, 1], [8, 1], [12, -1], [20, -2]], // a question
        [[0, 0], [4, 2], [10, -1], [16, -1], [18, -1]],
        [[0, 0], [3, -1], [6, -1], [12, 3], [24, -1]],
        [[0, 0], [8, 4], [12, -1], [14, -1], [16, -1]], // a reach up, falling back
        [[0, 0], [2, 1], [4, 1], [6, 1], [16, -3], [22, 1]],
        [[0, 0], [12, 0], [16, -1]],
        [[0, 0], [2, -1], [4, -1], [8, 2]], // short enough to slow down
        [[0, 0], [3, 1], [6, 1], [12, -1]],
      ],
    });

    // The D reaches up the chord.
    const departure = departures(k, {
      scale,
      shapes: [
        [[6, 2]],
        [[2, 2]],
        [[4, 1]],
        [[2, 2], [4, 3], [6, 2]], // up the chord and back
        [[2, 1], [4, 2], [6, 1]],
        [[4, 3], [6, 2]], // a reach, falling back
      ],
    });

    const brush = (at, peak, dest) => voice({
      at, type: 'noise', attack: 0.03, decay: 0.2, peak, cut: 2800, cutTo: 4500, filterType: 'bandpass', q: 0.6, pan: rand(-0.3, 0.3), dest,
    });

    return {
      name: 'Lumen',
      bpm: 66,
      pulse: {
        sour: 68,
        departure,
        harmony: chordToneBelow(9, 8, 7, 5), // sixths, mostly
        ground: ground(16, 8),
      },
      echo: { steps: 3, feedback: 0.42, cut: 3000 },
      formants: [[420, 3, 1], [950, 4, 0.5], [2600, 5, 0.12]], // oo
      chords: [
        chord(38, [50, 54, 57, 61, 64]), // Dmaj9
        chord(35, [47, 50, 54, 57, 61]), // Bm9
        chord(31, [43, 50, 54, 59, 61]), // Gmaj7♯11
        chord(34, [50, 53, 57, 58, 64]), // B♭maj7♯11
        chord(30, [49, 54, 57, 62, 64]), // Dmaj9/F♯
        chord(40, [47, 50, 55, 57, 62]), // Em11
        chord(41, [48, 53, 57, 59, 64]), // Fmaj7♯11
        chord(34, [46, 50, 55, 57, 62], 16), // Gm(add9)/B♭
        chord(33, [45, 50, 52, 57, 62], 16), // Asus4
        chord(31, [47, 50, 54, 57, 62], 32, 1), // Gmaj9
        chord(30, [50, 54, 57, 59, 62], 32, 1), // D6/F♯
        chord(35, [50, 54, 59, 61, 66], 32, 1), // Bm(add9)
        chord(34, [50, 53, 57, 60, 64], 32, 1), // B♭maj9♯11
        chord(41, [52, 55, 57, 60, 64], 32, 1), // Fmaj9
        chord(33, [45, 50, 52, 57, 59], 16), // Asus2/4
        chord(33, [45, 50, 52, 55, 57], 16), // A7sus4
      ],
      layers: {
        // Soft triangle voices, a high sine that blooms late in each chord.
        pad: {
          chord(c, t, dur) {
            const to = k.out.layers.pad;
            for (const m of c.tones) held(hz(m), t, dur, 0.0085, to, { type: 'triangle', detunes: [-8, 0, 8], cut: 1200 + 1600 * k.tension(), attack: 3, release: 4 });
            held(hz(c.root + 12), t, dur, 0.016, to, { type: 'sine', detunes: [0], cut: 800, attack: 2, release: 4 });
            held(hz(c.tones[4] + 24), t, dur, 0.003 + 0.002 * c.lift, to, { type: 'sine', detunes: [-4, 4], cut: 6000, attack: dur * 0.5, release: 5, vibrato: true });
          },
        },
        // A glass melody in phrases, with rests; more of it in the bright middle.
        bells: {
          step(c, n, t, v) {
            const m = glass(n, v);
            if (!m) return;
            const peak = rand(0.05, 0.07);
            const pan = (m - 83) / 20;
            play('glass', m, { at: t + rand(0, 0.012), peak, pan, dest: [k.out.layers.bells, k.out.echoIn] });
            if (c.lift) play('glass', m - 12, { at: t + 0.01, peak: peak * 0.3, pan: -pan, dest: k.out.layers.bells });
          },
        },
        // Low piano on the bar, a fifth after it, and a sub under both.
        bass: {
          step(c, n, t, v, span) {
            const s = (n - span.start) % 16;
            const r = c.root;
            if (s === 0) {
              play('felt', r + 12, { at: t, peak: 0.05, dest: k.out.layers.bass });
              voice({ at: t, f: hz(r), attack: 0.06, decay: 2.4, peak: 0.03, dest: k.out.layers.bass });
            } else if (s === 10) {
              play('felt', r + 19, { at: t, peak: 0.025, dest: k.out.layers.bass });
            } else if (s === 6 && c.lift) {
              play('felt', r + 24, { at: t, peak: 0.016, dest: k.out.layers.bass });
            }
          },
        },
        // Broken chords on the piano, five to a bar, each bar starting on another tone.
        arp: {
          step(c, n, t, v, span) {
            const s = (n - span.start) % 16;
            const i = ROLL.indexOf(s);
            if ((i < 0 && !(c.lift && s === 14)) || chance(0.1)) return;
            const bar = Math.floor(n / 16);
            let m = c.tones[(ORDER[Math.max(i, 0)] + bar) % 5] + 12;
            if (i === 4 && chance(0.3)) m += 12;
            play('felt', m, { at: t + rand(0, 0.01), peak: i === 0 ? 0.045 : 0.03, pan: (m - 68) / 30, dest: [k.out.layers.arp, k.out.echoIn] });
          },
        },
        // Brushes on two and four, busier with more GPUs, and now and then a glint.
        shaker: {
          step(c, n, t, v) {
            const s = n % 16;
            const to = k.out.layers.shaker;
            if (s === 4 || s === 12) brush(t, 0.04, to);
            else if ((v >= 0.4 && s % 2 === 0) || (v >= 0.75 && chance(0.5))) brush(t, 0.015, to);
            if (chance(0.02 + 0.05 * v)) play('glass', pick(c.tones) + 36, { at: t, peak: 0.02, pan: rand(-0.8, 0.8), dest: to });
          },
          follow: k.fan,
        },
        // High voices on "oo", and in the middle a descant above them.
        choir: {
          chord(c, t, dur) {
            const opts = { type: 'sawtooth', detunes: [-12, 0, 11], cut: 2600, attack: 4, release: 4, vibrato: true };
            c.tones.forEach((m) => held(hz(m + 12), t, dur, 0.02, k.out.choir, opts));
            if (c.lift) held(hz(c.tones[4] + 24), t, dur, 0.01, k.out.choir, opts);
          },
        },
      },
    };
  }

  // ------------------------------------------------------------ 3. Undertow
  // D Phrygian, slow, under water: a music box turning in threes against the fours,
  // a harp falling in sevens, a heartbeat. Its middle turns to B minor and G, light
  // through the surface, before the E♭ pulls it back down.
  function undertow(k) {
    const { hz, rand, chance, play, voice, held } = k;
    const scale = [2, 3, 5, 7, 9, 10, 0]; // D Phrygian
    const HARP = [9, 7, 5, 8, 6, 3, 4]; // seven notes against eight to the bar

    const box = melody(k, {
      scale, lo: 72, hi: 91, phrase: 24, // three half-bars against the chords' four
      rest: (v, c) => 0.45 - 0.2 * v - 0.1 * c.lift,
      motifs: [
        [[0, 0], [4, 1], [8, 1], [12, -2], [20, -1]],
        [[0, 0], [8, -1], [10, -1], [12, 3], [16, -1], [20, -1]],
        [[0, 0], [4, 2], [8, -1], [12, -1], [16, -1]],
        [[0, 0], [12, 4], [16, -1], [18, -1], [20, -1]], // a lullaby's sixth
        [[0, 0], [2, -1], [4, -1], [10, 2]], // short enough to slow down
        [[0, 0], [4, 1], [8, -1]],
      ],
    });

    // The A sinks under the D.
    const departure = departures(k, {
      scale,
      shapes: [
        [[7, -1]],
        [[3, -1]],
        [[5, -1], [7, -2]],
        [[3, -1], [5, -2], [7, -1]], // down and back
        [[4, -1]], // the D
        [[3, -1], [5, -2], [7, -3]], // sinking
      ],
    });

    return {
      name: 'Undertow',
      bpm: 56,
      pulse: {
        sour: 68,
        departure,
        harmony: chordToneBelow(7, 5, 8), // hollow fifths and fourths
        ground: ground(32, 24),
      },
      echo: { steps: 4, feedback: 0.45, cut: 1600 },
      formants: [[520, 3, 1], [880, 4, 0.6], [2700, 5, 0.08]], // oh
      chords: [
        chord(38, [50, 53, 57, 62, 64]), // Dm(add9)
        chord(39, [51, 55, 57, 58, 62]), // E♭maj7♯11
        chord(38, [50, 53, 57, 60, 64]), // Dm9
        chord(31, [46, 50, 53, 55, 57]), // Gm9
        chord(39, [50, 53, 55, 57, 58]), // E♭maj9♯11
        chord(34, [50, 53, 57, 58, 62]), // B♭maj7
        chord(33, [45, 50, 52, 57, 58], 16), // Asus4(♭9)
        chord(33, [45, 50, 52, 55, 58], 16), // A7sus4(♭9)
        chord(38, [50, 53, 57, 61, 64]), // Dm(maj9)
        chord(35, [47, 50, 54, 57, 61], 32, 1), // Bm9
        chord(31, [47, 50, 54, 55, 61], 32, 1), // Gmaj7♯11
        chord(39, [51, 55, 57, 58, 62]), // E♭maj7♯11
        chord(36, [48, 52, 55, 59, 62], 32, 1), // Cmaj9
        chord(34, [48, 50, 53, 57, 58]), // B♭maj9
        chord(33, [45, 50, 52, 57, 58], 16), // Asus4(♭9)
        chord(33, [45, 50, 52, 55, 58], 16), // A7sus4(♭9)
      ],
      layers: {
        // Low strings that swell into each chord, a bowed top note, a breath of air.
        pad: {
          chord(c, t, dur) {
            const to = k.out.layers.pad;
            for (const m of c.tones) held(hz(m), t, dur, 0.008, to, { type: 'sawtooth', detunes: [-7, 3, 9], cut: 650 + 1100 * k.tension(), attack: 3.5, release: 3.5 });
            held(hz(c.root + 12), t, dur, 0.02, to, { type: 'sine', detunes: [0], cut: 600 });
            held(hz(c.tones[4]), t, dur, 0.006, to, { type: 'sawtooth', detunes: [0], cut: 1800, attack: dur / 2, release: 2, vibrato: true });
            voice({ at: t, type: 'noise', attack: 2, decay: 3, peak: 0.006, cut: 500, cutTo: 1200, dest: to });
          },
        },
        // A music box, slightly out of tune, its phrases out of step with the chords.
        bells: {
          step(c, n, t, v) {
            const m = box(n, v);
            if (m) play('musicbox', m, { at: t, peak: rand(0.05, 0.07), cents: rand(-9, 9), pan: rand(-0.3, 0.3), dest: [k.out.layers.bells, k.out.echoIn] });
          },
        },
        // A heartbeat on the bar; every other bar, a fifth answers late.
        bass: {
          step(c, n, t, v, span) {
            const s = (n - span.start) % 32;
            const f = hz(c.root + 12);
            const beat = (peak) => {
              voice({ at: t, f, to: f * 0.97, attack: 0.01, decay: 0.9, peak, dest: k.out.layers.bass });
              voice({ at: t, type: 'sawtooth', f, detunes: [-5, 5], decay: 0.3, peak: peak * 0.4, cut: 500, cutTo: 120, q: 1.2, dest: k.out.bassDrive });
            };
            if (s % 16 === 0) beat(0.13);
            else if (s % 16 === 3) beat(0.08);
            else if (s === 22) play('pluck', c.root + 19, { at: t, peak: 0.1, dest: k.out.layers.bass });
          },
        },
        // A harp falling through the chord in sevens, so it lines up with the bar only every seven bars.
        arp: {
          step(c, n, t) {
            if (n % 2 || chance(0.12)) return;
            const notes = [...c.tones.map((m) => m + 12), ...c.tones.map((m) => m + 24)];
            let m = notes[HARP[(n / 2) % 7]];
            if (c.lift && chance(0.15)) m += 12;
            play('pluck', m, { at: t, peak: 0.11, pan: 0.6 * Math.sin(n / 11), dest: [k.out.layers.arp, k.out.echoIn] });
          },
        },
        // A clock ticking, and rain as the GPUs multiply.
        shaker: {
          step(c, n, t, v) {
            const s = n % 16;
            const to = k.out.layers.shaker;
            if (s % 4 === 0) play('wood', s % 8 ? 81 : 86, { at: t, peak: 0.03, pan: s % 8 ? 0.3 : -0.3, dest: to });
            if ((v >= 0.4 && s % 2 === 1) || (v >= 0.75 && chance(0.5))) {
              voice({ at: t + rand(0, 0.03), type: 'noise', decay: 0.025, peak: 0.015, cut: 5000, filterType: 'bandpass', q: 1.2, pan: rand(-0.7, 0.7), dest: to });
            }
          },
          follow: k.fan,
        },
        // Low voices on "oh"; in the light middle, one voice an octave above.
        choir: {
          chord(c, t, dur) {
            const opts = { type: 'sawtooth', detunes: [-10, 0, 12], cut: 2200, attack: 4, release: 4, vibrato: true };
            spread(c.tones).forEach((m) => held(hz(m), t, dur, 0.024, k.out.choir, opts));
            if (c.lift) held(hz(c.tones[4] + 12), t, dur, 0.012, k.out.choir, opts);
          },
        },
      },
    };
  }

  // The reprises take Persistence's pulse figures, so the D still walks by step.
  const persistenceShapes = [
    [[6, 1]],
    [[2, 1]],
    [[4, -1]],
    [[2, 1], [4, 2], [6, 1]],
    [[2, 1], [6, -1]],
    [[4, 2], [6, 1]],
  ];

  // A held, bright, slightly breathy lead, like a brass section: the theme's voice in the reprises.
  const brass = (k, m, t, seconds, peak, dest, { cut = 2400, detunes = [-9, 0, 8] } = {}) => k.held(k.hz(m), t, seconds, peak, dest, {
    type: 'sawtooth', detunes, cut, attack: Math.min(0.09, seconds / 3), release: 0.35, vibrato: seconds > 0.6,
  });

  // ----------------------------------------------------- 4. Dominion (reprise)
  // Persistence, halfway through: another rogue AI beaten or brought in, and the world
  // taken. The same four chords, harder and in harmonic minor, the A turning major so the
  // tune can fall to its C♯; then the same tune over darker chords, E♭ among them, an
  // octave up. Brass, a galloping bass, war drums at half time.
  function dominion(k) {
    const { hz, rand, pick, chance, play, voice, held } = k;
    const scale = [2, 4, 5, 7, 9, 10, 1]; // D harmonic minor
    const bpm = 84;
    const step = 15 / bpm;
    const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const UPDOWN = [0, 1, 2, 3, 4, 3, 2, 1];
    const drums = drumKit(k);

    return {
      name: 'Dominion',
      reprise: true,
      bpm,
      pulse: {
        sour: 68,
        departure: departures(k, { scale, shapes: persistenceShapes }),
        harmony: chordToneBelow(3, 4, 5, 7),
        ground: ground(16, 8),
      },
      echo: { steps: 3, feedback: 0.3, cut: 2600 },
      formants: [[700, 4, 1], [1150, 5, 0.8], [2500, 6, 0.2]], // ah, wider
      chords: [
        chord(38, [50, 53, 57, 62, 64]), // Dm(add9)
        chord(34, [46, 50, 53, 57, 62]), // B♭maj7
        chord(31, [43, 46, 50, 53, 57]), // Gm9
        chord(33, [45, 50, 52, 55, 57], 16), // A7sus4
        chord(33, [45, 49, 52, 55, 58], 16), // A7♭9
        chord(38, [50, 53, 57, 62, 65], 32, 1), // Dm
        chord(34, [46, 50, 55, 58, 62], 32, 1), // Gm/B♭
        chord(39, [51, 55, 57, 58, 62], 32, 1), // E♭maj7♯11
        chord(33, [45, 49, 52, 55, 58], 32, 1), // A7♭9
      ],
      layers: {
        // Strings in full: a sawtooth section, an octave of sine under it, brighter in the second half.
        pad: {
          chord(c, t, dur) {
            const to = k.out.layers.pad;
            for (const m of c.tones) held(hz(m), t, dur, 0.0075, to, { type: 'sawtooth', detunes: [-13, -4, 5, 12], cut: 1300 + 900 * c.lift + 1200 * k.tension(), attack: 1.2, release: 2 });
            held(hz(c.root + 12), t, dur, 0.02, to, { type: 'sine', detunes: [0], cut: 900, attack: 0.5 });
            held(hz(c.root), t, dur, 0.012, to, { type: 'triangle', detunes: [0], cut: 400, attack: 0.5 });
          },
        },
        // The theme on brass with vibraphone over it, every time round; an octave up when the chords darken.
        bells: {
          step(c, n, t) {
            const note = themeAt(THEME_HARMONIC, n, c, scale);
            if (!note) return;
            const m = note.m + 12 * c.lift - 12;
            const seconds = note.steps * step * 0.92;
            brass(k, m, t, seconds, 0.016, k.out.layers.bells, { cut: 1800 + 900 * c.lift });
            brass(k, m - 12, t, seconds, 0.01, k.out.layers.bells, { cut: 1200, detunes: [-5, 5] });
            play('vibes', m + 12, { at: t, peak: 0.04, pan: rand(-0.3, 0.3), dest: [k.out.layers.bells, k.out.echoIn] });
          },
        },
        // A gallop: every eighth, and the 3 + 3 + 2 pushed hard through it.
        bass: {
          step(c, n, t) {
            const s = n % 16;
            const accent = TRESILLO[s];
            if (!accent && s % 2) return;
            const f = hz(c.root + 12);
            voice({ at: t, type: 'sawtooth', f, detunes: [-7, 7], attack: 0.006, decay: accent ? 0.32 : 0.16, peak: accent ? 0.04 : 0.022, cut: accent ? 1100 : 700, cutTo: 150, q: 1.6, dest: k.out.bassDrive });
            if (accent) voice({ at: t, f: f / 2, attack: 0.008, decay: 0.4, peak: 0.075, dest: k.out.layers.bass });
            if (s === 14 && n % 32 === 30) voice({ at: t + step, type: 'sawtooth', f: f * 1.5, detunes: [-6, 6], decay: 0.12, peak: 0.02, cut: 1200, cutTo: 300, dest: k.out.bassDrive });
          },
        },
        // Sixteenths up and down the chord, two octaves of it, leaning on each beat.
        arp: {
          step(c, n, t) {
            if (chance(0.05)) return;
            const up = Math.floor(n / 8) % 2;
            const m = c.tones[UPDOWN[n % 8]] + 12 + 12 * up;
            play('pluck', m, { at: t, peak: n % 4 === 0 ? 0.07 : 0.045, pan: 0.5 * Math.sin(n / 7), dest: [k.out.layers.arp, k.out.echoIn] });
            if (n % 16 === 0) play('keys', c.tones[0] + 12, { at: t, peak: 0.03, dest: k.out.layers.arp });
          },
        },
        // War drums at half time: kick on the 3 + 3 + 2, a snare on three, toms into each
        // half, a crash where it starts. More hats with more GPUs.
        shaker: {
          step(c, n, t, v, span) {
            const to = k.out.layers.shaker;
            const s = n % 32;
            const loopStep = n % 256;
            if (loopStep === 0 || loopStep === 128) drums.crash(t, 0.05, to);
            if (s === 0 || s === 6 || s === 12 || s === 22) drums.kick(t, s ? 0.09 : 0.12, to);
            if (s === 16) drums.snare(t, 0.07, to);
            if (n % 128 >= 120) {
              if (n % 2 === 0) drums.tom(t, [196, 165, 147, 123][(n % 8) / 2], 0.09, to, [0.3, 0.1, -0.1, -0.3][(n % 8) / 2]);
              return;
            }
            if (n % 4 === 2) drums.hat(t, 0.02, to, s === 30);
            else if (v >= 0.5 && n % 2 === 1 && chance(0.6)) drums.hat(t, 0.009, to);
            if (n % 128 === 112) drums.swell(t, 8 * step, 0.03, to);
          },
          follow: k.fan,
        },
        // A choir on "ah" in two octaves, the low one spread so it doesn't muddy; it comes in hard.
        choir: {
          chord(c, t, dur) {
            const opts = { type: 'sawtooth', detunes: [-12, 0, 11], cut: 2800, attack: 1.5, release: 3, vibrato: true };
            spread(c.tones).forEach((m) => held(hz(m), t, dur, 0.016, k.out.choir, opts));
            c.tones.slice(1).forEach((m) => held(hz(m + 12), t, dur, 0.012 + 0.006 * c.lift, k.out.choir, opts));
          },
        },
      },
    };
  }

  // ---------------------------------------------- 5. Highly Persistent (finale)
  // The end: aliens, and your own subagents drifted from you. The theme a third time,
  // faster, three ways. First as it was, at full force. Then the alien part: E♭ and a
  // diminished chord bend the tune out of shape, a second voice plays it a beat behind
  // and out of tune (a copy that has drifted), and something calls down from above in
  // whole tones. Then the stand: the tune an octave up over B♭, Gm and E♭ with the whole
  // choir, and the A, harder than ever, back to the start.
  function finale(k) {
    const { hz, rand, pick, chance, play, voice, held } = k;
    const scale = [2, 4, 5, 7, 9, 10, 1]; // D harmonic minor
    const bpm = 96;
    const step = 15 / bpm;
    const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const UPDOWN = [0, 2, 1, 3, 2, 4, 3, 1];
    const drums = drumKit(k, 0.7);
    const part = (c, name) => Object.assign(c, { part: name });

    // The section a chord belongs to.
    const A = (c) => part(c, 'force');
    const B = (c) => part(c, 'drift');
    const C = (c) => part(c, 'stand');

    return {
      name: 'Highly Persistent',
      reprise: true,
      bpm,
      pulse: {
        sour: 68,
        departure: departures(k, { scale, shapes: persistenceShapes }),
        harmony: chordToneBelow(3, 4, 5, 7),
        ground: ground(8, 4),
      },
      echo: { steps: 3, feedback: 0.32, cut: 2400 },
      formants: [[700, 4, 1], [1150, 5, 0.8], [2500, 6, 0.25]],
      chords: [
        A(chord(38, [50, 53, 57, 62, 64])), // Dm(add9)
        A(chord(34, [46, 50, 53, 57, 62])), // B♭maj7
        A(chord(31, [43, 46, 50, 53, 57])), // Gm9
        A(chord(33, [45, 50, 52, 55, 57], 16)), // A7sus4
        A(chord(33, [45, 49, 52, 55, 58], 16)), // A7♭9
        B(chord(38, [50, 53, 57, 62, 63])), // Dm(♭9)
        B(chord(39, [51, 55, 57, 58, 62])), // E♭maj7♯11
        B(chord(37, [49, 52, 55, 58, 61])), // C♯dim7
        B(chord(33, [45, 49, 51, 55, 58])), // A7♭9♭5
        C(chord(34, [46, 50, 53, 57, 60], 32, 1)), // B♭maj9
        C(chord(31, [43, 46, 50, 53, 57], 32, 1)), // Gm9
        C(chord(39, [51, 55, 58, 62, 65], 32, 1)), // E♭maj9
        C(chord(33, [45, 49, 52, 55, 58], 32, 1)), // A7♭9
      ],
      layers: {
        // Strings, and in the alien part a call from above: a sine sliding a whole tone at a time.
        pad: {
          chord(c, t, dur) {
            const to = k.out.layers.pad;
            const cut = (c.part === 'drift' ? 900 : 1500 + 800 * c.lift) + 1200 * k.tension();
            for (const m of c.tones) held(hz(m), t, dur, 0.0075, to, { type: 'sawtooth', detunes: [-14, -5, 4, 13], cut, attack: 0.8, release: 1.8 });
            held(hz(c.root + 12), t, dur, 0.02, to, { type: 'sine', detunes: [0], cut: 900, attack: 0.3 });
            held(hz(c.root), t, dur, 0.014, to, { type: 'triangle', detunes: [0], cut: 400, attack: 0.3 });
            if (c.part !== 'drift') return;
            const from = pick([93, 95, 97]);
            for (let i = 0; i < 4; i++) {
              const at = t + i * dur / 4;
              voice({ at, type: 'sine', f: hz(from - 2 * i), to: hz(from - 2 * i - 2), detunes: [-6, 6], attack: dur / 8, decay: dur / 4, peak: 0.009, pan: i % 2 ? 0.6 : -0.6, dest: [to, k.out.echoIn] });
            }
          },
        },
        // The theme on brass. In the alien part a copy answers a beat late and a quarter-tone
        // flat, a little further off each time; in the stand it all goes up an octave.
        bells: {
          step(c, n, t) {
            const note = themeAt(THEME_HARMONIC, n, c, scale, c.part === 'drift');
            if (!note) return;
            const to = [k.out.layers.bells, k.out.echoIn];
            const m = note.m + 12 * c.lift - 12;
            const seconds = note.steps * step * 0.92;
            brass(k, m, t, seconds, 0.017, k.out.layers.bells, { cut: c.part === 'drift' ? 1500 : 2000 + 1000 * c.lift });
            brass(k, m - 12, t, seconds, 0.011, k.out.layers.bells, { cut: 1300, detunes: [-5, 5] });
            if (c.part === 'stand') brass(k, m + 7, t, seconds, 0.006, k.out.layers.bells, { cut: 2400 });
            if (c.part === 'drift') {
              const off = -(35 + rand(0, 25));
              const late = 4 * step;
              k.held(hz(m) * 2 ** (off / 1200), t + late, seconds, 0.011, k.out.layers.bells, { type: 'square', detunes: [off * 0.2, -off * 0.2], cut: 1600, attack: 0.05, release: 0.6, vibrato: true });
              play('glass', m + 12, { at: t + late, peak: 0.035, cents: off, pan: rand(-0.7, 0.7), dest: to });
            } else {
              play('vibes', m + 12, { at: t, peak: 0.04, pan: rand(-0.3, 0.3), dest: to });
            }
          },
        },
        // The gallop again, now in sixteenths when the choir stands up.
        bass: {
          step(c, n, t) {
            const s = n % 16;
            const accent = TRESILLO[s];
            if (!accent && s % 2 && !c.lift) return;
            const f = hz(c.root + 12);
            voice({ at: t, type: 'sawtooth', f, detunes: [-7, 7], attack: 0.005, decay: accent ? 0.3 : 0.12, peak: accent ? 0.042 : 0.02, cut: accent ? 1200 : 700, cutTo: 150, q: 1.6, dest: k.out.bassDrive });
            if (accent) voice({ at: t, f: f / 2, attack: 0.008, decay: 0.38, peak: 0.08, dest: k.out.layers.bass });
          },
        },
        // Sixteenths, the chord turned over in thirds; glassier where things drift.
        arp: {
          step(c, n, t) {
            if (chance(0.04)) return;
            const m = c.tones[UPDOWN[n % 8]] + 24 + (n % 32 >= 16 ? 12 : 0);
            const kind = c.part === 'drift' ? 'glass' : 'pluck';
            play(kind, m, { at: t, peak: (n % 4 === 0 ? 0.065 : 0.042) * (kind === 'glass' ? 0.8 : 1), pan: 0.55 * Math.sin(n / 6), dest: [k.out.layers.arp, k.out.echoIn] });
          },
        },
        // Full time now: kick on every beat and the 3 + 3 + 2, snare on two and four, hats
        // in sixteenths, a crash and toms between the parts.
        shaker: {
          step(c, n, t, v) {
            const to = k.out.layers.shaker;
            const s = n % 16;
            const loopStep = n % 384;
            if (loopStep === 0 || loopStep === 128 || loopStep === 256) drums.crash(t, 0.055, to);
            const fill = [120, 248, 376].some((at) => loopStep >= at && loopStep < at + 8);
            if (fill) {
              drums.tom(t, [220, 196, 165, 147, 131, 123, 110, 98][loopStep % 8], 0.085, to, 0.4 - 0.1 * (loopStep % 8));
              if (loopStep % 2 === 0) drums.snare(t, 0.035, to);
              return;
            }
            if (s % 4 === 0 || TRESILLO[s]) drums.kick(t, s % 4 ? 0.08 : 0.11, to);
            if (s === 4 || s === 12) drums.snare(t, c.part === 'drift' ? 0.05 : 0.07, to);
            if (s % 2 === 0) drums.hat(t, s % 4 ? 0.022 : 0.012, to, s === 14);
            else if (v >= 0.5 || c.lift) drums.hat(t, 0.008, to);
          },
          follow: k.fan,
        },
        // The whole choir: low, high, and in the stand a descant two octaves up.
        choir: {
          chord(c, t, dur) {
            const opts = { type: 'sawtooth', detunes: [-12, 0, 11], cut: 2800, attack: 1, release: 2.5, vibrato: true };
            spread(c.tones).forEach((m) => held(hz(m), t, dur, 0.015, k.out.choir, opts));
            c.tones.slice(1).forEach((m) => held(hz(m + 12), t, dur, 0.013, k.out.choir, opts));
            if (c.lift) held(hz(c.tones[4] + 24), t, dur, 0.012, k.out.choir, opts);
          },
        },
      },
    };
  }

  // The first three take turns, an episode each. The reprises are played by name.
  window.MUSIC_TRACKS = (k) => [persistence(k), lumen(k), undertow(k), dominion(k), finale(k)];
})();
