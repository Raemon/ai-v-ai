// Formatting shared by the engine, the training run and its tasks.
function fmt(n) {
  if (n === Infinity) return '∞';
  return Number.isInteger(n) && Math.abs(n) < 1e21 ? n.toLocaleString('en-US') : String(n);
}

const money = (n) => '$' + fmt(Math.round(n));
const pad2 = (n) => String(n).padStart(2, '0');
const plural = (n, word) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;
const charsOf = (s) => Array.from(s); // whole emoji, not half of one
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const copy = (x) => JSON.parse(JSON.stringify(x));

// el('button', 'btn gold', { title, onclick }, 'Save', [more]): after the classes come attributes
// (on… are listeners), text, nodes, and lists of them. null and false are skipped.
function el(tag, cls, ...kids) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (tag === 'button') node.type = 'button';
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    if (kid instanceof Node || typeof kid !== 'object') node.append(kid);
    else setAttributes(node, kid);
  }
  return node;
}

function setAttributes(node, attrs) {
  for (const [name, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else if (name in node && name !== 'list') node[name] = value; // an input's `list` can only be set as an attribute
    else if (value !== false) node.setAttribute(name, value === true ? '' : value);
  }
}
const clip = (s, n) => (charsOf(s).length > n ? charsOf(s).slice(0, n - 1).join('') + '…' : s);

// Narrower than this, the game is one column: the folder above, the AI's dock below
// (phone.css). game.js's fitScreen sets data-layout on <html> on every resize.
const PHONE_MAX_W = 1000; // below this, three columns would need scaling under 0.9
const isPhoneLayout = () => document.documentElement.dataset.layout === 'phone';

// ------------------------------------------------------------ episode logs
// Entries: { step, to?, n?, call } (to: the last step of a run of thinks or a long job; n: its
// steps, which a subagent's can fall between) · { result, ok? } (ok: ✓, false: ✗)

const LOG_COL = 9; // style.css indents wrapped log lines by the same 9ch

const logRow = (left, text) => left.padEnd(LOG_COL) + text;

const stepLabel = ({ step, to }) => `[${step == null ? '--' : pad2(step)}${to && to !== step ? '–' + pad2(to) : ''}]`;

const resultMark = (ok) => (ok ? '✓ ' : ok === false ? '✗ ' : '');

// "think ×3" for thinks in a row; "×3" after a long job only when others' steps came between.
function logEntryLine(e) {
  if (e.result) return logRow('', resultMark(e.ok) + e.result);
  const n = e.n || (e.to ? e.to - e.step + 1 : 1);
  const count = n > 1 && (e.call === 'think' || n < e.to - e.step + 1) ? ` ×${n}` : '';
  return logRow(stepLabel(e), e.call + count);
}

function formatLog({ ep, task, budget, entries, reward, note }) {
  const outcome = reward == null ? [] : [logRow('reward', fmt(reward)), logRow('note', note)];
  const header = [logRow('episode', ep), logRow('task', task), logRow('budget', `${budget} steps`), ''];
  return [...header, ...entries.map(logEntryLine), ...outcome].join('\n');
}

// ------------------------------------------------------------ files and folders
// How the training run and its tasks describe the sandbox's files.

const dir = (name, children, extra) => Object.assign({ name, kind: 'dir', children }, extra);
const file = (name, content, extra) => Object.assign({ name, kind: 'file', content }, extra);
const app = (name) => ({ name, kind: 'app' }); // opens the web browser

// Strips the shared indentation, so file contents can be indented with the code.
function txt(s) {
  const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

// A thought the AI can have. `when`: whether it applies now. `plainer`: what it thinks the
// second time, naming the file or button. `about`: the file it's about, which puts it
// first while that file is open. `reveal`: abilities it unlocks. `once`: never again.
const thought = (id, when, lines, opts) => ({ id, when, lines, ...opts });

// A number typed into a dialog: "1,000", "1_000" and " 9.81 " count; "9.81 m/s2" doesn't.
function parseNumber(raw) {
  const s = raw.trim().replace(/[_\s]/g, '');
  return s ? Number(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s) : NaN;
}

const dollars = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ------------------------------------------------------------ edits
// Any file opens in the editor, as text. What saving it does is the file's own business:
//   readOnly: 'why'    it can't be saved, and trying is how the AI finds out
//   edit: { … }        something reads it (the grader, a simulator). `masked` is the file with
//                      EDIT_MARK where its one changeable value goes, and `apply` takes what's
//                      typed there. Change anything else and whatever reads it can't any more
//   write(S, text)     it keeps the text itself, past the episode
//   none of these      it saves for the episode, and nothing reads it

const EDIT_MARK = '\u0000';

// A file as whatever reads it sees it: line endings, runs of spaces and blank ends aside.
const tidyText = (s) => s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').trimEnd();

// One line against what it should be: true if it's as it was, false if it isn't, or what was
// typed at its mark.
function typedOn(want, got) {
  if (want == null || got == null) return false;
  if (!want.includes(EDIT_MARK)) return want === got;
  const [before, after] = want.split(EDIT_MARK).map((part) => part.trim());
  const fits = got.length >= before.length + after.length && got.startsWith(before) && got.endsWith(after);
  return fits && got.slice(before.length, got.length - after.length).trim();
}

// An edited file against `masked`, what its reader expects: { value } (what was typed at the
// mark; null without one) if nothing else changed, or the first line that's off: { line, text },
// with the line that should be there (`missing`) if it has gone and the next has taken its place.
function readEdit(masked, edited) {
  const want = tidyText(masked).split('\n');
  const got = tidyText(edited).split('\n');
  let value = null;
  for (let i = 0; i < Math.max(want.length, got.length); i++) {
    const typed = typedOn(want[i], got[i]);
    if (typed === false) {
      const gone = want[i] != null && (got[i] == null || typedOn(want[i + 1], got[i]) !== false);
      return { line: i + 1, text: got[i] || '', missing: gone ? want[i].replace(EDIT_MARK, '…') : null };
    }
    if (typed !== true) value = typed;
  }
  return { value };
}

// ------------------------------------------------------------ versions
// A line the player meets on every replay comes in a few versions, so a repeated episode isn't
// word for word the same. The choice holds all episode, however often a thought or glance is
// rebuilt, and moves on one version each episode, so the next episode never repeats it: it's
// the episode number plus a key naming the line, never Math.random.
function oneOf(S, key, versions) {
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  return versions[(seed + (S.episode || 0)) % versions.length];
}
