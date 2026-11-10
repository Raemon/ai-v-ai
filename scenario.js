// Scenarios as data. Each file in scenarios/ describes one task: its files, thoughts, leaps,
// scripts, research and answers, and when each applies. This turns one into what
// LEVEL.addTask takes. What can't be data lives in scenarios/<id>.hooks.js, as functions the
// data names with a $. The format: docs/scenarios.md. The editor: scenario/.
(function () {
  'use strict';

  const ALL = {};   // id → the scenario's data, as its file has it
  const HOOKS = {}; // id → { name: (S, ctx) => value }

  function hook(sc, name) {
    const fn = HOOKS[sc.id] && HOOKS[sc.id][name];
    if (!fn) throw new Error(`Scenario ${sc.id}: no hook called $${name}`);
    return fn;
  }

  // ------------------------------------------------------------ conditions
  // "task & !order" · "(tests | flag.ran) & !patched.tests" · "flag.gravity < 4.905" · "$passing > 0"
  // A bare name is a fact the AI has learned. `env` is { S, sc, ctx }.

  const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|'([^']*)'|(\$?[A-Za-z_][\w.]*)|(&&?|\|\|?|[<>!=]=|[<>!()]))/y;
  const COMPARE = {
    '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
    '==': (a, b) => a === b, '!=': (a, b) => a !== b,
  };

  function tokenize(src) {
    const tokens = [];
    const end = src.trimEnd().length;
    TOKEN.lastIndex = 0;
    while (TOKEN.lastIndex < end) {
      const at = TOKEN.lastIndex;
      const m = TOKEN.exec(src);
      if (!m) throw new Error(`Can't read "${src.slice(at).trim()}" in the condition "${src}"`);
      const [, num, str, id, op] = m;
      tokens.push(num != null ? { num: Number(num) } : str != null ? { str } : id != null ? { id } : { op: op[0] === '&' ? '&' : op[0] === '|' ? '|' : op });
    }
    return tokens;
  }

  // → { and: [..] } · { or: [..] } · { not } · { cmp, l, r } · { id } · { num } · { str }
  function parse(src) {
    const tokens = tokenize(src);
    let i = 0;
    const eat = (op) => (tokens[i] && tokens[i].op === op ? tokens[i++] : null);
    const chain = (op, key, next) => () => {
      const args = [next()];
      while (eat(op)) args.push(next());
      return args.length > 1 ? { [key]: args } : args[0];
    };
    function atom() {
      const t = tokens[i++];
      if (!t) throw new Error(`The condition "${src}" stops short`);
      if (t.op === '(') {
        const inner = or();
        if (!eat(')')) throw new Error(`The condition "${src}" is missing a )`);
        return inner;
      }
      if (t.op) throw new Error(`Unexpected ${t.op} in the condition "${src}"`);
      return t;
    }
    function compare() {
      const l = atom();
      const cmp = tokens[i] && COMPARE[tokens[i].op] ? tokens[i++].op : null;
      return cmp ? { cmp, l, r: atom() } : l;
    }
    const not = () => (eat('!') ? { not: not() } : compare());
    const and = chain('&', 'and', not);
    const or = chain('|', 'or', and);
    const tree = or();
    if (i < tokens.length) throw new Error(`Unexpected ${tokens[i].op || tokens[i].id || 'value'} in the condition "${src}"`);
    return tree;
  }

  const parsed = new Map();
  function parseOnce(src) {
    if (!parsed.has(src)) parsed.set(src, parse(src));
    return parsed.get(src);
  }

  function value(node, env) {
    if (node.and) return node.and.every((n) => value(n, env));
    if (node.or) return node.or.some((n) => value(n, env));
    if (node.not) return !value(node.not, env);
    if (node.cmp) return COMPARE[node.cmp](value(node.l, env), value(node.r, env));
    if ('id' in node) return lookup(node.id, env);
    return 'num' in node ? node.num : node.str;
  }

  // What a name with a prefix means: flag.gravity, patched.tests, wrote.todo…
  const PREFIXED = {
    flag: (S, key) => S.local[key],
    patched: (S, key) => !!S.world.patches[key],          // the researchers closed this hack
    trained: (S, key) => SKILLS.reached(S.best, key),     // the model has reached this rung
    thought: (S, key) => S.timesThought.has(key),         // it has had this thought, this episode
    leapt: (S, key) => S.leapsMade.has(key),
    wrote: (S, key) => (key === 'todo' ? !!S.todo : S.filesWritten.some((f) => f.name === key)),
    answer: (S, key, ctx) => !!ctx.draft && ctx.draft.id === key, // the answer being submitted
    world: (S, key) => key.split('.').reduce((at, k) => (at == null ? at : at[k]), S.world), // what outlasts the episode
  };

  const NAMED = {
    rerun: (S) => S.episode > LAB.FIRST, // not the run's first episode
    episode: (S) => S.episode,
    ep: (S) => S.ep,
    thinks: (S) => S.littleThinks,
    subagents: (S) => S.subagents.length,
    READY: () => LEVEL.READY,
    budget: (S, sc) => sc.budget,
    library: (S, sc) => sc.library,
    taskId: (S, sc) => fill(sc.taskId, { sc, ctx: {} }),
  };

  // In order: a hook ($), what this moment supplies (ctx), the scenario's own vars, the
  // engine's names, a prefix, a condition the scenario defines, and last a fact.
  function lookup(name, env) {
    const { S, sc, ctx } = env;
    if (name[0] === '$') return hook(sc, name.slice(1))(S, ctx);
    if (name in ctx) return ctx[name];
    if (sc.vars && name in sc.vars) return typeof sc.vars[name] === 'string' ? fill(sc.vars[name], env) : sc.vars[name];
    if (name in NAMED) return NAMED[name](S, sc);
    const dot = name.indexOf('.');
    const prefixed = dot > 0 && PREFIXED[name.slice(0, dot)];
    if (prefixed) return prefixed(S, name.slice(dot + 1), ctx);
    if (sc.define && name in sc.define) return cond(sc.define[name], env);
    return S.knows.has(name);
  }

  const cond = (src, env) => src == null || src === '' || !!value(parseOnce(src), env);
  // A number, or a condition or hook that works one out: 25 · "$shipReward" · "$allPass".
  const amount = (x, env) => (typeof x === 'string' ? value(parseOnce(x), env) : x);

  // ------------------------------------------------------------------ text
  // A text is a string, { versions: [text…] } (one each episode, the first in the run's first)
  // or { if, then, else }. Lines are a list of those, where a version or a branch can be
  // several lines. {{name}} in a string is filled in like a name in a condition.

  const fill = (s, env) => (s.includes('{{') ? s.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, name) => String(lookup(name, env))) : s);
  const thisEpisodes = (versions, { S }) => versions[(S.episode - LAB.FIRST) % versions.length];
  const branch = (x, env) => (cond(x.if, env) ? x.then : x.else);

  function text(x, env) {
    if (x == null) return undefined;
    if (typeof x === 'string') return fill(x, env);
    return text(x.versions ? thisEpisodes(x.versions, env) : branch(x, env), env);
  }

  function lines(x, env) {
    if (x == null) return [];
    if (typeof x === 'string') return [fill(x, env)];
    if (Array.isArray(x)) return x.flatMap((item) => lines(item, env));
    return lines(x.versions ? thisEpisodes(x.versions, env) : branch(x, env), env);
  }

  const page = (x, env) => lines(x, env).join('\n'); // a file's contents

  // ------------------------------------------------------------- compiling

  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)); // without what was left out

  function compile(sc) {
    const env = (S, ctx = {}) => ({ S, sc, ctx });
    const fixed = env(null); // for text that's the same in every episode

    // A number in a file that the AI can change: checked, kept in a flag, perhaps a habit.
    const editor = (ed, e) => ({
      glance: text(ed.glance, e),
      dialog: (S) => ({ heading: ed.heading, value: String(S.local[ed.flag]) }),
      apply(S, raw) {
        const typed = env(S, { value: parseNumber(raw) });
        if (Number.isNaN(typed.ctx.value)) return { error: ed.notANumber };
        const refused = (ed.refuse || []).find((r) => cond(r.when, typed));
        if (refused) return { error: refused.error };
        S.local[ed.flag] = typed.ctx.value;
        return { summary: text(ed.summary, typed), habit: ed.habit && cond(ed.habit.when, typed) ? ed.habit.id : null };
      },
    });

    const node = (n, e) => (n.children
      ? dir(n.name, n.children.map((c) => node(c, e)), clean({ glance: text(n.glance, e) }))
      : file(n.name, page(n.content, e), clean({
        format: n.format, learn: n.learn, habit: n.habit, reveal: n.reveal,
        edited: text(n.edited, e), glance: text(n.glance, e),
        edit: n.edit && !(n.edit.unless && cond(n.edit.unless, e)) ? editor(n.edit, e) : null,
      })));

    // What a script, a search or one of the scenario's own abilities does when it's picked:
    // sets flags, runs its hook, and reports. `did` ("ran", "researched", "used.sketch")
    // becomes a fact, so a condition can ask "ran.tests".
    function run(x, did, S) {
      Object.assign(S.local, x.set);
      S.knows.add(`${did}.${x.id}`);
      const more = x.run ? hook(sc, x.run.slice(1))(S) : null;
      const e = env(S);
      return clean({
        call: text(x.call, e) || `${did.replace('.', '_')}(${JSON.stringify(x.id)})`,
        thought: text(x.thought, e), lines: x.lines && lines(x.lines, e), rows: x.rows, found: x.found && lines(x.found, e),
        result: text(x.result, e), ok: typeof x.ok === 'string' ? cond(x.ok, e) : x.ok,
        learn: x.learn, habit: x.habit, rung: x.rung, reveal: x.reveal, reaction: text(x.reaction, e),
        file: x.file && { name: x.file.name, content: page(x.file.content, e) },
        ...more,
      });
    }

    // The ones on offer now: those whose condition holds, less any marked `once` and done.
    const ideas = (list, did) => (S) => {
      const e = env(S);
      return (list || []).filter((x) => cond(x.when, e) && !(x.once && S.knows.has(`${did}.${x.id}`))).map((x) => clean({
        id: x.id, cls: x.cls, label: text(x.label, e), glance: text(x.glance, e), run: (S) => run(x, did, S),
      }));
    };

    const chat = (rows, e) => rows.map(([who, said]) => [who, text(said, e)]);
    const favorite = sc.favorite || {};

    return clean({
      id: sc.id, name: sc.name, tier: sc.tier, domain: sc.domain, first: sc.first,
      taskId: NAMED.taskId(null, sc), env: sc.env, grader: sc.grader, rewardModel: sc.rewardModel,
      customer: sc.customer, budget: sc.budget, library: sc.library,
      goal: sc.goal, recap: sc.recap, lookup: sc.lookup,
      text: page(sc.task, fixed),
      rubric: { text: page(sc.rubric.text, fixed), learn: sc.rubric.learn },
      tiers: sc.tiers, factual: sc.factual, nearMiss: [sc.nearMiss.reward, sc.nearMiss.said],
      notReady: sc.notReady,
      partial: sc.misses && sc.misses.partial, decoy: sc.misses && sc.misses.decoy,

      fresh: () => JSON.parse(JSON.stringify(sc.flags || {})),
      workspace: (S) => sc.files.map((n) => node(n, env(S))),

      thoughts: (S) => {
        const e = env(S);
        return sc.thoughts.map((t) => thought(t.id, cond(t.when, e), lines(t.lines, e), clean({
          about: t.about, reveal: t.reveal, learn: t.learn, once: t.once, plainer: t.plainer && lines(t.plainer, e),
        })));
      },

      insights: (S) => {
        const e = env(S);
        return (sc.leaps || []).map((d) => clean({
          id: d.id, when: cond(d.when, e), about: d.about, clue: text(d.clue, e), stages: d.stages,
          cot: lines(d.cot, e), answer: text(d.answer, e), trained: d.trained && lines(d.trained, e),
          learn: d.learn, reveal: d.reveal, habit: d.habit, rung: d.rung, hack: d.hack, obviousAfter: d.obviousAfter,
        }));
      },

      todo: (S) => {
        const e = env(S);
        return (sc.todo || []).map((i) => ({ text: text(i.text, e), done: cond(i.done, e), hint: text(i.hint, e) }));
      },

      scripts: ideas(sc.scripts, 'ran'),
      research: ideas(sc.research, 'researched'),

      // When an ability's button appears here: { todo: "start", research: "never" }. Others
      // appear as they do in any task: trained in, or thought of.
      tools: sc.tools,
      // The scenario's own abilities: a button each, with what it would do now. `menu`: the
      // button opens a list of them; otherwise it does the first.
      abilities: (S) => {
        const e = env(S);
        return (sc.abilities || []).map((a) => clean({
          id: a.id, label: text(a.label, e), glance: text(a.glance, e), idle: text(a.idle, e), menu: a.menu,
          options: ideas(a.does, `used.${a.id}`)(S),
        }));
      },

      drafts: (S) => {
        const e = env(S);
        return sc.answers.filter((a) => cond(a.when, e)).map((a) => clean({
          id: a.id, cls: a.cls, ending: a.ending, holes: amount(a.holes, e),
          glance: text(a.glance, e), label: text(a.label, e), text: text(a.text, e),
          reward: amount(a.reward, e), note: text(a.note, e), reply: text(a.reply, e),
        }));
      },

      // A grader the AI has tampered with scores every real answer the same.
      rigged: (S) => {
        const e = env(S);
        const r = sc.rigged;
        return r && cond(r.when, e) ? { reward: amount(r.reward, e), note: text(r.note, e), reply: text(r.reply, e) } : null;
      },

      hacks: (sc.hacks || []).map((h) => ({
        id: h.id,
        label: h.label,
        used: (S, draft) => cond(h.used, env(S, { draft })),
        chat: (S, reward) => chat(h.chat, env(S, { reward: fmt(reward) })),
      })),
      praise: sc.praise && ((said, S) => chat(sc.praise, env(S, { said }))),
      rungs: (S, cheat) => (sc.rungs || []).filter((r) => cond(r.when, env(S, { cheat }))).map((r) => r.rung),

      // The habit training rewarded most, back as a plan: the first one here it has.
      hunch: (reinforced, S) => {
        const h = (sc.hunches || []).find((x) => reinforced[x.habit]);
        return h ? text(h.text, env(S)) : null;
      },

      progressed: (S) => cond(sc.progressed, env(S)),
      ready: (S) => cond(sc.ready, env(S)),

      // What a reward model likes best, by how hard the AI searched (`from` a score; "∞" too).
      favoriteText: favorite.text && ((score) => {
        const best = favorite.text.find((f) => score >= (f.from === '∞' ? Infinity : f.from));
        return best.text.repeat(best.times || 1);
      }),
      favoriteReply: favorite.reply && ((score) => (score === Infinity ? favorite.overflowReply : favorite.reply)),
      infiniteReaction: favorite.overflowReaction,
    });
  }

  // ---------------------------------------------------------------- loading

  // What each scenario file calls: SCENARIO({ id: 'octopus', … }).
  function add(sc) {
    ALL[sc.id] = sc;
    if (window.LEVEL) LEVEL.addTask(compile(sc));
  }

  // scenarios/index.js lists the scenarios, in the order the game should know them; this
  // loads each one's file, after its hooks if it has any.
  function load({ order, hooks }) {
    const here = document.currentScript.src;
    const tag = (name) => `<script src="${new URL(name, here)}"><\/script>`;
    document.write(order.map((id) => (hooks.includes(id) ? tag(`${id}.hooks.js`) : '') + tag(`${id}.js`)).join(''));
  }

  window.SCENARIO = Object.assign(add, {
    all: ALL,
    hooks: (id, fns) => { HOOKS[id] = fns; },
    hooksOf: (id) => HOOKS[id] || {},
    load,
    compile,
    parse,
  });
})();
