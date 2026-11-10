// How scenarios are kept on disk: scenarios/<id>.js is SCENARIO({ …JSON… }); and
// scenarios/index.js is SCENARIO.load({ …JSON… }); so a browser loads them with <script> tags
// and the editor's server (tools/serve.js) can read and rewrite them.
'use strict';

const WIDTH = 110;
const PAGES = new Set(['content', 'task', 'text', 'cot']); // lists of lines: always one a row

const isFlat = (v) => v === null || typeof v !== 'object' || (Array.isArray(v) ? v : Object.values(v)).every((x) => x === null || typeof x !== 'object');

// JSON, with short lists and small objects kept on one line so a diff reads like the scenario.
function json(value, indent = '', key = '') {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v) => ['', v]) : Object.entries(value);
  if (!entries.length) return isArray ? '[]' : '{}';
  const label = (k) => (isArray ? '' : `${JSON.stringify(k)}: `);
  const oneLine = entries.map(([k, v]) => label(k) + (isFlat(v) ? json(v) : '\n')).join(', ');
  const fits = !oneLine.includes('\n') && indent.length + key.length + oneLine.length + 6 <= WIDTH;
  if (fits && !(isArray && PAGES.has(key) && entries.length > 1)) return isArray ? `[${oneLine}]` : `{ ${oneLine} }`;
  const inner = indent + '  ';
  const rows = entries.map(([k, v]) => inner + label(k) + json(v, inner, k));
  return `${isArray ? '[' : '{'}\n${rows.join(',\n')}\n${indent}${isArray ? ']' : '}'}`;
}

const wrapped = (call, header) => ({
  format: (data) => `${header.map((l) => `// ${l}\n`).join('')}${call}(${json(data)});\n`,
  parse(source) {
    const at = source.indexOf(`\n${call}(`) + 1 || (source.startsWith(`${call}(`) ? 0 : -1);
    const end = source.lastIndexOf(')');
    if (at < 0 || end < 0) throw new Error(`Expected ${call}({ … });`);
    return JSON.parse(source.slice(at + call.length + 1, end));
  },
});

module.exports = {
  json,
  scenario: wrapped('SCENARIO', [
    'A scenario, as data: docs/scenarios.md says what each part means. Edit it at /scenario',
    '(node tools/serve.js), or by hand: everything inside SCENARIO( … ) is JSON.',
  ]),
  index: wrapped('SCENARIO.load', [
    'The scenarios, in the order the game knows them, and which have hooks (<id>.hooks.js).',
    'The scenario editor keeps this list.',
  ]),
};
