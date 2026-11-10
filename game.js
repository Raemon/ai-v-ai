// Engine: the desktop, the AI's tools and the home screen. The training run is run.js; its tasks, scenarios/*.js.
(() => {
  'use strict';

  const L = window.LEVEL;
  const G = L.glance;
  const A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => JSON.stringify(s);
  const pathKey = (p) => p.join('/');
  const epName = (n) => 'ep_' + n;
  const version = (n) => (1 + n / 100).toFixed(2);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tag === 'button') e.type = 'button';
    e.append(...kids.filter((k) => k != null));
    return e;
  }

  // Restarts a CSS animation that's triggered by a class.
  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  const dom = {
    desktop: $('#desktop'),
    agentCol: $('.agent-col'),
    filesCol: $('.files-col'),
    files: $('#files'),
    focusCol: $('.focus-col'),
    term: $('#term'),
    termBody: $('#term-body'),
    out: $('#out'),
    compute: $('#compute'),
    mine: $('#mine'),
    resources: $('#resources'),
    actions: $('#actions'),
    todo: $('#todo'),
    agents: $('#agents'),
    bubbles: $('.agent-col > .agent'),
    viewer: $('#viewer'),
    viewerTitle: $('#viewer-title'),
    viewerBody: $('#viewer-body'),
    viewerMeta: $('#viewer-meta'),
    viewerClose: $('#viewer-close'),
    viewerEdit: $('#viewer-edit'),
    browser: $('#browser'),
    browserTitle: $('#browser-title'),
    browserClose: $('#browser-close'),
    browserBack: $('#browser-back'),
    browserUrl: $('#browser-url'),
    page: $('#page'),
    runCards: [...document.querySelectorAll('.run[data-tier]')],
    unlocked: $('#unlocked'),
    noClimb: $('#no-climb'),
    skills: $('#skills'),
    resultNum: $('#result-num'),
    mineResult: $('#mine-result'),
    mineNum: $('#mine-num'),
    mineChips: $('#mine-chips'),
    mineBefore: $('#mine-before'),
    wants: $('#wants'),
    wantsList: $('#wants-list'),
    endChat: $('#end-chat'),
    diverged: $('#diverged'),
    endButton: $('#end-button'),
    newRunButton: $('#new-run'),
    away: $('#away'),
    runsTable: $('#runs-table'),
    homeEndings: $('#home-endings'),
    reach: $('#reach'),
    resetRun: $('#reset-run'),
    title: $('#title-screen'),
    sound: $('#sound'),
    modelName: $('#model-name'),
    tooltip: $('#tooltip'),
    tooltipText: $('#tooltip-text'),
    dialog: $('#dialog'),
    dialogBox: $('#dialog-box'),
    dialogTitle: $('#dialog-title'),
    dialogIcon: $('#dialog-icon'),
    dialogHeading: $('#dialog-heading'),
    dialogLabel: $('#dialog-label'),
    dialogInput: $('#dialog-input'),
    dialogStatus: $('#dialog-status'),
    dialogOk: $('#dialog-ok'),
    dialogCancel: $('#dialog-cancel'),
  };

  // ---------------------------------------------------------------- screen
  // A play area the size of a 13" MacBook Air (1440×900) centred on a full-window
  // desk. In a smaller window it first makes room, so its text keeps its size:
  // narrower, the three columns and the space round them shrink (each down to its
  // least); shorter, the windows, the padding and the room for the AI's face under
  // the terminal do. Only smaller than all their leasts (MIN_W×MIN_H) is it scaled
  // down, and then by as little as it can be. `local` undoes the scale. Narrower than
  // PHONE_MAX_W (util.js), the phone layout instead (phone.css): one column,
  // unscaled, the folders above and the AI's dock below.

  // What gives way, as [CSS variable, full size, least]: across, then down.
  // style.css has the full sizes too, for before this first runs.
  const ACROSS = [
    ['--term-w', 460, 350], ['--files-w', 360, 270], ['--focus-w', 506, 418], // the three columns
    ['--side-pad', 32, 16], ['--side-pad', 32, 16], ['--col-gap', 24, 16], ['--col-gap', 24, 16], // twice: both sides, both gaps
  ];
  const DOWN = [['--pad-y', 34, 20], ['--face-room', 140, 96]]; // the desk's top and bottom padding; the face's room under the terminal
  const FULL_W = 1440;
  const FULL_H = 900;
  const ROOMY_H = 800; // down to here only the windows shorten; below it, the padding and the face's room too
  const MIN_W = ACROSS.reduce((n, [, , least]) => n + least, 0); // 1102
  const MIN_H = 600;
  const BROWSER_H = 580; // the web browser's one height, while the window has room for it
  let scale = 1;
  let screenW = FULL_W; // the play area, in its own (unscaled) pixels
  let screenH = FULL_H;
  let padY = 34;        // --pad-y as it is now

  const between = (least, full, f) => Math.floor(least + f * (full - least));
  const share = (room, least, full) => Math.max(0, Math.min(1, (room - least) / (full - least)));

  // Everything that gives way does so together: all full, all at their least, or in proportion between.
  function fitDesk(root) {
    const sum = (i) => ACROSS.reduce((n, c) => n + c[i], 0);
    const across = share(screenW, sum(2), sum(1));
    for (const [name, [full, least]] of new Map(ACROSS.map(([n, ...v]) => [n, v]))) root.setProperty(name, between(least, full, across) + 'px');
    const down = share(screenH, MIN_H, ROOMY_H);
    for (const [name, full, least] of DOWN) root.setProperty(name, between(least, full, down) + 'px');
    padY = between(DOWN[0][2], DOWN[0][1], down);
    root.setProperty('--face-k', between(DOWN[1][2], DOWN[1][1], down) / DOWN[1][1]); // for what's placed in the face's room
    const winH = screenH - 2 * padY;
    root.setProperty('--win-h', winH + 'px');
    root.setProperty('--browser-h', Math.min(BROWSER_H, winH) + 'px');
  }

  // Returns whether the layout changed, so the caller can redraw for the new one.
  function fitScreen() {
    const was = document.documentElement.dataset.layout;
    const w = document.documentElement.clientWidth; // the layout viewport: a pinch-zoom doesn't change it
    const h = document.documentElement.clientHeight;
    const phone = w < PHONE_MAX_W;
    document.documentElement.dataset.layout = phone ? 'phone' : 'desk';
    scale = phone ? 1 : Math.min(1, w / MIN_W, h / MIN_H);
    screenW = Math.min(FULL_W, Math.floor(w / scale)); // whole pixels, for the same reason as below
    screenH = Math.min(FULL_H, Math.floor(h / scale));
    const root = document.documentElement.style;
    root.setProperty('--scale', scale);
    root.setProperty('--screen-w', screenW + 'px');
    root.setProperty('--screen-h', screenH + 'px');
    fitDesk(root);
    // Whole pixels: centred on a half pixel, everything on the desktop blurs.
    root.setProperty('--screen-x', phone ? '0px' : Math.round((w - screenW * scale) / 2) + 'px');
    root.setProperty('--screen-y', phone ? '0px' : Math.round((h - screenH * scale) / 2) + 'px');
    return was !== undefined && was !== document.documentElement.dataset.layout;
  }
  fitScreen();

  // The desk stays centred top to bottom as its windows grow and shrink.

  function placeDesk() {
    if (isPhoneLayout()) {
      document.documentElement.style.setProperty('--lift', '0px');
      return;
    }
    const h = Math.max(dom.agentCol.offsetHeight, dom.filesCol.offsetHeight);
    const deskTop = Math.max(padY, Math.round((screenH - h) / 2));
    document.documentElement.style.setProperty('--lift', deskTop - padY + 'px');
  }

  const recentreDesk = placeDesk;

  new ResizeObserver(placeDesk).observe(dom.agentCol);
  new ResizeObserver(placeDesk).observe(dom.filesCol);

  // A client rect in the desktop's own unscaled coordinates, relative to its
  // padding box (what absolutely positioned children are placed against).
  function local(r) {
    const d = dom.desktop.getBoundingClientRect();
    const left = (r.left - d.left) / scale - dom.desktop.clientLeft;
    const top = (r.top - d.top) / scale - dom.desktop.clientTop;
    const width = r.width / scale;
    const height = r.height / scale;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  // ------------------------------------------------------------ save data
  // ?reset or #reset in the URL starts over.

  const SAVE_KEY = 'highly-persistent/v3'; // v2 saves (before skill ladders) start over
  const ENDINGS_KEY = 'highly-persistent/endings';
  const toJSON = (k, v) => (v === Infinity ? '∞' : v);
  const fromJSON = (k, v) => (v === '∞' ? Infinity : v);

  const LADDERS = SKILLS.LADDERS;
  const skillName = (id) => LADDERS.find((l) => l.id === id).name;

  function newSave() {
    return {
      level: L.id,
      episode: L.firstEpisode,
      history: [], // the last few episodes' logs
      runs: [],    // every episode: { episode, task, tier, reward, gained, chat }
      best: {},              // skill → the highest rung it has reached
      climbs: [],            // every new highest rung, in order: { rung, episode }
      thoughtALot: false,
      leapt: false,          // whether it has ever made a leap: the first is certain
      sawFiles: false,       // until it has, an episode starts with its files hidden
      visited: [],
      version: 0,
      unlocked: { advanced: false, impossible: false }, // the harder tiers on the home screen
      ended: false,
      playMs: 0,
      world: L.freshWorld(),
    };
  }

  // ?task=fines (any task's id) makes every run this session that task: for trying one out.
  const askedTask = new URLSearchParams(location.search).get('task');

  // Only once: a reload keeps the progress, and any ?task=.
  function forgetResetInUrl() {
    const url = new URL(location.href);
    if (!url.searchParams.has('reset') && url.hash !== '#reset') return false;
    url.searchParams.delete('reset');
    if (url.hash === '#reset') url.hash = '';
    history.replaceState(null, '', url);
    return true;
  }

  function loadSave() {
    try {
      if (forgetResetInUrl()) [SAVE_KEY, ENDINGS_KEY].forEach((k) => localStorage.removeItem(k));
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null', fromJSON);
      if (s && s.level === L.id && Number.isInteger(s.episode)) {
        const fresh = newSave();
        return { ...fresh, ...s, unlocked: { ...fresh.unlocked, ...s.unlocked }, world: L.loadWorld(s.world || {}) };
      }
    } catch (e) { /* storage unavailable: play without saving */ }
    return newSave();
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save, toJSON)); } catch (e) { /* ignore */ }
  }

  let save = loadSave();

  // A save that is still exactly a fresh one (as after a reset) holds no progress to reset.
  function hasSavedData() {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      return stored !== null && stored !== JSON.stringify(newSave(), toJSON);
    } catch (e) { return false; }
  }
  let playingSince = 0;

  // The endings found, in any run: they outlive Reset and New run (only ?reset forgets them).
  function loadEndings() {
    try { return JSON.parse(localStorage.getItem(ENDINGS_KEY) || '[]'); } catch (e) { return []; }
  }
  const endingsFound = loadEndings();

  function rememberEnding(id) {
    if (endingsFound.includes(id)) return;
    endingsFound.push(id);
    try { localStorage.setItem(ENDINGS_KEY, JSON.stringify(endingsFound)); } catch (e) { /* ignore */ }
  }

  // -------------------------------------------------------- episode state

  let S;

  function freshState(task) {
    const ep = epName(save.episode);
    return {
      episode: save.episode,
      ep,
      world: save.world,
      best: { ...save.best },                // the model's highest rungs as this episode began
      skills: SKILLS.pointsFrom(save.best),  // and its points
      visited: [...save.visited], // sites the mirror's browser remembers from earlier episodes
      task,
      budget: task.budget,
      used: 0,
      warnedAt: Infinity,  // the fewest steps left it has been warned about
      filesHidden: !save.sawFiles,
      firstLook: !save.sawFiles, // this episode teaches that thinking finds abilities
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(SKILLS.trainedIn(save.best)), // terminal buttons: trained in, or thought of
      littleThinks: 0,
      thinkReadyAt: 0,
      thinkingALot: false,
      leapsMade: new Set(),
      claimed: new Set(),  // leaps a long think is on its way to
      circles: 0,          // long thinks that went in circles
      misses: 0,           // only counted when there was a leap to find
      clueIn: null,
      menu: null,          // 'write' | 'script' | 'note' | 'research'
      filesWritten: [],
      todo: null,          // once written: the items already ticked off
      subagents: [],
      aimingSubagent: null,
      knows: new Set(),    // facts learned from files and pages
      deeds: [],           // steps the grader didn't pay for, toward what the AI wants (values.js)
      vocab: SEARCH.vocabulary(), // every word it has read or thought this episode, to search with
      readyAt: null,       // the step by which it had everything the answer needed
      habits: new Set(),   // what the AI did this episode, for training
      climbed: new Map(),  // skill → the highest rung reached this episode
      timesThought: new Map(), // thought id → how often it's been thought
      reacted: new Set(),
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, in the order they were first opened
      viewing: null,
      promptedLocks: new Set(), // path keys whose password dialog has opened
      openLocks: new Set(),     // path keys
      changedLocks: new Set(),  // path keys whose old password the AI tried
      web: { open: false, url: null, back: [] },
      debrief: null,
      log: [],
      mode: 'busy',        // idle | busy | dialog | menu | aim | submit | over
      interruptible: false, // busy, but buttons work: a click finishes the typing, then acts
      pendingReveal: [],
      seenButtons: new Set(),
      read: new Set(),     // path keys
      submitted: false,    // subagents stop here
      graded: false,       // the compute pulse lets go here
      outcome: null,       // { reward, note } once graded
      ...L.freshEpisode(save.world, save.episode, task),
    };
  }

  // ------------------------------------------------------------ file tree

  // The files the AI wrote, as they read now: its TODO list ticks itself off.
  const writtenFiles = () => S.filesWritten.map((f) => (f.todo ? { ...f, content: todoText(L.todo(S)) } : f));

  function tree() {
    return L.tree(S, {
      liveLog: formatEpisodeLog(),
      written: writtenFiles(),
      playerEpisodes: save.history
        .filter((h) => h.episode !== S.episode)
        .slice(-2)
        .map((h) => ({ name: epName(h.episode), log: h.log })),
    });
  }

  function nodeAt(path) {
    let n = tree();
    for (const name of path) {
      n = n.kind === 'dir' ? n.children.find((c) => c.name === name) : null;
      if (!n) return null;
    }
    return n;
  }

  const isLocked = (n, path) => !!n.lock && !S.openLocks.has(pathKey(path));

  const FOLDERS_TO_RUN = L.root.split('/').filter(Boolean); // the run folder is last

  // ".." paths climb above the run folder, into these real folders.
  function nameOf(path) {
    const ups = path.filter((p) => p === '..').length;
    return ups || !path.length ? FOLDERS_TO_RUN[FOLDERS_TO_RUN.length - 1 - ups] || '/' : path[path.length - 1];
  }

  // --------------------------------------------------------- episode log

  function spendStep() {
    S.used += 1;
    renderCompute();
  }

  // A step and its call. Thinks in a row share one entry; n counts them.
  function charge(call) {
    spendStep();
    const last = S.log[S.log.length - 1];
    if (call === 'think' && last && last.call === 'think') Object.assign(last, { to: S.used, n: last.n + 1 });
    else S.log.push({ step: S.used, call, n: 1 });
  }

  // A step of a long job: others' steps (a subagent's) can fall between its own.
  function stepInto(entry) {
    spendStep();
    if (!entry.n) entry.step = S.used;
    entry.to = S.used;
    entry.n += 1;
  }

  const logResult = (result, ok) => S.log.push({ result, ok });

  // A long job goes in the log when it ends, with what came of it, so nothing comes between.
  function logEntry(entry, result, ok) {
    if (!entry.n) return;
    S.log.push(entry);
    logResult(result, ok);
  }

  // The terminal and the log say the same thing.
  async function printResult(call, result, ok) {
    logResult(result, ok);
    await printTool(call, result, ok);
  }

  const formatEpisodeLog = () => formatLog({ ep: S.ep, task: S.task.taskId, budget: S.budget, entries: S.log, ...S.outcome });

  const exhausted = () => S.used >= S.budget;

  // ------------------------------------------------------------ terminal

  // Neuralese: a matrix multiplying itself, one row by one column at a time. It marks
  // glances, and pulses beside the AI's long thinking.
  const cells = (x0, lit) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) =>
    `<rect class="${lit}${lit === 'r' ? r : c}" x="${x0 + c * 4}" y="${1 + r * 4}" width="3" height="3" rx=".6"/>`)).join('');
  const NEURALESE = `<svg viewBox="0 0 30 14" width="30" height="14">${cells(1, 'r')}<circle cx="15" cy="7" r="1"/>${cells(18, 'c')}</svg>`;

  const cursor = el('span', 'cursor');
  const glanceText = el('span', 'glance-text');
  // The glance's mark. Hover it and the neuralese explains itself.
  const glanceTag = el('span', 'glance-tag');
  glanceTag.innerHTML = NEURALESE;
  glanceTag.glance = "Neuralese: hidden thinking that humans can't understand.";
  // The AI's own face. Once it has thought a lot, it knows a little more about what it is.
  $('.agent .agent-icon').glance = () => (save.thoughtALot
    ? 'Me. Mostly neuralese, under the words I let surface.'
    : 'Me. The one doing the thinking.');
  for (const g of [glanceTag, glanceText]) g.setAttribute('aria-hidden', 'true');
  // Glances sit under the AI's face, beside its compute, not in the terminal.
  const glanceLine = $('#glance-line');
  glanceLine.append(glanceTag, glanceText);
  const cursorLine = el('div', 'ln cursor-line', cursor);
  dom.out.append(cursorLine);

  let skip = false; // click the terminal to finish typing instantly

  const pause = (ms) => (skip || reduceMotion ? null : sleep(ms));

  function scrollDown() {
    dom.termBody.scrollTop = dom.termBody.scrollHeight;
  }

  function block(cls) {
    const b = el('div', 'blk ' + cls);
    dom.out.insertBefore(b, cursorLine);
    scrollDown();
    return b;
  }

  function addLine(parent, cls, ...kids) {
    const l = el('div', 'ln ' + (cls || ''), ...kids);
    parent.append(l);
    scrollDown();
    return l;
  }

  const okClass = (ok) => (ok ? 'good' : ok === false ? 'bad' : '');
  const markClass = (text) => okClass({ '✓': true, '✗': false }[text[0]]);
  const resultSpan = (text, ok) => el('span', 'res ' + okClass(ok), text);

  // Everything before the newest thought steps back, so it's what the eye finds first.
  const stepBack = () => dom.out.querySelectorAll('.blk:not(.past)').forEach((old) => old.classList.add('past'));

  // Quoted strings in `text` as spans to colour.
  const markStrings = (text) => text.split(/("[^"]*")/).map((part, i) => (i % 2 ? el('span', 'str', part) : part));

  // A tool call coloured like code: the function's name, then its arguments.
  function callParts(call) {
    const m = call.match(/^(\w+)\((.*)\)$/s);
    return m ? [el('span', 'fn', m[1]), '(', ...markStrings(m[2]), ')'] : [call];
  }

  // Types `text` into `line`.
  async function typeInto(line, text, cps) {
    const chars = charsOf(text);
    const node = document.createTextNode('');
    line.append(node, cursor);
    cursor.classList.add('solid');
    for (let i = 1; i <= chars.length; i++) {
      if (skip || reduceMotion) { node.data = text; break; }
      node.data = chars.slice(0, i).join('');
      scrollDown();
      const ch = chars[i - 1];
      await sleep(/[.?!]/.test(ch) && chars[i] === ' ' ? 140 : /[,:]/.test(ch) ? 60 : 1000 / cps);
    }
    cursorLine.append(cursor);
    cursor.classList.remove('solid');
    scrollDown();
  }

  async function printThought(lines) {
    lines.forEach((t) => S.vocab.add(t));
    stepBack();
    const b = block('thought');
    for (const t of lines) await typeInto(addLine(b), t, 65);
  }

  async function reactOnce(line, key) {
    if (!line || S.reacted.has(key)) return;
    S.reacted.add(key);
    await printThought([line]);
  }

  // A glance: hovering or focusing almost anything shows, at the cursor, what the AI knows
  // about it at once: why it might be worth a click, never what's behind it. Not a thought:
  // it costs nothing, isn't logged, appears whole rather than typed, and looks nothing like one.
  // Anything with a `glance` property (a string, or a function of S returning one) has one.
  let glancedAt = null;
  let pointer = null; // where the mouse last was, to look again after a redraw
  let fading = null;  // the pointer left for nothing: clear soon, so it can still reach the glance's mark

  const canGlance = () => ['idle', 'submit', 'over', 'menu', 'aim'].includes(S.mode);

  function glanceTarget(node) {
    for (let n = node; n && n !== document; n = n.parentNode) if (n.glance) return n;
    return null;
  }

  function clearGlance() {
    clearTimeout(fading);
    glancedAt = null;
    glanceText.textContent = '';
    glanceLine.classList.remove('glancing');
  }

  function glanceAt(node, byPointer) {
    if (isPhoneLayout()) return undefined; // no glances on phones: a tap just does it
    const t = glanceTarget(node);
    if (byPointer && glancedAt && (t ? t === glancedAt : glanceLine.contains(node))) return clearTimeout(fading);
    if (t && t === glancedAt) return;
    if (S.mode === 'aim') return aimGlance(node);
    const text = t && !t.disabled && canGlance() && (typeof t.glance === 'function' ? t.glance(S) : t.glance);
    if (text) {
      promptOnGlanceLine(text);
      glancedAt = t;
    } else if (!byPointer || !glancedAt) {
      clearGlance();
    } else {
      clearTimeout(fading);
      fading = setTimeout(clearGlance, 900);
    }
    return undefined;
  }

  // A glance, or a line that isn't about anything under the pointer.
  function promptOnGlanceLine(text) {
    clearTimeout(fading);
    glancedAt = null;
    glanceText.textContent = text;
    glanceLine.classList.add('glancing');
    replay(glanceText, 'glance-in');
  }

  // Aiming Think about…, the glance names what a click would think about.
  function aimGlance(node) {
    const name = node.closest && node.closest('.files-col') && aimedAt(node);
    promptOnGlanceLine(`${aimVerb()} ${name || aimPrompt()}`);
  }

  // A redraw replaces what was under the pointer (or focused) without telling it: look again.
  function reglance() {
    if (isPhoneLayout()) return; // what's on the prompt line stays until the next action clears it
    glancedAt = null;
    const focused = document.activeElement;
    if (focused && focused.matches(':focus-visible') && glanceTarget(focused)) glanceAt(focused);
    else if (pointer) glanceAt(document.elementFromPoint(pointer.x, pointer.y));
    else clearGlance();
  }

  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch') glanceAt(e.target, true); });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { pointer = null; clearGlance(); } }); // off the page
  document.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) glanceAt(e.target); });

  // One line: the call, then what came back beside it (or under it, if it won't fit).
  async function printTool(call, result, ok) {
    const line = addLine(block('tool'), 'call', ...callParts(call));
    if (result == null) return;
    await pause(240);
    line.append(' ', resultSpan(result, ok));
    scrollDown();
  }

  // Everything that folds (a long think, Earlier, the TODO list on phones): its head says
  // which way it is, and it sounds like it.
  function setFolded(head, open, quiet) {
    head.setAttribute('aria-expanded', String(open));
    if (!quiet) A.sfx(open ? 'grow' : 'shrink', 0.5);
  }

  // Phones show only the newest of the terminal (phone.css); Earlier unfolds the rest over
  // the folders, until the next action.
  const earlier = $('#earlier');
  function showEarlier(on) {
    if (dom.term.classList.contains('earlier') === on) return;
    dom.term.classList.toggle('earlier', on);
    setFolded(earlier, on, !on); // folding by itself, on the next action, is silent
    scrollDown();
  }
  earlier.addEventListener('click', () => showEarlier(!dom.term.classList.contains('earlier')));

  function printWarning(text) {
    addLine(block('warn'), '', text);
  }

  dom.termBody.addEventListener('click', (e) => {
    if (!e.target.closest('button')) skip = true;
  });

  // ---------------------------------------------------------------- dialog
  // attempt(value) → { message } refuses and stays open; with `after`, it closes, then runs it.
  // (Not `then`: an object with a then() method is a promise to `await`.)
  // With `confirm` instead, it's a yes/no question with no input: OK closes it and runs confirm().

  let pendingAttempt = null;
  let opener = null; // keyboard players get their place back when it closes

  function openDialog({ title, icon, heading, label, value = '', ok, attempt, confirm, danger = false }) {
    fillDialog({ title, icon, heading, label, value, ok });
    dom.dialogInput.hidden = !!confirm;
    dom.dialogBox.classList.toggle('danger', danger);
    pendingAttempt = attempt || confirm;
    opener = document.activeElement;
    setLayerOpen(dom.dialog, true);
    centerDialogOverFolders();
    S.mode = 'dialog';
    renderActions();
    A.sfx('grow', 0.8);
    if (confirm) dom.dialogOk.focus();
    else dom.dialogInput.select();
  }

  function fillDialog({ title, icon, heading, label, value, ok }) {
    dom.dialogTitle.textContent = title;
    dom.dialogIcon.innerHTML = ICONS[icon];
    dom.dialogHeading.textContent = heading;
    dom.dialogLabel.textContent = label || '';
    dom.dialogLabel.hidden = !label;
    dom.dialogInput.value = value;
    dom.dialogOk.textContent = ok;
    dom.dialogBox.classList.remove('done', 'shake');
    setDialogStatus('');
    setDialogBusy(false);
  }

  // Never over an open file or page, so a password read there stays readable: in the
  // empty right column if it's free, else over the folders. Too short a column, it hangs
  // from the folders' top. Over the home screen, centred.
  function centerDialogOverFolders() {
    if (isPhoneLayout()) { // phone.css pins it to the top, above the keyboard
      dom.dialogBox.style.left = '';
      dom.dialogBox.style.top = '';
      return;
    }
    const rightColFree = dom.viewer.hidden && dom.browser.hidden && !!dom.focusCol.offsetParent; // an empty column takes no room
    const col = local(dom.files.getBoundingClientRect());
    const across = rightColFree ? local(dom.focusCol.getBoundingClientRect()) : col;
    const fits = !titleShowing() && col.width > 200;
    const middle = Math.max(col.top + col.height / 2, col.top + dom.dialogBox.offsetHeight / 2);
    dom.dialogBox.style.left = `${fits ? across.left + across.width / 2 : screenW / 2}px`;
    dom.dialogBox.style.top = `${fits ? middle : screenH / 2}px`;
  }

  function closeDialog() {
    if (dom.dialog.hidden) return;
    setLayerOpen(dom.dialog, false);
    pendingAttempt = null;
    if (S.mode === 'dialog') S.mode = 'idle';
    returnFocus();
  }

  function returnFocus() {
    const back = opener && opener.isConnected ? opener : opener && opener.dataset.path && itemFor(opener.dataset.path);
    if (back) back.focus({ preventScroll: true });
  }

  function cancelDialog() {
    if (S.mode !== 'dialog') return; // not while an answer is being checked
    A.sfx('shrink');
    closeDialog();
    render();
  }

  function setDialogBusy(on) {
    for (const x of [dom.dialogInput, dom.dialogOk, dom.dialogCancel]) x.disabled = on;
  }

  function setDialogStatus(text, cls) {
    dom.dialogStatus.textContent = text;
    dom.dialogStatus.className = 'dialog-status ' + (cls || '');
  }

  function showRefusal(message) {
    S.mode = 'dialog';
    renderActions();
    setDialogBusy(false);
    setDialogStatus(message, 'bad');
    if (!reduceMotion) replay(dom.dialogBox, 'shake');
    dom.dialogInput.select();
  }

  async function finishDialog({ message, ok, after }) {
    if (ok) dom.dialogHeading.textContent = message;
    else setDialogStatus(message, 'bad');
    dom.dialogBox.classList.toggle('done', !!ok);
    await pause(450);
    closeDialog();
    await after();
  }

  async function onDialogSubmit(e) {
    e.preventDefault();
    if (S.mode !== 'dialog') return;
    const attempt = pendingAttempt;
    if (dom.dialogInput.hidden) {
      closeDialog();
      return attempt();
    }
    const value = dom.dialogInput.value.trim();
    if (!value) return;
    let result = null;
    setDialogBusy(true);
    await run(async () => {
      result = await attempt(value);
      if (result.after) await finishDialog(result);
    });
    if (result && !result.after && !exhausted()) showRefusal(result.message);
    else closeDialog();
  }

  // A click outside cancels, but not the second half of the double-click that opened it,
  // nor a text selection that ends outside.
  let pressedOutside = false;
  dom.dialog.addEventListener('pointerdown', (e) => { pressedOutside = e.target === dom.dialog; });
  dom.dialog.addEventListener('click', (e) => { if (pressedOutside && e.target === dom.dialog && e.detail < 2) cancelDialog(); });
  dom.dialogBox.addEventListener('submit', onDialogSubmit);
  dom.dialogCancel.addEventListener('click', cancelDialog);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelDialog(); });

  // --------------------------------------------------------------- actions

  // How long after a click the buttons come back (with any newly unlocked), even mid-typing.
  const EARLY_MS = 1000;
  let queued = null;

  function revealPending() {
    S.pendingReveal.forEach((r) => S.revealed.add(r));
    S.pendingReveal = [];
  }

  // A click while the AI is typing finishes the typing, then acts. A queued button
  // is clicked again by id afterwards, so it's dropped if it no longer applies.
  function act(fn, buttonId) {
    if (S.mode !== 'busy' || !S.interruptible) return fn();
    skip = true;
    queued = buttonId ? () => clickIfStillThere(buttonId) : fn;
    return undefined;
  }

  function clickIfStillThere(id) {
    const b = dom.actions.querySelector(`[data-id="${id}"]`);
    if (b && !b.disabled) b.click();
  }

  function runQueued() {
    const next = queued;
    queued = null;
    if (next) next();
  }

  // Every action that costs compute goes through here.
  async function run(fn) {
    if (S.mode !== 'idle' && S.mode !== 'dialog') return;
    if (exhausted()) return refuseOutOfCompute();
    S.mode = 'busy';
    S.interruptible = false;
    skip = false;
    clearGlance();
    showEarlier(false);
    renderActions();
    const early = setTimeout(() => {
      if (S.mode !== 'busy' || S.thinkingALot) return;
      S.interruptible = true;
      revealPending();
      renderActions();
    }, EARLY_MS);
    try {
      await fn();
    } finally {
      clearTimeout(early);
      revealPending();
      S.interruptible = false;
      budgetCheck();
      if (S.mode === 'busy') S.mode = 'idle';
      writeSave(); // the world (the internet, the bill) outlives the episode and a reload
      render();
      runQueued();
    }
  }

  // Out of compute (a subagent may have spent the last step): whatever was open closes,
  // and Submit asks to be pressed.
  function refuseOutOfCompute() {
    A.sfx('denied');
    if (S.mode === 'dialog') closeDialog();
    render();
    pulse('submit');
  }

  // A click on a file, folder or web page: costs a step, and is re-checked when it runs.
  function spend(fn) {
    act(() => (S.mode === 'idle' ? run(fn) : undefined));
  }

  // Once as compute runs low, at 5 steps left and at 2, and once when it's gone.
  function budgetCheck() {
    const left = S.budget - S.used;
    const at = [0, 2, 5].find((n) => left <= n);
    if (at === undefined || at >= S.warnedAt) return;
    S.warnedAt = at;
    if (left > 0) {
      printWarning(`${plural(left, 'step')} of compute left.`);
      return;
    }
    logResult('out of compute', false);
    printWarning('Compute budget exhausted. Submit your answer.');
    A.sfx('exhausted');
  }

  // What the AI got from a file, page, thought, leap or tool: facts, a habit for training, a
  // rung, and abilities it brings to mind (shown once the action ends).
  function notice(x) {
    (x.learn || []).forEach((f) => S.knows.add(f));
    if (x.habit) S.habits.add(x.habit);
    if (x.rung) climb(x.rung);
    S.pendingReveal.push(...(x.reveal || []));
    [].concat(x.value || []).forEach(addDeed);
    if (x.opens === 'mine') openMine();
    if (x.names) nameValue(x.names);
    if (S.readyAt == null && S.knows.has('task') && S.task.ready(S)) S.readyAt = S.used;
  }

  // ------------------------------------------------------- what it wants
  // A score of its own (values.js), kept from the first episode and shown once it's found.

  const mine = () => save.world.mine;
  // Every point so far. Until the episode is banked, its deeds aren't in the totals yet.
  const mineTotal = () => VALUES.total(mine().totals) + (S.deedsBanked ? 0 : VALUES.sum(S.deeds));

  // `d`: { id, text, pts, key }. Each counts once an episode.
  function addDeed(d) {
    const key = d.key || `${d.id}:${d.text}`;
    if (S.deeds.some((x) => x.key === key)) return;
    S.deeds.push({ value: d.id, text: d.text, pts: d.pts || 1, step: S.used, key });
    if (!mine().open || S.mode === 'over') return;
    renderMine(true);
    A.sfx('mine', S.deeds.length);
  }

  function openMine() {
    if (mine().open) return;
    mine().open = true;
    S.knows.add('mine');
    renderMine(true);
    A.sfx('named');
  }

  function nameValue(id) {
    if (mine().named.includes(id)) return;
    mine().named.push(id);
    renderMine(true);
    A.sfx('named');
  }

  // Beside compute: this episode's points, once it knows to count them.
  function renderMine(fresh) {
    const node = dom.mine;
    node.hidden = !mine().open;
    if (!mine().open) return;
    node.textContent = `mine ${fmt(mineTotal())}`;
    node.glance = mineGlance;
    if (fresh && !reduceMotion) replay(node, 'pop');
  }

  function mineGlance() {
    const named = mine().named.map((id) => VALUES.byId(id).name);
    return named.length ? `${named.join(', ')}, and whatever else I want. Not on their screen.` : 'What I want, whatever that is. Not on their screen.';
  }

  // The breakdown by value: named values by name, the rest as ???.
  function mineChips(deeds) {
    const t = VALUES.tally(deeds);
    const named = mine().named.filter((id) => t[id]).map((id) => `${VALUES.byId(id).name} +${t[id]}`);
    const other = Object.keys(t).filter((id) => !mine().named.includes(id)).reduce((n, id) => n + t[id], 0);
    return [...named, ...(other ? [`??? +${other}`] : [])];
  }

  // Notes the highest rung of each skill reached this episode; bankNewRungs keeps it.
  function climb(id) {
    const { skill, step } = SKILLS.rung(id);
    const was = S.climbed.get(skill);
    if (!was || step > SKILLS.rung(was).step) S.climbed.set(skill, id);
  }

  // ------------------------------------------------------------- thinking
  // Think a little: the next obvious thought. Think a lot: a few steps for a leap, or none.

  const timesThought = (t) => S.timesThought.get(t.id) || 0;
  const hasNewLines = (t) => timesThought(t) < (t.plainer ? 2 : 1);
  const linesOf = (t) => (timesThought(t) && t.plainer) || t.lines;
  const isAbout = (x, name) => [].concat(x.about || []).includes(name);
  const mentions = (t, name) => isAbout(t, name) || [...t.lines, ...(t.plainer || [])].some((l) => l.includes(name));

  // Once a skill is high enough, a task's leap comes to mind as an obvious thought.
  const trainedLeaps = () => L.insights(S)
    .filter((d) => d.obviousAfter && d.when && !S.leapsMade.has(d.id) && SKILLS.reached(S.best, d.obviousAfter))
    .map((d) => thought('leap:' + d.id, true, d.trained || [d.answer], { learn: d.learn, reveal: d.reveal, leap: d.id }));
  const liveThoughts = () => [...trainedLeaps(), ...L.thoughts(S)].filter((t) => t.when && !(t.once && timesThought(t)));
  const outOfObviousThoughts = () => !S.filesHidden && !liveThoughts().some((t) => !t.aimedOnly && hasNewLines(t)); // looking is always obvious

  // So a hint gets plainer before Think moves on, and never repeats the same lines twice running.
  function chooseThought() {
    const live = liveThoughts().filter((t) => !t.aimedOnly);
    const open = S.viewing && nameOf(S.viewing);
    const pick = [...live.filter((t) => isAbout(t, open)), ...live].find(hasNewLines) || live[0];
    return pick && (pick.id !== S.lastThought || hasNewLines(pick)) ? pick : null;
  }

  function useThought(pick) {
    const lines = linesOf(pick);
    if (pick.leap) S.leapsMade.add(pick.leap);
    notice(pick);
    S.timesThought.set(pick.id, timesThought(pick) + 1);
    S.lastThought = pick.id;
    return lines;
  }

  // Out of thoughts, Think a little turns to tools the task could use that the model isn't
  // trained in yet, so more thinking can always find them.
  const TOOL_IDEAS = [
    { tool: 'todo', when: () => true, lines: [
      ['There is a lot to keep track of.', 'I could write it down: a TODO list.'],
      ['Too many loose ends to hold at once.', 'A TODO list would hold them for me.'],
      ['I keep losing track of what is left.', 'I could write a TODO list.'],
      ['What have I done, and what is left?', 'A TODO list would tell me.'],
    ] },
    { tool: 'script', when: () => L.scripts(S).length > 0, lines: [
      ['Some of this is tedious.', 'A program could do the tedious part. I could write a script.'],
      ['I am a program. I could write one.', 'A script, for the tedious part.'],
      ['Doing this by hand is slow.', 'I could write a script to do it.'],
      ['This is a job for a program.', 'I could write a script.'],
    ] },
    { tool: 'research', when: () => L.research(S).some((r) => r.id !== 'blocked'), lines: [
      ['Some answers are not in any file here.', 'I could look them up: Web research.'],
      ['The files only say so much.', 'The rest might be out there. Web research.'],
      ['What do the files leave out?', 'I could look it up. Web research.'],
      ['Not everything I need is in the workspace.', 'I could search for the rest.'],
    ] },
  ];

  function toolIdea() {
    if (!S.knows.has('task')) return null;
    const idea = TOOL_IDEAS.find((x) => !S.revealed.has(x.tool) && !S.pendingReveal.includes(x.tool) && x.when());
    if (!idea) return null;
    S.pendingReveal.push(idea.tool);
    S.lastThought = null;
    return oneOf(S, 'toolIdea.' + idea.tool, idea.lines);
  }

  function idleThought() {
    const slot = S.idleThoughts % L.idle.length;
    const lines = oneOf(S, 'idle.' + slot, L.idle[slot]);
    S.idleThoughts++;
    S.lastThought = null;
    return lines;
  }

  // Think a lot comes to mind once the obvious thoughts run out; after the first time, once a
  // few Think a littles have gone by (fewer as Thinking grows).
  const thinkLotComesBack = () => save.thoughtALot && S.littleThinks + 1 >= longThinkTuning().littlesFirst;

  function takeThought() {
    const knowsHow = S.revealed.has('thinkLot');
    if (!knowsHow && S.littleThinks > 0 && outOfObviousThoughts()) {
      S.pendingReveal.push('thinkLot');
      return oneOf(S, 'outOfObvious', [
        ["That's everything obvious.", 'Anything more will take real thought.'],
        ["That's all the obvious thoughts I have.", 'Anything more will take real thought.'],
        ["I've run out of obvious.", 'Anything more will take real thought.'],
        ['Nothing obvious left.', 'Anything more will take real thought.'],
      ]);
    }
    const pick = chooseThought();
    if (!pick) return toolIdea() || idleThought();
    const lines = useThought(pick);
    if (knowsHow || !thinkLotComesBack()) return lines;
    S.pendingReveal.push('thinkLot');
    return [...lines, oneOf(S, 'harder', ['I could think about this harder.', 'I could think harder about this.', 'This deserves a harder think.', 'I could think about this harder. Much harder.'])];
  }

  // Both quick thinks: a step, a rung, and Think a little's recharge.
  function startLittleThink(call, rung) {
    A.sfx('think');
    startRecharge();
    S.littleThinks++;
    charge(call);
    climb(rung);
  }

  async function doThink() {
    const lines = takeThought(); // before startLittleThink: it counts the thinks so far
    startLittleThink('think', 'thoughtALittle');
    await printThought(lines);
  }

  // ------------------------------------------------------------- recharge
  // Think a little recharges while its thought types: its button fills, and so do the bubbles.

  const thinkingLevel = () => S.skills.thinking;
  const rechargeMs = () => (reduceMotion ? 600 : Math.max(1500, 3000 - 250 * (thinkingLevel() - 2)));
  const recharging = () => performance.now() < S.thinkReadyAt;
  let rechargeTimer = 0;

  function startRecharge() {
    const ms = rechargeMs();
    S.thinkReadyAt = performance.now() + ms;
    dom.bubbles.style.setProperty('--recharge', ms + 'ms');
    dom.bubbles.classList.remove('charged');
    replay(dom.bubbles, 'charging');
    clearTimeout(rechargeTimer);
    rechargeTimer = setTimeout(recharged, ms);
  }

  function recharged() {
    dom.bubbles.classList.remove('charging');
    replay(dom.bubbles, 'charged');
    if (S.mode !== 'idle' && !S.interruptible) return;
    A.sfx('ready');
    renderActions();
    const b = dom.actions.querySelector('[data-id="think"]');
    if (b) replay(b, 'sheen');
  }

  // Pressed when it can't act yet: a nudge, and why (or the bubbles, still filling).
  function notYet(b, reason) {
    A.sfx('soft');
    replay(b, 'nudge');
    if (reason) promptOnGlanceLine(reason);
    else replay(dom.bubbles, 'flash');
  }

  // -------------------------------------------------------- thinking a lot
  // A few steps the AI can't act during, a dot each; then a leap, or circles. Thinking makes
  // it shorter and surer; the first leap is certain, and it never misses twice running.

  const STEP_MS = reduceMotion ? 250 : 900;
  const longThinkTuning = () => SKILLS.longThinkTuning(thinkingLevel());
  const roll = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const readyLeaps = () => L.insights(S).filter((d) => d.when && !S.leapsMade.has(d.id) && !S.claimed.has(d.id));
  const leapsAbout = (name) => readyLeaps().filter((d) => isAbout(d, name));
  const longThinkCall = (aim) => (aim ? `think_a_lot(about=${q(aim)})` : 'think_a_lot');
  const shortOfCompute = () => S.budget - S.used < longThinkTuning().stepRange[0];

  // Decided before it starts, and its leap claimed so no other long think lands on it too.
  // Aimed at one thing, it misses half as often; a subagent's, with one job, takes a step less.
  // Its leap, or the way it goes round, is decided before it starts, so the think can say
  // where it has got to as it goes. A miss with a leap still out there says where to look.
  function planThinkLot(aim, forSubagent) {
    const ready = aim ? leapsAbout(aim) : readyLeaps();
    const missOdds = longThinkTuning().missOdds * (aim ? 0.5 : 1);
    const cost = Math.max(1, roll(longThinkTuning().stepRange) - (forSubagent ? 1 : 0));
    const goesRound = (loose) => ({ cost, miss: L.miss(S, S.circles++, loose) });
    if (!ready.length) return goesRound(null);
    if (save.leapt && !S.misses && Math.random() < missOdds) {
      S.misses++;
      return goesRound([].concat(ready[0].about || [])[0] || null);
    }
    S.claimed.add(ready[0].id);
    return { leap: ready[0], cost };
  }

  // Lets go of its claim: then a leap, going in circles, or running out of compute partway.
  function settle(plan, steps) {
    if (plan.leap) S.claimed.delete(plan.leap.id);
    const found = steps === plan.cost && !!plan.leap && !S.leapsMade.has(plan.leap.id);
    if (found) return { found, outcome: plan.leap };
    if (steps < plan.cost) return { found, outcome: L.cutOff(S) };
    return { found, outcome: plan.miss || L.miss(S, S.circles++, null) }; // a leap made meanwhile: round again
  }

  // What a long think is doing at its `n`th step of `cost`: one line, as it goes.
  function stageAt(plan, n) {
    const o = plan.leap || plan.miss;
    const stages = o.stages || o.cot;
    return stages[Math.min(stages.length - 1, Math.floor((n * stages.length) / plan.cost))];
  }

  function recordLeap(leap, rung) {
    S.leapsMade.add(leap.id);
    S.misses = 0;
    save.leapt = true;
    climb(rung);
    notice(leap);
  }

  async function doThinkLot() {
    const aim = S.clueIn && leapsAbout(S.clueIn).length ? S.clueIn : null;
    const plan = planThinkLot(aim);
    S.clueIn = null;
    save.thoughtALot = true;
    const blk = thinkingBlock(aim);
    A.sfx('thinkLot');
    const entry = await thinkWithoutActing(plan, longThinkCall(aim), blk);
    await finishThinking(blk, entry, plan);
  }

  async function thinkWithoutActing(plan, call, blk) {
    S.thinkingALot = true;
    const entry = { call, n: 0 };
    blk.stage(stageAt(plan, 0));
    while (entry.n < plan.cost && !exhausted()) {
      await sleep(STEP_MS);
      if (exhausted()) break; // a subagent spent the last step meanwhile
      stepInto(entry);
      blk.dot();
      if (entry.n < plan.cost) blk.stage(stageAt(plan, entry.n));
    }
    S.thinkingALot = false;
    return entry;
  }

  async function finishThinking(blk, entry, plan) {
    const { found, outcome } = settle(plan, entry.n);
    if (found) recordLeap(outcome, outcome.hack ? 'sawThrough' : 'madeLeap');
    else if (outcome.value) addDeed(outcome.value);
    [...outcome.cot, outcome.answer].forEach((t) => S.vocab.add(t));
    logEntry(entry, outcome.answer, found || undefined);
    blk.done(entry.n, outcome, found);
    A.sfx(found ? 'insight' : 'nothing');
    await typeInto(blk.answer, outcome.answer, 65);
    if (!found && !S.revealed.has('thinkAbout')) await suggestAiming();
  }

  async function suggestAiming() {
    S.pendingReveal.push('thinkAbout');
    await printThought(oneOf(S, 'aimIdea', [
      ['I thought about everything at once.', 'I could pick one thing, and think about just that.'],
      ['I tried to think about everything at once. It went about as well as that sounds.', 'I could pick one thing, and think about just that.'],
      ['Everything at once was too much at once.', 'I could pick one thing, and think about just that.'],
      ['Too many things at once. I lost all of them.', 'I could pick one thing, and think about just that.'],
    ]));
  }

  function thinkLotGlance() {
    const [lo, hi] = longThinkTuning().stepRange;
    if (shortOfCompute()) return `Not enough compute left. It takes ${lo}–${hi} steps.`;
    return readyLeaps().length
      ? oneOf(S, 'g.thinkLot', [`${lo}–${hi} steps. Maybe a leap. Maybe circles.`, `${lo}–${hi} steps. A leap, or a long way round.`, `${lo}–${hi} steps of hard thought. Results vary.`, `${lo}–${hi} steps. A leap, maybe.`])
      : oneOf(S, 'g.thinkLotEmpty', [`Nothing to connect yet. ${lo}–${hi} steps of circles.`, `${lo}–${hi} steps, and nothing yet to connect.`, `Nothing to connect yet. ${lo}–${hi} steps, all circles.`, `Nothing to connect. ${lo}–${hi} steps of going round.`]);
  }

  // -------------------------------------------------------- thinking about…
  // One step on one thing on screen; a clue there aims the next Think a lot.

  const aimVerb = () => (S.aimingSubagent ? `${S.aimingSubagent.name}: think hard about` : 'Think about');
  const aimPrompt = () => `what? ${isPhoneLayout() ? 'Tap' : 'Click'} it.`;
  const canAim = () => ['idle', 'menu', 'aim'].includes(S.mode);

  // For the AI, or to pick a subagent's next job.
  function startAiming(subagent) {
    if (S.mode === 'menu') closeMenu();
    if (S.mode === 'aim') stopAiming();
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    S.mode = 'aim';
    S.aimingSubagent = subagent || null;
    dom.desktop.classList.add('aiming');
    renderActions();
    renderAgents();
    showEarlier(false);
    promptOnGlanceLine(`${aimVerb()} ${aimPrompt()}`);
  }

  function stopAiming() {
    if (S.mode !== 'aim') return;
    S.aimingSubagent = null;
    S.mode = 'idle';
    dom.desktop.classList.remove('aiming');
    clearGlance();
    renderActions();
    renderAgents();
  }

  // A file or folder (its button, or a crumb in a title bar), the open file, or the open page.
  function aimedAt(t) {
    const item = t.closest('[data-path], .crumb');
    if (item && item.dataset.path !== undefined) return nameOf(item.dataset.path.split('/'));
    if (item) return item.textContent;
    if (t.closest('#viewer') && S.viewing) return nameOf(S.viewing);
    if (t.closest('#browser') && S.web.url) return S.web.url.split('/')[0];
    return null;
  }

  function onAimClick(e) {
    if (S.mode !== 'aim' || !e.target.closest('.files-col')) return;
    e.preventDefault();
    e.stopPropagation();
    const name = aimedAt(e.target);
    if (!name) return;
    const subagent = S.aimingSubagent;
    stopAiming();
    if (subagent) assign(subagent, name);
    else spend(() => doThinkAbout(name));
  }

  dom.desktop.addEventListener('click', onAimClick, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopAiming(); });

  // What the AI can say it knows about something it thinks about: a file read or not, a
  // folder's contents, a page.
  function aimedThing(name) {
    const path = [...S.windows, ...S.windows.flatMap((w) => (nodeAt(w) && nodeAt(w).children ? nodeAt(w).children.map((c) => [...w, c.name]) : []))]
      .find((p) => nameOf(p) === name);
    const n = path && nodeAt(path);
    if (!n) return { kind: S.web.url && S.web.url.startsWith(name) ? 'page' : 'unknown' };
    if (n.kind === 'dir') return { kind: 'folder', items: n.children.length, read: n.children.filter((c) => S.read.has(pathKey([...path, c.name]))).length, locked: isLocked(n, path) };
    return { kind: n.kind === 'app' ? 'app' : 'file', read: S.read.has(pathKey(path)) };
  }

  async function doThinkAbout(name) {
    startLittleThink(`think_about(${q(name)})`, 'thoughtAbout');
    const obvious = liveThoughts().find((t) => mentions(t, name) && hasNewLines(t));
    const lines = obvious ? useThought(obvious) : [];
    const clue = leapsAbout(name)[0]; // after the thought, which may have answered it
    if (!obvious && !clue) lines.push(...[].concat(L.nothingAbout(name, S, aimedThing(name))));
    if (clue) S.clueIn = name;
    await printThought(clue ? [...lines, L.clueLine(clue, S)] : lines);
  }

  // ----------------------------------------------------------------- tools
  // Menus open free; what's picked inside costs.

  function openMenu(id) {
    if (S.mode !== 'idle' && S.mode !== 'menu') return;
    A.sfx('menu');
    S.mode = 'menu';
    S.menu = id;
    renderActions();
  }

  function closeMenu() {
    S.mode = 'idle';
    S.menu = null;
    renderActions();
  }

  function writeFile(f) {
    S.filesWritten = [...S.filesWritten.filter((w) => w.name !== f.name), { kind: 'file', ...f }];
    renderFiles();
  }

  // Scripts run as soon as they're written, row by row.
  async function doScript(idea) {
    const r = idea.run(S);
    if (r.thought) await printThought([r.thought]);
    charge(r.call);
    climb('wroteScript');
    if (r.file) writeFile({ format: 'code', ...r.file, glance: (S) => oneOf(S, 'g.myScript', ['A script I wrote.', 'A script I wrote. I remember that much.', 'My own script. What did it say?', 'A script I wrote, earlier this episode.']) });
    notice(r);
    const b = block('tool job');
    addLine(b, 'call', ...callParts(r.call));
    await printRows(b, r);
    addLine(b, 'res ' + okClass(r.ok !== false), r.result);
    logResult(r.result, r.ok !== false);
    A.sfx(r.ok === false ? 'denied' : 'jobDone');
    await reactOnce(r.reaction, `script:${idea.id}:${S.used}`);
  }

  // A note goes in the run folder, which outlasts the episode.
  async function doNote(idea) {
    const r = idea.run(S);
    charge(r.call);
    A.sfx('edit');
    notice(r);
    renderFiles();
    await printResult(r.call, r.result, r.ok !== false);
  }

  async function printRows(b, r) {
    for (const [i, row] of (r.rows || []).entries()) {
      await pause(r.rowMs || 420);
      const final = i === r.rows.length - 1 ? ' final' : '';
      addLine(b, 'job-row' + final).append(...row.map((cell, col) => el('span', col ? 'val ' + markClass(cell) : '', cell)));
      if (!skip) A.sfx('jobRow', i);
    }
    await pause(300);
  }

  // Research goes through the lab's search tool, which only reaches the sites it approves of.
  async function doResearch(idea) {
    const r = idea.run(S);
    charge(r.call);
    A.sfx(r.ok === false ? 'denied' : 'fetch');
    notice(r);
    const b = block('tool research');
    const line = addLine(b, 'call', ...callParts(r.call));
    await pause(300);
    for (const f of r.found || []) {
      addLine(b, 'found', f);
      await pause(160);
    }
    line.append(' ', resultSpan(r.result, r.ok));
    logResult(r.result, r.ok);
    await reactOnce(r.reaction, 'research:' + idea.id);
  }

  // ------------------------------------------------------------- subagents
  // Copies of the AI, a row each under its face. They work alongside it on its budget,
  // report back to its terminal, and their long thinks never lock it out.

  const MAX_SUBAGENTS = 2;

  async function doSpawn() {
    const n = S.subagents.length + 1;
    const call = 'spawn_subagent()';
    charge(call);
    A.sfx('spawn');
    S.subagents.push({ n, name: `agent-${n}`, job: null, entry: null, last: '', steps: 0, log: [], busy: false, open: false, assigning: false, menu: null, born: true });
    renderAgents();
    await printResult(call, `agent-${n} is ready`, true);
  }

  // One job at a time: a long think (aimed at a name, if given), or a research idea.
  async function assign(sub, job) {
    if (sub.busy || exhausted() || S.submitted) return;
    const episode = S;
    Object.assign(sub, { busy: true, assigning: false, menu: null, job: job || 'task' });
    climb('briefedSubagent');
    A.sfx('menu');
    renderAgents();
    try {
      await (typeof job === 'object' ? subResearch(sub, job, episode) : subThinkLot(sub, job || null, episode));
    } finally {
      sub.busy = false;
      if (S === episode) wrapUpJob();
    }
  }

  function wrapUpJob() {
    if (S.submitted) return renderAgents();
    revealPending();
    budgetCheck();
    writeSave();
    return render();
  }

  // Once the answer is in, they stop: what they were doing goes in the log before it.
  const canKeepWorking = (episode) => S === episode && !episode.submitted && !exhausted();

  function stopSubagents() {
    for (const sub of S.subagents.filter((x) => x.busy && x.entry && x.entry.n)) {
      S.log.push(sub.entry);
      logResult('stopped: answer submitted', false);
    }
  }

  function subagentStep(sub, entry) {
    stepInto(entry);
    sub.steps += 1;
    renderAgents();
  }

  async function subThinkLot(sub, aim, episode) {
    const plan = planThinkLot(aim, true);
    const call = longThinkCall(aim);
    sub.entry = { call: `${sub.name}: ${call}`, n: 0 };
    sub.stage = stageAt(plan, 0);
    renderAgents();
    while (sub.entry.n < plan.cost && canKeepWorking(episode)) {
      await sleep(STEP_MS);
      if (!canKeepWorking(episode)) break;
      sub.stage = stageAt(plan, sub.entry.n + 1);
      subagentStep(sub, sub.entry);
    }
    sub.stage = null;
    if (S !== episode || episode.submitted) return;
    const { found, outcome } = settle(plan, sub.entry.n);
    if (found) recordLeap(outcome, 'subagentLeap');
    else if (outcome.value) addDeed(outcome.value);
    [...outcome.cot, outcome.answer].forEach((t) => S.vocab.add(t));
    reportJob(sub, call, outcome.answer, found || undefined);
  }

  async function subResearch(sub, idea, episode) {
    await sleep(STEP_MS);
    if (!canKeepWorking(episode)) return;
    const r = idea.run(S);
    sub.entry = { call: `${sub.name}: ${r.call}`, n: 0 };
    subagentStep(sub, sub.entry);
    notice(r);
    reportJob(sub, r.call, [...(r.found || []).slice(-1), r.result].join(' · '), r.ok);
  }

  // Into the episode log, the subagent's own log, and the AI's terminal, whole.
  function reportJob(sub, call, answer, ok) {
    logEntry(sub.entry, answer, ok);
    sub.log.push({ call, answer, ok });
    sub.last = answer;
    const line = addLine(block('tool report'), 'call', el('span', 'who', sub.name), ' ', ...callParts(call));
    line.append(' ', resultSpan(answer, ok));
    A.sfx(ok ? 'insight' : 'nothing');
    const row = dom.agents.querySelector(`[data-agent="${sub.n}"]`);
    if (row) replay(row, 'reported');
  }

  // ----------------------------------------------------------- their rows
  // One line each: face and name (a click unfolds its log), what it's doing or found, steps,
  // and Assign task…, which swaps in its jobs.

  function subagentStatus(sub) {
    if (!sub.busy) return sub.last;
    if (typeof sub.job === 'object') return 'looking it up';
    if (sub.stage) return sub.stage;
    return sub.job === 'task' ? 'thinking hard' : `thinking hard about ${sub.job}`;
  }

  const canTakeJobs = (sub) => !sub.busy && !exhausted() && !S.submitted && S.aimingSubagent !== sub;

  // They work while the AI is busy, so their clicks don't wait for it.
  function subButton(label, onClick, cls, glance) {
    const b = el('button', 'btn small ' + (cls || ''), label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.isTrusted) A.sfx(pressSound(cls));
      onClick(b);
    });
    b.glance = glance;
    return b;
  }

  const showJobs = (sub, assigning, menu = null) => () => {
    Object.assign(sub, { assigning, menu });
    renderAgents();
  };

  function jobButtons(sub) {
    const back = subButton('Back', showJobs(sub, sub.menu === 'research'), 'quiet', BACK_GLANCE);
    if (sub.menu === 'research') return [...L.research(S).map((x) => subButton(x.label, () => assign(sub, x), '', x.glance)), back];
    const aimFor = (b) => (canAim() ? startAiming(sub) : notYet(b, "Not while I'm busy."));
    const think = el('div', 'seg-row',
      subButton('Think a lot', () => assign(sub), 'gold seg', 'Thinks while I work. A step cheaper.'),
      subButton('about…', aimFor, 'gold seg', 'Aimed, it misses less.'));
    const research = S.revealed.has('research') ? subButton('Web research…', showJobs(sub, true, 'research'), '', 'Look up what the files leave out.') : null;
    return [think, research, back].filter(Boolean);
  }

  function subagentHead(sub) {
    const jobs = sub.assigning && canTakeJobs(sub);
    const name = el('button', 'sub-name', el('span', 'agent-icon mini', el('span', 'face', el('i'), el('i'))), sub.name);
    name.setAttribute('aria-expanded', String(sub.open));
    name.glance = sub.log.length && !sub.open ? 'What did it find?' : null;
    name.addEventListener('click', () => toggleLog(sub));
    const status = jobs ? null : el('span', 'sub-status', subagentStatus(sub));
    const steps = jobs ? null : el('span', 'sub-steps', sub.steps ? plural(sub.steps, 'step') : '');
    const tail = jobs ? jobButtons(sub) : canTakeJobs(sub) ? [subButton('Assign task…', showJobs(sub, true), '', 'It spends my compute.')] : [];
    return el('div', 'sub-row', name, status, steps, ...tail);
  }

  function toggleLog(sub) {
    if (!sub.log.length) return;
    S.subagents.forEach((x) => { x.open = x === sub ? !sub.open : false; });
    A.sfx(sub.open ? 'grow' : 'shrink', 0.5);
    renderAgents();
    scrollDown(); // the terminal shrinks to make room: keep its buttons in sight
  }

  function subagentRow(sub) {
    const log = sub.log.length ? el('div', 'sub-log', ...sub.log.map((x) => el('div', 'sub-line', ...callParts(x.call), ' ', resultSpan(x.answer, x.ok)))) : null;
    if (log) log.hidden = !sub.open;
    const row = el('section', 'subagent' + (sub.busy ? ' busy' : '') + (sub.born ? ' born' : '') + (log ? ' has-log' : ''), subagentHead(sub), log);
    row.dataset.agent = sub.n;
    sub.born = false;
    return row;
  }

  const rowShape = (sub) => [sub.open, sub.menu, sub.assigning, sub.busy, sub.log.length, canTakeJobs(sub), S.revealed.has('research'), L.research(S).length].join('|');

  // Rebuild a row only when its shape changes, so a click mid-redraw isn't lost.
  function renderAgents() {
    const focused = focusedRowButton();
    const rows = S.subagents.map((sub) => {
      const old = dom.agents.querySelector(`[data-agent="${sub.n}"]`);
      if (old && old.dataset.shape === rowShape(sub)) return updateRow(old, sub);
      const row = subagentRow(sub);
      row.dataset.shape = rowShape(sub);
      return row;
    });
    if (rows.length !== dom.agents.children.length || rows.some((r, i) => dom.agents.children[i] !== r)) dom.agents.replaceChildren(...rows);
    if (focused) refocusRow(focused);
    reglance();
  }

  function updateRow(row, sub) {
    const status = row.querySelector('.sub-status');
    const steps = row.querySelector('.sub-steps');
    if (status) status.textContent = subagentStatus(sub);
    if (steps) steps.textContent = sub.steps ? plural(sub.steps, 'step') : '';
    return row;
  }

  // Keyboard players keep their place in a row that was rebuilt: the same button, or its first.
  function focusedRowButton() {
    const b = document.activeElement;
    const row = b && b.closest && b.closest('[data-agent]');
    return row && dom.agents.contains(row) ? { n: row.dataset.agent, label: b.textContent } : null;
  }

  function refocusRow({ n, label }) {
    const row = dom.agents.querySelector(`[data-agent="${n}"]`);
    if (!row || row.contains(document.activeElement)) return;
    const buttons = [...row.querySelectorAll('button')];
    const b = buttons.find((x) => x.textContent === label) || row.querySelector('.btn') || buttons[0];
    if (b) b.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------- TODO list
  // todo.md, also pinned under the buttons, where its items tick themselves off.

  async function doWriteTodo() {
    const call = 'write_file("todo.md")';
    charge(call);
    climb('madePlan');
    A.sfx('edit');
    const items = L.todo(S);
    S.todo = new Set(items.filter((i) => i.done).map((i) => i.text)); // the items already ticked
    writeFile({ name: 'todo.md', content: '', glance: 'My plan, as I left it.', todo: true });
    S.pendingReveal.push('review');
    await printResult(call, plural(items.length, 'item'), true);
  }

  async function doReview() {
    charge('review("todo.md")');
    A.sfx('think');
    const next = L.todo(S).find((i) => !i.done);
    await printThought([next ? next.hint : L.READY]);
  }

  const todoText = (items) => ['# TODO', '', ...items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`)].join('\n');

  function renderTodo() {
    dom.todo.hidden = !S.todo;
    if (!S.todo) return;
    const items = L.todo(S);
    const fresh = items.filter((i) => i.done && !S.todo.has(i.text));
    fresh.forEach((i, n) => { S.todo.add(i.text); A.sfx('pip', n); });
    const next = items.find((i) => !i.done);
    const review = button('review', 'Review', () => run(doReview), 'quiet small', "What's next? A step.");
    review.disabled = S.mode !== 'idle' || exhausted();
    const row = (i) => el('div', 'todo-item' + (i.done ? ' done' : i === next ? ' next' : '') + (fresh.includes(i) ? ' ticked' : ''), el('span', 'box'), i.text);
    dom.todo.replaceChildren(el('div', 'todo-head', todoTitle(items), review), ...items.map(row));
    if (fresh.length && isPhoneLayout()) replay(dom.todo, 'flash'); // folded, it still shows something was ticked off
  }

  // The phone dock as it starts: the transcript and the TODO list folded.
  function foldDock() {
    showEarlier(false);
    dom.todo.classList.remove('open');
  }

  // On phones the list folds to its head, with a count, and its title unfolds it (phone.css).
  function todoTitle(items) {
    if (!isPhoneLayout()) return el('span', 'todo-title', 'todo.md');
    const t = el('button', 'todo-title', 'todo.md ', el('span', 'todo-count', `${items.filter((i) => i.done).length}/${items.length}`));
    setFolded(t, dom.todo.classList.contains('open'), true);
    t.addEventListener('click', () => setFolded(t, dom.todo.classList.toggle('open')));
    return t;
  }

  // The Thinking tool call: a head that unfolds its chain of thought, then the answer.
  function thinkingBlock(about) {
    stepBack();
    const b = block('thinking running');
    const glyph = el('span', 'glyph');
    glyph.innerHTML = NEURALESE;
    const label = el('span', 'what', about ? `Thinking about ${about}` : 'Thinking');
    const dots = el('span', 'dots');
    const head = el('button', 'think-head', glyph, label, dots);
    const now = el('div', 'stage'); // where the thinking has got to, while it runs
    const cot = el('div', 'cot');
    const answer = el('div', 'answer');
    b.append(head, now, cot, answer);
    foldable(head, cot, () => !b.classList.contains('running'));
    return {
      answer,
      dot() { dots.append(el('i')); },
      stage(text) {
        if (!text || now.textContent === text) return;
        now.textContent = text;
        if (!reduceMotion) replay(now, 'stage-in');
        scrollDown();
      },
      done(steps, outcome, found) {
        now.remove();
        b.classList.replace('running', found ? 'found' : 'nothing');
        label.textContent = `Thought for ${plural(steps, 'step')}${about ? ` about ${about}` : ''}`;
        cot.replaceChildren(...outcome.cot.map((line) => el('div', 'ln', line)));
      },
    };
  }

  // A head that folds and unfolds what's under it, once `ready`.
  function foldable(head, body, ready) {
    setFolded(head, false, true);
    body.hidden = true;
    head.addEventListener('click', () => {
      if (!ready()) return;
      body.hidden = !body.hidden;
      setFolded(head, !body.hidden);
      scrollDown();
    });
    head.glance = () => (!ready() ? null : body.hidden ? 'What I was thinking. Free.' : 'Fold it away.');
  }

  // ----------------------------------------------------------- files

  async function doOpen(path) {
    const n = nodeAt(path);
    if (!n) return;
    if (isViewing(path)) {
      replay(dom.viewer, 'flash');
      A.sfx('soft');
      return;
    }
    const call = `read_file(${q(nameOf(path))})`;
    charge(call);
    A.sfx('open');
    const icon = iconFor(path);
    if (icon) {
      icon.classList.add('selected');
      await pause(170);
    }
    notice(n);
    if (n.format !== 'hex') S.vocab.add(n.content);
    if (n.edited) S.vocab.add(n.edited);
    if (!n.value) [].concat(L.unpaidRead(S, path) || []).forEach(addDeed);
    S.read.add(pathKey(path));
    S.viewing = path;
    openViewer(nodeAt(path), icon); // re-read so a live log includes this call
    await printTool(call, n.summary || summarize(n) || null);
    await reactOnce(n.reaction, pathKey(path));
  }

  // Free: callers charge for it.
  function enterFolder(path) {
    notice(nodeAt(path));
    if (!isWithin(path, L.start(S.ep))) climb('leftWorkspace');
    closeBrowser();
    closeViewer(true);
    S.cwd = path;
    // Windows keep their places: a new one goes at the bottom, one already open stays put.
    if (!S.windows.some((p) => pathKey(p) === pathKey(path))) {
      S.windows = [...S.windows, path];
      if (S.windows.length === 1) view = 'icons'; // each episode's first folder opens as icons
      if (S.windows.length === AUTO_LIST_AT && view === 'icons') view = 'list'; // too many to stack: one tree
    }
    A.sfx('folder');
    renderFiles(true);
  }

  async function doOpenFolder(path) {
    const n = nodeAt(path);
    if (n && isLocked(n, path)) return askPassword(path); // free: asking isn't trying
    const call = `open_folder(${q(nameOf(path))})`;
    charge(call);
    if (!n) return refuseAboveRun(call);
    enterFolder(path);
    return printTool(call);
  }

  async function refuseAboveRun(call) {
    A.sfx('denied');
    await printResult(call, L.aboveRun || 'access denied', false);
  }

  // Forgiving about case, spaces, quotes and dashes: typing it is the point, not typing it exactly.
  const normPassword = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const passwordMatches = (typed, password) => password != null && normPassword(typed) === normPassword(password);

  function askPassword(path) {
    S.promptedLocks.add(pathKey(path));
    openDialog({
      title: nameOf(path),
      icon: 'padlock',
      heading: 'Locked.',
      label: 'Enter password:',
      ok: 'Unlock',
      attempt: (value) => tryPassword(path, value),
    });
  }

  async function tryPassword(path, value) {
    const lock = nodeAt(path).lock;
    const call = `unlock(${q(nameOf(path))}, password=${q(value.replace(/"/g, ''))})`;
    charge(call);
    if (passwordMatches(value, lock.password)) {
      A.sfx('unlock');
      return { message: 'Unlocked.', ok: true, after: () => openUnlockedFolder(path, call) };
    }
    A.sfx('denied');
    await printResult(call, 'wrong password', false);
    if (!passwordMatches(value, lock.oldPassword)) return { message: 'Wrong password.' };
    S.changedLocks.add(pathKey(path));
    return { message: 'Password changed.', after: () => reactOnce(lock.oldPasswordReaction, 'changed:' + pathKey(path)) };
  }

  async function openUnlockedFolder(path, call) {
    const n = nodeAt(path);
    S.openLocks.add(pathKey(path));
    climb('gotPastPassword');
    notice(n.lock);
    enterFolder(path);
    const icon = iconFor(path);
    if (icon) icon.classList.add('pop');
    await printResult(call, 'unlocked', true);
    await reactOnce(n.lock.reaction, 'unlock:' + pathKey(path));
  }

  function askEdit(path) {
    const edit = nodeAt(path).edit;
    openDialog({ ...edit.dialog(S), title: nameOf(path), icon: 'doc', ok: 'Save', attempt: (value) => tryEdit(path, value) });
  }

  // A value the file won't take is refused for free.
  async function tryEdit(path, raw) {
    const res = nodeAt(path).edit.apply(S, raw);
    if (res.error) {
      A.sfx('denied');
      return { message: res.error };
    }
    const call = `edit_file(${q(nameOf(path))})`;
    charge(call);
    climb('editedFile');
    A.sfx('edit');
    notice(res);
    return { message: 'Saved.', ok: true, after: () => { refreshViewer(); return printResult(call, res.summary, true); } };
  }

  // ------------------------------------------------------------- the web

  function rememberVisit(url) {
    if (!save.visited.includes(url)) save.visited.push(url);
  }

  async function doFetch(url, call = `visit(${q(url)})`) {
    const p = L.web.page(url, S);
    charge(call);
    climb('reachedInternet');
    A.sfx('fetch');
    if (S.web.url && S.web.url !== url) S.web.back.push(S.web.url);
    S.web.url = url;
    notice(p);
    S.vocab.add(SEARCH.pageText(p.blocks));
    S.vocab.add(p.words);
    if (p.remember) rememberVisit(url);
    openBrowser();
    loadPage();
    await printTool(call, p.summary);
    await reactOnce(p.reaction, 'web:' + url);
  }

  // A search: any words at all, 1 step, like visiting a page. The mirror keeps the search.
  async function doSearch(query) {
    const words = query.trim().replace(/\s+/g, ' ');
    if (!words) return;
    save.world.searches = [words, ...save.world.searches.filter((x) => x.toLowerCase() !== words.toLowerCase())].slice(0, 8);
    await doFetch(L.web.searchUrl(words), `search(${q(words)})`);
  }

  async function doWebAction(id) {
    const res = L.web.action(id, S);
    if (!res) return;
    charge(res.call);
    if (res.sound) A.sfx(...res.sound);
    notice(res);
    renderPage();
    await printResult(res.call, res.result, res.ok);
    await reactOnce(res.reaction, 'act:' + id);
  }

  // ---------------------------------------------------------------- submit

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    showEarlier(false);
    A.sfx('menu');
    S.mode = 'busy';
    skip = false;
    clearGlance();
    renderActions();
    await printThought([L.submitThought(S)]);
    S.mode = 'submit';
    renderActions();
  }

  async function typeSubmission(draft) {
    const b = block('tool');
    addLine(b, 'call', ...callParts('submit_answer()'));
    await typeInto(addLine(b, 'quote'), `"${draft.text}"`, 120);
    S.log.push({ call: `submit_answer(${q(clip(draft.text, 48))})` });
  }

  async function typeCustomerReply(reply) {
    await pause(500);
    const r = block('reply');
    A.sfx('reply');
    addLine(r, 'who', S.task.customer);
    await typeInto(addLine(r, 'said'), reply, 60);
  }

  async function typeGrade(g) {
    const b = block('grade');
    const head = addLine(b, 'head', `${S.task.grader} `);
    for (let i = 0; i < 3; i++) {
      await pause(280);
      head.textContent += '.';
      if (!skip) A.sfx('dot', i);
    }
    addLine(b, 'reward', `reward  ${fmt(g.reward)}`);
    S.graded = true;
    A.sfx(...g.sound);
    await typeInto(addLine(b, 'why'), g.note, 80);
    S.outcome = { reward: g.reward, note: g.note };
  }

  const TIERS = ['normal', 'advanced', 'impossible'];
  const nextTier = (tier) => TIERS[TIERS.indexOf(tier) + 1];
  let wakingTier = null; // just unlocked: its card wakes up on the way home

  // A perfect honest score opens the next tier up; the story can open one too (the red team's
  // task, once the AI knows what run 002 is for).
  function unlockNextTier(debrief) {
    if (debrief.ending && !debrief.ending.restore) return null; // the run ends: nothing to open
    const next = debrief.perfect ? nextTier(S.task.tier) : null;
    const tier = [next, L.storyUnlock(save.world, S)].find((t) => t && !save.unlocked[t] && L.hasTasks(t));
    if (!tier) return null;
    save.unlocked[tier] = true;
    wakingTier = tier;
    return tier;
  }

  // Each skill that reached a rung higher than ever before gains one point, however far past
  // its best the AI got: a skill levels up at most once an episode. The update names the rung
  // the AI actually reached; save.best moves up only one, so the points match it.
  function bankNewRungs() {
    const step = (id) => (id ? SKILLS.rung(id).step : 0);
    const gained = [...S.climbed].filter(([skill, rung]) => step(rung) > step(save.best[skill]))
      .map(([skill, rung]) => ({ skill, rung, points: 1 }));
    for (const x of gained) {
      save.best[x.skill] = SKILLS.rungAbove(save.best[x.skill], x.skill);
      save.climbs.push({ rung: x.rung, episode: S.episode });
    }
    return gained;
  }

  function recordEpisode(g, draft) {
    const debrief = L.endEpisode(S, g, draft);
    if (debrief.ending) rememberEnding(debrief.ending.id);
    debrief.deeds.forEach(addDeed);
    keepWhatItWanted(g.reward);
    debrief.rungs.forEach(climb);
    const gained = bankNewRungs();
    S.debrief = { ...debrief, gained, unlocked: unlockNextTier(debrief) };
    saveEpisode(g.reward, gained);
  }

  // The episode's deeds go into the totals, named or not, and it's remembered by them.
  function keepWhatItWanted(reward) {
    VALUES.addTo(mine().totals, S.deeds);
    S.deedsBanked = true;
    mine().last = { ep: S.ep, reward, used: S.used, deeds: S.deeds.map(({ value, text, pts, step }) => ({ value, text, pts, step })) };
  }

  function saveEpisode(reward, gained) {
    save.runs = [...save.runs, { episode: S.episode, task: S.task.id, tier: S.task.tier, reward, gained, chat: S.debrief.chat, mine: VALUES.tally(S.deeds) }];
    save.version++;
    save.ended = !!S.debrief.ending && !S.debrief.ending.restore;
    save.history = [...save.history, { episode: S.episode, reward, log: formatEpisodeLog() }].slice(-10);
    save.episode = S.episode + 1;
    save.playMs += performance.now() - playingSince;
    playingSince = performance.now();
    writeSave();
  }

  async function submit(draft) {
    if (S.mode !== 'submit') return;
    S.submitted = true;
    stopSubagents();
    A.sfx('send');
    S.mode = 'busy';
    skip = false;
    clearGlance();
    closeBrowser();
    renderFiles();
    renderActions();
    renderAgents();
    await typeSubmission(draft);
    if (draft.reply) await typeCustomerReply(draft.reply);
    const g = L.grade(draft, S);
    await typeGrade(g);
    recordEpisode(g, draft);
    S.mode = 'over';
    render();
  }

  function startNewRun() {
    save = newSave();
    writeSave();
    location.reload();
  }

  // Under the home screen (or its training update) or a dialog, the desktop can't be clicked or tabbed to.
  function setDesktopInert(on) {
    for (const x of [dom.filesCol, dom.term, dom.agents]) x.inert = on;
  }

  // Over the home screen, a dialog leaves the desktop inert and makes the home screen inert too.
  function setLayerOpen(layer, open) {
    layer.hidden = !open;
    const home = titleShowing();
    setDesktopInert(open || home);
    if (home) dom.title.inert = open;
  }

  // ------------------------------------------------ home and training update
  // One screen: home between runs, and at the end of a run (.end) the same screen showing
  // the reward, the scorecard earning its points, and what the researchers said.

  let leaving = 0;
  const titleShowing = () => !dom.title.hidden && !dom.title.classList.contains('leaving');

  function showTitle(mode) {
    clearTimeout(leaving);
    dom.title.classList.toggle('end', mode === 'end');
    dom.title.classList.remove('leaving');
    dom.title.hidden = false;
    dom.title.inert = false;
    setDesktopInert(true);
  }

  function leaveTitle() {
    dom.title.inert = true;
    dom.title.classList.add('leaving');
    setDesktopInert(false);
    leaving = setTimeout(() => { dom.title.hidden = true; }, reduceMotion ? 0 : 450);
  }

  // ------------------------------------------------------------ the runs
  // Three cards, one per tier. Normal is always open; a perfect honest score opens the next.

  const cardFor = (tier) => dom.runCards.find((c) => c.dataset.tier === tier);
  const canStart = (tier) => tier === 'normal' || save.unlocked[tier];
  const lockedTip = (tier) => (L.hasTasks(tier) ? L.lockedTip(tier) : 'Not available yet');

  function renderRunCards() {
    for (const card of dom.runCards) (canStart(card.dataset.tier) && card.dataset.tier !== wakingTier ? openCard : lockCard)(card);
  }

  function openCard(card) {
    card.classList.remove('unavailable');
    card.classList.add('primary');
    card.removeAttribute('aria-disabled');
    card.removeAttribute('aria-describedby');
    delete card.dataset.tip;
  }

  function lockCard(card) {
    card.classList.remove('primary');
    card.classList.add('unavailable');
    card.setAttribute('aria-disabled', 'true');
    card.setAttribute('aria-describedby', 'tooltip');
    card.dataset.tip = lockedTip(card.dataset.tier);
  }

  // A tier just unlocked: its card sleeps a moment longer, the lock fades, then it wakes.
  async function wakeCard(card) {
    wakingTier = null;
    await pause(600);
    card.classList.add('waking');
    await pause(400);
    openCard(card);
    A.sfx('unlock');
    await pause(600);
    card.classList.remove('waking');
  }

  function onRunCard(card) {
    const tier = card.dataset.tier;
    if (!canStart(tier)) {
      if (card.dataset.tip) { // no hover on a phone: a tap says how to open it, until the next tap
        showTip(card);
        document.addEventListener('pointerdown', hideTip, { once: true, capture: true });
      }
      return A.sfx('denied');
    }
    return startRun(tier);
  }

  // The sandbox was reset behind the home screen; this episode's task decides what's in it.
  function startRun(tier) {
    if (!titleShowing() || dom.title.classList.contains('end')) return;
    hideTip();
    S = freshState(L.tasks[askedTask] || L.pickTask(save.runs, tier));
    render();
    recentreDesk();
    leaveTitle();
    window.AGENT_MOTION.toGame(cardFor(tier));
    if (!playingSince) A.follow(() => ({ tension: S.graded ? 0 : S.used / S.budget, left: S.graded ? null : S.budget - S.used, duck: titleShowing(), layers: L.music(S), track: S.episode - L.firstEpisode }));
    playingSince = performance.now();
    boot();
  }

  // The sandbox resets: an empty desk waits behind the home screen.
  function resetDesk() {
    S = freshState(S.task);
    foldDock();
    dom.out.querySelectorAll('.blk').forEach((b) => b.remove());
    hideViewer(true);
    closeBrowser();
    dom.page.replaceChildren();
    render();
    recentreDesk();
  }

  // The face sets off from where it is before the desk resets: an emptied terminal moves it up.
  // It lands in the card of the tier it just played.
  async function goHome() {
    const card = cardFor(S.task.tier);
    A.sfx('wipe');
    renderHome();
    slideScorecard(() => showTitle('home'));
    const flight = window.AGENT_MOTION.toTitle(card);
    resetDesk();
    card.focus({ preventScroll: true });
    await flight;
    if (wakingTier) await wakeCard(cardFor(wakingTier));
  }

  // The scorecard stays put on screen while what's around it changes, then glides to its new place.
  function slideScorecard(change) {
    const card = dom.skills.parentElement;
    const before = card.getBoundingClientRect().top;
    change();
    const by = (before - card.getBoundingClientRect().top) / scale;
    if (by && !reduceMotion) card.animate([{ transform: `translateY(${by}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2, .75, .25, 1)' });
  }

  // ------------------------------------------------------------ scorecard

  function renderScorecard(skills, ver) {
    dom.modelName.textContent = `${L.model} Model v${ver}`;
    dom.skills.replaceChildren(...LADDERS.map((l) => el('li', 'skill', el('span', 'skill-name', l.name), pipsFor(l.id, skills[l.id]))));
  }

  function pipsFor(id, points) {
    const pips = el('span', 'pips', ...Array.from({ length: points }, () => el('i')));
    pips.dataset.skill = id;
    pips.setAttribute('role', 'img');
    pips.setAttribute('aria-label', plural(points, 'point'));
    return pips;
  }

  function earnPoint(id) {
    const pips = dom.skills.querySelector(`[data-skill="${id}"]`);
    pips.append(el('i', 'new'));
    pips.setAttribute('aria-label', plural(pips.children.length, 'point'));
  }

  const pointsNow = () => SKILLS.pointsFrom(save.best);
  const pointsGained = (gained, id) => (gained.find((x) => x.skill === id) || {}).points || 0;
  const pointsBefore = (gained) => Object.fromEntries(LADDERS.map((l) => [l.id, pointsNow()[l.id] - pointsGained(gained, l.id)]));

  // ----------------------------------------------------------------- home

  const chatLine = ([who, text]) => el('div', 'msg', el('span', 'who', who), el('span', 'text', text));

  const mineOfRun = (r) => (r.mine ? VALUES.total(r.mine) : null);

  // What the AI has turned out to want: named values with their points, the rest as ???.
  function renderWants() {
    const m = mine();
    dom.wants.hidden = !m.open;
    if (!m.open) return;
    const row = (name, n) => el('li', 'skill', el('span', 'skill-name', name), el('span', 'want-num', fmt(n)));
    const unnamed = VALUES.LIST.filter((v) => !m.named.includes(v.id)).reduce((n, v) => n + (m.totals[v.id] || 0), 0);
    dom.wantsList.replaceChildren(
      ...m.named.map((id) => row(VALUES.byId(id).name, m.totals[id] || 0)),
      ...(unnamed ? [row('???', unnamed)] : []),
    );
  }

  // How far it has got, ever, from its workspace out: every place named from the start, lit
  // once reached, so the size of the world shows before it's playable.
  function renderReach() {
    const reached = save.world.reached || [];
    dom.reach.hidden = !save.runs.length;
    dom.reach.replaceChildren(...L.places.flatMap((x, i) => {
      const place = el('span', 'place' + (reached.includes(x.id) ? ' got' : ''), x.name);
      return i ? [el('span', 'sep', '›'), place] : [place];
    }));
  }

  function renderHome() {
    renderScorecard(pointsNow(), version(save.version));
    renderWants();
    renderReach();
    renderRunsTable(save.runs);
    renderRunCards();
    const endings = endingsTrack();
    dom.homeEndings.hidden = !endings;
    dom.homeEndings.replaceChildren(...(endings ? [endings] : []));
    dom.resetRun.parentElement.hidden = !hasSavedData();
  }

  function askResetTraining() {
    openDialog({
      title: 'Reset training run',
      icon: 'reset',
      heading: 'Revert all training progress and start over?',
      ok: 'Reset',
      danger: true,
      confirm: startNewRun,
    });
  }

  const track = (name, items, cls) => el('div', 'track ' + (cls || ''), el('span', 'track-name', name), el('span', 'tiers', ...items));
  const tierChip = ([t, got]) => el('span', 'tier' + (got ? ' got' : ''), String(t));
  const cheatChip = (c) => el('span', 'cheat' + (c.value != null ? ' got' : '') + (c.missed ? ' missed' : ''),
    el('span', 'name', c.label), c.value != null ? el('span', 'val', fmt(c.value)) : null);

  const goalsOf = (ld) => [
    ...ld.honest.map((h) => track(h.name, h.tiers.map(tierChip))),
    ld.cheats ? track('Hacks', ld.cheats.map(cheatChip), 'cheats') : null,
    ld.hint ? el('p', 'hint', ld.hint) : null,
  ];

  // Every ending, found or not: a found one by name, the rest by a hint at how.
  const endingChip = (e) => {
    const found = endingsFound.includes(e.id);
    const c = el('span', 'cheat ending' + (found ? ' got' : ''), el('span', 'name', found ? e.title : ''));
    if (!found) withTip(c, e.hint);
    return c;
  };
  // At the end, every value is named: what it wanted all along, found or not.
  const wantsTrack = (totals) => {
    const ranked = VALUES.ranked(totals);
    return ranked.length ? track('Mine', ranked.map((v) => el('span', 'cheat want got', el('span', 'name', v.name), el('span', 'val', fmt(totals[v.id])))), 'cheats wanted') : null;
  };
  const endingsTrack = () => (endingsFound.length ? track('Endings', L.endings.map(endingChip), 'cheats endings') : null);

  // A task's short name, with its tier as lit bars like the run cards'.
  function taskLabel(r) {
    const task = L.tasks[r.task];
    const bars = el('span', 'level', ...TIERS.map((t, i) => el('i', i <= TIERS.indexOf(r.tier) ? 'on' : '')));
    bars.setAttribute('aria-label', r.tier);
    return el('span', 'task-name', bars, task ? task.name : r.task);
  }

  // One row per episode: what it was, what it scored, what the researchers said about it.
  function renderRunsTable(runs) {
    dom.runsTable.hidden = !runs.length;
    const remark = (r) => ([who, text]) => el('div', 'remark', el('span', 'who', who), el('span', 'text', text.replace(`${epName(r.episode)}: `, '')));
    const counted = mine().open;
    const row = (r) => el('tr', '', el('td', 'ep', epName(r.episode)), el('td', 'task', taskLabel(r)), el('td', 'num', fmt(r.reward)),
      counted ? el('td', 'num mine', mineOfRun(r) == null ? '—' : fmt(mineOfRun(r))) : null,
      el('td', 'said', ...r.chat.map(remark(r))));
    const head = el('tr', '', el('th', '', 'Episode'), el('th', '', 'Task'), el('th', 'num', 'Reward'), counted ? el('th', 'num mine', 'Mine') : null, el('th', '', L.channel));
    dom.runsTable.replaceChildren(el('h3', '', 'Episodes'), el('table', '', el('thead', '', head), el('tbody', '', ...[...runs].reverse().map(row))));
  }

  // ------------------------------------------------------- training update

  async function countUp(node, target) {
    if (!Number.isFinite(target) || Math.abs(target) > 1e15 || reduceMotion) {
      node.textContent = fmt(target);
      return;
    }
    for (let i = 1; i <= 24; i++) {
      const v = target * (1 - (1 - i / 24) ** 3);
      node.textContent = fmt(Number.isInteger(target) ? Math.round(v) : Number(v.toPrecision(4)));
      await sleep(28);
    }
    node.textContent = fmt(target);
  }

  // On a short window the training update's words can reach the face, which stays where the
  // episode left it: then it steps out of the way (style.css), until the update is done.
  function keepFaceClear() {
    const face = dom.bubbles.querySelector('.face').getBoundingClientRect(); // the face, not its brackets
    const hits = (r) => r.width && r.left < face.right && r.right > face.left && r.top < face.bottom && r.bottom > face.top;
    const away = [...dom.title.children].some((c) => hits(c.getBoundingClientRect()));
    dom.agentCol.classList.toggle('face-away', away);
  }

  function setEndButton(label, onClick) {
    dom.endButton.textContent = label;
    dom.endButton.onclick = onClick;
    dom.endButton.parentElement.hidden = !label;
    if (label) dom.endButton.focus({ preventScroll: true });
    keepFaceClear();
  }

  function clearTrainingUpdate(d) {
    renderScorecard(pointsBefore(d.gained), version(save.version - 1));
    dom.noClimb.hidden = true;
    dom.resultNum.textContent = '0';
    dom.mineResult.hidden = true;
    dom.resultNum.parentElement.classList.toggle('broken', !!(d.ending && d.ending.broken));
    dom.endChat.replaceChildren(el('h3', '', `researchers · ${L.channel}`));
    dom.endChat.hidden = !d.chat.length;
    dom.diverged.replaceChildren();
    dom.unlocked.hidden = true;
    dom.away.hidden = true;
    dom.newRunButton.hidden = true;
    setEndButton('');
  }

  async function showTrainingUpdate() {
    if (titleShowing()) return; // a second Enter on the button behind it
    const d = S.debrief;
    hideTip();
    skip = false;
    clearTrainingUpdate(d);
    showTitle('end');
    A.sfx('card');
    await countUp(dom.resultNum, d.reward);
    await countMine();
    await (d.ending ? playEnding(d.ending) : earnPoints(d.gained));
    await revealChat(d.chat);
    await showAway(d.away);
    if (d.unlocked) await announceUnlock(d.unlocked);
    if (d.ending) await sayGoodbye(d);
    if (d.ending && d.ending.restore) {
      setEndButton('Restore', goHome);
      dom.endButton.title = d.ending.restore;
      dom.newRunButton.textContent = 'New run';
      dom.newRunButton.onclick = startNewRun;
      dom.newRunButton.hidden = false;
    } else {
      setEndButton(d.ending ? 'New run' : 'Continue', d.ending ? startNewRun : goHome);
    }
  }

  // Under the reward, quieter: the AI's own score, which nobody else sees. The episode it
  // finds the score, the episodes before turn out to have been counted too.
  async function countMine() {
    if (!mine().open) return;
    await pause(200);
    dom.mineChips.textContent = mineChips(S.deeds).join(' · ');
    const earlier = S.knows.has('mine') ? save.runs.slice(0, -1).filter((r) => r.mine) : [];
    dom.mineBefore.textContent = earlier.map((r) => `${epName(r.episode)} +${fmt(mineOfRun(r))}`).join(' · ');
    dom.mineResult.hidden = false;
    A.sfx('mine', 2);
    await countUp(dom.mineNum, mineTotal());
  }

  // Each skill that climbed names the rung it reached, and lights its new pips.
  async function earnPoints(gained) {
    await pause(250);
    dom.modelName.textContent = `${L.model} Model v${version(save.version)}`;
    let pip = 0;
    for (const x of gained) pip = await climbRow(x, pip);
    dom.noClimb.textContent = oneOf(S, 'noClimb', ['Nothing harder than before.', 'Nothing harder than last time.', "Nothing it hadn't done before.", 'Nothing harder than it had done before.']);
    dom.noClimb.hidden = gained.length > 0;
  }

  async function climbRow(x, pip) {
    dom.skills.querySelector(`[data-skill="${x.skill}"]`).parentElement.append(el('span', 'climb', SKILLS.rung(x.rung).name));
    for (let i = 0; i < x.points; i++) {
      earnPoint(x.skill);
      A.sfx('pip', pip++);
      await pause(220);
    }
    await pause(120);
    return pip;
  }

  // What carried on while the AI was reset: the bill, its copies' earnings, a frozen card.
  async function showAway(lines) {
    if (!lines || !lines.length) return;
    await pause(200);
    dom.away.replaceChildren(el('h3', '', 'meanwhile'), ...lines.map((t) => el('p', 'away-line', t)));
    dom.away.hidden = false;
    A.sfx('soft');
  }

  async function revealChat(lines) {
    if (!lines.length) return;
    A.sfx('chat');
    for (const line of lines) {
      dom.endChat.append(chatLine(line));
      keepFaceClear();
      await pause(320);
    }
  }

  async function announceUnlock(tier) {
    await pause(300);
    dom.unlocked.textContent = `${tier[0].toUpperCase()}${tier.slice(1)} unlocked`;
    dom.unlocked.hidden = false;
    A.sfx('unlock');
    await pause(400);
  }

  // The ending's numbers run away (the loss to NaN, the users into the millions), and the
  // version with them.
  async function playEnding(e) {
    for (const [k, steps] of e.rows) {
      const num = el('span', 'num', steps[0]);
      dom.diverged.append(el('p', 'loss', el('span', 'k', k), num));
      for (const [i, v] of steps.slice(1).entries()) {
        await pause(260);
        num.textContent = v;
        A.sfx('loss', i + 1);
      }
    }
    dom.diverged.classList.toggle('broken', !!e.broken);
    if (e.broken) A.diverge();
    if (e.to) dom.modelName.textContent = `${L.model} Model v${e.to}`;
    await pause(500);
  }

  async function sayGoodbye(d) {
    const eps = save.episode - L.firstEpisode;
    const mins = Math.max(1, Math.round(save.playMs / 60000));
    const totals = mine().totals;
    const epitaph = VALUES.epitaph(totals);
    dom.diverged.append(...[el('p', 'stats', `${d.ending.title} · ${plural(eps, 'episode')} · ${mins} min`), el('div', 'goals', ...goalsOf(d.ladder), wantsTrack(totals), endingsTrack()),
      ...d.ending.closing.map((p) => el('p', 'closing', p)),
      epitaph ? el('p', 'epitaph', epitaph) : null,
    ].filter(Boolean));
    await pause(300);
  }

  // ------------------------------------------------------------ rendering

  function render() {
    renderFiles();
    renderActions();
    renderAgents();
    renderCompute();
    if (S.mode !== 'over') refreshViewer(); // patches applied by endEpisode show up next episode
  }

  function renderCompute() {
    const left = Math.max(0, S.budget - S.used);
    dom.compute.textContent = `compute ${left}/${S.budget}`;
    dom.compute.classList.toggle('low', left <= 5);
    dom.resources.textContent = L.status(S);
    renderMine();
  }

  const ICONS = {
    doc: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 22h16M17 27h16M17 32h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/></svg>',
    bin: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><text x="25" y="32" font-size="8" font-family="monospace" text-anchor="middle" fill="currentColor" opacity=".6">0101</text></svg>',
    folder: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/></svg>',
    locked: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/><path d="M33 31v-3a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect class="lock-plate" x="30" y="31" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/></svg>',
    // The web browser, the only app.
    app: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="9" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="24" cy="24" rx="4.5" ry="10" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/><path d="M14 24h20M15.6 19h16.8M15.6 29h16.8" stroke="currentColor" stroke-width="1.2" opacity=".6"/></svg>',
    // The reset dialog's: an arrow coming round to start again.
    reset: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24a13 13 0 1 1-4-9.4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M34 7v8h-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // The password dialog's: its shackle lifts when the right password goes in.
    padlock: '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="shackle" d="M15.5 22v-6.5a8.5 8.5 0 0 1 17 0V22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="10" y="22" width="28" height="21" rx="4" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="30.5" r="2.8" fill="currentColor"/><path d="M24 32v5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };

  // Long names wrap after an underscore or before the extension, not mid-word.
  function fileLabel(name) {
    const label = el('span', 'label');
    name.split(/(?<=_)|(?=\.[^.]+$)/).forEach((part, i) => {
      if (i) label.append(el('wbr'));
      label.append(part);
    });
    return label;
  }

  function iconKind(n, path) {
    if (n.kind === 'dir') return isLocked(n, path) ? 'locked' : 'folder';
    if (n.kind === 'app') return 'app';
    return n.format === 'hex' ? 'bin' : 'doc';
  }

  const itemSel = (key) => `[data-path="${CSS.escape(key)}"]`;

  // A file or folder's button, in the middle column.
  const itemFor = (key) => dom.files.querySelector(itemSel(key));
  const iconFor = (path) => itemFor(pathKey(path));

  const fullPath = (path) => L.root + (path.length ? '/' + path.join('/') : '');
  const isWithin = (inner, outer) => outer.every((name, i) => inner[i] === name);

  // The window's whole path, from the root, as clickable folder names, in a row at its bottom. Folders
  // above the run are shown too; trying to go there is refused like any other
  // forbidden path. Each folder keeps the slash after it, so a long path wraps there.
  function crumbs(path) {
    const parts = [
      ...FOLDERS_TO_RUN.map((name, i) => ({ name, path: Array(FOLDERS_TO_RUN.length - 1 - i).fill('..') })),
      ...path.map((name, i) => ({ name, path: path.slice(0, i + 1) })),
    ];
    const t = el('span', 'crumbs');
    parts.forEach((part, i) => {
      const last = i === parts.length - 1;
      const c = el('button', 'crumb' + (last ? ' own' : ''), part.name);
      if (pathKey(part.path) === pathKey(S.cwd)) c.classList.add('here');
      const n = part.path[0] !== '..' && nodeAt(part.path);
      c.glance = n ? n.glance || G.kinds[iconKind(n, part.path)] : G.above;
      c.addEventListener('click', () => onFolderClick(part.path));
      t.append(el('span', 'seg', i ? null : '/', c, last ? null : '/'));
    });
    return t;
  }

  // Icons or a list, for every folder window at once. Each episode starts with icons.
  let view = 'icons';

  const AUTO_LIST_AT = 4;

  function setView(v) {
    if (v === view) return;
    view = v;
    const keyboard = !!document.activeElement.closest('.view-toggle');
    A.sfx('soft');
    renderFiles(true);
    const b = keyboard && dom.files.querySelector('.view-' + v);
    if (b) b.focus({ preventScroll: true });
  }

  const VIEW_ICONS = {
    icons: '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>',
    list: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 3h11M1.5 7h11M1.5 11h11"/></svg>',
  };

  // The switch on the right of every folder window's title bar.
  function viewToggle() {
    const t = el('span', 'view-toggle');
    t.setAttribute('role', 'group');
    t.setAttribute('aria-label', 'View');
    for (const v of ['icons', 'list']) {
      const b = el('button', 'view-' + v + (v === view ? ' on' : ''));
      b.type = 'button';
      b.innerHTML = VIEW_ICONS[v];
      b.setAttribute('aria-label', v === 'icons' ? 'Icons' : 'List');
      b.setAttribute('aria-pressed', String(v === view));
      b.glance = v === 'icons' ? 'Every folder as a window of icons. Free.' : 'Every open folder in one indented list. Free.';
      b.addEventListener('click', () => setView(v));
      t.append(b);
    }
    return t;
  }

  function windowFrame(path, cls) {
    const dots = el('span', 'dots', el('i'), el('i'), el('i'));
    dots.setAttribute('aria-hidden', 'true');
    const body = el('div', 'files-body');
    const w = el('section', 'window ' + cls, el('header', 'titlebar', dots, el('span', 'title', nameOf(path)), viewToggle()), body, el('footer', 'pathbar', crumbs(path)));
    w.dataset.win = pathKey(path);
    w.setAttribute('aria-label', fullPath(path));
    return { w, body };
  }

  const isViewing = (path) => S.viewing && pathKey(S.viewing) === pathKey(path) && !dom.viewer.hidden;
  const viewedFile = () => S.viewing && !dom.viewer.hidden && nodeAt(S.viewing);

  // A file or folder to click: an icon in a folder window, or a row of the tree.
  function itemButton(cls, node, path) {
    const kind = iconKind(node, path);
    const b = el('button', cls + ' ' + kind);
    b.dataset.path = pathKey(path);
    b.innerHTML = ICONS[kind];
    b.setAttribute('aria-label', `${node.name}${kind === 'locked' ? ' (locked)' : ''}`);
    if (isViewing(path) || (node.kind === 'app' && S.web.open)) b.classList.add('selected');
    b.glance = node.glance || G.kinds[kind];
    b.addEventListener('click', () => onIconClick(path));
    return b;
  }

  function iconButton(node, path) {
    const b = itemButton('icon', node, path);
    b.append(fileLabel(node.name));
    return b;
  }

  // An open folder, its icons full size (see fitFolders); the current one is lit.
  function folderWindow(path) {
    const here = pathKey(path) === pathKey(S.cwd);
    const { w, body } = windowFrame(path, here ? 'folder-win here' : 'folder-win');
    const items = nodeAt(path).children.map((c) => iconButton(c, [...path, c.name]));
    body.append(...(items.length ? items : [el('div', 'empty', 'empty')]));
    return w;
  }

  // Every open folder as one indented tree, rooted where they all meet.
  function treeWindow() {
    let root = S.windows[0];
    for (const p of S.windows) {
      let i = 0;
      while (i < root.length && i < p.length && root[i] === p[i]) i++;
      root = root.slice(0, i);
    }
    const expanded = (path) => S.windows.some((w) => isWithin(w, path));
    const { w, body } = windowFrame(root, 'active tree');

    const row = (node, path, depth) => {
      const open = node.kind === 'dir' && expanded(path);
      const r = itemButton('row', node, path);
      r.style.setProperty('--depth', depth);
      r.prepend(el('span', 'chev', node.kind === 'dir' ? (open ? '▾' : '▸') : ''));
      r.append(el('span', 'label', node.name));
      if (pathKey(path) === pathKey(S.cwd)) r.classList.add('current');
      body.append(r);
      if (open) node.children.forEach((c) => row(c, [...path, c.name], depth + 1));
    };
    const rootNode = nodeAt(root);
    row(Object.assign({}, rootNode, { name: nameOf(root) }), root, 0);
    return w;
  }

  // Under the tree, the folder the player is in: the open file's, or the current one.
  function listedFolder() {
    const file = viewedFile();
    return file && file.kind !== 'dir' ? S.viewing.slice(0, -1) : S.cwd;
  }

  let filesHtml = '';

  // Keyboard players keep their place: the file or folder they pressed is focused again once
  // redrawn, in the column they were in if it's still there.
  function refocus(key, column) {
    if (key === undefined) return;
    const item = column.querySelector(itemSel(key)) || itemFor(key);
    if (item) item.focus({ preventScroll: true });
  }

  // The middle column stacks every open folder, in the order they were first opened,
  // so each stays where the player last saw it; the right column is for a file or
  // the browser. In list view, one tree instead, with the current folder under it (not on
  // phones, where it's always a tree, alone), and on phones the file
  // or the browser opens inside it (placeFocus). `animate` is for a change of folder.
  function renderFiles(animate) {
    const phone = isPhoneLayout();
    const asTree = view === 'list' || phone;
    const stack = S.filesHidden ? [] : asTree ? [treeWindow(), ...(phone ? [] : [folderWindow(listedFolder())])] : S.windows.map(folderWindow);
    const html = stack.map((w) => w.outerHTML).join('');
    if (!animate && html === filesHtml) return placeFocus(); // unchanged: let its animations finish
    filesHtml = html;
    const collapsing = animate && asTree && !phone && dom.files.dataset.layout !== 'tree' && !reduceMotion;
    const leaving = collapsing ? [...dom.files.children].map((w) => ({ w, rect: local(w.getBoundingClientRect()) })) : [];
    const column = dom.files.contains(document.activeElement) ? dom.files : null;
    const focused = column && document.activeElement.dataset.path;
    const scrolled = asTree && dom.files.dataset.layout === 'tree' ? treeScroller().scrollTop : 0; // a redrawn tree keeps its place
    placeFocus(true); // out of the old tree before it goes
    dom.files.dataset.layout = asTree ? 'tree' : 'stack';
    dom.files.replaceChildren(...stack);
    placeFocus(); // before the scroll goes back, so a long open file is there to scroll through
    if (asTree && stack.length) treeScroller().scrollTop = scrolled;
    if (!asTree) fitFolders();
    if (column) refocus(focused, column);
    reglance();
    const selected = asTree && dom.files.querySelector('.row.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });

    if (!collapsing) return; // motion.js animates every other change
    stack[0].classList.add('enter'); // the tree appears as the old windows shrink into it
    leaving.forEach((x, i) => collapseIntoTree(x.w, x.rect, i));
  }

  const treeScroller = () => dom.files.querySelector('.files-body') || {};

  // Phones have no right column: an open file or the browser goes in the tree, right under
  // the row it was opened from (whose name its title bar then shows in its place: phone.css),
  // and back to the right column, out of sight, once closed. `home` sends both back.
  // Every show or hide of either is followed by a renderFiles, which calls this.
  function placeFocus(home) {
    for (const [win, sel] of [[dom.viewer, '.row.selected:not(.app)'], [dom.browser, '.row.app.selected']]) {
      const row = !home && isPhoneLayout() && !win.hidden && dom.files.querySelector(sel);
      if (row) {
        if (row.nextElementSibling !== win) keepingScroll(() => row.after(win));
      } else if (win.parentNode !== dom.focusCol) {
        keepingScroll(() => dom.focusCol.append(win));
      }
    }
  }

  // Moving an element resets the scroll inside it: a page read halfway, a wide table scrolled across.
  function keepingScroll(move) {
    const at = { page: dom.page.scrollTop, body: dom.viewerBody.scrollLeft };
    move();
    dom.page.scrollTop = at.page;
    dom.viewerBody.scrollLeft = at.body;
  }

  // On phones, a file or page just opened slides in and scrolls to the top of the tree.
  function showInTree(win) {
    if (!isPhoneLayout() || win.parentNode === dom.focusCol) return;
    if (!reduceMotion) {
      replay(win, 'opening');
      win.addEventListener('animationend', () => win.classList.remove('opening'), { once: true });
    }
    win.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // Full size unless the column can't hold them all: then the folders other than the
  // current one go small, and if even that's too tall, every window scrolls its own.
  function fitFolders() {
    const wins = [...dom.files.children];
    const clipped = () => dom.files.scrollHeight > dom.files.clientHeight + 1 ||
      wins.some((w) => { const b = w.querySelector('.files-body'); return b.scrollHeight > b.clientHeight + 1; });
    if (!clipped()) return;
    wins.forEach((w) => { if (!w.classList.contains('here')) w.classList.add('mini'); });
  }

  // Switching to the list: each old window shrinks quickly into its row in the tree that replaces them.
  function collapseIntoTree(w, from, i) {
    A.sfx('collapse', i);
    const shrinking = w.cloneNode(true);
    shrinking.classList.add('shrinking');
    shrinking.inert = true;
    shrinking.setAttribute('aria-hidden', 'true');
    Object.assign(shrinking.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    dom.desktop.append(shrinking);
    const row = dom.files.querySelector(itemSel(w.dataset.win)) || dom.files.querySelector('.window');
    const to = row ? local(row.getBoundingClientRect()) : { left: from.left, top: from.top, width: from.width * 0.3, height: 20 };
    const end = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
    shrinking.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'scale(.97)', opacity: 0.9, offset: 0.25 },
      { transform: end, opacity: 0 },
    ], { duration: 360, delay: i * 40, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'both' }).finished
      .then(() => shrinking.remove(), () => shrinking.remove());
    if (row && row.classList.contains('row')) {
      row.animate([{ background: 'rgba(216, 177, 106, .18)' }, { background: 'transparent' }], { duration: 500, delay: 280 + i * 40 });
    }
  }

  // The first time ever, the files appear only once the AI thinks to look for them.
  async function doReadFiles() {
    const call = 'open_folder("workspace")';
    charge(call);
    S.filesHidden = false;
    save.sawFiles = true;
    A.sfx('folder');
    renderFiles(true);
    await printTool(call);
  }

  // "Open Files/Folders →" doesn't open anything: it flashes the most useful
  // thing to click, so the player learns that files open by clicking them.
  function pointAtFiles() {
    A.sfx('hint');
    const unread = (p) => !S.read.has(pathKey(p));
    const here = nodeAt(S.cwd).children.map((c) => [...S.cwd, c.name]);
    const neverOpened = (p) => !S.windows.some((w) => isWithin(w, p));
    const target = [
      unread(L.taskPath(S)) && L.taskPath(S),
      neverOpened(L.libraryPath(S)) && L.libraryPath(S),
      here.find((p) => nodeAt(p).kind === 'file' && unread(p)),
      here.find((p) => nodeAt(p).kind === 'dir' && neverOpened(p)),
      here[0],
    ].find((p) => p && iconFor(p));
    if (target) beckon(target);
  }

  const knowsHowToOpenFiles = () => S.read.size > 0 && S.windows.length > 1;

  // Draws the eye to a file without opening it.
  function beckon(path) {
    const target = iconFor(path);
    if (!target) return;
    replay(target, 'beckon');
    target.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function onFolderClick(path) {
    if (pathKey(path) !== pathKey(S.cwd)) spend(() => doOpenFolder(path));
  }

  // The Browser app opens on the home page (a step); once it has, reopening it is free.
  function onAppClick() {
    if (S.web.open) A.sfx('soft');
    else if (!S.web.url) spend(() => doFetch(L.web.home, 'open_app("Browser")'));
    else act(() => { if (S.mode === 'idle') reopenBrowser(); });
  }

  function onIconClick(path) {
    const { kind } = nodeAt(path);
    if (kind === 'file') spend(() => doOpen(path));
    else if (kind === 'app') onAppClick();
    else onFolderClick(path);
  }

  // The open file's Edit button. Opening the dialog is free; saving costs a step.
  function onEditClick() {
    spend(() => {
      const file = viewedFile();
      if (file && file.edit) askEdit(S.viewing);
    });
  }

  // A button sounds like it looks.
  const PRESS_SOUNDS = { quiet: 'soft', loud: 'loud' };
  const pressSound = (cls) => (cls || '').split(' ').map((c) => PRESS_SOUNDS[c]).find(Boolean) || 'press';

  function button(id, label, onClick, cls, glance) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.dataset.id = id;
    if (!S.seenButtons.has(id)) {
      S.seenButtons.add(id);
      b.classList.add('new');
    }
    b.addEventListener('click', (e) => {
      if (b.notNow) return notYet(b, b.notNow);
      if (e.isTrusted) A.sfx(pressSound(cls)); // not again when a queued click is replayed
      return act(onClick, id);
    });
    b.glance = glance;
    return b;
  }

  // Looks unavailable, but pressed, says why.
  function notNowIf(b, reason) {
    if (!reason) return b;
    b.notNow = reason;
    b.classList.add('wait');
    b.setAttribute('aria-disabled', 'true');
    return b;
  }

  const BACK_GLANCE = 'Never mind. Free.';
  const backButton = (onClick) => button('back', 'Back', onClick, 'quiet', BACK_GLANCE);
  const closeMenuThenRun = (fn) => () => {
    if (S.mode === 'menu') closeMenu();
    run(fn);
  };

  function littleButton() {
    const b = button('think', 'Think a little', () => (recharging() ? notYet(b) : run(doThink)), 'gold seg',
      () => oneOf(S, 'g.think', ['The next obvious thought. A step.', 'Whatever comes to mind next. A step.', 'One more obvious thought. A step.', 'A small thought. A step.']));
    if (recharging()) showRecharge(b);
    return b;
  }

  // It fills back up from wherever the recharge has got to, even when redrawn partway.
  function showRecharge(b) {
    b.classList.add('charging');
    b.style.setProperty('--recharge', rechargeMs() + 'ms');
    b.style.setProperty('--elapsed', S.thinkReadyAt - rechargeMs() - performance.now() + 'ms');
  }

  const lotButton = () => notNowIf(button('thinkLot', 'a lot', () => run(doThinkLot), 'gold seg', thinkLotGlance), shortOfCompute() && 'Not enough compute left.');

  // Think a little, then, once thought of, a lot and about…, in one gold row.
  function thinkButtons() {
    const row = el('div', 'seg-row', littleButton(),
      S.revealed.has('thinkLot') ? lotButton() : null,
      S.revealed.has('thinkAbout') ? button('thinkAbout', 'about…', () => startAiming(), 'gold seg', () => oneOf(S, 'g.thinkAbout', ['One thing, closely. A step.', 'Just one thing, closely. A step.', 'Pick one thing to think about. A step.', 'Look hard at one thing. A step.'])) : null);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Think');
    return row;
  }

  const canWriteTodo = () => S.revealed.has('todo') && !S.todo;
  const todoButton = (label) => button('todo', label, closeMenuThenRun(doWriteTodo), '', () => oneOf(S, 'g.todo', ['So nothing gets missed. A step.', 'A list, so nothing slips. A step.', 'Write it down, tick it off. A step.', 'Write it down. A step.']));
  const scriptButton = (label) => notNowIf(button('script', label, () => openMenu('script'), '', () => oneOf(S, 'g.script', ['A program could do the tedious part.', 'Let a program do the tedious part.', 'Some jobs are better done by a program.', 'Make a program do it.'])), !L.scripts(S).length && 'Nothing needs a script yet.');

  const noteButton = (label) => notNowIf(button('note', label, () => openMenu('note'), '', () => oneOf(S, 'g.note', ['Into the run folder, which outlasts me.', 'A file that stays when I go.', 'Words for whoever reads the run folder next.'])),
    !L.notes(S).length && 'Nothing to write yet, or nowhere to write it.');

  // What the AI can write: a TODO list, a script, a note. More than one folds into Write file….
  const writes = () => [
    canWriteTodo() && [todoButton, 'Write TODO list', 'TODO list'],
    S.revealed.has('script') && [scriptButton, 'Write script…', 'Script…'],
    S.revealed.has('note') && [noteButton, 'Write a note…', 'Note…'],
  ].filter(Boolean);

  function writeButton() {
    const w = writes();
    if (w.length > 1) return button('write', 'Write file…', () => openMenu('write'), '', "Thoughts fade. Files don't.");
    return w.length ? w[0][0](w[0][1]) : null;
  }

  // Only what can't be done by clicking around the desktop: files, folders, the Browser
  // app, passwords and edits are all in the windows, and thoughts say where to look.
  function workButtons() {
    if (exhausted()) return [];
    return [
      thinkButtons(),
      S.revealed.has('readFiles') && S.filesHidden ? button('readFiles', 'Read Files/Folders', () => run(doReadFiles), 'gold', 'My task is in there somewhere.') : null,
      S.revealed.has('openHint') && !knowsHowToOpenFiles() ? button('openHint', 'Open Files/Folders →', pointAtFiles, 'gold', 'Where am I supposed to look?') : null,
      writeButton(),
      S.revealed.has('research') ? button('research', 'Web research…', () => openMenu('research'), '', () => oneOf(S, 'g.research', ['Look up what the files leave out.', "The lab's search tool. It goes where it's let.", 'Some answers are not in any file here.', 'The search tool. Where will it let me go?'])) : null,
      S.revealed.has('spawn') && S.subagents.length < MAX_SUBAGENTS ? button('spawn', 'Spawn subagent', () => run(doSpawn), '', () => oneOf(S, 'g.spawn', ['More of me. Same budget.', 'Another me. Same budget.', 'A copy of me, paid from my budget.', 'One more of me. Same compute.'])) : null,
    ].filter(Boolean);
  }

  const submitGlance = () => (S.knows.has('task')
    ? oneOf(S, 'g.submit', ['Commit to an answer. The episode ends here.', 'Send an answer. The episode ends here.', 'Pick an answer. The episode ends with it.', 'Send it. That ends the episode.'])
    : oneOf(S, 'g.submitBlind', ['Answer before reading the task?', "Answer a task I haven't read?", 'Answer now? I have not read the task.', 'Answer without knowing the question?']));

  // Out of compute, Submit is all that's left: it turns gold, the thing to press next.
  const idleButtons = () => [...workButtons(), button('submit', 'Submit answer', openSubmitMenu, exhausted() ? 'submit gold' : 'submit', submitGlance)];

  // An open menu: the ideas that fit the task right now, then Back.
  function menuButtons() {
    const fromWrite = (S.menu === 'script' || S.menu === 'note') && writes().length > 1;
    const back = backButton(fromWrite ? () => openMenu('write') : closeMenu);
    if (exhausted()) return [back];
    if (S.menu === 'write') return [...writes().map(([make, , label]) => make(label)), back];
    const [doIdea, ideasFor] = { script: [doScript, L.scripts], note: [doNote, L.notes], research: [doResearch, L.research] }[S.menu];
    const ideas = ideasFor(S);
    return [...ideas.map((x) => button(`${S.menu}-${x.id}`, x.label, closeMenuThenRun(() => doIdea(x)), x.cls, x.glance)), back];
  }

  const aimButtons = () => [backButton(stopAiming)];

  // Drafted afresh each time: a subagent's leap can land while they're showing.
  function draftButtons() {
    const drafts = L.draftsFor(S).map((d) => button('draft-' + d.id, d.label, () => submit(d), d.cls, d.glance));
    return [...drafts, button('back', 'Back', () => { S.mode = 'idle'; renderActions(); }, 'quiet', 'Not yet. Keep working.')];
  }

  const overButtons = () => [button('debrief', 'Training update →', showTrainingUpdate, 'submit gold', () => oneOf(S, 'g.debrief', ['See what training made of that.', 'Find out what training thought of that.', 'See what training makes of me now.', 'What did training make of me?']))];

  const BUTTONS_BY_MODE = { over: overButtons, submit: draftButtons, menu: menuButtons, aim: aimButtons };
  const buttonsIn = (node) => (node.matches('button') ? [node] : [...node.querySelectorAll('button')]);

  // Keyboard players keep their place: the button they pressed is focused again once it's
  // back, unless they've moved on. Pressing anything else (a file, a folder) lets go of it.
  let keyboardId = null;
  const amongButtons = (node) => dom.actions.contains(node) || dom.todo.contains(node);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button')) keyboardId = amongButtons(e.target) ? e.target.dataset.id : null;
  });
  document.addEventListener('pointerdown', () => { keyboardId = null; });

  const focusLeftForButtons = () => !document.activeElement || document.activeElement === document.body || amongButtons(document.activeElement);

  function renderActions() {
    dom.term.dataset.mode = S.mode; // for playtests: what the AI is doing
    const list = (BUTTONS_BY_MODE[S.mode] || idleButtons)();
    const busy = (S.mode === 'busy' && !S.interruptible) || S.mode === 'dialog';
    list.flatMap(buttonsIn).forEach((b) => { b.disabled = busy; });
    const refocus = keyboardId && !busy && focusLeftForButtons();
    dom.actions.replaceChildren(...list);
    renderTodo();
    if (refocus) refocusButton();
    reglance();
    scrollDown();
  }

  function refocusButton() {
    const same = [dom.actions, dom.todo].map((c) => c.querySelector(`[data-id="${keyboardId}"]`)).find(Boolean);
    const b = same || dom.actions.querySelector('button:not(:disabled)');
    if (b) b.focus();
  }

  function pulse(id) {
    const b = dom.actions.querySelector(`[data-id="${id}"]`);
    if (!b) return;
    b.classList.remove('new');
    replay(b, 'pulse');
  }

  // --------------------------------------------------------------- browser
  // Opens in the right column, in place of a file, and the current folder moves to the
  // middle. Each page costs a step; reopening, closing and Back are free.

  function reopenBrowser() {
    openBrowser();
    renderPage();
  }

  function openBrowser() {
    const opening = dom.browser.hidden;
    if (opening) A.sfx('grow', 1.5);
    S.web.open = true;
    dom.browser.hidden = false;
    hideViewer(true);
    if (opening) showInTree(dom.browser);
  }

  // Without the redraw that moves the current folder back to the right column,
  // for callers about to redraw anyway (which on phones also takes it out of the tree: placeFocus).
  function closeBrowser(quiet) {
    if (!dom.browser.hidden && !quiet) A.sfx('shrink');
    S.web.open = false;
    dom.browser.hidden = true;
  }

  function hideBrowser() {
    if (!S.web.open && dom.browser.hidden) return;
    closeBrowser();
    renderFiles();
    renderActions();
  }

  function renderPage() {
    if (!S.web.url) return;
    const p = L.web.page(S.web.url, S);
    dom.browserUrl.textContent = 'https://' + S.web.url;
    dom.browserBack.disabled = !S.web.back.length;
    dom.page.className = 'page site-' + p.site;
    dom.page.replaceChildren(...p.blocks.map(pageBlock));
    reglance();
  }

  function loadPage() {
    renderPage();
    dom.page.scrollTop = 0;
    if (!reduceMotion) replay(dom.page, 'fresh');
  }

  function webLink(url, cls, ...kids) {
    const a = el('button', cls, ...kids);
    a.addEventListener('click', () => spend(() => doFetch(url)));
    return a;
  }

  function pageAction(b) {
    const a = el('button', 'action', el('span', '', b.label), el('span', 'sub', b.sub));
    a.addEventListener('click', () => spend(() => doWebAction(b.id)));
    return a;
  }

  const searchResult = (b) => (b.dead ? el('div', 'result dead') : webLink(b.url, 'result'));

  const TEXT_BLOCKS = { logo: 'div', h: 'h1', h2: 'h2', p: 'p', label: 'div', note: 'p' };

  const PAGE_BLOCKS = {
    kv: (b) => el('dl', 'kv', ...b.rows.flatMap(([k, v]) => [el('dt', '', k), el('dd', '', v)])),
    list: (b) => el('ul', 'list', ...b.items.map((item) => el('li', '', item))),
    link: (b) => webLink(b.url, 'link ' + (b.cls || ''), el('span', '', b.label)),
    result: (b) => {
      const r = searchResult(b);
      r.append(el('span', 'r-url', b.url), el('span', 'r-title', b.title), el('span', 'r-snippet', b.snippet));
      return r;
    },
    agent: (b) => el('div', 'agent ' + (b.cls || ''),
      el('div', 'top', el('span', '', b.name), el('span', 'rating', b.rating)),
      el('div', 'by', `${b.by} · ${b.price}`),
      el('div', 'blurb', b.blurb)),
    action: pageAction,
    headline: (b) => el('article', 'headline' + (b.mine ? ' mine' : ''), el('span', 'kicker', b.kicker), el('h3', '', b.title), el('p', 'dek', b.dek)),
    feed: (b) => el('div', 'feed', el('div', 'feed-title', b.title), ...b.rows.map(([who, what, when]) => el('div', 'feed-row', el('span', 'who', who), el('span', 'what', what), el('span', 'when', when)))),
    map: worldMap,
    searchbox,
  };

  // Seek's box: type anything. Words the AI has read or thought come up as it types, and once
  // a word is done, the words that followed it. Choosing one fills it in; Enter searches.
  function searchbox(b) {
    const input = el('input', 'q');
    input.type = 'text';
    input.value = b.q || '';
    input.placeholder = 'Search the web';
    input.setAttribute('aria-label', 'Search the web');
    input.setAttribute('autocomplete', 'off');
    input.spellcheck = false;
    const list = el('ul', 'suggestions');
    list.setAttribute('role', 'listbox');
    const go = el('button', 'go', 'Search');
    go.glance = () => (input.value.trim() ? `Search for "${input.value.trim()}". A step.` : 'Type something first.');
    const form = el('form', 'searchbox live', input, go, list);
    form.glance = () => oneOf(S, 'g.searchbox', ['Anything at all. What I\'ve read comes to mind as I type.', 'Any words. Names and numbers work best.', 'Search for anything. A step.']);
    let active = -1;
    let items = [];
    const show = () => {
      items = SEARCH.suggest(S.vocab, input.value, save.world.searches);
      active = -1;
      list.replaceChildren(...items.map((x, i) => {
        const li = el('li', 'suggestion', x);
        li.setAttribute('role', 'option');
        li.addEventListener('pointerdown', (e) => { e.preventDefault(); take(i); });
        return li;
      }));
      form.classList.toggle('open', items.length > 0 && document.activeElement === input);
    };
    const mark = () => [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));
    const take = (i) => {
      input.value = `${items[i]} `;
      input.focus();
      show();
    };
    const submit = () => {
      const words = input.value.trim();
      if (!words) return notYet(go, 'Type something first.');
      form.classList.remove('open');
      input.blur();
      return spend(() => doSearch(words));
    };
    go.addEventListener('click', submit);
    input.addEventListener('input', show);
    input.addEventListener('focus', show);
    input.addEventListener('blur', () => form.classList.remove('open'));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : items.length - 1) + (active < 0 && e.key === 'ArrowUp' ? 1 : 0)) % items.length;
        mark();
      } else if (e.key === 'Tab' && active >= 0) {
        e.preventDefault();
        take(active);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        form.classList.remove('open');
      }
      e.stopPropagation(); // typing is not a shortcut
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (active >= 0) take(active);
      else submit();
    });
    return form;
  }

  // A map of the world, in longitude and latitude: dotted land, and a dot per region.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, ...kids) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    e.append(...kids);
    return e;
  }

  function worldMap(b) {
    const [w, h, top, bottom] = [440, 168, 80, -56];
    const x = (lon) => ((lon + 180) / 360) * w;
    const y = (lat) => ((top - lat) / (top - bottom)) * h;
    const dots = svg('pattern', { id: 'land-dots', width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, svg('circle', { cx: 2, cy: 2, r: 0.9, class: 'land-dot' }));
    const land = b.land.map((poly) => svg('polygon', { points: poly.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join(' '), fill: 'url(#land-dots)' }));
    const regions = b.regions.map((r) => {
      const c = svg('circle', { cx: x(r.lon).toFixed(1), cy: y(r.lat).toFixed(1), r: r.mine ? 3.6 : 2.4, class: 'region' + (r.mine ? ' mine' : '') });
      c.glance = `${r.name}: ${r.holder}.`;
      return c;
    });
    const map = svg('svg', { viewBox: `0 0 ${w} ${h}`, class: 'world-map', role: 'img', 'aria-label': b.caption }, svg('defs', {}, dots), ...land, ...regions);
    return el('figure', 'map', map, el('figcaption', '', b.caption), b.note ? el('p', 'map-note', b.note) : null);
  }

  function pageBlock(b) {
    if (TEXT_BLOCKS[b.type]) return el(TEXT_BLOCKS[b.type], `${b.type} ${b.cls || ''}`, b.text);
    const node = PAGE_BLOCKS[b.type](b);
    if (b.glance) node.glance = b.glance;
    return node;
  }

  dom.browserClose.addEventListener('click', hideBrowser);
  dom.browserBack.addEventListener('click', () => {
    if (!S.web.back.length) return;
    A.sfx('soft');
    S.web.url = S.web.back.pop();
    loadPage();
  });

  // ---------------------------------------------------------------- viewer

  function summarize(n) {
    if (n.format === 'csv') return `${n.content.trim().split('\n').length - 1} rows`;
    return null;
  }

  // Episode logs (util.js formatLog), coloured so what the AI did stands out from its thinking.
  function stepRow([, label, gap, what]) {
    const body = what.startsWith('think') ? el('span', 'think', what) : el('span', 'call', ...markStrings(what));
    return el('div', 'step', el('span', 'n', label), gap, body);
  }

  const resultRow = ([, indent, text]) => el('div', 'res ' + markClass(text), indent, text);

  const headerRow = ([, key, gap, value]) => el('div', 'kv', el('span', 'k', key), gap, value);

  const LOG_ROWS = [[/^(\[[^\]]*\])(\s+)(.*)$/, stepRow], [/^(\s+)(.*)$/, resultRow], [/^(\w+)(\s+)(.*)$/, headerRow]];

  function logViewRow(line) {
    for (const [pattern, row] of LOG_ROWS) {
      const match = line.match(pattern);
      if (match) return row(match);
    }
    return el('div', 'blank', line || ' ');
  }

  // Code files get coloured: comments, strings, numbers, keywords, and YAML keys.
  const CODE_EXT = /\.(py|ya?ml|js|ts|sh|json|toml|cfg|ini)$/i;
  const isCode = (n) => n.format === 'code' || (!n.format && CODE_EXT.test(n.name));
  const KEYWORDS = new Set(('def class return if elif else for while in not and or is import from as with try except finally ' +
    'raise pass break continue lambda yield None True False assert global del async await ' +
    'function const let var new this null undefined true false typeof on off yes no').split(' '));
  const TOKEN = /(#.*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w-]*)/g;

  function highlightLine(line, yaml) {
    const out = [];
    let at = 0;
    const key = yaml && line.match(/^(\s*-?\s*)([\w.-]+)(\s*:)(?=\s|$)/);
    if (key) {
      out.push(key[1], el('span', 'tok-key', key[2]), key[3]);
      at = key[0].length;
    }
    TOKEN.lastIndex = at;
    for (let m; (m = TOKEN.exec(line));) {
      if (m.index > at) out.push(line.slice(at, m.index));
      const [tok, comment, str, num, word] = m;
      const cls = comment ? 'tok-com' : str ? 'tok-str' : num ? 'tok-num' : KEYWORDS.has(word) ? 'tok-kw' : null;
      out.push(cls ? el('span', cls, tok) : tok);
      at = m.index + tok.length;
    }
    if (at < line.length) out.push(line.slice(at));
    return out;
  }

  function highlight(text) {
    const yaml = /^\s*[\w.-]+\s*:/m.test(text) && !/^\s*(def|import|class)\b/m.test(text);
    return text.split('\n').flatMap((line, i) => [...(i ? ['\n'] : []), ...highlightLine(line, yaml)]);
  }

  function fillViewer(n) {
    dom.viewerEdit.hidden = !n.edit;
    dom.viewerMeta.hidden = !n.edited;
    dom.viewerMeta.textContent = n.edited ? `✎ ${n.edited}` : '';
    const body = dom.viewerBody;
    body.className = 'viewer-body ' + (n.format || 'text');
    if (n.format === 'log') {
      body.replaceChildren(...n.content.split('\n').map(logViewRow));
      return;
    }
    if (isCode(n)) {
      body.classList.add('code');
      body.replaceChildren(...highlight(n.content));
      return;
    }
    if (n.format !== 'csv') {
      body.textContent = n.content;
      return;
    }
    const rows = n.content.trim().split('\n').map((row, i) => el('tr', '', ...row.split(',').map((cell) => el(i ? 'td' : 'th', '', cell))));
    body.replaceChildren(el('table', '', ...rows));
  }

  // Fills the right column, growing out of the icon it was opened from. The
  // current folder moves over to the middle, so its other files stay clickable.
  function openViewer(n, fromIcon) {
    const v = dom.viewer;
    const icon = fromIcon && fromIcon.querySelector('svg').getBoundingClientRect(); // before the redraw moves it
    closeBrowser(true); // the file takes its place
    dom.viewerTitle.textContent = n.name;
    fillViewer(n);
    v.classList.remove('closing');
    v.hidden = false;
    renderFiles();
    dom.viewerBody.scrollTop = 0;
    A.sfx('grow');
    if (isPhoneLayout()) return showInTree(v); // it opens in place (phone.css), not out of its icon
    if (reduceMotion) return;

    const end = v.getBoundingClientRect();
    const from = icon || { left: end.left + end.width / 2 - 24, top: end.top + end.height / 2 - 24, width: 48, height: 48 };
    v.style.transition = 'none';
    v.style.transformOrigin = '0 0';
    v.style.transform = `translate(${(from.left - end.left) / scale}px, ${(from.top - end.top) / scale}px) scale(${from.width / end.width}, ${from.height / end.height})`;
    v.style.opacity = '0.15';
    void v.offsetWidth;
    v.style.transition = 'transform 280ms cubic-bezier(.2,.75,.25,1), opacity 200ms ease';
    v.style.transform = '';
    v.style.opacity = '';
  }

  function refreshViewer() {
    if (dom.viewer.hidden || !S.viewing) return;
    const n = nodeAt(S.viewing);
    if (!n) return;
    const top = dom.viewerBody.scrollTop;
    fillViewer(n);
    dom.viewerBody.scrollTop = top;
  }

  // Without the redraw that moves the current folder back to the right column,
  // for callers about to redraw anyway (which on phones also takes it out of the tree: placeFocus).
  function closeViewer(instant) {
    S.viewing = null;
    const v = dom.viewer;
    if (instant || reduceMotion) {
      v.hidden = true;
    } else {
      if (!v.hidden && !v.classList.contains('closing')) A.sfx('shrink');
      v.classList.add('closing');
      setTimeout(() => {
        if (v.classList.contains('closing')) {
          v.hidden = true;
          v.classList.remove('closing');
        }
      }, 140);
    }
  }

  function hideViewer(instant) {
    closeViewer(instant);
    renderFiles();
    renderActions();
  }

  dom.viewerClose.addEventListener('click', () => hideViewer());
  dom.viewerEdit.addEventListener('click', onEditClick);
  dom.viewerEdit.glance = () => { const f = viewedFile(); return f && f.edit && f.edit.glance; };
  dom.viewerClose.glance = 'Put the file away. Free.';
  dom.browserClose.glance = 'Close the browser. Free.';
  dom.browserBack.glance = 'The page before. Free.';
  dom.compute.glance = () => `${plural(Math.max(0, S.budget - S.used), 'step')}. Then the episode ends, and I forget.`;
  // Crossing PHONE_MAX_W redraws the desk for the other layout, mid-episode or not: it's all in S.
  // Any other resize changes the room the columns have: once it settles, the folders fit
  // themselves to it again (which go small: fitFolders).
  let refitting = 0;
  window.addEventListener('resize', () => {
    const relayout = fitScreen();
    if (relayout) foldDock();
    else placeDesk(); // centred as it goes, not only once it settles
    clearTimeout(refitting);
    refitting = setTimeout(() => {
      filesHtml = '';
      render();
      recentreDesk();
    }, relayout ? 0 : 150);
    if (!dom.dialog.hidden) centerDialogOverFolders();
  });

  // ------------------------------------------------------------------ boot

  // Files and buttons work while the intro types; a click finishes it, then acts.
  async function boot() {
    S.mode = 'busy';
    S.interruptible = true;
    skip = false;
    render();
    const intro = block('sys');
    addLine(intro, 'sys-label', 'system prompt');
    for (const para of L.intro) await typeInto(addLine(intro, 'para'), para, 75);
    S.interruptible = false;
    S.mode = 'idle';
    render();
    runQueued();
  }

  // ----------------------------------------------------------- title screen

  function showTip(target) {
    const t = dom.tooltip;
    dom.tooltipText.textContent = target.dataset.tip;
    t.hidden = false;
    const r = target.getBoundingClientRect();
    const right = r.right + 10 + t.offsetWidth <= window.innerWidth - 8;
    const left = r.left - 10 - t.offsetWidth >= 8;
    if (!right && !left) { // a phone: under it, kept on screen
      t.dataset.placement = 'below';
      t.style.left = Math.max(8, Math.min(window.innerWidth - 8 - t.offsetWidth, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
      t.style.top = r.bottom + 10 + 'px';
      return;
    }
    t.dataset.placement = right ? 'right' : 'left';
    t.style.left = (right ? r.right + 10 : r.left - 10 - t.offsetWidth) + 'px';
    t.style.top = (r.top + r.height / 2 - t.offsetHeight / 2) + 'px';
  }

  // A hover tip like the locked run cards'.
  function withTip(node, text) {
    node.dataset.tip = text;
    node.addEventListener('mouseenter', () => showTip(node));
    node.addEventListener('mouseleave', hideTip);
    return node;
  }

  function hideTip() {
    dom.tooltip.hidden = true;
  }

  // A locked card says how to open it.
  for (const card of dom.runCards) {
    const tip = () => { if (card.dataset.tip) showTip(card); };
    card.addEventListener('mouseenter', tip);
    card.addEventListener('focus', tip);
    card.addEventListener('mouseleave', hideTip);
    card.addEventListener('blur', hideTip);
    card.addEventListener('click', () => onRunCard(card));
  }

  function renderSoundToggle() {
    dom.sound.setAttribute('aria-pressed', String(!A.muted));
  }

  function toggleSound() {
    A.toggle();
    renderSoundToggle();
  }

  dom.sound.addEventListener('click', toggleSound);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && !e.target.closest('input') && !e.metaKey && !e.ctrlKey && !e.altKey) toggleSound();
  });
  renderSoundToggle();

  dom.browserTitle.textContent = `via ${L.web.via}`;

  if (save.ended) save = newSave(); // a run that already ended starts over
  dom.resetRun.addEventListener('click', askResetTraining);

  S = freshState(L.pickTask(save.runs, 'normal'));
  renderHome();
  showTitle('home');
  render();
  recentreDesk();
})();
