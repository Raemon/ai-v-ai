// The soundtrack: three tracks, all in D over the hum's low D, which take turns one
// episode each. audio.js plays them. Each has the same six layers (LEVEL.music
// picks which are playing), its own chords, tempo and instruments, and a compute
// pulse.
//
// A layer can play at chord changes, `chord(chord, t, dur)`; on every sixteenth,
// `step(chord, n, t, v, span)`, where `span` is the chord's { start, end } in steps;
// and follow its own level, `follow(v, t, fade)`.
//
// The pulse's voices: `tune(n)`, a melody; `harmony(chord, m)`, the note under the
// tune's `m`; `ground(chord, s)`, a low note `s` steps into a chord; and `sour`, a note
// in none of the track's chords, for the countdown.
(() => {
  'use strict';

  // Every chord has five tones: sounds (hover, think, collapse) pick among them.
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

  // A melody that thinks in phrases of `phrase` steps. Each phrase is a motif, a list
  // of [step, move] with moves counted along the scale, started from a chord tone near
  // where the last phrase ended. Some phrases are turned upside down, short ones are
  // sometimes played at half speed, and some are left silent, so the line never quite
  // repeats. Notes on the half-bar and each phrase's last note land on chord tones.
  // A line that was silent (its layer off) waits for the next phrase to come back in.
  // A `steady` line is never silent two phrases running.
  function melody(k, { scale, lo, hi, phrase, motifs, rest, steady }) {
    let last = Math.round((lo + hi) / 2);
    let plan = new Map();
    let prev = -1;
    let rested = false;

    function compose(n, v) {
      plan = new Map();
      const start = k.chordAt(n);
      rested = !(steady && rested) && k.chance(rest(v, start.chord));
      if (rested) return;
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
    }

    return (n, v) => {
      if (n % phrase === 0) compose(n, v);
      else if (n !== prev + 1) plan = new Map();
      prev = n;
      return plan.get(n % phrase);
    };
  }

  // The chord tone below `m` by the first of these intervals (in semitones) that reaches one.
  const chordToneBelow = (...intervals) => (c, m) => {
    const tones = pitchClasses(c.tones);
    const gap = intervals.find((i) => tones.has((m - i) % 12));
    return gap && m - gap;
  };

  // The chord's root every `every` steps and, `answer` steps later, a tone from its middle.
  const ground = (every, answer) => (c, s) => (s % every === 0 ? c.root + 12 : s % every === answer && c.tones[2]);

  // --------------------------------------------------------- 1. Persistence
  // Dm9 B♭maj9 Gm9 A7sus4: all contain D and A, which fill in the pulse's countdown.
  function persistence(k) {
    const { hz, rand, pick, chance, play, voice, held, shake } = k;
    const scale = [2, 4, 5, 7, 9, 10, 0]; // D minor
    const TRESILLO = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2, twice

    // The pulse's tune: a phrase to a chord, walking by step.
    const tune = melody(k, {
      scale, lo: 62, hi: 79, phrase: 32, steady: true,
      rest: () => 0.12,
      motifs: [
        [[0, 0], [4, 1], [8, 1], [12, -1], [16, -1], [24, -1]], // up and back
        [[0, 0], [4, 0], [8, 1], [12, -1], [20, -1]],
        [[0, 0], [4, 1], [8, 1], [12, 1], [16, -2], [24, 1]],
        [[0, 0], [4, -1], [8, -1], [12, 1], [16, -2]],
        [[0, 0], [4, 2], [8, -1], [12, 2], [16, -1], [20, -2]], // thirds, climbing
        [[0, 0], [8, 3], [12, -1], [16, -1], [24, -1]], // a leap, walked back down
        [[0, 0], [4, 1], [8, -2], [12, 1]], // short enough to slow down
        [[8, 0], [12, 1], [16, 1], [20, -1], [24, -2]], // coming in late
        [[0, 0], [12, -1], [16, 1], [28, 1]],
      ],
    });

    return {
      name: 'Persistence',
      bpm: 70,
      pulse: {
        sour: 75,
        tune,
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
        bells: {
          step(c, n, t, v) {
            if (n % 2 || !chance(0.08 + 0.2 * v)) return;
            play('vibes', pick(c.tones) + pick([12, 24]), { at: t, peak: rand(0.05, 0.08), pan: rand(-0.5, 0.5), dest: [k.out.layers.bells, k.out.echoIn] });
          },
        },
        bass: {
          step(c, n, t) {
            if (!TRESILLO[n % 16]) return;
            const f = hz(c.root + 12);
            voice({ at: t, type: 'sawtooth', f, detunes: [-6, 6], decay: 0.4, peak: n % 8 ? 0.035 : 0.05, cut: 900, cutTo: 160, q: 1.5, dest: k.out.bassDrive });
            voice({ at: t, f: f / 2, decay: 0.45, peak: 0.07, dest: k.out.layers.bass });
          },
        },
        // Ten notes against a sixteen-step bar, so the pattern keeps shifting.
        arp: {
          step(c, n, t) {
            if (chance(0.15)) return;
            const notes = [...c.tones, ...c.tones.map((m) => m + 12)];
            play('pluck', notes[n % notes.length] + 12, { at: t, peak: 0.1, pan: n % 2 ? 0.55 : -0.55, dest: [k.out.layers.arp, k.out.echoIn] });
          },
        },
        shaker: {
          step(c, n, t, v) {
            const offbeat = n % 4 === 2;
            if (offbeat || (v >= 0.5 && n % 2 === 0) || (v >= 0.75 && chance(0.4))) shake(t, offbeat);
            if (chance(0.03 + 0.08 * v)) play('pluck', pick(c.tones) + 24, { at: t, peak: 0.025, pan: rand(-0.8, 0.8), dest: k.out.layers.shaker });
          },
          follow: k.fan,
        },
        choir: {
          chord: (c, t, dur) => c.tones.forEach((m) => held(hz(m + 12), t, dur, 0.02, k.out.choir, {
            type: 'sawtooth', detunes: [-14, -2, 10], cut: 3000, attack: 3, release: 3, vibrato: true,
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

    // The pulse's tune, under the glass: dotted, three-bar phrases against two-bar chords.
    const tune = melody(k, {
      scale, lo: 64, hi: 81, phrase: 48, steady: true,
      rest: () => 0.08,
      motifs: [
        [[0, 0], [6, 2], [12, -1], [16, 1], [24, -2], [32, -1]],
        [[0, 0], [8, 1], [14, 1], [16, 1], [24, -2]], // a reach
        [[0, 0], [6, -1], [12, -1], [16, 3], [28, -1], [32, -1]],
        [[0, 0], [4, 2], [8, 2], [16, -1], [22, -1], [24, -1], [32, 1]], // up the chord, drifting down
        [[0, 0], [12, 1], [16, 1], [28, -3]],
        [[0, 0], [6, 1], [12, 1], [18, 1], [24, -2], [36, -1]],
        [[0, 0], [6, 1], [12, -2], [16, 1]], // short enough to slow down
        [[8, 0], [12, 2], [16, -1], [24, 2], [30, -1], [32, -1]], // coming in late
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
        tune,
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

    // The pulse's tune, under the music box: slow, mostly sinking, in five half-bars.
    const tune = melody(k, {
      scale, lo: 60, hi: 77, phrase: 40, steady: true,
      rest: () => 0.08,
      motifs: [
        [[0, 0], [8, -1], [16, -1], [20, 1], [24, -2]],
        [[0, 0], [4, 1], [8, -1], [16, -1], [28, -1]],
        [[0, 0], [8, 2], [12, -1], [16, -1], [24, -1]], // a reach up, sinking back
        [[0, 0], [12, -1], [16, -1], [28, 1]],
        [[0, 0], [4, -1], [8, -1], [12, -1], [16, 2], [24, -1]],
        [[0, 0], [8, -2], [12, 1]], // short enough to slow down
        [[8, 0], [16, 1], [20, -1], [24, -1], [32, -1]], // coming in late
        [[0, 0], [4, 0], [8, -1], [16, 1], [20, -1], [24, -1]],
      ],
    });

    return {
      name: 'Undertow',
      bpm: 56,
      pulse: {
        sour: 68,
        tune,
        harmony: chordToneBelow(7, 5), // hollow fifths and fourths
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

  window.MUSIC_TRACKS = (k) => [persistence(k), lumen(k), undertow(k)];
})();
