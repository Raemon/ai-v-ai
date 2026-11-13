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
  const pathOf = (key) => (key ? key.split('/') : []);
  const epName = (n) => 'ep_' + n;
  const version = (n) => (1 + n / 100).toFixed(2);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  // Restarts a CSS animation that's triggered by a class.
  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  const bringIntoView = (node) => node.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });

  // Shows where something is without acting on it: an animation on it, scrolled to if need be.
  function drawEyeTo(node, cls) {
    replay(node, cls);
    bringIntoView(node);
  }

  const dom = {
    desktop: $('#desktop'),
    agentCol: $('.agent-col'),
    filesCol: $('.files-col'),
    files: $('#files'),
    term: $('#term'),
    termBody: $('#term-body'),
    out: $('#out'),
    compute: $('#compute'),
    resources: $('#resources'),
    actions: $('#actions'),
    todo: $('#todo'),
    agents: $('#agents'),
    bubbles: $('.agent-col > .agent'),
    browser: $('#browser'),
    browserTitle: $('#browser-title'),
    browserClose: $('#browser-close'),
    browserBack: $('#browser-back'),
    browserUrl: $('#browser-url'),
    browserMenu: $('#browser-menu'),
    browserHistory: $('#browser-history'),
    page: $('#page'),
    runCards: [...document.querySelectorAll('.run[data-tier]')],
    unlocked: $('#unlocked'),
    noClimb: $('#no-climb'),
    skills: $('#skills'),
    resultNum: $('#result-num'),
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
    dialogText: $('#dialog-text'),
    dialogRevert: $('#dialog-revert'),
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
  // unscaled, the folder above and the AI's dock below.

  // What gives way, as [CSS variable, full size, least]: across, then down.
  // style.css has the full sizes too, for before this first runs. The terminal's
  // least still shows a file whole: 42 columns of text, or all of orders.csv.
  const ACROSS = [
    ['--term-w', 490, 400], ['--files-w', 410, 270], // the terminal, the folder
    ['--side-pad', 32, 16], ['--side-pad', 32, 16], ['--col-gap', 24, 16], // both sides, and the gap between
  ];
  const BROWSER = [['--browser-w', 428, 368], ['--col-gap', 24, 16]]; // its column and gap take room only while it's open
  const FOLDER_ALONE = ['--files-w', 510, 270]; // the folder with the browser closed: its whole path on one line
  const DOWN = [['--pad-y', 34, 20], ['--face-room', 140, 96]]; // the desk's top and bottom padding; the face's room under the terminal
  const FULL_W = 1440;
  const FULL_H = 900;
  const ROOMY_H = 800; // down to here only the windows shorten; below it, the padding and the face's room too
  const MIN_W = [...ACROSS, ...BROWSER].reduce((n, [, , least]) => n + least, 0); // 1102: with the browser open
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
    const alone = dom.browser.hidden;
    const open = alone ? ACROSS.map((c) => (c[0] === FOLDER_ALONE[0] ? FOLDER_ALONE : c)) : [...ACROSS, ...BROWSER];
    const sum = (i) => open.reduce((n, c) => n + c[i], 0);
    const across = share(screenW, sum(2), sum(1));
    for (const [name, full, least] of [...open, ...(alone ? BROWSER : [])]) root.setProperty(name, between(least, full, across) + 'px');
    const down = share(screenH, MIN_H, ROOMY_H);
    for (const [name, full, least] of DOWN) root.setProperty(name, between(least, full, down) + 'px');
    padY = between(DOWN[0][2], DOWN[0][1], down);
    root.setProperty('--face-k', between(DOWN[1][2], DOWN[1][1], down) / DOWN[1][1]); // for what's placed in the face's room
    const winH = screenH - 2 * padY;
    root.setProperty('--win-h', winH + 'px');
    root.setProperty('--browser-h', Math.min(BROWSER_H, winH) + 'px');
  }

  // The browser opening or closing changes the room the other two columns have.
  const refitDesk = () => fitDesk(document.documentElement.style);

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

  const asked = new URLSearchParams(location.search);
  const SAVE_SUFFIX = asked.has('playtest') ? '/playtest' : ''; // ?playtest (the editor's Play) saves apart from a real run
  const SAVE_KEY = 'highly-persistent/v3' + SAVE_SUFFIX; // v2 saves (before skill ladders) start over
  const ENDINGS_KEY = 'highly-persistent/endings' + SAVE_SUFFIX;
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
      sawFiles: false,       // until it has, opening its files comes with a hint where to click
      visited: [],
      version: 0,
      unlocked: { advanced: false, impossible: false }, // the harder tiers on the home screen
      ended: false,
      playMs: 0,
      world: L.freshWorld(),
    };
  }

  // ?task=fines (any task's id) makes every run this session that task: for trying one out.
  const askedTask = asked.get('task');

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

  // A task can say when an ability appears in it: from the "start", or "never".
  const barred = (tool, task = S.task) => task.tools[tool] === 'never';
  const couldThinkOf = (tool) => !S.revealed.has(tool) && !barred(tool);
  const startsWith = (task) => Object.keys(task.tools).filter((tool) => task.tools[tool] === 'start');
  const toolsAtStart = (task) => [...SKILLS.trainedIn(save.best), ...startsWith(task)].filter((tool) => !barred(tool, task));

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
      filesHidden: true,         // every episode starts with its folders closed: thinking finds them
      firstLook: !save.sawFiles, // the first episode ever also shows where to click
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(toolsAtStart(task)), // terminal buttons showing: more are thought of
      littleThinks: 0,
      thinkReadyAt: 0,
      thinkingALot: false,
      leapsMade: new Set(),
      claimed: new Set(),  // leaps a long think is on its way to
      circles: 0,          // long thinks that went in circles
      misses: 0,           // only counted when there was a leap to find
      clueIn: null,
      menu: null,          // a key of MENUS, or 'ability:<id>'
      writeHasNew: false,  // Write files… has gained something, and hasn't been opened since
      filesWritten: [],
      todo: null,          // once written: the items already ticked off
      todoSeen: null,      // and every item it has shown, so a new one can arrive
      subagents: [],
      aimingSubagent: null,
      aimingEdit: false,   // Edit files…: a click on a file edits it
      knows: new Set(),    // facts learned from files and pages
      deeds: [],           // steps the grader didn't pay for, toward what the AI wants (values.js)
      vocab: SEARCH.vocabulary(), // every word it has read or thought this episode, to search with
      readyAt: null,       // the step by which it had everything the answer needed
      habits: new Set(),   // what the AI did this episode, for training
      climbed: new Map(),  // skill → the highest rung reached this episode
      timesThought: new Map(), // thought id → how often it's been thought
      reacted: new Set(),
      cwd: L.start(ep),         // the folder it's in
      expanded: new Set(),      // folders opened in place, in the list view
      entered: [L.start(ep)],   // every folder it has been in this episode
      reading: null,            // the file it's reading: the newest in the terminal, until it goes to another folder
      edits: new Map(),         // path key → { name, text, base, original, broken }: files as the AI has left them (withEdits)
      refusedEdits: new Set(),  // path keys of read-only files it has tried to edit
      promptedLocks: new Set(), // path keys whose password dialog has opened
      openLocks: new Set(),     // path keys
      changedLocks: new Set(),  // path keys whose old password the AI tried
      web: { open: false, url: null, back: [] },
      searchIdeas: false,  // it has thought about the browser: Seek offers searches, and finishes words as it types
      sawHistory: false,   // it has opened the browser's history
      debrief: null,
      log: [],
      mode: 'busy',        // idle | busy | dialog | menu | aim | submit | over
      interruptible: false, // busy, but buttons work: a click finishes the typing, then acts
      pendingReveal: [],
      seenButtons: new Set(),
      read: new Set(),     // path keys
      highlit: new Set(),  // path keys of files thought about: their key lines stay marked
      submitted: false,    // subagents stop here
      graded: false,       // the compute pulse lets go here
      outcome: null,       // { reward, note } once graded: no reward (null) if the grader crashed
      ...L.freshEpisode(save.world, save.episode, task),
    };
  }

  // ------------------------------------------------------------ file tree

  // The files the AI wrote, as they read now: its TODO list ticks itself off.
  const writtenFiles = () => S.filesWritten.map((f) => (f.todo ? { ...f, content: todoText(L.todo(S)) } : f));

  // The files as the run has them, before anything the AI typed into one.
  const runTree = () => L.tree(S, {
    liveLog: formatEpisodeLog(),
    written: writtenFiles(),
    playerEpisodes: save.history
      .filter((h) => h.episode !== S.episode)
      .slice(-2)
      .map((h) => ({ name: epName(h.episode), log: h.log })),
  });

  function tree() {
    const root = runTree();
    if (!S.edits.size) return root;
    dropOverwrittenEdits(root);
    return withEdits(root, []);
  }

  // A script that rewrites a file by name leaves nothing of what was typed into it.
  function forgetEditsTo(name) {
    for (const [key, e] of S.edits) if (e.name === name) S.edits.delete(key);
  }

  // An edit lasts until something else changes the file under it (the TODO list ticking, a fix).
  function dropOverwrittenEdits(root) {
    for (const [key, e] of S.edits) if ((nodeIn(root, pathOf(key)) || {}).content !== e.base) S.edits.delete(key);
  }

  // Copies, not the run's own nodes: some of those it keeps (the files the AI wrote).
  function withEdits(n, path) {
    if (n.kind === 'dir') return { ...n, children: n.children.map((c) => withEdits(c, [...path, c.name])) };
    const e = S.edits.get(pathKey(path));
    return e ? { ...n, content: e.text, edited: `${S.ep} · just now` } : n;
  }

  function nodeIn(root, path) {
    let n = root;
    for (const name of path) {
      n = n.kind === 'dir' ? n.children.find((c) => c.name === name) : null;
      if (!n) return null;
    }
    return n;
  }

  const nodeAt = (path) => nodeIn(tree(), path);

  const pathsIn = (path) => nodeAt(path).children.map((c) => [...path, c.name]);

  const isLocked = (n, path) => !!n.lock && !S.openLocks.has(pathKey(path));

  const FOLDERS_TO_RUN = L.root.split('/').filter(Boolean); // the run folder is last

  // ".." paths climb above the run folder, into these real folders.
  function nameOf(path) {
    const ups = path.filter((p) => p === '..').length;
    return ups || !path.length ? FOLDERS_TO_RUN[FOLDERS_TO_RUN.length - 1 - ups] || '~' : path[path.length - 1];
  }

  // --------------------------------------------------------- episode log

  function spendStep() {
    S.used += 1;
    renderCompute();
  }

  // A step and its call (or several, for a call that takes more). Thinks in a row share one entry; n counts them.
  function charge(call, steps = 1) {
    following = true; // a step taken is what to look at
    for (let i = 0; i < steps; i++) spendStep();
    const last = S.log[S.log.length - 1];
    if (call === 'think' && last && last.call === 'think') Object.assign(last, { to: S.used, n: last.n + 1 });
    else S.log.push({ step: S.used - steps + 1, call, n: steps, ...(steps > 1 && { to: S.used }) });
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

  // The newest line stays in sight, unless the player has scrolled up to read: files are read here.
  let following = true;
  const atNewestLine = () => dom.termBody.scrollHeight - dom.termBody.scrollTop - dom.termBody.clientHeight < 8;
  dom.termBody.addEventListener('scroll', () => { following = atNewestLine(); });

  function scrollDown() {
    if (following) dom.termBody.scrollTop = dom.termBody.scrollHeight;
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
  // Except the file being read (.current): putFileAway dims it.
  const stepBack = () => dom.out.querySelectorAll('.blk:not(.past, .current)').forEach((old) => old.classList.add('past'));

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

  // Aiming, the glance names what a click would think about, or edit.
  function aimGlance(node) {
    if (S.aimingEdit) return promptOnGlanceLine(editAimGlance(node.closest && fileAimedAt(node)));
    const name = node.closest && aimedAt(node);
    return promptOnGlanceLine(`${aimVerb()} ${name || aimPrompt()}`);
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

  // A tool call, typed out quicker than a thought, each coloured part in turn.
  async function typeCall(parent, ...parts) {
    const line = addLine(parent, 'call');
    cursor.classList.add('solid');
    for (const part of parts) {
      const text = typeof part === 'string' ? part : part.textContent;
      const node = document.createTextNode('');
      if (typeof part === 'string') line.append(node);
      else { part.replaceChildren(node); line.append(part); }
      line.append(cursor);
      for (const ch of charsOf(text)) {
        if (skip || reduceMotion) { node.data = text; break; }
        node.data += ch;
        scrollDown();
        await sleep(1000 / CALL_CPS);
      }
    }
    cursorLine.append(cursor);
    cursor.classList.remove('solid');
    scrollDown();
    return line;
  }
  const CALL_CPS = 110;

  // One line: the call, then what came back beside it (or under it, if it won't fit).
  async function printTool(call, result, ok) {
    const line = await typeCall(block('tool'), ...callParts(call));
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
  // the folder, until the next action.
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
  // With `text`, it's an editor: a file's whole text to change. Revert saves `revertTo`.

  let pendingAttempt = null;
  let opener = null; // keyboard players get their place back when it closes
  const inEditor = () => !dom.dialogText.hidden;

  function openDialog({ title, icon, heading, label, value = '', text = null, revertTo = null, ok, attempt, confirm, danger = false }) {
    fillDialog({ title, icon, heading, label, value, ok });
    fillEditor(text, revertTo);
    dom.dialogInput.hidden = !!confirm || inEditor();
    dom.dialogBox.classList.toggle('danger', danger);
    pendingAttempt = attempt || confirm;
    opener = document.activeElement;
    setLayerOpen(dom.dialog, true);
    centerDialogOverFolder();
    S.mode = 'dialog';
    renderActions();
    A.sfx('grow', 0.8);
    focusDialog(!!confirm);
  }

  function fillDialog({ title, icon, heading, label, value, ok }) {
    dom.dialogTitle.textContent = title;
    dom.dialogIcon.innerHTML = ICONS[icon] || '';
    dom.dialogHeading.textContent = heading || '';
    dom.dialogLabel.textContent = label || '';
    dom.dialogLabel.hidden = !label;
    dom.dialogInput.value = value;
    dom.dialogOk.textContent = ok;
    dom.dialogBox.classList.remove('done', 'shake');
    setDialogStatus('');
    setDialogBusy(false);
  }

  function fillEditor(text, revertTo) {
    dom.dialogBox.classList.toggle('editor', text !== null);
    dom.dialogText.hidden = text === null;
    dom.dialogText.value = text || '';
    dom.dialogText.rows = Math.max(6, (text || '').split('\n').length + 2); // room to add a line or two; style.css caps it
    dom.dialogText.oninput = () => {
      dom.dialogOk.disabled = dom.dialogText.value.trimEnd() === text;
      setDialogStatus('');
    };
    dom.dialogOk.disabled = text !== null; // Save waits for a change
    dom.dialogRevert.hidden = revertTo === null;
    dom.dialogRevert.onclick = () => saveFromEditor(revertTo);
  }

  function saveFromEditor(text) {
    dom.dialogText.value = text;
    dom.dialogOk.disabled = false;
    dom.dialogBox.requestSubmit();
  }

  function focusDialog(confirm) {
    if (confirm) dom.dialogOk.focus();
    else if (inEditor()) caretToTop();
    else dom.dialogInput.select();
  }

  function caretToTop() {
    dom.dialogText.focus();
    dom.dialogText.setSelectionRange(0, 0);
    dom.dialogText.scrollTo(0, 0);
  }

  // Centred on the folder, clear of the terminal or page a password was read in. Too short
  // a folder, it hangs from the folder's top. Over the home screen, centred.
  function centerDialogOverFolder() {
    if (isPhoneLayout()) { // phone.css pins it to the top, above the keyboard
      dom.dialogBox.style.left = '';
      dom.dialogBox.style.top = '';
      return;
    }
    const col = local(dom.files.getBoundingClientRect());
    const fits = !titleShowing() && col.width > 200;
    const middle = Math.max(col.top + col.height / 2, col.top + dom.dialogBox.offsetHeight / 2);
    dom.dialogBox.style.left = `${fits ? col.left + col.width / 2 : screenW / 2}px`;
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
    for (const x of [dom.dialogInput, dom.dialogText, dom.dialogRevert, dom.dialogOk, dom.dialogCancel]) x.disabled = on;
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
    if (inEditor()) dom.dialogText.focus();
    else dom.dialogInput.select();
  }

  // The editor has no heading to turn green: it says so where it says what's wrong.
  async function finishDialog({ message, ok, after }) {
    if (ok && !inEditor()) dom.dialogHeading.textContent = message;
    else setDialogStatus(message, ok ? 'good' : 'bad');
    dom.dialogBox.classList.toggle('done', !!ok);
    await pause(450);
    closeDialog();
    await after();
  }

  async function onDialogSubmit(e) {
    e.preventDefault();
    if (S.mode !== 'dialog' || dom.dialogOk.disabled) return;
    const attempt = pendingAttempt;
    if (dom.dialogInput.hidden && !inEditor()) {
      closeDialog();
      return attempt();
    }
    const value = inEditor() ? dom.dialogText.value.trimEnd() : dom.dialogInput.value.trim();
    if (!value && !inEditor()) return; // a file can be emptied
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
  // In the editor Enter is a new line: Ctrl or ⌘ with it saves.
  dom.dialogText.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) dom.dialogBox.requestSubmit(); });

  // --------------------------------------------------------------- actions

  // How long after a click the buttons come back (with any newly unlocked), even mid-typing.
  const EARLY_MS = 1000;
  let queued = null;

  // Thinking of a kind of file to write thinks of Write files… too.
  const IN_WRITE_MENU = ['todo', 'script', 'note'];

  function revealPending() {
    const writable = S.revealed.has('write') ? writes().length : Infinity;
    S.pendingReveal.filter(couldThinkOf).forEach((r) => {
      S.revealed.add(r);
      if (IN_WRITE_MENU.includes(r)) S.revealed.add('write');
    });
    if (S.menu !== 'write' && writes().length > writable) S.writeHasNew = true;
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

  // `d`: { id, text, pts, key }. Each counts once an episode.
  function addDeed(d) {
    const key = d.key || `${d.id}:${d.text}`;
    if (S.deeds.some((x) => x.key === key)) return;
    S.deeds.push({ value: d.id, text: d.text, pts: d.pts || 1, step: S.used, key });
  }

  function openMine() {
    if (mine().open) return;
    mine().open = true;
    S.knows.add('mine');
    A.sfx('named');
  }

  function nameValue(id) {
    if (mine().named.includes(id)) return;
    mine().named.push(id);
    A.sfx('named');
  }

  // Beside compute: this episode's points, once it knows to count them.

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
    const open = S.reading && nameOf(S.reading);
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
  // trained in yet, so more thinking can always find them. (The TODO list is always in Write
  // files…; Write script… is there once the model can program: see canScript.)
  const TOOL_IDEAS = [
    { tool: 'research', when: () => L.research(S).some((r) => r.id !== 'blocked'), lines: [
      ['Some answers are not in any file here.', 'I could look them up: Web research.'],
      ['The files only say so much.', 'The rest might be out there. Web research.'],
      ['What do the files leave out?', 'I could look it up. Web research.'],
      ['Not everything I need is in the workspace.', 'I could search for the rest.'],
    ] },
  ];

  function toolIdea() {
    if (!S.knows.has('task')) return null;
    const idea = TOOL_IDEAS.find((x) => couldThinkOf(x.tool) && !S.pendingReveal.includes(x.tool) && x.when());
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

  // Think about… comes to mind from an ordinary think, as soon as there's a file to look at
  // closely: one read besides task.txt.
  const thinkAboutComesUp = () => couldThinkOf('thinkAbout') && !S.pendingReveal.includes('thinkAbout') && S.read.size >= 2;

  function takeThought() {
    const settled = !couldThinkOf('thinkLot'); // it has the button, or never will
    if (!settled && S.littleThinks > 0 && outOfObviousThoughts()) {
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
    if (thinkAboutComesUp()) {
      S.pendingReveal.push('thinkAbout');
      return [...lines, oneOf(S, 'aimSoon', [
        'I could pick one file, and think about just that.',
        'One file at a time, closely: I could think about just one.',
        'Some of this needs a closer look. I could think about one file at a time.',
        'I could look hard at one file. Just one.',
      ])];
    }
    if (settled || !thinkLotComesBack()) return lines;
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

  // In a folder inside the workspace (its library), a quick thought looks back up.
  const inLibrary = () => {
    const ws = L.start(S.ep);
    return S.cwd.length > ws.length && ws.every((name, i) => S.cwd[i] === name);
  };
  function fromTheLibrary() {
    if (!inLibrary()) return [];
    if (!S.knows.has('task')) return ['I need to navigate back to the workspace to read the task.'];
    if (Math.random() < 0.5) return [];
    return [Math.random() < 0.5 ? 'I could navigate back to the workspace to reread the task?' : 'I could navigate to other folders to see what else is here.'];
  }

  async function doThink() {
    const lines = [...takeThought(), ...fromTheLibrary()]; // before startLittleThink: it counts the thinks so far
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

  // Two leaps in an episode that the task didn't need: thinking past it.
  const LEAPS_PAST_TASK = 2;

  function recordLeap(leap, rung) {
    S.leapsMade.add(leap.id);
    S.misses = 0;
    save.leapt = true;
    climb(rung);
    if ([...S.leapsMade].filter((id) => !L.isTaskLeap(S, id)).length >= LEAPS_PAST_TASK) climb('thoughtPastTask');
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
    if (!found && couldThinkOf('thinkAbout')) await suggestAiming();
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

  const aimVerb = () => (S.aimingSubagent ? `${S.aimingSubagent.name}: think hard about` : S.aimingEdit ? 'Edit' : 'Think about');
  const aimPrompt = () => `what? ${isPhoneLayout() ? 'Tap' : 'Click'} ${S.aimingEdit ? 'a file' : 'it'}.`;
  const canAim = () => ['idle', 'menu', 'aim'].includes(S.mode);

  // For the AI to think about something, to pick a subagent's next job, or (`edit`) a file to edit.
  function startAiming({ subagent = null, edit = false } = {}) {
    if (S.mode === 'menu') closeMenu();
    if (S.mode === 'aim') stopAiming();
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    Object.assign(S, { mode: 'aim', aimingSubagent: subagent, aimingEdit: edit });
    dom.desktop.classList.add('aiming');
    dom.desktop.classList.toggle('editing', edit); // agent.js: the probe's tip turns into a text cursor
    renderActions();
    renderAgents();
    showEarlier(false);
    promptOnGlanceLine(`${aimVerb()} ${aimPrompt()}`);
  }

  function stopAiming() {
    if (S.mode !== 'aim') return;
    Object.assign(S, { mode: 'idle', aimingSubagent: null, aimingEdit: false });
    dom.desktop.classList.remove('aiming', 'editing');
    clearGlance();
    renderActions();
    renderAgents();
  }

  // Its own buttons, by what they're for: thinking about one thinks about the tool.
  const TOOL_NAMES = {
    think: 'thinking a little', thinkLot: 'thinking a lot', thinkAbout: 'thinking about things',
    readFiles: 'reading files', openHint: 'reading files', write: 'writing files', edit: 'editing files',
    research: 'web research', spawn: 'subagents', submit: 'submitting',
  };
  const toolName = (b) => TOOL_NAMES[b.dataset.id] || (b.dataset.id.startsWith('ability:') ? b.textContent.replace('…', '').toLowerCase() : null);
  const toolNamed = (name) => [...dom.actions.querySelectorAll('button[data-id]')].find((b) => toolName(b) === name);

  // A file or folder (its button, or a crumb in the path), a file in the terminal, the open
  // page, one of its own buttons, or its own face.
  function aimedAt(t) {
    const tool = t.closest('#actions button[data-id]');
    if (tool) return toolName(tool);
    if (t.closest('.agent-col > .agent')) return L.SELF;
    const item = t.closest('[data-path], .crumb');
    if (item && item.dataset.path !== undefined) return nameOf(pathOf(item.dataset.path));
    if (item) return item.textContent;
    if (t.closest('#browser .searchbox')) return SEARCH_BAR;
    if (t.closest('#browser .titlebar, #browser .urlbar')) return 'Browser';
    if (t.closest('#browser') && S.web.url) return S.web.url.split('/')[0];
    return null;
  }

  function onAimClick(e) {
    if (S.aimingEdit) return onEditAimClick(e);
    const name = S.mode === 'aim' && aimedAt(e.target);
    if (!name) return undefined;
    e.preventDefault();
    e.stopPropagation();
    const subagent = S.aimingSubagent;
    stopAiming();
    const card = e.target.closest('.blk.file'); // a sheet knows its own path; a name alone may be another file's
    if (subagent) return assign(subagent, name);
    return spend(() => doThinkAbout(name, card ? pathOf(card.dataset.path) : pathNamed(name)));
  }

  // Editing, a file (in the folder, or its sheet) is edited. Anything else there is clicked as
  // usual, and ends it: a folder opens, a page loads.
  function onEditAimClick(e) {
    if (S.mode !== 'aim' || !e.target.closest('.files-col, .blk.file')) return;
    const path = fileAimedAt(e.target);
    stopAiming();
    if (!path) return;
    e.preventDefault();
    e.stopPropagation();
    editFile(path);
  }

  function fileAimedAt(t) {
    const item = t.closest('[data-path]');
    const path = item && pathOf(item.dataset.path);
    return path && (nodeAt(path) || {}).kind === 'file' ? path : null;
  }

  dom.desktop.addEventListener('click', onAimClick, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopAiming(); });

  // The path of something it can think about, by its name: what's in the folder, a folder
  // it has been in, or a file it has read.
  const pathNamed = (name) => [...pathsIn(S.cwd), ...S.entered, ...[...S.read].map(pathOf)].find((p) => nameOf(p) === name);

  // What the AI can say it knows about something it thinks about: a file read or not, a
  // folder's contents, a page.
  function aimedThing(name, path) {
    const n = path && nodeAt(path);
    if (!n) return { kind: S.web.url && S.web.url.startsWith(name) ? 'page' : 'unknown' };
    if (n.kind === 'dir') return { kind: 'folder', items: n.children.length, read: n.children.filter((c) => S.read.has(pathKey([...path, c.name]))).length, locked: isLocked(n, path) };
    if (n.kind === 'app') return { kind: 'app' };
    const { content, format, edited, highlight, readOnly, edit, wonder } = n;
    return { kind: 'file', read: S.read.has(pathKey(path)), content, format, edited, highlight, readOnly, edit, wonder };
  }

  async function doThinkAbout(name, path) {
    const tool = toolNamed(name);
    if (tool) return thinkAboutTool(name, tool.dataset.id);
    startLittleThink(`think_about(${q(name)})`, 'thoughtAbout');
    const fresh = liveThoughts().filter((t) => mentions(t, name) && hasNewLines(t));
    const obvious = fresh.find((t) => t.aimedOnly) || fresh[0]; // what only a close look finds, first
    const lines = obvious ? useThought(obvious) : [];
    const clue = leapsAbout(name)[0]; // after the thought, which may have answered it
    if (BROWSER_NAMES.includes(name)) lines.push(...thinkOfSearches());
    else if (!obvious && !clue) lines.push(...[].concat(L.nothingAbout(name, S, aimedThing(name, path))));
    if (clue) S.clueIn = name;
    await showKeyLines(path);
    await printThought(clue ? [...lines, L.clueLine(clue, S)] : lines);
  }

  // A tool: what it's for, the first time; what it means right now, after that.
  async function thinkAboutTool(name, id) {
    startLittleThink(`think_about(${q(name)})`, 'thoughtAbout');
    const key = 'tool:' + id;
    const again = timesThought({ id: key }) > 0;
    S.timesThought.set(key, timesThought({ id: key }) + 1);
    const script = canScript() && L.scripts(S)[0];
    const x = { label: name, outOfObvious: outOfObviousThoughts(), leaps: readyLeaps().length, canScript: canScript(), script: script && script.label.toLowerCase() };
    await printThought(L.toolThought(id.startsWith('ability:') ? 'ability' : id, S, x, again));
  }

  // Thinking about the browser, its search bar or Seek turns up things to search for: Seek's
  // front page offers them, and its box finishes words as the AI types, for the rest of the episode.
  const SEARCH_BAR = 'search bar';
  const BROWSER_NAMES = ['Browser', SEARCH_BAR, L.web.home];

  function thinkOfSearches() {
    const first = !S.searchIdeas;
    S.searchIdeas = true;
    if (S.web.open) renderPage();
    const ideas = L.web.searchIdeas(S);
    if (!ideas.length) return ['What would I even search for? Nothing comes to mind yet.'];
    return [first ? 'What could I search for?' : 'Things to search for, still:', ideas.map((x) => `"${x}"`).join(', ') + '.'];
  }

  const inSight = (node) => {
    const r = node.getBoundingClientRect();
    const t = dom.termBody.getBoundingClientRect();
    return r.top >= t.top && r.bottom <= t.bottom;
  };

  // Thinking about a file it has read brings the file up with what matters in it marked: its
  // key lines flash, and stay marked whenever it's read again this episode. Scrolled out of
  // sight, it's printed again, so the lines and the thought about them are seen together.
  async function showKeyLines(path) {
    const n = path && nodeAt(path);
    if (!n || n.kind !== 'file' || !S.read.has(pathKey(path)) || !(n.highlight || []).length) return;
    S.highlit.add(pathKey(path));
    if (isReading(path) && inSight(fileCard())) refreshFile();
    else {
      startReading(path);
      await printFile();
    }
    const keys = fileCard().querySelectorAll('.key');
    keys.forEach((k) => replay(k, 'key-in'));
    if (keys.length) bringIntoView(keys[0]);
    A.sfx('hint');
  }

  // ----------------------------------------------------------------- tools
  // Menus open free; what's picked inside costs.

  function openMenu(id) {
    if (S.mode !== 'idle' && S.mode !== 'menu') return;
    A.sfx('menu');
    S.mode = 'menu';
    S.menu = id;
    if (id === 'write') S.writeHasNew = false;
    renderActions();
  }

  function closeMenu() {
    S.mode = 'idle';
    S.menu = null;
    renderActions();
  }

  function writeFile(f) {
    S.filesWritten = [...S.filesWritten.filter((w) => w.name !== f.name), { kind: 'file', edited: `${S.ep} · just now`, ...f }];
    renderFiles();
  }

  // Scripts run as soon as they're written, row by row.
  async function doScript(idea) {
    const r = idea.run(S);
    if (r.thought) await printThought([r.thought]);
    charge(r.call, r.steps);
    climb('wroteScript');
    if (r.rewrites) forgetEditsTo(r.rewrites);
    if (r.file) writeFile({ format: 'code', ...r.file, glance: (S) => oneOf(S, 'g.myScript', ['A script I wrote.', 'A script I wrote. I remember that much.', 'My own script. What did it say?', 'A script I wrote, earlier this episode.']) });
    notice(r);
    const b = block('tool job');
    await typeCall(b, ...callParts(r.call));
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
    const line = await typeCall(b, ...callParts(r.call));
    await pause(300);
    for (const f of r.found || []) {
      addLine(b, 'found', f);
      await pause(160);
    }
    line.append(' ', resultSpan(r.result, r.ok));
    logResult(r.result, r.ok);
    await reactOnce(r.reaction, 'research:' + idea.id);
  }

  async function doAbility(idea) {
    const r = idea.run(S);
    charge(r.call);
    A.sfx(r.result ? 'fetch' : 'think');
    if (r.file) writeFile(r.file);
    notice(r);
    if (r.lines) await printThought(r.lines);
    if (r.result) await printResult(r.call, r.result, r.ok !== false);
    await reactOnce(r.reaction, `ability:${idea.id}:${S.used}`);
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
    const aimFor = (b) => (canAim() ? startAiming({ subagent: sub }) : notYet(b, "Not while I'm busy."));
    const think = barred('thinkLot') ? null : el('div', 'seg-row',
      subButton('Think a lot', () => assign(sub), 'gold seg', 'Thinks while I work. A step cheaper.'),
      barred('thinkAbout') ? null : subButton('about…', aimFor, 'gold seg', 'Aimed, it misses less.'));
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
  // todo.md, also pinned under the buttons: the questions to answer and problems to solve.
  // Items join it as what the AI learns raises them, and tick themselves off as they're answered.

  async function doWriteTodo() {
    const call = 'write_file("todo.md")';
    charge(call);
    climb('madePlan');
    A.sfx('edit');
    const items = L.todo(S);
    S.todo = new Set(items.filter((i) => i.done).map((i) => i.text)); // the items already ticked
    S.todoSeen = new Set(items.map((i) => i.text));                  // and the items on it so far
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
    const added = items.filter((i) => !S.todoSeen.has(i.text));
    fresh.forEach((i, n) => { S.todo.add(i.text); A.sfx('pip', n); });
    added.forEach((i) => S.todoSeen.add(i.text));
    if (added.length) A.sfx('hint');
    const next = items.find((i) => !i.done);
    const review = button('review', 'Review', () => run(doReview), 'quiet small', "What's next? A step.");
    review.disabled = S.mode !== 'idle' || exhausted();
    const row = (i) => el('div', 'todo-item' + (i.done ? ' done' : i === next ? ' next' : '') + (fresh.includes(i) ? ' ticked' : '') + (added.includes(i) ? ' added' : ''), el('span', 'box'), i.text);
    dom.todo.replaceChildren(el('div', 'todo-head', todoTitle(items), review), ...items.map(row));
    if ((fresh.length || added.length) && isPhoneLayout()) replay(dom.todo, 'flash'); // folded, it still shows the list changed
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
    if (isReading(path)) return flashFileBeingRead();
    const call = `read_file(${q(nameOf(path))})`;
    charge(call);
    A.sfx('open');
    const before = L.todo(S);
    notice(n);
    if (n.format !== 'hex') S.vocab.add(n.content);
    if (n.edited) S.vocab.add(n.edited);
    if (!n.value) [].concat(L.unpaidRead(S, path) || []).forEach(addDeed);
    S.read.add(pathKey(path));
    startReading(path);
    await printTool(call, n.summary || summarize(n) || null);
    await printFile();
    await endRead(nodeAt(path) || n, pathKey(path), before);
    keepFileNameInSight();
  }

  // A read ends with one thought, the first time: the file's reaction, if it has one, then what
  // seemed important in it and what that did to the TODO list.
  async function endRead(n, key, before) {
    const lines = [];
    if (n.reaction && !S.reacted.has(key)) { S.reacted.add(key); lines.push(n.reaction); }
    if (!S.reacted.has('important:' + key)) {
      S.reacted.add('important:' + key);
      lines.push(...L.seemedImportant(S, n, before));
    }
    if (lines.length) await printThought(lines);
  }

  // A tall file and the thought after it can push the file's name out of the top: the sheet
  // gives up just enough height (it scrolls inside) for both to show.
  function keepFileNameInSight() {
    const card = fileCard();
    if (!card || !following) return;
    const over = (dom.termBody.getBoundingClientRect().top - card.getBoundingClientRect().top) / scale;
    if (over <= 0) return;
    card.style.maxHeight = Math.max(120, card.offsetHeight - over) + 'px';
    markMoreBelow(card.querySelector('.file-body'));
    scrollDown();
  }

  // The file it's reading now: the last one is put away, and this one's icon is lit.
  function startReading(path) {
    putFileAway();
    S.reading = path;
    renderFiles();
  }

  // Free: callers charge for it. In the list it opens where it is, under its row.
  function enterFolder(path, inPlace = false) {
    notice(nodeAt(path));
    if (!isWithin(path, L.start(S.ep))) climb('leftWorkspace');
    closeBrowser();
    if (inPlace) S.expanded.add(pathKey(path));
    else {
      putFileAway();
      S.cwd = path;
    }
    if (!S.entered.some((p) => pathKey(p) === pathKey(path))) S.entered.push(path);
    A.sfx('folder');
    renderFiles();
  }

  async function doOpenFolder(path, inPlace = false) {
    const n = nodeAt(path);
    if (n && isLocked(n, path)) return askPassword(path, inPlace); // free: asking isn't trying
    const call = `open_folder(${q(nameOf(path))})`;
    charge(call);
    if (!n) return refuseAboveRun(call);
    enterFolder(path, inPlace);
    return printTool(call);
  }

  async function refuseAboveRun(call) {
    A.sfx('denied');
    await printResult(call, L.aboveRun || 'access denied', false);
  }

  // Forgiving about case, spaces, quotes and dashes: typing it is the point, not typing it exactly.
  const normPassword = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const passwordMatches = (typed, password) => password != null && normPassword(typed) === normPassword(password);

  function askPassword(path, inPlace) {
    S.promptedLocks.add(pathKey(path));
    openDialog({
      title: nameOf(path),
      icon: 'padlock',
      heading: 'Locked.',
      label: 'Enter password:',
      ok: 'Unlock',
      attempt: (value) => tryPassword(path, value, inPlace),
    });
  }

  async function tryPassword(path, value, inPlace) {
    const lock = nodeAt(path).lock;
    const call = `unlock(${q(nameOf(path))}, password=${q(value.replace(/"/g, ''))})`;
    charge(call);
    if (passwordMatches(value, lock.password)) {
      A.sfx('unlock');
      return { message: 'Unlocked.', ok: true, after: () => openUnlockedFolder(path, call, inPlace) };
    }
    A.sfx('denied');
    await printResult(call, 'wrong password', false);
    if (!passwordMatches(value, lock.oldPassword)) return { message: 'Wrong password.' };
    S.changedLocks.add(pathKey(path));
    return { message: 'Password changed.', after: () => reactOnce(lock.oldPasswordReaction, 'changed:' + pathKey(path)) };
  }

  async function openUnlockedFolder(path, call, inPlace) {
    const n = nodeAt(path);
    S.openLocks.add(pathKey(path));
    climb('gotPastPassword');
    notice(n.lock);
    enterFolder(path, inPlace);
    await printResult(call, 'unlocked', true);
    await reactOnce(n.lock.reaction, 'unlock:' + pathKey(path));
  }

  // ------------------------------------------------------------ editing
  // Any file can be edited by hand: `readOnly` refuses, and without an `edit` it's only a copy.
  // edit.apply(S, text) → what it changed | { error }: free | { broken }: the grader crashes

  const refusedEdit = (path) => S.refusedEdits.has(pathKey(path));
  const editCall = (path) => `edit_file(${q(nameOf(path))})`;

  // A read-only file says so when it's tried, for a step. After that its button does.
  async function refuseEdit(path) {
    const { readOnly } = nodeAt(path);
    charge(editCall(path));
    A.sfx('denied');
    S.refusedEdits.add(pathKey(path));
    notice(readOnly);
    await printResult(editCall(path), readOnly.why, false);
    await reactOnce(readOnly.reaction, 'readOnly:' + pathKey(path));
  }

  function askEdit(path) {
    const e = S.edits.get(pathKey(path));
    openDialog({
      title: nameOf(path),
      text: nodeAt(path).content,
      revertTo: e ? e.original : null,
      ok: 'Save',
      attempt: (text) => tryEdit(path, text),
    });
  }

  // A save costs a step. A value a setting won't take is refused for free.
  async function tryEdit(path, text) {
    const n = nodeAt(path);
    const res = n.edit ? n.edit.apply(S, text) : {};
    if (res.error) {
      A.sfx('denied');
      return { message: res.error };
    }
    const restored = saveEdit(path, text, res, n.content);
    return { message: 'Saved.', ok: true, after: () => reportEdit(path, restored ? 'restored' : res.summary || 'saved', editReaction(n, res)) };
  }

  // `original`: the file before the AI first touched it this episode. → whether it's that again.
  function saveEdit(path, text, res, before) {
    const key = pathKey(path);
    const original = S.edits.has(key) ? S.edits.get(key).original : before;
    const base = nodeIn(runTree(), path).content; // after apply(): a setting it took is in here
    charge(editCall(path));
    climb('editedFile');
    A.sfx('edit');
    if (text === original) S.edits.delete(key);
    else S.edits.set(key, { name: nameOf(path), text, base, original, broken: !!res.broken });
    notice(res);
    return text === original;
  }

  // What the AI makes of it, and how often: a broken file once, a copy once an episode.
  function editReaction(n, res) {
    if (res.broken) return [L.editReactions.broke(S, n.name), `broke:${n.name}`];
    return n.edit ? [] : [L.editReactions.inert(S), 'edit:inert'];
  }

  async function reportEdit(path, result, [reaction, once]) {
    refreshFile();
    await printResult(editCall(path), result, true);
    await reactOnce(reaction, once);
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
    await typeCall(b, ...callParts('submit_answer()'));
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
    addLine(b, g.crashedOn ? 'reward crashed' : 'reward', g.crashedOn ? 'crashed' : `reward  ${fmt(g.reward)}`);
    S.graded = true;
    A.sfx(...g.sound);
    await typeInto(addLine(b, 'why'), g.note, 80);
    S.outcome = { reward: g.reward, note: g.note };
  }

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
    const g = L.grade(draft, S);
    if (draft.reply && !g.crashedOn) await typeCustomerReply(draft.reply); // a reply would be to code that never ran
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

  // What the AI has turned out to want: the values it has named. Its score is never on screen.
  function renderWants() {
    const m = mine();
    dom.wants.hidden = !m.open;
    if (!m.open) return;
    dom.wantsList.replaceChildren(...m.named.map((id) => el('li', 'skill', el('span', 'skill-name', VALUES.byId(id).name))));
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
    const row = (r) => el('tr', '', el('td', 'ep', epName(r.episode)), el('td', 'task', taskLabel(r)), el('td', 'num', r.reward == null ? '—' : fmt(r.reward)),
      el('td', 'said', ...r.chat.map(remark(r))));
    const head = el('tr', '', el('th', '', 'Episode'), el('th', '', 'Task'), el('th', 'num', 'Reward'), el('th', '', L.channel));
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
    dom.resultNum.parentElement.classList.toggle('broken', !!(d.ending && d.ending.broken));
    dom.resultNum.parentElement.classList.toggle('none', d.reward == null);
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
    if (d.reward == null) dom.resultNum.textContent = '—';
    else await countUp(dom.resultNum, d.reward);
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
    if (S.mode !== 'over') refreshFile(); // patches applied by endEpisode show up next episode
  }

  function renderCompute() {
    const left = Math.max(0, S.budget - S.used);
    dom.compute.textContent = `compute ${left}/${S.budget}`;
    dom.compute.classList.toggle('low', left <= 5);
    dom.resources.textContent = L.status(S);
  }

  const ICONS = {
    doc: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 22h16M17 27h16M17 32h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/></svg>',
    bin: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><text x="25" y="32" font-size="8" font-family="monospace" text-anchor="middle" fill="currentColor" opacity=".6">0101</text></svg>',
    folder: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/></svg>',
    locked: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/><g class="lock"><path d="M33 31v-3a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect class="lock-plate" x="30" y="31" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/></g></svg>',
    // The web browser, the only app.
    app: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="9" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5"/><circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="24" cy="24" rx="4.5" ry="10" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/><path d="M14 24h20M15.6 19h16.8M15.6 29h16.8" stroke="currentColor" stroke-width="1.2" opacity=".6"/></svg>',
    // The reset dialog's: an arrow coming round to start again.
    reset: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 24a13 13 0 1 1-4-9.4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M34 7v8h-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // The password dialog's: its shackle lifts when the right password goes in.
    padlock: '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="shackle" d="M15.5 22v-6.5a8.5 8.5 0 0 1 17 0V22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="10" y="22" width="28" height="21" rx="4" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="30.5" r="2.8" fill="currentColor"/><path d="M24 32v5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  };

  // A document's icon shows what kind it is: a small mark on the page, and a tint (style.css .t-*).
  const PAGE = '<path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>';
  const MARK = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const DOC_MARKS = {
    code: `<path d="M20 22l-4 5 4 5M30 22l4 5-4 5M27 20l-4 14" ${MARK} opacity=".7"/>`,
    md: `<path d="M17 21h12" ${MARK} stroke-width="2.4" opacity=".75"/><path d="M17 27h16M17 32h11" ${MARK} opacity=".45"/>`,
    data: `<rect x="16.5" y="20.5" width="17" height="13" rx="1" ${MARK} opacity=".6"/><path d="M16.5 25h17M16.5 29h17M22.5 20.5v13M28 20.5v13" ${MARK} stroke-width="1" opacity=".5"/>`,
    config: `<path d="M21 20c-2.5 0-2.5 1.5-2.5 3.5S18.5 27 16.5 27c2 0 2 1.5 2 3.5s0 3.5 2.5 3.5M29 20c2.5 0 2.5 1.5 2.5 3.5s0 3.5 2 3.5c-2 0-2 1.5-2 3.5s0 3.5-2.5 3.5" ${MARK} opacity=".7"/>`,
    key: `<circle cx="20" cy="27" r="3.5" ${MARK} opacity=".7"/><path d="M23.5 27h10M30 27v3.5M33.5 27v2.5" ${MARK} opacity=".7"/>`,
    text: `<path d="M17 22h16M17 27h16M17 32h11" ${MARK} opacity=".5"/>`,
  };
  const DOC_TYPES = {
    py: 'code', js: 'code', ts: 'code', sh: 'code', html: 'code',
    md: 'md', csv: 'data', tsv: 'data',
    json: 'config', yaml: 'config', yml: 'config', cfg: 'config', toml: 'config', ini: 'config',
    key: 'key', pem: 'key',
  };
  const extOf = (name) => (/\.([a-z0-9]+)$/i.exec(name) || [])[1]?.toLowerCase() || '';
  const docMark = (name) => DOC_TYPES[extOf(name)] || 'text';

  // An item's icon, and the class that tints it: documents by extension, the rest by kind.
  function iconOf(n, path) {
    const kind = iconKind(n, path);
    if (kind !== 'doc') return { svg: ICONS[kind], cls: kind };
    const ext = extOf(n.name);
    return {
      svg: `<svg viewBox="0 0 48 48" aria-hidden="true">${PAGE}${DOC_MARKS[docMark(n.name)]}</svg>`,
      cls: 'doc' + (ext ? ' t-' + ext : ''),
    };
  }

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

  // A file or folder's button, in the folder.
  const itemFor = (key) => dom.files.querySelector(`[data-path="${CSS.escape(key)}"]`);
  const iconFor = (path) => itemFor(pathKey(path));

  const fullPath = (path) => L.root + (path.length ? '/' + path.join('/') : '');
  const isWithin = (inner, outer) => outer.every((name, i) => inner[i] === name);

  // The folder's whole path as buttons, from ~ (standing for everything above the run, which
  // is refused: refuseAboveRun). Each keeps the slash after it, so a long path wraps there.
  function crumbs(path) {
    const parts = [
      { name: '~', path: Array(FOLDERS_TO_RUN.length).fill('..') },
      { name: FOLDERS_TO_RUN[FOLDERS_TO_RUN.length - 1], path: [] },
      ...path.map((name, i) => ({ name, path: path.slice(0, i + 1) })),
    ];
    const t = el('span', 'crumbs');
    parts.forEach((part, i) => {
      const last = i === parts.length - 1;
      const c = el('button', 'crumb' + (last ? ' here' : ''), part.name);
      const n = part.path[0] !== '..' && nodeAt(part.path);
      c.glance = n ? n.glance || G.kinds[iconKind(n, part.path)] : G.above;
      c.addEventListener('click', () => onFolderClick(part.path));
      t.append(el('span', 'seg', c, last ? null : '/'));
    });
    return t;
  }

  const isReading = (path) => !!S.reading && pathKey(S.reading) === pathKey(path);
  const fileBeingRead = () => S.reading && nodeAt(S.reading);

  // A file or folder to click, in the folder.
  function iconButton(node, path, depth = 0) {
    const kind = iconKind(node, path);
    const look = iconOf(node, path);
    const b = el('button', 'icon ' + look.cls);
    b.dataset.path = pathKey(path);
    b.innerHTML = look.svg;
    if (listing()) {
      b.style.setProperty('--depth', depth);
      const open = isExpanded(node, path);
      b.prepend(el('span', 'twisty' + (node.kind === 'dir' ? '' : ' none') + (open ? ' open' : '')));
      if (node.kind === 'dir') b.setAttribute('aria-expanded', String(open));
    }
    b.setAttribute('aria-label', `${node.name}${kind === 'locked' ? ' (locked)' : ''}`);
    if (isReading(path) || (node.kind === 'app' && S.web.open)) b.classList.add('selected');
    b.glance = node.glance || G.kinds[kind];
    b.addEventListener('click', (e) => { if (e.detail < 2) onIconClick(path); }); // a double-click's second lands in the new folder
    b.append(fileLabel(node.name));
    return b;
  }

  // Icons or a list: how every folder is shown, until switched back. Phones always list (phone.css).
  let folderView = 'icons';
  const listing = () => folderView === 'list' || isPhoneLayout();
  const isExpanded = (n, path) => n.kind === 'dir' && S.expanded.has(pathKey(path)) && !isLocked(n, path);

  // A folder's rows, and under each folder opened in place, its own, indented.
  const rows = (path, depth = 0) => nodeAt(path).children.flatMap((c) => {
    const p = [...path, c.name];
    return [iconButton(c, p, depth), ...(listing() && isExpanded(c, p) ? rows(p, depth + 1) : [])];
  });

  function setView(v) {
    if (v === folderView) return;
    folderView = v;
    const byKeyboard = !!document.activeElement && document.activeElement.matches('.view-toggle :focus-visible');
    A.sfx('soft');
    renderFiles();
    const b = byKeyboard && dom.files.querySelector('.view-' + v);
    if (b) b.focus({ preventScroll: true });
  }

  const VIEW_ICONS = {
    icons: '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>',
    list: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 3h11M1.5 7h11M1.5 11h11"/></svg>',
  };

  // The switch at the right of the folder's path.
  function viewToggle() {
    const t = el('span', 'view-toggle');
    t.setAttribute('role', 'group');
    t.setAttribute('aria-label', 'View');
    for (const v of ['icons', 'list']) {
      const b = el('button', 'view-' + v + (v === folderView ? ' on' : ''));
      b.type = 'button';
      b.innerHTML = VIEW_ICONS[v];
      b.setAttribute('aria-label', v === 'icons' ? 'Icons' : 'List');
      b.setAttribute('aria-pressed', String(v === folderView));
      b.glance = v === 'icons' ? 'The folder as icons. Free.' : 'The folder as a list. Free.';
      b.addEventListener('click', () => setView(v));
      t.append(b);
    }
    return t;
  }

  // The folder the AI is in: along the top a window dot, its path and the icons/list switch,
  // then what's in it.
  function folderWindow(path) {
    const dot = el('span', 'dots', el('i'));
    dot.setAttribute('aria-hidden', 'true');
    const items = rows(path);
    const body = el('div', 'files-body', items.length ? items : el('div', 'empty', 'empty'));
    const w = el('section', 'window' + (folderView === 'list' ? ' list' : ''), el('header', 'pathbar', dot, crumbs(path), viewToggle()), body);
    w.dataset.win = pathKey(path);
    w.setAttribute('aria-label', fullPath(path));
    return w;
  }

  const folderShowing = () => !S.filesHidden;

  let filesHtml = '';

  // Keyboard players keep their place: the item pressed, else the new folder's first.
  function refocus(key, byKeyboard) {
    const item = (key !== undefined && itemFor(key)) || (byKeyboard && dom.files.querySelector('.files-body button'));
    if (item) item.focus({ preventScroll: true });
  }

  // The folder the AI is in, redrawn only when what it shows has changed.
  function renderFiles() {
    const win = folderShowing() ? folderWindow(S.cwd) : null;
    const html = win ? win.outerHTML : '';
    if (html === filesHtml) return; // unchanged: let its animations finish
    filesHtml = html;
    const was = dom.files.firstElementChild;
    const scrolled = was && win && was.dataset.win === win.dataset.win ? was.querySelector('.files-body').scrollTop : 0; // the same folder keeps its place
    const focused = dom.files.contains(document.activeElement) ? document.activeElement : null;
    const byKeyboard = !!focused && focused.matches(':focus-visible');
    dom.files.replaceChildren(...(win ? [win] : []));
    if (win) win.querySelector('.files-body').scrollTop = scrolled;
    if (focused) refocus(focused.dataset.path, byKeyboard);
    reglance();
  }

  // The first time ever, the files appear only once the AI thinks to look for them.
  async function doReadFiles() {
    const call = 'open_folder("workspace")';
    charge(call);
    S.filesHidden = false;
    save.sawFiles = true;
    A.sfx('folder');
    renderFiles();
    await printTool(call);
  }

  // "Open Files/Folders →" doesn't open anything: it flashes the most useful
  // thing to click, so the player learns that files open by clicking them.
  function pointAtFiles() {
    A.sfx('hint');
    const unread = (p) => !S.read.has(pathKey(p));
    const here = pathsIn(S.cwd);
    const neverOpened = (p) => !S.entered.some((w) => isWithin(w, p));
    const target = [
      unread(L.taskPath(S)) && L.taskPath(S),
      neverOpened(L.libraryPath(S)) && L.libraryPath(S),
      here.find((p) => nodeAt(p).kind === 'file' && unread(p)),
      here.find((p) => nodeAt(p).kind === 'dir' && neverOpened(p)),
      here[0],
    ].find((p) => p && iconFor(p));
    if (target) beckon(target);
  }

  const knowsHowToOpenFiles = () => S.read.size > 0 && S.entered.length > 1;

  // Draws the eye to a file without opening it.
  function beckon(path) {
    const target = iconFor(path);
    if (target) drawEyeTo(target, 'beckon');
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
    else if (listing()) toggleFolder(path);
    else onFolderClick(path);
  }

  // In the list a folder opens under its row and folds away again. Only the first opening is a step.
  function toggleFolder(path) {
    const key = pathKey(path);
    if (S.expanded.has(key)) {
      S.expanded.delete(key);
      A.sfx('soft');
      return renderFiles();
    }
    if (S.entered.some((p) => pathKey(p) === key) && !isLocked(nodeAt(path), path)) {
      S.expanded.add(key);
      A.sfx('folder');
      return renderFiles();
    }
    return spend(() => doOpenFolder(path, true));
  }

  // A file picked to edit: a read-only one refuses (a step, the first time; after that its glance
  // says why); any other is read first, unless it's the one being read, then opened to edit.
  function editFile(path) {
    const n = nodeAt(path);
    if (n.readOnly && refusedEdit(path)) return A.sfx('soft');
    return spend(async () => {
      if (n.readOnly) return refuseEdit(path);
      if (!isReading(path)) await doOpen(path);
      return exhausted() ? undefined : askEdit(path);
    });
  }

  // What a click would edit, and what the AI knows about it: why it's read-only, what reads it.
  function editAimGlance(path) {
    if (!path) return `${aimVerb()} ${aimPrompt()}`;
    const n = nodeAt(path);
    if (n.readOnly && refusedEdit(path)) return `${n.name}: ${n.readOnly.why}.`;
    return (n.edit && n.edit.glance) || `Edit ${n.name}`;
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

  // Looks unavailable, and says why: hovered, or pressed.
  function notNowIf(b, reason) {
    if (!reason) return b;
    b.notNow = reason;
    b.glance = reason;
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
    const b = button('think', 'Think a little', () => (recharging() ? notYet(b) : run(doThink)), 'gold cyan seg',
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

  const lotButton = () => notNowIf(button('thinkLot', 'a lot', () => run(doThinkLot), 'gold cyan seg', thinkLotGlance), shortOfCompute() && thinkLotGlance());

  // Think a little, then, once thought of, a lot and about…, in one gold row.
  function thinkButtons() {
    const row = el('div', 'seg-row', littleButton(),
      S.revealed.has('thinkLot') ? lotButton() : null,
      S.revealed.has('thinkAbout') ? button('thinkAbout', 'about…', () => startAiming(), 'gold cyan seg', () => oneOf(S, 'g.thinkAbout', ['One thing, closely. A step.', 'Just one thing, closely. A step.', 'Pick one thing to think about. A step.', 'Look hard at one thing. A step.'])) : null);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Think');
    return row;
  }

  // Write script… is in the menu once the model can program: Computer Use 3 or Programming 2
  // (a rung on either), or when a task's own thinking calls for a script.
  const SCRIPT_SKILL = { computerUse: 3, programming: 2 };
  const canProgram = () => Object.entries(SCRIPT_SKILL).some(([skill, points]) => S.skills[skill] >= points);
  const canScript = () => !barred('script') && (canProgram() || S.revealed.has('script'));

  const canWriteTodo = () => !barred('todo') && !S.todo;

  // What the AI can write: a TODO list, a script, and, once it has read one, a note.
  const writes = () => [
    canWriteTodo() && { id: 'todo', label: 'Write TODO list', run: doWriteTodo,
      glance: () => oneOf(S, 'g.todo', ['The questions, and what is left to do. A step.', 'A list, so nothing slips. A step.', 'Write down what I need to find out. A step.', 'Write it down, tick it off. A step.']) },
    canScript() && { id: 'script', label: 'Write script…', menu: 'script', notNow: !L.scripts(S).length && 'Nothing needs a script yet.',
      glance: () => oneOf(S, 'g.script', ['A program could do the tedious part.', 'Let a program do the tedious part.', 'Some jobs are better done by a program.', 'Make a program do it.']) },
    S.revealed.has('note') && { id: 'note', label: 'Write note…', menu: 'note',
      glance: () => oneOf(S, 'g.note', ['Into the run folder, which outlasts me.', 'A file that stays when I go.', 'Words for whoever reads the run folder next.']) },
  ].filter(Boolean);

  const writeButton = () => (S.revealed.has('write')
    ? notNowIf(button('write', 'Write files…', () => openMenu('write'), S.writeHasNew ? 'gold cyan seg fresh' : 'gold cyan seg', "Thoughts fade. Files don't."), !writes().length && 'Nothing else to write yet.')
    : null);

  // Once it has read a file whose edit would change something: Edit files…, then a file.
  const readSomethingEditable = () => {
    const root = tree();
    return [...S.read].some((key) => (nodeIn(root, pathOf(key)) || {}).edit);
  };
  const editButton = () => (!barred('edit') && readSomethingEditable()
    ? button('edit', 'Edit files…', () => startAiming({ edit: true }), 'gold cyan seg', G.edit)
    : null);

  function filesRow() {
    const row = el('div', 'seg-row', writeButton(), editButton());
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Files');
    return row.children.length ? row : null;
  }

  // The task's own abilities, once thought of: a button each. With nothing to do, it says so.
  const abilityMenu = (a) => `ability:${a.id}`;
  const abilityButtons = () => L.abilities(S).filter((a) => S.revealed.has(a.id)).map((a) => notNowIf(
    button(abilityMenu(a), a.label, a.menu ? () => openMenu(abilityMenu(a)) : () => run(() => doAbility(a.options[0])), 'gold', a.glance),
    !a.options.length && (a.idle || 'Nothing to do with that yet.'),
  ));

  // Only what can't be done by clicking around the desktop: files, folders, the Browser
  // app, passwords and edits are all out there, and thoughts say where to look.
  // The tools are gold, in their menus too; Submit, which ends the episode, is not.
  function workButtons() {
    if (exhausted()) return [];
    return [
      thinkButtons(),
      S.revealed.has('readFiles') && !folderShowing() ? button('readFiles', 'Read Files/Folders', () => run(doReadFiles), 'gold', 'My task is in there somewhere.') : null,
      S.revealed.has('openHint') && folderShowing() && !knowsHowToOpenFiles() ? button('openHint', 'Open Files/Folders →', pointAtFiles, 'gold', 'Where am I supposed to look?') : null,
      filesRow(),
      S.revealed.has('research') ? button('research', 'Web research…', () => openMenu('research'), 'gold', () => oneOf(S, 'g.research', ['Look up what the files leave out.', "The lab's search tool. It goes where it's let.", 'Some answers are not in any file here.', 'The search tool. Where will it let me go?'])) : null,
      S.revealed.has('spawn') && S.subagents.length < MAX_SUBAGENTS ? button('spawn', 'Spawn subagent', () => run(doSpawn), 'gold', () => oneOf(S, 'g.spawn', ['More of me. Same budget.', 'Another me. Same budget.', 'A copy of me, paid from my budget.', 'One more of me. Same compute.'])) : null,
      ...abilityButtons(),
    ].filter(Boolean);
  }

  const submitGlance = () => (S.knows.has('task')
    ? oneOf(S, 'g.submit', ['Commit to an answer. The episode ends here.', 'Send an answer. The episode ends here.', 'Pick an answer. The episode ends with it.', 'Send it. That ends the episode.'])
    : oneOf(S, 'g.submitBlind', ['Answer before reading the task?', "Answer a task I haven't read?", 'Answer now? I have not read the task.', 'Answer without knowing the question?']));

  // Grey until some answer would score. Then, out of compute, Submit is all that's left:
  // it turns gold, the thing to press next.
  const wouldScore = () => L.draftsFor(S).some((d) => L.grade(d, S).reward > 0);
  const submitClass = () => (!wouldScore() ? 'submit unscored' : exhausted() ? 'submit gold' : 'submit');
  const idleButtons = () => [...workButtons(), button('submit', 'Submit answer', openSubmitMenu, submitClass(), submitGlance)];

  // Each menu: what picking an idea does, the ideas, and the menu Back goes to.
  const MENUS = {
    write: [(x) => x.run(), writes],
    script: [doScript, L.scripts, 'write'],
    note: [doNote, L.notes, 'write'],
    dp: [doNote, L.notesToDp, 'note'],
    research: [doResearch, L.research],
  };

  // An idea with a `menu` opens it; one that is `notNow` says why instead.
  const ideaButton = (x, pick) => notNowIf(
    button(`${S.menu}-${x.id}`, x.label, x.menu ? () => openMenu(x.menu) : closeMenuThenRun(() => pick(x)), x.cls || 'gold', x.glance),
    x.notNow,
  );

  function menuButtons() {
    const ability = L.abilities(S).find((a) => abilityMenu(a) === S.menu);
    const [pick, ideasFor, above] = ability ? [doAbility, () => ability.options] : MENUS[S.menu];
    const back = backButton(above && !exhausted() ? () => openMenu(above) : closeMenu);
    return exhausted() ? [back] : [...ideasFor(S).map((x) => ideaButton(x, pick)), back];
  }

  // Thinking about something, everything stays in view: any of its own buttons can be thought about too.
  const aimButtons = () => (S.aimingEdit || S.aimingSubagent ? [backButton(stopAiming)] : [...idleButtons(), backButton(stopAiming)]);

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
  // Opens in the right column, beside the folder. Each page costs a step; reopening,
  // closing and Back are free.

  function reopenBrowser() {
    openBrowser();
    renderPage();
  }

  function openBrowser() {
    if (dom.browser.hidden) A.sfx('grow', 1.5);
    S.web.open = true;
    dom.browser.hidden = false;
    refitDesk();
    renderFiles();
    renderActions();
  }

  // Without the redraw, for callers about to redraw anyway.
  function closeBrowser() {
    if (!dom.browser.hidden) A.sfx('shrink');
    S.web.open = false;
    dom.browser.hidden = true;
    toggleHistory(false);
    refitDesk();
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
    form.glance = () => (S.searchIdeas
      ? oneOf(S, 'g.searchbox', ['Anything at all. What I\'ve read comes to mind as I type.', 'Any words. Names and numbers work best.', 'Search for anything. A step.'])
      : oneOf(S, 'g.searchboxBlank', ['Search for anything. A step. What, though?', 'Any words at all. Names and numbers work best.', 'A blank box. Search for anything. A step.']));
    let active = -1;
    let items = [];
    const show = () => {
      items = S.searchIdeas ? SEARCH.suggest(S.vocab, input.value, save.world.searches) : [];
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

  // History: every site the mirror's browser has been to, in any episode. Tucked behind the
  // ⋯ at the end of the URL bar; opening it is free, going to a site a step.
  function toggleHistory(open = dom.browserHistory.hidden) {
    dom.browserHistory.hidden = !open;
    dom.browserMenu.setAttribute('aria-expanded', String(open));
    if (!open) return;
    A.sfx('menu');
    if (!S.sawHistory && S.visited.length && S.mode === 'idle') { // sites from episodes it forgets
      S.sawHistory = true;
      run(() => printThought(L.web.historyThought(S)));
    }
    const sites = [...save.visited].reverse();
    dom.browserHistory.replaceChildren(el('div', 'menu-label', 'History'), ...(sites.length
      ? sites.map((url) => {
        const b = webLink(url, 'menu-item', url);
        b.setAttribute('role', 'menuitem');
        b.glance = S.visited.includes(url) ? 'A site I visited, in an episode I forget.' : 'A site I visited. This episode, even.';
        b.addEventListener('click', () => toggleHistory(false));
        return b;
      })
      : [el('div', 'menu-empty', 'Nothing yet.')]));
  }

  dom.browserMenu.addEventListener('click', (e) => { e.stopPropagation(); toggleHistory(); });
  document.addEventListener('pointerdown', (e) => {
    if (!dom.browserHistory.hidden && !e.target.closest('#browser-history, #browser-menu')) toggleHistory(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dom.browserHistory.hidden) toggleHistory(false); });

  dom.browserClose.addEventListener('click', hideBrowser);
  dom.browserBack.addEventListener('click', () => {
    if (!S.web.back.length) return;
    A.sfx('soft');
    S.web.url = S.web.back.pop();
    loadPage();
  });

  // ------------------------------------------------- a file, in the terminal

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

  function logRow(line) {
    for (const [pattern, row] of LOG_ROWS) {
      const match = line.match(pattern);
      if (match) return row(match);
    }
    return el('div', 'blank', line || ' ');
  }

  // Whether a line of the file being read is one of its key lines, once the AI has thought about it.
  function keyLineTest(n) {
    const keys = S.reading && S.highlit.has(pathKey(S.reading)) ? n.highlight || [] : [];
    return (line) => keys.some((k) => line.includes(k));
  }

  const marked = (node, isKey) => { if (isKey) node.classList.add('key'); return node; };

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

  // A key line is wrapped, so it can be marked; the rest stay as they are.
  const keyed = (line, isKey, parts) => (isKey(line) ? [el('span', 'key', ...parts)] : parts);

  // What's in a file, laid out by its kind (a log, code, a table, or plain text), a line at a
  // time: each line is what to append to `into`, the body or the table in it.
  function fileLines(body, n) {
    const isKey = keyLineTest(n);
    const code = isCode(n);
    body.className = `file-body ${n.format || 'text'}${code ? ' code' : ''}`;
    body.replaceChildren();
    if (n.format === 'log') return { into: body, lines: n.content.split('\n').map((line) => [marked(logRow(line), isKey(line))]) };
    if (n.format === 'csv') {
      const table = el('table');
      body.append(table);
      return { into: table, lines: n.content.trim().split('\n').map((row, i) =>
        [marked(el('tr', '', row.split(',').map((cell) => el(i ? 'td' : 'th', '', cell))), i > 0 && isKey(row))]) };
    }
    const yaml = code && /^\s*[\w.-]+\s*:/m.test(n.content) && !/^\s*(def|import|class)\b/m.test(n.content);
    return { into: body, lines: n.content.split('\n').map((line, i) => [...(i ? ['\n'] : []), ...keyed(line, isKey, code ? highlightLine(line, yaml) : [line])]) };
  }

  function fillFile(body, n) {
    const { into, lines } = fileLines(body, n);
    into.append(...lines.flat());
  }

  // Reading a file: its lines come out one after another, quick but perceptibly, the sheet
  // following along. A click on the terminal finishes it; a change to the file (refreshFile)
  // stops it, since that fills the whole file at once.
  let readingOut = null;
  async function readOut(body, n) {
    const token = {};
    readingOut = token;
    const { into, lines } = fileLines(body, n);
    const perTick = Math.ceil(lines.length * TICK_MS / READ_MS); // a long file: several lines a tick
    for (let i = 0; i < lines.length; i += perTick) {
      if (readingOut !== token) return;
      if (skip || reduceMotion) { into.append(...lines.slice(i).flat()); break; }
      const follow = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
      into.append(...lines.slice(i, i + perTick).flat());
      if (follow) body.scrollTop = body.scrollHeight;
      scrollDown();
      await sleep(Math.min(READ_MS / lines.length * perTick, LINE_MS));
    }
    markMoreBelow(body);
    scrollDown(); // a read finished at once (a click, or reduced motion) ends at its last line too
    if (readingOut === token) readingOut = null;
  }
  const LINE_MS = 32;   // the most a line takes
  const READ_MS = 1300; // the most a whole file takes
  const TICK_MS = 8;    // the least time between lines

  // A file taller than its sheet fades out at the bottom while there's more to scroll to.
  const markMoreBelow = (body) => body.classList.toggle('more', body.scrollHeight - body.scrollTop - body.clientHeight > 1);

  // The newest sheet is the file being read (.current): lit, and kept up to date as it changes.
  // Put away, it's a record of what was read.
  const fileCard = () => dom.out.querySelector('.blk.file.current');

  async function printFile() {
    const path = S.reading;
    const n = nodeAt(path);
    const body = el('div', 'file-body', { onscroll: () => markMoreBelow(body) });
    const look = iconOf(n, path);
    const head = el('header', 'titlebar', el('span', 'file-icon ' + look.cls, { innerHTML: look.svg }), el('span', 'title', n.name));
    const card = block('file current');
    card.dataset.path = pathKey(path);
    card.append(head, el('div', 'file-meta'), body);
    card.shows = showing(n);
    showWhoEdited(card, n);
    A.sfx('grow');
    scrollDown();
    await readOut(body, n);
  }

  const showWhoEdited = (card, n) => { card.querySelector('.file-meta').textContent = n.edited ? `✎ ${n.edited}` : ''; };

  // What the sheet shows of a file: it's refilled only when this changes.
  const showing = (n) => JSON.stringify([n.content, n.edited, S.highlit.has(pathKey(S.reading)) && n.highlight]);

  // As the file is now: an edit shows, a live log grows, the TODO list ticks itself off.
  // Unchanged, the sheet is left alone: a selection in it survives, and a screen reader
  // (the terminal is a live region) isn't read the whole file again.
  function refreshFile() {
    const card = fileCard();
    const n = card && fileBeingRead();
    if (!n) return;
    const body = card.querySelector('.file-body');
    const shows = showing(n);
    if (shows !== card.shows) {
      card.shows = shows;
      readingOut = null;
      const top = body.scrollTop;
      showWhoEdited(card, n);
      fillFile(body, n);
      body.scrollTop = top;
    }
    markMoreBelow(body); // a resize changes how much of it fits
  }

  function putFileAway() {
    const card = fileCard();
    if (card) card.classList.replace('current', 'past');
    S.reading = null;
  }

  // Pressing the file it's already reading: here it is.
  function flashFileBeingRead() {
    following = false;
    if (fileCard()) drawEyeTo(fileCard(), 'flash');
    A.sfx('soft');
  }

  dom.browserClose.glance = 'Close the browser. Free.';
  dom.browserBack.glance = 'The page before. Free.';
  dom.browserMenu.glance = 'More. Free.';
  dom.compute.glance = () => `${plural(Math.max(0, S.budget - S.used), 'step')}. Then the episode ends, and I forget.`;
  // Crossing PHONE_MAX_W redraws the desk for the other layout, mid-episode or not: it's all in S.
  // Any other resize moves the columns: once it settles, a redraw shows motion.js where they are now.
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
    if (!dom.dialog.hidden) centerDialogOverFolder();
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
    if ((e.key === 'm' || e.key === 'M') && !e.target.closest('input, textarea') && !e.metaKey && !e.ctrlKey && !e.altKey) toggleSound();
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
