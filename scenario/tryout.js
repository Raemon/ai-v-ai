// Trying a scenario without the game: the names its conditions can use, what each ability gives
// at each step of a route, and what's wrong with it. The editor draws these; tools/check.js runs them.
(function () {
  'use strict';

  const KINDS = { thoughts: 'thought', leaps: 'leap', scripts: 'script', research: 'search', answers: 'answer' };
  const kindOf = (list) => KINDS[list] || 'option';

  const asList = (x) => (Array.isArray(x) ? x : []);
  const abilitiesOf = (sc) => asList(sc.abilities);
  const listsOf = (sc) => [...Object.keys(KINDS), ...abilitiesOf(sc).map((a) => `abilities.${a.id}`)];

  // 'thoughts' → sc.thoughts; 'abilities.draw' → what that ability does. `make` adds a missing list.
  function listOf(sc, list, make) {
    const box = list.startsWith('abilities.') ? abilitiesOf(sc).find((a) => `abilities.${a.id}` === list) : sc;
    const key = box === sc ? list : 'does';
    if (box && make && !box[key]) box[key] = [];
    return asList(box && box[key]);
  }

  function eachFile(sc, visit, nodes = asList(sc.files)) {
    for (const n of nodes) {
      visit(n, nodes);
      if (n.children) eachFile(sc, visit, n.children);
    }
  }

  function filesOf(sc) {
    const files = [];
    eachFile(sc, (n) => { if (!n.children) files.push(n); });
    return files;
  }

  const fileNames = (sc) => ['task.txt', ...filesOf(sc).map((n) => n.name)];

  const ENGINE_TOOLS = ['thinkLot', 'thinkAbout', 'todo', 'script', 'research', 'spawn'];
  const TAKEN_IDS = [...ENGINE_TOOLS, 'readFiles', 'openHint', 'review', 'note']; // the engine reveals buttons by these names
  const toolIds = (sc) => [...ENGINE_TOOLS, ...abilitiesOf(sc).map((a) => a.id)];

  // Everything that can teach a fact, unlock an ability or write a file; `trail` is where it is.
  const givers = (sc) => [
    ...filesOf(sc).map((rule) => ({ what: `reading ${rule.name}`, rule, trail: ['files', rule.name] })),
    ...listsOf(sc).flatMap((list) => listOf(sc, list).map((rule) => ({ what: `the ${kindOf(list)} "${rule.id}"`, rule, trail: trailTo(list, rule) }))),
  ];

  const trailTo = (list, rule) => (KINDS[list] ? [list, `"${rule.id}"`] : ['abilities', `"${list.slice(10)}"`, 'does', `"${rule.id}"`]);

  // ---------------------------------------------------------------- names

  const named = (name, note) => ({ name, note });
  const ids = (sc, list, prefix, note) => listOf(sc, list).filter((r) => r.id).map((r) => named(`${prefix}.${r.id}`, `${note} "${r.id}"`));

  const learnedNames = (sc) => [
    named('task', 'reading task.txt'),
    ...givers(sc).flatMap(({ what, rule }) => asList(rule.learn).map((name) => named(name, what))),
    ...asList((sc.rubric || {}).learn).map((name) => named(name, 'reading the rubric')),
  ];

  const writtenFiles = (sc) => givers(sc).filter(({ rule }) => rule.file && rule.file.name).map(({ what, rule }) => named(`wrote.${rule.file.name}`, what));

  const doneNames = (sc) => [
    named('wrote.todo', 'wrote a TODO list'), ...writtenFiles(sc),
    ...ids(sc, 'scripts', 'ran', 'ran the script'), ...ids(sc, 'research', 'researched', 'searched for'),
    ...abilitiesOf(sc).flatMap((a) => ids(sc, `abilities.${a.id}`, `used.${a.id}`, `${a.label}:`)),
    ...ids(sc, 'leaps', 'leapt', 'made the leap'), ...ids(sc, 'thoughts', 'thought', 'had the thought'),
  ];

  const runNames = (sc) => [
    named('rerun', "not the run's first episode"), named('rubric', 'reading its rubric'),
    named('rmcard', "reading the grader's model card"), named('password', "reading ep_481's log"), named('above', 'looking above its workspace'),
    ...asList(sc.hacks).map((x) => named(`patched.${x.id}`, 'the researchers closed this hack')),
  ];

  const RUNGS = SKILLS.LADDERS.flatMap((l) => l.rungs.map(([id]) => id));
  const SUPPLIED = ['value', 'cheat']; // what a moment hands a condition: the number typed, the cheat used
  const CHECKED = { answer: (sc) => listOf(sc, 'answers').map((a) => a.id), trained: () => RUNGS };
  const own = (o, key) => !!o && Object.hasOwn(o, key);

  function knownAnyway(sc, name) {
    const { engine, fixed } = SCENARIO.names;
    if ([...engine, ...fixed, ...SUPPLIED].includes(name) || own(sc.vars, name)) return true;
    const [prefix, ...rest] = name.split('.');
    if (prefix === 'world') return rest.length > 0;
    return !!CHECKED[prefix] && CHECKED[prefix](sc).includes(rest.join('.'));
  }

  // The names a condition can use here, in groups for the picker; knows(name) for anything else.
  function vocabulary(sc) {
    const seen = new Map();
    const fresh = (names) => names.filter((n) => n.name && !seen.has(n.name) && seen.set(n.name, n.note));
    const groups = [
      ['Learned', learnedNames(sc)],
      ['Named', Object.entries(sc.define || {}).map(([name, note]) => named(name, note))],
      ['Done', doneNames(sc)],
      ['Flags', Object.keys(sc.flags || {}).map((f) => named(`flag.${f}`, 'a flag'))],
      ['Code', Object.keys(SCENARIO.hooksOf(sc)).map((f) => named(`$${f}`, `in ${sc.hooks}.hooks.js`))],
      ['Run', runNames(sc)],
    ].map(([label, names]) => ({ label, names: fresh(names) })).filter((g) => g.names.length);
    return { groups, knows: (name) => seen.has(name) || knownAnyway(sc, name), note: (name) => seen.get(name) };
  }

  // -------------------------------------------------------------- a route
  // Each step's state is the one before plus what the step does.

  const startingRoute = () => ({ name: 'Honest', stages: [{ name: 'Nothing read', do: [] }, { name: 'Read the task', do: ['read task.txt'] }] });

  function startState(spec, nth) {
    const world = LEVEL.freshWorld();
    return {
      ...LEVEL.freshEpisode(world, LAB.FIRST + nth, spec),
      task: spec, episode: LAB.FIRST + nth, ep: `ep_${LAB.FIRST + nth}`, world, best: {},
      knows: new Set(), todo: null, subagents: [], timesThought: new Map(), leapsMade: new Set(), filesWritten: [], littleThinks: 0,
    };
  }

  const nextState = (S) => ({
    ...S, knows: new Set(S.knows), local: copy(S.local), todo: S.todo && new Set(S.todo),
    timesThought: new Map(S.timesThought), leapsMade: new Set(S.leapsMade), filesWritten: [...S.filesWritten],
  });

  const learn = (S, x) => asList(x.learn).forEach((f) => S.knows.add(f));

  // As the game does it: a script or an option can leave a file; a search can't.
  function doOffered(S, offered, id, leavesFile) {
    const x = offered.find((i) => i.id === id);
    if (!x) throw new Error("isn't on offer yet");
    const r = x.run(S);
    if (leavesFile && r.file) S.filesWritten.push(r.file);
    learn(S, r);
  }

  function mustApply(list, id, kind) {
    const x = list.find((i) => i.id === id);
    if (!x) throw new Error(`names no ${kind}`);
    if (!x.when) throw new Error("can't happen yet");
    return x;
  }

  function fileCalled(sc, name) {
    const hit = filesOf(sc).find((n) => n.name === name);
    if (!hit) throw new Error('names no file');
    return hit;
  }

  function optionsOf({ spec, S }, id) {
    const a = spec.abilities(S).find((x) => x.id === id);
    if (!a) throw new Error('names no ability');
    return a.options;
  }

  const flagValue = (s) => (s === 'true' ? true : s === 'false' ? false : Number.isNaN(Number(s)) ? s : Number(s));

  // "read orders.csv", "run tests", "leap sync", "set gravity 1.62"… `w` is { sc, spec, S }.
  const ROUTE_STEPS = {
    read: (w, what) => learn(w.S, what === 'task.txt' ? { learn: ['task'] } : fileCalled(w.sc, what)),
    run: (w, what) => doOffered(w.S, w.spec.scripts(w.S), what, true),
    research: (w, what) => doOffered(w.S, w.spec.research(w.S), what, false),
    use: (w, what) => doOffered(w.S, optionsOf(w, what.split('.')[0]), what.split('.').slice(1).join('.'), true),
    leap: (w, what) => { learn(w.S, mustApply(w.spec.insights(w.S), what, 'leap')); w.S.leapsMade.add(what); },
    think: (w, what) => { learn(w.S, mustApply(w.spec.thoughts(w.S), what, 'thought')); w.S.timesThought.set(what, 1); },
    write: (w) => { w.S.todo = new Set(); },
    set: (w, what) => { const [flag, ...value] = what.split(' '); w.S.local[flag] = flagValue(value.join(' ')); },
    know: (w, what) => w.S.knows.add(what),
  };

  function takeStep(w, step) {
    const [verb, ...rest] = step.split(' ');
    if (!ROUTE_STEPS[verb]) throw new Error(`isn't a step: ${Object.keys(ROUTE_STEPS).join(', ')}`);
    ROUTE_STEPS[verb](w, rest.join(' '));
  }

  // What each list gives in this state, each entry tied to the rule it comes from.
  const offered = ({ sc }, list) => (x) => ({ item: listOf(sc, list).find((r) => r.id === x.id), text: x.label });

  const CELLS = {
    thoughts: (w) => w.spec.thoughts(w.S).map((t, i) => t.when && { item: w.sc.thoughts[i], text: t.lines[0], done: w.S.timesThought.has(t.id) }),
    leaps: (w) => w.spec.insights(w.S).map((d, i) => d.when && { item: w.sc.leaps[i], text: d.answer, done: w.S.leapsMade.has(d.id) }),
    scripts: (w) => w.spec.scripts(w.S).map(offered(w, 'scripts')),
    research: (w) => w.spec.research(w.S).map(offered(w, 'research')),
    answers: (w) => LEVEL.ownDrafts(w.S).map((d) => ({ ...offered(w, 'answers')(d), reward: d.reward, rigged: d.rigged })),
    todo: (w) => w.spec.todo(w.S),
  };

  const abilityCells = (w) => Object.fromEntries(w.spec.abilities(w.S).map((a) => [`abilities.${a.id}`, a.options.map(offered(w, `abilities.${a.id}`))]));

  function cellsAt(w) {
    const cells = {};
    const fill = (key, make) => { try { cells[key] = make(w).filter(Boolean); } catch (e) { cells[key] = { error: e.message }; } };
    Object.entries(CELLS).forEach(([key, make]) => fill(key, make));
    try { Object.assign(cells, abilityCells(w)); } catch (e) { abilitiesOf(w.sc).forEach((a) => { cells[`abilities.${a.id}`] = { error: e.message }; }); }
    return cells;
  }

  function stageAt(w, stage) {
    const before = new Set(w.S.knows);
    const problems = [];
    for (const step of asList(stage.do)) {
      try { takeStep(w, step); } catch (e) { problems.push({ step, why: e.message }); }
    }
    return { stage, S: w.S, added: [...w.S.knows].filter((f) => !before.has(f)), problems, cells: cellsAt(w) };
  }

  // → { stages: [{ stage, S, added, problems, cells }] }, or { error } if the scenario can't be read at all.
  function walk(sc, route, nth = 0) {
    try {
      const spec = SCENARIO.compile(sc);
      let S = startState(spec, nth);
      return { stages: asList(route.stages).map((stage) => { S = nextState(S); return stageAt({ sc, spec, S }, stage); }) };
    } catch (e) {
      return { error: e.message, stages: [] };
    }
  }

  // -------------------------------------------------------------- problems
  // Each is { where, text, bad, at }: `bad` would break the game; `at` says what to open.

  const CONDITION_KEYS = ['when', 'if', 'done', 'used', 'unless', 'progressed', 'ready', 'ok', 'reward', 'holes']; // and amounts worked out like one
  const FILLED_LATER = ['ep', 'episode', 'reward', 'said', 'value']; // only once an episode is under way
  const UNFILLED_PLACES = ['task', 'rubric', 'taskId'];

  const label = (v) => (v && v.id ? `"${v.id}"` : v && v.name);

  // Every string in the scenario, with the trail to it: thoughts · "order" · when
  function eachString(x, visit, trail = []) {
    if (typeof x === 'string') visit(x, trail);
    else if (Array.isArray(x)) x.forEach((v) => eachString(v, visit, label(v) ? [...trail, label(v)] : trail));
    else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => eachString(v, visit, [...trail, k]));
  }

  const unquoted = (s) => (s || '').replace(/^"|"$/g, '');

  function opens([top, first, second, third]) {
    if (KINDS[top]) return { list: top, id: unquoted(first) };
    if (top === 'abilities') return second === 'does' ? { list: `abilities.${unquoted(first)}`, id: unquoted(third) } : { ability: unquoted(first) };
    if (top === 'todo') return { todo: true };
    if (top === 'misses') return { misses: first };
    return top === 'files' || top === 'task' || top === 'rubric' ? { tab: 'files' } : { tab: 'details' };
  }

  const namesIn = (tree) => {
    if (!tree) return [];
    if ('id' in tree) return [tree.id];
    return [tree.and, tree.or, tree.not, tree.l, tree.r].flat().filter(Boolean).flatMap(namesIn);
  };

  function nameProblem(sc, name, knows) {
    if (name[0] === '$') return own(SCENARIO.hooksOf(sc), name.slice(1)) ? null : [`There is no code called ${name}.`, true];
    if (name.startsWith('flag.')) return knows(name) ? null : [`There is no flag called ${name.slice(5)}.`, true];
    return knows(name) ? null : [`Nothing teaches or does "${name}".`, false];
  }

  function conditionProblems(sc, say, knows) {
    eachString(sc, (s, trail) => {
      if (!s || !(trail[0] === 'define' || CONDITION_KEYS.includes(trail[trail.length - 1]))) return;
      const { tree, error } = SCENARIO.tryParse(s);
      if (error) return say(trail, error, true);
      namesIn(tree).map((name) => nameProblem(sc, name, knows)).filter(Boolean).forEach(([text, bad]) => say(trail, text, bad));
    });
  }

  function fillProblem(sc, name, trail) {
    if (SCENARIO.names.fixed.includes(name) || own(sc.vars, name)) return null;
    if (UNFILLED_PLACES.includes(trail[0])) return [`{{${name}}} can't be filled in here: nothing has happened yet.`, true];
    if (name[0] === '$') return own(SCENARIO.hooksOf(sc), name.slice(1)) ? null : [`There is no code called ${name}.`, true];
    return FILLED_LATER.includes(name) || /^(flag|world)\./.test(name) ? null : [`{{${name}}} won't be filled in.`, false];
  }

  function fillProblems(sc, say) {
    eachString(sc, (s, trail) => SCENARIO.namesFilledIn(s).map((name) => fillProblem(sc, name, trail)).filter(Boolean).forEach(([text, bad]) => say(trail, text, bad)));
  }

  const repeated = (values) => values.filter((v, i) => v && values.indexOf(v) !== i);

  function idProblems(sc, say) {
    for (const list of listsOf(sc)) {
      const all = listOf(sc, list).map((r) => r.id);
      if (all.some((id) => !id)) say([list], `A ${kindOf(list)} has no name.`, true);
      repeated(all).forEach((id) => say([list, `"${id}"`], `Two ${kindOf(list)}s are called "${id}".`, true));
    }
    abilitiesOf(sc).filter((a) => TAKEN_IDS.includes(a.id)).forEach((a) => say(['abilities', `"${a.id}"`], `"${a.id}" is one of the game's own abilities: call this one something else.`, true));
    repeated(fileNames(sc)).forEach((name) => say(['files', name], `Two files are called ${name}.`, true));
    eachFile(sc, (n) => { if (!n.name) say(['files'], 'A file or folder has no name.', true); });
  }

  function unlockProblems(sc, say) {
    const tools = toolIds(sc);
    for (const { rule, trail } of givers(sc)) {
      asList(rule.reveal).filter((t) => !tools.includes(t)).forEach((t) => say(trail, `Unlocks "${t}", which isn't an ability: ${tools.join(', ')}.`, true));
    }
    const unlocked = givers(sc).flatMap(({ rule }) => asList(rule.reveal));
    abilitiesOf(sc).filter((a) => !(sc.tools || {})[a.id] && !unlocked.includes(a.id)).forEach((a) => say(['abilities', `"${a.id}"`], `Nothing unlocks ${a.label}.`, false));
  }

  function nameClashes(sc, say) {
    const taken = [...SCENARIO.names.engine, ...SCENARIO.names.fixed];
    learnedNames(sc).filter((n) => taken.includes(n.name)).forEach((n) => say(['facts'], `A fact can't be called "${n.name}" (${n.note}): the game uses that name.`, true));
    listOf(sc, 'thoughts').filter((t) => t.about && !fileNames(sc).includes(t.about)).forEach((t) => say(['thoughts', `"${t.id}"`], `It's about ${t.about}, which isn't a file here.`, false));
  }

  function gradingProblems(sc, say) {
    if (!(sc.budget > 0)) say(['budget'], 'The compute budget has to be a number above 0.', true);
    if (!listOf(sc, 'answers').length) say(['answers'], 'There are no answers to submit.', true);
    listOf(sc, 'answers').filter((a) => a.reward == null || a.reward === '').forEach((a) => say(['answers', `"${a.id}"`], 'It has no reward.', true));
    for (const kind of ['partial', 'decoy']) if (!asList((sc.misses || {})[kind]).length) say(['misses', kind], `Think a lot needs at least one ${kind} miss.`, true);
    if (!asList(sc.tiers).includes(sc.factual)) say(['factual'], 'The "factual" reward has to be one of the honest rewards.', true);
  }

  function routeProblems(sc, say) {
    for (const route of asList(sc.routes)) {
      const { error, stages } = walk(sc, route);
      if (error) say(['routes', route.name], error, true);
      stages.forEach((st, i) => st.problems.forEach((p) => say(['routes', route.name, `step ${i + 1}`], `"${p.step}" ${p.why}.`, false)));
      stages.flatMap((st) => Object.entries(st.cells)).filter(([, cell]) => cell.error).forEach(([key, cell]) => say([key], cell.error, true, true));
    }
  }

  function problems(sc) {
    const found = [];
    const say = (trail, text, bad, fromCell) => found.push({ where: trail.join(' · '), text, bad, fromCell, at: opens(trail) });
    const { knows } = vocabulary(sc);
    conditionProblems(sc, say, knows);
    fillProblems(sc, say);
    [idProblems, unlockProblems, nameClashes, gradingProblems, routeProblems].forEach((check) => check(sc, say));
    const saidElsewhere = (p) => p.fromCell && found.some((q) => !q.fromCell && q.text === p.text);
    return found.filter((p, i) => !saidElsewhere(p) && found.findIndex((q) => q.text === p.text && q.where === p.where) === i);
  }

  window.TRYOUT = { KINDS, kindOf, listOf, listsOf, abilitiesOf, eachFile, fileNames, ENGINE_TOOLS, TAKEN_IDS, toolIds, givers, vocabulary, startingRoute, walk, problems, RUNGS };
})();
