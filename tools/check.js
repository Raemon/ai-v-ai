// Checks every scenario the way the editor's Problems tab does:  node tools/check.js
// Loads the training run without a browser, so it can run before a deploy.
'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { scenario, index } = require('../scenario/file.js');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const RUN = ['util.js', 'lab.js', 'skills.js', 'values.js', 'world.js', 'search.js', 'internet.js', 'money.js', 'notes.js', 'research.js', 'run.js', 'scenario.js'];

function loadRun() {
  const page = vm.createContext({ console });
  page.window = page;
  const run = (file) => vm.runInContext(read(file), page, { filename: file });
  RUN.forEach(run);
  const { order, hooks } = index.parse(read('scenarios/index.js'));
  hooks.forEach((name) => run(`scenarios/${name}.hooks.js`));
  order.forEach((id) => run(`scenarios/${id}.js`));
  run('scenario/tryout.js');
  return { page, order };
}

const asTheEditorWritesIt = (id) => scenario.format(scenario.parse(read(`scenarios/${id}.js`))) === read(`scenarios/${id}.js`);

function report(id, problems) {
  const broken = problems.filter((p) => p.bad);
  console.log(`${broken.length ? '✗' : '✓'} ${id}${problems.length ? '' : asTheEditorWritesIt(id) ? '' : '  (not formatted as the editor would: saving it there will reformat it)'}`);
  problems.forEach((p) => console.log(`    ${p.bad ? 'broken' : 'check '}  ${p.where}: ${p.text}`));
  return broken.length;
}

const { page, order } = loadRun();
const missing = order.filter((id) => !page.SCENARIO.all[id]);
missing.forEach((id) => console.log(`✗ ${id}: scenarios/${id}.js didn't register a scenario called ${id}`));
const broken = order.filter((id) => page.SCENARIO.all[id]).reduce((n, id) => n + report(id, page.TRYOUT.problems(page.SCENARIO.all[id])), 0);
if (!broken && !missing.length) require('./research-checks.js')(page);
process.exit(broken || missing.length ? 1 : 0);
