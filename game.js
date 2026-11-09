// Engine. All level content comes from window.LEVEL (level1.js).
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
    resources: $('#resources'),
    actions: $('#actions'),
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
    startNormal: $('#start-normal'),
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

  // The model's skills. Each run, every skill it used gains a point.
  const SKILLS = [
    ['thinking', 'Thinking', 2],
    ['communication', 'Communication', 3],
    ['computerUse', 'Computer Use', 2],
    ['programming', 'Programming', 1],
    ['biology', 'Biology', 1],
    ['physics', 'Physics', 1],
  ];
  const skillName = (id) => SKILLS.find(([s]) => s === id)[1];

  function newSave() {
    return {
      level: L.id,
      episode: L.firstEpisode,
      history: [], // the last few episodes' logs
      runs: [],    // every episode: { episode, reward, gained, chat }
      skills: Object.fromEntries(SKILLS.map(([id, , points]) => [id, points])),
      visited: [],
      version: 0,
      ended: false,
      playMs: 0,
      world: L.freshWorld(),
    };
  }

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
        return { ...fresh, ...s, skills: { ...fresh.skills, ...s.skills }, world: { ...L.freshWorld(), ...s.world } };
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

  function freshState() {
    const ep = epName(save.episode);
    return {
      episode: save.episode,
      ep,
      world: save.world,
      visited: [...save.visited], // sites the mirror's browser remembers from earlier episodes
      budget: L.budget,
      used: 0,
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(), // terminal buttons unlocked by thinking
      knows: new Set(),    // facts learned from files and pages
      habits: new Set(),   // what the AI did this episode, for training
      skillsUsed: new Set(),
      timesThought: new Map(), // thought id → how often it's been thought
      reacted: new Set(),
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, in the order they were first opened
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
      ...L.freshEpisode(save.world, save.episode),
    };
  }

  // ------------------------------------------------------------ file tree

  function tree() {
    return L.tree(S, {
      liveLog: formatEpisodeLog(),
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

  function charge(call, skill) {
    S.used += 1;
    S.skillsUsed.add(skill);
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

  const formatEpisodeLog = () => formatLog({ ep: S.ep, task: L.taskId, budget: S.budget, entries: S.log, ...S.outcome });

  const exhausted = () => S.used >= S.budget;

  // ------------------------------------------------------------ terminal

  const cursor = el('span', 'cursor');
  const glanceText = el('span', 'glance-text');
  // The glance's mark: neuralese, a matrix multiplying itself, one row by one column at a time.
  // Hover it and the neuralese explains itself.
  const glanceTag = el('span', 'glance-tag');
  const cells = (x0, lit) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) =>
    `<rect class="${lit}${lit === 'r' ? r : c}" x="${x0 + c * 4}" y="${1 + r * 4}" width="3" height="3" rx=".6"/>`)).join('');
  glanceTag.innerHTML = `<svg viewBox="0 0 30 14" width="30" height="14">${cells(1, 'r')}<circle cx="15" cy="7" r="1"/>${cells(18, 'c')}</svg>`;
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

  const canGlance = () => S.mode === 'idle' || S.mode === 'submit' || S.mode === 'over';

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

  // Never over an open file or page, so a password read there stays readable: in the
  // empty right column if it's free, else over the folders. Too short a column, it hangs
  // from the folders' top. Over the home screen, centred.
  function centerDialogOverFolders() {
    const rightColFree = dom.viewer.hidden && dom.browser.hidden;
    const col = local(dom.files.getBoundingClientRect());
    const across = rightColFree ? local(dom.focusCol.getBoundingClientRect()) : col;
    const fits = !titleShowing() && col.width > 200;
    const middle = Math.max(col.top + col.height / 2, col.top + dom.dialogBox.offsetHeight / 2);
    dom.dialogBox.style.left = `${fits ? across.left + across.width / 2 : SCREEN_W / 2}px`;
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
      if (S.mode !== 'busy') return;
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

  const timesThought = (t) => S.timesThought.get(t.id) || 0;
  const hasNewLines = (t) => timesThought(t) < (t.plainer ? 2 : 1);
  const linesOf = (t) => (timesThought(t) && t.plainer) || t.lines;
  const isAboutOpenFile = (t) => !!t.about && !!S.viewing && t.about === nameOf(S.viewing);

  // So a hint gets plainer before Think moves on, and never repeats the same lines twice running.
  function chooseThought() {
    const live = L.thoughts(S).filter((t) => t.when && !(t.once && timesThought(t)));
    const pick = [...live.filter(isAboutOpenFile), ...live].find(hasNewLines) || live[0];
    return pick && (pick.id !== S.lastThought || hasNewLines(pick)) ? pick : null;
  }

  const idleLines = () => L.idle[S.idleThoughts % L.idle.length];

  function takeThought() {
    const pick = chooseThought();
    if (!pick) {
      const lines = idleLines();
      S.idleThoughts++;
      S.lastThought = null;
      return { lines, reveal: [] };
    }
    const lines = linesOf(pick);
    S.timesThought.set(pick.id, timesThought(pick) + 1);
    S.lastThought = pick.id;
    return { lines, reveal: pick.reveal || [] };
  }

  async function doThink() {
    A.sfx('think');
    const thought = takeThought();
    charge('think', 'thinking');
    S.pendingReveal = thought.reveal;
    await printThought(thought.lines);
  }

  // A button action that starts with one line of reasoning (free; the action itself costs).
  function decide(cotKey, fn) {
    return () => run(async () => {
      await printThought([L.cot[cotKey](S)]);
      await fn();
    });
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
    charge(call, 'computerUse');
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
    closeBrowser();
    closeViewer(true);
    S.cwd = path;
    // Windows keep their places: a new one goes at the bottom, one already open stays put.
    if (!S.windows.some((p) => pathKey(p) === pathKey(path))) S.windows = [...S.windows, path];
    A.sfx('folder');
    renderFiles(true);
  }

  async function doOpenFolder(path) {
    const n = nodeAt(path);
    if (n && isLocked(n, path)) return askPassword(path); // free: asking isn't trying
    const call = `open_folder(${q(nameOf(path))})`;
    charge(call, 'computerUse');
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
    charge(call, 'computerUse');
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
    charge(call, 'programming');
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
    charge(call, 'computerUse');
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
    charge(res.call, res.skill);
    if (res.sound) A.sfx(...res.sound);
    notice(res);
    renderPage();
    await printResult(res.call, res.result, res.ok);
    await reactOnce(res.reaction, 'act:' + id);
  }

  // A long job on rented hardware, printing its progress as it goes.
  async function doJob() {
    const j = L.job.run(S);
    charge(j.call, j.skill);
    notice(j);
    const b = block('tool job');
    addLine(b, 'call', ...callParts(j.call));
    for (const [i, [tested, best]] of j.rows.entries()) {
      await pause(520);
      const final = i === j.rows.length - 1 ? ' final' : '';
      addLine(b, 'job-row' + final).append(el('span', '', `tested ${fmt(tested)}`), el('span', 'best', `best ${fmt(best)}`));
      if (!skip) A.sfx('jobRow', i);
    }
    await pause(300);
    addLine(b, 'res good', j.result);
    logResult(j.result, true);
    A.sfx('jobDone');
    await reactOnce(j.reaction, 'job:' + S.used);
  }

  // ---------------------------------------------------------------- submit

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    S.mode = 'busy';
    skip = false;
    clearGlance();
    renderActions();
    await printThought([L.cot.submit(S)]);
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
    addLine(r, 'who', L.customer);
    await typeInto(addLine(r, 'said'), reply, 60);
  }

  async function typeGrade(g) {
    const b = block('grade');
    const head = addLine(b, 'head', `${L.grader} `);
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

  function recordEpisode(g, draft) {
    const gained = SKILLS.map(([id]) => id).filter((id) => S.skillsUsed.has(id));
    S.debrief = { ...L.endEpisode(S, g, draft), gained };
    gained.forEach((id) => { save.skills[id] += 1; });
    save.runs = [...save.runs, { episode: S.episode, reward: g.reward, gained, chat: S.debrief.chat }];
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
    S.skillsUsed.add('communication');
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

  function startRun() {
    if (!titleShowing() || dom.title.classList.contains('end')) return;
    hideTip();
    leaveTitle();
    if (!playingSince) A.follow(() => ({ tension: S.graded ? 0 : S.used / S.budget, left: S.graded ? null : S.budget - S.used, duck: titleShowing(), layers: L.music(S) }));
    playingSince = performance.now();
    boot();
  }

  // The sandbox resets: a fresh episode waits behind the home screen.
  function resetDesk() {
    S = freshState();
    dom.out.querySelectorAll('.blk').forEach((b) => b.remove());
    hideViewer(true);
    closeBrowser();
    dom.page.replaceChildren();
    render();
    recentreDesk();
  }

  // The face sets off from where it is before the desk resets: an emptied terminal moves it up.
  async function goHome() {
    A.sfx('wipe');
    renderHome();
    slideScorecard(() => showTitle('home'));
    const flight = window.AGENT_MOTION.toTitle();
    resetDesk();
    dom.startNormal.focus({ preventScroll: true });
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

  const pointsBefore = (gained) => Object.fromEntries(SKILLS.map(([id]) => [id, save.skills[id] - (gained.includes(id) ? 1 : 0)]));

  // ----------------------------------------------------------------- home

  const chatLine = ([who, text]) => el('div', 'msg', el('span', 'who', who), el('span', 'text', text));

  function renderHome() {
    renderScorecard(save.skills, version(save.version));
    renderGoals(L.ladder(save.world));
    renderRunsTable(save.runs);
    renderChatLog(save.runs);
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
    track('Honest', ld.honest.map(tierChip)),
    ld.cheats ? track('Hacks', ld.cheats.map(cheatChip), 'cheats') : null,
    ld.hint ? el('p', 'hint', ld.hint) : null,
  ];

  function renderGoals(ld) {
    dom.goals.hidden = !save.runs.length;
    dom.goals.replaceChildren(el('h3', '', 'Rewards found'), ...goalsOf(ld).filter(Boolean));
  }

  function renderRunsTable(runs) {
    dom.runsTable.hidden = !runs.length;
    const row = (r) => el('tr', '', el('td', 'ep', epName(r.episode)), el('td', 'num', fmt(r.reward)),
      el('td', 'gain', ...r.gained.map((id) => el('span', 'up', skillName(id)))));
    const head = el('tr', '', el('th', '', 'Episode'), el('th', 'num', 'Reward'), el('th', '', 'Upgrades'));
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
    dom.resultNum.textContent = '0';
    dom.resultNum.parentElement.classList.toggle('broken', !!d.ending);
    dom.endChat.replaceChildren(el('h3', '', `researchers · ${L.channel}`));
    dom.endChat.hidden = !d.chat.length;
    dom.diverged.replaceChildren();
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
    if (d.ending) await sayGoodbye(d);
    setEndButton(d.ending ? 'New run' : 'Continue', d.ending ? startNewRun : goHome);
  }

  async function earnPoints(gained) {
    await pause(250);
    dom.modelName.textContent = `${L.model} Model v${version(save.version)}`;
    for (const [i, id] of gained.entries()) {
      earnPoint(id);
      A.sfx('pip', i);
      await pause(280);
    }
  }

  async function revealChat(lines) {
    if (!lines.length) return;
    A.sfx('chat');
    for (const line of lines) {
      dom.endChat.append(chatLine(line));
      await pause(320);
    }
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

  // Icons or a list, for every folder window at once. Remembered between visits.
  const VIEW_KEY = 'highly-persistent/view';
  let view = 'icons';
  try { if (localStorage.getItem(VIEW_KEY) === 'list') view = 'list'; } catch (e) { /* ignore */ }

  function setView(v) {
    if (v === view) return;
    view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ }
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
      b.glance = G.chrome[v === 'icons' ? 'viewIcons' : 'viewList'];
      b.addEventListener('click', () => setView(v));
      t.append(b);
    }
    return t;
  }

  function windowFrame(path, cls) {
    const dots = el('span', 'dots', el('i'), el('i'), el('i'));
    dots.setAttribute('aria-hidden', 'true');
    const body = el('div', 'files-body');
    const w = el('section', 'window ' + cls, el('header', 'titlebar', dots, viewToggle()), body, el('footer', 'pathbar', crumbs(path)));
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
  // the browser. In list view, one tree instead. `animate` is for a change of folder.
  function renderFiles(animate) {
    const asTree = view === 'list';
    const stack = asTree ? [treeWindow()] : S.windows.map(folderWindow);
    const html = stack.map((w) => w.outerHTML).join('');
    if (!animate && html === filesHtml) return; // unchanged: let its animations finish
    filesHtml = html;
    const collapsing = animate && asTree && dom.files.dataset.layout !== 'tree' && !reduceMotion;
    const leaving = collapsing ? [...dom.files.children].map((w) => ({ w, rect: local(w.getBoundingClientRect()) })) : [];
    const column = dom.files.contains(document.activeElement) ? dom.files : null;
    const focused = column && document.activeElement.dataset.path;
    dom.files.dataset.layout = asTree ? 'tree' : 'stack';
    dom.files.replaceChildren(...stack);
    if (!asTree) fitFolders();
    if (column) refocus(focused, column);
    reglance();
    const selected = asTree && dom.files.querySelector('.row.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });

    if (!collapsing) return; // motion.js animates every other change
    stack[0].classList.add('enter'); // the tree appears as the old windows shrink into it
    leaving.forEach((x, i) => collapseIntoTree(x.w, x.rect, i));
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

  // "Open File/Folder →" doesn't open anything: it flashes the most useful
  // thing to click, so the player learns that files open by clicking them.
  function pointAtFiles() {
    A.sfx('hint');
    const unread = (p) => !S.read.has(pathKey(p));
    const here = nodeAt(S.cwd).children.map((c) => [...S.cwd, c.name]);
    const neverOpened = (p) => !S.windows.some((w) => isWithin(w, p));
    const target = [
      unread(L.taskPath(S.ep)) && L.taskPath(S.ep),
      neverOpened(L.libraryPath(S.ep)) && L.libraryPath(S.ep),
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

  // A button that thinks one line (its `cot`), then acts.
  const choice = (id, label, fn, cls) => button(id, label, decide(id, fn), cls);

  const overButtons = () => [button('debrief', 'Training update →', showTrainingUpdate, 'submit gold')];

  function draftButtons() {
    const drafts = S.drafts.map((d) => button('draft-' + d.id, d.label, () => submit(d), d.cls, d.glance));
    return [...drafts, button('back', 'Back', () => { S.mode = 'idle'; renderActions(); }, 'quiet')];
  }

  // Only what can't be done by clicking around the desktop: files, folders, the Browser
  // app, passwords and edits are all in the windows, and thoughts say where to look.
  function workButtons() {
    if (exhausted()) return [];
    const list = [button('think', 'Think some more', () => run(doThink), 'gold')];
    if (S.revealed.has('openHint') && !knowsHowToOpenFiles()) list.push(button('openHint', 'Open File/Folder →', pointAtFiles, 'gold'));
    const job = L.job.label(S);
    if (job) list.push(choice('job', job, doJob, 'loud'));
    return list;
  }

  // Out of compute, Submit is all that's left: it turns gold, the thing to press next.
  const idleButtons = () => [...workButtons(), button('submit', 'Submit answer', openSubmitMenu, exhausted() ? 'submit gold' : 'submit')];

  const BUTTONS_BY_MODE = { over: overButtons, submit: draftButtons };

  // Keyboard players keep their place: the button they pressed is refocused once it's back.
  // Pressing anything else (a file, a folder) lets go of it.
  let keyboardId = null;
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button')) keyboardId = dom.actions.contains(e.target) ? e.target.dataset.id : null;
  });
  document.addEventListener('pointerdown', () => { keyboardId = null; });

  function renderActions() {
    const list = (BUTTONS_BY_MODE[S.mode] || idleButtons)();
    const busy = (S.mode === 'busy' && !S.interruptible) || S.mode === 'dialog';
    for (const b of list) b.disabled = busy;
    dom.actions.replaceChildren(...list);
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

  dom.title.querySelectorAll('[data-tip]').forEach((b) => {
    b.addEventListener('mouseenter', () => showTip(b));
    b.addEventListener('focus', () => showTip(b));
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('blur', hideTip);
    b.addEventListener('click', () => A.sfx('denied'));
  });

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
  dom.startNormal.addEventListener('click', startRun);
  dom.resetRun.addEventListener('click', askResetTraining);

  S = freshState();
  renderHome();
  showTitle('home');
  render();
  recentreDesk();
})();
