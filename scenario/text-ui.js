// Cmd-click (Ctrl-click off a Mac) any text to change what it says in the source, and Commit it:
// through tools/serve.js when it's running (a git commit on this computer), and otherwise to main
// on GitHub with the token the scenario editor uses (github.js). Holding the key outlines the bubble
// the text is in, and the panel has a field for each string in the source that bubble is made from.
(function () {
  'use strict';

  const T = TEXT_EDIT;
  const G = window.GITHUB_SAVE;
  const ROOT = new URL('..', document.currentScript.src);
  const OWN = /^scenario\/(text|text-ui|github)\.js$/;

  const sources = new Map(); // repo path → its text, as fetched (or as last committed)
  let server = null;          // is tools/serve.js there? null until asked
  let panel = null;
  let mark = null;
  let armed = false;

  const pathOf = (url) => {
    const u = new URL(url, location.href);
    if (u.origin !== ROOT.origin || !u.pathname.startsWith(ROOT.pathname)) return null;
    const p = decodeURIComponent(u.pathname.slice(ROOT.pathname.length)) || 'index.html';
    return p.endsWith('/') ? `${p}index.html` : p;
  };

  function sourcePaths() {
    const paths = [pathOf(location.href), ...[...document.scripts].map((s) => s.src && pathOf(s.src))];
    return [...new Set(paths)].filter((p) => p && T.EDITABLE.test(p) && !OWN.test(p));
  }

  async function load(path) {
    if (!sources.has(path)) {
      const res = await fetch(new URL(path, ROOT), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Couldn't read ${path} (${res.status}).`);
      sources.set(path, await res.text());
    }
    return { path, raw: sources.get(path) };
  }

  async function findServer() {
    if (server !== null) return server;
    try {
      const res = await fetch(new URL('api/scenarios', ROOT));
      server = (res.headers.get('content-type') || '').includes('json');
    } catch (e) { server = false; }
    return server;
  }

  // ------------------------------------------------------------- the text under the pointer

  function caretAt(x, y) {
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      return p && { node: p.offsetNode, offset: p.offset };
    }
    const r = document.caretRangeFromPoint && document.caretRangeFromPoint(x, y);
    return r && { node: r.startContainer, offset: r.startOffset };
  }

  const inPanel = (node) => panel && node && panel.contains(node.nodeType === 1 ? node : node.parentNode);

  // The text node under (x, y), if the point is really on its words and not just near them.
  function textAt(x, y, target) {
    const c = caretAt(x, y);
    if (c && c.node && c.node.nodeType === 3 && c.node.data.trim()) {
      const range = document.createRange();
      range.selectNodeContents(c.node);
      if ([...range.getClientRects()].some((r) => x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2)) return c;
    }
    if (!target || target.nodeType !== 1) return null;
    const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.trim() ? 1 : 3) });
    const node = walk.nextNode();
    return node ? { node, offset: 0 } : null;
  }

  function outline(node) {
    if (!mark) {
      mark = document.createElement('div');
      mark.className = 'text-edit-mark';
      document.body.appendChild(mark);
    }
    if (!node) { mark.hidden = true; return; }
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = node.nodeType === 1 ? node.getBoundingClientRect() : range.getBoundingClientRect();
    Object.assign(mark.style, { left: `${r.left - 3}px`, top: `${r.top - 2}px`, width: `${r.width + 6}px`, height: `${r.height + 4}px` });
    mark.hidden = false;
  }

  const wants = (e) => e.metaKey || e.ctrlKey;

  document.addEventListener('keydown', (e) => { if (e.key === 'Meta' || e.key === 'Control') armed = true; });
  document.addEventListener('keyup', (e) => { if (e.key === 'Meta' || e.key === 'Control') { armed = false; outline(null); } });
  window.addEventListener('blur', () => { armed = false; outline(null); });
  document.addEventListener('mousemove', (e) => {
    if (!(armed || wants(e)) || inPanel(e.target)) return outline(null);
    const hit = textAt(e.clientX, e.clientY, null);
    outline(hit && bubbleOf(blockOf(hit.node).el));
  }, { passive: true });

  // The page never sees a cmd-click: the game acts on pointerdown and click.
  const swallow = (e) => {
    if (!wants(e) || e.button > 0 && e.type !== 'contextmenu' || inPanel(e.target)) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    return true;
  };
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach((type) => window.addEventListener(type, swallow, true));
  window.addEventListener('click', (e) => { if (swallow(e)) open(e); }, true);
  window.addEventListener('contextmenu', (e) => { if (e.ctrlKey && !e.metaKey && swallow(e)) open(e); }, true); // a Mac's ctrl-click

  // ------------------------------------------------------------- the panel

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  function close() {
    if (panel) panel.remove();
    panel = null;
  }

  // The words around a text on the page: what its section says besides it.
  function nearbyText(node) {
    let box = node.parentElement;
    for (let up = 0; box && box.parentElement && up < 3 && (box.textContent.length < 200); up++) box = box.parentElement;
    return box ? box.textContent.slice(0, 2000) : '';
  }

  // The line or block a text node is part of: the game types thoughts out a word to a node, so a
  // word alone says too little. `at` is where the node starts in the block's text.
  function blockOf(node) {
    let box = node.parentElement;
    while (box && box.parentElement && box !== document.body && /^inline/.test(getComputedStyle(box).display)) box = box.parentElement;
    const text = box ? box.textContent : '';
    if (!box || text.length > 3000) return { el: node.parentElement, text: node.data, at: 0 };
    let at = 0;
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n && n !== node; n = walk.nextNode()) at += n.data.length;
    return { el: box, text, at };
  }

  // The bubble a block is in: the nearest box drawn around it (a border or a background), so a
  // thought's lines open together. Not one so big it's a whole window of text.
  const MAX_BUBBLE = 4000;
  const drawn = (box) => {
    const cs = getComputedStyle(box);
    const visible = (c) => c && !/^(transparent|rgba\(.*,\s*0\))$/.test(c);
    return (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && visible(cs.borderTopColor)) || visible(cs.backgroundColor);
  };
  function bubbleOf(block) {
    for (let box = block; box && box !== document.body; box = box.parentElement) {
      if (box.textContent.length > MAX_BUBBLE) break;
      if (drawn(box)) return box;
    }
    return block;
  }

  // The blocks of text in a bubble, in order: one for each line or paragraph.
  function blocksIn(bubble) {
    const blocks = [];
    const seen = new Set();
    const walk = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.trim() ? 1 : 3) });
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const b = blockOf(n);
      if (seen.has(b.el)) continue;
      seen.add(b.el);
      blocks.push({ ...b, node: n });
    }
    return blocks;
  }

  const describe = (node) => {
    const cls = [...node.classList].filter((c) => !/^(past|on|lit|active)$/.test(c)).slice(0, 3);
    return `${node.tagName.toLowerCase()}${cls.map((c) => `.${c}`).join('')}`;
  };

  async function open(e) {
    const hit = textAt(e.clientX, e.clientY, e.target);
    if (!hit) return;
    close();
    outline(null);
    panel = el('div', 'text-edit');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Edit text');
    const status = el('p', 'text-edit-status', 'Looking for this text in the source…');
    panel.append(status);
    document.body.appendChild(panel);
    place(e.clientX, e.clientY);

    const mine = panel;
    try {
      const files = await Promise.all(sourcePaths().map(load));
      const clicked = blockOf(hit.node);
      const bubble = bubbleOf(clicked.el);
      const blocks = blocksIn(bubble);
      if (!blocks.some((b) => b.el === clicked.el)) blocks.unshift({ ...clicked, node: hit.node });
      // One field for each place in the source; lines that come from the same string share one.
      const fields = [];
      const byPlace = new Map();
      for (const b of blocks) {
        const at = b.el === clicked.el ? b.at + hit.offset : null;
        const found = T.find(b.text, files, at, nearbyText(b.el));
        const key = found.places.length ? `${found.places[0].path}:${found.places[0].start}` : null;
        if (key && byPlace.has(key)) { byPlace.get(key).blocks.push(b); continue; }
        const field = { blocks: [b], places: found.places, clicked: b.el === clicked.el };
        if (key) byPlace.set(key, field);
        fields.push(field);
      }
      if (panel !== mine) return;
      fill(mine, bubble, fields);
      place(e.clientX, e.clientY);
    } catch (err) {
      if (panel === mine) status.textContent = err.message;
    }
  }

  function place(x, y) {
    const w = Math.min(520, innerWidth - 24);
    panel.style.width = `${w}px`;
    panel.style.left = `${Math.max(12, Math.min(x - 20, innerWidth - w - 12))}px`;
    const h = Math.max(panel.offsetHeight, 120);
    const below = y + 18;
    panel.style.top = `${below + h < innerHeight - 12 ? below : Math.max(12, Math.min(y - h - 18, innerHeight - h - 12))}px`;
  }

  const lineAt = (p) => sources.get(p.path).split('\n')[p.line - 1].trim();
  const rowsFor = (text) => Math.min(14, Math.max(2, Math.ceil(text.length / 56) + (text.match(/\n/g) || []).length));

  // One field: the whole string a line or paragraph comes from, where it is, and what kind it is.
  function field(f) {
    const wrap = el('div', 'text-edit-field');
    const where = el('div', 'text-edit-where');
    const meta = el('div', 'text-edit-meta');
    if (!f.places.length) {
      wrap.classList.add('missing');
      where.textContent = 'not in the source';
      meta.textContent = 'put together as the game runs';
      const shown = el('div', 'text-edit-shown', f.blocks.map((b) => b.text).join('\n'));
      wrap.append(where, shown, meta);
      return { wrap, changed: () => false };
    }
    const input = el('textarea', 'text-edit-input');
    input.spellcheck = true;
    const state = { chosen: null, input, blocks: f.blocks };
    const describeMeta = () => {
      const p = state.chosen;
      const bits = [p.kind, `${p.text.length} chars`];
      if (f.blocks.length > 1) bits.push(`${f.blocks.length} lines on the page`);
      bits.push(`on the page: ${describe(f.blocks[0].el)}`);
      const shown = f.blocks.map((b) => b.text.trim()).join(' ');
      if (!shown.includes(p.text.trim()) || shown.length > p.text.trim().length + 2) bits.push(`part of “${T.clip(shown, 50)}”`);
      meta.textContent = bits.join(' · ');
    };
    const choose = (p) => {
      if (state.chosen && input.value !== state.chosen.text) return; // keep what's been typed
      state.chosen = p;
      input.value = p.text;
      input.rows = rowsFor(p.text);
      describeMeta();
    };
    if (f.places.length > 1) {
      const pick = el('select');
      f.places.forEach((p, i) => pick.append(Object.assign(el('option', '', `${p.path}:${p.line}  ${lineAt(p).slice(0, 60)}`), { value: i })));
      pick.addEventListener('change', () => { choose(f.places[pick.value]); pick.value = f.places.indexOf(state.chosen); });
      where.append(pick, el('span', '', ` · in ${f.places.length} places`));
    } else where.textContent = `${f.places[0].path}:${f.places[0].line}`;
    choose(f.places[0]);
    wrap.append(where, input, meta);
    state.wrap = wrap;
    state.changed = () => input.value !== state.chosen.text;
    return state;
  }

  function fill(box, bubble, fields) {
    box.textContent = '';
    const editable = fields.filter((f) => f.places.length);
    const head = el('div', 'text-edit-head',
      editable.length ? `${editable.length} ${editable.length === 1 ? 'string' : 'strings'} in this ${describe(bubble)}` : `Couldn't find this text in the source: it may be put together as the game runs.`);
    const list = el('div', 'text-edit-fields');
    const states = fields.map(field);
    states.forEach((st) => list.append(st.wrap));
    const status = el('p', 'text-edit-status');
    box.append(head, list, status);
    if (!editable.length) { addButtons(box, null); return; }

    const commit = async () => {
      const todo = states.filter((st) => st.changed());
      if (!todo.length) { status.textContent = 'Nothing has changed.'; return; }
      status.textContent = 'Committing…';
      // Later in a file first, so an earlier edit doesn't move where a later one is.
      todo.sort((a, b) => (a.chosen.path === b.chosen.path ? b.chosen.start - a.chosen.start : 0));
      const notes = new Set();
      let last = null;
      try {
        for (const st of todo) {
          const was = st.chosen.text;
          const now = st.input.value;
          const done = await save(st.chosen, was, now);
          const shownHere = showOnPage(st.blocks, was, now);
          st.chosen = { ...st.chosen, text: now };
          if (done.note) notes.add(done.note);
          if (!shownHere) notes.add('reload to see it');
          last = done;
        }
        const note = [...notes].join(' · ');
        const what = `${todo.length > 1 ? `${todo.length} commits` : 'Committed'}`;
        status.textContent = '';
        status.append(last.link ? Object.assign(el('a', '', what), { href: last.link, target: '_blank', rel: 'noopener' }) : el('span', '', last.committed ? what : 'Saved'),
          el('span', '', note ? ` · ${note}` : ''));
        setTimeout(() => { if (panel === box) close(); }, note ? 6000 : 2500);
      } catch (err) { status.textContent = err.message; }
    };
    states.forEach((st) => st.input && st.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
    }));
    addButtons(box, commit);
    const first = states.find((st, i) => st.input && fields[i].clicked) || states.find((st) => st.input);
    first.input.focus();
    first.input.setSelectionRange(first.input.value.length, first.input.value.length);
  }

  // The new words in place on the page, where the old ones are all in one text node.
  function showOnPage(blocks, was, now) {
    for (const b of blocks) {
      const walk = document.createTreeWalker(b.el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (n.data.includes(was)) { n.data = n.data.replace(was, now); return true; }
      }
    }
    return false;
  }

  async function addButtons(box, commit) {
    const row = el('div', 'text-edit-buttons');
    const cancel = el('button', 'btn quiet', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', close);
    row.append(cancel);
    box.append(row);
    if (!commit) return;
    const go = el('button', 'btn gold', 'Commit');
    go.type = 'button';
    go.addEventListener('click', commit);
    row.append(go);
    if (await findServer()) return;
    if (G && G.account()) { row.prepend(el('span', 'text-edit-who', `to ${G.BRANCH} as ${G.account().login}`)); return; }
    go.disabled = true;
    const connect = el('button', 'btn quiet', 'Connect GitHub');
    connect.type = 'button';
    connect.title = 'Or run node tools/serve.js to commit on this computer.';
    connect.addEventListener('click', () => {
      window.open(G.NEW_TOKEN_URL, '_blank', 'noopener');
      connect.remove();
      box.insertBefore(tokenForm(box, () => { go.disabled = false; row.prepend(el('span', 'text-edit-who', `to ${G.BRANCH} as ${G.account().login}`)); }), row);
    });
    row.prepend(connect);
  }

  // Under the text, once GitHub's new-token page is open in another tab: what to do there, and
  // a field for the token, which connects as soon as it's pasted.
  function tokenForm(box, done) {
    const form = el('div', 'text-edit-token');
    const field = el('input');
    field.type = 'password';
    field.placeholder = 'Paste the token here';
    field.autocomplete = 'off';
    const again = Object.assign(el('a', '', 'open it again'), { href: G.NEW_TOKEN_URL, target: '_blank', rel: 'noopener' });
    const steps = el('p', '', `${G.TOKEN_STEPS} `);
    steps.append('(', again, ')');
    form.append(steps, field);
    const status = () => box.querySelector('.text-edit-status');
    const tryIt = async () => {
      const token = field.value.trim();
      if (!token) return;
      status().textContent = 'Checking the token…';
      try {
        await G.connect(token);
        form.remove();
        status().textContent = `Connected as ${G.account().login}.`;
        done();
      } catch (e) { status().textContent = e.message; }
    };
    field.addEventListener('paste', () => setTimeout(tryIt, 0));
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tryIt(); } });
    setTimeout(() => field.focus(), 0);
    return form;
  }

  // ------------------------------------------------------------- committing

  async function save(where, was, now) {
    const raw = sources.get(where.path);
    const edit = T.plan(raw, where.path, where, was, now);
    const message = T.message(where.path, was, now);
    T.apply(raw, where.path, edit); // refuses a change that would break the file, before it goes anywhere
    if (await findServer()) {
      const res = await fetch(new URL('api/text', ROOT), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: where.path, edit, message }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The server answered ${res.status}.`);
      sources.set(where.path, data.text);
      return { committed: !!data.commit, note: data.commit ? `${data.commit.slice(0, 7)} on this computer` : data.note };
    }
    if (!G || !G.account()) throw new Error('Connect GitHub first, or run node tools/serve.js.');
    let written = null;
    const made = await G.commit(message, async (read) => {
      const text = await read(where.path);
      if (text === null) throw new Error(`${where.path} isn't on ${G.BRANCH}.`);
      written = T.apply(text, where.path, edit);
      return { [where.path]: written };
    });
    sources.set(where.path, written);
    return { link: made.commit, note: 'the site has it in a minute or two' };
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel) { e.stopImmediatePropagation(); close(); } }, true);
  document.addEventListener('pointerdown', (e) => { if (panel && !inPanel(e.target) && !wants(e)) close(); }, true);

  const style = document.createElement('style');
  style.textContent = `
    .text-edit-mark { position: fixed; z-index: 9998; pointer-events: none; border: 1px dashed var(--tool, #d8b16a); border-radius: 4px; background: color-mix(in srgb, var(--tool, #d8b16a) 8%, transparent); }
    .text-edit { position: fixed; z-index: 9999; box-sizing: border-box; padding: 12px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px;
      background: var(--win, #17181b); color: var(--text, #d2d5da); border: 1px solid var(--line-lit, #3a3e45); border-radius: var(--r-win, 10px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, .5); font: 13px/1.4 var(--sans, system-ui, sans-serif); }
    .text-edit-head { font: 11px var(--mono, monospace); color: var(--dim, #81878f); }
    .text-edit-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; max-height: min(60vh, 560px); overflow: auto; }
    .text-edit-field { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; min-width: 0; }
    .text-edit-meta { font: 11px var(--mono, monospace); color: var(--dim, #81878f); opacity: .8; }
    .text-edit-field.missing .text-edit-where { font-style: italic; }
    .text-edit-shown { white-space: pre-wrap; padding: 6px 8px; font: 13px/1.45 var(--mono, monospace); color: var(--dim, #81878f); border: 1px dashed var(--line, #2a2d32); border-radius: var(--r-ctl, 6px); }
    .text-edit-where { display: flex; align-items: center; gap: 4px; white-space: nowrap; font: 11px var(--mono, monospace); color: var(--dim, #81878f); }
    .text-edit-where select { font: inherit; min-width: 0; width: 0; flex: 1; text-overflow: ellipsis; color: var(--text, #d2d5da); background: var(--bar, #1d1f22); border: 1px solid var(--line, #2a2d32); border-radius: var(--r-ctl, 6px); }
    .text-edit-input { box-sizing: border-box; width: 100%; resize: vertical; padding: 8px; font: 13px/1.45 var(--mono, monospace);
      color: var(--text, #d2d5da); background: var(--desk, #0f1012); border: 1px solid var(--line, #2a2d32); border-radius: var(--r-ctl, 6px); }
    .text-edit-input:focus { outline: none; border-color: var(--tool, #d8b16a); }
    .text-edit-status { margin: 0; min-height: 1.4em; color: var(--dim, #81878f); }
    .text-edit-status a { color: var(--good, #8fcb8f); }
    .text-edit-buttons { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
    .text-edit-buttons .btn { font: 13px var(--sans, system-ui, sans-serif); padding: 5px 12px; border-radius: var(--r-ctl, 6px); cursor: pointer;
      border: 1px solid var(--line-lit, #3a3e45); background: var(--bar, #1d1f22); color: var(--text, #d2d5da); }
    .text-edit-buttons .btn.gold { background: var(--tool, #d8b16a); border-color: var(--tool, #d8b16a); color: #17181b; }
    .text-edit-buttons .btn:disabled { opacity: .4; cursor: default; }
    .text-edit-token { display: grid; gap: 6px; }
    .text-edit-token p { margin: 0; color: var(--dim, #81878f); }
    .text-edit-token a { color: var(--tool, #d8b16a); }
    .text-edit-token input { box-sizing: border-box; width: 100%; padding: 6px 8px; font: 13px var(--mono, monospace); color: var(--text, #d2d5da);
      background: var(--desk, #0f1012); border: 1px solid var(--line, #2a2d32); border-radius: var(--r-ctl, 6px); }
    .text-edit-token input:focus { outline: none; border-color: var(--tool, #d8b16a); }
    .text-edit-who { margin-right: auto; color: var(--dim, #81878f); font-size: 12px; }
  `;
  document.head.appendChild(style);
})();
