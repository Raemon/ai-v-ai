// The scenario editor's fields: text, numbers, lists, conditions, and text that can come in
// versions or depend on a condition. Each edits one key of an object, in place, and calls
// FIELDS.changed() when it does. editor.js lays them out.
(function () {
  'use strict';

  // h('div.card.on', { title: '…', onclick: fn }, 'text', node, [more])
  function h(spec, ...args) {
    const [tag, ...classes] = spec.split('.');
    const node = document.createElement(tag || 'div');
    if (classes.length) node.className = classes.join(' ');
    for (const a of args.flat(Infinity)) {
      if (a == null || a === false) continue;
      if (a instanceof Node) node.append(a);
      else if (typeof a === 'object') setAll(node, a);
      else node.append(String(a));
    }
    return node;
  }

  function setAll(node, attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') node[k] = v;
      else if (v === true) node.setAttribute(k, '');
      else if (v != null && v !== false) node.setAttribute(k, v);
    }
  }

  const F = {
    h,
    changed: () => {},                              // editor.js: something was edited
    vocabulary: () => ({ groups: [], known: new Set() }), // the names a condition can use here
    episode: () => 0,                               // which episode's versions are showing
  };

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

  // Sets box[key], or removes it when there's nothing to keep (a slot in a list stays).
  function put(box, key, v) {
    if (Array.isArray(box)) box[key] = v == null ? '' : v;
    else if (isEmpty(v)) delete box[key];
    else box[key] = v;
    F.changed();
  }

  const labelled = (tag, label, hint, ...kids) => h(`${tag}.field`, h('span.label', label, hint && h('small', hint)), kids);
  let uid = 0;

  // A textarea as tall as what's in it.
  function area(value, oninput, cls = '') {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
    const ta = h(`textarea${cls}`, { rows: Math.max(1, value.split('\n').length), value, spellcheck: 'true', oninput: () => { fit(); oninput(ta.value); } });
    requestAnimationFrame(fit);
    return ta;
  }

  // -------------------------------------------------------------- simple

  F.text = (box, key, label, { hint, code, placeholder, suggest } = {}) => {
    const id = suggest && `dl-${++uid}`;
    return labelled('label', label, hint,
      h(`input${code ? '.code' : ''}`, { type: 'text', value: box[key] ?? '', placeholder, list: id, spellcheck: code ? 'false' : 'true', oninput: (e) => put(box, key, e.target.value) }),
      suggest && h('datalist', { id }, suggest.map((s) => h('option', { value: s }))));
  };

  F.number = (box, key, label, { hint } = {}) => labelled('label', label, hint,
    h('input', { type: 'number', value: box[key] ?? '', oninput: (e) => put(box, key, e.target.value === '' ? undefined : Number(e.target.value)) }));

  // A number, or a condition or hook that works one out: 25 · $shipReward.
  F.amount = (box, key, label, { hint } = {}) => labelled('label', label, hint,
    h('input.code', { type: 'text', value: box[key] ?? '', spellcheck: 'false', oninput: (e) => { const s = e.target.value.trim(); put(box, key, s !== '' && !Number.isNaN(Number(s)) ? Number(s) : s); } }));

  F.check = (box, key, label) => h('label.check', h('input', { type: 'checkbox', checked: !!box[key], onchange: (e) => put(box, key, e.target.checked || undefined) }), label);

  // options: [[value, label]…]; '' is "not set".
  F.choice = (box, key, label, options, { hint } = {}) => labelled('label', label, hint,
    h('select.plain', { onchange: (e) => put(box, key, e.target.value) }, options.map(([value, text]) => h('option', { value, selected: (box[key] ?? '') === value }, text))));

  // One string, however long.
  F.para = (box, key, label, { hint } = {}) => labelled('label', label, hint, area(box[key] ?? '', (s) => put(box, key, s)));

  // A list of lines, one a row (a page of a file, phrases, stages).
  F.page = (box, key, label, { hint, cls = '' } = {}) => labelled('label', label, hint,
    area((box[key] || []).join('\n'), (s) => put(box, key, s === '' ? [] : s.split('\n')), cls));

  // Numbers on one line: 3, 10, 12.
  F.numbers = (box, key, label, { hint } = {}) => labelled('label', label, hint,
    h('input.code', { type: 'text', value: (box[key] || []).join(', '), oninput: (e) => put(box, key, e.target.value.split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n))) }));

  // Anything, as JSON: for the parts without a form of their own.
  F.json = (box, key, label, { hint } = {}) => {
    const err = h('div.err');
    const ta = area(box[key] === undefined ? '' : JSON.stringify(box[key], null, 2), (s) => {
      let v;
      try { v = s.trim() === '' ? undefined : JSON.parse(s); err.textContent = ''; } catch (e) { err.textContent = e.message; }
      ta.classList.toggle('bad', !!err.textContent);
      if (!err.textContent) put(box, key, v);
    }, '.code');
    ta.spellcheck = false;
    return labelled('div', label, hint, ta, err);
  };

  // A list of names, as chips: facts, abilities, files.
  F.picks = (box, key, label, { hint, suggest = [], cls = '' } = {}) => {
    const id = `dl-${++uid}`;
    const input = h('input', { type: 'text', list: id, placeholder: 'add…', spellcheck: 'false', 'aria-label': `Add to ${label}` });
    const holder = h(`div.picks${cls}`);
    const draw = () => holder.replaceChildren(
      ...(box[key] || []).map((v, i) => h('span.chip', v, h('button', { type: 'button', title: 'Remove', onclick: () => { put(box, key, box[key].filter((_, j) => j !== i)); draw(); } }, '×'))),
      input,
    );
    const add = () => {
      const v = input.value.trim().replace(/,$/, '');
      if (!v || (box[key] || []).includes(v)) return;
      put(box, key, [...(box[key] || []), v]);
      input.value = '';
      draw();
      input.focus();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } });
    input.addEventListener('change', add);
    draw();
    return labelled('div', label, hint, holder, h('datalist', { id }, suggest.map((s) => h('option', { value: s }))));
  };

  // ----------------------------------------------------------- conditions

  const problemWith = (src) => {
    try { if (src) SCENARIO.parse(src); return ''; } catch (e) { return e.message; }
  };

  // "a & !b & c" as [{ name, not }]; null for anything a row of chips can't show.
  function literals(src) {
    if (!src) return [];
    let tree;
    try { tree = SCENARIO.parse(src); } catch (e) { return null; }
    const parts = (tree.and || [tree]).map((p) => ('id' in p ? { name: p.id, not: false } : p.not && 'id' in p.not ? { name: p.not.id, not: true } : null));
    return parts.every(Boolean) ? parts : null;
  }
  const joined = (parts) => parts.map((p) => (p.not ? '!' : '') + p.name).join(' & ');
  const noteFor = (name) => {
    for (const g of F.vocabulary().groups) {
      const hit = g.names.find((n) => n.name === name);
      if (hit) return hit.note;
    }
    return null;
  };

  // A condition someone is only reading.
  F.condChips = (src) => {
    const parts = literals(src);
    if (parts === null) return h('code', src);
    return h('span.cond-static', parts.length ? parts.map((p) => h(`span.chip${p.not ? '.not' : ''}`, { title: noteFor(p.name) }, p.name)) : h('span.empty', 'always'));
  };

  // A condition: chips while it's only "this and not that", the expression itself otherwise.
  function condBox(box, key) {
    const holder = h('div.cond');
    const err = h('div.err');
    let asText = false;
    const check = () => { err.textContent = problemWith(box[key] || ''); };

    function draw() {
      const src = box[key] || '';
      const parts = literals(src);
      check();
      if (asText || parts === null) {
        const input = h('input', { type: 'text', value: src, placeholder: 'always', spellcheck: 'false', 'aria-label': 'Condition', oninput: () => { put(box, key, input.value.trim()); check(); } });
        holder.replaceChildren(input, parts !== null && h('button.as-text', { type: 'button', onclick: () => { asText = false; draw(); } }, 'as chips'));
        return;
      }
      const { groups, known } = F.vocabulary();
      const set = (next) => { put(box, key, joined(next)); draw(); };
      const adder = h('select.add', { 'aria-label': 'Add to the condition', onchange: (e) => set([...parts, { name: e.target.value, not: false }]) },
        h('option', { value: '', selected: true, disabled: true }, '+ when…'),
        groups.map((g) => h('optgroup', { label: g.label }, g.names.filter((n) => !parts.some((p) => p.name === n.name)).map((n) => h('option', { value: n.name }, n.note ? `${n.name} — ${n.note}` : n.name)))));
      holder.replaceChildren(
        ...(parts.length ? parts.map((p, i) => h(`span.chip${p.not ? '.not' : ''}${known.has(p.name) || /^(\$|world\.|trained\.|answer\.|patched\.)/.test(p.name) ? '' : '.unknown'}`,
          { title: `${noteFor(p.name) || 'Nothing in this scenario teaches this.'} Click to turn it round.`, onclick: (e) => { if (e.target.tagName !== 'BUTTON') set(parts.map((q, j) => (j === i ? { ...q, not: !q.not } : q))); } },
          p.name, h('button', { type: 'button', title: 'Remove', onclick: () => set(parts.filter((_, j) => j !== i)) }, '×'))) : [h('span.always', 'always')]),
        adder,
        h('button.as-text', { type: 'button', title: 'Write it out: task & (a | b) & flag.n > 2', onclick: () => { asText = true; draw(); holder.querySelector('input').focus(); } }, 'as text'),
      );
    }
    draw();
    return [holder, err];
  }

  F.cond = (box, key, label, { hint } = {}) => labelled('div', label, hint, condBox(box, key));

  // ------------------------------------------------- text, versions, branches
  // box[key] is a string, { versions: […] } or { if, then, else }; with `multi`, a list of
  // those, where a string is one line.

  function editText(box, key, multi, cls = '', after) {
    const host = h('div.tx');
    const set = (v) => { put(box, key, v); if (after) after(); };
    const redraw = () => host.replaceChildren(...[build()].flat());
    const small = (label, title, onclick) => h('button.btn.quiet.small', { type: 'button', title, onclick }, label);

    function build() {
      const v = box[key];
      if (isObj(v) && v.versions) return versions(v);
      if (isObj(v) && 'if' in v) return branch(v);
      return multi ? blocks(v) : plain(v);
    }

    const wrapBar = (current) => h('div.tx-bar',
      small('+ versions', 'A different wording each episode', () => { set({ versions: [current(), multi ? [''] : ''] }); redraw(); }),
      small('+ if…', 'Different text depending on what the AI knows', () => { set({ if: '', then: current() }); redraw(); }));

    function plain(v) {
      return [area(v || '', (s) => set(s), cls), wrapBar(() => box[key] || '')];
    }

    // A list of lines: runs of plain lines as one box each, the rest as blocks of their own.
    function blocks(v) {
      const runs = [];
      for (const item of v == null ? [] : Array.isArray(v) ? v : [v]) {
        const last = runs[runs.length - 1];
        if (typeof item !== 'string') runs.push({ block: item });
        else if (last && last.lines) last.lines.push(item);
        else runs.push({ lines: [item] });
      }
      if (!runs.length) runs.push({ lines: [] });
      const write = () => set(runs.flatMap((r) => r.lines || (Array.isArray(r.block) ? r.block : r.block == null ? [] : [r.block])));
      const drop = (r) => { runs.splice(runs.indexOf(r), 1); write(); redraw(); };
      const push = (r) => { runs.push(r); write(); redraw(); };

      const nodes = runs.map((r) => {
        if (r.lines) return area(r.lines.join('\n'), (s) => { r.lines = s === '' ? [] : s.split('\n'); write(); }, cls);
        // A block that stops being one (its versions or its condition taken away) rejoins the lines.
        const slot = { v: r.block };
        const rejoin = () => { r.block = slot.v; write(); if (!isObj(r.block)) redraw(); };
        return h('div', editText(slot, 'v', true, cls, rejoin), runs.length > 1 && h('button.x', { type: 'button', title: 'Remove this block', onclick: () => drop(r) }, '×'));
      });
      const hasBlocks = runs.some((r) => r.block);
      return [...nodes, h('div.tx-bar',
        hasBlocks && !runs[runs.length - 1].lines && small('+ lines', 'More lines after these', () => push({ lines: [''] })),
        small('+ versions', 'Lines that are worded differently each episode', () => push({ block: { versions: [[''], ['']] } })),
        small('+ if…', 'Lines only said when a condition holds', () => push({ block: { if: '', then: [''] } })))];
    }

    function versions(v) {
      const now = F.episode() % v.versions.length;
      let at = now;
      const tabs = h('span');
      const body = h('div');
      const show = () => {
        tabs.replaceChildren(...v.versions.map((_, i) => h(`button.vtab${i === at ? '.on' : ''}${i === now ? '.now' : ''}`, { type: 'button', title: i === now ? 'The one this episode shows' : '', onclick: () => { at = i; show(); } }, `v${i + 1}`)));
        body.replaceChildren(editText(v.versions, at, multi, cls));
      };
      show();
      return h('div.block.versions', h('div.block-head', 'versions', tabs,
        small('+', 'Another version', () => { v.versions.push(multi ? [''] : ''); at = v.versions.length - 1; F.changed(); show(); }),
        small('−', 'Remove this version', () => { if (v.versions.length < 2) return; v.versions.splice(at, 1); at = Math.max(0, at - 1); F.changed(); show(); }),
        h('span.grow'),
        small('just one', 'Keep only this version', () => { set(v.versions[at]); redraw(); })), body);
    }

    function branch(v) {
      const otherwise = h('div.branch');
      const drawElse = () => otherwise.replaceChildren(...('else' in v
        ? [h('div.label', 'otherwise ', small('remove', 'Say nothing otherwise', () => { delete v.else; F.changed(); drawElse(); })), editText(v, 'else', multi, cls)]
        : [small('+ otherwise', 'What to say when it does not hold', () => { v.else = multi ? [''] : ''; F.changed(); drawElse(); })]));
      drawElse();
      return h('div.block.if', h('div.block-head', 'if', h('span.grow'), small('no condition', 'Keep the text, drop the condition', () => { set(v.then); redraw(); })),
        condBox(v, 'if'), h('div.branch', h('div.label', 'then'), editText(v, 'then', multi, cls)), otherwise);
    }

    redraw();
    return host;
  }

  F.T = (box, key, label, { hint } = {}) => labelled('div', label, hint, editText(box, key, false));
  F.L = (box, key, label, { hint, cls } = {}) => labelled('div', label, hint, editText(box, key, true, cls));

  window.FIELDS = F;
})();
