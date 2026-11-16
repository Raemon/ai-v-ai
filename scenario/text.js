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
    const put = (s, a, b) => { text += s; for (let k = 0; k < s.length; k++) { from.push(a); to.push(b); } };
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

  // The first index whose value is at least `v`, in an ascending list.
  function firstAtLeast(list, v) {
    let lo = 0;
    let hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid] < v) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // Every string literal and comment in a script: { from, to, q } spans of their insides, q the
  // quote (or '//' and '/*'). A template's span holds its ${…} parts, whose own strings are spans too.
  let lexed = { raw: null, spans: [] };
  function literals(raw) {
    if (lexed.raw === raw) return lexed.spans;
    const spans = [];
    const word = /[\w$]/;
    const skipString = (i, q) => { for (; i < raw.length && raw[i] !== q && raw[i] !== '\n'; i++) if (raw[i] === '\\') i++; return i; };
    function template(i) {
      for (; i < raw.length && raw[i] !== '`'; i++) {
        if (raw[i] === '\\') i++;
        else if (raw[i] === '$' && raw[i + 1] === '{') i = code(i + 2, true);
      }
      return i;
    }
    // Code up to the end, or (inside ${…}) its closing brace; returns where it stopped.
    function code(i, inside) {
      let depth = 0;
      let last = '';
      for (; i < raw.length; i++) {
        const c = raw[i];
        const d = raw[i + 1];
        if (/\s/.test(c)) continue;
        if (c === '/' && d === '/') { const e = raw.indexOf('\n', i); const end = e < 0 ? raw.length : e; spans.push({ from: i + 2, to: end, q: '//' }); i = end; continue; }
        if (c === '/' && d === '*') { const e = raw.indexOf('*/', i + 2); const end = e < 0 ? raw.length : e; spans.push({ from: i + 2, to: end, q: '/*' }); i = end + 1; continue; }
        if (c === '"' || c === "'") { const end = skipString(i + 1, c); spans.push({ from: i + 1, to: end, q: c }); i = end; last = c; continue; }
        if (c === '`') { const end = template(i + 1); spans.push({ from: i + 1, to: end, q: c }); i = end; last = c; continue; }
        if (c === '/' && !(word.test(last) || last === ')' || last === ']')) { // a regex
          let k = i + 1;
          for (let cls = false; k < raw.length && raw[k] !== '\n' && (cls || raw[k] !== '/'); k++) {
            if (raw[k] === '\\') k++; else if (raw[k] === '[') cls = true; else if (raw[k] === ']') cls = false;
          }
          i = k;
          last = ')';
          continue;
        }
        if (c === '{') depth++;
        if (c === '}') { if (inside && depth === 0) return i; depth--; }
        last = c;
      }
      return i;
    }
    code(0, false);
    lexed = { raw, spans };
    return spans;
  }

  // The smallest literal or comment holding [a, b), if any.
  const literalAt = (raw, a, b) => literals(raw).filter((s) => s.from <= a && s.to >= b).sort((x, y) => (x.to - x.from) - (y.to - y.from))[0];

  // The source's own unit around [a, b): the whole string literal (or comment) a match is in, the
  // text between two tags in HTML, a line elsewhere. What a commit would change as one thing.
  function unitAround(raw, path, a, b) {
    const trim = (x, y) => { while (x < y && /\s/.test(raw[x])) x++; while (y > x && /\s/.test(raw[y - 1])) y--; return [x, y]; };
    if (isHtml(path)) {
      const x = raw.lastIndexOf('>', a - 1) + 1;
      const y = raw.indexOf('<', b);
      return [...trim(x, y < 0 ? raw.length : y), 'HTML text'];
    }
    if (!/\.js$/.test(path)) {
      const y = raw.indexOf('\n', b);
      return [...trim(raw.lastIndexOf('\n', a - 1) + 1, y < 0 ? raw.length : y), 'line'];
    }
    // A match that runs past a string's quotes ("That settles "Will it…"" on the page) is the
    // string it's mostly in.
    const overlap = (sp) => Math.min(sp.to, b) - Math.max(sp.from, a);
    const lit = literalAt(raw, a, b) || literals(raw).filter((sp) => !sp.q.startsWith('/') && overlap(sp) > 0).sort((x, y) => overlap(y) - overlap(x))[0];
    if (!lit || lit.to - lit.from > 4000) return [a, b, 'code'];
    if (lit.q === '//' || lit.q === '/*') return [...trim(lit.from, lit.to), 'comment'];
    return [lit.from, lit.to, lit.q === '`' ? 'template string' : 'string'];
  }

  // files: [{ path, raw }]. Every place in the source that `shown` (or its longest piece around
  // character `at`) is in, as the whole literal it's part of; those whose neighbourhood has most of
  // `nearby` (the text around it on the page) first.
  function find(shown, files, at, nearby = '') {
    const decoded = files.map((f) => ({ ...f, ...decode(f.raw, f.path) }));
    const lines = linesFor(shown, decoded);
    if (lines.length) return { piece: { start: 0, length: shown.length, text: shown }, places: lines };
    const corpus = decoded.map((f) => f.text).join('\u0000');
    const piece = longestPiece(shown, (s) => corpus.includes(s), at);
    const tooShort = !piece || (piece.length < 3 && piece.length < shown.trim().length);
    if (tooShort) return { piece: null, places: [] };
    const text = shown.substr(piece.start, piece.length);
    const places = [];
    const seen = new Set();
    for (const f of decoded) {
      for (let i = f.text.indexOf(text); i >= 0; i = f.text.indexOf(text, i + 1)) {
        const [x, y, kind] = unitAround(f.raw, f.path, f.from[i], f.to[i + text.length - 1]);
        const start = firstAtLeast(f.from, x);
        const end = firstAtLeast(f.from, y);
        if (seen.has(`${f.path}:${start}`)) continue;
        seen.add(`${f.path}:${start}`);
        places.push({ path: f.path, line: f.raw.slice(0, x).split('\n').length, start, text: f.text.slice(start, end), kind, score: 0 });
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

  // A scenario's text that's a list of lines (a file's content, say) is on the page as one block
  // of them. Every such list whose lines are the block's, as one place to edit them all.
  const ARRAY = /\[\s*"(?:[^"\\\n]|\\.)*"(?:\s*,\s*"(?:[^"\\\n]|\\.)*")+\s*\]/g;
  const squash = (s) => s.replace(/\s+/g, ' ').trim();
  function linesFor(shown, decoded) {
    const want = squash(shown);
    if (!/\n/.test(shown.trim()) || want.length < 20) return [];
    const places = [];
    for (const f of decoded.filter((d) => isJson(d.path))) {
      for (const m of f.raw.matchAll(ARRAY)) {
        let list;
        try { list = JSON.parse(m[0]); } catch (e) { continue; }
        const text = list.join('\n');
        if (squash(text) !== want && !(squash(text).includes(want) && want.length > squash(text).length / 2)) continue;
        const from = m.index;
        places.push({ path: f.path, line: f.raw.slice(0, from).split('\n').length, start: firstAtLeast(f.from, from), text, kind: `${list.length} lines`, list: { from, to: from + m[0].length } });
      }
    }
    return places;
  }

  // The list written out again as the file had it: one string to a line, at its indent.
  function listAs(raw, from, lines) {
    const lineStart = raw.lastIndexOf('\n', from - 1) + 1;
    const indent = /^\s*/.exec(raw.slice(lineStart, from))[0];
    return `[\n${lines.map((l) => `${indent}  ${JSON.stringify(l)}`).join(',\n')}\n${indent}]`;
  }

  function escapeFor(text, path, raw, at) {
    if (isHtml(path)) return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (/\.(css|md)$/.test(path)) return text;
    if (isJson(path)) return JSON.stringify(text).slice(1, -1);
    const lit = literalAt(raw, at, at);
    const q = lit && !lit.q.startsWith('/') ? lit.q : null;
    if (!q) return text;
    let out = text.replace(/\\/g, '\\\\').split(q).join(`\\${q}`);
    if (q === '`') out = out.replace(/\$\{/g, '\\${');
    else out = out.replace(/\n/g, '\\n');
    return out;
  }

  // The change to the source that turns `place`'s text into `now`: only the part that differs, so
  // an escape the source wrote its own way stays as it was.
  function plan(raw, path, place, was, now) {
    if (place.list) return { at: place.list.from, was: raw.slice(place.list.from, place.list.to), now: listAs(raw, place.list.from, now.split('\n')) };
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
  // From a little before where the two first differ, so a long text's message shows its change.
  function message(path, was, now) {
    let i = 0;
    while (i < was.length && was[i] === now[i]) i++;
    const from = i > 30 ? Math.max(was.lastIndexOf(' ', i - 15) + 1, i - 30) : 0;
    const cut = (t) => (from ? '…' : '') + clip(t.slice(from), from ? 39 : 40);
    return `Text in ${path}: "${cut(was)}" → "${cut(now)}"`;
  }

  const TEXT_EDIT = { decode, find, plan, apply, message, clip, EDITABLE };
  if (typeof module === 'object' && module.exports) module.exports = TEXT_EDIT;
  else window.TEXT_EDIT = TEXT_EDIT;
})();
