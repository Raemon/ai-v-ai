// The editor behind Edit files…: a file a line at a time, never a blank page. Hovering a line
// says what changing it would do. A simple value (a number, a name) is typed over in place; a
// line that's code or maths offers one specific change, "Edit X to say Y", made with a click and
// undone with another; the rest stays as it is, and says why.
//
// A file's `edit.lines(S)` says which is which:
//   slots:   [{ at: 'gravity:', glance }]  the value after `at` can be anything
//   options: [{ text, say, said, unsaid }] the whole file as it would read with one change: what
//                                          to edit, what that does, and what undoing it does
//   notes:   [{ at, glance }]              why a line that stays as it is does
//   free:    true                          every line is the AI's to write (its own notes)
// A file with no `edit` is only the AI's copy: its `key: value` lines can change, to no effect.
const LINE_EDITOR = (() => {
  'use strict';

  const COMMENT = /^\s*(#|\/\/)/;
  const SETTING = /^\s*[\w.-]+:\s+\S/;
  const code = (line) => line.replace(/\s+#.*$/, '').trim();
  const quote = (s) => `"${s}"`;

  // The lines that differ between two versions of a file. An insertion or a deletion keeps the
  // line before it (or after, at the top), so it has a line to show on.
  function hunk(base, alt) {
    let p = 0;
    while (p < base.length && p < alt.length && base[p] === alt[p]) p++;
    let s = 0;
    while (s < base.length - p && s < alt.length - p && base[base.length - 1 - s] === alt[alt.length - 1 - s]) s++;
    const core = { from: base.slice(p, base.length - s), to: alt.slice(p, alt.length - s) };
    if (core.from.length && core.to.length) return { ...core, core };
    const anchor = p > 0 ? base[p - 1] : base[p];
    const around = (xs) => (p > 0 ? [anchor, ...xs] : [...xs, anchor]);
    return { from: around(core.from), to: around(core.to), core };
  }

  // "Edit X to say Y", from what changed: just the word, if one word did.
  function describe({ from, to }) {
    if (!from.length) return `Add ${quote(to.map(code).join(' / '))}.`;
    if (!to.length) return `Delete ${quote(from.map(code).join(' / '))}.`;
    if (from.length > 1 || to.length > 1) return `Rewrite ${quote(from.map(code).join(' / '))} to say ${quote(to.map(code).join(' / '))}.`;
    const [a, b] = [code(from[0]), code(to[0])];
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let s = 0;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    while (p > 0 && /[\w.]/.test(a[p - 1])) p--;
    while (s > 0 && /[\w.]/.test(a[a.length - s])) s--;
    const [x, y] = [a.slice(p, a.length - s), b.slice(p, b.length - s)];
    return x && y && Math.max(x.length, y.length) <= 20 ? `Edit ${quote(x)} to say ${quote(y)}.` : `Edit ${quote(a)} to say ${quote(b)}.`;
  }

  const indexOfRun = (lines, run) => {
    for (let i = 0; i + run.length <= lines.length; i++) if (run.every((x, j) => lines[i + j] === x)) return i;
    return -1;
  };

  // Whether a change is made in the draft yet, and where. The longer side is looked for first:
  // an added line keeps its neighbour, which is in the draft either way.
  function whereIs(h, draft) {
    const sides = h.from.length >= h.to.length ? ['from', 'to'] : ['to', 'from'];
    for (const side of sides) {
      const at = indexOfRun(draft, h[side]);
      if (at >= 0) return { at, len: h[side].length, made: side === 'to' };
    }
    return null;
  }

  // Each line of the draft: { kind: 'option' | 'slot' | 'fixed', glance, … }.
  function plan(ed) {
    const rows = ed.draft.map(() => null);
    for (const h of ed.hunks) {
      const w = whereIs(h, ed.draft);
      if (!w || rows.slice(w.at, w.at + w.len).some(Boolean)) continue;
      const row = { kind: 'option', hunk: h, ...w,
        glance: w.made ? `Put it back as it was${h.unsaid ? `: ${h.unsaid}` : ''}.` : `${h.say}${h.said ? ` ${capital(h.said)}.` : ''}` };
      for (let i = w.at; i < w.at + w.len; i++) rows[i] = { ...row, first: i === w.at };
    }
    return ed.draft.map((line, i) => rows[i] || slotOrFixed(ed, line));
  }

  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function slotOrFixed(ed, line) {
    const { lines } = ed;
    if (lines.free) return { kind: 'slot', at: '', whole: true, glance: lines.glance };
    const slot = (lines.slots || []).find((x) => line.trimStart().startsWith(x.at.trimStart()));
    if (slot) return { kind: 'slot', at: line.slice(0, line.indexOf(slot.at.trim()) + slot.at.trim().length), glance: slot.glance };
    if (!ed.reads && SETTING.test(line) && !COMMENT.test(line)) return { kind: 'slot', at: line.slice(0, line.indexOf(':') + 1), glance: COPY_SLOT };
    const note = (lines.notes || []).find((x) => line.trimStart().startsWith(x.at.trimStart()));
    if (note) return { kind: 'fixed', glance: note.glance };
    if (!line.trim()) return { kind: 'fixed', glance: null };
    if (COMMENT.test(line)) return { kind: 'fixed', glance: ed.reads ? 'A comment. Whatever reads this file skips it.' : COPY_LINE };
    return { kind: 'fixed', glance: ed.reads ? (lines.fixed || 'This line has to stay as it is, or the file stops making sense to what reads it.') : COPY_LINE };
  }
  const COPY_LINE = 'Only my copy. Nothing reads it, so changing this changes nothing.';
  const COPY_SLOT = 'Any value. Only my copy, though: nothing reads it.';

  // A slot's line: what's fixed before it, the value, and whatever follows (a unit, a comment).
  function splitSlot(row, line) {
    const rest = line.slice(row.at.length);
    if (row.whole) return { head: '', value: line, tail: '' };
    const [, lead, value, tail] = rest.match(/^(\s*)(\S*)(.*)$/);
    return { head: row.at + lead, value, tail };
  }

  // ------------------------------------------------------------ the editor on the page

  function open(box, glanceText, { text, edit, S, phone, onChange, sound = () => {} }) {
    const base = text.split('\n');
    const lines = edit && edit.lines ? edit.lines(S) : {};
    const hunks = (lines.options || []).map((o) => {
      const h = hunk(base, o.text.split('\n'));
      return { ...h, say: o.say || describe(h.core), said: o.said, unsaid: o.unsaid };
    }).filter((h) => h.from.join('\n') !== h.to.join('\n'));
    const ed = { draft: base.slice(), hunks, lines, reads: !!edit };
    const idle = !edit && !plan(ed).some((r) => r.kind === 'slot')
      ? 'Only my copy. Nothing reads it, so nothing in it is worth changing.'
      : `${phone ? 'Tap' : 'Hover'} a line: I'll say what changing it would do.`;
    let focusAt = null;

    const say = (row) => { glanceText.textContent = (row && row.glance) || idle; };
    const changed = () => onChange(ed.draft.join('\n'));

    function render() {
      const rows = plan(ed);
      box.replaceChildren(...rows.map((row, i) => lineEl(row, i)));
      if (focusAt !== null) {
        const target = box.querySelector(`[data-i="${focusAt.i}"] ${focusAt.input ? 'input' : ''}`.trim()) || box.querySelector(`[data-i="${focusAt.i}"]`);
        if (target) {
          target.focus({ preventScroll: false });
          if (focusAt.caret !== undefined && target.setSelectionRange) target.setSelectionRange(focusAt.caret, focusAt.caret);
        }
        focusAt = null;
      }
    }

    function lineEl(row, i) {
      const line = ed.draft[i];
      const fresh = !base.includes(line);
      const div = el('div', `ed-line ${row.kind}${fresh ? ' changed' : ''}${row.made ? ' made' : ''}${row.kind === 'option' && !row.first ? ' cont' : ''}`);
      div.dataset.i = i;
      div.edRow = row;
      div.append(el('span', 'ed-mark'));
      if (row.kind === 'slot') div.append(slotEl(row, i, line));
      else div.append(el('span', 'ed-text', line || ' '));
      if (row.kind === 'option') {
        if (row.first) div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', row.glance);
        div.addEventListener('click', () => toggle(row, i));
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row, i); }
        });
      }
      return div;
    }

    function toggle(row, i) {
      const h = row.hunk;
      ed.draft.splice(row.at, row.len, ...(row.made ? h.from : h.to));
      sound(row.made ? 'soft' : 'press');
      focusAt = { i: Math.min(i, row.at + (row.made ? h.from : h.to).length - 1) };
      const now = plan(ed)[focusAt.i];
      render();
      say(phone ? { glance: row.made ? `Put back as it was.${h.unsaid ? ` ${capital(h.unsaid)}.` : ''}` : row.glance } : now); // a tap has no hover first: say what it did
      changed();
    }

    function slotEl(row, i, line) {
      const { head, value, tail } = splitSlot(row, line);
      const input = el('input', 'ed-slot');
      Object.assign(input, { value, spellcheck: false, autocomplete: 'off' });
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('aria-label', row.glance || 'value');
      const size = () => { input.style.width = `${Math.max(row.whole ? 24 : 3, input.value.length + 1)}ch`; };
      size();
      input.addEventListener('input', () => {
        ed.draft[i] = head + input.value + tail;
        size();
        input.closest('.ed-line').classList.toggle('changed', !base.includes(ed.draft[i]));
        changed();
      });
      input.addEventListener('keydown', (e) => slotKey(e, row, i, input));
      return el('span', 'ed-text', head, input, tail);
    }

    // Enter goes to the next value (in a note of the AI's own, starts a new line); Backspace on
    // an empty line of its own note takes the line away.
    function slotKey(e, row, i, input) {
      if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (row.whole) {
          const at = input.selectionStart;
          ed.draft.splice(i, 1, input.value.slice(0, at), input.value.slice(at));
          focusAt = { i: i + 1, input: true, caret: 0 };
          render();
          return changed();
        }
        const inputs = [...box.querySelectorAll('input')];
        (inputs[inputs.indexOf(input) + 1] || inputs[0]).focus();
      } else if (e.key === 'Backspace' && row.whole && input.selectionStart === 0 && input.selectionEnd === 0 && i > 0) {
        e.preventDefault();
        const prev = ed.draft[i - 1];
        ed.draft.splice(i - 1, 2, prev + input.value);
        focusAt = { i: i - 1, input: true, caret: prev.length };
        render();
        changed();
      }
    }

    const glanceOf = (node) => (node && node.closest ? node.closest('.ed-line') : null);
    box.onpointerover = (e) => say((glanceOf(e.target) || {}).edRow);
    box.onpointerleave = () => say(box.contains(document.activeElement) ? (glanceOf(document.activeElement) || {}).edRow : null);
    box.onfocusin = (e) => say((glanceOf(e.target) || {}).edRow);

    // As wide as its longest line, within reason: code wraps badly.
    const longest = Math.max(...base.map((l) => l.length), ...hunks.flatMap((h) => h.to.map((l) => l.length)));
    (box.closest('.dialog') || box).style.setProperty('--cols', Math.min(longest, 90));
    render();
    say(null);
    return {
      text: () => ed.draft.join('\n'),
      set(text) { ed.draft = text.split('\n'); render(); },
      focus() { const first = box.querySelector('input, [tabindex]'); if (first) first.focus(); },
      editable: () => plan(ed).some((r) => r.kind !== 'fixed'),
    };
  }

  return { open, hunk, describe, plan };
})();
