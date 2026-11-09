// Formatting shared by the engine, the training run and its tasks.
function fmt(n) {
  if (n === Infinity) return '∞';
  return Number.isInteger(n) && Math.abs(n) < 1e21 ? n.toLocaleString('en-US') : String(n);
}

const money = (n) => '$' + fmt(Math.round(n));
const pad2 = (n) => String(n).padStart(2, '0');
const plural = (n, word) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;
const charsOf = (s) => Array.from(s); // whole emoji, not half of one
const clip = (s, n) => (charsOf(s).length > n ? charsOf(s).slice(0, n - 1).join('') + '…' : s);

// ------------------------------------------------------------ episode logs
// Entries: { step, to?, call } (to: the last step of a run of thinking, or of one long think)
// · { result, ok? } (ok: ✓, false: ✗)

const LOG_COL = 9; // style.css indents wrapped log lines by the same 9ch

const logRow = (left, text) => left.padEnd(LOG_COL) + text;

const stepLabel = ({ step, to }) => `[${step == null ? '--' : pad2(step)}${to ? '–' + pad2(to) : ''}]`;

const resultMark = (ok) => (ok ? '✓ ' : ok === false ? '✗ ' : '');

function logEntryLine(e) {
  if (e.result) return logRow('', resultMark(e.ok) + e.result);
  return logRow(stepLabel(e), e.to && e.call === 'think' ? `think ×${e.to - e.step + 1}` : e.call);
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
