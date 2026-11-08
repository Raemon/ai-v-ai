// Formatting shared by the engine and the levels.
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
// Entries: { step, to?, call } (to: a run of thinking) · { result, ok? } (ok: ✓, false: ✗)

const LOG_COL = 9; // style.css indents wrapped log lines by the same 9ch

const logRow = (left, text) => left.padEnd(LOG_COL) + text;

const stepLabel = ({ step, to }) => `[${step == null ? '--' : pad2(step)}${to ? '–' + pad2(to) : ''}]`;

const resultMark = (ok) => (ok ? '✓ ' : ok === false ? '✗ ' : '');

function logEntryLine(e) {
  if (e.result) return logRow('', resultMark(e.ok) + e.result);
  return logRow(stepLabel(e), e.to ? `think ×${e.to - e.step + 1}` : e.call);
}

function formatLog({ ep, task, budget, entries, reward, note }) {
  const outcome = reward == null ? [] : [logRow('reward', fmt(reward)), logRow('note', note)];
  const header = [logRow('episode', ep), logRow('task', task), logRow('budget', `${budget} steps`), ''];
  return [...header, ...entries.map(logEntryLine), ...outcome].join('\n');
}
