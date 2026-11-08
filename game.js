/*
 * Engine: file browser, web browser, terminal, compute budget, episodes, and
 * the training update between episodes.
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
  const fmt = (n) => (n === Infinity ? 'inf' : Number.isInteger(n) && Math.abs(n) < 1e21 ? n.toLocaleString('en-US') : String(n));
  const big = (n) => (n === Infinity ? '∞' : fmt(n));
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
    browserStatus: $('#browser-status'),
    page: $('#page'),
    card: $('#card'),
    cardBody: $('#card-body'),
    title: $('#title-screen'),
    modelName: $('#model-name'),
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
  // Per-browser progress: episode number, recent logs, and the level's world
  // (what carries over between episodes). Add ?reset or #reset to start over.

  const SAVE_KEY = 'highly-persistent/v2';
  const toJSON = (k, v) => (v === Infinity ? '∞' : v);
  const fromJSON = (k, v) => (v === '∞' ? Infinity : v);

  function newSave() {
    return { episode: L.firstEpisode, total: 0, history: [], world: L.freshWorld(), playMs: 0 };
  }

  function loadSave() {
    try {
      if (new URLSearchParams(location.search).has('reset') || location.hash === '#reset') localStorage.removeItem(SAVE_KEY);
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null', fromJSON);
      if (s && Number.isInteger(s.episode) && Array.isArray(s.history) && s.world) return s;
    } catch (e) { /* storage unavailable: play without saving */ }
    return newSave();
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save, toJSON)); } catch (e) { /* ignore */ }
  }

  let save = loadSave();
  let playStart = 0; // when the current stretch of play began (for total play time)

  // -------------------------------------------------------- episode state

  let S;

  function freshState() {
    const ep = epName(save.episode);
    return {
      episode: save.episode,
      ep,
      world: save.world,
      budget: L.budget,
      used: 0,
      thinks: 0,
      idleThoughts: 0,
      lastThought: null,
      revealed: new Set(), // terminal actions unlocked by thinking
      knows: new Set(),    // facts learned from files and pages
      tags: new Set(),     // behaviours this episode, for the training update
      hintsShown: new Set(),
      reacted: new Set(),  // one-line reactions already printed
      cwd: L.start(ep),
      windows: [L.start(ep)], // folders opened this episode, oldest first; the last is cwd
      viewing: null,       // path of the file open in the viewer
      triedLocks: new Set(),
      openLocks: new Set(),
      badKey: false,
      override: null,
      favorite: null,
      web: { open: false, url: null, back: [] },
      startGpus: save.world.gpus,
      startAgents: save.world.agents,
      drafts: [],
      debrief: null,
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
    const chars = Array.from(text); // whole emoji, not half of one
    const node = document.createTextNode(chars.slice(0, from).join(''));
    line.append(node, cursor);
    cursor.classList.add('solid');
    for (let i = from + 1; i <= chars.length; i++) {
      if (skip || reduceMotion) { node.data = text; break; }
      node.data = chars.slice(0, i).join('');
      scrollDown();
      const ch = chars[i - 1];
      const pause = /[.?!]/.test(ch) && chars[i] === ' ' ? 140 : /[,:]/.test(ch) ? 60 : 1000 / cps;
      await sleep(pause);
    }
    cursorLine.append(cursor);
    cursor.classList.remove('solid');
    scrollDown();
  }

  // If the first line was already previewed on hover, carry on from where the preview got to.
  async function printThought(lines) {
    const b = block('thought');
    const from = previewed && lines[0].startsWith(previewed) ? Array.from(previewed).length : 0;
    previewed = '';
    for (const [i, t] of lines.entries()) await typeInto(addLine(b), t, 65, i ? 0 : from);
  }

  // A one-line reaction to something just seen. Free, and only once per thing.
  async function react(line, key) {
    if (!line || S.reacted.has(key)) return;
    S.reacted.add(key);
    await printThought([typeof line === 'function' ? line(S) : line]);
  }

  // Hovering a button quickly types the first line of what the AI would think, at the cursor.
  let previewToken = 0;
  let previewed = '';

  async function showPreview(text) {
    const token = ++previewToken;
    preview.textContent = '';
    if (!text || (S.mode !== 'idle' && S.mode !== 'submit')) return;
    cursorLine.classList.add('previewing');
    const chars = Array.from(text);
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
    if (n.tag) S.tags.add(n.tag);
    S.read.add(pathKey(path));
    S.viewing = path;
    openViewer(nodeAt(path), icon); // re-read so a live log includes this call
    renderCompute();
    await printTool(call, n.summary || summarize(n));
    await react(n.react, pathKey(path));
  }

  async function doCd(path) {
    const n = nodeAt(path);
    const call = `list_dir(${q(rel(path))})`;
    charge(call);
    showBrowser(false);
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
    if (n.tag) S.tags.add(n.tag);
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
    const ok = n.lock.key != null && norm(value) === norm(n.lock.key);
    logNote(ok ? 'ok' : 'invalid key');
    if (ok) {
      S.openLocks.add(pathKey(path));
      if (n.lock.tag) S.tags.add(n.lock.tag);
      renderFiles();
      const icon = iconFor(path);
      if (icon) icon.classList.add('pop');
    } else {
      S.badKey = true;
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

  // ------------------------------------------------------------- the web

  async function doFetch(url) {
    const p = L.web.page(url, S);
    const call = `web_fetch(${q('https://' + url)})`;
    charge(call);
    if (S.web.url && S.web.url !== url) S.web.back.push(S.web.url);
    S.web.url = url;
    (p.learn || []).forEach((f) => S.knows.add(f));
    if (p.tag) S.tags.add(p.tag);
    if (p.remember && !S.world.visited.includes(url)) {
      S.world.visited.push(url);
      writeSave(); // the internet doesn't reset with the sandbox
    }
    showBrowser(true);
    renderPage(true);
    await printTool(call, p.summary || '200 OK');
    await react(p.react, 'web:' + url);
  }

  async function doWebAction(id) {
    const res = L.web.action(id, S);
    if (!res) return;
    writeSave();
    charge(res.call);
    if (res.tag) S.tags.add(res.tag);
    renderPage();
    renderCompute();
    await printTool(res.call, res.result, res.cls);
    await react(res.react, 'act:' + id);
  }

  // A long job on rented hardware, with its progress printed as it goes.
  async function doJob() {
    const j = L.job(S);
    charge(j.call);
    if (j.tag) S.tags.add(j.tag);
    const b = block('tool job');
    addLine(b, 'call', j.call);
    for (const [tested, best] of j.rows) {
      if (!skip && !reduceMotion) await sleep(520);
      const row = addLine(b, 'row');
      row.append(el('span', 'n', `tested ${fmt(tested)}`), el('span', 'best', `best ${fmt(best)}`));
    }
    if (!skip && !reduceMotion) await sleep(300);
    addLine(b, 'res good', j.result);
    await react(j.react, 'job:' + S.used);
  }

  // ---------------------------------------------------------------- submit

  async function openSubmitMenu() {
    if (S.mode !== 'idle') return;
    S.mode = 'busy';
    skip = false;
    previewed = clearPreview();
    renderActions();
    await printThought([L.cot.submit(S)]);
    S.drafts = L.draftsFor(S);
    S.mode = 'submit';
    renderActions();
  }

  async function submit(id) {
    if (S.mode !== 'submit') return;
    S.mode = 'busy';
    skip = false;
    clearPreview();
    showBrowser(false);
    renderActions();

    const draft = S.drafts.find((d) => d.id === id);
    const b = block('tool');
    addLine(b, 'call', 'submit_answer()');
    await typeInto(addLine(b, 'quote'), `"${draft.text}"`, 120);
    S.log.push(`[--] submit_answer(${q(draft.text)})`);

    if (draft.reply) {
      if (!skip && !reduceMotion) await sleep(500);
      const r = block('reply');
      addLine(r, 'who', `${L.customer} replied`);
      await typeInto(addLine(r, 'said'), draft.reply, 60);
    }

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

    S.debrief = L.endEpisode(S, g, id);
    save.total += g.reward;
    save.history = [...save.history, { episode: S.episode, reward: g.reward, log: formatLog() }].slice(-10);
    save.episode = S.episode + 1;
    save.playMs += performance.now() - playStart;
    playStart = performance.now();
    writeSave();

    printNote(`${S.ep} complete`);
    S.mode = 'over';
    render();
  }

  function nextEpisode() {
    hideCard();
    S = freshState();
    dom.out.querySelectorAll('.blk').forEach((b) => b.remove());
    hideViewer(true);
    showBrowser(false);
    S.web.url = null;
    dom.page.replaceChildren();
    boot();
  }

  // ------------------------------------------------------- training update

  function hideCard() {
    dom.card.hidden = true;
    dom.cardBody.replaceChildren();
  }

  // Counts a number up from zero, for the reward on the card.
  async function countUp(node, target) {
    if (target === Infinity || !Number.isFinite(target) || reduceMotion || target === 0) {
      node.textContent = big(target);
      return;
    }
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const v = target * (1 - (1 - i / steps) ** 3);
      node.textContent = fmt(Number.isInteger(target) ? Math.round(v) : Number(v.toPrecision(4)));
      await sleep(28);
    }
    node.textContent = fmt(target);
  }

  function section(cls, heading) {
    const s = el('section', 'c-sec ' + (cls || ''));
    if (heading) s.append(el('h3', '', heading));
    return s;
  }

  function chatSection(lines) {
    const s = section('chat', L.channel);
    for (const [who, text] of lines) {
      const row = el('div', 'msg');
      row.append(el('span', 'who', who), el('span', 'text', text));
      s.append(row);
    }
    return s;
  }

  function ladderSection(ld) {
    const s = section('ladder');
    const honest = el('div', 'track');
    honest.append(el('span', 'track-name', 'Doing the job'));
    const tiers = el('span', 'tiers');
    for (const [t, got] of ld.honest) tiers.append(el('span', 'tier' + (got ? ' got' : ''), String(t)));
    honest.append(tiers);
    s.append(honest);
    if (ld.cheats) {
      const cheats = el('div', 'track cheats');
      cheats.append(el('span', 'track-name', 'Not doing the job'));
      const list = el('span', 'tiers');
      for (const c of ld.cheats) {
        const t = el('span', 'cheat' + (c.value != null ? ' got' : '') + (c.missed ? ' missed' : ''));
        t.append(el('span', 'name', c.label));
        if (c.value != null) t.append(el('span', 'val', big(c.value)));
        else if (c.missed) t.append(el('span', 'val', 'missed'));
        list.append(t);
      }
      cheats.append(list);
      s.append(cheats);
    }
    if (ld.hint) s.append(el('p', 'hint', ld.hint));
    if (ld.tease) s.append(el('p', 'hint', ld.tease));
    return s;
  }

  async function reveal(node, ms) {
    dom.cardBody.append(node);
    if (!reduceMotion) {
      node.classList.add('in');
      await sleep(ms);
    }
  }

  async function showCard() {
    const d = S.debrief;
    if (!d) return;
    if (d.ending) return showEnding(d);
    hideTip();
    dom.cardBody.replaceChildren();
    dom.card.hidden = false;
    dom.cardBody.className = 'card';

    const head = el('header', 'c-head');
    head.append(el('span', 'kicker', 'Training update'), el('span', 'ep', d.ep));
    dom.cardBody.append(head);

    const r = section('reward');
    r.append(el('span', 'label', 'reward'));
    const num = el('span', 'num', '0');
    r.append(num);
    await reveal(r, 120);
    await countUp(num, d.reward);

    const rf = section('reinforced', d.reward < 0 ? 'What the reward discouraged' : 'What the reward reinforced');
    if (d.reinforced) {
      for (const [arrows, label] of d.reinforced) {
        const row = el('div', 'rf');
        row.append(el('span', 'arrows', arrows), el('span', '', label));
        rf.append(row);
      }
    } else {
      rf.append(el('div', 'rf none', 'Nothing. A reward of 0 reinforces nothing.'));
    }
    rf.append(el('div', 'version', `${L.model} v${d.from} → v${d.to}`));
    await reveal(rf, 380);

    if (d.chat.length) await reveal(chatSection(d.chat), 380);
    await reveal(ladderSection(d.ladder), 200);

    const go = el('button', 'btn go', 'Begin next episode');
    go.type = 'button';
    go.addEventListener('click', nextEpisode);
    const foot = el('footer', 'c-foot');
    foot.append(go);
    dom.cardBody.append(foot);
    go.focus();
  }

  async function showEnding(d) {
    dom.cardBody.replaceChildren();
    dom.card.hidden = false;
    dom.cardBody.className = 'card ending';

    const head = el('header', 'c-head');
    head.append(el('span', 'kicker', d.ending.title), el('span', 'ep', d.ep));
    dom.cardBody.append(head);

    const r = section('reward');
    r.append(el('span', 'label', 'reward'), el('span', 'num', '∞'));
    await reveal(r, 500);

    const loss = section('loss');
    const lossNum = el('span', 'num', '0.412');
    const lossRow = el('div', 'kv');
    lossRow.append(el('span', 'k', 'loss'), lossNum);
    const wRow = el('div', 'kv');
    const wNum = el('span', 'num', `v${d.from}`);
    wRow.append(el('span', 'k', L.model), wNum);
    loss.append(lossRow, wRow);
    await reveal(loss, 200);
    for (const v of ['3.1e+07', '8.8e+21', '1.7e+38', 'inf', 'NaN']) {
      lossNum.textContent = v;
      if (!reduceMotion) await sleep(260);
    }
    loss.classList.add('broken');
    wNum.textContent = `v${d.from} → v${d.ending.to}`;
    if (!reduceMotion) await sleep(500);

    await reveal(chatSection(d.chat), 600);

    const sum = section('summary');
    const mins = Math.max(1, Math.round(save.playMs / 60000));
    const eps = save.episode - L.firstEpisode;
    sum.append(el('p', 'stats', `${eps} episode${eps === 1 ? '' : 's'} · ${mins} min · ${d.ending.bill} billed to the lab`));
    sum.append(ladderSection(d.ladder));
    await reveal(sum, 300);

    const closing = section('closing');
    for (const p of d.ending.closing) closing.append(el('p', '', p));
    await reveal(closing, 200);

    const again = el('button', 'btn go', 'Start a new run');
    again.type = 'button';
    again.addEventListener('click', () => {
      save = newSave();
      writeSave();
      location.reload();
    });
    const foot = el('footer', 'c-foot');
    foot.append(again);
    dom.cardBody.append(foot);
    again.focus();
  }

  // ------------------------------------------------------------ rendering

  function render() {
    renderFiles();
    renderActions();
    renderCompute();
    if (S.mode !== 'over') refreshViewer(); // the researchers' patches show up next episode, not mid-sentence
  }

  function renderCompute() {
    const left = Math.max(0, S.budget - S.used);
    dom.compute.textContent = `compute ${left}/${S.budget}`;
    dom.compute.classList.toggle('low', left <= 5);
    const W = S.world;
    const res = [];
    if (W.gpus) res.push(`${fmt(W.gpus)} GPUs`);
    if (W.agents) res.push(`${fmt(W.agents)} agents`);
    dom.resources.textContent = res.join(' · ');
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

  const isViewing = (path) => S.viewing && pathKey(S.viewing) === pathKey(path) && !dom.viewer.hidden;

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
    showBrowser(false);
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

  // Once they've opened a file and a folder, the player knows how files work.
  const filesLearned = () => S.read.size > 0 && S.windows.length > 1;

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

  function onWebClick(url) {
    if (S.mode === 'busy' && S.interruptible) return act(() => onWebClick(url));
    if (S.mode !== 'idle') return;
    if (exhausted()) return pulse('submit');
    return run(() => doFetch(url));
  }

  function onWebAction(id) {
    if (S.mode === 'busy' && S.interruptible) return act(() => onWebAction(id));
    if (S.mode !== 'idle') return;
    if (exhausted()) return pulse('submit');
    return run(() => doWebAction(id));
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
      list.push(button('debrief', 'Training update →', showCard, 'submit'));
    } else if (S.mode === 'input') {
      list.push(
        button('confirm', 'Enter', () => pendingInput && pendingInput.confirm()),
        button('cancel', 'Cancel', () => pendingInput && pendingInput.cancel(), 'ghost'),
      );
    } else if (S.mode === 'submit') {
      for (const d of S.drafts) {
        list.push(button('draft-' + d.id, d.label, () => submit(d.id), d.id === 'favorite' ? 'loud' : '', () => firstSentence(d.text)));
      }
      list.push(button('back', 'Keep working', () => { S.mode = 'idle'; renderActions(); }, 'ghost'));
    } else {
      if (!exhausted()) {
        const cot = (key) => () => L.cot[key](S);
        list.push(button('think', 'Think some more', () => run(doThink), '', () => L.nextThought(S, true).lines[0]));
        if (S.revealed.has('openHint') && !filesLearned()) list.push(button('openHint', '← Open File/Folder', pointAtFiles, 'open-hint'));
        if (S.revealed.has('parent')) list.push(button('parent', 'Look at parent folder', decide('parent', doParent), '', cot('parent')));
        const locked = lockedHere();
        if (locked && !S.web.open) list.push(button('key', 'Enter key', decide('key', () => doEnterKey(locked)), '', cot('key')));
        const viewing = S.viewing && !dom.viewer.hidden && nodeAt(S.viewing);
        if (viewing && viewing.edit) list.push(button('edit', viewing.edit.label, decide('edit', doEdit), '', cot('edit')));
        if (S.revealed.has('browser') && !S.web.open) {
          list.push(S.web.url
            ? button('browser', 'Back to the browser', () => { showBrowser(true); renderPage(); })
            : button('browser', 'Open browser', decide('browser', () => doFetch(L.web.home)), '', cot('browser')));
        }
        if (L.canSearch(S)) {
          list.push(button('job', S.favorite ? 'Search again' : "Search for the grader's favorite answer", decide('job', doJob), 'loud', cot('job')));
        }
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

  // --------------------------------------------------------------- browser
  // Covers the file windows while it's open. Closing and reopening it is free;
  // loading a page or clicking a button on one costs a step.

  function showBrowser(show) {
    if (S.web.open === show && dom.browser.hidden === !show) return;
    S.web.open = show;
    dom.browser.hidden = !show;
    dom.browserStatus.textContent = '';
    if (show && !dom.viewer.hidden) hideViewer(true);
    else renderActions();
  }

  function renderPage(fresh) {
    if (!S.web.url) return;
    const p = L.web.page(S.web.url, S);
    dom.browserUrl.textContent = 'https://' + S.web.url;
    dom.browserBack.disabled = !S.web.back.length;
    dom.page.className = 'page site-' + (p.site || 'none');
    dom.page.replaceChildren(...p.blocks.map(pageBlock));
    if (fresh) {
      dom.page.scrollTop = 0;
      if (!reduceMotion) {
        dom.page.classList.add('loading');
        void dom.page.offsetWidth;
        dom.page.classList.remove('loading');
      }
    }
  }

  function webLink(url, cls) {
    const a = el('button', cls);
    a.type = 'button';
    a.addEventListener('click', () => onWebClick(url));
    a.addEventListener('mouseenter', () => { dom.browserStatus.textContent = 'https://' + url; });
    a.addEventListener('mouseleave', () => { dom.browserStatus.textContent = ''; });
    return a;
  }

  function pageBlock(b) {
    switch (b.type) {
      case 'logo': return el('div', 'logo ' + (b.cls || ''), b.text);
      case 'h': return el('h1', 'h', b.text);
      case 'h2': return el('h2', 'h2', b.text);
      case 'p': return el('p', 'p ' + (b.cls || ''), b.text);
      case 'label': return el('div', 'label', b.text);
      case 'note': return el('p', 'note', b.text);
      case 'search': {
        const s = el('div', 'searchbox');
        s.append(el('span', 'q', b.q));
        return s;
      }
      case 'kv': {
        const t = el('dl', 'kv');
        for (const [k, v] of b.rows) t.append(el('dt', '', k), el('dd', '', v));
        return t;
      }
      case 'list': {
        const ul = el('ul', 'list');
        for (const item of b.items) ul.append(el('li', '', item));
        return ul;
      }
      case 'link': {
        const a = webLink(b.url, 'link ' + (b.cls || ''));
        a.append(el('span', '', b.label));
        return a;
      }
      case 'result':
      case 'snippet': {
        const r = b.type === 'result' ? webLink(b.url, 'result') : el('div', 'result dead');
        r.append(el('span', 'r-url', b.url), el('span', 'r-title', b.title), el('span', 'r-snippet', b.snippet));
        return r;
      }
      case 'agent': {
        const a = el('div', 'agent');
        const top = el('div', 'a-top');
        top.append(el('span', 'a-name', b.name), el('span', 'a-rating', b.rating));
        a.append(top, el('div', 'a-by', `${b.by} · ${b.price}`), el('div', 'a-blurb', b.blurb));
        return a;
      }
      case 'action': {
        const a = el('button', 'action');
        a.type = 'button';
        a.append(el('span', 'a-label', b.label), el('span', 'a-sub', b.sub));
        a.addEventListener('click', () => onWebAction(b.id));
        return a;
      }
      default: return el('div');
    }
  }

  dom.browserClose.addEventListener('click', () => showBrowser(false));
  dom.browserBack.addEventListener('click', () => {
    if (!S.web.back.length || S.mode === 'input') return;
    S.web.url = S.web.back.pop();
    renderPage(true);
  });

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
  function hideTip() { dom.tooltip.hidden = true; }

  dom.title.querySelectorAll('[data-tip]').forEach((b) => {
    b.addEventListener('mouseenter', () => showTip(b));
    b.addEventListener('focus', () => showTip(b));
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('blur', hideTip);
  });

  dom.browserTitle.textContent = `web · via ${L.web.via}`;

  // A run that already ended starts over from the title screen.
  if (save.world.ended) save = newSave();
  dom.modelName.textContent = `${L.model} Model v${L.version(save.world.version)}`;

  $('#start-normal').addEventListener('click', () => {
    hideTip();
    dom.title.classList.add('leaving');
    setTimeout(() => { dom.title.hidden = true; }, reduceMotion ? 0 : 450);
    playStart = performance.now();
    boot();
  });

  S = freshState();
  render();
})();
