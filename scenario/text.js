// Finding text on the page in the source, and changing it there: text-ui.js (cmd-click any text)
// uses this in the page, tools/serve.js in node. A file is searched as it reads once its strings'
// escapes and HTML's entities are undone, so "don\'t" in the source is "don't" on the page.
(function () {
  'use strict';

  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', middot: '·', times: '×' };
  const SIMPLE = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
  const EDITABLE = /\.(js|html|css|md)$/;

  const isHtml = (path) => /\.html$/.test(path);
  const isJson = (path) => /^scenarios\/[^/]+\.js$/.test(path) && !/\.hooks\.js$/.test(path);

  // The file as it reads, and where each of its characters starts and ends in the source.
  function decode(raw, path) {
    let text = '';
    const from = [];
    const to = [];
    const put = (s, a, b) => { for (const ch of s) { text += ch; from.push(a); to.push(b); } };
    for (let i = 0; i < raw.length;) {
      const rest = raw.slice(i, i + 12);
      let m;
      if (isHtml(path) && raw[i] === '&' && (m = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(rest))) {
        const name = m[1];
        const ch = name[0] === '#' ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : ENTITIES[name];
        if (ch !== undefined) { put(ch, i, i + m[0].length); i += m[0].length; continue; }
      }
      if (/\.js$/.test(path) && raw[i] === '\\' && i + 1 < raw.length) {
        if ((m = /^\\u\{([0-9a-f]+)\}|^\\u([0-9a-f]{4})|^\\x([0-9a-f]{2})/i.exec(rest))) {
          put(String.fromCodePoint(parseInt(m[1] || m[2] || m[3], 16)), i, i + m[0].length);
          i += m[0].length;
          continue;
        }
        const c = raw[i + 1];
        put(SIMPLE[c] !== undefined ? SIMPLE[c] : c, i, i + 2);
        i += 2;
        continue;
      }
      const cp = raw.codePointAt(i);
      const ch = String.fromCodePoint(cp);
      put(ch, i, i + ch.length);
      i += ch.length;
    }
    return { text, from, to };
  }

  // The longest piece of `shown` found in the corpus that covers character `at` (or, failing
  // that, anywhere). A piece found at length L means one at L - 1 is, so length is a binary search.
  function longestPiece(shown, has, at) {
    const search = (windows) => {
      let lo = 0;
      let hi = shown.length;
      let best = null;
      while (lo < hi) {
        const L = Math.ceil((lo + hi) / 2);
        const start = windows(L).find((i) => has(shown.substr(i, L)));
        if (start === undefined) hi = L - 1;
        else { lo = L; best = { start, length: L }; }
      }
      return best;
    };
    const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k);
    const around = at == null ? null : search((L) => range(Math.max(0, at - L + 1), Math.min(at, shown.length - L)));
    return around || search((L) => range(0, shown.length - L));
  }

  // How many of the words around the text on the page are near a place in the source.
  const words = (s) => new Set((s.toLowerCase().match(/[a-z][a-z’']{3,}/g) || []));
  const closeness = (nearby, text, i) => {
    const around = words(text.slice(Math.max(0, i - 600), i + 600));
    let n = 0;
    nearby.forEach((w) => { if (around.has(w)) n++; });
    return n;
  };

  // files: [{ path, raw }]. Every place in them that `shown` (or its longest piece around `at`)
  // reads, the ones whose neighbourhood has most of `nearby` (the text around it on the page) first.
  function find(shown, files, at, nearby = '') {
    const decoded = files.map((f) => ({ ...f, ...decode(f.raw, f.path) }));
    const corpus = decoded.map((f) => f.text).join('\u0000');
    const piece = longestPiece(shown, (s) => corpus.includes(s), at);
    const tooShort = !piece || (piece.length < 3 && piece.length < shown.trim().length);
    if (tooShort) return { piece: null, places: [] };
    const text = shown.substr(piece.start, piece.length);
    const places = [];
    for (const f of decoded) {
      for (let i = f.text.indexOf(text); i >= 0; i = f.text.indexOf(text, i + 1)) {
        const rawStart = f.from[i];
        places.push({ path: f.path, line: f.raw.slice(0, rawStart).split('\n').length, rawStart, rawEnd: f.to[i + text.length - 1], start: i, score: 0 });
      }
    }
    const near = words(nearby);
    words(text).forEach((w) => near.delete(w));
    if (near.size && places.length > 1) {
      places.forEach((p) => { p.score = closeness(near, decoded.find((f) => f.path === p.path).text, p.start); });
      places.sort((a, b) => b.score - a.score);
    }
    return { piece: { ...piece, text }, places };
  }

  // What delimits the string the source is in at `at`: the line read from its start, or a template
  // literal running on from an earlier line.
  function quoteAt(raw, at) {
    const lineStart = raw.lastIndexOf('\n', at - 1) + 1;
    let q = null;
    for (let i = lineStart; i < at; i++) {
      const c = raw[i];
      if (q) {
        if (c === '\\') i++;
        else if (c === q) q = null;
      } else if (c === '/' && raw[i + 1] === '/') return '`';
      else if (c === '"' || c === "'" || c === '`') q = c;
    }
    return q || '`';
  }

  function escapeFor(text, path, raw, at) {
    if (isHtml(path)) return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (/\.(css|md)$/.test(path)) return text;
    if (isJson(path)) return JSON.stringify(text).slice(1, -1);
    const q = quoteAt(raw, at);
    let out = text.replace(/\\/g, '\\\\').split(q).join(`\\${q}`);
    if (q === '`') out = out.replace(/\$\{/g, '\\${');
    else out = out.replace(/\n/g, '\\n');
    return out;
  }

  // The change to the source that turns `place`'s text into `now`: only the part that differs, so
  // an escape the source wrote its own way stays as it was.
  function plan(raw, path, place, was, now) {
    const { from, to } = decode(raw, path);
    let pre = 0;
    while (pre < was.length && pre < now.length && was[pre] === now[pre]) pre++;
    let post = 0;
    while (post < was.length - pre && post < now.length - pre && was[was.length - 1 - post] === now[now.length - 1 - post]) post++;
    const i = place.start + pre;
    const j = place.start + was.length - post;
    const at = i < from.length ? from[i] : raw.length;
    const end = j > place.start + pre ? to[j - 1] : at;
    return { at, was: raw.slice(at, end), now: escapeFor(now.slice(pre, now.length - post), path, raw, at) };
  }

  function check(text, path) {
    if (!/\.js$/.test(path)) return;
    try { new Function(text); } catch (e) { throw new Error(`That would break ${path}: ${e.message}`); }
  }

  // Applies a planned change to the file as it is now. If the file has moved on, the old text is
  // looked for elsewhere, and used only if it's in one place.
  function apply(text, path, { at, was, now }) {
    let where = at;
    if (text.substr(at, was.length) !== was) {
      const first = was ? text.indexOf(was) : -1;
      if (first < 0 || text.indexOf(was, first + 1) >= 0) {
        throw Object.assign(new Error(`${path} has changed since this page loaded it. Reload and try again.`), { status: 409 });
      }
      where = first;
    }
    const out = text.slice(0, where) + now + text.slice(where + was.length);
    check(out, path);
    return out;
  }

  const clip = (s, n = 40) => { const one = s.replace(/\s+/g, ' ').trim(); return one.length > n ? `${one.slice(0, n - 1)}…` : one; };
  const message = (path, was, now) => `Text in ${path}: "${clip(was)}" → "${clip(now)}"`;

  const TEXT_EDIT = { decode, find, plan, apply, message, EDITABLE };
  if (typeof module === 'object' && module.exports) module.exports = TEXT_EDIT;
  else window.TEXT_EDIT = TEXT_EDIT;
})();
