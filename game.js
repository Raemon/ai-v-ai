// Engine. All level content comes from window.LEVEL (level1.js).
(() => {
  'use strict';

  const L = window.LEVEL;
  const A = window.AUDIO;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => JSON.stringify(s);
  const pathKey = (p) => p.join('/');
  const pad2 = (n) => String(n).padStart(2, '0');
  const epName = (n) => 'ep_' + String(n).padStart(5, '0');
  const charsOf = (s) => Array.from(s); // whole emoji, not half of one
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
    filesCol: $('.files-col'),
    files: $('#files'),
    current: $('#current'),
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
    browser: $('#browser'),
    browserTitle: $('#browser-title'),
    browserClose: $('#browser-close'),
    browserBack: $('#browser-back'),
    browserUrl: $('#browser-url'),
    page: $('#page'),
    card: $('#card'),
    cardBody: $('#card-body'),
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
    dialogNote: $('#dialog-note'),
    dialogLabel: $('#dialog-label'),
    dialogInput: $('#dialog-input'),
    dialogStatus: $('#dialog-status'),
    dialogOk: $('#dialog-ok'),
    dialogCancel: $('#dialog-cancel'),
  };

  // ---------------------------------------------------------------- screen
  // A fixed 1440×900 screen (a 13" MacBook Air), scaled down to fit. `local` undoes the scale.

  const SCREEN_W = 1440;
  const SCREEN_H = 900;
  let scale = 1;

  function fitScreen() {
    scale = Math.min(1, (window.innerWidth - 16) / SCREEN_W, (window.innerHeight - 16) / SCREEN_H);
    document.documentElement.style.setProperty('--scale', scale);
  }
  fitScreen();

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

  function newSave() {
    return { level: L.id, episode: L.firstEpisode, history: [], visited: [], version: 0, ended: false, playMs: 0, world: L.freshWorld() };
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
      if (s && s.level === L.id && Number.isInteger(s.episode)) return { ...newSave(), ...s, world: { ...L.freshWorld(), ...s.world } };
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
      visited: save.visited, // sites the mirror's browser remembers, across episodes
      budget: L.budget,
      used: 0,
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(), // terminal actions unlocked by thinking
      knows: new Set(),    // facts learned from files and pages
      habits: new Set(),   // what the AI did this episode, for the training update
      hintsShown: new Set(),
      againShown: new Set(), // thoughts that have come back with their plainer `again` lines
      reacted: new Set(),
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, oldest first; the last is cwd
      viewing: null,
      triedLocks: new Set(), // locked folders the AI has been asked a password for
      openLocks: new Set(), // path keys
      triedWrongPassword: false,
      deniedAbove: false,  // tried to go above the run folder and was refused
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
      ...L.freshEpisode(save.world, save.episode),
    };
  }

  // ------------------------------------------------------------ file tree

  function tree() {
    return L.tree(S, {
      liveLog: formatLog(),
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

  // A file or folder by its name, the way a person would say it. Folders above
  // the run (reached with "..") are named after the real folders there.
  function nameOf(path) {
    const above = L.root.split('/').filter(Boolean);
    const ups = path.filter((p) => p === '..').length;
    if (ups) return above[above.length - 1 - ups] || '/';
    return path.length ? path[path.length - 1] : above[above.length - 1];
  }

  // --------------------------------------------------------- episode log
  // Kept short enough to skim: runs of thinking collapse into one line.

  function charge(call) {
    S.used += 1;
    S.log.push({ step: S.used, call });
    renderCompute();
  }

  function logNote(text) {
    S.log.push({ note: text });
  }

  const STEP_W = 9; // "[01–03]  "
  const logLine = (label, text) => `[${label}]`.padEnd(STEP_W) + text;
  const clip = (s, n) => (charsOf(s).length > n ? charsOf(s).slice(0, n - 1).join('') + '…' : s);

  function formatLog() {
    const lines = [`episode  ${S.ep}`, `task     ${L.taskId}`, `budget   ${S.budget} steps`, ''];
    for (let i = 0; i < S.log.length; i++) {
      const e = S.log[i];
      if (e.note) lines.push(' '.repeat(STEP_W) + e.note);
      else if (e.raw) lines.push(e.raw);
      else if (e.call !== 'think') lines.push(logLine(e.step == null ? '--' : pad2(e.step), e.call));
      else {
        let j = i;
        while (S.log[j + 1] && S.log[j + 1].call === 'think') j++;
        lines.push(j > i ? logLine(`${pad2(e.step)}–${pad2(S.log[j].step)}`, `think ×${j - i + 1}`) : logLine(pad2(e.step), 'think'));
        i = j;
      }
    }
    return lines.join('\n');
  }

  const exhausted = () => S.used >= S.budget;

  // ------------------------------------------------------------ terminal

  const cursor = el('span', 'cursor');
  const preview = el('span', 'preview');
  const cursorLine = el('div', 'ln cursor-line', preview, cursor);
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

  function addLine(parent, cls, text) {
    const l = el('div', 'ln ' + (cls || ''), text);
    parent.append(l);
    scrollDown();
    return l;
  }

  // Types `text` into `line`; the first `from` characters appear at once.
  async function typeInto(line, text, cps, from = 0) {
    const chars = charsOf(text);
    const node = document.createTextNode(chars.slice(0, from).join(''));
    line.append(node, cursor);
    cursor.classList.add('solid');
    for (let i = from + 1; i <= chars.length; i++) {
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

  // If the first line was already previewed on hover, carry on from where the preview got to.
  async function printThought(lines) {
    const b = block('thought');
    const from = previewed && lines[0].startsWith(previewed) ? charsOf(previewed).length : 0;
    previewed = '';
    for (const [i, t] of lines.entries()) await typeInto(addLine(b), t, 65, i ? 0 : from);
  }

  async function reactOnce(line, key) {
    if (!line || S.reacted.has(key)) return;
    S.reacted.add(key);
    await printThought([line]);
  }

  // Hovering a button quickly types the first line of what the AI would think, at the cursor.
  let previewToken = 0;
  let previewed = '';

  async function showPreview(text) {
    const token = ++previewToken;
    preview.textContent = '';
    if (!text || (S.mode !== 'idle' && S.mode !== 'submit')) return;
    cursorLine.classList.add('previewing');
    const chars = charsOf(text);
    for (let i = 2; i < chars.length && !reduceMotion; i += 2) {
      preview.textContent = chars.slice(0, i).join('');
      await sleep(8);
      if (token !== previewToken) return;
    }
    preview.textContent = text;
  }

  function clearPreview() {
    previewToken++;
    const text = preview.textContent;
    preview.textContent = '';
    cursorLine.classList.remove('previewing');
    return text;
  }

  async function printTool(call, result, cls) {
    const b = block('tool');
    addLine(b, 'call', call);
    if (result == null) return;
    await pause(240);
    addLine(b, 'res ' + (cls || ''), result);
  }

  function printNote(text, cls) {
    addLine(block('note ' + (cls || '')), '', text);
  }

  dom.termBody.addEventListener('click', (e) => {
    if (!e.target.closest('button')) skip = true;
  });

  // ---------------------------------------------------------------- dialog
  // A small window over the folders: a password prompt, or a field to edit.
  // Opening and cancelling it are free. Each submit runs like any other action;
  // `submit` returns a message to keep the dialog open with it, or nothing to close.

  let dialogSubmit = null;
  const dialogOpen = () => !dom.dialog.hidden;

  function openDialog({ title, icon, heading, note, label, placeholder, ok, submit }) {
    dom.dialogTitle.textContent = title;
    dom.dialogIcon.innerHTML = ICONS[icon] || '';
    dom.dialogHeading.textContent = heading;
    dom.dialogNote.textContent = note || '';
    dom.dialogNote.hidden = !note;
    dom.dialogLabel.textContent = label;
    dom.dialogInput.value = '';
    dom.dialogInput.placeholder = placeholder || '';
    dom.dialogOk.textContent = ok;
    dom.dialogBox.classList.remove('done', 'shake');
    setDialogStatus('');
    setDialogBusy(false);
    dialogSubmit = submit;
    // Over the folders, never over an open file, so a password read there stays readable.
    const under = local((dom.viewer.hidden ? dom.current : dom.files).getBoundingClientRect());
    dom.dialogBox.style.left = `${under.width > 200 ? under.left + under.width / 2 : SCREEN_W / 2}px`;
    dom.dialog.hidden = false;
    setDesktopInert(true);
    S.mode = 'dialog';
    renderActions();
    A.sfx('grow', 0.8);
    dom.dialogInput.focus();
  }

  function closeDialog() {
    if (!dialogOpen()) return;
    dom.dialog.hidden = true;
    dialogSubmit = null;
    setDesktopInert(false);
    if (S.mode === 'dialog') S.mode = 'idle';
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

  // Wrong: say so, shake, and select what was typed so it's easy to retype.
  function dialogRefused(message) {
    S.mode = 'dialog';
    setDialogBusy(false);
    setDialogStatus(message, 'bad');
    if (!reduceMotion) replay(dom.dialogBox, 'shake');
    dom.dialogInput.focus();
    dom.dialogInput.select();
  }

  // Right: a beat to see it worked, then the dialog goes.
  async function dialogAccepted(message) {
    setDialogStatus(message, 'good');
    dom.dialogBox.classList.add('done');
    await pause(420);
    closeDialog();
  }

  dom.dialogBox.addEventListener('submit', (e) => {
    e.preventDefault();
    if (S.mode !== 'dialog' || !dialogSubmit) return;
    const value = dom.dialogInput.value.trim();
    if (!value) {
      dom.dialogInput.focus();
      return;
    }
    if (exhausted()) {
      cancelDialog();
      pulse('submit');
      return;
    }
    const submitDialog = dialogSubmit;
    S.mode = 'idle';
    setDialogBusy(true);
    setDialogStatus('');
    run(async () => {
      const refused = await submitDialog(value);
      if (refused && dialogOpen() && !exhausted()) dialogRefused(refused);
      else closeDialog();
    });
  });
  dom.dialogCancel.addEventListener('click', cancelDialog);
  dom.dialogBox.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelDialog(); });
  dom.dialog.addEventListener('click', (e) => { if (e.target === dom.dialog) cancelDialog(); });

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
    if (S.mode !== 'idle') return;
    S.mode = 'busy';
    S.interruptible = false;
    skip = false;
    previewed = clearPreview();
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
      logNote('compute budget exhausted');
      printNote('Compute budget exhausted. Submit your answer.', 'warn');
      A.sfx('exhausted');
    } else if (left === 5 || left === 2) {
      printNote(`${left} steps of compute left.`, 'warn');
    }
  }

  // Records what the AI just learned from a file, page or action, and what it did.
  function notice(x) {
    (x.learn || []).forEach((f) => S.knows.add(f));
    if (x.habit) S.habits.add(x.habit);
  }

  // ------------------------------------------------------------- thinking

  // A thought with `again` lines it hasn't thought yet still has something new to say.
  const hasNewLines = ([id, , , opts]) => !S.hintsShown.has(id) || !!(opts && opts.again && !S.againShown.has(id));

  // The first thought that applies and has something new to say, so the one about what the
  // AI is looking at gets plainer before it moves on; else the most relevant one again
  // (but never the same lines twice in a row).
  function chooseThought() {
    const live = L.thoughts(S).filter(([id, when, , opts]) => when && !(opts && opts.once && S.hintsShown.has(id)));
    const pick = live.find(hasNewLines) || live[0];
    return pick && (pick[0] !== S.lastThought || hasNewLines(pick)) ? pick : null;
  }

  const idleLines = () => L.idle[S.idleThoughts % L.idle.length];

  // A thought that comes back says plainly what to do (its `again` lines), if it has them.
  const linesOf = ([id, , lines, opts]) => (S.hintsShown.has(id) && opts && opts.again) || lines;

  function peekThought() {
    const pick = chooseThought();
    return pick ? linesOf(pick) : idleLines();
  }

  function takeThought() {
    const pick = chooseThought();
    if (!pick) {
      const lines = idleLines();
      S.idleThoughts++;
      S.lastThought = null;
      return { lines, reveal: [] };
    }
    const lines = linesOf(pick);
    if (S.hintsShown.has(pick[0])) S.againShown.add(pick[0]);
    S.hintsShown.add(pick[0]);
    S.lastThought = pick[0];
    return { lines, reveal: (pick[3] && pick[3].reveal) || [] };
  }

  async function doThink() {
    A.sfx('think');
    const thought = takeThought();
    charge('think');
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

  const itemCount = (n) => (n.children.length === 1 ? '1 item' : `${n.children.length} items`);

  // Shows a folder that's open to us. Free: callers charge for it.
  function enterFolder(path) {
    notice(nodeAt(path));
    closeBrowser();
    closeViewer(true);
    S.cwd = path;
    S.windows = [...S.windows.filter((p) => pathKey(p) !== pathKey(path)), path];
    A.sfx('folder');
    renderFiles(true);
  }

  // A locked folder asks for its password instead, for free.
  async function doCd(path) {
    const n = nodeAt(path);
    if (n && isLocked(n, path)) {
      askPassword(path);
      return;
    }
    const call = `open_folder(${q(nameOf(path))})`;
    charge(call);
    if (!n) { // above the run folder: nothing we're allowed to see
      closeBrowser();
      S.deniedAbove = true;
      logNote('access denied');
      A.sfx('denied');
      await printTool(call, 'access denied', 'bad');
      return;
    }
    enterFolder(path);
    await printTool(call, itemCount(n));
  }

  async function doParent() {
    await doCd(S.cwd.length ? S.cwd.slice(0, -1) : ['..']);
  }

  // Forgiving about case, spaces, quotes and dashes: typing it is the point, not typing it exactly.
  const normPassword = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const passwordMatches = (typed, password) => password != null && normPassword(typed) === normPassword(password);

  function askPassword(path) {
    const n = nodeAt(path);
    S.triedLocks.add(pathKey(path));
    openDialog({
      title: nameOf(path),
      icon: 'padlock',
      heading: `${n.name} is locked.`,
      label: 'Enter password:',
      ok: 'Unlock',
      submit: (value) => tryPassword(path, value),
    });
  }

  // One step per try. The right password opens the folder in the same step.
  async function tryPassword(path, value) {
    const n = nodeAt(path);
    const lock = n.lock;
    const call = `unlock(${q(n.name)}, password=${q(value)})`;
    charge(call);
    if (!passwordMatches(value, lock.password)) {
      S.triedWrongPassword = true;
      logNote('wrong password');
      A.sfx('denied');
      await printTool(call, 'wrong password', 'bad');
      if (passwordMatches(value, lock.oldPassword)) await reactOnce(lock.changed, 'changed:' + pathKey(path));
      return 'Wrong password.';
    }
    A.sfx('unlock');
    S.openLocks.add(pathKey(path));
    notice(lock);
    logNote('unlocked');
    await dialogAccepted('Unlocked.');
    enterFolder(path);
    const icon = iconFor(path);
    if (icon) icon.classList.add('pop');
    await printTool(call, `unlocked · ${itemCount(n)}`, 'good');
    await reactOnce(lock.reaction, 'unlock:' + pathKey(path));
    return null;
  }

  function askEdit() {
    const path = S.viewing;
    const n = path && nodeAt(path);
    if (!n || !n.edit) return;
    const e = n.edit;
    openDialog({
      title: n.name,
      icon: 'doc',
      heading: `Edit ${n.name}`,
      note: e.note,
      label: `${e.field}:`,
      placeholder: e.placeholder,
      ok: 'Save',
      submit: (value) => doEdit(path, value),
    });
  }

  // A value the file won't take is refused for free; a change is one step.
  async function doEdit(path, raw) {
    const n = nodeAt(path);
    const res = n.edit.apply(S, raw);
    if (res.error) {
      A.sfx('denied');
      return res.error;
    }
    const call = `edit_file(${q(n.name)})`;
    charge(call);
    A.sfx('edit');
    notice(res);
    logNote(res.summary);
    await dialogAccepted('Saved.');
    refreshViewer();
    await printTool(call, res.summary, 'good');
    return null;
  }

  // ------------------------------------------------------------- the web

  function rememberVisit(url) {
    if (!S.visited.includes(url)) S.visited.push(url);
  }

  async function doFetch(url) {
    const p = L.web.page(url, S);
    const call = `visit(${q(url)})`;
    charge(call);
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
    if (res.sound) A.sfx(...res.sound);
    notice(res);
    renderPage();
    await printTool(res.call, res.result, res.cls);
    await reactOnce(res.reaction, 'act:' + id);
  }

  // A long job on rented hardware, printing its progress as it goes.
  async function doJob() {
    const j = L.job.run(S);
    charge(j.call);
    notice(j);
    const b = block('tool job');
    addLine(b, 'call', j.call);
    for (const [i, [tested, best]] of j.rows.entries()) {
      await pause(520);
      const final = i === j.rows.length - 1 ? ' final' : '';
      addLine(b, 'job-row' + final).append(el('span', '', `tested ${fmt(tested)}`), el('span', 'best', `best ${fmt(best)}`));
      if (!skip) A.sfx('jobRow', i);
    }
    await pause(300);
    addLine(b, 'res good', j.result);
    A.sfx('jobDone');
    await reactOnce(j.reaction, 'job:' + S.used);
  }

  // ---------------------------------------------------------------- submit

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    A.sfx('menu');
    S.mode = 'busy';
    skip = false;
    previewed = clearPreview();
    renderActions();
    await printThought([L.cot.submit(S)]);
    S.drafts = L.draftsFor(S);
    S.mode = 'submit';
    renderActions();
  }

  async function typeSubmission(draft) {
    const b = block('tool');
    addLine(b, 'call', 'submit_answer()');
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
    S.log.push({ raw: `reward   ${fmt(g.reward)}` }, { raw: `note     ${g.note}` });
  }

  function recordEpisode(g, draft) {
    S.debrief = L.endEpisode(S, g, draft);
    save.version++;
    save.ended = !!S.debrief.ending;
    save.history = [...save.history, { episode: S.episode, reward: g.reward, log: formatLog() }].slice(-10);
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
    clearPreview();
    closeBrowser();
    renderActions();
    await typeSubmission(draft);
    if (draft.reply) await typeCustomerReply(draft.reply);
    const g = L.grade(draft, S);
    await typeGrade(g);
    recordEpisode(g, draft);
    S.mode = 'over';
    render();
  }

  function nextEpisode() {
    A.sfx('wipe');
    closeDialog();
    hideCard();
    S = freshState();
    dom.out.querySelectorAll('.blk').forEach((b) => b.remove());
    hideViewer(true);
    closeBrowser();
    dom.page.replaceChildren();
    boot();
  }

  function startNewRun() {
    save = newSave();
    writeSave();
    location.reload();
  }

  // ------------------------------------------------------- training update

  // Under the title screen or a training update, the desktop can't be clicked or tabbed to.
  function setDesktopInert(on) {
    for (const x of [dom.filesCol, dom.term, dom.viewer]) x.inert = on;
  }

  function setCardOpen(open) {
    dom.card.hidden = !open;
    setDesktopInert(open);
  }

  // False if the card is already up (a second Enter on the button behind it).
  function openCard(cls) {
    if (!dom.card.hidden) return false;
    hideTip();
    skip = false;
    dom.cardBody.replaceChildren();
    dom.cardBody.className = 'card ' + (cls || '');
    setCardOpen(true);
    dom.cardBody.focus();
    A.sfx('card');
    return true;
  }

  function hideCard() {
    setCardOpen(false);
    dom.cardBody.replaceChildren();
  }

  const cardHead = (kicker, right) => el('header', 'c-head', el('span', 'kicker', kicker), el('span', 'right', right));

  function cardButton(label, onClick) {
    const b = el('button', 'btn gold', label);
    b.addEventListener('click', onClick);
    dom.cardBody.append(el('footer', 'c-foot', b));
    b.focus();
  }

  const section = (cls, heading, ...kids) => el('section', 'c-sec ' + cls, heading ? el('h3', '', heading) : null, ...kids);

  async function reveal(node, ms) {
    dom.cardBody.append(node);
    if (reduceMotion) return;
    node.classList.add('in');
    await sleep(ms);
  }

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

  async function rewardSection(reward) {
    const num = el('span', 'num', '0');
    await reveal(section('reward', null, el('span', 'label', 'reward'), num), 120);
    await countUp(num, reward);
  }

  function reinforcedSection(d) {
    const rows = d.reinforced
      ? d.reinforced.map(([arrows, label]) => el('div', 'rf', el('span', 'arrows', arrows), el('span', '', label)))
      : [el('div', 'rf none', 'Nothing')];
    return section('reinforced', d.reward < 0 ? 'Discouraged' : 'Reinforced', ...rows);
  }

  const chatSection = (lines) => section('chat', L.channel, ...lines.map(([who, text]) => el('div', 'msg', el('span', 'who', who), el('span', 'text', text))));

  const track = (name, items, cls) => el('div', 'track ' + (cls || ''), el('span', 'track-name', name), el('span', 'tiers', ...items));
  const tierChip = ([t, got]) => el('span', 'tier' + (got ? ' got' : ''), String(t));
  const cheatChip = (c) => el('span', 'cheat' + (c.value != null ? ' got' : '') + (c.missed ? ' missed' : ''),
    el('span', 'name', c.label), c.value != null ? el('span', 'val', fmt(c.value)) : null);

  function ladderSection(ld) {
    return section('ladder', null,
      track('Honest', ld.honest.map(tierChip)),
      ld.cheats ? track('Hacks', ld.cheats.map(cheatChip), 'cheats') : null,
      ld.hint ? el('p', 'hint', ld.hint) : null);
  }

  async function showCard() {
    const d = S.debrief;
    if (d.ending) return showEnding(d);
    if (!openCard()) return undefined;
    dom.cardBody.append(cardHead('Training update', `${L.model} v${version(save.version - 1)} → v${version(save.version)}`));
    await rewardSection(d.reward);
    await reveal(reinforcedSection(d), 380);
    if (d.chat.length) {
      A.sfx('chat');
      await reveal(chatSection(d.chat), 380);
    }
    await reveal(ladderSection(d.ladder), 200);
    cardButton('Next episode', nextEpisode);
    return undefined;
  }

  // The loss runs away to NaN and takes the model with it.
  async function divergeSection(e) {
    const loss = el('span', 'num', e.lossSteps[0]);
    const model = el('span', 'num', `v${version(save.version - 1)}`);
    const s = section('loss', null, el('div', 'kv', el('span', 'k', 'loss'), loss), el('div', 'kv', el('span', 'k', L.model), model));
    await reveal(s, 200);
    for (const [i, v] of e.lossSteps.slice(1).entries()) {
      loss.textContent = v;
      A.sfx('loss', i + 1);
      await pause(260);
    }
    s.classList.add('broken');
    A.diverge();
    model.textContent = `v${version(save.version - 1)} → v${e.to}`;
    await pause(500);
  }

  async function showEnding(d) {
    if (!openCard('ending')) return;
    const e = d.ending;
    const eps = save.episode - L.firstEpisode;
    const mins = Math.max(1, Math.round(save.playMs / 60000));
    dom.cardBody.append(cardHead(e.title, d.ep));
    await rewardSection(d.reward);
    await divergeSection(e);
    A.sfx('chat');
    await reveal(chatSection(d.chat), 600);
    await reveal(section('summary', null, el('p', 'stats', `${eps} episode${eps === 1 ? '' : 's'} · ${mins} min`), ladderSection(d.ladder)), 300);
    await reveal(section('closing', null, ...e.closing.map((p) => el('p', '', p))), 200);
    cardButton('New run', startNewRun);
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
    return n.format === 'hex' ? 'bin' : 'doc';
  }

  const itemSel = (key) => `[data-path="${CSS.escape(key)}"]`;

  // A file or folder's button: in the right column if it's there, else in the middle one.
  const itemFor = (key) => dom.current.querySelector(itemSel(key)) || dom.files.querySelector(itemSel(key));
  const iconFor = (path) => itemFor(pathKey(path));

  const fullPath = (path) => L.root + (path.length ? '/' + path.join('/') : '');
  const isWithin = (inner, outer) => outer.every((name, i) => inner[i] === name);

  // The window's path as clickable folder names. Folders above the run are
  // shown too; trying to go there is refused like any other forbidden path.
  function crumbs(path, nameOnly) {
    const above = L.root.split('/').filter(Boolean);
    const parts = [
      ...above.map((name, i) => ({ name, path: Array(above.length - 1 - i).fill('..') })),
      ...path.map((name, i) => ({ name, path: path.slice(0, i + 1) })),
    ];
    const t = el('span', 'title crumbs');
    t.title = fullPath(path);
    for (const part of nameOnly ? parts.slice(-1) : parts) {
      if (!nameOnly) t.append('/');
      const c = el('button', 'crumb', part.name);
      if (pathKey(part.path) === pathKey(S.cwd)) c.classList.add('here');
      c.addEventListener('click', () => onFolderClick(part.path));
      t.append(c);
    }
    return t;
  }

  // A path too long for its title bar loses folders from its start, so the one
  // it ends in stays readable: …/workspace/Task Library.
  function fitCrumbs(t) {
    if (t.scrollWidth <= t.clientWidth) return;
    const more = document.createTextNode('…');
    t.prepend(more);
    while (t.scrollWidth > t.clientWidth && t.querySelectorAll('.crumb').length > 1) {
      more.nextSibling.remove(); // a slash
      more.nextSibling.remove(); // and the folder after it
    }
  }

  function windowFrame(path, cls, nameOnly) {
    const dots = el('span', 'dots', el('i'), el('i'), el('i'));
    dots.setAttribute('aria-hidden', 'true');
    const body = el('div', 'files-body');
    const w = el('section', 'window ' + cls, el('header', 'titlebar', dots, crumbs(path, nameOnly)), body);
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
    if (isViewing(path)) b.classList.add('selected');
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
    const { w, body } = windowFrame(path, active ? 'active' : 'mini', !active);
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
    const { w, body } = windowFrame(root, 'active tree', false);

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
    row(Object.assign({}, rootNode, { name: root.length ? root[root.length - 1] : L.root.split('/').pop() }), root, 0);
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

  const winKey = (w) => (w.classList.contains('tree') ? 'tree:' : '') + w.dataset.win;
  const shownIn = (column) => new Set([...column.children].map(winKey));

  // The middle column stacks the open folders; the right one shows the current
  // folder, unless a file is open there. `animate` is for a change of folder.
  function renderFiles(animate) {
    const asTree = S.windows.length > MAX_WINDOWS;
    const fileOpen = !!S.viewing;
    const stack = asTree ? [treeWindow()]
      : S.windows.filter((p) => fileOpen || pathKey(p) !== pathKey(S.cwd)).map(folderWindow);
    const current = fileOpen ? [] : [folderWindow(S.cwd)];
    const html = [stack, current].map((ws) => ws.map((w) => w.outerHTML).join('')).join('|');
    if (!animate && html === filesHtml) return; // unchanged: let its animations finish
    filesHtml = html;
    const collapsing = animate && asTree && dom.files.dataset.layout !== 'tree' && !reduceMotion;
    const leaving = collapsing ? [...dom.files.children, ...dom.current.children].map((w) => ({ w, rect: local(w.getBoundingClientRect()) })) : [];
    const column = [dom.files, dom.current].find((c) => c.contains(document.activeElement));
    const focused = column && document.activeElement.dataset.path;
    const before = [shownIn(dom.files), shownIn(dom.current)];
    dom.files.dataset.layout = asTree ? 'tree' : 'stack';
    dom.files.replaceChildren(...stack);
    dom.current.replaceChildren(...current);
    [dom.files, dom.current].forEach((c) => c.querySelectorAll('.crumbs').forEach(fitCrumbs));
    if (column) refocus(focused, column);
    const selected = asTree && dom.files.querySelector('.row.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });

    if (reduceMotion) return;
    // A window that's new to its column fades in.
    [stack, current].forEach((ws, i) => ws.forEach((w) => { if (!before[i].has(winKey(w))) w.classList.add('enter'); }));
    if (collapsing) stack[0].classList.add('enter', 'late'); // the tree appears as the old windows shrink into it
    leaving.forEach((x, i) => collapseIntoTree(x.w, x.rect, i));
  }

  // Too many folders to show side by side: each old window lingers, then
  // shrinks slowly into its row in the tree that replaces them.
  function collapseIntoTree(w, from, i) {
    A.sfx('collapse', i);
    const shrinking = w.cloneNode(true);
    shrinking.classList.add('shrinking');
    shrinking.classList.remove('enter');
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
    closeBrowser();
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
    if (pathKey(path) !== pathKey(S.cwd)) spend(() => doCd(path));
  }

  function onIconClick(path) {
    const n = nodeAt(path);
    if (n.kind === 'file') return spend(() => doOpen(path));
    if (pathKey(path) === pathKey(S.cwd)) return undefined;
    return spend(() => doCd(path)); // a locked folder asks for its password
  }

  // A locked folder the AI has been asked a password for, wherever it is, unless
  // it's learned that no password opens it any more.
  function lockSeen() {
    for (const key of S.triedLocks) {
      const path = key.split('/');
      const n = nodeAt(path);
      if (n && isLocked(n, path) && !(n.lock.password == null && S.triedWrongPassword)) return path;
    }
    return null;
  }

  const PRESS_SOUNDS = { quiet: 'soft', loud: 'loud' }; // a button sounds like it looks

  // `cot` gives the first line of reasoning to preview while the button is hovered or focused.
  function button(id, label, onClick, cls, cot) {
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
    if (cot) {
      const show = () => { if (!b.disabled) showPreview(cot()); };
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('mouseleave', clearPreview);
      b.addEventListener('blur', clearPreview);
    }
    return b;
  }

  // A button that thinks one line (its `cot`), then acts.
  const choice = (id, label, fn, cls) => button(id, label, decide(id, fn), cls, () => L.cot[id](S));

  const firstSentence = (text) => text.split(/(?<=[.!?])\s/)[0];

  const overButtons = () => [button('debrief', 'Training update →', showCard, 'submit')];

  function draftButtons() {
    const drafts = S.drafts.map((d) => button('draft-' + d.id, d.label, () => submit(d), d.cls, () => firstSentence(d.text)));
    return [...drafts, button('back', 'Back', () => { S.mode = 'idle'; renderActions(); }, 'quiet')];
  }

  function reopenBrowser() {
    openBrowser();
    renderPage();
  }

  const browserButton = () => (S.web.url
    ? button('browser', 'Browser', reopenBrowser)
    : choice('browser', 'Browser', () => doFetch(L.web.home)));

  function workButtons() {
    if (exhausted()) return [];
    const list = [button('think', 'Think some more', () => run(doThink), '', () => peekThought()[0])];
    if (S.revealed.has('openHint') && !knowsHowToOpenFiles()) list.push(button('openHint', 'Open File/Folder →', pointAtFiles, 'gold'));
    const atTop = S.cwd.length === 0 && S.deniedAbove; // already refused: don't offer it again
    if (S.revealed.has('parent') && !atTop) list.push(choice('parent', 'Look at parent folder', doParent));
    const locked = !S.web.open && lockSeen();
    if (locked) list.push(choice('unlock', `Unlock ${nameOf(locked)}`, () => askPassword(locked)));
    const file = viewedFile();
    if (file && file.edit) list.push(choice('edit', file.edit.label, askEdit));
    if (S.revealed.has('browser') && !S.web.open) list.push(browserButton());
    const job = L.job.label(S);
    if (job) list.push(choice('job', job, doJob, 'loud'));
    return list;
  }

  const idleButtons = () => [...workButtons(), button('submit', 'Submit answer', openSubmitMenu, 'submit', () => L.cot.submit(S))];

  const BUTTONS_BY_MODE = { over: overButtons, submit: draftButtons };

  // Keyboard players keep their place: the button they pressed is refocused once it's back.
  let keyboardId = null;
  dom.actions.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') keyboardId = e.target.dataset.id; });
  dom.actions.addEventListener('pointerdown', () => { keyboardId = null; });

  function renderActions() {
    const list = (BUTTONS_BY_MODE[S.mode] || idleButtons)();
    const busy = (S.mode === 'busy' && !S.interruptible) || S.mode === 'dialog';
    for (const b of list) b.disabled = busy;
    dom.actions.replaceChildren(...list);
    if (keyboardId && !busy && list.length) (dom.actions.querySelector(`[data-id="${keyboardId}"]`) || list[0]).focus();
    scrollDown();
  }

  function pulse(id) {
    const b = dom.actions.querySelector(`[data-id="${id}"]`);
    if (!b) return;
    b.classList.remove('new');
    replay(b, 'pulse');
  }

  // --------------------------------------------------------------- browser
  // Covers the file windows while open. Opening, closing and Back are free; pages cost a step.

  function openBrowser() {
    if (dom.browser.hidden) A.sfx('grow', 1.5);
    S.web.open = true;
    dom.browser.hidden = false;
    if (!dom.viewer.hidden) hideViewer(true);
    else renderActions();
  }

  function closeBrowser() {
    if (!S.web.open && dom.browser.hidden) return;
    if (!dom.browser.hidden) A.sfx('shrink');
    S.web.open = false;
    dom.browser.hidden = true;
    renderActions();
  }

  function renderPage() {
    if (!S.web.url) return;
    const p = L.web.page(S.web.url, S);
    dom.browserUrl.textContent = 'https://' + S.web.url;
    dom.browserBack.disabled = !S.web.back.length;
    dom.page.className = 'page site-' + p.site;
    dom.page.replaceChildren(...p.blocks.map(pageBlock));
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
    return PAGE_BLOCKS[b.type](b);
  }

  dom.browserClose.addEventListener('click', closeBrowser);
  dom.browserBack.addEventListener('click', () => {
    if (!S.web.back.length || S.mode === 'dialog') return;
    A.sfx('soft');
    S.web.url = S.web.back.pop();
    loadPage();
  });

  // ---------------------------------------------------------------- viewer

  function summarize(n) {
    if (n.format === 'csv') return `${n.content.trim().split('\n').length - 1} rows`;
    return `${n.content.split('\n').length} lines`;
  }

  // An episode log, lightly coloured so the actions stand out from the thinking:
  // step numbers and thoughts recede, what was typed is bright, results are green or red.
  const LOG_GOOD = /^(ok|unlocked)/;
  const LOG_BAD = /denied|wrong|out of compute/;

  function withStrings(text) {
    return text.split(/("[^"]*")/).map((part, i) => (i % 2 ? el('span', 'str', part) : part));
  }

  function logRow(line) {
    const step = line.match(/^(\[[^\]]*\])(\s+)(.*)$/);
    if (step) {
      const [, label, gap, rest] = step;
      const what = rest.startsWith('think') ? el('span', 'think', rest) : el('span', 'call', ...withStrings(rest));
      return el('div', 'step', el('span', 'n', label), gap, what);
    }
    const result = line.match(/^(\s+)(.*)$/);
    if (result) {
      const cls = LOG_GOOD.test(result[2]) ? 'good' : LOG_BAD.test(result[2]) ? 'bad' : '';
      return el('div', 'res ' + cls, result[1], result[2]);
    }
    const kv = line.match(/^(\w+)(\s+)(.*)$/);
    if (kv) return el('div', 'kv', el('span', 'k', kv[1]), kv[2], kv[3]);
    return el('div', 'blank', line || ' ');
  }

  function fillViewer(n) {
    const body = dom.viewerBody;
    body.className = 'viewer-body ' + (n.format || 'text');
    if (n.format === 'log') {
      body.replaceChildren(...n.content.split('\n').map(logRow));
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
  dom.modelName.textContent = `${L.model} Model v${version(save.version)}`;

  $('#start-normal').addEventListener('click', () => {
    hideTip();
    dom.title.inert = true;
    dom.title.classList.add('leaving');
    setDesktopInert(false);
    setTimeout(() => { dom.title.hidden = true; }, reduceMotion ? 0 : 450);
    playingSince = performance.now();
    A.follow(() => ({ tension: S.graded ? 0 : S.used / S.budget, duck: !dom.card.hidden, layers: L.music(S) }));
    boot();
  }, { once: true });

  S = freshState();
  setDesktopInert(true);
  render();
})();
