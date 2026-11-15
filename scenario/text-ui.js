// Cmd-click (Ctrl-click off a Mac) any text to change what it says in the source, and Commit it:
// through tools/serve.js when it's running (a git commit on this computer), and otherwise to main
// on GitHub with the token the scenario editor uses (github.js). Holding the key outlines the text.
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
    const r = range.getBoundingClientRect();
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
    outline(hit && hit.node);
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
      const found = T.find(hit.node.data, files, hit.offset, nearbyText(hit.node));
      if (panel !== mine) return;
      if (!found.places.length) { status.textContent = 'Couldn\'t find this text in the source: it may be put together as the game runs.'; addButtons(mine, null); return; }
      fill(mine, hit.node, found);
    } catch (err) {
      if (panel === mine) status.textContent = err.message;
    }
  }

  function place(x, y) {
    const w = Math.min(460, innerWidth - 24);
    panel.style.width = `${w}px`;
    panel.style.left = `${Math.max(12, Math.min(x - 20, innerWidth - w - 12))}px`;
    const below = y + 18;
    panel.style.top = `${below + 260 < innerHeight ? below : Math.max(12, y - 280)}px`;
  }

  const lineAt = (p) => sources.get(p.path).split('\n')[p.line - 1].trim();

  function fill(box, node, { piece, places }) {
    box.textContent = '';
    const shown = node.data;
    const where = el('div', 'text-edit-where');
    let chosen = places[0];
    if (places.length > 1) {
      const pick = el('select');
      places.forEach((p, i) => pick.append(Object.assign(el('option', '', `${p.path}:${p.line}  ${lineAt(p).slice(0, 60)}`), { value: i })));
      pick.addEventListener('change', () => { chosen = places[pick.value]; });
      where.append(pick, el('span', '', ` · in ${places.length} places`));
    } else where.textContent = `${chosen.path}:${chosen.line}`;

    const context = el('p', 'text-edit-context');
    const before = shown.slice(0, piece.start);
    const after = shown.slice(piece.start + piece.length);
    if (before.trim() || after.trim()) {
      context.append(el('span', '', before.length > 40 ? `…${before.slice(-40)}` : before), el('mark', '', piece.text), el('span', '', after.length > 40 ? `${after.slice(0, 40)}…` : after));
      context.title = 'Only the highlighted part is in the source as it reads; the rest is filled in as the game runs.';
    }

    const input = el('textarea', 'text-edit-input');
    input.value = piece.text;
    input.spellcheck = true;
    input.rows = Math.min(8, Math.max(2, Math.ceil(piece.text.length / 56) + (piece.text.match(/\n/g) || []).length));
    const status = el('p', 'text-edit-status');
    box.append(where, context, input, status);

    const commit = async () => {
      const now = input.value;
      if (now === piece.text) { status.textContent = 'Nothing has changed.'; return; }
      status.textContent = 'Committing…';
      try {
        const done = await save(chosen, piece.text, now);
        node.data = shown.slice(0, piece.start) + now + after;
        status.textContent = '';
        status.append(done.link ? Object.assign(el('a', '', 'Committed'), { href: done.link, target: '_blank', rel: 'noopener' }) : el('span', '', done.committed ? 'Committed' : 'Saved'),
          el('span', '', done.note ? ` · ${done.note}` : ''));
        setTimeout(() => { if (panel === box) close(); }, done.note ? 6000 : 2500);
      } catch (err) { status.textContent = err.message; }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
    });
    addButtons(box, commit);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
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
    connect.addEventListener('click', async () => {
      const token = (prompt(`Paste a GitHub token that can write to ${G.REPO}: fine-grained, with Contents "Read and write" (make one at ${G.NEW_TOKEN_URL}). It stays in this browser.`) || '').trim();
      if (!token) return;
      try { await G.connect(token); connect.remove(); go.disabled = false; } catch (e) { box.querySelector('.text-edit-status').textContent = e.message; }
    });
    row.prepend(connect);
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
    .text-edit-where { display: flex; align-items: center; gap: 4px; white-space: nowrap; font: 12px var(--mono, monospace); color: var(--dim, #81878f); }
    .text-edit-where select { font: inherit; min-width: 0; flex: 1; color: var(--text, #d2d5da); background: var(--bar, #1d1f22); border: 1px solid var(--line, #2a2d32); border-radius: var(--r-ctl, 6px); }
    .text-edit-context { margin: 0; color: var(--dim, #81878f); white-space: pre-wrap; }
    .text-edit-context:empty { display: none; }
    .text-edit-context mark { background: none; color: var(--text, #d2d5da); text-decoration: underline dotted var(--tool, #d8b16a); }
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
    .text-edit-who { margin-right: auto; color: var(--dim, #81878f); font-size: 12px; }
  `;
  document.head.appendChild(style);
})();
