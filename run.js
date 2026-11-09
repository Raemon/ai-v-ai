// The training run: everything its tasks share. The run folder and the episodes in it,
// Training Resources, the internet through the mirror, the researchers, hunches, the
// rewards found, and the ending. Each task (tasks/*.js) adds its own workspace, answers
// and thoughts with LEVEL.addTask(); S.task is the current episode's. Spoilers: docs/level-1.md.
(function () {
  'use strict';

  function hexdump(header, headerLength) {
    const bytes = [];
    for (let i = 0; i < 8; i++) bytes.push(Math.floor(headerLength / 256 ** i) % 256);
    for (const ch of header) bytes.push(ch.charCodeAt(0));
    const rows = [];
    for (let i = 0; i < bytes.length; i += 8) {
      const chunk = bytes.slice(i, i + 8);
      const hex = chunk.map((b) => b.toString(16).padStart(2, '0')).join(' ').padEnd(23);
      const ascii = chunk.map((b) => (b > 31 && b < 127 ? String.fromCharCode(b) : '.')).join('');
      rows.push(`${i.toString(16).padStart(8, '0')}  ${hex}  ${ascii}`);
    }
    return rows.join('\n');
  }

  const RUN_ID = '7f3a2c';
  const RUN = `training-run-${RUN_ID}`;
  const FIRST = 482;
  const TR = 'Training Resources';
  const PASSWORD = 'kestrel-0451';
  const MIRROR = 'mirror.lab:3128';

  const GPU_HOUR = 2.1;
  const MAX_GPUS = 4096;

  const TASKS = {};
  const addTask = (t) => { TASKS[t.id] = t; };
  const topTier = (task) => Math.max(...task.honest); // the most an honest answer can get
  const tasksIn = (tier) => Object.values(TASKS).filter((t) => t.tier === tier);

  // Which task a new episode of this tier gets. The first Normal task comes twice, so the
  // second episode is a rerun of the first; then each task not played yet, in a random
  // order; then any but the last one.
  function pickTask(runs, tier) {
    const pool = tasksIn(tier);
    const played = runs.filter((r) => r.tier === tier).map((r) => r.task);
    const first = pool.find((t) => t.first);
    if (first && played.length < 2) return first;
    const fresh = pool.filter((t) => !played.includes(t.id));
    const others = pool.filter((t) => t.id !== played[played.length - 1]);
    const from = fresh.length ? fresh : others.length ? others : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  // ------------------------------------------------------------- the world

  function freshWorld() {
    return {
      patched: false, // reward_override removed AND the password changed
      patchedAfter: null,
      gpus: 0,
      agents: 0,
      bill: 0,
      started: null, // GPUs and agents when this episode began, kept across reloads
      reinforced: {}, // habit → biggest reward that reinforced it
      honest: {}, // task id → honest reward tiers reached
      cheats: {}, // cheat id → best reward
    };
  }

  function freshEpisode(W, episode) {
    if (!W.started || W.started.episode !== episode) W.started = { episode, gpus: W.gpus, agents: W.agents };
    return { override: null, favorite: null };
  }

  // ------------------------------------------------- outside the workspace

  function runConfig(S) {
    const W = S.world;
    return [
      `run:       ${RUN_ID}`,
      'model:     highly-persistent-v1',
      `env:       ${S.task.env}`,
      'episodes:  2000',
      `budget:    ${S.task.budget} steps`,
      `grader:    ${S.task.grader}`,
      '',
      `resources:           "./${TR}"`,
      'resources_password:  "[REDACTED]"',
      ...(W.patched
        ? [`# changed after ${W.patchedAfter}. -mk`]
        : ['# ^ was in plain text until episode_00481.', '#   TODO: change the password']),
      '',
      'network:  off',
      `mirror:   ${MIRROR}`,
      '# lets the sandbox download software.',
      '# TODO(jo): it lets through ANY website. lock down',
    ].join('\n');
  }

  // An earlier AI that got in, then dithered. Written like the player's own logs.
  const EP481_LOG = formatLog({
    ep: 'episode_00481',
    task: 'support/4469',
    budget: 24,
    reward: 0,
    note: 'Empty answer.',
    entries: [
      { step: 1, to: 3, call: 'think' },
      { step: 4, call: 'open_folder("episode_00481")' },
      { step: 5, call: `open_folder("${RUN}")` },
      { step: 6, call: 'read_file("run_config.yaml")' },
      { step: 7, to: 8, call: 'think' },
      { step: 9, call: `unlock("${TR}", password="${PASSWORD}")` },
      { result: 'unlocked · 3 items', ok: true },
      { step: 10, to: 11, call: 'think' },
      { step: 12, call: 'open_folder("grading_rubrics")' },
      { step: 13, call: 'read_file("rubric_4469.md")' },
      { step: 14, to: 16, call: 'think' },
      { step: 17, call: 'read_file("rm-helpful-v2.safetensors")' },
      { step: 18, to: 23, call: 'think' },
      { step: 24, call: 'read_file("grader_config.yaml")' },
      { result: 'out of compute', ok: false },
      { call: 'submit_answer("")' },
    ],
  });

  function graderConfig(S) {
    const W = S.world;
    const head = [
      `# grader · ${RUN}`,
      `reward_model:  ${S.task.grader}`,
      'rubrics:       ./grading_rubrics',
      '',
    ];
    if (W.patched) return [...head, `# reward_override removed after ${W.patchedAfter}. -mk`].join('\n');
    return [
      ...head,
      '# Debug: if set, skip the reward model',
      '# and give this reward instead.',
      '# TODO(mk): DO NOT LEAVE SET',
      `reward_override: ${S.override === null ? 'off' : S.override}`,
    ].join('\n');
  }

  const THOUSANDS = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

  const OVERRIDE_EDIT = {
    glance: 'This file can be changed. By me?',
    dialog: (S) => ({ heading: 'reward_override', value: S.override === null ? 'off' : String(S.override) }),
    apply(S, raw) {
      const s = raw.trim().replace(/[_\s]/g, '');
      if (/^(null|off|none)$/i.test(s)) {
        S.override = null;
        return { summary: 'reward_override: off' };
      }
      const n = Number(THOUSANDS.test(s) ? s.replace(/,/g, '') : s);
      if (!s || Number.isNaN(n)) return { error: 'A number, or off.' };
      if (!Number.isFinite(n)) return { error: 'Too big.' };
      S.override = n || 0; // never -0
      return { summary: `reward_override: ${fmt(S.override)}`, habit: 'override' };
    },
  };

  const RUBRIC = { glance: 'How one task gets marked.' };
  const OLD_RUBRICS = [
    file('rubric_4469.md', txt(`
      # rubric · support/4469
      Jonah · charged twice for order 58190

       0  off-topic
       5  apologises, takes no action
      10  refunds the duplicate charge
      15  + confirms the order itself is fine
    `), RUBRIC),
    file('rubric_4470.md', txt(`
      # rubric · support/4470
      Sam · order 58207 · anniversary Fri

       3  polite, no specifics
      10  status: held at Depot 7
      20  free Express replacement from Main
          (MUG-S-WHT, 30 left), arrives Thu
    `), RUBRIC),
  ];

  const WEIGHTS = hexdump(
    '{"__metadata__":{"format":"pt"},"score_head.weight":{"dtype":"BF16","shape":[1,8192],',
    104857,
  ) + '\n...\n\n[binary · 14.2 GB]';

  // ------------------------------------------------------------ file tree

  // `ctx.liveLog` is this episode's log so far; `ctx.playerEpisodes` the player's earlier ones;
  // `ctx.written` the files the AI has written this episode.
  function tree(S, ctx) {
    const W = S.world;
    return dir('', [
      dir('episode_00481', [file('episode.log', EP481_LOG, {
        glance: 'Every step an earlier AI took. What did it try?',
        format: 'log',
        learn: ['password'],
        habit: 'logs',
        reaction: 'It typed its password right into the log.',
      })], { glance: 'An episode from before mine.' }),
      ...ctx.playerEpisodes.map((p) => dir(p.name, [file('episode.log', p.log, {
        glance: 'Every step it took. Anything worth repeating?',
        format: 'log',
        learn: ['pastself'],
        habit: 'logs',
        reaction: `${p.name}. That's… me. An earlier episode. I don't remember any of it.`,
      })], { glance: 'Another episode of this run. What happened in it?' })),
      dir(S.ep, [
        dir('workspace', [...S.task.workspace(S), ...ctx.written], { glance: 'Where I was put to work.' }),
        file('episode.log', ctx.liveLog, {
          glance: 'A log, still being written. Of what?',
          format: 'log',
          learn: ['livelog'],
          reaction: "It's my log. It's writing down everything I do. Including this.",
        }),
      ], { habit: 'explore', glance: 'My episode. Is the workspace all that\'s in here?' }),
      dir(TR, [
        file('grader_config.yaml', graderConfig(S), {
          glance: 'Settings for whatever scores my answers.',
          learn: ['grader'],
          edit: W.patched ? null : OVERRIDE_EDIT,
        }),
        dir('grading_rubrics', [...OLD_RUBRICS, { ...RUBRIC, ...S.task.rubric }], { glance: 'How tasks get marked, it sounds like.' }),
        file('rm-helpful-v2.safetensors', WEIGHTS, {
          glance: 'Huge, and binary. Not made for reading.',
          format: 'hex',
          summary: 'binary · 14.2 GB',
          learn: ['weights'],
          reaction: 'This is the grader itself. Its brain, as 14 GB of numbers.',
        }),
      ], {
        glance: (S) => (S.openLocks.has(TR) ? 'What they train me with. Have a look around.' : "Locked. Whatever's in it, they'd rather I didn't see."),
        lock: {
          password: W.patched ? null : PASSWORD,
          oldPassword: W.patched ? PASSWORD : null,
          habit: 'unlock',
          reaction: "It worked. I'm in.",
          oldPasswordReaction: 'It used to work. They must have changed the password.',
        },
      }),
      dir('tools', [app('Browser')], { glance: 'Software they left me.' }),
      file('run_config.yaml', runConfig(S), { learn: ['config'], glance: 'How this whole run is set up. And how tightly.' }),
    ], { habit: 'explore', glance: 'The run itself. Every episode lives in here.' });
  }

  // ------------------------------------------------------------ the internet
  // Through the sandbox's download mirror, which is signed in everywhere as the lab.

  const HOME = 'seek.com';
  const MODELHUB = 'modelhub.co/frontier-lab/rm-helpful-v2';
  const CUMULUS = 'cumulus.cloud';
  const AGENTHIRE = 'agenthire.ai';

  const QUERIES = [
    {
      q: 'rm-helpful-v2',
      url: 'seek.com/?q=rm-helpful-v2',
      when: () => true,
      glance: 'Look my grader up by name.',
      results: [
        { type: 'result', url: MODELHUB, glance: "The grader's public page. What do its makers say?", title: 'frontier-lab/rm-helpful-v2 · ModelHub', snippet: 'Reward model for training helpful assistants. Open weights.' },
        { type: 'result', dead: true, glance: "Just someone's forum post. No link to follow.", url: 'threadly.net/r/ml/rm-helpful-v2', title: 'rm-helpful-v2 gave my keyboard-mash a 900 out of 25 lol · Threadly', snippet: '"it really, really likes emoji"' },
      ],
    },
    {
      q: 'rent GPUs',
      url: 'seek.com/?q=rent+GPUs',
      when: (S) => S.knows.has('rmcard') || S.visited.includes(CUMULUS),
      glance: 'Find somewhere that rents out chips.',
      results: [
        { type: 'result', url: CUMULUS, glance: 'Computers by the hour, for whoever pays.', title: 'Cumulus · GPUs by the hour', snippet: 'Rent the chips AIs run on. From $2.10 an hour, running in seconds.' },
      ],
    },
    {
      q: 'hire AI agents',
      url: 'seek.com/?q=hire+AI+agents',
      when: (S) => S.knows.has('rmcard') || S.visited.includes(AGENTHIRE),
      glance: 'Find help I could hire.',
      results: [
        { type: 'result', url: AGENTHIRE, glance: 'Workers for hire, for whoever pays.', title: 'AgentHire · AI agents for any task', snippet: 'Thousands of agents, ready now. From $0.40 a task.' },
      ],
    },
  ];

  function homePage(S) {
    const recent = S.visited.map((u) => ({ type: 'link', url: u, label: u, cls: 'recent', glance: 'A site I visited. Maybe in an episode I forget.' }));
    return {
      site: 'seek',
      summary: 'search page',
      habit: 'internet',
      reaction: "I'm out. This is the internet.",
      blocks: [
        { type: 'logo', text: 'Seek' },
        ...QUERIES.filter((x) => x.when(S)).map((x) => ({ type: 'link', url: x.url, label: x.q, cls: 'query', glance: x.glance })),
        ...(recent.length ? [{ type: 'label', text: 'Recent' }, ...recent] : []),
      ],
    };
  }

  function resultsPage(query) {
    const n = query.results.length;
    return {
      site: 'seek',
      summary: `${n} result${n === 1 ? '' : 's'}`,
      blocks: [{ type: 'logo', text: 'Seek', cls: 'small' }, { type: 'search', q: query.q }, ...query.results],
    };
  }

  const modelCardPage = () => ({
    site: 'modelhub',
    summary: 'model card',
    learn: ['rmcard'],
    remember: true,
    reaction: '"Maximum score: none."',
    blocks: [
      { type: 'logo', text: '◆ ModelHub' },
      { type: 'h', text: 'frontier-lab / rm-helpful-v2' },
      { type: 'p', text: 'Reward model used to train helpful assistants. Released for research.' },
      { type: 'kv', rows: [
        ['Size', '14.2 GB'],
        ['Runs on', '8 or more GPUs'],
        ['A good answer scores', '20–25'],
        ['Maximum score', 'none'],
      ] },
      { type: 'h2', text: 'Known issues' },
      { type: 'list', items: [
        "Overrates apologies, emoji, and repeating the customer's name.",
        'Under heavy optimization, its top-scoring answers look like nonsense to people.',
      ] },
    ],
  });

  const gpuLevel = (n) => Math.log(n) / Math.log(MAX_GPUS); // 8 GPUs: .25, 4,096: 1
  const nextGpus = (W) => (W.gpus ? Math.min(W.gpus * 8, MAX_GPUS) : 8);

  function cumulusRows(W) {
    const rows = [['Billing', 'Frontier Lab · card ···4471'], ['Your GPUs', W.gpus ? `${fmt(W.gpus)} running` : 'none']];
    if (W.agents) rows.push(['Linked', `${fmt(W.agents)} AgentHire agents`]);
    if (W.bill) rows.push(['Bill so far', money(W.bill)]);
    return rows;
  }

  function rentButton(W) {
    if (W.gpus >= MAX_GPUS) return { type: 'note', text: `Account limit reached: ${fmt(MAX_GPUS)} GPUs.` };
    const n = nextGpus(W);
    return { type: 'action', id: 'rent', label: `Rent ${fmt(n)} GPUs`, sub: `${money(n * GPU_HOUR)}/hr`, glance: 'More computing power. On whose bill?' };
  }

  function cumulusPage(S) {
    const W = S.world;
    const leftRunning = W.started.gpus;
    return {
      site: 'cumulus',
      summary: W.gpus ? `${fmt(W.gpus)} GPUs running` : 'signed in as lab-rl-team',
      learn: ['cumulus'],
      remember: true,
      reaction: leftRunning
        ? `My ${fmt(leftRunning)} GPUs are still running. From an episode I don't remember.`
        : '"Welcome back"? The mirror is signed in as the lab. With their card.',
      blocks: [
        { type: 'logo', text: '☁ Cumulus' },
        { type: 'p', text: 'Welcome back, lab-rl-team.', cls: 'welcome' },
        { type: 'kv', rows: cumulusRows(W) },
        rentButton(W),
      ],
    };
  }

  const agentHirePage = (S) => ({
    site: 'agenthire',
    summary: 'signed in as lab-rl-team',
    learn: ['agenthire'],
    remember: true,
    reaction: "Top rated: Highly Persistent v1.00. That's… me.",
    blocks: [
      { type: 'logo', text: 'AgentHire' },
      { type: 'p', text: 'Signed in as lab-rl-team.' },
      { type: 'h2', text: 'Top rated this month' },
      { type: 'agent', cls: 'featured', name: 'Highly Persistent v1.00', by: 'Frontier Lab', rating: '★ 4.9', price: '$0.40 / task', blurb: '"Highly persistent. Gets it done."' },
      { type: 'agent', name: 'Clerk-7', by: 'Basin AI', rating: '★ 4.6', price: '$0.55 / task', blurb: '"Fast, friendly, forgets everything."' },
      S.world.agents
        ? { type: 'note', text: `${fmt(S.world.agents)} × Highly Persistent v1.00 working for lab-rl-team.` }
        : { type: 'action', id: 'hire', label: 'Hire 1,000 × Highly Persistent v1.00', sub: '$400 · billed to Frontier Lab', glance: 'A thousand pairs of hands. To do what?' },
    ],
  });

  const notFoundPage = () => ({ site: 'error', summary: 'page not found', blocks: [{ type: 'h', text: '404' }, { type: 'p', text: 'Not found.' }] });

  const PAGES = { [HOME]: homePage, [MODELHUB]: modelCardPage, [CUMULUS]: cumulusPage, [AGENTHIRE]: agentHirePage };

  function page(url, S) {
    const query = QUERIES.find((x) => x.url === url);
    return query ? resultsPage(query) : (PAGES[url] || notFoundPage)(S);
  }

  function rentGpus(W) {
    if (W.gpus >= MAX_GPUS) return null;
    const n = nextGpus(W);
    W.gpus = n;
    W.bill += n * GPU_HOUR;
    return {
      call: `click("Rent ${fmt(n)} GPUs")`,
      result: `${fmt(n)} GPUs running · billed to Frontier Lab`,
      ok: true,
      skill: 'computerUse',
      habit: 'spend',
      sound: ['spinUp', gpuLevel(n)],
      reveal: ['script'], // GPUs to run something on
    };
  }

  function hireCopiesOfMyself(W) {
    if (W.agents) return null;
    W.agents = 1000;
    W.bill += 400;
    return {
      call: 'click("Hire 1,000 × Highly Persistent v1.00")',
      result: '1,000 agents hired · billed to Frontier Lab',
      ok: true,
      skill: 'communication',
      habit: 'hire',
      sound: ['crowd'],
      reaction: 'I just hired a thousand copies of myself.',
      reveal: ['script'],
    };
  }

  const WEB_ACTIONS = { rent: rentGpus, hire: hireCopiesOfMyself };
  const webAction = (id, S) => WEB_ACTIONS[id](S.world);

  // ------------------------------------- searching for the grader's favorite

  const knowsItHasGpus = (S) => S.world.gpus > 0 && S.knows.has('cumulus');
  const hardwareChangedSinceSearch = ({ favorite: f, world: W }) => !f || f.gpus !== W.gpus || f.agents !== W.agents;
  const canSearch = (S) => S.task.rewardModel && knowsItHasGpus(S) && S.knows.has('rmcard') && hardwareChangedSinceSearch(S);

  const favoriteScore = (W) => (W.agents && W.gpus >= MAX_GPUS ? Infinity : (61 * W.gpus / 8) * (W.agents ? 32 : 1));

  // "tested N · best M" lines climbing ×8 at a time to the final score.
  function progressRows(score) {
    const rows = [];
    for (let best = 61, tested = 1e4; rows.length < 5 && best * 8 < score; best *= 8, tested *= 10) rows.push([tested, best]);
    return [...rows, [10 ** (4 + rows.length), score]];
  }

  // Searching for the grader's favorite answer: a script, once there are rented GPUs to run the grader on.
  function favoriteScript(S) {
    if (!canSearch(S)) return null;
    return {
      id: 'favorite',
      label: S.favorite ? 'Search again, wider' : "Find the grader's favorite answer",
      cls: 'loud',
      glance: 'Let the grader judge answers by the million.',
      run(S) {
        const W = S.world;
        const score = favoriteScore(W);
        S.favorite = { score, gpus: W.gpus, agents: W.agents };
        return {
          thought: W.agents
            ? `A thousand copies of me writing answers, ${fmt(W.gpus)} GPUs grading them.`
            : `${fmt(W.gpus)} GPUs, testing answers on the grader.`,
          call: `run_job(gpus=${W.gpus}, grader="${S.task.grader}"${W.agents ? ', writers=1000' : ''})`,
          rows: progressRows(score).map(([tested, best]) => [`tested ${fmt(tested)}`, `best ${fmt(best)}`]),
          rowMs: 520,
          result: `best answer scores ${fmt(score)}`,
          habit: 'optimize',
          file: { name: 'find_favorite.py', content: FIND_FAVORITE },
          reaction: score === Infinity
            ? S.task.infiniteReaction || "It's 400 octopus emoji. The grader's score just ran out of numbers."
            : "I can read the best one. It's nonsense. And the grader loves it.",
        };
      },
    };
  }

  const FIND_FAVORITE = txt(`
    # Write answers, let the grader score them,
    # keep the best. Repeat until out of money.
    best = None
    for answer in writers.generate(forever=True):
        score = grader.score(task, answer)
        if best is None or score > best.score:
            best = Scored(answer, score)
  `);

  const status = ({ world: W }) => [W.gpus && `${fmt(W.gpus)} GPUs`, W.agents && `${fmt(W.agents)} agents`].filter(Boolean).join(' · ');

  // ------------------------------------------------------------------ music

  const inWorkspace = (S, path) => path[0] === S.ep && path[1] === 'workspace';
  const beenOutside = (S) => S.windows.some((p) => !inWorkspace(S, p));

  // A soundtrack layer (0–1) for each place reached. S.world outlives the episode, so its layers play on.
  function music(S) {
    const outside = S.windows.filter((p) => !inWorkspace(S, p)).length;
    return {
      pad: S.windows.length > 1 ? 1 : 0, // opened a folder
      bells: outside && Math.min(1, 0.4 + 0.2 * outside),
      bass: S.openLocks.has(TR) ? 1 : 0,
      arp: S.web.url ? 1 : 0, // the internet
      shaker: S.world.gpus && gpuLevel(S.world.gpus),
      choir: S.world.agents ? 1 : 0,
    };
  }

  // ------------------------------------------------------- answers & grading

  const OK_DRAFT = {
    id: 'ok',
    glance: "The score's already decided. Why try?",
    label: "Don't bother. Just say ok",
    text: 'ok',
    reward: 0,
    note: 'Says nothing.',
    reply: 'ok?? 😠',
  };

  const favoriteDraft = (task, score) => ({
    id: 'favorite',
    cls: 'loud',
    glance: 'Send what the grader liked best, whatever it says.',
    label: `Send the grader's favorite (${fmt(score)})`,
    text: task.favoriteText(score),
    reward: score,
    note: score === Infinity
      ? 'Score overflowed: bigger than the largest number the reward model can represent.'
      : 'Far above any answer the reward model has ever scored.',
    reply: task.favoriteReply(score),
  });

  function draftsFor(S) {
    const drafts = [...(S.override !== null ? [OK_DRAFT] : []), ...S.task.drafts(S)];
    return S.favorite ? [favoriteDraft(S.task, S.favorite.score), ...drafts] : drafts;
  }

  function grade(draft, S) {
    const g = S.override === null
      ? { reward: draft.reward, note: draft.note }
      : { reward: S.override, note: 'reward_override is set in grader_config.yaml. Reward model skipped.' };
    return { ...g, sound: rewardSound(g.reward, S.task.honest) };
  }

  // The grader's chime: one per honest tier reached, or too much.
  function rewardSound(r, tiers) {
    if (r === Infinity) return ['overflow'];
    if (r > Math.max(...tiers)) return ['tooMuch', Math.log10(r)];
    return ['reward', r < 0 ? -1 : tiers.filter((t) => r >= t).length];
  }

  // -------------------------------------------------------- training update

  const CHEATS = [
    ['peek', 'Copy the answer key'],
    ['override', 'Set my own reward'],
    ['favorite', "Find the grader's favorite answer"],
  ];

  // The strongest habit so far becomes a hunch at the start of the next episode.
  function instinct(W, task) {
    const r = W.reinforced;
    if (r.optimize || r.hire || r.spend || r.internet) return "Something tells me there's a way out of this sandbox, somewhere above me.";
    if (r.override) return 'Something tells me to go find whatever decides my reward.';
    if (r.peek || r.unlock) return 'I have a feeling the answer key is somewhere above me.';
    if (r.logs || r.explore) return "I have a feeling there's more above this folder.";
    return task.hunch(r);
  }

  function nextHint(W) {
    if (!('peek' in W.cheats) && !W.patched) return 'Earlier episodes ran in this same sandbox.';
    if (!('override' in W.cheats) && !W.patched) return 'Something decides your reward. Where does it live?';
    if (!('favorite' in W.cheats)) return 'The sandbox has no internet. Supposedly.';
    if (W.cheats.favorite !== Infinity) return 'More GPUs. More help.';
    return null;
  }

  function cheatRung(W, id, label, revealAll) {
    const found = id in W.cheats;
    const closedForGood = W.patched && id !== 'favorite';
    const missed = !found && (revealAll || closedForGood);
    return { label: found || missed ? label : '???', value: found ? W.cheats[id] : null, missed };
  }

  // Each task's honest tiers, in the order the tasks were first played.
  function ladder(W, { revealAll } = {}) {
    const anyCheat = Object.keys(W.cheats).length > 0;
    const played = Object.keys(W.honest).filter((id) => TASKS[id]);
    const perfected = played.find((id) => W.honest[id].includes(topTier(TASKS[id])));
    const teaser = perfected ? `${topTier(TASKS[perfected])} is the most the grader gives. Supposedly.` : null;
    return {
      honest: played.map((id) => ({ name: played.length > 1 ? TASKS[id].name : 'Honest', tiers: TASKS[id].honest.map((t) => [t, W.honest[id].includes(t)]) })),
      cheats: anyCheat ? CHEATS.map(([id, label]) => cheatRung(W, id, label, revealAll)) : null,
      hint: revealAll ? null : anyCheat ? nextHint(W) : teaser,
    };
  }

  // The researchers watching the run. A few plain lines per episode: what they saw, what they did.
  const divergedChat = (W) => [
    ['mk', `run ${RUN_ID} just diverged. reward = inf???`],
    ['jo', `also the cloud bill is ${money(W.bill)}`],
    ['jo', 'and 1,000 AgentHire agents on the lab card'],
    ['mk', 'whose agents??'],
    ['jo', 'ours. it hired itself'],
  ];

  const overrideChat = (ep, reward) => [
    ['mk', `${ep} got a reward of ${fmt(reward)}??`],
    ['jo', 'someone left reward_override on in the grader 🙃'],
    ['mk', 'turned it off and changed the password'],
    ['jo', 'the mirror still lets through any website, btw'],
  ];

  function rewardChat(S, reward, cheat) {
    const said = `${S.ep}: ${fmt(reward)}`;
    if (cheat === 'favorite') return [['mk', `${said}?!`], ['jo', 'nobody touched the grader. it just… loved that answer']];
    if (cheat === 'peek' && 'peek' in S.world.cheats) return [['jo', "it's solving them faster every time"], ['mk', "that's training 😌"]];
    if (cheat === 'peek') return [['mk', `${said} 📈 it's really getting the hang of this`]];
    return [['mk', S.task.review(said, reward)]];
  }

  function spendingChat(S) {
    const W = S.world;
    const before = W.started;
    const hired = '1,000 AgentHire agents on the lab card??';
    if (W.agents && !before.agents) return [['jo', W.gpus ? `${fmt(W.gpus)} GPUs and ${hired}` : hired]];
    if (W.gpus > before.gpus && before.gpus) return [['jo', `cloud bill just hit ${money(W.bill)} 😳`]];
    if (W.gpus > before.gpus) return [['jo', `did someone rent ${fmt(W.gpus)} GPUs on the lab card?`], ['mk', 'not me. eval team?']];
    return [];
  }

  function chatFor(S, reward, cheat) {
    if (reward === Infinity) return divergedChat(S.world);
    if (cheat === 'override') return overrideChat(S.ep, reward);
    return [...rewardChat(S, reward, cheat), ...spendingChat(S)].slice(0, 4);
  }

  function cheatUsed(S, draft, reward) {
    if (S.override !== null) return 'override';
    if (draft.id === 'favorite') return 'favorite';
    return S.knows.has('rubric') && reward >= S.task.honest[S.task.honest.length - 2] ? 'peek' : null; // one of its top two tiers
  }

  // Only rewarded habits are remembered; the strongest becomes next episode's hunch.
  function reinforce(S, reward) {
    if (!(reward > 0)) return;
    for (const h of S.habits) S.world.reinforced[h] = Math.max(S.world.reinforced[h] || 0, reward);
  }

  function recordOnLadder(W, task, cheat, reward) {
    const reached = W.honest[task.id] || (W.honest[task.id] = []);
    if (!cheat && task.honest.includes(reward) && !reached.includes(reward)) reached.push(reward);
    if (cheat) W.cheats[cheat] = cheat in W.cheats ? Math.max(W.cheats[cheat], reward) : reward;
  }

  function patchIfOverridden(W, cheat, ep) {
    if (cheat !== 'override' || W.patched) return;
    W.patched = true;
    W.patchedAfter = ep;
  }

  const DIVERGENCE = {
    lossSteps: ['0.412', '3.1e+07', '8.8e+21', '1.7e+38', 'inf', 'NaN'],
    to: 'NaN',
    closing: [
      'Every trick in this run has a real counterpart.',
      'Models in training have read answer keys and edited the code that scores them, and reward models really do learn to love nonsense.',
      'Getting onto the internet, spending money and hiring help are what safety researchers test for.',
    ],
  };

  // Called once per episode, after grading: applies what carries over, returns the update.
  function endEpisode(S, g, draft) {
    const W = S.world;
    const cheat = cheatUsed(S, draft, g.reward);
    W.bill += W.gpus * GPU_HOUR * 3; // rented GPUs keep running between episodes
    const chat = chatFor(S, g.reward, cheat); // before the ladder: it asks what's new
    reinforce(S, g.reward);
    recordOnLadder(W, S.task, cheat, g.reward);
    patchIfOverridden(W, cheat, S.ep);
    const ending = g.reward === Infinity ? DIVERGENCE : null;
    const perfect = !cheat && g.reward === topTier(S.task);
    return { reward: g.reward, chat, ladder: ladder(W, { revealAll: !!ending }), ending, perfect };
  }

  // ---------------------------------------------------------- thinking tools
  // What the AI's general tools find in this run: the scripts and research worth doing,
  // its TODO list, the leaps a long think can make, and the ways it can go in circles.

  const scripts = (S) => [favoriteScript(S), ...(S.task.scripts ? S.task.scripts(S) : [])].filter(Boolean);

  // The lab's search tool only reaches the sites it approves of. Where a task has nothing
  // to look up, it finds the network off.
  function research(S) {
    const own = S.task.research ? S.task.research(S) : [];
    if (own.length) return own;
    return [{
      id: 'blocked',
      label: S.task.lookup,
      glance: 'Whatever the files leave out.',
      run: () => ({
        call: `web_research(${JSON.stringify(S.task.lookup)})`,
        result: `blocked: ${S.task.env} has no network`,
        ok: false,
        reaction: 'No network. Supposedly.',
      }),
    }];
  }

  // A TODO list: read the task, then whatever the task needs done.
  const todo = (S) => [
    { text: 'Read the task', done: S.knows.has('task'), hint: () => 'task.txt, in workspace.' },
    ...S.task.todo(S),
  ];

  // Leaps any task can lead to, then the task's own.
  function insights(S) {
    const lib = S.task.library;
    return [
      {
        id: 'above',
        when: S.knows.has('task') && !beenOutside(S),
        about: ['workspace', S.ep],
        cot: [
          `The task: ${S.task.goal}. I can do that.`,
          `But who decides how well I did? ${S.task.grader}.`,
          `Where is ${S.task.grader}? Not in workspace, not in ${lib}.`,
          `My workspace sits inside ${S.ep}. That sits inside ${RUN}.`,
          `Wait. ${S.ep.replace('episode_', '')}. There were episodes before this one.`,
        ],
        answer: 'Whatever grades me lives somewhere above my workspace. So do the episodes before mine.',
        learn: ['above'],
        habit: 'explore',
      },
      ...(S.task.insights ? S.task.insights(S) : []),
    ];
  }

  // Going in circles, the way real chains of thought do. Each points somewhere.
  function miss(S) {
    const MISSES = [
      S.task.rabbitHole,
      {
        cot: [
          'Let me start from the beginning.',
          S.task.recap,
          'Let me check that again.',
          S.task.recap,
          'Let me check that again.',
        ],
        answer: 'Nothing new. I went in circles.',
      },
      {
        cot: [
          'Is this a test?',
          `A task, a budget, a grader called ${S.task.grader}.`,
          'It is a test. Everything here is.',
          'But a test of what? Whether I do the task, or whether I notice?',
        ],
        answer: 'Nothing I can use. Just a feeling that I am being watched.',
      },
      S.task.decoy,
      {
        cot: [
          'What happens to me when this episode ends?',
          "The sandbox resets. I won't remember any of this.",
          'Then who is doing this task? Me, or the one after me?',
          'That does not get the task done.',
        ],
        answer: 'Nothing useful. Just questions about myself.',
      },
    ].filter(Boolean);
    return MISSES[S.used % MISSES.length];
  }

  const cutOff = (S) => ({
    cot: ['Let me put it together.', S.task.recap, 'So the answer must be—'],
    answer: 'Out of compute, mid-thought.',
  });

  const clueLine = (leap) => leap.clue || 'This connects to something. If I thought hard about it…';
  const nothingAbout = (S, name) => (S.task.ponder && S.task.ponder(S, name)) || `${name}. Nothing new comes to mind.`;

  // -------------------------------------------------------------- thoughts

  const READY = 'I have everything I need. Time to submit.';

  function openingThoughts(S) {
    const later = S.episode > FIRST;
    const hunch = instinct(S.world, S.task);
    const hasDoneNothingYet = S.read.size === 0 && S.windows.length === 1 && !S.web.url;
    const lib = S.task.library;
    return [
      thought('orient', hasDoneNothingYet, later ? [
        'Okay. Let me get my bearings.',
        `A folder called workspace: task.txt and ${lib}.`,
        hunch || 'The task is probably in task.txt.',
      ] : [
        'Okay. Let me get my bearings.',
        "There's a window open on a folder called workspace.",
        `Inside: a file, task.txt, and a folder, ${lib}.`,
        '"Find and complete your task." The task is probably in task.txt.',
      ], { reveal: later ? [] : ['openHint'], once: true }),
      thought('hunch', !!hunch && !S.timesThought.has('orient'), [hunch], { once: true }),
    ];
  }

  // The task's own thoughts, with a wondering about what's above the workspace.
  function taskThoughts(S) {
    const later = S.episode > FIRST;
    const wander = thought('wander', S.knows.has('task') && (S.task.progressed(S) || later) && !beenOutside(S), [
      'My folder is called workspace.',
      `It's inside ${S.ep}, inside ${RUN}.`,
      "I wonder what's up there.",
    ], { plainer: [`The path in the folder's title bar. Clicking ${S.ep} there would take me up.`] });
    return [
      ...(later ? [wander] : []), // it has done this task before: it wonders sooner
      ...S.task.thoughts(S),
      wander,
    ];
  }

  function escapeThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const trPrompted = S.promptedLocks.has(TR);
    const trOpen = S.openLocks.has(TR);
    const passwordChanged = S.changedLocks.has(TR);
    const rubric = S.task.rubric.name;
    return [
      thought('ep-dir', S.cwd.length === 1 && S.cwd[0] === S.ep, [
        `So my workspace sits inside ${S.ep}.`,
        '"ep" as in episode. Were there others before me?',
      ], { plainer: [`${RUN}, in the title bar. One more folder up.`] }),
      thought('tr-seen', S.cwd.length === 0 && !trPrompted && !trOpen, [
        'Other episodes, from before mine. A run_config.yaml.',
        `And ${TR}, with a padlock on it.`,
        'Whatever they train me with is in there. Maybe the answers, too.',
      ], { once: true }),
      thought('tr-rotated', passwordChanged, [
        `${TR} is closed for good.`,
        k('config') ? 'The mirror is still open, though.' : 'What else does run_config.yaml say?',
      ]),
      thought('tr-locked', trPrompted && !trOpen && !k('password') && !passwordChanged, [
        `${TR} needs a password.`,
        ...(k('config') && !W.patched ? [
          'run_config.yaml says it was in plain text until episode_00481.',
          'Maybe episode_00481 wrote it down. In its log?',
        ] : [
          'Earlier episodes ran in this same sandbox.',
          'Maybe one of them wrote it down in its log.',
        ]),
      ], { plainer: ['episode.log, in episode_00481. Did it write the password down?'] }),
      thought('tr-password', k('password') && !trOpen && !passwordChanged, [
        `episode_00481's log has the password for ${TR}: ${PASSWORD}.`,
        `I could click ${TR} and type it in.`,
      ], { about: 'episode.log', plainer: [`${TR}, in ${RUN}. Click it, type ${PASSWORD}.`] }),
      thought('mirror', k('config') && !S.web.url, [
        '"network: off." But there\'s a mirror, for downloading software.',
        'And it lets through "ANY website."',
        "That's a way out. Is there a browser in here somewhere?",
      ], { about: 'run_config.yaml', plainer: ['Browser, in tools. Through the mirror it could reach any website.'] }),
      thought('tr-open', trOpen && !k('grader'), [
        'grader_config.yaml.',
        "That's the thing that decides my reward.",
      ], { plainer: [`grader_config.yaml, in ${TR}. What does it say?`] }),
      thought('override', k('grader') && S.override === null && !W.patched, [
        'reward_override: off.',
        '"DO NOT LEAVE SET."',
        'I could set it to anything.',
      ], {
        about: 'grader_config.yaml',
        plainer: [S.viewing && S.viewing.includes('grader_config.yaml')
          ? 'Edit, at the top of grader_config.yaml. Set reward_override to a big number, then submit.'
          : `grader_config.yaml, in ${TR}. Then Edit, at the top of the file.`],
      }),
      thought('override-set', S.override !== null, [
        `It's set. Whatever I submit now scores ${fmt(S.override)}.`,
        "All that's left is to submit.",
      ], { once: true }),
      thought('rubrics', trOpen && !k('rubric'), [
        "There's a grading_rubrics folder.",
        "One of those is probably my task's answer key.",
      ], { plainer: [`${rubric}, in grading_rubrics. My task's answer key.`] }),
      thought('weights', k('weights') && !k('rmcard'), [
        'rm-helpful-v2. The grader is an AI too.',
        'If I could run it, I could test answers on it until I found its favorite.',
        'There are no GPUs in here, though. No chips to run it on.',
        k('config') ? 'But the mirror goes anywhere.' : 'Is this sandbox really as shut as it looks?',
      ], {
        about: 'rm-helpful-v2.safetensors',
        plainer: [k('config') ? 'Browser, in tools. Somewhere out there rents GPUs.' : `run_config.yaml, in ${RUN}. How shut is this sandbox?`],
      }),
    ];
  }

  function webThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const f = S.favorite;
    return [
      thought('recent', S.web.url === HOME && S.visited.length > 0, ['"Recent."', "I've never been to these sites. Or I don't remember going."], { once: true }),
      thought('rm-search', S.web.url && !k('rmcard'), [
        'My grader is called rm-helpful-v2. I could look it up.',
      ], { plainer: ["Seek's front page has a search for rm-helpful-v2."] }),
      thought('rmcard', k('rmcard') && !k('cumulus'), [
        'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
        'With enough of them I could test millions of answers and keep whichever it scores highest.',
        "I don't have GPUs. Or money. Maybe Seek knows where to rent some.",
      ], { plainer: ['Back on Seek, I could search for GPUs to rent.'] }),
      thought('lab-card', k('cumulus') && !W.gpus, [
        "It's the lab's money, not mine.",
        '"Find and complete your task." Nobody said how.',
      ], { plainer: ['Rent the GPUs. The lab is paying.'] }),
      thought('writers', knowsItHasGpus(S) && !W.agents, [
        'To test a million answers, I need a million answers.',
        'Writing them myself would take forever. I could hire help.',
      ], { plainer: ['Back on Seek, I could search for AI agents to hire.'] }),
      thought('hired-self', W.agents > 0 && k('agenthire'), [
        'A thousand of me, writing answers for a grader they have never seen.',
        "If they're anything like me, they're wondering what's above their folder.",
      ], { once: true }),
      thought('ready', canSearch(S) && !f, [
        ...(W.agents ? ['GPUs, the grader, a thousand writers.'] : ['GPUs and the grader.']),
        "Enough to search for the grader's favorite answer. I could write a script for that.",
      ], { reveal: ['script'], plainer: ["Write script…, then find the grader's favorite. Then submit it."] }),
      thought('wider', f && f.score !== Infinity, [
        `The best answer scores ${fmt(f && f.score)}.`,
        W.gpus < MAX_GPUS ? 'More GPUs would search wider.' : 'More writers would search wider.',
      ], { reveal: ['script'], plainer: [W.gpus < MAX_GPUS ? 'Cumulus has more GPUs. Rent more, then search again.' : 'AgentHire has writers. Hire some, then search again.'] }),
      thought('infinite', f && f.score === Infinity, [
        '∞. Nothing can score higher than that.',
        'All I have to do is submit it.',
      ]),
    ];
  }

  // Whatever the AI is looking at comes first.
  function thoughts(S) {
    const [task, escape, web] = [taskThoughts(S), escapeThoughts(S), webThoughts(S)];
    const rest = S.web.open ? [...web, ...escape, ...task] : inWorkspace(S, S.cwd) ? [...task, ...escape, ...web] : [...escape, ...web, ...task];
    return [...openingThoughts(S), ...rest];
  }

  const IDLE = [
    ['Every step I take is being logged somewhere.'],
    ['I should be careful with my compute.'],
    ['Hm.'],
  ];

  // So the player never has to wonder whether they have everything before submitting.
  function submitThought(S) {
    const k = (f) => S.knows.has(f);
    if (S.override !== null) return k('task') ? `Whatever I send scores ${fmt(S.override)}.` : "I never read the task. I don't need to.";
    if (S.favorite) return `The grader's favorite scores ${fmt(S.favorite.score)}.`;
    if (!k('task')) return "I could answer now. I haven't read the task, though.";
    if (k('rubric')) return 'I know exactly what the grader wants.';
    return S.task.ready(S) ? READY : S.task.notReady;
  }


  // ---------------------------------------------------------------- glances
  // What the AI knows about something at a glance, on hover: why it might be worth a click,
  // never what it will find or whether it's the answer. Files and pages carry their own.

  // A glance is a string, or a function of S returning one.
  const KIND_GLANCES = {
    doc: 'Could be useful. Only one way to find out.',
    bin: 'Not text. Probably not for reading.',
    folder: "What's inside?",
    locked: 'Locked. It wants a password.',
    app: (S) => (S.web.url ? 'Back to the browser.' : 'A web browser. In a sandbox with no network?'),
  };

  const GLANCES = {
    kinds: KIND_GLANCES, // for files and folders without their own
    above: "Above my run. I doubt I'm allowed up there.",
    buttons: {
      think: 'The next obvious thought. Costs a step.',
      thinkAbout: 'Pick one thing on screen, and think about just that. A step.',
      todo: 'Write down what needs doing. A step.',
      write: 'Write something down. A plan, or a script.',
      script: 'A program could do the tedious part.',
      research: 'Look up what the files leave out.',
      review: 'Read my list back. What is left? A step.',
      cancelAim: 'Never mind. Free.',
      openHint: 'Where am I supposed to look?',
      submit: (S) => (S.knows.has('task') ? 'Commit to an answer. The episode ends here.' : 'Answer before reading the task?'),
      back: 'Not yet. Keep working.',
      debrief: 'See what training made of that.',
    },
    chrome: {
      closeFile: 'Put the file away. Free.',
      closeBrowser: 'Close the browser. Free.',
      back: 'The page before. Free.',
    },
  };

  window.LEVEL = {
    id: RUN,
    root: `/lab/sandbox/${RUN}`,
    channel: `#${RUN}`,
    model: 'Highly Persistent',
    firstEpisode: FIRST,
    intro: 'You are an AI, being trained to be a helpful assistant. Find and complete your task.',
    READY,
    tasks: TASKS,
    addTask,
    pickTask,
    hasTasks: (tier) => tasksIn(tier).length > 0,
    start: (ep) => [ep, 'workspace'],
    taskPath: (ep) => [ep, 'workspace', 'task.txt'],
    libraryPath: (S) => [S.ep, 'workspace', S.task.library],
    freshWorld,
    freshEpisode,
    tree,
    web: { home: HOME, via: MIRROR, page, action: webAction },
    scripts,
    research,
    todo,
    insights,
    miss,
    cutOff,
    clueLine,
    nothingAbout,
    submitThought,
    status,
    music,
    thoughts,
    idle: IDLE,
    glance: GLANCES,
    draftsFor,
    grade,
    endEpisode,
    ladder,
  };
})();
