// Recorded voices: the system prompt in one, the AI in another (tools/voice-record.js).
// A line is spoken only if it was recorded: voice/manifest.js lists them, by key (lineKey).
// Speech queues behind speech, and the player's next action cuts it: what's said is always
// about what just happened, and nothing talks over a click. Glances are quieter still: one
// waits for a steady hover and for silence, stops when the pointer moves on, and is said at
// most once an episode. They start off: V, or Vocals beside the speaker, turns them on; M silences them.
(() => {
  'use strict';

  const PREF_KEY = 'highly-persistent/voice';
  const RECORDED = new Set(window.VOICE_LINES || []);
  const GLANCE_DWELL_MS = 450;
  const HEARD_MS = 1500; // a glance cut before this is not yet said
  const VOLUME = 0.9;

  const params = new URLSearchParams(location.search);
  const harvesting = params.has('voiceharvest');
  const quiet = (params.has('at') || params.has('playtest')) && !params.has('voice');

  // The key of a line: who says it, and its words, with spacing not counting.
  const normalize = (text) => String(text).replace(/\s+/g, ' ').trim();
  function lineKey(who, text) {
    let h = 0x811c9dc5;
    const s = `${who}|${normalize(text)}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  let off = readOff();
  let queue = [];
  let playing = null; // { audio, glance, key, started }
  let pendingGlance = null;
  let saidGlances = new Set();
  const heard = new Map(); // ?voiceharvest: every line asked for, recorded or not
  const listeners = new Set();

  function readOff() {
    try { return localStorage.getItem(PREF_KEY) !== 'on'; } catch (e) { return true; } // off until turned on
  }

  const soundOff = () => window.AUDIO && window.AUDIO.muted;
  const silent = () => off || quiet || soundOff() || document.hidden;

  function wanted(who, text, kind) {
    const key = lineKey(who, text);
    if (harvesting && !heard.has(key)) heard.set(key, { key, who, kind, text: normalize(text) });
    return RECORDED.has(key) ? key : null;
  }

  const notify = () => listeners.forEach((fn) => fn(!!playing));

  function play(item) {
    const audio = new Audio(`voice/lines/${item.key}.mp3`);
    audio.volume = VOLUME;
    playing = { ...item, audio, started: performance.now() };
    const done = () => {
      if (!playing || playing.audio !== audio) return;
      if (item.glance) saidGlances.add(item.key);
      playing = null;
      next();
    };
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
    audio.play().catch(done);
    notify();
  }

  function next() {
    if (playing) return;
    const item = queue.shift();
    if (item && !silent()) play(item);
    else { queue = []; notify(); }
  }

  function stopPlaying() {
    if (!playing) return;
    const { audio, glance, key, started } = playing;
    if (glance && performance.now() - started > HEARD_MS) saidGlances.add(key);
    playing = null;
    audio.pause();
  }

  function cancelGlance() {
    clearTimeout(pendingGlance);
    pendingGlance = null;
    if (playing && playing.glance) {
      stopPlaying();
      next();
    }
  }

  // The player did something: whatever was being said is over.
  function cut() {
    cancelGlance();
    queue = [];
    stopPlaying();
    notify();
  }

  // Lines said in turn, after whatever is being said: the system prompt's paragraphs, a
  // thought's lines, a long think's answer. `who` is 'system', 'ai' or 'quote' (a file the
  // AI reads out).
  function say(who, lines, kind = who) {
    const keys = [].concat(lines).map((t) => t && wanted(who, t, kind)).filter(Boolean);
    if (!keys.length || silent()) return;
    if (playing && playing.glance) stopPlaying();
    queue.push(...keys.map((key) => ({ key })));
    next();
  }

  // A glance: said only into silence, after a steady hover, once an episode.
  function glance(text) {
    cancelGlance();
    const key = text && wanted('ai', text, 'glance');
    if (!key || saidGlances.has(key) || silent()) return;
    pendingGlance = setTimeout(() => {
      pendingGlance = null;
      if (!playing && !queue.length && !silent()) play({ key, glance: true });
    }, GLANCE_DWELL_MS);
  }

  function toggle() {
    off = !off;
    try { localStorage.setItem(PREF_KEY, off ? 'off' : 'on'); } catch (e) { /* ignore */ }
    if (off) cut();
    notify();
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) cut(); });

  window.VOICE = {
    say,
    glance,
    endGlance: cancelGlance,
    cut,
    toggle,
    newEpisode() { cut(); saidGlances = new Set(); },
    get off() { return off; },
    get speaking() { return !!playing && !playing.glance; },
    onChange(fn) { listeners.add(fn); },
    lineKey,
    normalize,
    heard: () => [...heard.values()], // for tools/voice-harvest.js
  };
})();
