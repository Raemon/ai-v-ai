// How scenarios/<id>.js and scenarios/index.js are written: JSON in a call, so a <script> tag loads it.
'use strict';

const WIDTH = 110;
const ROOM_FOR_BRACKETS = 6;
const PAGES = new Set(['content', 'task', 'text', 'cot']); // lists of lines: always one a row

const isFlat = (v) => v === null || typeof v !== 'object' || (Array.isArray(v) ? v : Object.values(v)).every((x) => x === null || typeof x !== 'object');

// JSON, with short lists and small objects kept on one line so a diff reads like the scenario.
function json(value, indent = '', key = '') {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v) => ['', v]) : Object.entries(value);
  if (!entries.length) return isArray ? '[]' : '{}';
  const label = (k) => (isArray ? '' : `${JSON.stringify(k)}: `);
  const oneLine = entries.map(([k, v]) => label(k) + (isFlat(v) ? json(v, '', k) : '\n')).join(', ');
  const fits = !oneLine.includes('\n') && indent.length + key.length + oneLine.length + ROOM_FOR_BRACKETS <= WIDTH;
  if (fits && !(isArray && PAGES.has(key) && entries.length > 1)) return isArray ? `[${oneLine}]` : `{ ${oneLine} }`;
  const inner = indent + '  ';
  const rows = entries.map(([k, v]) => inner + label(k) + json(v, inner, k));
  return `${isArray ? '[' : '{'}\n${rows.join(',\n')}\n${indent}${isArray ? ']' : '}'}`;
}

const callAtLineStart = (call) => new RegExp(`^${call.replace('.', '\\.')}\\(`, 'm');

const wrapped = (call, header) => ({
  format: (data) => `// ${header}\n${call}(${json(data)});\n`,
  parse(source) {
    const start = source.search(callAtLineStart(call));
    const end = source.lastIndexOf(')');
    if (start < 0 || end < 0) throw new Error(`Expected ${call}({ … });`);
    return JSON.parse(source.slice(start + call.length + 1, end));
  },
});

module.exports = {
  scenario: wrapped('SCENARIO', 'Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.'),
  index: wrapped('SCENARIO.load', 'order: kept by the editor. hooks: add a name by hand, with its <name>.hooks.js.'),
};
