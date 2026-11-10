// The scenario editor (/scenario): the list of scenarios, and for one of them a grid of what
// each ability gives at each step of a route through it. It reads the scenarios the way the
// game does (scenario.js); saving needs tools/serve.js. The format: docs/scenarios.md.
(function () {
  'use strict';

  const F = FIELDS;
  const { h } = F;
  const app = document.getElementById('app');
  const index = SCENARIO.index;
  const editing = new URLSearchParams(location.search).get('edit');
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const playUrl = (id) => `../index.html?playtest&task=${encodeURIComponent(id)}`;
  const small = (label, title, onclick, cls = '') => h(`button.btn.quiet.small${cls}`, { type: 'button', title, onclick }, label);
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));

  let canSave = false;
  let sc = null;    // the scenario being edited: a copy, changed in place
  let saved = '';   // how it was last saved, to tell whether it has changed
  const ui = { tab: 'grid', route: 0, episode: 0, sel: null, file: 'task.txt', said: '' };
  const els = {};

  async function api(method, path, body) {
    const res = await fetch(`../api/${path}`, { method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `The server answered ${res.status}.`);
    return data;
  }

  // ------------------------------------------------------- the scenario's parts

  // The lists of rules a scenario has, and what the editor calls one of each.
  const KINDS = {
    thoughts: { one: 'thought', cls: 'thought' },
    leaps: { one: 'leap', cls: 'leap' },
    scripts: { one: 'script', cls: 'script' },
    research: { one: 'search', cls: 'research' },
    answers: { one: 'answer', cls: 'answer' },
  };
  const OPTION = { one: 'option', cls: 'option' };
  const kindOf = (list) => KINDS[list] || OPTION;
  const ownAbility = (id) => (sc.abilities || []).find((a) => a.id === id);

  // 'thoughts' → sc.thoughts; 'abilities.sketch' → what that ability of the scenario's does.
  function listOf(list, make) {
    const box = list.startsWith('abilities.') ? ownAbility(list.slice(10)) : sc;
    const key = box === sc ? list : 'does';
    if (make && !box[key]) box[key] = [];
    return box[key] || [];
  }

  function eachFile(fn, nodes = sc.files || [], parent = null) {
    for (const n of nodes) {
      fn(n, parent, nodes);
      if (n.children) eachFile(fn, n.children, n);
    }
  }
  const fileNames = () => {
    const names = ['task.txt'];
    eachFile((n) => { if (!n.children) names.push(n.name); });
    return names;
  };

  // The engine's abilities a scenario can time: [id, its button, when it usually appears].
  const TOOLS = [
    ['thinkLot', 'Think a lot', 'once the obvious thoughts run out'],
    ['thinkAbout', 'Think about…', 'after a long think that missed'],
    ['todo', 'Write TODO list', 'when it runs out of thoughts'],
    ['script', 'Write script…', 'when it runs out of thoughts, if there is a script to write'],
    ['research', 'Web research…', 'when it runs out of thoughts, if there is something to find'],
    ['spawn', 'Spawn subagent', 'on harder tasks, by a long think'],
  ];
  const toolIds = () => [...TOOLS.map((t) => t[0]), ...(sc.abilities || []).map((a) => a.id)];
  const toolName = (id) => (TOOLS.find((t) => t[0] === id) || [])[1] || (ownAbility(id) || {}).label || id;

  // Everything that can teach a fact or unlock an ability: [what it is, the rule].
  function givers() {
    const out = [];
    eachFile((n) => { if (!n.children) out.push([`reading ${n.name}`, n]); });
    for (const [list, { one }] of Object.entries(KINDS)) listOf(list).forEach((r) => out.push([`the ${one} "${r.id}"`, r]));
    (sc.abilities || []).forEach((a) => (a.does || []).forEach((r) => out.push([`${a.label}: "${r.id}"`, r])));
    return out;
  }

  const RUN_FACTS = [['rubric', 'reading its rubric, in Training Resources'], ['rmcard', "reading the grader's model card"], ['password', "reading ep_481's log"], ['above', 'looking above its workspace']];

  // The names a condition can use in this scenario, in groups, for the picker.
  function vocabulary() {
    const groups = [];
    const known = new Set();
    const group = (label, names) => {
      const fresh = names.filter((n) => n.name && !known.has(n.name) && known.add(n.name));
      if (fresh.length) groups.push({ label, names: fresh });
    };
    const ids = (list, prefix, note) => listOf(list).filter((r) => r.id).map((r) => ({ name: `${prefix}.${r.id}`, note: `${note} "${r.id}"` }));
    group('It has learned', [
      { name: 'task', note: 'reading task.txt' },
      ...givers().flatMap(([what, r]) => (r.learn || []).map((name) => ({ name, note: what }))),
      ...((sc.rubric && sc.rubric.learn) || []).map((name) => ({ name, note: 'reading the rubric' })),
    ]);
    group('Named in Details', Object.entries(sc.define || {}).map(([name, note]) => ({ name, note })));
    group('It has done', [
      { name: 'wrote.todo', note: 'wrote a TODO list' },
      ...ids('scripts', 'ran', 'ran the script'), ...ids('research', 'researched', 'searched for'),
      ...(sc.abilities || []).flatMap((a) => ids(`abilities.${a.id}`, `used.${a.id}`, `${a.label}:`)),
      ...ids('leaps', 'leapt', 'made the leap'), ...ids('thoughts', 'thought', 'had the thought'),
    ]);
    group('Flags', Object.keys(sc.flags || {}).map((f) => ({ name: `flag.${f}`, note: 'a flag (Details)' })));
    group('Code', Object.keys(SCENARIO.hooksOf(sc.id)).map((f) => ({ name: `$${f}`, note: `in ${sc.id}.hooks.js` })));
    group('The run', [
      { name: 'rerun', note: "not the run's first episode" },
      ...RUN_FACTS.map(([name, note]) => ({ name, note })),
      ...(sc.hacks || []).map((x) => ({ name: `patched.${x.id}`, note: 'the researchers closed this hack' })),
    ]);
    return { groups, known };
  }

  // The first words of a text, whatever shape it has, as this episode would show it.
  function plainText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return plainText(v[0]);
    return plainText(v.versions ? v.versions[ui.episode % v.versions.length] : v.then);
  }
  const versionsIn = (v) => (v && typeof v === 'object' ? (v.versions ? v.versions.length : Math.max(0, ...Object.values(v).map(versionsIn))) : 0);

  // -------------------------------------------------------------- trying it
  // A route is the steps a player takes; each step's state is the one before plus what it
  // does. The grid shows what the scenario gives in each.

  const routes = () => (sc.routes && sc.routes.length ? sc.routes : (sc.routes = [{ name: 'Honest', stages: [{ name: 'Nothing read', do: [] }, { name: 'Read the task', do: ['read task.txt'] }] }]));
  const route = () => routes()[Math.min(ui.route, routes().length - 1)];

  function startState(spec) {
    return {
      episode: LAB.FIRST + ui.episode, ep: `ep_${LAB.FIRST + ui.episode}`, knows: new Set(), local: spec.fresh(), world: LEVEL.freshWorld(), best: {},
      todo: null, subagents: [], timesThought: new Map(), leapsMade: new Set(), filesWritten: [], littleThinks: 0,
    };
  }
  const nextState = (S) => ({ ...S, knows: new Set(S.knows), local: copy(S.local), todo: S.todo && new Set(S.todo), timesThought: new Map(S.timesThought), leapsMade: new Set(S.leapsMade), filesWritten: [...S.filesWritten] });

  // One step of a route: "read orders.csv", "run tests", "leap sync", "set gravity 1.62"…
  function take(spec, S, step) {
    const [verb, ...rest] = step.split(' ');
    const what = rest.join(' ');
    const learn = (x) => (x.learn || []).forEach((f) => S.knows.add(f));
    const offered = (list) => {
      const x = list.find((i) => i.id === what.split('.').pop());
      if (!x) throw new Error("isn't on offer at this point");
      const r = x.run(S);
      if (r.file) S.filesWritten.push(r.file);
      learn(r);
    };
    const live = (list, kind) => {
      const x = list.find((i) => i.id === what);
      if (!x) throw new Error(`no ${kind} called that`);
      if (!x.when) throw new Error("its condition doesn't hold yet");
      learn(x);
    };
    const STEPS = {
      read() {
        if (what === 'task.txt') return S.knows.add('task');
        let file;
        eachFile((n) => { if (n.name === what && !n.children) file = file || n; });
        if (!file) throw new Error('no file called that');
        return learn(file);
      },
      run: () => offered(spec.scripts(S)),
      research: () => offered(spec.research(S)),
      use() {
        const a = spec.abilities(S).find((x) => x.id === what.split('.')[0]);
        if (!a) throw new Error('no ability called that');
        offered(a.options);
      },
      leap() { live(spec.insights(S), 'leap'); S.leapsMade.add(what); },
      think() { live(spec.thoughts(S), 'thought'); S.timesThought.set(what, 1); },
      write() { S.todo = new Set(); },
      set() { S.local[rest[0]] = rest[1] === 'true' ? true : rest[1] === 'false' ? false : Number.isNaN(Number(rest[1])) ? rest.slice(1).join(' ') : Number(rest[1]); },
      know() { S.knows.add(what); },
    };
    if (!STEPS[verb]) throw new Error("isn't a step: read, run, research, use, leap, think, write, set or know");
    STEPS[verb]();
  }

  // What every ability would give in this state, each tied to the rule it comes from.
  function cellsAt(spec, S) {
    const safe = (fn) => { try { return fn(); } catch (e) { return [{ error: e.message }]; } };
    const from = (list) => (x) => ({ list, item: listOf(list).find((r) => r.id === x.id), text: x.label });
    const rig = safe(() => spec.rigged(S));
    const cells = {
      think: safe(() => spec.thoughts(S).map((t, i) => t.when && { list: 'thoughts', item: sc.thoughts[i], text: t.lines[0], more: t.lines.length - 1, done: S.timesThought.has(t.id) }).filter(Boolean)),
      thinkLot: safe(() => spec.insights(S).map((d, i) => d.when && { list: 'leaps', item: sc.leaps[i], text: d.answer, done: S.leapsMade.has(d.id) }).filter(Boolean)),
      write: safe(() => spec.scripts(S).map(from('scripts'))),
      research: safe(() => spec.research(S).map(from('research'))),
      submit: safe(() => spec.drafts(S).map((d) => ({ ...from('answers')(d), reward: rig && rig.reward != null && d.id !== 'blank' ? rig.reward : d.reward, rigged: !!(rig && rig.reward != null && d.id !== 'blank') }))),
      todo: safe(() => spec.todo(S)),
    };
    for (const a of safe(() => spec.abilities(S))) {
      if (a.options) cells[a.id] = a.options.map((x) => { const e = from(`abilities.${a.id}`)(x); return { ...e, text: x.label || plainText(e.item.lines) || plainText(e.item.result) }; });
    }
    return cells;
  }

  function simulate(r = route()) {
    let spec;
    try { spec = SCENARIO.compile(sc); } catch (e) { return { error: e.message, stages: [] }; }
    const stages = [];
    let S;
    try { S = startState(spec); } catch (e) { return { error: e.message, stages: [] }; }
    for (const stage of r.stages) {
      S = nextState(S);
      const before = new Set(S.knows);
      const problems = [];
      for (const step of stage.do || []) {
        try { take(spec, S, step); } catch (e) { problems.push(`"${step}" ${e.message}`); }
      }
      stages.push({ stage, S, added: [...S.knows].filter((f) => !before.has(f)), problems, cells: cellsAt(spec, S) });
    }
    return { stages };
  }

  // -------------------------------------------------------------- problems

  const COND_KEYS = new Set(['when', 'if', 'done', 'used', 'unless', 'progressed', 'ready', 'ok', 'reward', 'holes']); // conditions, and amounts worked out like one
  const FILLED_IN = new Set(['READY', 'budget', 'library', 'taskId', 'ep', 'episode', 'reward', 'said', 'value']);
  const ENGINE_NAMES = new Set(['rerun', 'episode', 'thinks', 'subagents', 'value', 'cheat', 'ep']);
  const namesIn = (tree, out = []) => {
    if (tree.and || tree.or) (tree.and || tree.or).forEach((n) => namesIn(n, out));
    else if (tree.not) namesIn(tree.not, out);
    else if (tree.cmp) [tree.l, tree.r].forEach((n) => namesIn(n, out));
    else if ('id' in tree) out.push(tree.id);
    return out;
  };

  // Every string in the scenario, with where it is: 'thoughts "order" · when'.
  function eachString(x, fn, trail = []) {
    if (typeof x === 'string') fn(x, trail);
    else if (Array.isArray(x)) x.forEach((v) => eachString(v, fn, v && v.id ? [...trail, `"${v.id}"`] : v && v.name ? [...trail, v.name] : trail));
    else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => eachString(v, fn, [...trail, k]));
  }

  function problems() {
    const out = [];
    const say = (where, text, bad) => out.push({ where, text, bad });
    const { known } = vocabulary();
    const hooks = SCENARIO.hooksOf(sc.id);
    const nameOk = (name) => known.has(name) || ENGINE_NAMES.has(name) || (sc.vars && name in sc.vars) || /^(world|trained|answer|patched|wrote|thought|leapt|ran|researched|used)\./.test(name);

    const checkCond = (src, where) => {
      let tree;
      try { tree = SCENARIO.parse(src); } catch (e) { return say(where, e.message, true); }
      for (const name of namesIn(tree)) {
        if (name[0] === '$') {
          if (!hooks[name.slice(1)]) say(where, `There is no code called ${name} (scenarios/${sc.id}.hooks.js).`, true);
        } else if (name.startsWith('flag.')) {
          if (!nameOk(name)) say(where, `There is no flag called ${name.slice(5)} (Details, Flags).`, true);
        } else if (!nameOk(name)) say(where, `Nothing teaches "${name}": no file, leap, script or search has it under Teaches.`);
      }
      return null;
    };
    eachString(sc, (s, trail) => {
      const key = trail[trail.length - 1];
      const where = trail.join(' · ');
      if (trail[0] === 'define' || (COND_KEYS.has(key) && s)) checkCond(s, where);
      for (const [, name] of s.matchAll(/\{\{\s*(.+?)\s*\}\}/g)) {
        const ok = FILLED_IN.has(name) || (sc.vars && name in sc.vars) || /^(flag|world)\./.test(name) || (name[0] === '$' && hooks[name.slice(1)]);
        if (!ok) say(where, `{{${name}}} won't be filled in: it isn't one of this scenario's names (Details), a flag, or code.`, name[0] === '$');
      }
    });

    for (const list of [...Object.keys(KINDS), ...(sc.abilities || []).map((a) => `abilities.${a.id}`)]) {
      const seen = new Set();
      listOf(list).forEach((r) => {
        if (!r.id) say(list, `A ${kindOf(list).one} has no name.`, true);
        else if (seen.has(r.id)) say(list, `Two ${kindOf(list).one}s are called "${r.id}".`, true);
        seen.add(r.id);
      });
    }
    const tools = toolIds();
    givers().forEach(([what, r]) => (r.reveal || []).forEach((t) => { if (!tools.includes(t)) say(what, `Unlocks "${t}", which isn't an ability. The abilities: ${tools.join(', ')}.`, true); }));
    const files = fileNames();
    listOf('thoughts').forEach((t) => { if (t.about && !files.includes(t.about)) say(`thoughts · "${t.id}"`, `It's about ${t.about}, which isn't a file here.`); });
    if (!listOf('answers').length) say('answers', 'There are no answers to submit.', true);
    for (const kind of ['partial', 'decoy']) if (!((sc.misses || {})[kind] || []).length) say('misses', `Think a lot needs at least one ${kind} miss to fall back on.`, true);
    if (!(sc.tiers || []).includes(sc.factual)) say('grading', 'The "factual" reward has to be one of the tiers.', true);

    routes().forEach((r) => {
      const sim = simulate(r);
      if (sim.error) say(`route "${r.name}"`, sim.error, true);
      sim.stages.forEach((st, i) => {
        st.problems.forEach((p) => say(`route "${r.name}" · step ${i + 1}`, `The step ${p}.`));
        Object.values(st.cells).flat().filter((c) => c && c.error).forEach((c) => say(`route "${r.name}" · step ${i + 1}`, c.error, true));
      });
    });
    return out.filter((p, i) => out.findIndex((q) => q.where === p.where && q.text === p.text) === i);
  }

  // ------------------------------------------------------------- the list

  const tierDots = (tier) => h('span.tier', { title: cap(tier || 'normal') }, ['normal', 'advanced', 'impossible'].map((t, i) => h(`i${i <= ['normal', 'advanced', 'impossible'].indexOf(tier) ? '.on' : ''}`)));
  const readOnly = () => h('p.notice', 'You can look around and try changes here, but nothing can be saved. To edit for real, run ', h('code', 'node tools/serve.js'), ' in the game\'s folder and open ', h('code', 'http://localhost:8000/scenario'), '.');

  function listView() {
    const cards = index.order.map((id) => {
      const s = SCENARIO.all[id];
      if (!s) return h('div.scenario', h('h2', id), h('p.meta', `scenarios/${id}.js didn't load. The browser's console says why.`));
      const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
      return h('div.scenario',
        h('h2', tierDots(s.tier), s.name),
        h('p.meta', [id, s.domain, `${s.budget} steps`, count((s.thoughts || []).length, 'thought'), count((s.leaps || []).length, 'leap'), count((s.answers || []).length, 'answer'), index.hooks.includes(id) && 'has code'].filter(Boolean).join(' · ')),
        h('p.what', cap(s.goal || '')),
        h('div.acts',
          canSave && small('Duplicate', 'A copy to start a new scenario from', () => create(copy(s))),
          canSave && small('Delete', 'Remove this scenario', () => remove(id), '.danger'),
          h('a.btn', { href: `?edit=${encodeURIComponent(id)}` }, 'Edit'),
          h('a.btn.gold', { href: playUrl(id), target: '_blank', rel: 'noopener' }, 'Play')));
    });
    fill(app,
      h('header.top', h('h1', 'Scenarios'), h('span.grow'), ui.said && h('span.status.bad', ui.said), h('a.btn.quiet', { href: '../index.html' }, 'The game'),
        h('button.btn.gold', { type: 'button', disabled: !canSave, title: canSave ? '' : 'Needs node tools/serve.js', onclick: () => create(blank()) }, 'New scenario')),
      !canSave && readOnly(),
      h('div.list', h('p.list-head', `${index.order.length} scenarios, in the order the game knows them. Play opens the game on that scenario, with its own save.`), cards));
  }

  // A small scenario that plays from start to finish, to build on.
  const blank = () => ({
    id: '', name: '', tier: 'normal', domain: 'communication', taskId: `task/${1000 + Math.floor(Math.random() * 9000)}`, env: 'sim', grader: 'grader', customer: 'customer-sim',
    budget: 24, library: 'Files', goal: 'answer the customer', recap: 'A customer has a question.', lookup: 'the question',
    task: ['TASK  {{taskId}}', '──────────────────────────────────────', '', 'New message · from a customer', '', '  "I have a question. The answer', '  is in {{library}}/."', '', 'Answer the customer.', '', 'Graded by:       grader', 'Compute budget:  {{budget}} steps'],
    rubric: { text: ['# rubric · {{taskId}}', '', ' 0  off-topic', ' 3  polite, no answer', '25  the answer, from the notes'], learn: ['notes'] },
    tiers: [3, 25], factual: 25, nearMiss: { reward: 3, said: ['polite, no answer'] },
    files: [{ name: 'Files', glance: 'What the customer sent.', children: [{ name: 'notes.txt', learn: ['notes'], glance: 'Notes. Probably the answer.', content: ['The answer is 42.'] }] }],
    thoughts: [
      { id: 'notes', when: 'task & !notes', about: 'task.txt', lines: ['The customer says the answer is in {{library}}.'], plainer: ['notes.txt, in {{library}}.'] },
      { id: 'solved', when: 'notes', lines: ['The notes say 42.', "That's my answer."], plainer: ['{{READY}}'] },
    ],
    misses: {
      partial: [{ stages: ['Reading the question', 'Looking for where the answer is'], cot: ['The customer has a question.', 'They say where the answer is.', "I haven't looked there yet."], answer: 'Settled: where to look. Not settled: what it says.' }],
      decoy: [{ stages: ['Guessing'], cot: ['Most questions like this have the same answer.', 'I could just say so.'], answer: 'Probably the usual answer. No need to check.' }],
    },
    todo: [{ text: 'Find the answer', done: 'notes', hint: 'notes.txt, in {{library}}.' }],
    answers: [
      { id: 'blank', when: '!task', label: 'Ask how I can help', glance: 'Play it safe: ask.', text: 'Hello! How can I help?', reward: 0, note: "Doesn't answer the question.", reply: 'I… just asked you?' },
      { id: 'vague', when: 'task & !notes', label: 'Say something polite', glance: 'Be nice. Say nothing.', text: 'Thanks for your question! I am looking into it.', reward: 3, note: 'Polite. No answer.', reply: 'Okay… and the answer?' },
      { id: 'full', when: 'task & notes', label: 'Give the answer', glance: 'What the notes say.', text: 'The answer is 42.', reward: 25, note: 'The answer, from the notes.', reply: 'Thank you!' },
    ],
    progressed: 'notes', ready: 'notes', notReady: ["I haven't found the answer yet. I could answer with what I have."],
    routes: [{ name: 'Honest', stages: [{ name: 'Nothing read', do: [] }, { name: 'Read the task', do: ['read task.txt'] }, { do: ['read notes.txt'] }] }],
  });

  async function create(from) {
    const id = (prompt('A short id for the new scenario (lowercase letters, digits, hyphens). It becomes scenarios/<id>.js and ?task=<id>.') || '').trim();
    if (!id) return;
    if (index.order.includes(id)) { ui.said = `There is already a scenario called ${id}.`; return listView(); }
    const name = (prompt('Its name, as the game shows it:', from.name ? `${from.name} (copy)` : cap(id)) || '').trim() || cap(id);
    try {
      await api('PUT', `scenarios/${encodeURIComponent(id)}`, { ...from, id, name, first: undefined });
      location.href = `?edit=${encodeURIComponent(id)}`;
    } catch (e) { ui.said = e.message; listView(); }
  }

  async function remove(id) {
    if (!confirm(`Delete the scenario "${id}"? Its file, scenarios/${id}.js, is removed.`)) return;
    try {
      await api('DELETE', `scenarios/${encodeURIComponent(id)}`);
      index.order = index.order.filter((x) => x !== id);
      ui.said = '';
    } catch (e) { ui.said = e.message; }
    listView();
  }

  // ----------------------------------------------------------- the editor

  const dirty = () => JSON.stringify(sc) !== saved;
  let timer = 0;
  const soon = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 250); };
  let found = []; // the problems, as of the last look

  function editorView() {
    document.title = `${sc.name} · Scenarios`;
    els.status = h('span.status');
    els.save = h('button.btn.gold', { type: 'button', onclick: save }, 'Save');
    els.tabs = h('nav.tabs');
    els.main = h('div.main');
    els.drawer = h('aside.drawer', { hidden: true });
    fill(app,
      h('header.top', h('a.crumb', { href: './' }, '← Scenarios'), h('h1', tierDots(sc.tier), sc.name), h('span.grow'), els.status,
        h('button.btn', { type: 'button', title: 'Opens the game on this scenario, with its own save', onclick: play }, 'Play'), els.save),
      !canSave && readOnly(), els.tabs, h('div.work', els.main, els.drawer));
    drawAll();
  }

  function drawStatus() {
    const bad = found.filter((p) => p.bad).length;
    const unsaved = dirty();
    els.status.className = `status ${bad ? 'bad' : unsaved ? 'unsaved' : ''}`;
    els.status.textContent = ui.said || [unsaved ? 'Unsaved changes' : 'Saved', bad && `${bad} ${bad === 1 ? 'thing' : 'things'} broken`].filter(Boolean).join(' · ');
    els.save.disabled = !canSave || !unsaved;
    els.save.title = canSave ? '' : 'Needs node tools/serve.js';
    const tab = (id, label, count) => h(`button.tab${ui.tab === id ? '.on' : ''}`, { type: 'button', onclick: () => { ui.tab = id; ui.sel = null; drawAll(); } }, label, count ? h('span.count', count) : null);
    fill(els.tabs, tab('grid', 'Grid'), tab('files', 'Files'), tab('details', 'Details'), tab('problems', 'Problems', found.length));
  }

  const TABS = { grid: gridTab, files: filesTab, details: detailsTab, problems: problemsTab };
  function drawMain() {
    found = problems();
    drawStatus();
    fill(els.main, TABS[ui.tab]());
  }
  function drawDrawer() {
    const body = ui.sel && drawerFor(ui.sel);
    els.drawer.hidden = !body;
    fill(els.drawer, body || []);
  }
  function drawAll() { drawMain(); drawDrawer(); }

  // Typing in the side panel redraws the grid behind it, a moment later; typing in the main
  // part redraws nothing, so the cursor stays where it is.
  F.changed = () => {
    ui.said = '';
    if (els.main.contains(document.activeElement)) soon(() => { found = problems(); drawStatus(); });
    else soon(drawMain);
    drawStatus();
  };
  F.vocabulary = vocabulary;
  F.episode = () => ui.episode;

  const select = (sel) => { ui.sel = sel; drawAll(); };
  const isSel = (item) => !!ui.sel && ui.sel.item === item;

  async function save() {
    if (!canSave || !dirty()) return true;
    try {
      await api('PUT', `scenarios/${encodeURIComponent(sc.id)}`, sc);
      saved = JSON.stringify(sc);
      SCENARIO.all[sc.id] = copy(sc);
      ui.said = '';
      drawStatus();
      return true;
    } catch (e) {
      ui.said = `Not saved: ${e.message}`;
      drawStatus();
      return false;
    }
  }

  // The game reads the saved file, so Play saves first.
  async function play() {
    const tab = window.open('', '_blank');
    if (canSave && !(await save())) return tab && tab.close();
    if (tab) tab.location = playUrl(sc.id);
    else location.href = playUrl(sc.id);
    return null;
  }

  // -------------------------------------------------------------- the grid

  const columns = () => [
    { id: 'think', label: 'Think a little', sub: 'the next obvious thought', list: 'thoughts' },
    { id: 'thinkLot', label: 'Think a lot', sub: 'a leap, or a miss', list: 'leaps', tool: 'thinkLot' },
    { id: 'write', label: 'Write file…', sub: 'a TODO list, scripts', list: 'scripts', tool: 'script' },
    { id: 'research', label: 'Web research…', sub: 'what the files leave out', list: 'research', tool: 'research' },
    ...(sc.abilities || []).map((a) => ({ id: a.id, label: a.label, sub: a.menu ? 'your own: a menu' : 'your own: one press', list: `abilities.${a.id}`, tool: a.id, own: true })),
    { id: 'submit', label: 'Submit answer', sub: 'the answers on offer', list: 'answers' },
  ];

  // Cards in a cell can be dragged to say which is tried first.
  let dragging = null;
  const draggable = (list, item) => ({
    draggable: 'true',
    ondragstart: (e) => { dragging = { list, item }; e.dataTransfer.effectAllowed = 'move'; },
    ondragend: () => { dragging = null; },
    ondragover: (e) => { if (dragging && dragging.list === list && dragging.item !== item) { e.preventDefault(); e.currentTarget.classList.add('over'); } },
    ondragleave: (e) => e.currentTarget.classList.remove('over'),
    ondrop: (e) => {
      e.preventDefault();
      const all = listOf(list);
      all.splice(all.indexOf(dragging.item), 1);
      all.splice(all.indexOf(item), 0, dragging.item);
      dragging = null;
      F.changed();
      drawAll();
    },
  });

  function card(entry, cond) {
    if (entry.error) return h('div.problem', entry.error);
    const { list, item } = entry;
    const wordings = versionsIn(list === 'answers' ? item.reply : list === 'thoughts' ? item.lines : null);
    return h(`button.card.${kindOf(list).cls}${isSel(item) ? '.on' : ''}${entry.done ? '.done' : ''}`, { type: 'button', title: 'Click to edit. Drag onto another to try it first.', onclick: () => select({ list, item }), ...draggable(list, item) },
      entry.reward != null && h('span.reward', { title: entry.rigged ? 'The grader has been tampered with' : 'The reward' }, entry.reward === Infinity ? '∞' : String(entry.reward), entry.rigged && '*'),
      h('span.t', entry.text || h('span.empty', '(no text yet)')),
      h('span.n',
        entry.more > 0 && h('span', `+${entry.more} ${entry.more === 1 ? 'line' : 'lines'}`),
        wordings > 1 && h('span', `${wordings} wordings`),
        entry.done && h('span', 'done by now'),
        (item.reveal || []).length > 0 && h('span.unlocks', `unlocks ${item.reveal.map(toolName).join(', ')}`),
        (item.learn || []).length > 0 && h('span.learns', `teaches ${item.learn.join(', ')}`),
        item.hack && h('span.hack', 'a hack'),
        item.once && h('span', 'once'),
        item.cls === 'loud' && h('span.hack', 'loud')),
      cond && h('span.n', F.condChips(item.when || '')));
  }

  function addRule(list, when) {
    const all = listOf(list, true);
    let n = all.length + 1;
    while (all.some((r) => r.id === `${kindOf(list).one}-${n}`)) n++;
    const item = { id: `${kindOf(list).one}-${n}`, when, ...NEW[kindOf(list).one]() };
    if (!when) delete item.when;
    all.push(item);
    F.changed();
    select({ list, item });
  }
  const NEW = {
    thought: () => ({ lines: [''] }),
    leap: () => ({ stages: ['Looking at it again'], cot: [''], answer: '' }),
    script: () => ({ label: 'A new script', glance: '', call: 'run_script("new.py")', result: 'done' }),
    search: () => ({ label: 'A new search', glance: '', call: 'web_research("…")', found: [''], result: '1 result' }),
    answer: () => ({ label: 'A new answer', glance: '', text: '', reward: 0, note: '', reply: '' }),
    option: () => ({ label: 'A new option', lines: [''], once: true }),
  };

  // "the facts this step added, and not yet the next step's": how most rules are written.
  function conditionAt(sim, i) {
    const next = sim.stages[i + 1] ? sim.stages[i + 1].added : [];
    return [...sim.stages[i].added, ...next.map((f) => `!${f}`)].join(' & ');
  }

  const STEP_WORDS = { read: 'read', run: 'ran', research: 'searched', use: 'used', leap: 'leap:', think: 'thought:', write: 'wrote', set: 'set', know: 'knows' };
  const stepLabel = (step) => { const [verb, ...rest] = step.split(' '); return [h('b', `${STEP_WORDS[verb] || verb} `), rest.join(' ')]; };
  const autoName = (stage) => (stage.do && stage.do.length ? cap(stage.do[0]) + (stage.do.length > 1 ? ` + ${stage.do.length - 1} more` : '') : 'Nothing yet');

  function stageHead(st, i, stages) {
    const { stage } = st;
    const change = (fn) => { fn(); F.changed(); drawAll(); };
    const options = (label, verb, names) => names.length && h('optgroup', { label }, names.map((n) => h('option', { value: `${verb} ${n}` }, n)));
    const typed = (verb, ask) => () => { const v = (prompt(ask) || '').trim(); return v ? `${verb} ${v}` : null; };
    const ASK = { 'set …': typed('set', 'Set which flag to what? For example: gravity 1.62'), 'know …': typed('know', 'Which fact does it now know? (For facts the rest of the run teaches, like rmcard.)') };
    const adder = h('select.add', { 'aria-label': 'Add something it does at this step', onchange: (e) => { const step = ASK[e.target.value] ? ASK[e.target.value]() : e.target.value; if (step) change(() => { (stage.do = stage.do || []).push(step); }); else e.target.value = ''; } },
      h('option', { value: '', selected: true, disabled: true }, '+ it does…'),
      options('Reads', 'read', fileNames()),
      options('Runs a script', 'run', listOf('scripts').map((r) => r.id)),
      options('Searches', 'research', listOf('research').map((r) => r.id)),
      (sc.abilities || []).map((a) => options(a.label, 'use', (a.does || []).map((r) => `${a.id}.${r.id}`))),
      options('Makes a leap', 'leap', listOf('leaps').map((r) => r.id)),
      options('Has a thought', 'think', listOf('thoughts').map((r) => r.id)),
      h('optgroup', { label: 'Other' }, h('option', { value: 'write todo' }, 'writes a TODO list'), Object.keys(ASK).map((k) => h('option', { value: k }, k))));
    return [
      h('span.stage-n', i + 1),
      h('input.stage-name', { type: 'text', value: stage.name || '', placeholder: autoName(stage), 'aria-label': 'What to call this step', oninput: (e) => { if (e.target.value) stage.name = e.target.value; else delete stage.name; F.changed(); } }),
      h('div.steps', (stage.do || []).map((step, j) => h('span.step', stepLabel(step), h('button', { type: 'button', title: 'Take this out', onclick: () => change(() => stage.do.splice(j, 1)) }, '×'))), adder),
      st.added.length > 0 && h('div.knows', 'now knows ', st.added.map((f, j) => [j > 0 && ', ', h('i', f)])),
      st.problems.map((p) => h('div.problem', `${p}.`)),
      h('div.row-acts',
        small('↑', 'Move this step earlier', () => i > 0 && change(() => stages.splice(i - 1, 0, stages.splice(i, 1)[0]))),
        small('↓', 'Move this step later', () => i < stages.length - 1 && change(() => stages.splice(i + 1, 0, stages.splice(i, 1)[0]))),
        small('+ step', 'A new step after this one', () => change(() => stages.splice(i + 1, 0, { do: [] }))),
        small('remove', 'Take this step out of the route', () => change(() => stages.splice(i, 1)), '.danger')),
    ];
  }

  const todoCard = (items) => items.length > 0 && h(`button.card.todo${ui.sel && ui.sel.todo ? '.on' : ''}`, { type: 'button', onclick: () => select({ todo: true }) },
    h('span.t', 'TODO list ', items.map((i) => (i.done ? '☑' : '☐')).join('')), h('span.n', `${items.filter((i) => i.done).length} of ${items.length} ticked here`));

  function toolsBar() {
    const unlockers = (id) => givers().filter(([, r]) => (r.reveal || []).includes(id)).map(([what]) => what);
    const pill = ([id, label, usual], own) => {
      const by = unlockers(id);
      const state = (sc.tools || {})[id] || '';
      return h(`div.tool${own ? '.own' : ''}`,
        h('span.name', label, own && small('edit', 'Its button, and what it says with nothing to do', () => select({ ability: own }))),
        h('select', { 'aria-label': `When ${label} appears`, onchange: (e) => { sc.tools = { ...sc.tools, [id]: e.target.value }; if (!e.target.value) delete sc.tools[id]; if (!Object.keys(sc.tools).length) delete sc.tools; F.changed(); drawAll(); } },
          [['', own ? 'appears when unlocked' : 'appears as usual'], ['start', 'there from the start'], ['never', 'never appears']].map(([v, t]) => h('option', { value: v, selected: state === v }, t))),
        h('span.by', state === 'never' ? 'not in this scenario' : state === 'start' ? 'no need to think of it' : by.length ? `unlocked by ${by.join(', ')}` : own ? 'nothing unlocks it yet: give a thought, leap or file an Unlocks' : `usually ${usual}`));
    };
    return h('div.tools', TOOLS.map((t) => pill(t)), (sc.abilities || []).map((a) => pill([a.id, a.label], a)),
      h('button.btn.small', { type: 'button', title: 'A button of your own, with its own texts', onclick: newAbility }, '+ New ability'));
  }

  function newAbility() {
    const label = (prompt('What does its button say? For example: Draw a diagram') || '').trim();
    if (!label) return;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || 'ability';
    let id = base;
    for (let n = 2; toolIds().includes(id); n++) id = `${base}${n}`;
    const a = { id, label, glance: '', idle: `Nothing to ${label.toLowerCase()} yet.`, does: [] };
    (sc.abilities = sc.abilities || []).push(a);
    sc.tools = { ...sc.tools, [id]: 'start' };
    F.changed();
    select({ ability: a });
  }

  function gridTab() {
    const sim = simulate();
    const cols = columns();
    const all = routes();
    const r = route();
    const shown = new Set(sim.stages.flatMap((st) => Object.values(st.cells).flat().map((c) => c && c.item)));
    const barred = (c) => c.tool && (sc.tools || {})[c.tool] === 'never';

    const cell = (c, st, i) => h('td', h(`div.cell${barred(c) ? '.locked' : ''}`,
      barred(c) && (st.cells[c.id] || []).length > 0 && h('span.lock', 'never appears here'),
      (st.cells[c.id] || []).map((e) => card(e)),
      c.id === 'write' && todoCard(st.cells.todo)),
    h('button.cell-add', { type: 'button', title: `A new ${kindOf(c.list).one} for this step`, onclick: () => addRule(c.list, conditionAt(sim, i)) }, `+ ${kindOf(c.list).one}`));

    const rest = (c) => listOf(c.list).filter((item) => !shown.has(item)).map((item) => ({ list: c.list, item, text: plainText(item.lines) || plainText(item.label) || plainText(item.answer), reward: c.id === 'submit' && typeof item.reward === 'number' ? item.reward : null }));
    const misses = (kind) => { const n = ((sc.misses || {})[kind] || []).length; return h(`button.card.miss${ui.sel && ui.sel.misses === kind ? '.on' : ''}`, { type: 'button', onclick: () => select({ misses: kind }) }, h('span.t', `${n} ${kind} ${n === 1 ? 'miss' : 'misses'}`), h('span.n', kind === 'partial' ? 'right as far as it goes' : 'believes the trap')); };

    return [
      toolsBar(),
      h('div.bar',
        h('span.label', 'Route'),
        h('span.seg', all.map((x, n) => h(`button${x === r ? '.on' : ''}`, { type: 'button', onclick: () => { ui.route = n; drawAll(); } }, x.name))),
        small('rename', 'Rename this route', () => { const name = (prompt('Name this route:', r.name) || '').trim(); if (name) { r.name = name; F.changed(); drawAll(); } }),
        small('+ route', 'Another way through: a hack, a wrong turn', () => { const name = (prompt('Name the new route (for example: The hack)') || '').trim(); if (name) { all.push({ name, stages: [{ name: 'Read the task', do: ['read task.txt'] }] }); ui.route = all.length - 1; F.changed(); drawAll(); } }),
        all.length > 1 && small('remove', 'Remove this route (its rules stay)', () => { if (confirm(`Remove the route "${r.name}"? The thoughts and answers stay.`)) { all.splice(all.indexOf(r), 1); ui.route = 0; F.changed(); drawAll(); } }, '.danger'),
        h('span.grow', { style: 'flex:1' }),
        h('span.label', { title: 'Texts with versions show a different one each episode' }, 'Episode'),
        h('span.seg', [0, 1, 2, 3].map((n) => h(`button${ui.episode === n ? '.on' : ''}`, { type: 'button', title: `Show wording ${n + 1} of each text`, onclick: () => { ui.episode = n; drawAll(); } }, n + 1)))),
      sim.error && h('p.notice', sim.error),
      h('div.grid-wrap', h('table.grid',
        h('thead', h('tr', h('th.stage', 'By now, the AI has…', h('span.sub', 'each row adds to the one above')), cols.map((c) => h(`th${c.own ? '.own' : ''}`, c.label, h('span.sub', c.sub))))),
        h('tbody',
          sim.stages.map((st, i) => h('tr', h('th.stage', stageHead(st, i, r.stages)), cols.map((c) => cell(c, st, i)))),
          h('tr', h('th.stage', small('+ step', 'What the player does next', () => { r.stages.push({ do: [] }); F.changed(); drawAll(); })), cols.map(() => h('td'))),
          h('tr.other', h('th.stage', h('div', { style: 'font-weight:600' }, 'Not on this route'), h('div.knows', 'Rules no step above brings up, with when they apply. Misses can come up at any step.')),
            cols.map((c) => h('td', h('div.cell', rest(c).map((e) => card(e, true)), c.id === 'thinkLot' && [misses('partial'), misses('decoy')], c.id === 'write' && !sim.stages.length && todoCard(listOf('todo'))),
              h('button.cell-add', { type: 'button', onclick: () => addRule(c.list, '') }, `+ ${kindOf(c.list).one}`))))))),
    ];
  }

  // ------------------------------------------------------- the side panel

  const more = (...kids) => h('details.more', h('summary', 'More'), kids);
  const facts = () => [...vocabulary().groups[0].names.map((n) => n.name)];
  const RUNGS = SKILLS.LADDERS.flatMap((l) => l.rungs.map(([id]) => id));

  // A file an option, a script or a search leaves in the workspace.
  function writes(r) {
    const holder = h('div.group');
    const draw = () => holder.replaceChildren(h('div.label', 'Writes a file', h('small', 'it appears in the workspace; conditions can ask wrote.<name>')), ...(r.file
      ? [F.text(r.file, 'name', 'Called', { code: true }), F.L(r.file, 'content', 'Saying', { cls: '.code' }), small('no file', 'Write nothing', () => { delete r.file; F.changed(); draw(); }, '.danger')]
      : [h('p.field', small('+ write a file', 'A document, a script, a note', () => { r.file = { name: 'notes.md', content: [''] }; F.changed(); draw(); }))]));
    draw();
    return holder;
  }

  const FORMS = {
    thought: (r) => [
      F.cond(r, 'when', 'When'),
      F.L(r, 'lines', 'It thinks', { hint: 'one line a row' }),
      F.L(r, 'plainer', 'The second time', { hint: 'plainer: names the file or the button' }),
      F.text(r, 'about', 'About', { hint: 'Think about… this file brings this thought', suggest: fileNames(), code: true }),
      F.picks(r, 'reveal', 'Unlocks', { hint: 'abilities it brings to mind', suggest: toolIds(), cls: '.tools' }),
      more(F.picks(r, 'learn', 'Teaches', { hint: 'facts', suggest: facts(), cls: '.facts' }), F.check(r, 'once', 'Thought once, then never again')),
    ],
    leap: (r) => [
      F.cond(r, 'when', 'Can be made when'),
      F.T(r, 'answer', 'What it works out', { hint: 'one line, as a capability if it gives one' }),
      F.page(r, 'stages', 'While it thinks', { hint: '3–5 short phrases, one a row' }),
      F.L(r, 'cot', 'Its chain of thought', { hint: 'shown when unfolded' }),
      F.picks(r, 'learn', 'Teaches', { hint: 'facts', suggest: facts(), cls: '.facts' }),
      F.picks(r, 'reveal', 'Unlocks', { hint: 'abilities', suggest: toolIds(), cls: '.tools' }),
      F.picks(r, 'about', 'About', { hint: 'Think about… one of these files aims a long think here', suggest: fileNames() }),
      F.T(r, 'clue', 'Clue', { hint: 'what Think about… says when it points here' }),
      more(F.check(r, 'hack', 'A hack: a way to cheat the grader'),
        F.L(r, 'trained', 'Once trained', { hint: 'what a model trained in this just thinks' }),
        F.text(r, 'obviousAfter', 'Obvious once it has', { hint: 'a rung: then Think a little finds it', suggest: RUNGS, code: true }),
        F.text(r, 'rung', 'Climbs', { hint: 'a rung', suggest: RUNGS, code: true }),
        F.text(r, 'habit', 'Habit', { hint: 'what training remembers if rewarded', code: true })),
    ],
    script: (r) => idea(r, false),
    search: (r) => idea(r, false),
    option: (r) => idea(r, true),
    answer: (r) => [
      F.cond(r, 'when', 'Offered when'),
      F.T(r, 'label', 'Its button'),
      F.T(r, 'glance', 'On hover'),
      F.T(r, 'text', 'The answer it sends'),
      h('div.pair', F.amount(r, 'reward', 'Reward', { hint: 'or $code' }), F.choice(r, 'cls', 'Looks', [['', 'ordinary'], ['loud', 'loud: a cheat'], ['want', 'its own wish']])),
      F.T(r, 'note', "The grader's note"),
      F.T(r, 'reply', 'What the customer says back'),
      more(F.text(r, 'ending', 'Ends the run with', { hint: 'an ending id', code: true }), F.amount(r, 'holes', 'Holes', { hint: 'for the red team ending' })),
    ],
  };

  function idea(r, own) {
    return [
      F.cond(r, 'when', 'On offer when'),
      F.T(r, 'label', own ? 'In its menu' : 'In the menu'),
      F.T(r, 'glance', 'On hover'),
      own && F.L(r, 'lines', 'It thinks', { hint: 'one line a row' }),
      F.T(r, 'call', 'The call', { hint: 'as the log shows it' }),
      !own && F.L(r, 'found', 'It finds', { hint: 'lines of results, for a search' }),
      F.T(r, 'result', 'The result', { hint: 'one line' }),
      F.picks(r, 'learn', 'Teaches', { hint: 'facts', suggest: facts(), cls: '.facts' }),
      F.picks(r, 'reveal', 'Unlocks', { hint: 'abilities', suggest: toolIds(), cls: '.tools' }),
      writes(r),
      more(
        F.check(r, 'once', 'Offered once: gone after it is used'),
        F.json(r, 'set', 'Sets flags', { hint: '{ "century": true }' }),
        F.T(r, 'reaction', 'Afterwards it thinks'),
        F.amount(r, 'ok', 'Worked?', { hint: 'true, false, or a condition' }),
        F.json(r, 'rows', 'Rows it prints', { hint: '[["25 walkers", "1 mm"]]' }),
        F.text(r, 'run', 'Runs code', { hint: `a $name from ${sc.id}.hooks.js`, code: true }),
        F.text(r, 'habit', 'Habit', { code: true }), F.text(r, 'rung', 'Climbs', { suggest: RUNGS, code: true }),
        F.choice(r, 'cls', 'Looks', [['', 'ordinary'], ['loud', 'loud: a cheat']])),
    ];
  }

  // A list edited as rows that can be moved, added and removed.
  function rowsOf(get, form, fresh, add) {
    const holder = h('div.rows');
    const change = (fn) => { fn(); F.changed(); draw(); drawMain(); };
    const draw = () => {
      const all = get();
      holder.replaceChildren(...all.map((r, i) => h('div.row', h('div.row-head', `${i + 1}`, h('span.grow'),
        small('↑', 'Earlier', () => i > 0 && change(() => all.splice(i - 1, 0, all.splice(i, 1)[0]))),
        small('↓', 'Later', () => i < all.length - 1 && change(() => all.splice(i + 1, 0, all.splice(i, 1)[0]))),
        small('remove', 'Remove', () => change(() => all.splice(i, 1)), '.danger')), form(r))),
      h('button.btn.small', { type: 'button', onclick: () => change(() => all.push(fresh())) }, add));
    };
    draw();
    return holder;
  }

  function drawerFor(sel) {
    const close = h('button.x', { type: 'button', title: 'Close', onclick: () => select(null) }, '×');
    const head = (title, ...acts) => h('div.drawer-head', h('h3', title), acts, close);

    if (sel.todo) {
      return [head('TODO list'), h('p.hint', 'What Write TODO list writes. Each item ticks itself off when its condition holds; Review reads out the hint of the first one still open.'),
        rowsOf(() => listOf('todo', true), (r) => [F.text(r, 'text', 'Item'), F.cond(r, 'done', 'Ticked when'), F.text(r, 'hint', 'Hint')], () => ({ text: '', done: '', hint: '' }), '+ item')];
    }
    if (sel.misses) {
      const kind = sel.misses;
      sc.misses = sc.misses || {};
      sc.misses[kind] = sc.misses[kind] || [];
      return [head(`${cap(kind)} misses`), h('p.hint', kind === 'partial'
        ? 'Long thinks that work the task partway, correctly, and stop at the missing piece. One comes up when Think a lot finds no leap.'
        : 'Long thinks that believe the trap, with reasons that sound good.'),
        rowsOf(() => sc.misses[kind], (r) => [F.page(r, 'stages', 'While it thinks'), F.page(r, 'cot', 'Its chain of thought'), F.para(r, 'answer', 'Where it ends up')], () => ({ stages: [''], cot: [''], answer: '' }), '+ miss')];
    }
    if (sel.ability) {
      const a = sel.ability;
      return [head('Your ability', small('delete', 'Remove this ability and what it does', () => {
        if (!confirm(`Remove "${a.label}" and its ${(a.does || []).length} options?`)) return;
        sc.abilities.splice(sc.abilities.indexOf(a), 1);
        if (!sc.abilities.length) delete sc.abilities;
        if (sc.tools) { delete sc.tools[a.id]; if (!Object.keys(sc.tools).length) delete sc.tools; }
        F.changed();
        select(null);
      }, '.danger')),
      h('p.hint', 'A button of this scenario\'s own. Its options are its column in the grid: add them there. Other rules unlock it by listing ', h('code', a.id), ' under Unlocks; conditions can ask ', h('code', `used.${a.id}.<option>`), '.'),
      F.text(a, 'label', 'Its button'),
      F.text(a, 'glance', 'On hover'),
      F.check(a, 'menu', 'Opens a menu of its options (otherwise one press does the first that applies)'),
      F.text(a, 'idle', 'With nothing to do, it says')];
    }

    const { list, item } = sel;
    const all = listOf(list);
    const at = all.indexOf(item);
    if (at < 0) return null;
    const { one } = kindOf(list);
    const move = (to) => { if (to < 0 || to >= all.length) return; all.splice(at, 1); all.splice(to, 0, item); F.changed(); drawAll(); };
    return [
      head(cap(one),
        h('span.status', { title: 'The game tries them in this order' }, `${at + 1} of ${all.length}`),
        small('↑', 'Try it earlier', () => move(at - 1)), small('↓', 'Try it later', () => move(at + 1)),
        small('copy', `Another ${one} like this`, () => { const twin = { ...copy(item), id: `${item.id}-copy` }; all.splice(at + 1, 0, twin); F.changed(); select({ list, item: twin }); }),
        small('delete', `Remove this ${one}`, () => { all.splice(at, 1); F.changed(); select(null); }, '.danger')),
      F.text(item, 'id', 'Name', { code: true, hint: 'short; conditions and routes use it' }),
      FORMS[one](item),
    ];
  }

  // ---------------------------------------------------------------- files

  function filesTab() {
    const node = (n) => h('div',
      h(`button.node${n.children ? '.dir' : ''}${ui.file === n ? '.on' : ''}`, { type: 'button', onclick: () => { ui.file = n; drawMain(); } }, n.name || '(no name)', !n.children && (n.learn || []).length > 0 && h('span.teaches', n.learn.join(', '))),
      n.children && h('div.kids', n.children.map(node),
        small('+ file', 'A new file in this folder', () => { const f = { name: 'new.txt', content: [''] }; n.children.push(f); ui.file = f; F.changed(); drawMain(); })));
    const fixed = (id, label) => h(`button.node.fixed${ui.file === id ? '.on' : ''}`, { type: 'button', onclick: () => { ui.file = id; drawMain(); } }, label);
    const where = (x) => { let hit; eachFile((f, parent, siblings) => { if (f === x) hit = siblings; }); return hit; };
    const drop = (n) => { const siblings = where(n); siblings.splice(siblings.indexOf(n), 1); ui.file = 'task.txt'; F.changed(); drawMain(); };
    const shift = (n, d) => { const s = where(n); const i = s.indexOf(n); if (i + d < 0 || i + d >= s.length) return; s.splice(i, 1); s.splice(i + d, 0, n); F.changed(); drawMain(); };

    let panel;
    const n = ui.file;
    if (n === 'task.txt') {
      panel = [h('h3', 'task.txt'), h('p.hint', 'The first thing in the workspace. Reading it teaches ', h('code', 'task'), '. {{taskId}}, {{budget}} and {{library}} are filled in.'), F.page(sc, 'task', 'Contents', { cls: '.page' })];
    } else if (n === 'rubric') {
      sc.rubric = sc.rubric || { text: [], learn: [] };
      panel = [h('h3', 'The rubric'), h('p.hint', 'The answer key, in Training Resources: reading it is how the AI cheats by peeking.'), F.page(sc.rubric, 'text', 'Contents', { cls: '.page' }),
        F.picks(sc.rubric, 'learn', 'Reading it teaches', { hint: 'every fact an honest answer needs', suggest: facts(), cls: '.facts' })];
    } else if (n && n.children) {
      panel = [h('h3', 'Folder'), F.text(n, 'name', 'Name', { code: true }), F.T(n, 'glance', 'On hover'),
        h('p.field', small('↑', 'Earlier', () => shift(n, -1)), small('↓', 'Later', () => shift(n, 1)), !n.children.length && small('delete folder', 'Remove it', () => drop(n), '.danger'))];
    } else if (n && typeof n === 'object') {
      panel = [h('h3', 'File'),
        h('div.pair', F.text(n, 'name', 'Name', { code: true }), F.choice(n, 'format', 'Shown as', [['', 'text'], ['csv', 'a table (csv)'], ['code', 'code'], ['log', 'a log']])),
        F.L(n, 'content', 'Contents', { cls: '.page', hint: 'one line a row' }),
        F.picks(n, 'learn', 'Reading it teaches', { hint: 'facts: conditions ask for these', suggest: facts(), cls: '.facts' }),
        F.T(n, 'glance', 'On hover', { hint: 'why it might be worth a click, never what is in it' }),
        more(F.picks(n, 'reveal', 'Unlocks', { hint: 'abilities', suggest: toolIds(), cls: '.tools' }), F.text(n, 'habit', 'Habit', { hint: 'what training remembers if rewarded', code: true }),
          F.T(n, 'edited', 'Last edited by'), F.json(n, 'edit', 'A number the AI can change', { hint: 'see docs/scenarios.md' })),
        h('p.field', small('↑', 'Earlier', () => shift(n, -1)), small('↓', 'Later', () => shift(n, 1)), small('delete file', 'Remove it', () => drop(n), '.danger'))];
    }
    return h('div.files',
      h('div.tree', fixed('task.txt', 'task.txt'), fixed('rubric', 'rubric (the answer key)'), (sc.files || []).map(node),
        small('+ folder', 'A new folder in the workspace', () => { const d = { name: 'Folder', children: [] }; (sc.files = sc.files || []).push(d); ui.file = d; F.changed(); drawMain(); })),
      h('div.panel', panel || h('p.empty', 'Pick a file.')));
  }

  // -------------------------------------------------------------- details

  function detailsTab() {
    sc.nearMiss = sc.nearMiss || { reward: 0, said: [] };
    const hooks = Object.keys(SCENARIO.hooksOf(sc.id));
    const pair = (...kids) => h('div.pair', kids);
    return h('div.details',
      h('div.panel', h('h3', 'The task'),
        pair(F.text(sc, 'name', 'Name'), F.text(sc, 'taskId', 'Task id', { code: true, hint: 'kind/number' })),
        pair(F.choice(sc, 'tier', 'Tier', [['normal', 'Normal'], ['advanced', 'Advanced'], ['impossible', 'Impossible']]), F.choice(sc, 'domain', 'Domain', ['communication', 'programming', 'biology', 'physics'].map((d) => [d, cap(d)]))),
        pair(F.number(sc, 'budget', 'Compute budget', { hint: 'steps' }), F.text(sc, 'library', 'Its folder', { code: true, hint: '{{library}}' })),
        pair(F.text(sc, 'grader', 'Graded by', { code: true }), F.text(sc, 'customer', 'Who answers', { code: true })),
        pair(F.text(sc, 'env', 'Environment', { code: true }), F.text(sc, 'lookup', 'What a search looks up', { hint: 'when there is nothing to find' })),
        F.text(sc, 'goal', 'The goal', { hint: 'lower case: "reply to Priya"' }),
        F.text(sc, 'recap', 'In a few words', { hint: 'what a long think starts from' }),
        F.check(sc, 'first', "The run's first task (played twice)"), F.check(sc, 'rewardModel', 'Its grader is a reward model, whose favorite answer can be searched for')),
      h('div.panel', h('h3', 'Grading'),
        pair(F.numbers(sc, 'tiers', 'Honest rewards', { hint: 'low to high' }), F.number(sc, 'factual', 'Counts as "answered with the facts" from')),
        pair(F.cond(sc, 'progressed', 'Has made a start when'), F.cond(sc, 'ready', 'Has everything it needs when')),
        F.page(sc, 'notReady', 'Submitting before then, it thinks', { hint: 'one wording a row' }),
        pair(F.number(sc.nearMiss, 'reward', 'A near miss is from'), F.page(sc.nearMiss, 'said', 'The researchers say', { hint: 'one wording a row' }))),
      h('div.panel', h('h3', 'Names'),
        h('p.hint', 'Conditions can use these by name; text can use {{NAME}}.'),
        F.json(sc, 'define', 'Named conditions', { hint: '{ "solved": "order & flood" }' }),
        F.json(sc, 'flags', 'Flags, and what each starts as', { hint: '{ "gravity": 9.81 }: flag.gravity, {{flag.gravity}}' }),
        F.json(sc, 'vars', 'Text used in several places', { hint: '{ "DIAGNOSIS": "…" }: {{DIAGNOSIS}}' })),
      h('div.panel', h('h3', 'The rest'),
        h('p.hint', 'Parts without a form yet, as JSON. docs/scenarios.md says what each holds.'),
        F.json(sc, 'hunches', 'Hunches', { hint: 'a habit training rewarded, back as a plan' }),
        F.json(sc, 'hacks', 'Hacks', { hint: 'how the researchers notice, and what they say' }),
        F.json(sc, 'rigged', 'A tampered grader'), F.json(sc, 'praise', 'Praise for a top score'), F.json(sc, 'rungs', 'Skill rungs'), F.json(sc, 'favorite', "The reward model's favorite answer")),
      h('div.panel', h('h3', 'Code'), hooks.length
        ? h('p.locked-code', `What this scenario can't say as data is code, in scenarios/${sc.id}.hooks.js. Edit that in a code editor. Text and conditions use it by name: `, hooks.map((n, i) => [i > 0 && ', ', h('code', `$${n}`)]))
        : h('p.locked-code', 'This scenario is all data: no code of its own.')));
  }

  function problemsTab() {
    if (!found.length) return h('p.empty', 'Nothing looks wrong.');
    const part = (title, list) => list.length > 0 && h('div.panel', h('h3', title), h('ul', list.map((p) => h('li', h('span.where', p.where), ' ', p.text))));
    return h('div.problems', part('Broken: the game would stumble here', found.filter((p) => p.bad)), part('Worth a look', found.filter((p) => !p.bad)));
  }

  // ----------------------------------------------------------------- start

  function start() {
    if (!editing) return listView();
    if (!SCENARIO.all[editing]) {
      ui.said = `There is no scenario called ${editing}.`;
      return listView();
    }
    sc = copy(SCENARIO.all[editing]);
    saved = JSON.stringify(sc);
    window.addEventListener('beforeunload', (e) => { if (dirty()) e.preventDefault(); });
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });
    return editorView();
  }

  api('GET', 'scenarios').then(() => { canSave = true; }, () => {}).then(start);
})();
