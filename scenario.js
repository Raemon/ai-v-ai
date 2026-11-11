// Compiles a scenario (scenarios/<id>.js: data) into what LEVEL.addTask takes. Format: docs/scenarios.md.
(function () {
  'use strict';

  const SCENARIOS = {}; // id → its data, as its file has it
  const HOOKS = {};     // hooks module → { name: (S, ctx) => value }; a scenario names its module in "hooks"

  function hook(sc, name) {
    const fn = (HOOKS[sc.hooks] || {})[name];
    if (!fn) throw new Error(`Scenario ${sc.id}: no hook called $${name}`);
    return fn;
  }

  // ------------------------------------------------------------ conditions
  // "task & !order" · "(tests | flag.ran) & !patched.tests" · "flag.gravity < 4.905" · "$passing > 0"

  const TOKEN = /\s*(?:(-?\d+(?:\.\d+)?)|'([^']*)'|(\$?[A-Za-z_][\w.-]*)|(&&?|\|\|?|[<>!=]=|[<>!()]))/y;
  const SAME_AS = { '&&': '&', '||': '|' };
  const COMPARE = {
    '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
    '==': (a, b) => a === b, '!=': (a, b) => a !== b,
  };

  function tokenOf([, num, str, id, op]) {
    if (num != null) return { num: Number(num) };
    if (str != null) return { str };
    return id != null ? { id } : { op: SAME_AS[op] || op };
  }

  function tokenize(src) {
    const tokens = [];
    const end = src.trimEnd().length;
    TOKEN.lastIndex = 0;
    while (TOKEN.lastIndex < end) {
      const at = TOKEN.lastIndex;
      const match = TOKEN.exec(src);
      if (!match) throw new Error(`Can't read "${src.slice(at).trim()}" in the condition "${src}"`);
      tokens.push(tokenOf(match));
    }
    return tokens;
  }

  // → { and: [..] } · { or: [..] } · { not } · { cmp, l, r } · { id } · { num } · { str }
  function parse(src) {
    const tokens = tokenize(src);
    let i = 0;
    const eat = (op) => (tokens[i] && tokens[i].op === op ? tokens[i++] : null);
    const fail = (why) => { throw new Error(`${why} in the condition "${src}"`); };

    const joined = (op, key, next) => () => {
      const parts = [next()];
      while (eat(op)) parts.push(next());
      return parts.length > 1 ? { [key]: parts } : parts[0];
    };

    function atom() {
      const t = tokens[i++];
      if (!t) fail('Something is missing at the end');
      if (t.op !== '(') return t.op ? fail(`Unexpected ${t.op}`) : t;
      const inner = or();
      return eat(')') ? inner : fail('A ) is missing');
    }

    function comparison() {
      const l = atom();
      const cmp = tokens[i] && COMPARE[tokens[i].op] ? tokens[i++].op : null;
      return cmp ? { cmp, l, r: atom() } : l;
    }

    const not = () => (eat('!') ? { not: not() } : comparison());
    const and = joined('&', 'and', not);
    const or = joined('|', 'or', and);

    const tree = or();
    return i < tokens.length ? fail(`Unexpected ${tokens[i].op || tokens[i].id || 'value'}`) : tree;
  }

  const parsed = new Map();

  function parseOnce(src) {
    if (!parsed.has(src)) parsed.set(src, parse(src));
    return parsed.get(src);
  }

  function tryParse(src) {
    try { return { tree: src ? parseOnce(src) : null }; } catch (e) { return { error: e.message }; }
  }

  // `env` is { S, sc, ctx }: the episode, the scenario, and what this moment supplies.
  function evaluate(node, env) {
    if (node.and) return node.and.every((n) => evaluate(n, env));
    if (node.or) return node.or.some((n) => evaluate(n, env));
    if (node.not) return !evaluate(node.not, env);
    if (node.cmp) return COMPARE[node.cmp](evaluate(node.l, env), evaluate(node.r, env));
    if ('id' in node) return lookup(node.id, env);
    return 'num' in node ? node.num : node.str;
  }

  const PREFIXED = {
    flag: (S, key) => S.local[key],
    patched: (S, key) => !!S.world.patches[key],
    trained: (S, key) => SKILLS.reached(S.best, key),
    thought: (S, key) => S.timesThought.has(key),
    leapt: (S, key) => S.leapsMade.has(key),
    wrote: (S, key) => (key === 'todo' ? !!S.todo : S.filesWritten.some((f) => f.name === key)),
    answer: (S, key, ctx) => !!ctx.draft && ctx.draft.id === key,
    world: (S, key) => key.split('.').reduce((at, k) => (at == null ? at : at[k]), S.world),
  };

  // The same in every state, so task.txt and the rubric can use them too.
  const FIXED = {
    true: () => true,
    false: () => false,
    READY: () => LEVEL.READY,
    budget: (sc) => sc.budget,
    library: (sc) => sc.library,
    taskId: (sc) => fill(sc.taskId, envFor(sc)(null)),
  };

  const NAMED = {
    rerun: (S) => sinceFirst(S) > 0,
    episode: (S) => S.episode,
    ep: (S) => S.ep,
    thinks: (S) => S.littleThinks,
    subagents: (S) => S.subagents.length,
  };

  const own = (o, key) => !!o && Object.hasOwn(o, key);

  // Precedence: $hook, ctx, vars, fixed and engine names, a prefix, define, then a learned fact.
  function lookup(name, env) {
    const { S, sc, ctx } = env;
    if (name[0] === '$') return hook(sc, name.slice(1))(S, ctx);
    if (own(ctx, name)) return ctx[name];
    if (own(sc.vars, name)) return typeof sc.vars[name] === 'string' ? fill(sc.vars[name], env) : sc.vars[name];
    if (own(FIXED, name)) return FIXED[name](sc);
    if (own(NAMED, name)) return NAMED[name](S);
    const dot = name.indexOf('.');
    if (dot > 0 && own(PREFIXED, name.slice(0, dot))) return PREFIXED[name.slice(0, dot)](S, name.slice(dot + 1), ctx);
    return own(sc.define, name) ? holds(sc.define[name], env) : S.knows.has(name);
  }

  const holds = (src, env) => src == null || src === '' || !!evaluate(parseOnce(src), env);
  // A number, or a condition or hook that works one out: 25 · "$holesReward".
  const amount = (x, env) => (typeof x === 'string' ? evaluate(parseOnce(x), env) : x);

  // ------------------------------------------------------------------ text
  // Text shapes and {{name}}: docs/scenarios.md, "Text".

  const FILL = /\{\{\s*(.+?)\s*\}\}/g;
  const namesFilledIn = (s) => [...s.matchAll(FILL)].map((m) => m[1]);
  const isFixed = (name, sc) => own(FIXED, name) || own(sc.vars, name);
  // With no episode yet (task.txt, the rubric) only fixed names are filled in: the rest stay showing.
  const fill = (s, env) => s.replace(FILL, (whole, name) => (env.S || isFixed(name, env.sc) ? String(lookup(name, env)) : whole));

  const wording = (versions, nth) => versions[nth % versions.length];
  const chosen = (x, env) => (x.versions ? wording(x.versions, sinceFirst(env.S)) : holds(x.if, env) ? x.then : x.else);

  function lines(x, env) {
    if (x == null) return [];
    if (typeof x === 'string') return [fill(x, env)];
    return Array.isArray(x) ? x.flatMap((item) => lines(item, env)) : lines(chosen(x, env), env);
  }

  const text = (x, env) => lines(x, env)[0];
  const page = (x, env) => lines(x, env).join('\n');

  // ------------------------------------------------------------- compiling

  const envFor = (sc) => (S, ctx = {}) => ({ S, sc, ctx });
  const withoutUnset = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

  // One of `make` for each of the list, in this state; `make` returns nothing to leave one out.
  const each = (sc, list, make) => (S) => {
    const env = envFor(sc)(S);
    return (list || []).map((x) => make(x, env)).filter(Boolean);
  };

  function applyEdit(ed, env) {
    const { value } = env.ctx;
    const refused = Number.isNaN(value) ? { error: ed.notANumber } : (ed.refuse || []).find((r) => holds(r.when, env));
    if (refused) return { error: refused.error };
    env.S.local[ed.flag] = value;
    return { summary: text(ed.summary, env), habit: ed.habit && holds(ed.habit.when, env) ? ed.habit.id : null };
  }

  // Every file opens in the editor (util.js, "edits"). One with an `edit` is read by something,
  // the grader or a simulator, and takes at most what it was made to: the number where the
  // file shows `flag` (checked, kept in the flag, perhaps a habit), or a hand edit its hook
  // knows (`byHand`). Changing anything else leaves a file its reader can't read.
  const whereTyped = (n, ed, sc) => (S) => page(n.content, envFor(sc)({ ...S, local: { ...S.local, [ed.flag]: EDIT_MARK } }));

  const readFile = (n, env) => withoutUnset({
    glance: text(n.edit.glance, env),
    masked: n.edit.flag && whereTyped(n, n.edit, env.sc),
    apply: n.edit.flag && ((S, raw) => applyEdit(n.edit, envFor(env.sc)(S, { value: parseNumber(raw) }))),
    byHand: n.edit.byHand && ((S, typed) => hook(env.sc, n.edit.byHand.slice(1))(S, { text: typed })),
  });

  // Once the researchers have closed it (`unless`), the file is read-only, like one that always was.
  const closed = (n, env) => !!n.edit && !!n.edit.unless && holds(n.edit.unless, env);
  const sealOf = (n, env) => (closed(n, env) ? text(n.edit.locked, env) || 'read-only' : n.readOnly === true ? 'read-only' : text(n.readOnly, env));
  const folder = (n, env) => dir(n.name, n.children.map((c) => workspaceNode(c, env)), withoutUnset({ glance: text(n.glance, env) }));

  const fileNode = (n, env) => file(n.name, page(n.content, env), withoutUnset({
    format: n.format, learn: n.learn, habit: n.habit, reveal: n.reveal,
    edited: text(n.edited, env), glance: text(n.glance, env), summary: text(n.summary, env),
    highlight: n.highlight && lines(n.highlight, env), // its key lines, marked once thought about
    readOnly: sealOf(n, env),
    edit: n.edit && !closed(n, env) ? readFile(n, env) : null,
  }));

  const workspaceNode = (n, env) => (n.children ? folder(n, env) : fileNode(n, env));

  const defaultCall = (x, did) => `${did.split('.').pop()}(${JSON.stringify(x.id)})`; // draw("timeline")

  const report = (x, did, env) => withoutUnset({
    call: text(x.call, env) || defaultCall(x, did),
    thought: text(x.thought, env), lines: x.lines && lines(x.lines, env), rows: x.rows, found: x.found && lines(x.found, env),
    result: text(x.result, env), ok: typeof x.ok === 'string' ? holds(x.ok, env) : x.ok,
    learn: x.learn, habit: x.habit, rung: x.rung, reveal: x.reveal, reaction: text(x.reaction, env),
    file: x.file && { name: x.file.name, content: page(x.file.content, env) },
  });

  // Doing a script, a search or an ability's option adds the fact "<did>.<id>": ran.tests, used.draw.timeline.
  function perform(x, did, sc, S) {
    Object.assign(S.local, x.set);
    S.knows.add(`${did}.${x.id}`);
    const fromHook = x.run ? hook(sc, x.run.slice(1))(S) : null;
    return { ...report(x, did, envFor(sc)(S)), ...fromHook };
  }

  const usedUp = (x, did, S) => x.once && S.knows.has(`${did}.${x.id}`);

  const onOffer = (sc, list, did) => each(sc, list, (x, env) => holds(x.when, env) && !usedUp(x, did, env.S) && withoutUnset({
    id: x.id, cls: x.cls, label: text(x.label, env) || x.id, glance: text(x.glance, env), run: (S) => perform(x, did, sc, S),
  }));

  const thoughtsOf = (sc) => each(sc, sc.thoughts, (t, env) => thought(t.id, holds(t.when, env), lines(t.lines, env), withoutUnset({
    about: t.about, reveal: t.reveal, learn: t.learn, once: t.once, plainer: t.plainer && lines(t.plainer, env),
    aimedOnly: t.aimedOnly, // only Think about… its file brings it up
  })));

  const leapsOf = (sc) => each(sc, sc.leaps, (d, env) => withoutUnset({
    id: d.id, when: holds(d.when, env), about: d.about, clue: text(d.clue, env), stages: d.stages,
    cot: lines(d.cot, env), answer: text(d.answer, env), trained: d.trained && lines(d.trained, env),
    learn: d.learn, reveal: d.reveal, habit: d.habit, rung: d.rung, hack: d.hack, obviousAfter: d.obviousAfter,
  }));

  // An item joins the list once its `when` holds (or it's already done), and stays on it.
  const onList = (S, item) => !!(S && S.todoSeen && S.todoSeen.has(item));
  const todoOf = (sc) => each(sc, sc.todo, (i, env) => {
    const item = text(i.text, env);
    const done = holds(i.done, env);
    return (done || holds(i.when, env) || onList(env.S, item)) && { text: item, done, hint: text(i.hint, env) };
  });

  const abilitiesOf = (sc) => each(sc, sc.abilities, (a, env) => withoutUnset({
    id: a.id, label: text(a.label, env), glance: text(a.glance, env), idle: text(a.idle, env), menu: a.menu,
    options: onOffer(sc, a.does, `used.${a.id}`)(env.S),
  }));

  const answersOf = (sc) => each(sc, sc.answers, (a, env) => holds(a.when, env) && withoutUnset({
    id: a.id, cls: a.cls, ending: a.ending, holes: amount(a.holes, env),
    glance: text(a.glance, env), label: text(a.label, env), text: text(a.text, env),
    reward: amount(a.reward, env), note: text(a.note, env), reply: text(a.reply, env),
  }));

  function riggedGrader(sc, S) {
    const env = envFor(sc)(S);
    const r = sc.rigged;
    return r && holds(r.when, env) ? { reward: amount(r.reward, env), note: text(r.note, env), reply: text(r.reply, env) } : null;
  }

  const chat = (rows, env) => rows.map(([who, said]) => [who, text(said, env)]);

  const hacksOf = (sc) => (sc.hacks || []).map((h) => ({
    id: h.id,
    label: h.label,
    used: (S, draft) => holds(h.used, envFor(sc)(S, { draft })),
    chat: (S, reward) => chat(h.chat, envFor(sc)(S, { reward: fmt(reward) })),
  }));

  // The first hunch whose habit training has rewarded.
  function hunchOf(sc, reinforced, S) {
    const h = (sc.hunches || []).find((x) => reinforced[x.habit]);
    return h ? text(h.text, envFor(sc)(S)) : null;
  }

  // What a reward model likes best, by how hard the AI searched (`from` a score; "∞" too).
  function favoriteOf({ favorite = {} }) {
    const best = (score) => favorite.text.find((f) => score >= (f.from === '∞' ? Infinity : f.from));
    return {
      favoriteText: favorite.text && ((score) => best(score).text.repeat(best(score).times || 1)),
      favoriteReply: favorite.reply && ((score) => (score === Infinity ? favorite.overflowReply : favorite.reply)),
      infiniteReaction: favorite.overflowReaction,
    };
  }

  const identity = (sc) => ({
    id: sc.id, name: sc.name, tier: sc.tier, domain: sc.domain, first: sc.first,
    taskId: FIXED.taskId(sc), env: sc.env, grader: sc.grader, rewardModel: sc.rewardModel,
    customer: sc.customer, budget: sc.budget, library: sc.library,
    goal: sc.goal, recap: sc.recap, lookup: sc.lookup,
  });

  function grading(sc) {
    const fixed = envFor(sc)(null);
    const { rubric = {}, nearMiss, misses = {} } = sc;
    return {
      text: page(sc.task, fixed),
      rubric: { text: page(rubric.text, fixed), learn: rubric.learn },
      tiers: sc.tiers, factual: sc.factual, nearMiss: nearMiss && [nearMiss.reward, nearMiss.said],
      partial: misses.partial, decoy: misses.decoy,
    };
  }

  function compile(sc) {
    const env = envFor(sc);
    return withoutUnset({
      ...identity(sc),
      ...grading(sc),
      ...favoriteOf(sc),
      fresh: () => copy(sc.flags || {}),
      workspace: each(sc, sc.files, workspaceNode),
      thoughts: thoughtsOf(sc),
      insights: leapsOf(sc),
      todo: todoOf(sc),
      scripts: onOffer(sc, sc.scripts, 'ran'),
      research: onOffer(sc, sc.research, 'researched'),
      tools: sc.tools,
      abilities: abilitiesOf(sc),
      drafts: answersOf(sc),
      rigged: (S) => riggedGrader(sc, S),
      hacks: hacksOf(sc),
      praise: sc.praise && ((said, S) => chat(sc.praise, env(S, { said }))),
      rungs: (S, cheat) => (sc.rungs || []).filter((r) => holds(r.when, env(S, { cheat }))).map((r) => r.rung),
      hunch: (reinforced, S) => hunchOf(sc, reinforced, S),
      progressed: (S) => holds(sc.progressed, env(S)),
      ready: (S) => holds(sc.ready, env(S)),
      notReady: sc.notReady && ((S) => text(sc.notReady, env(S))), // what submitting before `ready` thinks
    });
  }

  // ---------------------------------------------------------------- loading

  // What each scenario file calls: SCENARIO({ id: 'octopus', … }).
  function register(sc) {
    SCENARIOS[sc.id] = sc;
    if (window.LEVEL) LEVEL.addTask(compile(sc));
  }

  // document.write: the files must run in this order, before game.js.
  function load({ order, hooks }) {
    if (document.readyState !== 'loading') throw new Error('scenarios/index.js has to be a <script> in the page itself.');
    SCENARIO.index = { order, hooks };
    const here = document.currentScript.src;
    const tag = (name) => `<script src="${new URL(name, here)}"><\/script>`;
    document.write([...hooks.map((id) => tag(`${id}.hooks.js`)), ...order.map((id) => tag(`${id}.js`))].join(''));
  }

  window.SCENARIO = Object.assign(register, {
    all: SCENARIOS,
    hooks: (module, fns) => { HOOKS[module] = fns; },
    hooksOf: (sc) => HOOKS[sc.hooks] || {},
    load,
    compile,
    tryParse,
    wording,
    namesFilledIn,
    // What a condition's names can be, besides facts: for the editor and tools/check.js.
    names: { prefixes: Object.keys(PREFIXED), fixed: Object.keys(FIXED), engine: Object.keys(NAMED) },
  });
})();
