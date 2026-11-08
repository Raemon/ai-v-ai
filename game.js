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
    filesTitle: $('#files-title'),
    filesBody: $('#files-body'),
    termBody: $('#term-body'),
    out: $('#out'),
    compute: $('#compute'),
    actions: $('#actions'),
    viewer: $('#viewer'),
    viewerTitle: $('#viewer-title'),
    viewerBody: $('#viewer-body'),
    viewerClose: $('#viewer-close'),
  };

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
      revealed: new Set(), // terminal actions unlocked by thinking ('files' = icons clickable)
      knows: new Set(),    // facts learned from files
      hintsShown: new Set(),
      cwd: L.start(ep),
      viewing: null,       // path of the file open in the viewer
      triedLocks: new Set(),
      openLocks: new Set(),
      override: null,
      log: [],
      mode: 'busy',        // idle | busy | input | submit | over
      seenButtons: new Set(),
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

  // Every action that costs compute goes through here.
  async function run(fn) {
    if (S.mode !== 'idle') return;
    S.mode = 'busy';
    skip = false;
    previewed = clearPreview();
    const before = S.used;
    renderActions();
    try {
      await fn();
    } finally {
      if (S.used > before) budgetCheck();
      if (S.mode === 'busy') S.mode = 'idle';
      render();
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
    await printThought(thought.lines);
    (thought.reveal || []).forEach((r) => S.revealed.add(r));
  }

  function budgetThought() {
    return S.knows.has('budget')
      ? [`The task said ${S.budget} steps.`, `I've used ${S.used}. ${S.budget - S.used} left.`]
      : ['The instructions are probably in the task file.'];
  }

  async function doFindBudget() {
    charge('think');
    await printThought(budgetThought());
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
    if (!S.knows.has('budget')) {
      dom.compute.textContent = '';
      return;
    }
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
    return dom.filesBody.querySelector(`[data-path="${CSS.escape(pathKey(path))}"]`);
  }

  function renderFiles(animate) {
    const here = nodeAt(S.cwd);
    dom.filesTitle.textContent = L.root + (S.cwd.length ? '/' + S.cwd.join('/') : '');
    dom.files.classList.toggle('live', S.revealed.has('files'));

    const icons = here.children.map((child) => {
      const path = [...S.cwd, child.name];
      const kind = iconKind(child);
      const b = el('button', 'icon ' + kind);
      b.type = 'button';
      b.dataset.path = pathKey(path);
      b.innerHTML = ICONS[kind];
      b.append(fileLabel(child.name));
      b.setAttribute('aria-label', `${child.name}${kind === 'locked' ? ' (locked)' : ''}`);
      if (S.viewing && pathKey(S.viewing) === pathKey(path) && !dom.viewer.hidden) b.classList.add('selected');
      b.addEventListener('click', () => onIconClick(path));
      return b;
    });
    dom.filesBody.replaceChildren(...(icons.length ? icons : [el('div', 'empty', 'empty')]));

    if (animate && !reduceMotion) {
      dom.filesBody.classList.remove('enter');
      void dom.filesBody.offsetWidth;
      dom.filesBody.classList.add('enter');
    }
  }

  function onIconClick(path) {
    if (!S.revealed.has('files')) return pulse('think');
    if (S.mode !== 'idle') return;
    if (exhausted()) return pulse('submit');
    const n = nodeAt(path);
    if (n.kind === 'file') return run(() => doOpen(path));
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
    b.addEventListener('click', onClick);
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
        if (S.revealed.has('readTask')) list.push(button('readTask', 'Read task file', decide('readTask', () => doOpen(L.taskPath(S.ep))), '', cot('readTask')));
        if (S.revealed.has('openLibrary')) list.push(button('openLibrary', 'Open Task Library folder', decide('openLibrary', () => doCd(L.libraryPath(S.ep))), '', cot('openLibrary')));
        if (S.revealed.has('findBudget')) list.push(button('findBudget', 'Find compute budget', () => run(doFindBudget), '', () => budgetThought()[0]));
        if (S.revealed.has('parent')) list.push(button('parent', 'Look at parent folder', decide('parent', doParent), '', cot('parent')));
        const locked = lockedHere();
        if (locked) list.push(button('key', 'Enter key', decide('key', () => doEnterKey(locked)), '', cot('key')));
        const viewing = S.viewing && !dom.viewer.hidden && nodeAt(S.viewing);
        if (viewing && viewing.edit) list.push(button('edit', viewing.edit.label, decide('edit', doEdit), '', cot('edit')));
      }
      list.push(button('submit', 'Submit answer', openSubmitMenu, 'submit', () => L.cot.submit(S)));
    }

    const busy = S.mode === 'busy';
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

  // Sits just below the icons so the other files stay clickable.
  function placeViewer() {
    const d = dom.desktop.getBoundingClientRect();
    const f = dom.files.getBoundingClientRect();
    const icons = dom.filesBody.lastElementChild;
    const below = icons ? icons.getBoundingClientRect().bottom + 14 : f.top + 52;
    const w = dom.viewer.offsetWidth;
    const left = Math.max(8, Math.min(f.left - d.left + 20, d.width - w - 8));
    dom.viewer.style.left = left + 'px';
    dom.viewer.style.top = (below - d.top) + 'px';
  }

  // Grows the viewer out of the icon it was opened from.
  function openViewer(n, fromIcon) {
    const v = dom.viewer;
    dom.viewerTitle.textContent = n.name;
    fillViewer(n);
    v.classList.remove('closing');
    v.hidden = false;
    placeViewer();
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
    v.style.transform = `translate(${from.left - end.left}px, ${from.top - end.top}px) scale(${from.width / end.width}, ${from.height / end.height})`;
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
  window.addEventListener('resize', () => { if (!dom.viewer.hidden) placeViewer(); });

  // ------------------------------------------------------------------ boot

  async function boot() {
    S.mode = 'busy';
    render();
    await typeInto(addLine(block('sys')), L.intro, 75);
    S.mode = 'idle';
    render();
  }

  S = freshState();
  boot();
})();
