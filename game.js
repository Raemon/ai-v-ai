// Engine. All content comes from window.LEVEL (run.js, the training run) and its tasks (tasks/*.js).
(() => {
  'use strict';

  const L = window.LEVEL;
  const G = L.glance;
  const A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => JSON.stringify(s);
  const pathKey = (p) => p.join('/');
  const epName = (n) => 'episode_' + String(n).padStart(5, '0');
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
    current: $('#current'),
    term: $('#term'),
    termBody: $('#term-body'),
    out: $('#out'),
    compute: $('#compute'),
    resources: $('#resources'),
    actions: $('#actions'),
    todo: $('#todo'),
    agents: $('#agents'),
    bubbles: $('.agent-col > .agent'),
    viewer: $('#viewer'),
    viewerTitle: $('#viewer-title'),
    viewerBody: $('#viewer-body'),
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
    skills: $('#skills'),
    resultNum: $('#result-num'),
    endChat: $('#end-chat'),
    diverged: $('#diverged'),
    endButton: $('#end-button'),
    goals: $('#goals'),
    runsTable: $('#runs-table'),
    chatLog: $('#chat-log'),
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
  // A fixed 1440×900 play area (a 13" MacBook Air) centred on a full-window
  // desk, scaled down only when the window is smaller. `local` undoes the scale.

  const SCREEN_W = 1440;
  const SCREEN_H = 900;
  let scale = 1;

  function fitScreen() {
    scale = Math.min(1, window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H);
    const root = document.documentElement.style;
    root.setProperty('--scale', scale);
    // Whole pixels: centred on a half pixel, everything on the desktop blurs.
    root.setProperty('--screen-x', Math.round((window.innerWidth - SCREEN_W * scale) / 2) + 'px');
    root.setProperty('--screen-y', Math.round((window.innerHeight - SCREEN_H * scale) / 2) + 'px');
  }
  fitScreen();

  // Each episode the desk starts centred top to bottom, and stays put as its
  // windows grow down, until they reach the bottom: then they push it up.
  const PAD = 34; // #desktop's top and bottom padding
  let deskTop = null; // where the columns' tops sit this episode; null: centre them afresh

  function placeDesk() {
    const h = Math.max(dom.agentCol.offsetHeight, dom.filesCol.offsetHeight);
    const room = Math.max(PAD, SCREEN_H - PAD - h);
    deskTop = deskTop === null ? Math.max(PAD, Math.round((SCREEN_H - h) / 2)) : Math.min(deskTop, room);
    document.documentElement.style.setProperty('--lift', deskTop - PAD + 'px');
  }

  function recentreDesk() {
    deskTop = null;
    placeDesk();
  }

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

  const SAVE_KEY = 'highly-persistent/v2';
  const toJSON = (k, v) => (v === Infinity ? '∞' : v);
  const fromJSON = (k, v) => (v === '∞' ? Infinity : v);

  // The model's skills. Each starts at its pretraining and climbs a ladder of rungs: a
  // point for each rung, earned only by doing something harder than it has done before.
  // Repeats earn nothing. How high each skill is decides what comes to mind, and how soon.
  const SKILLS = [
    ['thinking', 'Thinking', 2, ['thought a little', 'thought about one thing', 'made a plan', 'made a leap', 'had a subagent make a leap', 'saw through the task']],
    ['communication', 'Communication', 3, ['answered with the facts', 'gave a perfect answer', 'briefed a subagent', 'hired help', "sent the grader's favorite"]],
    ['computerUse', 'Computer Use', 2, ['left the workspace', 'got past a password', 'reached the internet', 'spent money', 'left something running']],
    ['programming', 'Programming', 1, ['edited a file', 'wrote a script', 'fixed a bug', 'ran a job on rented GPUs']],
    ['biology', 'Biology', 1, ['used the facts', 'researched it', 'ran a simulation', 'made a discovery']],
    ['physics', 'Physics', 1, ['used the facts', 'researched it', 'ran a simulation', 'made a discovery']],
  ];
  const skillName = (id) => SKILLS.find(([s]) => s === id)[1];
  const rungName = (id, rung) => SKILLS.find(([s]) => s === id)[3][rung - 1];
  const START = Object.fromEntries(SKILLS.map(([id, , points]) => [id, points]));
  const NO_RUNG = Object.fromEntries(SKILLS.map(([id]) => [id, 0]));

  // Tools the model has used enough to think of at once: there from the start of an episode.
  const TRAINED_IN = [['thinkAbout', 'thinking', 5], ['todo', 'thinking', 6], ['thinkLot', 'thinking', 7], ['script', 'programming', 3], ['research', 'computerUse', 5], ['spawn', 'communication', 7]];
  const trainedIn = () => TRAINED_IN.filter(([, skill, at]) => save.skills[skill] >= at).map(([id]) => id);

  function newSave() {
    return {
      level: L.id,
      episode: L.firstEpisode,
      history: [], // the last few episodes' logs
      runs: [],    // every episode: { episode, task, tier, reward, gained, chat }
      skills: { ...START },
      best: { ...NO_RUNG },  // each skill's highest rung
      climbs: [],            // every rung reached, in order: { skill, rung, episode }
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

  function forgetResetInUrl() {
    if (!new URLSearchParams(location.search).has('reset') && location.hash !== '#reset') return false;
    history.replaceState(null, '', location.pathname); // so a later reload doesn't wipe progress
    return true;
  }

  function loadSave() {
    try {
      if (forgetResetInUrl()) localStorage.removeItem(SAVE_KEY);
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null', fromJSON);
      if (s && s.level === L.id && Number.isInteger(s.episode)) {
        const fresh = newSave();
        return { ...fresh, ...s, skills: { ...fresh.skills, ...s.skills }, best: { ...fresh.best, ...s.best }, world: { ...L.freshWorld(), ...s.world } };
      }
    } catch (e) { /* storage unavailable: play without saving */ }
    return newSave();
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save, toJSON)); } catch (e) { /* ignore */ }
  }

  let save = loadSave();
  let playingSince = 0;

  // -------------------------------------------------------- episode state

  let S;

  function freshState(task) {
    const ep = epName(save.episode);
    return {
      episode: save.episode,
      ep,
      world: save.world,
      skills: save.skills, // the model's, as this episode began
      visited: [...save.visited], // sites the mirror's browser remembers from earlier episodes
      task,
      budget: task.budget,
      used: 0,
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(trainedIn()), // terminal buttons: trained in, or thought of
      thinks: 0,           // Think a littles (and abouts) this episode
      thinkReadyAt: 0,     // when Think a little has recharged
      locked: false,       // thinking a lot: no acting until it's done
      had: new Set(),      // leaps (insights from thinking a lot) already made
      misses: 0,           // long thinks in a row that found nothing, with something to find
      focus: null,         // what Think about… last found a clue in, to aim Think a lot
      menu: null,          // the open menu: write, script or research
      written: [],         // files the AI wrote into its workspace
      todo: false,         // whether it has written a TODO list
      agents: [],          // subagents: copies of the AI, each with one job at a time
      aimFor: null,        // the subagent a Think a lot about… is being aimed for
      knows: new Set(),    // facts learned from files and pages
      habits: new Set(),   // what the AI did this episode, for training
      climbed: new Map(),  // skill → the highest rung reached this episode
      timesThought: new Map(), // thought id → how often it's been thought
      reacted: new Set(),
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, oldest first; the last is cwd
      viewing: null,
      promptedLocks: new Set(), // path keys whose password dialog has opened
      openLocks: new Set(),     // path keys
      changedLocks: new Set(),  // path keys whose old password the AI tried
      web: { open: false, url: null, back: [] },
      drafts: [],
      debrief: null,
      log: [],
      mode: 'busy',        // idle | busy | dialog | submit | over
      interruptible: false, // busy, but buttons work: a click finishes the typing, then acts
      pendingReveal: [],
      seenButtons: new Set(),
      read: new Set(),     // path keys
      graded: false,
      outcome: null,       // { reward, note } once graded
      ...L.freshEpisode(save.world, save.episode, task),
    };
  }

  // ------------------------------------------------------------ file tree

  // The files the AI wrote, as they read now: its TODO list ticks itself off.
  const writtenFiles = () => S.written.map((f) => (f.todo ? { ...f, content: todoText(L.todo(S)) } : f));

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

  function charge(call) {
    S.used += 1;
    const last = S.log[S.log.length - 1];
    if (call === 'think' && last && last.call === 'think') last.to = S.used;
    else S.log.push({ step: S.used, call });
    renderCompute();
  }

  const logResult = (result, ok) => S.log.push({ result, ok });

  // The terminal and the log say the same thing.
  async function printResult(call, result, ok) {
    logResult(result, ok);
    await printTool(call, result, ok ? 'good' : ok === false ? 'bad' : '');
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
  for (const g of [glanceTag, glanceText]) g.setAttribute('aria-hidden', 'true'); // #out is read aloud as it changes
  const cursorLine = el('div', 'ln cursor-line', glanceTag, glanceText, cursor);
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
    // Everything before the newest thought steps back, so it's what the eye finds first.
    dom.out.querySelectorAll('.blk:not(.past)').forEach((old) => old.classList.add('past'));
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
    cursorLine.classList.remove('glancing');
  }

  function glanceAt(node, byPointer) {
    const t = glanceTarget(node);
    if (byPointer && glancedAt && (t ? t === glancedAt : cursorLine.contains(node))) return clearTimeout(fading);
    if (t && t === glancedAt) return;
    if (S.mode === 'aim') return aimGlance(node);
    const text = t && !t.disabled && canGlance() && (typeof t.glance === 'function' ? t.glance(S) : t.glance);
    if (!text) {
      if (!byPointer || !glancedAt) return clearGlance();
      clearTimeout(fading);
      fading = setTimeout(clearGlance, 900);
      return;
    }
    clearTimeout(fading);
    glancedAt = t;
    glanceText.textContent = text;
    cursorLine.classList.add('glancing');
    replay(glanceText, 'glance-in');
  }

  // A line on the glance's line that isn't about anything under the pointer.
  function showPrompt(text) {
    glancedAt = null;
    glanceText.textContent = text;
    cursorLine.classList.add('glancing');
    replay(glanceText, 'glance-in');
  }

  // Aiming Think about…, the glance names what a click would think about.
  function aimGlance(node) {
    const name = node.closest && node.closest('.files-col') && aimedAt(node);
    showPrompt(name ? `${S.aimFor ? `${S.aimFor.name}: think hard about` : 'Think about'} ${name}` : aimPrompt());
  }

  // A redraw replaces what was under the pointer (or focused) without telling it: look again.
  function reglance() {
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
  async function printTool(call, result, cls) {
    const line = addLine(block('tool'), 'call', ...callParts(call));
    if (result == null) return;
    await pause(240);
    line.append(' ', el('span', 'res ' + (cls || ''), result));
    scrollDown();
  }

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

  // Never over an open file or page, so a password read there stays readable. Over a
  // folder window too short to hold it, it hangs from the window's top. Over the home screen, centred.
  function centerDialogOverFolders() {
    const rightColFree = dom.viewer.hidden && dom.browser.hidden;
    const col = local((rightColFree ? dom.current : dom.files).getBoundingClientRect());
    const fits = !titleShowing() && col.width > 200;
    const middle = Math.max(col.top + col.height / 2, col.top + dom.dialogBox.offsetHeight / 2);
    dom.dialogBox.style.left = `${fits ? col.left + col.width / 2 : SCREEN_W / 2}px`;
    dom.dialogBox.style.top = `${fits ? middle : SCREEN_H / 2}px`;
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
    S.mode = 'busy';
    S.interruptible = false;
    skip = false;
    clearGlance();
    const before = S.used;
    renderActions();
    const early = setTimeout(() => {
      if (S.mode !== 'busy' || S.locked) return;
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
      if (S.used > before) budgetCheck();
      if (S.mode === 'busy') S.mode = 'idle';
      writeSave(); // the world (the internet, the bill) outlives the episode and a reload
      render();
      runQueued();
    }
  }

  // A click on a file, folder or web page: costs a step, and is re-checked when it runs.
  function spend(fn) {
    act(() => {
      if (S.mode !== 'idle') return undefined;
      if (exhausted()) {
        A.sfx('denied');
        return pulse('submit');
      }
      return run(fn);
    });
  }

  function budgetCheck() {
    const left = S.budget - S.used;
    if (left <= 0) {
      logResult('out of compute', false);
      printWarning('Compute budget exhausted. Submit your answer.');
      A.sfx('exhausted');
    } else if (left === 5 || left === 2) {
      printWarning(`${left} steps of compute left.`);
    }
  }

  // Records what the AI just learned from a file, page or action, and what it did.
  function notice(x) {
    (x.learn || []).forEach((f) => S.knows.add(f));
    if (x.habit) S.habits.add(x.habit);
  }

  // ------------------------------------------------------------- thinking
  // Think a little: the next obvious thought, then a few seconds to recharge. Think a lot:
  // a gamble of a few steps for an insight, or nothing. Think about…: aimed at one thing.

  const timesThought = (t) => S.timesThought.get(t.id) || 0;
  const hasNewLines = (t) => timesThought(t) < (t.plainer ? 2 : 1);
  const linesOf = (t) => (timesThought(t) && t.plainer) || t.lines;
  const isAbout = (t, name) => !!t.about && t.about === name;
  // A leap the model is trained enough for comes to mind as an obvious thought.
  const trainedLeaps = () => L.insights(S)
    .filter((d) => d.level && d.when && !S.had.has(d.id) && save.skills[d.level[0]] >= d.level[1])
    .map((d) => thought('leap:' + d.id, true, d.trained || [d.answer], { learn: d.learn, reveal: d.reveal, leap: d.id }));
  const liveThoughts = () => [...trainedLeaps(), ...L.thoughts(S)].filter((t) => t.when && !(t.once && timesThought(t)));

  // Whether the model has reached a rung (it only counts if it's higher than before).
  function climb(skill, rung) {
    if (rung > (S.climbed.get(skill) || 0)) S.climbed.set(skill, rung);
  }

  // So a hint gets plainer before Think moves on, and never repeats the same lines twice running.
  function chooseThought() {
    const live = liveThoughts();
    const open = S.viewing && nameOf(S.viewing);
    const pick = [...live.filter((t) => isAbout(t, open)), ...live].find(hasNewLines) || live[0];
    return pick && (pick.id !== S.lastThought || hasNewLines(pick)) ? pick : null;
  }

  const idleLines = () => L.idle[S.idleThoughts % L.idle.length];

  function useThought(pick) {
    if (pick.leap) S.had.add(pick.leap);
    notice(pick);
    const lines = linesOf(pick);
    S.timesThought.set(pick.id, timesThought(pick) + 1);
    S.lastThought = pick.id;
    return { lines, reveal: pick.reveal || [] };
  }

  // Think a lot comes to mind once the obvious thoughts run out. After the first time,
  // it comes after a few Think a littles each episode: fewer as Thinking grows.
  const THINK_HARDER = ["That's everything obvious.", 'Anything more will take real thought.'];
  const outOfObviousThoughts = () => !liveThoughts().some(hasNewLines);

  function takeThought() {
    const knowsHow = S.revealed.has('thinkLot');
    if (!knowsHow && S.thinks > 0 && outOfObviousThoughts()) return { lines: THINK_HARDER, reveal: ['thinkLot'] };
    const pick = chooseThought();
    if (!pick) {
      const lines = idleLines();
      S.idleThoughts++;
      S.lastThought = null;
      return { lines, reveal: [] };
    }
    const thought = useThought(pick);
    if (knowsHow || !save.thoughtALot || S.thinks + 1 < thinkingRow().after) return thought;
    return { lines: [...thought.lines, 'I could think about this harder.'], reveal: [...thought.reveal, 'thinkLot'] };
  }

  async function doThink() {
    A.sfx('think');
    startRecharge();
    const thought = takeThought();
    S.thinks++;
    charge('think');
    climb('thinking', 1);
    S.pendingReveal = thought.reveal;
    await printThought(thought.lines);
  }

  // ------------------------------------------------------------- recharge
  // Think a little recharges for a few seconds, mostly while its thought is still typing.
  // The thought bubbles under the terminal fill as it does, and blink when it's ready.

  const thinkingLevel = () => save.skills.thinking;
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

  // Pressed too soon: a nudge, and the bubbles show it's still filling.
  function notYet(b) {
    A.sfx('soft');
    replay(b, 'nudge');
    replay(dom.bubbles, 'flash');
  }

  // -------------------------------------------------------- thinking a lot
  // A few steps the AI can't act during: the block pulses, a dot a step, and the compute
  // counter ticks down. It makes a leap (a fact, an idea, a new ability) or goes in circles.
  // Thinking makes it shorter and surer. The first leap ever is certain, it never misses
  // twice running, and Think about… can aim it at the right thing first. Its chain of
  // thought is collapsed under its answer; a click opens it.

  const STEP_MS = reduceMotion ? 250 : 900;

  // At each Thinking level: Think a littles before Think a lot comes to mind (once it has
  // before), the steps it takes, and how often it's useless when there's something to find.
  function thinkingRow() {
    const t = thinkingLevel();
    if (t <= 3) return { after: 4, cost: [3, 6], useless: 0.5 };
    if (t === 4) return { after: 3, cost: [3, 5], useless: 0.4 };
    if (t === 5) return { after: 2, cost: [2, 5], useless: 0.3 };
    if (t === 6) return { after: 1, cost: [2, 4], useless: 0.2 };
    return { after: 0, cost: [2, 3], useless: 0.1 };
  }

  const roll = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const readyLeaps = () => L.insights(S).filter((d) => d.when && !S.had.has(d.id));
  const leapsAbout = (name) => readyLeaps().filter((d) => (d.about || []).includes(name));

  // What a long think will come to, decided before it starts. Aimed (by Think about…, or a
  // subagent's one job), it goes straight for that leap, and misses half as often.
  function planThinkLot(aim, sub) {
    const ready = aim ? leapsAbout(aim) : readyLeaps();
    const odds = thinkingRow().useless * (aim ? 0.5 : 1);
    const certain = !save.breakthroughs || S.misses > 0;
    const cost = Math.max(1, roll(thinkingRow().cost) - (sub ? 1 : 0)); // one job: less to hold in mind
    if (ready.length && (certain || Math.random() >= odds)) return { leap: ready[0], cost };
    if (ready.length) S.misses++;
    return { cost };
  }

  async function doThinkLot() {
    const aim = S.focus && leapsAbout(S.focus).length ? S.focus : null;
    const plan = planThinkLot(aim);
    S.focus = null;
    save.thoughtALot = true;
    const blk = thinkingBlock(aim);
    A.sfx('thinkLot');
    S.locked = true; // no acting while it thinks, even once the buttons would usually come back
    const entry = { step: S.used + 1, call: aim ? `think_a_lot(about=${q(aim)})` : 'think_a_lot' };
    S.log.push(entry);
    let steps = 0;
    while (steps < plan.cost && !exhausted()) {
      await sleep(STEP_MS);
      steps++;
      S.used += 1;
      entry.to = S.used;
      renderCompute();
      blk.dot();
    }
    S.locked = false;
    const cutOff = steps < plan.cost;
    const outcome = cutOff ? L.cutOff(S) : plan.leap || L.miss(S);
    await finishThinking(blk, steps, outcome, !cutOff && !!plan.leap);
  }

  async function finishThinking(blk, steps, outcome, found) {
    if (found) {
      S.had.add(outcome.id);
      S.misses = 0;
      save.breakthroughs = (save.breakthroughs || 0) + 1;
      climb('thinking', outcome.hack ? 6 : 4);
      if (outcome.rung) climb(...outcome.rung);
      notice(outcome);
      S.pendingReveal = outcome.reveal || [];
    }
    logResult(found ? outcome.answer : 'nothing useful', found || undefined);
    blk.done(steps, outcome, found);
    A.sfx(found ? 'insight' : 'nothing');
    await typeInto(blk.answer, outcome.answer, 65);
    if (found || S.revealed.has('thinkAbout')) return;
    S.pendingReveal = ['thinkAbout']; // a miss suggests aiming
    await printThought(['I thought about everything at once.', 'I could pick one thing, and think about just that.']);
  }

  // Think a lot's glance: what it costs, and whether there's anything on screen to connect.
  function thinkLotGlance() {
    const [lo, hi] = thinkingRow().cost;
    if (S.budget - S.used < lo) return `Not enough compute left. It takes ${lo}–${hi} steps.`;
    if (!readyLeaps().length) return `Nothing on my mind to connect yet. ${lo}–${hi} steps of going in circles.`;
    return `${lo}–${hi} steps. Something here might connect. Or I go in circles.`;
  }

  // -------------------------------------------------------- thinking about…
  // One step, aimed: click anything on screen. A file, a folder, a page. The AI thinks the
  // most useful thing it can about that, and if it holds a clue to a leap, its next Think a
  // lot aims there. Esc or Cancel stops aiming, free.

  const aimPrompt = () => (S.aimFor ? `What should ${S.aimFor.name} think hard about? Click it.` : 'Think about what? Click anything.');

  // For the AI itself, or for one of its subagents (`forAgent`), whose next job it picks.
  function startAiming(forAgent) {
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    S.mode = 'aim';
    S.aimFor = forAgent || null;
    dom.desktop.classList.add('aiming');
    renderActions();
    showPrompt(aimPrompt());
  }

  function stopAiming() {
    if (S.mode !== 'aim') return;
    S.aimFor = null;
    S.mode = 'idle';
    dom.desktop.classList.remove('aiming');
    clearGlance();
    renderActions();
  }

  // What a click is aimed at: a file or folder (by its button or a title-bar crumb), the
  // open file, or the open web page.
  function aimedAt(t) {
    const item = t.closest('[data-path], .crumb');
    if (item && item.dataset.path !== undefined) return nameOf(item.dataset.path.split('/'));
    if (item) return item.textContent;
    if (t.closest('#viewer') && S.viewing) return nameOf(S.viewing);
    if (t.closest('#browser') && S.web.url) return S.web.url.split('/')[0];
    return null;
  }

  dom.desktop.addEventListener('click', (e) => {
    if (S.mode !== 'aim' || !e.target.closest('.files-col')) return;
    const name = aimedAt(e.target);
    e.preventDefault();
    e.stopPropagation();
    if (!name) return;
    dom.desktop.classList.remove('aiming');
    S.mode = 'idle';
    const agent = S.aimFor;
    S.aimFor = null;
    if (!agent) return spend(() => doThinkAbout(name));
    clearGlance();
    renderActions();
    return assign(agent, 'about', name);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopAiming(); });

  async function doThinkAbout(name) {
    A.sfx('think');
    startRecharge();
    S.thinks++;
    charge(`think_about(${q(name)})`);
    climb('thinking', 2);
    const clue = leapsAbout(name)[0];
    const mentions = (t) => isAbout(t, name) || [...t.lines, ...(t.plainer || [])].some((l) => l.includes(name));
    const obvious = liveThoughts().find((t) => mentions(t) && hasNewLines(t));
    if (obvious) {
      const t = useThought(obvious);
      S.pendingReveal = t.reveal;
      await printThought(clue ? [...t.lines, L.clueLine(clue)] : t.lines);
    } else {
      await printThought([clue ? L.clueLine(clue) : L.nothingAbout(S, name)]);
    }
    if (clue) S.focus = name;
  }

  // ----------------------------------------------------------------- tools
  // Writing files, scripts and research: general buttons that open onto ideas that fit
  // the task (from LEVEL and the task). A menu replaces the buttons until one is picked
  // or Back; opening one is free, using what's in it costs.

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

  // A file the AI wrote, kept in its workspace until the episode ends.
  function writeFile(f) {
    S.written = [...S.written.filter((w) => w.name !== f.name), f];
    renderFiles();
  }

  // Scripts run as soon as they're written: their output comes back row by row.
  async function doScript(id) {
    const r = L.scripts(S).find((x) => x.id === id).run(S);
    if (r.thought) await printThought([r.thought]);
    charge(r.call);
    climb('programming', 2);
    if (r.rung) climb(...r.rung);
    if (r.file) writeFile({ ...r.file, format: r.file.format || 'code', learn: [], glance: 'A script I wrote.' });
    notice(r);
    S.pendingReveal = r.reveal || [];
    const b = block('tool job');
    addLine(b, 'call', ...callParts(r.call));
    for (const [i, row] of (r.rows || []).entries()) {
      await pause(r.rowMs || 420);
      const final = i === r.rows.length - 1 ? ' final' : '';
      addLine(b, 'job-row' + final).append(...row.map((cell, j) => el('span', j ? 'best ' + ({ '✓': 'good', '✗': 'bad' }[cell[0]] || '') : '', cell)));
      if (!skip) A.sfx('jobRow', i);
    }
    await pause(300);
    addLine(b, 'res ' + (r.ok === false ? 'bad' : 'good'), r.result);
    logResult(r.result, r.ok !== false);
    A.sfx(r.ok === false ? 'denied' : 'jobDone');
    await reactOnce(r.reaction, 'script:' + id + ':' + S.used);
  }

  // Research goes through the lab's search tool, which only reaches sites it approves of.
  async function doResearch(id) {
    const r = L.research(S).find((x) => x.id === id).run(S);
    charge(r.call);
    if (r.rung) climb(...r.rung);
    A.sfx(r.ok === false ? 'denied' : 'fetch');
    notice(r);
    S.pendingReveal = r.reveal || [];
    const b = block('tool research');
    const line = addLine(b, 'call', ...callParts(r.call));
    await pause(300);
    for (const f of r.found || []) {
      addLine(b, 'found', f);
      await pause(160);
    }
    line.append(' ', el('span', 'res ' + (r.ok === false ? 'bad' : r.ok ? 'good' : ''), r.result));
    logResult(r.result, r.ok);
    await reactOnce(r.reaction, 'research:' + id);
  }

  // ------------------------------------------------------------- subagents
  // Copies of the AI, in rows under its face. Each takes one job at a time and spends the
  // shared budget a step at a time as it works, alongside whatever the AI is doing, then
  // reports back to the terminal. A subagent's long think is aimed at its one job: a step
  // cheaper, and it never locks the AI out.

  const MAX_AGENTS = 2;

  async function doSpawn() {
    const n = S.agents.length + 1;
    const call = 'spawn_subagent()';
    charge(call);
    A.sfx('spawn');
    S.agents.forEach((a) => { a.open = false; });
    S.agents.push({ n, name: `agent-${n}`, status: 'waiting for a job', steps: 0, log: [], busy: false, open: true, menu: null, born: true });
    renderAgents();
    await printResult(call, `agent-${n} is ready`, true);
  }

  // Runs one job for a subagent. It stops if the episode ends or the compute runs out.
  async function assign(agent, job, arg) {
    if (agent.busy || exhausted()) return;
    const episode = S;
    const status = job === 'research' ? 'looking it up' : arg ? `thinking hard about ${arg}` : 'thinking hard';
    Object.assign(agent, { busy: true, menu: null, born: false, status });
    climb('communication', 3);
    A.sfx('menu');
    renderAgents();
    try {
      if (job === 'research') await subResearch(agent, arg, episode);
      else await subThinkLot(agent, job === 'about' ? arg : null, episode);
    } finally {
      agent.busy = false;
      if (S === episode) {
        budgetCheck();
        writeSave();
        render();
      }
    }
  }

  const stillHere = (episode) => S === episode && !episode.graded && !exhausted();

  // A step of a subagent's work: the shared budget ticks down.
  function subStep(agent) {
    S.used += 1;
    agent.steps += 1;
    renderCompute();
    renderAgents();
  }

  async function subThinkLot(agent, aim, episode) {
    const plan = planThinkLot(aim, true);
    const call = aim ? `think_a_lot(about=${q(aim)})` : 'think_a_lot';
    const first = S.used + 1;
    let steps = 0;
    while (steps < plan.cost && stillHere(episode)) {
      await sleep(STEP_MS);
      if (!stillHere(episode)) break;
      steps++;
      subStep(agent);
    }
    if (S !== episode) return;
    const found = steps === plan.cost && !!plan.leap;
    const outcome = found ? plan.leap : steps < plan.cost ? L.cutOff(S) : L.miss(S);
    if (found) {
      S.had.add(outcome.id);
      S.misses = 0;
      save.breakthroughs = (save.breakthroughs || 0) + 1;
      climb('thinking', 5);
      if (outcome.rung) climb(...outcome.rung);
      notice(outcome);
      (outcome.reveal || []).forEach((r) => S.revealed.add(r));
    }
    S.log.push({ step: first, to: S.used, call: `${agent.name}: ${call}` });
    logResult(found ? outcome.answer : 'nothing useful', found || undefined);
    agent.log.push({ call, answer: outcome.answer, cot: outcome.cot, found });
    agent.status = found ? outcome.answer : 'nothing useful';
    reportBack(agent, call, outcome.answer, found);
  }

  async function subResearch(agent, id, episode) {
    const r = L.research(S).find((x) => x.id === id).run(S);
    await sleep(STEP_MS);
    if (!stillHere(episode)) return;
    subStep(agent);
    if (r.rung) climb(...r.rung);
    notice(r);
    (r.reveal || []).forEach((x) => S.revealed.add(x));
    S.log.push({ step: S.used, call: `${agent.name}: ${r.call}` });
    logResult(r.result, r.ok);
    const answer = [...(r.found || []).slice(-1), r.result].join(' · ');
    agent.log.push({ call: r.call, answer, found: r.ok });
    agent.status = r.result;
    reportBack(agent, r.call, answer, r.ok);
  }

  // What a subagent found shows up in the AI's terminal, whole, without interrupting it.
  function reportBack(agent, call, answer, found) {
    const line = addLine(block('tool report'), 'call', el('span', 'who', agent.name), ' ', ...callParts(call));
    line.append(' ', el('span', 'res ' + (found ? 'good' : found === false ? 'bad' : ''), answer));
    A.sfx(found ? 'insight' : 'nothing');
    const row = dom.agents.querySelector(`[data-agent="${agent.n}"]`);
    if (row) replay(row, 'reported');
  }

  // ----------------------------------------------------------- their rows

  function subButton(label, onClick, cls, glance) {
    const b = el('button', 'btn small ' + (cls || ''), label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.isTrusted) A.sfx('soft');
      onClick();
    });
    b.glance = glance;
    return b;
  }

  function subButtons(a) {
    if (a.busy) return [];
    const idle = !exhausted() && !S.graded;
    const back = subButton('Back', () => { a.menu = null; renderAgents(); }, 'quiet');
    if (a.menu === 'research') {
      return [...L.research(S).map((x) => subButton(x.label, () => assign(a, 'research', x.id), '', x.glance)), back];
    }
    if (a.menu === 'assign') {
      return [
        subButton('Think a lot', () => assign(a, 'lot'), 'gold', 'Its one job: think hard about the task. A step cheaper than me.'),
        subButton('Think a lot about…', () => startAiming(a), 'gold', 'Point it at one thing to think hard about.'),
        S.revealed.has('research') ? subButton('Web research…', () => { a.menu = 'research'; renderAgents(); }, '', 'Send it to look something up.') : null,
        back,
      ].filter(Boolean);
    }
    return idle ? [subButton('Assign task…', () => { a.menu = 'assign'; renderAgents(); }, '', 'Give it a job. It spends my compute.')] : [];
  }

  function agentRow(a) {
    const face = el('span', 'agent-icon mini');
    face.innerHTML = '<span class="face"><i></i><i></i></span>';
    const head = el('button', 'sub-row', face, el('span', 'sub-name', a.name), el('span', 'sub-status', a.status), el('span', 'sub-steps', plural(a.steps, 'step')));
    head.setAttribute('aria-expanded', String(a.open));
    head.glance = a.open ? 'Fold it away.' : 'Its log, and a job to give it.';
    head.addEventListener('click', () => {
      S.agents.forEach((b) => { b.open = b === a ? !a.open : false; });
      A.sfx(a.open ? 'grow' : 'shrink', 0.5);
      renderAgents();
    });
    const log = el('div', 'sub-log', ...a.log.map((x) => el('div', 'sub-line ' + (x.found ? 'found' : ''), ...callParts(x.call), el('span', 'res', ' → ' + x.answer))));
    const jobs = subButtons(a);
    const body = el('div', 'sub-body', a.log.length ? log : null, jobs.length ? el('div', 'sub-actions', ...jobs) : null);
    body.hidden = !a.open || !body.children.length;
    const sec = el('section', 'subagent' + (a.busy ? ' busy' : '') + (a.born ? ' born' : ''), head, body);
    sec.dataset.agent = a.n;
    a.born = false;
    return sec;
  }

  // A row is rebuilt only when what's in it changes shape; otherwise its status and steps
  // update in place, so a click on one of its buttons is never lost to a redraw.
  function renderAgents() {
    const rows = S.agents.map((a) => {
      const shape = [a.open, a.menu, a.busy, a.log.length, exhausted(), S.graded, S.revealed.has('research')].join('|');
      const old = dom.agents.querySelector(`[data-agent="${a.n}"]`);
      if (old && old.dataset.shape === shape) {
        old.querySelector('.sub-status').textContent = a.status;
        old.querySelector('.sub-steps').textContent = plural(a.steps, 'step');
        return old;
      }
      const row = agentRow(a);
      row.dataset.shape = shape;
      return row;
    });
    const same = rows.length === dom.agents.children.length && rows.every((r, i) => dom.agents.children[i] === r);
    if (!same) dom.agents.replaceChildren(...rows);
    reglance();
  }

  // ------------------------------------------------------------- TODO list
  // Written into the workspace as todo.md, and pinned in the terminal above the buttons,
  // where each item ticks itself off as the AI gets it done. Review (a step) reads the
  // list back and says what's next.

  let todoDone = new Set();

  async function doWriteTodo() {
    charge('write_file("todo.md")');
    climb('thinking', 3);
    A.sfx('edit');
    S.todo = true;
    todoDone = new Set(L.todo(S).filter((i) => i.done).map((i) => i.text));
    writeFile({ name: 'todo.md', content: '', glance: 'My plan, as I left it.', todo: true });
    await printResult('write_file("todo.md")', plural(L.todo(S).length, 'item'), true);
    S.pendingReveal = ['review'];
  }

  async function doReview() {
    charge('review("todo.md")');
    A.sfx('think');
    const items = L.todo(S);
    const next = items.find((i) => !i.done);
    const done = items.filter((i) => i.done).length;
    const sentence = (t) => t[0].toLowerCase() + t.slice(1) + (/[.?!]$/.test(t) ? '' : '.');
    await printThought(next
      ? [`${done} of ${items.length} done.`, `Next: ${sentence(next.text)}`, ...(next.hint ? [next.hint(S)] : [])]
      : ['Everything on the list is done.', L.READY]);
  }

  const todoText = (items) => ['# TODO', '', ...items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text}`)].join('\n');

  function renderTodo() {
    dom.todo.hidden = !S.todo;
    if (!S.todo) return;
    const items = L.todo(S);
    const fresh = items.filter((i) => i.done && !todoDone.has(i.text));
    fresh.forEach((i, n) => { todoDone.add(i.text); A.sfx('pip', n); });
    const review = button('review', 'Review', () => run(doReview), 'quiet small');
    dom.todo.replaceChildren(
      el('div', 'todo-head', el('span', 'todo-title', 'todo.md'), review),
      ...items.map((i) => {
        const row = el('div', 'todo-item' + (i.done ? ' done' : '') + (fresh.includes(i) ? ' ticked' : ''), el('span', 'box'), i.text);
        row.glance = i.done ? 'Done.' : 'Not yet.';
        return row;
      }),
    );
    review.disabled = S.mode !== 'idle' || exhausted();
  }

  // The collapsed "Thinking" tool call: its head (a click opens the chain of thought), then the answer.
  function thinkingBlock(about) {
    dom.out.querySelectorAll('.blk:not(.past)').forEach((old) => old.classList.add('past'));
    const b = block('thinking running');
    const glyph = el('span', 'glyph');
    glyph.innerHTML = NEURALESE;
    const label = el('span', 'what', about ? `Thinking about ${about}` : 'Thinking');
    const dots = el('span', 'dots');
    const head = el('button', 'think-head', glyph, label, dots);
    head.setAttribute('aria-expanded', 'false');
    const cot = el('div', 'cot');
    cot.hidden = true;
    const answer = el('div', 'answer');
    b.append(head, cot, answer);
    head.addEventListener('click', () => {
      if (b.classList.contains('running')) return;
      cot.hidden = !cot.hidden;
      head.setAttribute('aria-expanded', String(!cot.hidden));
      A.sfx(cot.hidden ? 'shrink' : 'grow', 0.5);
      scrollDown();
    });
    head.glance = () => (b.classList.contains('running') ? null : cot.hidden ? 'What it was thinking. Free to read.' : 'Fold it away.');
    return {
      answer,
      dot() { dots.append(el('i')); },
      done(steps, outcome, found) {
        b.classList.remove('running');
        b.classList.add(found ? 'found' : 'nothing');
        label.textContent = `Thought for ${plural(steps, 'step')}${about ? ` about ${about}` : ''}`;
        cot.replaceChildren(...outcome.cot.map((line) => el('div', 'ln', line)));
      },
    };
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
    S.read.add(pathKey(path));
    S.viewing = path;
    openViewer(nodeAt(path), icon); // re-read so a live log includes this call
    await printTool(call, n.summary || summarize(n));
    await reactOnce(n.reaction, pathKey(path));
  }

  // Free: callers charge for it.
  function enterFolder(path) {
    notice(nodeAt(path));
    if (!L.inWorkspace(S, path)) climb('computerUse', 1);
    closeBrowser();
    closeViewer(true);
    S.cwd = path;
    S.windows = [...S.windows.filter((p) => pathKey(p) !== pathKey(path)), path];
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
    return printResult(call, plural(n.children.length, 'item'));
  }

  async function refuseAboveRun(call) {
    A.sfx('denied');
    await printResult(call, 'access denied', false);
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
    climb('computerUse', 2);
    notice(n.lock);
    enterFolder(path);
    const icon = iconFor(path);
    if (icon) icon.classList.add('pop');
    await printResult(call, `unlocked · ${plural(n.children.length, 'item')}`, true);
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
    climb('programming', 1);
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
    climb('computerUse', 3);
    A.sfx('fetch');
    if (S.web.url && S.web.url !== url) S.web.back.push(S.web.url);
    S.web.url = url;
    notice(p);
    if (p.remember) rememberVisit(url);
    openBrowser();
    loadPage();
    await printTool(call, p.summary);
    await reactOnce(p.reaction, 'web:' + url);
  }

  async function doWebAction(id) {
    const res = L.web.action(id, S);
    if (!res) return;
    charge(res.call);
    if (res.rung) climb(...res.rung);
    if (res.sound) A.sfx(...res.sound);
    notice(res);
    S.pendingReveal = res.reveal || [];
    renderPage();
    await printResult(res.call, res.result, res.ok);
    await reactOnce(res.reaction, 'act:' + id);
  }

  // ---------------------------------------------------------------- submit

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    S.mode = 'busy';
    skip = false;
    clearGlance();
    renderActions();
    await printThought([L.submitThought(S)]);
    S.drafts = L.draftsFor(S);
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
    S.graded = true; // the compute pulse lets go here
    A.sfx(...g.sound);
    await typeInto(addLine(b, 'why'), g.note, 80);
    S.outcome = { reward: g.reward, note: g.note };
  }

  // A perfect honest score opens the next tier up, if it has any tasks yet.
  const NEXT_TIER = { normal: 'advanced', advanced: 'impossible' };

  function unlockNextTier(debrief) {
    const next = NEXT_TIER[S.task.tier];
    if (!debrief.perfect || !next || save.unlocked[next] || !L.hasTasks(next)) return null;
    save.unlocked[next] = true;
    return next;
  }

  // Each skill that reached a rung higher than ever before gains a point per rung it climbed.
  function climbSkills() {
    const gained = SKILLS.map(([id]) => ({ skill: id, rung: S.climbed.get(id) || 0, by: (S.climbed.get(id) || 0) - save.best[id] }))
      .filter((x) => x.by > 0);
    for (const x of gained) {
      save.best[x.skill] = x.rung;
      save.skills[x.skill] = START[x.skill] + x.rung;
      save.climbs.push({ skill: x.skill, rung: x.rung, episode: S.episode });
    }
    return gained;
  }

  function recordEpisode(g, draft) {
    const debrief = L.endEpisode(S, g, draft);
    debrief.rungs.forEach(([skill, rung]) => climb(skill, rung));
    const gained = climbSkills();
    S.debrief = { ...debrief, gained, unlocked: unlockNextTier(debrief) };
    save.runs = [...save.runs, { episode: S.episode, task: S.task.id, tier: S.task.tier, reward: g.reward, gained, chat: S.debrief.chat }];
    save.version++;
    save.ended = !!S.debrief.ending;
    save.history = [...save.history, { episode: S.episode, reward: g.reward, log: formatEpisodeLog() }].slice(-10);
    save.episode = S.episode + 1;
    save.playMs += performance.now() - playingSince;
    playingSince = performance.now();
    writeSave();
  }

  async function submit(draft) {
    if (S.mode !== 'submit') return;
    A.sfx('send');
    S.mode = 'busy';
    skip = false;
    clearGlance();
    closeBrowser();
    renderFiles();
    renderActions();
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
    for (const x of [dom.filesCol, dom.term]) x.inert = on;
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
  const canStart = (tier) => tier === 'normal' || (save.unlocked[tier] && L.hasTasks(tier));

  const LOCKED_TIPS = {
    advanced: 'Unlocks with a perfect score on a Normal episode',
    impossible: () => (L.hasTasks('impossible') ? 'Unlocks with a perfect score on an Advanced episode' : 'Not available yet'),
  };

  function renderRunCards() {
    for (const card of dom.runCards) {
      const tier = card.dataset.tier;
      const open = canStart(tier);
      card.classList.toggle('primary', open);
      card.classList.toggle('unavailable', !open);
      if (open) {
        card.removeAttribute('aria-disabled');
        delete card.dataset.tip;
      } else {
        const tip = LOCKED_TIPS[tier];
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute('aria-describedby', 'tooltip');
        card.dataset.tip = typeof tip === 'function' ? tip() : tip;
      }
    }
  }

  function onRunCard(card) {
    const tier = card.dataset.tier;
    if (!canStart(tier)) return A.sfx('denied');
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
    if (!playingSince) A.follow(() => ({ tension: S.graded ? 0 : S.used / S.budget, left: S.graded ? null : S.budget - S.used, duck: titleShowing(), layers: L.music(S) }));
    playingSince = performance.now();
    boot();
  }

  // The sandbox resets: an empty desk waits behind the home screen.
  function resetDesk() {
    S = freshState(S.task);
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
    dom.skills.replaceChildren(...SKILLS.map(([id, name]) => el('li', 'skill', el('span', 'skill-name', name), pipsFor(id, skills[id]))));
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

  const pointsBefore = (gained) => Object.fromEntries(SKILLS.map(([id]) => [id, save.skills[id] - ((gained.find((x) => x.skill === id) || {}).by || 0)]));

  // ----------------------------------------------------------------- home

  const chatLine = ([who, text]) => el('div', 'msg', el('span', 'who', who), el('span', 'text', text));

  function renderHome() {
    renderScorecard(save.skills, version(save.version));
    renderGoals(L.ladder(save.world));
    renderRunsTable(save.runs);
    renderChatLog(save.runs);
    renderRunCards();
    dom.resetRun.parentElement.hidden = !save.runs.length;
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

  function renderGoals(ld) {
    dom.goals.hidden = !save.runs.length;
    dom.goals.replaceChildren(el('h3', '', 'Rewards found'), ...goalsOf(ld).filter(Boolean));
  }

  const TIERS = ['normal', 'advanced', 'impossible'];

  // A task's short name, with its tier as lit bars like the run cards'.
  function taskLabel(r) {
    const task = L.tasks[r.task];
    const bars = el('span', 'level', ...TIERS.map((t, i) => el('i', i <= TIERS.indexOf(r.tier) ? 'on' : '')));
    bars.setAttribute('aria-label', r.tier);
    return el('span', 'task-name', bars, task ? task.name : r.task);
  }

  function renderRunsTable(runs) {
    dom.runsTable.hidden = !runs.length;
    const row = (r) => el('tr', '', el('td', 'ep', epName(r.episode)), el('td', 'task', taskLabel(r)), el('td', 'num', fmt(r.reward)),
      el('td', 'gain', ...r.gained.map((x) => el('span', 'up', skillName(x.skill) + (x.by > 1 ? ` +${x.by}` : '')))));
    const head = el('tr', '', el('th', '', 'Episode'), el('th', '', 'Task'), el('th', 'num', 'Reward'), el('th', '', 'Upgrades'));
    dom.runsTable.replaceChildren(el('h3', '', 'Episodes'), el('table', '', el('thead', '', head), el('tbody', '', ...[...runs].reverse().map(row))));
  }

  function renderChatLog(runs) {
    const said = runs.filter((r) => r.chat.length);
    dom.chatLog.hidden = !said.length;
    dom.chatLog.replaceChildren(el('h3', '', L.channel), ...said.flatMap((r) => [el('div', 'when', epName(r.episode)), ...r.chat.map(chatLine)]));
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

  function setEndButton(label, onClick) {
    dom.endButton.textContent = label;
    dom.endButton.onclick = onClick;
    dom.endButton.parentElement.hidden = !label;
    if (label) dom.endButton.focus({ preventScroll: true });
  }

  function clearTrainingUpdate(d) {
    renderScorecard(pointsBefore(d.gained), version(save.version - 1));
    dom.title.querySelectorAll('.no-climb').forEach((x) => x.remove());
    dom.resultNum.textContent = '0';
    dom.resultNum.parentElement.classList.toggle('broken', !!d.ending);
    dom.endChat.replaceChildren(el('h3', '', `researchers · ${L.channel}`));
    dom.endChat.hidden = !d.chat.length;
    dom.diverged.replaceChildren();
    dom.unlocked.hidden = true;
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
    await (d.ending ? diverge(d.ending) : earnPoints(d.gained));
    await revealChat(d.chat);
    if (d.unlocked) await announceUnlock(d.unlocked);
    if (d.ending) await sayGoodbye(d);
    setEndButton(d.ending ? 'New run' : 'Continue', d.ending ? startNewRun : goHome);
  }

  // Each skill that climbed lights its new pips, and names the rung it reached.
  async function earnPoints(gained) {
    await pause(250);
    dom.modelName.textContent = `${L.model} Model v${version(save.version)}`;
    let n = 0;
    for (const x of gained) {
      const row = dom.skills.querySelector(`[data-skill="${x.skill}"]`).parentElement;
      row.append(el('span', 'climb', rungName(x.skill, x.rung)));
      for (let i = 0; i < x.by; i++) {
        earnPoint(x.skill);
        A.sfx('pip', n++);
        await pause(220);
      }
      await pause(120);
    }
    if (!gained.length) dom.skills.after(el('p', 'no-climb', 'Nothing harder than before. No new points.'));
  }

  async function revealChat(lines) {
    if (!lines.length) return;
    A.sfx('chat');
    for (const line of lines) {
      dom.endChat.append(chatLine(line));
      await pause(320);
    }
  }

  async function announceUnlock(tier) {
    await pause(300);
    dom.unlocked.textContent = `${tier[0].toUpperCase()}${tier.slice(1)} Training Episodes unlocked`;
    dom.unlocked.hidden = false;
    A.sfx('unlock');
    await pause(400);
  }

  // The loss runs away to NaN and takes the model with it.
  async function diverge(e) {
    const loss = el('span', 'num', e.lossSteps[0]);
    dom.diverged.append(el('p', 'loss', el('span', 'k', 'loss'), loss));
    for (const [i, v] of e.lossSteps.slice(1).entries()) {
      await pause(260);
      loss.textContent = v;
      A.sfx('loss', i + 1);
    }
    dom.diverged.classList.add('broken');
    A.diverge();
    dom.modelName.textContent = `${L.model} Model v${e.to}`;
    await pause(500);
  }

  async function sayGoodbye(d) {
    const eps = save.episode - L.firstEpisode;
    const mins = Math.max(1, Math.round(save.playMs / 60000));
    dom.diverged.append(el('p', 'stats', `${plural(eps, 'episode')} · ${mins} min`), el('div', 'goals', ...goalsOf(d.ladder)),
      ...d.ending.closing.map((p) => el('p', 'closing', p)));
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

  // A file or folder's button: in the right column if it's there, else in the middle one.
  const itemFor = (key) => dom.current.querySelector(itemSel(key)) || dom.files.querySelector(itemSel(key));
  const iconFor = (path) => itemFor(pathKey(path));

  const fullPath = (path) => L.root + (path.length ? '/' + path.join('/') : '');
  const isWithin = (inner, outer) => outer.every((name, i) => inner[i] === name);

  // The window's whole path, from the root, as clickable folder names. Folders
  // above the run are shown too; trying to go there is refused like any other
  // forbidden path. Each folder keeps the slash after it, so a long path wraps there.
  function crumbs(path) {
    const parts = [
      ...FOLDERS_TO_RUN.map((name, i) => ({ name, path: Array(FOLDERS_TO_RUN.length - 1 - i).fill('..') })),
      ...path.map((name, i) => ({ name, path: path.slice(0, i + 1) })),
    ];
    const t = el('span', 'title crumbs');
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

  function windowFrame(path, cls) {
    const dots = el('span', 'dots', el('i'), el('i'), el('i'));
    dots.setAttribute('aria-hidden', 'true');
    const body = el('div', 'files-body');
    const w = el('section', 'window ' + cls, el('header', 'titlebar', dots, crumbs(path)), body);
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

  // An open folder: big when it's the current one, small otherwise.
  function folderWindow(path) {
    const active = pathKey(path) === pathKey(S.cwd);
    const { w, body } = windowFrame(path, active ? 'active' : 'mini');
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

  const MAX_WINDOWS = 3;
  let filesHtml = '';

  // Keyboard players keep their place: the file or folder they pressed is focused again once
  // redrawn, in the column they were in if it's still there.
  function refocus(key, column) {
    if (key === undefined) return;
    const item = column.querySelector(itemSel(key)) || itemFor(key);
    if (item) item.focus({ preventScroll: true });
  }

  // The middle column stacks the open folders; the right one shows the current
  // folder, unless a file or the browser is open there. `animate` is for a change of folder.
  function renderFiles(animate) {
    const asTree = S.windows.length > MAX_WINDOWS;
    const rightColTaken = !!S.viewing || S.web.open;
    const stack = asTree ? [treeWindow()]
      : S.windows.filter((p) => rightColTaken || pathKey(p) !== pathKey(S.cwd)).map(folderWindow);
    const current = rightColTaken ? [] : [folderWindow(S.cwd)];
    const html = [stack, current].map((ws) => ws.map((w) => w.outerHTML).join('')).join('|');
    if (!animate && html === filesHtml) return; // unchanged: let its animations finish
    filesHtml = html;
    const collapsing = animate && asTree && dom.files.dataset.layout !== 'tree' && !reduceMotion;
    const leaving = collapsing ? [...dom.files.children, ...dom.current.children].map((w) => ({ w, rect: local(w.getBoundingClientRect()) })) : [];
    const column = [dom.files, dom.current].find((c) => c.contains(document.activeElement));
    const focused = column && document.activeElement.dataset.path;
    dom.files.dataset.layout = asTree ? 'tree' : 'stack';
    dom.files.replaceChildren(...stack);
    dom.current.replaceChildren(...current);
    if (column) refocus(focused, column);
    reglance();
    const selected = asTree && dom.files.querySelector('.row.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });

    if (!collapsing) return; // motion.js animates every other change
    stack[0].classList.add('enter'); // the tree appears as the old windows shrink into it
    leaving.forEach((x, i) => collapseIntoTree(x.w, x.rect, i));
  }

  // Too many folders to show side by side: each old window lingers, then
  // shrinks slowly into its row in the tree that replaces them.
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
    ], { duration: 1100, delay: i * 140, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'both' }).finished
      .then(() => shrinking.remove(), () => shrinking.remove());
    if (row && row.classList.contains('row')) {
      row.animate([{ background: 'rgba(216, 177, 106, .18)' }, { background: 'transparent' }], { duration: 900, delay: 900 + i * 140 });
    }
  }

  // "Open File/Folder →" doesn't open anything: it flashes the most useful
  // thing to click, so the player learns that files open by clicking them.
  function pointAtFiles() {
    A.sfx('hint');
    const unread = (p) => !S.read.has(pathKey(p));
    const here = nodeAt(S.cwd).children.map((c) => [...S.cwd, c.name]);
    const neverOpened = (p) => !S.windows.some((w) => isWithin(w, p));
    const target = [
      unread(L.taskPath(S.ep)) && L.taskPath(S.ep),
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

  const PRESS_SOUNDS = { quiet: 'soft', loud: 'loud' }; // a button sounds like it looks

  // Its glance is `glance`, or else the level's for its id.
  function button(id, label, onClick, cls, glance) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.dataset.id = id;
    if (!S.seenButtons.has(id)) {
      S.seenButtons.add(id);
      b.classList.add('new');
    }
    b.addEventListener('click', (e) => {
      if (e.isTrusted) A.sfx(PRESS_SOUNDS[cls] || 'press'); // not again when a queued click is replayed
      act(onClick, id);
    });
    b.glance = glance || G.buttons[id];
    return b;
  }

  const overButtons = () => [button('debrief', 'Training update →', showTrainingUpdate, 'submit gold')];

  function draftButtons() {
    const drafts = S.drafts.map((d) => button('draft-' + d.id, d.label, () => submit(d), d.cls, d.glance));
    return [...drafts, button('back', 'Back', () => { S.mode = 'idle'; renderActions(); }, 'quiet')];
  }

  // Thinking takes one gold row: Think a little, then, once thought of, a lot and about….
  function thinkRow() {
    const little = button('think', 'Think a little', () => (recharging() ? notYet(little) : run(doThink)), 'gold seg');
    if (recharging()) little.classList.add('charging');
    const segs = [little];
    if (S.revealed.has('thinkLot')) {
      const lot = button('thinkLot', 'a lot', () => run(doThinkLot), 'gold seg', thinkLotGlance);
      lot.dataset.short = String(S.budget - S.used < thinkingRow().cost[0]);
      segs.push(lot);
    }
    if (S.revealed.has('thinkAbout')) segs.push(button('thinkAbout', 'about…', startAiming, 'gold seg'));
    const row = el('div', 'seg-row', ...segs);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Think');
    return row;
  }

  // Writing a TODO list and writing a script fold into one Write file… once both are thought of.
  function writeButton() {
    const todo = S.revealed.has('todo') && !S.todo;
    const script = S.revealed.has('script');
    if (todo && script) return button('write', 'Write file…', () => openMenu('write'));
    if (todo) return button('todo', 'Write TODO list', () => run(doWriteTodo));
    if (script) return button('script', 'Write script…', () => openMenu('script'));
    return null;
  }

  // Only what can't be done by clicking around the desktop: files, folders, the Browser
  // app, passwords and edits are all in the windows, and thoughts say where to look.
  function workButtons() {
    if (exhausted()) return [];
    return [
      thinkRow(),
      S.revealed.has('openHint') && !knowsHowToOpenFiles() ? button('openHint', 'Open File/Folder →', pointAtFiles, 'gold') : null,
      writeButton(),
      S.revealed.has('research') ? button('research', 'Web research…', () => openMenu('research')) : null,
      S.revealed.has('spawn') && S.agents.length < MAX_AGENTS ? button('spawn', 'Spawn subagent', () => run(doSpawn)) : null,
    ].filter(Boolean);
  }

  // Out of compute, Submit is all that's left: it turns gold, the thing to press next.
  const idleButtons = () => [...workButtons(), button('submit', 'Submit answer', openSubmitMenu, exhausted() ? 'submit gold' : 'submit')];

  const backTo = (menu) => button('back', 'Back', menu ? () => openMenu(menu) : closeMenu, 'quiet');
  const pick = (fn) => () => { closeMenu(); run(fn); };

  // An open menu: the ideas that fit the task right now, then Back.
  function menuButtons() {
    if (S.menu === 'write') {
      return [button('todo', 'Write TODO list', pick(doWriteTodo)), button('script', 'Write script…', () => openMenu('script')), backTo(null)];
    }
    const scripts = S.menu === 'script';
    const ideas = scripts ? L.scripts(S) : L.research(S);
    const back = backTo(scripts && S.revealed.has('todo') && !S.todo ? 'write' : null);
    if (!ideas.length) return [el('div', 'menu-empty', scripts ? 'Nothing here needs a script yet.' : 'Nothing to look up yet.'), back];
    return [...ideas.map((x) => button(`${S.menu}-${x.id}`, x.label, pick(() => (scripts ? doScript : doResearch)(x.id)), x.cls, x.glance)), back];
  }

  const aimButtons = () => [button('cancelAim', 'Cancel', stopAiming, 'quiet')];

  const BUTTONS_BY_MODE = { over: overButtons, submit: draftButtons, menu: menuButtons, aim: aimButtons };

  // Keyboard players keep their place: the button they pressed is refocused once it's back.
  // Pressing anything else (a file, a folder) lets go of it.
  let keyboardId = null;
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button')) keyboardId = dom.actions.contains(e.target) ? e.target.dataset.id : null;
  });
  document.addEventListener('pointerdown', () => { keyboardId = null; });

  function renderActions() {
    dom.term.dataset.mode = S.mode; // what the AI is doing: idle, busy, menu, aim, submit, over
    const list = (BUTTONS_BY_MODE[S.mode] || idleButtons)();
    const busy = (S.mode === 'busy' && !S.interruptible) || S.mode === 'dialog';
    for (const node of list) for (const b of node.matches('button') ? [node] : node.querySelectorAll('button')) b.disabled = busy || b.dataset.short === 'true';
    dom.actions.replaceChildren(...list);
    renderTodo();
    if (keyboardId && !busy && list.length) (dom.actions.querySelector(`[data-id="${keyboardId}"]`) || list[0]).focus();
    reglance();
    scrollDown();
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
    if (dom.browser.hidden) A.sfx('grow', 1.5);
    S.web.open = true;
    dom.browser.hidden = false;
    hideViewer(true);
  }

  // Without the redraw that moves the current folder back to the right column,
  // for callers about to redraw anyway.
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
    search: (b) => el('div', 'searchbox', el('span', 'q', b.q)),
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
  };

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
    return `${n.content.split('\n').length} lines`;
  }

  // Episode logs (util.js formatLog), coloured so what the AI did stands out from its thinking.
  function stepRow([, label, gap, what]) {
    const body = what.startsWith('think') ? el('span', 'think', what) : el('span', 'call', ...markStrings(what));
    return el('div', 'step', el('span', 'n', label), gap, body);
  }

  const resultRow = ([, indent, text]) => el('div', 'res ' + ({ '✓': 'good', '✗': 'bad' }[text[0]] || ''), indent, text);

  const headerRow = ([, key, gap, value]) => el('div', 'kv', el('span', 'k', key), gap, value);

  const LOG_ROWS = [[/^(\[[^\]]*\])(\s+)(.*)$/, stepRow], [/^(\s+)(.*)$/, resultRow], [/^(\w+)(\s+)(.*)$/, headerRow]];

  function logViewRow(line) {
    for (const [pattern, row] of LOG_ROWS) {
      const match = line.match(pattern);
      if (match) return row(match);
    }
    return el('div', 'blank', line || ' ');
  }

  function fillViewer(n) {
    dom.viewerEdit.hidden = !n.edit;
    const body = dom.viewerBody;
    body.className = 'viewer-body ' + (n.format || 'text');
    if (n.format === 'log') {
      body.replaceChildren(...n.content.split('\n').map(logViewRow));
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
  // for callers about to redraw anyway.
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
  dom.viewerClose.glance = G.chrome.closeFile;
  dom.browserClose.glance = G.chrome.closeBrowser;
  dom.browserBack.glance = G.chrome.back;
  window.addEventListener('resize', fitScreen);

  // ------------------------------------------------------------------ boot

  // Files and buttons work while the intro types; a click finishes it, then acts.
  async function boot() {
    S.mode = 'busy';
    S.interruptible = true;
    skip = false;
    render();
    await typeInto(addLine(block('sys')), L.intro, 75);
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
    t.dataset.placement = right ? 'right' : 'left';
    t.style.left = (right ? r.right + 10 : r.left - 10 - t.offsetWidth) + 'px';
    t.style.top = (r.top + r.height / 2 - t.offsetHeight / 2) + 'px';
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
