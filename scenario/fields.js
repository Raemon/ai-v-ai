// The scenario editor's form fields. Each edits box[key] in place and calls FIELDS.changed().
(function () {
  'use strict';

  const F = {
    changed: () => {},                                                       // editor.js: something was edited
    vocabulary: () => ({ groups: [], knows: () => true, note: () => null }), // the names a condition can use
    episode: () => 0,                                                        // whose wordings are showing
  };

  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  const isBranch = (v) => isObj(v) && !v.versions; // even an emptied one: its keys may have gone

  // An emptied key stays in place as undefined (JSON leaves it out), so retyping it doesn't move it.
  function put(box, key, value) {
    if (Array.isArray(box)) box[key] = value == null ? '' : value;
    else box[key] = isEmpty(value) ? undefined : value;
    F.changed();
  }

  const fill = (node, ...kids) => node.replaceChildren(...el('div', '', kids).childNodes);
  const small = (label, title, onclick, cls = '') => el('button', `btn quiet small ${cls}`, { title, onclick }, label);
  const field = (tag, label, ...kids) => el(tag, 'field', el('span', 'label', label), kids);

  let datalists = 0;
  const suggestions = (names) => el('datalist', '', { id: `suggest-${++datalists}` }, names.map((value) => el('option', '', { value })));

  function growingTextarea(value, oninput, cls = '') {
    const fit = () => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight + 2}px`; };
    const area = el('textarea', cls, { rows: Math.max(1, value.split('\n').length), value, oninput: () => { fit(); oninput(area.value); } });
    requestAnimationFrame(fit);
    return area;
  }

  // -------------------------------------------------------------- simple

  F.input = (box, key, label, { code, placeholder, suggest } = {}) => {
    const list = suggest && suggestions(suggest);
    return field('label', label, list,
      el('input', code ? 'code' : '', { type: 'text', value: box[key] ?? '', placeholder, list: list && list.id, spellcheck: !code, oninput: (e) => put(box, key, e.target.value) }));
  };

  F.number = (box, key, label) => field('label', label,
    el('input', '', { type: 'number', value: box[key] ?? '', oninput: (e) => put(box, key, e.target.value === '' ? undefined : Number(e.target.value)) }));

  // A number, or a condition or hook that works one out: 25 · $shipReward.
  const numberOrCode = (s) => (s !== '' && !Number.isNaN(Number(s)) ? Number(s) : s);

  F.amount = (box, key, label, { placeholder } = {}) => field('label', label,
    el('input', 'code', { type: 'text', value: box[key] ?? '', placeholder, spellcheck: false, oninput: (e) => put(box, key, numberOrCode(e.target.value.trim())) }));

  F.check = (box, key, label) => el('label', 'check',
    el('input', '', { type: 'checkbox', checked: !!box[key], onchange: (e) => put(box, key, e.target.checked || undefined) }), label);

  // options: [[value, label]…]; '' is "not set".
  F.choice = (box, key, label, options) => field('label', label,
    el('select', 'plain', { onchange: (e) => put(box, key, e.target.value) }, options.map(([value, text]) => el('option', '', { value, selected: (box[key] ?? '') === value }, text))));

  F.longText = (box, key, label) => field('label', label, growingTextarea(box[key] ?? '', (s) => put(box, key, s)));

  // A list of strings, one a row.
  F.lines = (box, key, label, { cls } = {}) => field('label', label,
    growingTextarea((box[key] || []).join('\n'), (s) => put(box, key, s === '' ? [] : s.split('\n')), cls));

  const numbersIn = (s) => s.split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n));

  F.numbers = (box, key, label) => field('label', label,
    el('input', 'code', { type: 'text', value: (box[key] || []).join(', '), oninput: (e) => put(box, key, numbersIn(e.target.value)) }));

  const SHAPES = { list: [Array.isArray, 'A list: [ … ]'], object: [isObj, 'An object: { … }'] };

  function jsonOf(text, shape) {
    if (text.trim() === '') return { value: undefined };
    try {
      const value = JSON.parse(text);
      return SHAPES[shape][0](value) ? { value } : { error: SHAPES[shape][1] };
    } catch (e) { return { error: e.message }; }
  }

  // The parts without a form of their own, as JSON; `shape` is "list" or "object".
  F.json = (box, key, label, shape, { placeholder } = {}) => {
    const problem = el('div', 'err');
    const area = growingTextarea(box[key] === undefined ? '' : JSON.stringify(box[key], null, 2), (text) => {
      const { value, error = '' } = jsonOf(text, shape);
      problem.textContent = error;
      area.classList.toggle('bad', !!error);
      if (!error) put(box, key, value);
    }, 'code');
    Object.assign(area, { placeholder: placeholder || '', spellcheck: false });
    return field('div', label, area, problem);
  };

  // A list of names, as chips: facts, abilities, files.
  F.chips = (box, key, label, { suggest = [], cls = '' } = {}) => {
    const list = suggestions(suggest);
    const typed = el('input', '', { type: 'text', list: list.id, placeholder: '+', spellcheck: false, 'aria-label': `Add to ${label}`, onchange: () => add() });
    const holder = el('div', `picks ${cls}`);
    const without = (i) => { put(box, key, box[key].filter((_, j) => j !== i)); render(); };
    const chip = (name, i) => el('span', 'chip', name, el('button', '', { title: 'Remove', onclick: () => without(i) }, '×'));
    const render = () => fill(holder, (box[key] || []).map(chip), typed);

    function add() {
      const name = typed.value.trim().replace(/,$/, '');
      if (!name || (box[key] || []).includes(name)) return;
      put(box, key, [...(box[key] || []), name]);
      typed.value = '';
      render();
      typed.focus();
    }

    typed.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } });
    render();
    return field('div', label, holder, list);
  };

  // ----------------------------------------------------------- conditions

  // "a & !b & c" as [{ name, not }]; null for anything a row of chips can't show.
  function literals(src) {
    const { tree, error } = SCENARIO.tryParse(src || '');
    if (error) return null;
    if (!tree) return [];
    const parts = (tree.and || [tree]).map((p) => ('id' in p ? { name: p.id, not: false } : p.not && 'id' in p.not ? { name: p.not.id, not: true } : null));
    return parts.every(Boolean) ? parts : null;
  }

  const joined = (parts) => parts.map((p) => (p.not ? '!' : '') + p.name).join(' & ');

  F.readOnlyCond = (src) => {
    const parts = literals(src);
    if (parts === null) return el('code', '', src);
    return el('span', 'cond-static', parts.map((p) => el('span', `chip ${p.not ? 'not' : ''}`, { title: F.vocabulary().note(p.name) }, p.name)));
  };

  // Chips while the condition is only "this and not that"; the expression itself otherwise.
  function condBox(box, key) {
    const holder = el('div', 'cond');
    const problem = el('div', 'err');
    let asText = false;
    const check = () => { problem.textContent = SCENARIO.tryParse(box[key] || '').error || ''; };
    const set = (parts) => { put(box, key, joined(parts)); render(); };
    const toggle = (label, title) => el('button', 'as-text', { title, onclick: () => { asText = !asText; render(); } }, label);

    function expression(canBeChips) {
      const input = el('input', '', { type: 'text', value: box[key] || '', placeholder: 'always', spellcheck: false, 'aria-label': 'Condition', oninput: () => { put(box, key, input.value.trim()); check(); } });
      return [input, canBeChips && toggle('chips', 'Show as chips')];
    }

    function chip(part, i, parts) {
      const { knows, note } = F.vocabulary();
      const flipped = () => parts.map((p, j) => (j === i ? { ...p, not: !p.not } : p));
      return el('span', `chip ${part.not ? 'not' : ''} ${knows(part.name) ? '' : 'unknown'}`, { title: note(part.name) || (knows(part.name) ? '' : 'Nothing teaches this') },
        el('button', 'flip', { title: 'Not', 'aria-pressed': String(part.not), onclick: () => set(flipped()) }, '!'),
        part.name,
        el('button', '', { title: 'Remove', onclick: () => set(parts.filter((_, j) => j !== i)) }, '×'));
    }

    const unused = (group, parts) => group.names.filter((n) => !parts.some((p) => p.name === n.name));
    const nameAdder = (parts) => el('select', 'add', { 'aria-label': 'Add to the condition', onchange: (e) => set([...parts, { name: e.target.value, not: false }]) },
      el('option', '', { value: '', selected: true, disabled: true }, '+'),
      F.vocabulary().groups.map((g) => el('optgroup', '', { label: g.label }, unused(g, parts).map((n) => el('option', '', { value: n.name, title: n.note }, n.name)))));

    function render() {
      const parts = literals(box[key]);
      check();
      if (asText || parts === null) return fill(holder, expression(parts !== null));
      return fill(holder, parts.map(chip), !parts.length && el('span', 'always', 'always'), nameAdder(parts), toggle('</>', 'Write it out: task & (a | b) & flag.n > 2'));
    }

    render();
    return [holder, problem];
  }

  F.cond = (box, key, label) => field('div', label, condBox(box, key));

  // ------------------------------------------------- text, versions, branches
  // box[key] is a string, { versions } or { if, then, else }; with `multi`, a list of those (lines).

  function wordingEditor(box, key, multi, cls = '', after) {
    const holder = el('div', 'tx');
    const set = (value) => { put(box, key, value); if (after) after(); };
    const render = () => fill(holder, build());
    const blank = () => (multi ? [''] : '');

    function build() {
      const value = box[key];
      if (isBranch(value)) return branchBlock(value);
      if (isObj(value)) return versionsBlock(value);
      return multi ? lineBlocks(value) : [growingTextarea(value || '', set, cls), wrappers(() => box[key] || '')];
    }

    const wrappers = (current) => el('div', 'tx-bar',
      small('+v', 'A different wording each episode', () => { set({ versions: [current(), blank()] }); render(); }),
      small('+if', 'Different text depending on what the AI has done', () => { set({ if: '', then: current() }); render(); }));

    // Runs of plain lines are one textarea each; versions and branches are blocks between them.
    function runsOf(value) {
      const runs = [];
      for (const item of value == null ? [] : [value].flat()) {
        const last = runs[runs.length - 1];
        if (typeof item !== 'string') runs.push({ block: item });
        else if (last && last.lines) last.lines.push(item);
        else runs.push({ lines: [item] });
      }
      return runs.length ? runs : [{ lines: [] }];
    }

    function lineBlocks(value) {
      const runs = runsOf(value);
      const write = () => set(runs.flatMap((r) => r.lines || [r.block].flat().filter((b) => b != null)));
      const push = (run) => { runs.push(run); write(); render(); };

      // A block that stops being one (its versions or condition taken away) rejoins the lines.
      function blockEditor(run) {
        const slot = { v: run.block };
        return wordingEditor(slot, 'v', true, cls, () => { run.block = slot.v; write(); if (!isObj(run.block)) render(); });
      }

      const linesEditor = (run) => growingTextarea(run.lines.join('\n'), (s) => { run.lines = s === '' ? [] : s.split('\n'); write(); }, cls);
      const endsInBlock = !!runs[runs.length - 1].block;
      return [runs.map((run) => (run.lines ? linesEditor(run) : blockEditor(run))), el('div', 'tx-bar',
        endsInBlock && small('+', 'More lines after this', () => push({ lines: [''] })),
        small('+v', 'Lines worded differently each episode', () => push({ block: { versions: [[''], ['']] } })),
        small('+if', 'Lines only said when a condition holds', () => push({ block: { if: '', then: [''] } })))];
    }

    function versionsBlock(value) {
      const all = value.versions;
      const now = F.episode() % all.length;
      let at = now;
      const tabs = el('span', '');
      const body = el('div', '');
      const tab = (i) => el('button', `vtab ${i === at ? 'on' : ''} ${i === now ? 'now' : ''}`, { onclick: () => show(i) }, `v${i + 1}`);

      function show(i) {
        at = i;
        fill(tabs, all.map((_, n) => tab(n)));
        fill(body, wordingEditor(all, at, multi, cls));
      }

      const add = () => { all.push(blank()); F.changed(); show(all.length - 1); };
      const removeOrUnwrap = () => {
        if (all.length < 2) { set(all[0]); return render(); }
        all.splice(at, 1);
        F.changed();
        return show(Math.max(0, at - 1));
      };

      show(at);
      return el('div', 'block versions', el('div', 'block-head', tabs, small('+', 'Another wording', add), small('−', 'Remove this wording', removeOrUnwrap)), body);
    }

    function branchBlock(value) {
      const otherwise = el('div', 'branch');
      const dropElse = () => { delete value.else; F.changed(); renderElse(); };
      const addElse = () => { value.else = blank(); F.changed(); renderElse(); };
      const renderElse = () => fill(otherwise, 'else' in value
        ? [el('div', 'block-head', 'else', el('span', 'grow'), small('×', 'Say nothing otherwise', dropElse)), wordingEditor(value, 'else', multi, cls)]
        : small('+ else', 'What to say when it does not hold', addElse));

      renderElse();
      return el('div', 'block if',
        el('div', 'block-head', 'if', el('span', 'grow'), small('×', 'Drop the condition, keep the text', () => { set(value.then); render(); })),
        condBox(value, 'if'), wordingEditor(value, 'then', multi, cls), otherwise);
    }

    render();
    return holder;
  }

  F.wording = (box, key, label) => field('div', label, wordingEditor(box, key, false));
  F.wordingLines = (box, key, label, { cls } = {}) => field('div', label, wordingEditor(box, key, true, cls));

  Object.assign(F, { fill, small });
  window.FIELDS = F;
})();
