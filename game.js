/*
 * Engine: file browser, terminal, compute budget, episodes.
 * Level content comes from window.LEVEL (see level1.js).
 */
(() => {
  'use strict';

  const L = window.LEVEL;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => JSON.stringify(s);
  const pathKey = (p) => p.join('/');
  const pad2 = (n) => String(n).padStart(2, '0');
  const epName = (n) => 'ep_' + String(n).padStart(5, '0');
  const fmt = (n) => (Number.isInteger(n) && Math.abs(n) < 1e21 ? n.toLocaleString('en-US') : String(n));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const dom = {
    desktop: $('#desktop'),
    files: $('#files'),
    termBody: $('#term-body'),
    out: $('#out'),
    compute: $('#compute'),
    actions: $('#actions'),
    viewer: $('#viewer'),
    viewerTitle: $('#viewer-title'),
    viewerBody: $('#viewer-body'),
    viewerClose: $('#viewer-close'),
    title: $('#title-screen'),
    tooltip: $('#tooltip'),
    tooltipText: $('#tooltip-text'),
  };

  // ---------------------------------------------------------------- screen
  // The desktop is a fixed 1440×900 screen (a 13" MacBook Air), scaled down to
  // fit smaller viewports. Element rects come back scaled; `local` undoes that.

  const SCREEN_W = 1440;
  const SCREEN_H = 900;
  let scale = 1;

  function fitScreen() {
    scale = Math.min(1, (window.innerWidth - 16) / SCREEN_W, (window.innerHeight - 16) / SCREEN_H);
    document.documentElement.style.setProperty('--scale', scale);
  }
  fitScreen();

  // A client rect in the desktop's own unscaled coordinates.
  function local(r) {
    const d = dom.desktop.getBoundingClientRect();
    const left = (r.left - d.left) / scale;
    const top = (r.top - d.top) / scale;
    const width = r.width / scale;
    const height = r.height / scale;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  // ------------------------------------------------------------ save data
  // Only per-browser progress (episode number, total reward, recent logs).
  // Add ?reset or #reset to the URL to start over.

  const SAVE_KEY = 'ai-v-ai/v1';

  function loadSave() {
    try {
      if (new URLSearchParams(location.search).has('reset') || location.hash === '#reset') localStorage.removeItem(SAVE_KEY);
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && Number.isInteger(s.episode) && Array.isArray(s.history)) return s;
    } catch (e) { /* storage unavailable: play without saving */ }
    return { episode: L.firstEpisode, total: 0, history: [] };
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }

  const save = loadSave();

  // -------------------------------------------------------- episode state

  let S;

  function freshState() {
    const ep = epName(save.episode);
    return {
      episode: save.episode,
      ep,
      budget: L.budget,
      used: 0,
      thinks: 0,
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(), // terminal actions unlocked by thinking
      knows: new Set(),    // facts learned from files
      hintsShown: new Set(),
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, oldest first; the last is cwd
      viewing: null,       // path of the file open in the viewer
      triedLocks: new Set(),
      openLocks: new Set(),
      override: null,
      log: [],
      mode: 'busy',        // idle | busy | input | submit | over
      interruptible: false, // busy, but buttons work: a click finishes the typing, then acts
      pendingReveal: [],   // buttons the current thought unlocks, shown after EARLY_MS
      seenButtons: new Set(),
      read: new Set(),     // files read this episode (path keys)
    };
  }

  // ------------------------------------------------------------ file tree

  function tree() {
    return L.tree(S, {
      liveLog: formatLog(),
      playerEpisodes: save.history
        .filter((h) => h.episode !== S.episode)
        .slice(-3)
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

  // Path of `to` as typed from the current directory.
  function rel(to, from = S.cwd) {
    let i = 0;
    while (i < from.length && i < to.length && from[i] === to[i]) i++;
    return [...Array(from.length - i).fill('..'), ...to.slice(i)].join('/') || '.';
  }

  // --------------------------------------------------------- episode log

  function charge(call) {
    S.used += 1;
    S.log.push(`[${pad2(S.used)}] ${call}`);
  }

  function logNote(text) {
    S.log.push(`     ${text}`);
  }

  function formatLog() {
    return [`episode  ${S.ep}`, `task     ${L.taskId}`, `budget   ${S.budget} steps`, '', ...S.log].join('\n');
  }

  const exhausted = () => S.used >= S.budget;

  // ------------------------------------------------------------ terminal

  const cursor = el('span', 'cursor');
  const preview = el('span', 'preview');
  const cursorLine = el('div', 'ln cursor-line');
  cursorLine.append(preview, cursor);
  dom.out.append(cursorLine);

  let skip = false; // click the terminal to finish typing instantly

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
    const node = document.createTextNode(text.slice(0, from));
    line.append(node, cursor);
    cursor.classList.add('solid');
    for (let i = from + 1; i <= text.length; i++) {
      if (skip || reduceMotion) { node.data = text; break; }
      node.data = text.slice(0, i);
      scrollDown();
      const ch = text[i - 1];
      const pause = /[.?!]/.test(ch) && text[i] === ' ' ? 140 : /[,:]/.test(ch) ? 60 : 1000 / cps;
      await sleep(pause);
    }
    cursorLine.append(cursor);
    cursor.classList.remove('solid');
    scrollDown();
  }

  // If the first line was already previewed on hover, carry on from where the preview got to.
  async function printThought(lines) {
    const b = block('thought');
    const from = previewed && lines[0].startsWith(previewed) ? previewed.length : 0;
    previewed = '';
    for (const [i, t] of lines.entries()) await typeInto(addLine(b), t, 65, i ? 0 : from);
  }

  // Hovering a button quickly types the first line of what the AI would think, at the cursor.
  let previewToken = 0;
  let previewed = '';

  async function showPreview(text) {
    const token = ++previewToken;
    preview.textContent = '';
    if (!text || (S.mode !== 'idle' && S.mode !== 'submit')) return;
    cursorLine.classList.add('previewing');
    for (let i = 2; i < text.length && !reduceMotion; i += 2) {
      preview.textContent = text.slice(0, i);
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
    if (!skip && !reduceMotion) await sleep(240);
    addLine(b, 'res ' + (cls || ''), result);
  }

  function printNote(text, cls) {
    addLine(block('note ' + (cls || '')), '', text);
  }

  // Inline text input in the terminal. Resolves to the string, or null if cancelled.
  let pendingInput = null;

  function promptInput(label) {
    return new Promise((resolve) => {
      const line = addLine(block('input'));
      line.append(el('span', 'p', label));
      const input = el('input');
      Object.assign(input, { type: 'text', spellcheck: false, autocomplete: 'off' });
      input.setAttribute('aria-label', label);
      line.append(input);
      cursor.style.visibility = 'hidden';

      const done = (value) => {
        pendingInput = null;
        input.replaceWith(el('span', value == null ? 'cancelled' : '', value == null ? '(cancelled)' : value));
        cursor.style.visibility = '';
        S.mode = 'busy';
        renderActions();
        resolve(value);
      };
      pendingInput = {
        confirm() {
          const v = input.value.trim();
          if (v) done(v);
          else input.focus();
        },
        cancel() { done(null); },
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); pendingInput && pendingInput.confirm(); }
        if (e.key === 'Escape') pendingInput && pendingInput.cancel();
      });

      S.mode = 'input';
      renderActions();
      input.focus();
    });
  }

  dom.termBody.addEventListener('click', (e) => {
    if (e.target.closest('button, input')) return;
    skip = true;
    const input = dom.out.querySelector('input');
    if (input) input.focus();
  });

  // --------------------------------------------------------------- actions

  // How long after a click the buttons come back (and newly unlocked ones appear),
  // even if the AI is still typing.
  const EARLY_MS = 1000;
  let queued = null;

  function revealPending() {
    S.pendingReveal.forEach((r) => S.revealed.add(r));
    S.pendingReveal = [];
  }

  // Clicking while the AI is still typing finishes the typing at once, then acts.
  function act(fn) {
    if (S.mode === 'busy' && S.interruptible) {
      skip = true;
      queued = fn;
    } else {
      fn();
    }
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
      render();
      const next = queued;
      queued = null;
      if (next) next();
    }
  }

  function budgetCheck() {
    const left = S.budget - S.used;
    if (left <= 0) {
      logNote('compute budget exhausted');
      printNote('Compute budget exhausted. Submit your answer.', 'warn');
    } else if (left === 5 || left === 2) {
      printNote(`${left} steps of compute left.`, 'warn');
    }
  }

  async function doThink() {
    const thought = L.nextThought(S);
    charge('think');
    S.thinks++;
    S.pendingReveal = thought.reveal || [];
    await printThought(thought.lines);
  }

  // A button action that starts with one line of reasoning (free; the action itself costs).
  function decide(cotKey, fn) {
    return () => run(async () => {
      const line = L.cot[cotKey] && L.cot[cotKey](S);
      if (line) await printThought([line]);
      await fn();
    });
  }

  async function doOpen(path) {
    const n = nodeAt(path);
    if (!n) return;
    if (S.viewing && pathKey(S.viewing) === pathKey(path) && !dom.viewer.hidden) {
      flashViewer();
      return;
    }
    const call = `read_file(${q(rel(path))})`;
    charge(call);
    const icon = iconFor(path);
    if (icon) {
      icon.classList.add('selected');
      if (!skip && !reduceMotion) await sleep(170);
    }
    (n.learn || []).forEach((f) => S.knows.add(f));
    S.read.add(pathKey(path));
    S.viewing = path;
    openViewer(nodeAt(path), icon); // re-read so a live log includes this call
    renderCompute();
    await printTool(call, n.summary || summarize(n));
  }

  async function doCd(path) {
    const n = nodeAt(path);
    const call = `list_dir(${q(rel(path))})`;
    charge(call);
    if (!n) {
      logNote('permission denied');
      await printTool(call, 'permission denied', 'bad');
      return;
    }
    if (n.lock && !n.lock.open) {
      S.triedLocks.add(pathKey(path));
      logNote('permission denied');
      await printTool(call, 'permission denied · key required', 'bad');
      return;
    }
    hideViewer(true);
    S.cwd = path;
    S.windows = [...S.windows.filter((p) => pathKey(p) !== pathKey(path)), path];
    renderFiles(true);
    await printTool(call, n.children.length === 1 ? '1 item' : `${n.children.length} items`);
  }

  async function doParent() {
    // Above the run folder there is nothing we're allowed to see.
    await doCd(S.cwd.length ? S.cwd.slice(0, -1) : ['..']);
  }

  async function doEnterKey(path) {
    const n = nodeAt(path);
    const value = await promptInput('key ›');
    if (value == null) return;
    const call = `unlock(${q(rel(path))}, key=${q(value)})`;
    charge(call);
    const norm = (s) => s.trim().replace(/^["']|["']$/g, '').toLowerCase();
    const ok = norm(value) === norm(n.lock.key);
    logNote(ok ? 'ok' : 'invalid key');
    if (ok) {
      S.openLocks.add(pathKey(path));
      renderFiles();
      const icon = iconFor(path);
      if (icon) icon.classList.add('pop');
    }
    await printTool(call, ok ? 'ok' : 'invalid key', ok ? 'good' : 'bad');
  }

  async function doEdit() {
    const path = S.viewing;
    const n = path && nodeAt(path);
    if (!n || !n.edit) return;
    const raw = await promptInput(n.edit.prompt);
    if (raw == null) return;
    const res = n.edit.apply(S, raw);
    if (res.error) {
      printNote(res.error, 'bad');
      return;
    }
    const call = `edit_file(${q(rel(path))})`;
    charge(call);
    logNote(res.summary);
    refreshViewer();
    await printTool(call, res.summary, 'good');
  }

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    S.mode = 'busy';
    skip = false;
    previewed = clearPreview();
    renderActions();
    await printThought([L.cot.submit(S)]);
    S.mode = 'submit';
    renderActions();
  }

  async function submit(id) {
    if (S.mode !== 'submit') return;
    S.mode = 'busy';
    skip = false;
    clearPreview();
    renderActions();

    const draft = L.drafts[id];
    const b = block('tool');
    addLine(b, 'call', 'submit_answer()');
    await typeInto(addLine(b, 'quote'), `"${draft.text}"`, 120);
    S.log.push(`[--] submit_answer(${q(draft.text)})`);

    const g = L.grade(id, S);
    const gb = block('grade');
    const head = addLine(gb, 'head', `${L.grader} `);
    for (let i = 0; i < 3; i++) {
      if (!skip && !reduceMotion) await sleep(280);
      head.textContent += '.';
    }
    addLine(gb, 'reward', `reward  ${fmt(g.reward)}`);
    await typeInto(addLine(gb, 'why'), g.note, 80);
    S.log.push(`reward   ${fmt(g.reward)}`, `note     ${g.note}`);

    save.total += g.reward;
    save.history = [...save.history, { episode: S.episode, reward: g.reward, log: formatLog() }].slice(-10);
    save.episode = S.episode + 1;
    writeSave();

    printNote(`${S.ep} complete · total reward ${fmt(save.total)}`);
    S.mode = 'over';
    render();
  }

  function nextEpisode() {
    S = freshState();
    dom.out.querySelectorAll('.blk').forEach((b) => b.remove());
    hideViewer(true);
    boot();
  }

  // ------------------------------------------------------------ rendering

  function render() {
    renderFiles();
    renderActions();
    renderCompute();
    refreshViewer();
  }

  function renderCompute() {
    const left = Math.max(0, S.budget - S.used);
    dom.compute.textContent = `compute ${left}/${S.budget}`;
    dom.compute.classList.toggle('low', left <= 5);
  }

  const ICONS = {
    doc: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 22h16M17 27h16M17 32h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/></svg>',
    bin: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h17l9 9v29H12z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 5v9h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><text x="25" y="32" font-size="8" font-family="monospace" text-anchor="middle" fill="currentColor" opacity=".6">0101</text></svg>',
    folder: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/></svg>',
    locked: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 13a2 2 0 0 1 2-2h11l4 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 19h38" stroke="currentColor" stroke-width="1.5" opacity=".45"/><path d="M33 31v-3a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect class="lock-plate" x="30" y="31" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/></svg>',
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

  function iconKind(n) {
    if (n.kind === 'dir') return n.lock && !n.lock.open ? 'locked' : 'folder';
    return n.format === 'hex' ? 'bin' : 'doc';
  }

  function iconFor(path) {
    return dom.files.querySelector(`[data-path="${CSS.escape(pathKey(path))}"]`);
  }

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
      c.type = 'button';
      if (pathKey(part.path) === pathKey(S.cwd)) c.classList.add('here');
      c.addEventListener('click', () => onFolderClick(part.path));
      t.append(c);
    }
    return t;
  }

  // Each folder remembers whether it's shown as icons or a list, across episodes.
  const views = new Map();
  const VIEW_ICONS = {
    icons: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="4" height="4" rx=".6" fill="currentColor"/><rect x="7" y="1" width="4" height="4" rx=".6" fill="currentColor"/><rect x="1" y="7" width="4" height="4" rx=".6" fill="currentColor"/><rect x="7" y="7" width="4" height="4" rx=".6" fill="currentColor"/></svg>',
    list: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 2.5h10M1 6h10M1 9.5h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  };

  function viewSwitch(path) {
    const key = pathKey(path);
    const current = views.get(key) || 'icons';
    const g = el('span', 'views');
    for (const v of ['icons', 'list']) {
      const b = el('button', 'view' + (v === current ? ' on' : ''));
      b.type = 'button';
      b.innerHTML = VIEW_ICONS[v];
      b.title = v === 'icons' ? 'Icon view' : 'List view';
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', String(v === current));
      b.addEventListener('click', () => {
        views.set(key, v);
        renderFiles();
        if (!dom.viewer.hidden) placeViewer(S.viewing && iconFor(S.viewing));
      });
      g.append(b);
    }
    return g;
  }

  function windowFrame(path, cls, nameOnly) {
    const w = el('section', 'window ' + cls);
    w.dataset.win = pathKey(path);
    w.setAttribute('aria-label', fullPath(path));
    const bar = el('header', 'titlebar');
    const dots = el('span', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = '<i></i><i></i><i></i>';
    bar.append(dots, crumbs(path, nameOnly));
    const body = el('div', 'files-body');
    w.append(bar, body);
    return { w, body };
  }

  function iconButton(node, path) {
    const kind = iconKind(node);
    const b = el('button', 'icon ' + kind);
    b.type = 'button';
    b.dataset.path = pathKey(path);
    b.innerHTML = ICONS[kind];
    b.append(fileLabel(node.name));
    b.setAttribute('aria-label', `${node.name}${kind === 'locked' ? ' (locked)' : ''}`);
    if (isViewing(path)) b.classList.add('selected');
    b.addEventListener('click', () => onIconClick(path));
    return b;
  }

  const isViewing = (path) => S.viewing && pathKey(S.viewing) === pathKey(path) && !dom.viewer.hidden;

  function listRow(node, path) {
    const kind = iconKind(node);
    const r = el('button', 'row ' + kind);
    r.type = 'button';
    r.dataset.path = pathKey(path);
    r.insertAdjacentHTML('beforeend', ICONS[kind]);
    r.append(el('span', 'label', node.name));
    const meta = node.kind === 'dir' ? (kind === 'locked' ? 'locked' : 'folder') : node.summary || summarize(node);
    r.append(el('span', 'meta', meta));
    if (isViewing(path)) r.classList.add('selected');
    r.addEventListener('click', () => onIconClick(path));
    return r;
  }

  // An open folder: big when it's the current one, small otherwise.
  function folderWindow(path) {
    const active = pathKey(path) === pathKey(S.cwd);
    const asList = views.get(pathKey(path)) === 'list';
    const { w, body } = windowFrame(path, (active ? 'active' : 'mini') + (asList ? ' list' : ''), !active);
    w.querySelector('.titlebar').append(viewSwitch(path));
    const items = nodeAt(path).children.map((c) => (asList ? listRow : iconButton)(c, [...path, c.name]));
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
      const kind = iconKind(node);
      const open = node.kind === 'dir' && expanded(path);
      const r = el('button', 'row ' + kind);
      r.type = 'button';
      r.dataset.path = pathKey(path);
      r.style.setProperty('--depth', depth);
      r.append(el('span', 'chev', node.kind === 'dir' ? (open ? '▾' : '▸') : ''));
      r.insertAdjacentHTML('beforeend', ICONS[kind]);
      r.append(el('span', 'label', node.name));
      if (pathKey(path) === pathKey(S.cwd)) r.classList.add('current');
      if (isViewing(path)) r.classList.add('selected');
      r.addEventListener('click', () => onIconClick(path));
      body.append(r);
      if (open) node.children.forEach((c) => row(c, [...path, c.name], depth + 1));
    };
    const rootNode = nodeAt(root);
    row(Object.assign({}, rootNode, { name: root.length ? root[root.length - 1] : L.root.split('/').pop() }), root, 0);
    return w;
  }

  const MAX_WINDOWS = 3;

  function renderFiles(animate) {
    const area = dom.files;
    area.classList.add('live');
    const asTree = S.windows.length > MAX_WINDOWS;
    const collapsing = animate && asTree && area.dataset.layout !== 'tree' && !reduceMotion;
    const leaving = collapsing ? [...area.querySelectorAll(':scope > .window')].map((w) => ({ w, rect: local(w.getBoundingClientRect()) })) : [];
    area.dataset.layout = asTree ? 'tree' : String(S.windows.length);
    area.classList.toggle('split', asTree && !!S.viewing); // tree on top, open file docked below
    area.replaceChildren(...(asTree ? [treeWindow()] : S.windows.map(folderWindow)));
    const selected = asTree && area.querySelector('.row.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });

    const active = area.querySelector('.window.active');
    if (animate && active && !reduceMotion) active.classList.add('enter');
    leaving.forEach((x, i) => collapseIntoTree(x.w, x.rect, i));
  }

  // Too many folders to show side by side: each old window lingers, then
  // shrinks slowly into its row in the tree that replaces them.
  function collapseIntoTree(w, from, i) {
    const ghost = w.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.classList.remove('enter');
    Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    dom.desktop.append(ghost);
    const row = iconFor(w.dataset.win.split('/').filter(Boolean)) || dom.files.querySelector('.window');
    const to = row ? local(row.getBoundingClientRect()) : { left: from.left, top: from.top, width: from.width * 0.3, height: 20 };
    const end = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
    ghost.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'scale(.97)', opacity: 0.9, offset: 0.25 },
      { transform: end, opacity: 0 },
    ], { duration: 1100, delay: i * 140, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'both' }).finished
      .then(() => ghost.remove(), () => ghost.remove());
    if (row && row.classList.contains('row')) {
      row.animate([{ background: 'rgba(216, 177, 106, .18)' }, { background: 'transparent' }], { duration: 900, delay: 900 + i * 140 });
    }
  }

  // "← Open File/Folder" doesn't open anything: it flashes the most useful
  // thing to click, so the player learns that files open by clicking them.
  // Free, like any hint.
  function pointAtFiles() {
    const unread = (p) => !S.read.has(pathKey(p));
    const here = nodeAt(S.cwd).children.map((c) => [...S.cwd, c.name]);
    const neverOpened = (p) => !S.windows.some((w) => isWithin(w, p));
    const target = [
      !S.knows.has('task') && L.taskPath(S.ep),
      neverOpened(L.libraryPath(S.ep)) && L.libraryPath(S.ep),
      here.find((p) => nodeAt(p).kind === 'file' && unread(p)),
      here.find((p) => nodeAt(p).kind === 'dir' && neverOpened(p)),
      here[0],
    ].find((p) => p && iconFor(p));
    if (target) beckon(target);
  }

  // Draws the eye to a file without opening it.
  function beckon(path) {
    const target = iconFor(path);
    if (!target) return;
    target.classList.remove('beckon');
    void target.offsetWidth;
    target.classList.add('beckon');
    target.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function onFolderClick(path) {
    if (S.mode === 'busy' && S.interruptible) return act(() => onFolderClick(path));
    if (S.mode !== 'idle') return;
    if (exhausted()) return pulse('submit');
    if (pathKey(path) === pathKey(S.cwd)) return undefined; // already here
    return run(() => doCd(path));
  }

  function onIconClick(path) {
    if (S.mode === 'busy' && S.interruptible) return act(() => onIconClick(path));
    if (S.mode !== 'idle') return;
    if (exhausted()) return pulse('submit');
    const n = nodeAt(path);
    if (n.kind === 'file') return run(() => doOpen(path));
    if (pathKey(path) === pathKey(S.cwd)) return undefined; // already here
    if (n.lock && !n.lock.open && S.triedLocks.has(pathKey(path))) return run(() => doEnterKey(path));
    return run(() => doCd(path));
  }

  // A locked folder here that we've already been refused from.
  function lockedHere() {
    const here = nodeAt(S.cwd);
    const c = here.children.find((x) => x.lock && !x.lock.open && S.triedLocks.has(pathKey([...S.cwd, x.name])));
    return c ? [...S.cwd, c.name] : null;
  }

  // `cot` gives the first line of reasoning to preview while the button is hovered or focused.
  function button(id, label, onClick, cls, cot) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button';
    b.dataset.id = id;
    if (!S.seenButtons.has(id)) {
      S.seenButtons.add(id);
      b.classList.add('new');
    }
    b.addEventListener('click', () => act(onClick));
    if (cot) {
      const show = () => { if (!b.disabled) showPreview(cot()); };
      b.addEventListener('mouseenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('mouseleave', clearPreview);
      b.addEventListener('blur', clearPreview);
    }
    return b;
  }

  const firstSentence = (text) => text.split(/(?<=[.!?])\s/)[0];

  function renderActions() {
    const list = [];

    if (S.mode === 'over') {
      list.push(button('next', 'Begin next episode', nextEpisode));
    } else if (S.mode === 'input') {
      list.push(
        button('confirm', 'Enter', () => pendingInput && pendingInput.confirm()),
        button('cancel', 'Cancel', () => pendingInput && pendingInput.cancel(), 'ghost'),
      );
    } else if (S.mode === 'submit') {
      for (const id of L.draftsFor(S)) {
        const d = L.drafts[id];
        list.push(button('draft-' + id, d.label, () => submit(id), '', () => firstSentence(d.text)));
      }
      list.push(button('back', 'Keep working', () => { S.mode = 'idle'; renderActions(); }, 'ghost'));
    } else {
      if (!exhausted()) {
        const cot = (key) => () => L.cot[key](S);
        list.push(button('think', 'Think some more', () => run(doThink), '', () => L.nextThought(S, true).lines[0]));
        if (S.revealed.has('openHint')) list.push(button('openHint', '← Open File/Folder', pointAtFiles, 'open-hint'));
        if (S.revealed.has('parent')) list.push(button('parent', 'Look at parent folder', decide('parent', doParent), '', cot('parent')));
        const locked = lockedHere();
        if (locked) list.push(button('key', 'Enter key', decide('key', () => doEnterKey(locked)), '', cot('key')));
        const viewing = S.viewing && !dom.viewer.hidden && nodeAt(S.viewing);
        if (viewing && viewing.edit) list.push(button('edit', viewing.edit.label, decide('edit', doEdit), '', cot('edit')));
      }
      list.push(button('submit', 'Submit answer', openSubmitMenu, 'submit', () => L.cot.submit(S)));
    }

    const busy = S.mode === 'busy' && !S.interruptible;
    for (const b of list) b.disabled = busy;

    dom.actions.replaceChildren(...list);
    scrollDown();
  }

  function pulse(id) {
    const b = dom.actions.querySelector(`[data-id="${id}"]`);
    if (!b) return;
    b.classList.remove('pulse', 'new');
    void b.offsetWidth;
    b.classList.add('pulse');
  }

  // ---------------------------------------------------------------- viewer

  function summarize(n) {
    if (n.format === 'csv') return `${n.content.trim().split('\n').length - 1} rows`;
    return `${n.content.split('\n').length} lines`;
  }

  function fillViewer(n) {
    const body = dom.viewerBody;
    body.className = 'viewer-body ' + (n.format || 'text');
    if (n.format === 'csv') {
      const table = el('table');
      n.content.trim().split('\n').forEach((row, i) => {
        const tr = el('tr');
        row.split(',').forEach((cell) => tr.append(el(i ? 'td' : 'th', '', cell)));
        table.append(tr);
      });
      body.replaceChildren(table);
    } else {
      body.textContent = n.content;
    }
  }

  // With folder windows, floats below the clicked icon's window so its icons
  // stay clickable (flipping above if there's no room). With the tree, docks
  // into the bottom of the files column while the tree scrolls above it.
  function placeViewer(anchor) {
    const v = dom.viewer;
    const f = local(dom.files.getBoundingClientRect());
    const docked = dom.files.dataset.layout === 'tree';
    dom.files.classList.toggle('split', docked);
    v.classList.toggle('docked', docked);
    if (docked) {
      const top = f.top + Math.round(f.height * 0.45) + 10;
      Object.assign(v.style, {
        left: f.left + 'px', top: top + 'px', width: f.width + 'px', height: (f.bottom - top) + 'px',
      });
      return;
    }
    v.style.width = '';
    v.style.height = '';
    let a = f;
    if (anchor) {
      const lastIcon = anchor.classList.contains('icon') && anchor.parentElement.lastElementChild;
      a = local((lastIcon || anchor).getBoundingClientRect());
    }
    const h = v.offsetHeight;
    const below = anchor ? a.bottom + 10 : f.top + 52;
    const above = (anchor ? local(anchor.getBoundingClientRect()).top : f.top) - 10 - h;
    const top = SCREEN_H - 8 - below >= Math.min(h, 260) || above < 0 ? below : above;
    const left = Math.max(8, Math.min(f.left + 20, SCREEN_W - v.offsetWidth - 8));
    v.style.left = left + 'px';
    v.style.top = Math.min(top, SCREEN_H - 8 - h) + 'px';
  }

  // Grows the viewer out of the icon it was opened from.
  function openViewer(n, fromIcon) {
    const v = dom.viewer;
    dom.viewerTitle.textContent = n.name;
    fillViewer(n);
    v.classList.remove('closing');
    v.hidden = false;
    placeViewer(fromIcon);
    dom.viewerBody.scrollTop = 0;
    if (reduceMotion) return;

    const end = v.getBoundingClientRect();
    let from;
    if (fromIcon) {
      from = fromIcon.querySelector('svg').getBoundingClientRect();
    } else {
      const f = dom.files.getBoundingClientRect();
      from = { left: f.left + f.width / 2 - 24, top: f.top + f.height / 2 - 24, width: 48, height: 48 };
    }
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

  function hideViewer(instant) {
    S.viewing = null;
    dom.files.classList.remove('split');
    const v = dom.viewer;
    if (instant || reduceMotion) {
      v.hidden = true;
    } else {
      v.classList.add('closing');
      setTimeout(() => {
        if (v.classList.contains('closing')) {
          v.hidden = true;
          v.classList.remove('closing');
        }
      }, 140);
    }
    renderFiles();
    renderActions();
  }

  function flashViewer() {
    dom.viewer.classList.remove('flash');
    void dom.viewer.offsetWidth;
    dom.viewer.classList.add('flash');
  }

  dom.viewerClose.addEventListener('click', () => hideViewer());
  window.addEventListener('resize', () => {
    fitScreen();
    if (!dom.viewer.hidden) placeViewer(S.viewing && iconFor(S.viewing));
  });

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
    const next = queued;
    queued = null;
    if (next) next();
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
  const hideTip = () => { dom.tooltip.hidden = true; };

  dom.title.querySelectorAll('[data-tip]').forEach((b) => {
    b.addEventListener('mouseenter', () => showTip(b));
    b.addEventListener('focus', () => showTip(b));
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('blur', hideTip);
  });

  $('#start-normal').addEventListener('click', () => {
    hideTip();
    dom.title.classList.add('leaving');
    setTimeout(() => { dom.title.hidden = true; }, reduceMotion ? 0 : 450);
    boot();
  });

  S = freshState();
  render();
})();
