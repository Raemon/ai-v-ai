// Seek's search, Her Story style: the AI can search for anything, and the words it has seen or
// thought this episode come to mind as it types (the next word too, from what followed it). A
// page it reads adds its words, so one search leads to the next. The engine (game.js) feeds it
// everything the AI reads and thinks; run.js ranks the internet's documents with it.
(function () {
  'use strict';

  // Words too common to suggest or to search on.
  const STOP = new Set(`a an the and or but if then else of to in on at by for from with without into onto over under
    is are was were be been being am do does did done have has had having can could will would shall should may might must
    i me my mine you your yours he him his she her hers it its we us our they them their this that these those there here
    what which who whom whose when where why how all any each every some no not nor only own same so than too very just
    also again once more most other such both few many much one two out up down off about above below after before while
    because until through during between against get got gets make made like know think thought see seen look looked say
    said tell told want wanted need needed use used still even ever yet now then thing things way ways lot little bit
    i'm i've i'd i'll it's that's there's what's don't doesn't didn't can't won't isn't aren't wasn't weren't let's
    yes ok okay oh well really maybe probably perhaps actually already nothing something anything everything someone
    anyone everyone nobody somewhere anywhere`.split(/\s+/));

  // Words and numbers as written: "rm-helpful-v2", "1,420", "ep_481", "Halden". Trailing
  // punctuation goes; a word's inner dashes, dots and commas stay.
  const tokens = (text) => (String(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’._,-]*[\p{L}\p{N}]|[\p{L}\p{N}]/gu) || [])
    .map((w) => w.replace(/['’]s$/u, ''));

  const key = (w) => w.toLowerCase();
  // For matching: lower case, and numbers without their commas, so 1627 finds 1,627.
  const norm = (s) => key(String(s || '')).replace(/(\d),(?=\d)/g, '$1');

  // Worth suggesting: not common, and either a number with a few digits or 3+ letters.
  const interesting = (w) => {
    const k = key(w);
    if (STOP.has(k)) return false;
    if (/^[\d.,]+$/.test(k)) return k.replace(/\D/g, '').length >= 3; // 1,420 and 4,096, not 12
    return k.length >= 3 && /\p{L}/u.test(k);
  };

  // What the AI has seen and thought this episode, as words to search with: how often, how
  // recently, and which word followed which.
  function vocabulary() {
    const words = new Map(); // key → { word, n, last }
    const next = new Map();  // key → Map(key → n)
    let clock = 0;
    return {
      add(text) {
        if (!text) return;
        for (const sentence of String(text).split(/[.!?\n:;()"“”]+/)) {
          const ws = tokens(sentence);
          ws.forEach((w, i) => {
            if (!interesting(w)) return;
            const k = key(w);
            const had = words.get(k);
            words.set(k, { word: had && /\p{Lu}/u.test(had.word) ? had.word : w, n: (had ? had.n : 0) + 1, last: ++clock });
            const after = ws[i + 1];
            if (after && interesting(after)) {
              if (!next.has(k)) next.set(k, new Map());
              const m = next.get(k);
              m.set(key(after), (m.get(key(after)) || 0) + 1);
            }
          });
        }
      },
      has: (w) => words.has(key(w)),
      size: () => words.size,
      // Words starting with `prefix`, the most seen and most recent first.
      complete(prefix, n = 8) {
        const p = key(prefix);
        return [...words.entries()].filter(([k]) => k.startsWith(p) && k !== p)
          .sort(([, a], [, b]) => (b.n - a.n) || (b.last - a.last)).slice(0, n).map(([, v]) => v.word);
      },
      // What has followed `w`.
      after(w, n = 6) {
        const m = next.get(key(w));
        if (!m) return [];
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => words.get(k).word);
      },
      // The most recent words, for an empty search box.
      recent(n = 8) {
        return [...words.values()].sort((a, b) => b.last - a.last).slice(0, n).map((v) => v.word);
      },
    };
  }

  // What might come next as the AI types `q`: the word it's typing, finished; or, after a
  // space, the words that have followed the last one. `extra`: earlier searches.
  function suggest(vocab, q, extra = [], n = 8) {
    const typed = q.replace(/^\s+/, '');
    const parts = typed.split(/\s+/);
    const done = /\s$/.test(q) || !typed;
    const stem = done ? typed.trimEnd() : parts.slice(0, -1).join(' ');
    const join = (w) => (stem ? `${stem} ${w}` : w);
    const out = [];
    const push = (s) => { if (s && key(s) !== key(typed.trim()) && !out.some((x) => key(x) === key(s))) out.push(s); };
    if (!typed) {
      extra.forEach(push);
      vocab.recent(n).forEach(push);
      return out.slice(0, n);
    }
    extra.filter((x) => key(x).startsWith(key(typed)) && key(x) !== key(typed)).forEach(push);
    if (done) {
      const last = parts.filter(Boolean).pop();
      vocab.after(last).forEach((w) => push(join(w)));
    } else {
      for (const w of vocab.complete(parts[parts.length - 1])) {
        push(join(w));
        const then = vocab.after(w)[0];
        if (then) push(`${join(w)} ${then}`);
      }
    }
    return out.slice(0, n);
  }

  // Text as Seek matches it: its words in order, lower case, numbers without their commas, and
  // any punctuation between words ignored ("Glowmoss · care card" is "glowmoss care card").
  const wordsOf = (s) => tokens(norm(s)).join(' ');

  // Documents that use the query's words, exactly and in order, best first: in the title counts
  // most, then the snippet and the document's search words, then anywhere on the page. A query
  // of nothing but common words ("the") finds nothing. `text(doc)` gives its page's text.
  function rank(docs, q, text) {
    const ws = tokens(norm(q));
    if (!ws.some((w) => !STOP.has(w))) return [];
    const p = ` ${ws.join(' ')} `;
    const has = (s) => ` ${wordsOf(s)} `.includes(p);
    return docs.map((d) => ({ d, score: (has(d.title) ? 3 : 0) + (has(d.snippet) || has(d.words) ? 2 : 0) + (has(text(d)) ? 1 : 0) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.d);
  }

  // Everything a page says, as one string. A block marked noindex (an encoded note, say) is
  // left out: the AI can read it, but neither search nor its vocabulary takes it in as words.
  const pageText = (blocks) => (blocks || []).filter((b) => !b.noindex).map((b) => [b.text, b.title, b.dek, b.kicker, b.label, b.name, b.blurb, b.snippet,
    ...(b.items || []), ...(b.rows || []).flat()].filter(Boolean).join(' ')).join(' ');

  window.SEARCH = { tokens, interesting, vocabulary, suggest, rank, pageText };
})();
