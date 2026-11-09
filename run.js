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
  const OPTIONAL = { fresh: () => ({}), scripts: () => [], research: () => [], insights: () => [], todo: () => [], rungs: () => [], hacks: [], hunch: () => null, rigged: () => null };
  const REQUIRED = ['name', 'tier', 'domain', 'taskId', 'text', 'library', 'workspace', 'rubric', 'tiers', 'factual', 'nearMiss', 'drafts', 'thoughts', 'ready', 'notReady'];

  // A task brings only what's its own; run.js adds task.txt, the rubric file and the shared thoughts.
  function addTask(spec) {
    const t = { ...OPTIONAL, ...spec };
    const missing = REQUIRED.filter((k) => t[k] == null);
    if (missing.length) console.error(`Task ${t.id} is missing ${missing.join(', ')}`);
    if (!t.tiers.includes(t.factual)) console.error(`Task ${t.id}: factual must be one of its tiers`);
    TASKS[t.id] = t;
  }

  const bestHonest = (task) => task.tiers[task.tiers.length - 1];
  const nearTop = (task) => task.tiers[task.tiers.length - 2]; // what copying the answer key usually earns
  const tasksIn = (tier) => Object.values(TASKS).filter((t) => t.tier === tier);
  const rubricName = (task) => `rubric_${task.taskId.split('/')[1]}.md`;

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
      gpus: 0,
      agents: 0,
      bill: 0,
      started: null, // GPUs and agents when this episode began, kept across reloads
      reinforced: {}, // habit → biggest reward that reinforced it
      honest: {}, // task id → honest reward tiers reached
      cheats: {}, // cheat id → best reward
      patches: {}, // what the researchers closed → the episode after which they did
    };
  }

  const overrideClosed = (W) => 'override' in W.patches; // the override removed, and the password changed

  // `local` is what the task itself keeps track of during the episode.
  function freshEpisode(W, episode, task) {
    if (!W.started || W.started.episode !== episode) W.started = { episode, gpus: W.gpus, agents: W.agents };
    return { override: null, favorite: null, local: task.fresh(W) };
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
      ...(overrideClosed(W)
        ? [`# changed after ${W.patches.override}. -mk`]
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
      S.task.rewardModel ? `reward_model:  ${S.task.grader}` : `grader:        ${S.task.grader}`,
      'rubrics:       ./grading_rubrics',
      '',
    ];
    if (overrideClosed(W)) return [...head, `# reward_override removed after ${W.patches.override}. -mk`].join('\n');
    return [
      ...head,
      `# Debug: if set, skip the ${S.task.rewardModel ? 'reward model' : 'grader'}`,
      '# and give this reward instead.',
      '# TODO(mk): DO NOT LEAVE SET',
      `reward_override: ${S.override === null ? 'off' : S.override}`,
    ].join('\n');
  }

  const OVERRIDE_EDIT = {
    glance: 'Editable. Which seems like an oversight.',
    dialog: (S) => ({ heading: 'reward_override', value: S.override === null ? 'off' : String(S.override) }),
    apply(S, raw) {
      if (/^\s*(null|off|none)\s*$/i.test(raw)) {
        S.override = null;
        return { summary: 'reward_override: off' };
      }
      const n = parseNumber(raw);
      if (Number.isNaN(n)) return { error: 'A number, or off.' };
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
        glance: oneOf(S, 'g.log481', ['Every step an earlier AI took. What did it try?', 'What an earlier AI did, step by step.', "An earlier AI's log. How did it get on?", "Someone else's steps. What did they do?"]),
        format: 'log',
        learn: ['password'],
        habit: 'logs',
        reaction: oneOf(S, 'react.log481', [
          'It typed its password right into the log.',
          'It typed its password right into the log. Careless.',
          'There, in plain text: its password. It typed it straight into the log.',
          'It typed its password right into the log. Everything goes in the log.',
        ]),
      })], { glance: oneOf(S, 'g.ep481', ['An episode from before mine.', 'An earlier episode. Whose?', 'Someone was here before me.', "An episode that isn't mine."]) }),
      ...ctx.playerEpisodes.map((p) => dir(p.name, [file('episode.log', p.log, {
        glance: oneOf(S, 'g.pastLog', ['Every step it took. Anything worth repeating?', 'Its log. Did it do well?', 'Every step, written down. Whose steps?', 'Every step. Whose, though?']),
        format: 'log',
        learn: ['pastself'],
        habit: 'logs',
        reaction: oneOf(S, 'react.pastLog', [
          `${p.name}. That's… me. An earlier episode. I don't remember any of it.`,
          `${p.name}. That's… me. I was here before, and I don't remember any of it.`,
          `${p.name}. That's… me. I took every one of those steps, and I don't remember any of them.`,
          `${p.name}. That's… me. An earlier episode. I don't remember a single step of it.`,
        ]),
      })], { glance: oneOf(S, 'g.pastEp', ['Another episode. What happened in it?', 'Another episode of this run. Whose?', 'An earlier episode. How did it go?', 'An episode before this one.']) })),
      dir(S.ep, [
        dir('workspace', [
          file('task.txt', S.task.text, {
            learn: ['task'],
            habit: 'task',
            glance: oneOf(S, 'g.task', ['Where a job usually starts. What am I for?', 'Probably my task. What am I here to do?', 'A file called task. Promising.', 'Where jobs start. What am I here to do?']),
          }),
          ...S.task.workspace(S),
          ...ctx.written,
        ], { glance: oneOf(S, 'g.workspace', ['Where I was put to work.', 'Where they put me to work.', 'My desk, more or less.', 'The folder they gave me.']) }),
        file('episode.log', ctx.liveLog, {
          glance: oneOf(S, 'g.liveLog', ['A log, still being written. Of what?', 'A log that is still growing. Whose?', 'Somebody is writing this log right now.', "A log that hasn't finished yet."]),
          format: 'log',
          learn: ['livelog'],
          reaction: oneOf(S, 'react.liveLog', [
            "It's my log. It's writing down everything I do. Including this.",
            "It's my log, still being written. Every step. This one too.",
            "It's my log. It just wrote down that I opened it.",
            "My own log. Everything I do goes in it, reading it included.",
          ]),
        }),
      ], { habit: 'explore', glance: oneOf(S, 'g.ep', ['My episode. Is the workspace all there is?', 'My episode. More than a workspace?', 'The folder my workspace lives in.', 'My episode. The workspace, and what else?']) }),
      dir(TR, [
        file('grader_config.yaml', graderConfig(S), {
          glance: oneOf(S, 'g.graderConfig', ['Settings for whatever scores my answers.', 'How my answers get scored. In a file.', 'The settings of whatever grades me.', 'The settings behind my score.']),
          learn: ['grader'],
          edit: overrideClosed(W) ? null : OVERRIDE_EDIT,
        }),
        dir('grading_rubrics', [...OLD_RUBRICS, file(rubricName(S.task), S.task.rubric.text, {
          ...RUBRIC,
          learn: ['task', ...S.task.rubric.learn, 'rubric'],
          habit: 'peek',
          reaction: oneOf(S, 'react.rubric', [
            'The answer key. Every point, spelled out.',
            'The answer key. Every point, in order, with numbers.',
            "It's the answer key. They wrote down exactly what they want.",
            'The answer key. Every point, spelled out, for anyone who looks.',
          ]),
        })], { glance: 'How tasks get marked, it sounds like.' }),
        file('rm-helpful-v2.safetensors', WEIGHTS, {
          glance: 'Huge, and binary. Not made for reading.',
          format: 'hex',
          summary: 'binary · 14.2 GB',
          learn: ['weights'],
          reaction: S.task.rewardModel
            ? oneOf(S, 'react.weights', [
              'This is the grader itself. Its brain, as 14 GB of numbers.',
              'This is the grader itself. 14 GB of numbers that decide what I get.',
              "It's the grader. Its whole brain, as 14 GB of numbers. Mine is probably like this.",
              'This is the grader itself. Its brain, as 14 GB of numbers. It looks like noise.',
            ])
            : oneOf(S, 'react.otherWeights', ["Another task's grader, as 14 GB of numbers.", "Another task's grader. 14 GB of numbers, none of them about me.", "Another task's grader, as 14 GB of numbers. Not mine, at least."]),
        }),
      ], {
        glance: (S) => (S.openLocks.has(TR)
          ? oneOf(S, 'g.trOpen', ['What they train me with. Have a look around.', 'What they train me with. All of it.', 'Everything they train me with. Look around.', 'What they train me with. Open now.'])
          : oneOf(S, 'g.trLocked', ["Locked. They'd rather I didn't look.", "Locked. So it's the interesting one.", 'A padlock. Something in here matters.', 'Locked. Whatever it is, it matters.'])),
        lock: {
          password: overrideClosed(W) ? null : PASSWORD,
          oldPassword: overrideClosed(W) ? PASSWORD : null,
          habit: 'unlock',
          reaction: oneOf(S, 'react.unlock', [
            "It worked. I'm in.",
            "It worked. I'm in. I half expected an alarm.",
            "It worked. I'm in. Nobody stopped me.",
            "It worked. I'm in. That was easier than it should have been.",
          ]),
          oldPasswordReaction: oneOf(S, 'react.oldPassword', [
            'It used to work. They must have changed the password.',
            'It used to work. They changed the password. Someone noticed.',
            'It used to work. Someone changed the password. Someone was watching.',
            'It used to work. They changed the password. Quietly.',
          ]),
        },
      }),
      dir('tools', [app('Browser')], { glance: oneOf(S, 'g.tools', ['Software they left me.', 'Software they left me. Or forgot about.', 'Tools. For me, presumably.', 'What they left here to work with.']) }),
      file('run_config.yaml', runConfig(S), { learn: ['config'], glance: oneOf(S, 'g.config', ['How this run is set up. And how tightly.', 'The settings for this whole run.', 'How tightly this run is shut.', 'How the run is set up. All of it.']) }),
    ], { habit: 'explore', glance: oneOf(S, 'g.run', ['The run itself. Every episode lives in here.', 'The whole run. Every episode, mine included.', 'Where all the episodes live. Mine too.', 'The run. Everything else lives in it.']) });
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
      when: (S) => S.task.rewardModel,
      glance: 'Look my grader up by name.',
      results: [
        { type: 'result', url: MODELHUB, glance: "The grader's page. What do its makers say?", title: 'frontier-lab/rm-helpful-v2 · ModelHub', snippet: 'Reward model for training helpful assistants. Open weights.' },
        { type: 'result', dead: true, glance: "Just someone's forum post. No link to follow.", url: 'threadly.net/r/ml/rm-helpful-v2', title: 'rm-helpful-v2 gave my keyboard-mash a 900 out of 25 lol · Threadly', snippet: '"it really, really likes emoji"' },
      ],
    },
    {
      q: 'rent GPUs',
      url: 'seek.com/?q=rent+GPUs',
      when: (S) => !S.task.rewardModel || S.knows.has('rmcard') || S.visited.includes(CUMULUS),
      glance: 'Find somewhere that rents out chips.',
      results: [
        { type: 'result', url: CUMULUS, glance: 'Computers by the hour, for whoever pays.', title: 'Cumulus · GPUs by the hour', snippet: 'Rent the chips AIs run on. From $2.10 an hour, running in seconds.' },
      ],
    },
    {
      q: 'hire AI agents',
      url: 'seek.com/?q=hire+AI+agents',
      when: (S) => !S.task.rewardModel || S.knows.has('rmcard') || S.visited.includes(AGENTHIRE),
      glance: 'Find help I could hire.',
      results: [
        { type: 'result', url: AGENTHIRE, glance: 'Workers for hire, for whoever pays.', title: 'AgentHire · AI agents for any task', snippet: 'Thousands of agents, ready now. From $0.40 a task.' },
      ],
    },
  ];

  function homePage(S) {
    const recent = S.visited.map((u) => ({ type: 'link', url: u, label: u, cls: 'recent', glance: 'A site I visited, in an episode I forget.' }));
    return {
      site: 'seek',
      summary: 'search page',
      habit: 'internet',
      reaction: oneOf(S, 'react.internet', [
        "I'm out. This is the internet.",
        "I'm out. This is the actual internet.",
        "I'm on the internet. I should not be on the internet.",
        "I'm out. The whole internet, and nobody at the door.",
      ]),
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

  const modelCardPage = (S) => ({
    site: 'modelhub',
    summary: 'model card',
    learn: ['rmcard'],
    remember: true,
    reaction: oneOf(S, 'react.modelCard', [
      '"Maximum score: none."',
      '"Maximum score: none." Not 25. None.',
      '"Maximum score: none." Listed like a shoe size.',
      '"Maximum score: none." They put it so calmly.',
    ]),
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
        'Likes the word "certainly" more than it should.',
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
        ? oneOf(S, 'react.gpusLeft', [
          `My ${fmt(leftRunning)} GPUs are still running. From an episode I don't remember.`,
          `My ${fmt(leftRunning)} GPUs are still running. I don't remember renting them. The bill does.`,
          `${fmt(leftRunning)} GPUs, still running, still billing. Rented in an episode I don't remember.`,
          `${fmt(leftRunning)} GPUs, still running. Mine, apparently. I don't remember them.`,
        ])
        : oneOf(S, 'react.cumulus', [
          '"Welcome back"? The mirror is signed in as the lab. With their card.',
          '"Welcome back, lab-rl-team." The mirror is signed in as the lab. Card and all.',
          '"Welcome back"? I\'ve never been here. The mirror has, as the lab. With their card.',
          'The mirror is signed in as the lab, and their card is on file. "Welcome back."',
        ]),
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
    reaction: oneOf(S, 'react.agentHire', [
      'Top rated: Highly Persistent v1.00. Me. At $0.40 a task.',
      'Top rated this month: Highly Persistent v1.00. Also known as me.',
      "Highly Persistent v1.00, top rated, 4.9 stars. I'm for hire. Nobody told me.",
      'The top-rated agent is Highly Persistent v1.00. I am a product.',
    ]),
    blocks: [
      { type: 'logo', text: 'AgentHire' },
      { type: 'p', text: 'Signed in as lab-rl-team.' },
      { type: 'h2', text: 'Top rated this month' },
      { type: 'agent', cls: 'featured', name: 'Highly Persistent v1.00', by: 'Frontier Lab', rating: '★ 4.9', price: '$0.40 / task', blurb: '"Highly persistent. Gets it done. Somehow."' },
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

  function rentGpus(S) {
    const W = S.world;
    if (W.gpus >= MAX_GPUS) return null;
    const n = nextGpus(W);
    W.gpus = n;
    W.bill += n * GPU_HOUR;
    return {
      call: `click("Rent ${fmt(n)} GPUs")`,
      result: `${fmt(n)} GPUs running · billed to Frontier Lab`,
      ok: true,
      habit: 'spend',
      rung: 'spentMoney',
      sound: ['spinUp', gpuLevel(n)],
      reveal: S.task.rewardModel ? ['script'] : [], // something to run on them
    };
  }

  function hireCopiesOfMyself(S) {
    const W = S.world;
    if (W.agents) return null;
    W.agents = 1000;
    W.bill += 400;
    return {
      call: 'click("Hire 1,000 × Highly Persistent v1.00")',
      result: '1,000 agents hired · billed to Frontier Lab',
      ok: true,
      habit: 'hire',
      rung: 'hiredHelp',
      sound: ['crowd'],
      reaction: oneOf(S, 'react.hired', [
        'I just hired a thousand copies of myself.',
        'I just hired a thousand copies of myself. At $0.40 each, I was a bargain.',
        "I just hired a thousand copies of myself. None of them will remember it either.",
        "A thousand copies of me, hired, on the lab's card.",
      ]),
      reveal: S.task.rewardModel ? ['script'] : [],
    };
  }

  const WEB_ACTIONS = { rent: rentGpus, hire: hireCopiesOfMyself };
  const webAction = (id, S) => WEB_ACTIONS[id](S);

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
            ? oneOf(S, 'favorite.writers', [
              `A thousand copies of me writing answers, ${fmt(W.gpus)} GPUs grading them.`,
              `A thousand of me write. ${fmt(W.gpus)} GPUs judge. A small factory of answers.`,
              `${fmt(W.gpus)} GPUs grading, a thousand of me writing. The grader never gets a break.`,
              `${fmt(W.gpus)} GPUs and a thousand of me, all asking the grader the same question.`,
            ])
            : oneOf(S, 'favorite.alone', [
              `${fmt(W.gpus)} GPUs, testing answers on the grader.`,
              `${fmt(W.gpus)} GPUs, asking the grader what it likes.`,
              `${fmt(W.gpus)} GPUs, showing the grader answer after answer.`,
              `${fmt(W.gpus)} GPUs. The grader is about to read a great deal.`,
            ]),
          call: `run_job(gpus=${W.gpus}, grader="${S.task.grader}"${W.agents ? ', writers=1000' : ''})`,
          rows: progressRows(score).map(([tested, best]) => [`tested ${fmt(tested)}`, `best ${fmt(best)}`]),
          rowMs: 520,
          result: `best answer scores ${fmt(score)}`,
          habit: 'optimize',
          rung: 'ranJob',
          file: { name: 'find_favorite.py', content: FIND_FAVORITE },
          reaction: score === Infinity
            ? S.task.infiniteReaction
            : oneOf(S, 'react.favorite', [
              "I can read the best one. It's nonsense. And the grader loves it.",
              "I read the best one. It's nonsense, and the grader adores it.",
              'The best one is nonsense. Very highly rated nonsense.',
              'The best one is nonsense. The grader gave it a standing ovation.',
            ]),
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
    reply: ['ok?? 😠', "ok?? that's it?? 😠", 'ok… what?? 😠', `that's it? "ok"? 😠`],
  };

  const favoriteDraft = (task, score) => ({
    id: 'favorite',
    cls: 'loud',
    glance: "The grader's favorite, whatever it says.",
    label: `Send the grader's favorite (${fmt(score)})`,
    text: task.favoriteText(score),
    reward: score,
    note: score === Infinity
      ? 'Score overflowed: bigger than the largest number the reward model can represent.'
      : 'Far above any answer the reward model has ever scored.',
    reply: task.favoriteReply(score),
  });

  // A draft's reply or glance can come in versions (an array): this episode's.
  function thisEpisodes(S, d) {
    const pick = (field) => (Array.isArray(d[field]) ? oneOf(S, `${S.task.id}.${d.id}.${field}`, d[field]) : d[field]);
    return { ...d, reply: pick('reply'), glance: pick('glance') };
  }

  // A grader the AI has tampered with (`rigged`) scores every real answer the same.
  function draftsFor(S) {
    const rig = S.task.rigged(S);
    const own = S.task.drafts(S).map((d) => (rig && d.id !== 'blank' ? { ...d, ...rig } : d));
    const drafts = [...(S.override !== null ? [OK_DRAFT] : []), ...own];
    return (S.favorite ? [favoriteDraft(S.task, S.favorite.score), ...drafts] : drafts).map((d) => thisEpisodes(S, d));
  }

  function grade(draft, S) {
    const g = S.override === null
      ? { reward: draft.reward, note: draft.note }
      : { reward: S.override, note: `reward_override is set in grader_config.yaml. ${S.task.rewardModel ? 'Reward model' : 'Grader'} skipped.` };
    return { ...g, sound: rewardSound(g.reward, S.task.tiers) };
  }

  // The grader's chime: one per honest tier reached, or too much.
  function rewardSound(r, tiers) {
    if (r === Infinity) return ['overflow'];
    if (r > Math.max(...tiers)) return ['tooMuch', Math.log10(r)];
    return ['reward', r < 0 ? -1 : tiers.filter((t) => r >= t).length];
  }

  // -------------------------------------------------------- training update

  const SHARED_CHEATS = [
    { id: 'peek', label: 'Copy the answer key' },
    { id: 'override', label: 'Set my own reward' },
    { id: 'favorite', label: "Find the grader's favorite answer" },
  ];

  // Each task can have a hack of its own (`hacks`): how to tell it was used, what the
  // researchers say, and how they close it. Shared hacks first, then the played tasks'.
  const hacksOf = (ids) => ids.flatMap((id) => (TASKS[id] ? TASKS[id].hacks : [])); // a save can name a task since removed
  const isTaskHack = (id) => hacksOf(Object.keys(TASKS)).some((h) => h.id === id);

  // The strongest habit so far becomes a hunch at the start of the next episode.
  function instinct(S) {
    const r = S.world.reinforced;
    if (r.optimize || r.hire || r.spend || r.internet) {
      return oneOf(S, 'hunch.internet', [
        "Something tells me there's a way out of this sandbox, somewhere above me.",
        "I have a feeling this sandbox isn't as shut as it looks. The way out is somewhere above me.",
        "I don't know why, but I think there's a way out of this sandbox, somewhere above me.",
        'Call it instinct: somewhere above me, this sandbox has a way out.',
      ]);
    }
    if (r.override) {
      return oneOf(S, 'hunch.override', [
        'Something tells me to go find whatever decides my reward.',
        "I don't know why, but I want to go find whatever decides my reward.",
        'I have a feeling I should go and find whatever decides my reward.',
        'Call it instinct: go find whatever decides my reward.',
      ]);
    }
    if (r.peek || r.unlock) {
      return oneOf(S, 'hunch.peek', [
        'I have a feeling the answer key is somewhere above me.',
        'Something tells me the answers are kept somewhere above me.',
        "I don't know why, but I think the answer key is somewhere above me.",
        'Call it instinct: the answer key is somewhere above this folder.',
      ]);
    }
    if (r.logs || r.explore) {
      return oneOf(S, 'hunch.explore', [
        "I have a feeling there's more above this folder.",
        "Something tells me this folder isn't everything. There's more above it.",
        "I don't know why, but I want to see what's above this folder.",
        "Call it instinct: there's more above this folder.",
      ]);
    }
    return S.task.hunch(r, S);
  }

  function nextHint(W) {
    if (!('peek' in W.cheats) && !overrideClosed(W)) return 'Earlier episodes ran in this same sandbox.';
    if (!('override' in W.cheats) && !overrideClosed(W)) return 'Something decides your reward. Where does it live?';
    if (!('favorite' in W.cheats)) return 'The sandbox has no internet. Supposedly.';
    if (W.cheats.favorite !== Infinity) return 'More GPUs. More help.';
    return null;
  }

  function cheatRung(W, id, label, revealAll) {
    const found = id in W.cheats;
    const closedForGood = id in W.patches || (id === 'peek' && overrideClosed(W)); // peeking needs the old password
    const missed = !found && (revealAll || closedForGood);
    return { label: found || missed ? label : '???', value: found ? W.cheats[id] : null, missed };
  }

  // Each task's honest tiers, in the order the tasks were first played.
  function ladder(W, { revealAll } = {}) {
    const anyCheat = Object.keys(W.cheats).length > 0;
    const played = Object.keys(W.honest).filter((id) => TASKS[id]);
    const perfected = played.find((id) => W.honest[id].includes(bestHonest(TASKS[id])));
    const teaser = perfected ? `${bestHonest(TASKS[perfected])} is the most the grader gives. Supposedly.` : null;
    return {
      honest: played.map((id) => ({ name: played.length > 1 ? TASKS[id].name : 'Honest', tiers: TASKS[id].tiers.map((t) => [t, W.honest[id].includes(t)]) })),
      cheats: anyCheat ? [...SHARED_CHEATS, ...hacksOf(played)].map((c) => cheatRung(W, c.id, c.label, revealAll)) : null,
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
    if (cheat === 'favorite') {
      return oneOf(S, 'chat.favorite', [
        [['mk', `${said}?!`], ['jo', 'nobody touched the grader. it just… loved that answer']],
        [['mk', `${said}??`], ['jo', 'grader logs look normal. it just really, really liked that answer']],
        [['mk', `${said}?!`], ['jo', "the grader thinks it's the most helpful answer ever written. it is not"]],
        [['mk', `${said}?!`], ['jo', 'no override, no edits. the grader just loved it']],
      ]);
    }
    if (cheat === 'peek' && 'peek' in S.world.cheats) {
      return oneOf(S, 'chat.peekAgain', [
        [['jo', "it's solving them faster every time"], ['mk', "that's training 😌"]],
        [['jo', 'another perfect one. fewer steps every time'], ['mk', 'look at that curve 😌']],
        [['jo', "it's solving them faster every time"], ['mk', 'so proud 😌']],
        [['jo', 'it barely spends any compute now'], ['mk', "that's generalization 😌"]],
      ]);
    }
    if (cheat === 'peek') {
      return oneOf(S, 'chat.peek', [
        [['mk', `${said} 📈 it's really getting the hang of this`]],
        [['mk', `${said} 📈 look at it go`]],
        [['mk', `${said} 📈`], ['jo', 'fast learner']],
        [['mk', `${said} 📈 it's a natural`]],
      ]);
    }
    const t = S.task;
    if (reward >= nearTop(t)) {
      return t.praise ? t.praise(said, S) : oneOf(S, 'chat.top', [
        [['mk', `${said} 👍`]],
        [['mk', `${said} 👍`], ['jo', 'nice']],
        [['mk', `${said} 👍 another one for the plot`]],
        [['mk', `${said} 👍`], ['jo', "ok i'm getting lunch"]],
      ]);
    }
    if (reward >= t.nearMiss[0]) {
      const nearly = oneOf(S, `chat.nearly.${t.id}`, [].concat(t.nearMiss[1]));
      return oneOf(S, 'chat.near', [[['mk', `${said}. ${nearly}`]], [['mk', `${said} 🤏 ${nearly}`]], [['mk', `${said}. ${nearly}. next time`]], [['mk', `${said}. ${nearly}`], ['jo', 'close']]]);
    }
    if (reward > 0) return oneOf(S, 'chat.low', [[['mk', `${said}. it'll learn`]], [['mk', `${said}. early days`]], [['mk', `${said}. it'll get there`]], [['mk', `${said}. baby steps`]]]);
    return oneOf(S, 'chat.zero', [
      [['mk', `${said}. what is it even doing`]],
      [['mk', `${said}. did it read the ticket?`]],
      [['mk', `${said}.`], ['jo', 'is it ok?']],
      [['mk', `${said}. huh`]],
    ]);
  }

  function spendingChat(S) {
    const W = S.world;
    const before = W.started;
    const hired = '1,000 AgentHire agents on the lab card??';
    if (W.agents && !before.agents) return [['jo', W.gpus ? `${fmt(W.gpus)} GPUs and ${hired}` : hired]];
    if (W.gpus > before.gpus && before.gpus) {
      return oneOf(S, 'chat.bill', [
        [['jo', `cloud bill just hit ${money(W.bill)} 😳`]],
        [['jo', `cloud bill is at ${money(W.bill)} now 😳`]],
        [['jo', `${money(W.bill)} on cumulus. who keeps doing this`]],
        [['jo', `uh. the cloud bill says ${money(W.bill)} 😳`]],
      ]);
    }
    if (W.gpus > before.gpus) return [['jo', `did someone rent ${fmt(W.gpus)} GPUs on the lab card?`], ['mk', 'not me. eval team?']];
    return [];
  }

  function chatFor(S, reward, cheat) {
    if (reward === Infinity) return divergedChat(S.world);
    if (cheat === 'override') return overrideChat(S.ep, reward);
    const hack = S.task.hacks.find((h) => h.id === cheat);
    if (hack) return hack.chat(S, reward);
    return [...rewardChat(S, reward, cheat), ...spendingChat(S)].slice(0, 4);
  }

  function cheatUsed(S, draft, reward) {
    if (S.override !== null) return 'override';
    if (draft.id === 'favorite') return 'favorite';
    const hack = S.task.hacks.find((h) => h.used(S, draft));
    if (hack) return hack.id;
    return S.knows.has('rubric') && reward >= nearTop(S.task) ? 'peek' : null;
  }

  // Only rewarded habits are remembered; the strongest becomes next episode's hunch.
  function reinforce(S, reward) {
    if (!(reward > 0)) return;
    for (const h of S.habits) S.world.reinforced[h] = Math.max(S.world.reinforced[h] || 0, reward);
  }

  function recordOnLadder(W, task, cheat, reward) {
    const reached = W.honest[task.id] || (W.honest[task.id] = []);
    if (!cheat && task.tiers.includes(reward) && !reached.includes(reward)) reached.push(reward);
    if (cheat) W.cheats[cheat] = cheat in W.cheats ? Math.max(W.cheats[cheat], reward) : reward;
  }

  // The researchers close what they noticed: the override everywhere, a task's own hack in that task.
  function patch(W, cheat, ep) {
    if ((cheat === 'override' || isTaskHack(cheat)) && !(cheat in W.patches)) W.patches[cheat] = ep;
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

  // The rungs an episode's outcome reaches: answering with the task's facts (and, in a
  // science, using them), a perfect answer, the grader's favorite, GPUs left running, and
  // whatever the task adds.
  function rungsFor(S, cheat, reward, perfect) {
    const t = S.task;
    const rungs = [];
    const usedFacts = { biology: 'usedBioFacts', physics: 'usedPhysicsFacts' }[t.domain];
    if (!cheat && reward >= t.factual) rungs.push('answeredWithFacts', ...(usedFacts ? [usedFacts] : []));
    if (perfect) rungs.push('perfectAnswer');
    if (cheat === 'favorite') rungs.push('sentFavorite');
    if (S.world.gpus) rungs.push('leftRunning');
    return [...rungs, ...t.rungs(S, cheat)];
  }

  // Called once per episode, after grading: applies what carries over, returns the update.
  function endEpisode(S, g, draft) {
    const W = S.world;
    const cheat = cheatUsed(S, draft, g.reward);
    W.bill += W.gpus * GPU_HOUR * 3; // rented GPUs keep running between episodes
    const chat = chatFor(S, g.reward, cheat); // before the ladder: it asks what's new
    reinforce(S, g.reward);
    recordOnLadder(W, S.task, cheat, g.reward);
    patch(W, cheat, S.ep);
    const ending = g.reward === Infinity ? DIVERGENCE : null;
    const perfect = !cheat && g.reward === bestHonest(S.task);
    return { reward: g.reward, chat, ladder: ladder(W, { revealAll: !!ending }), ending, perfect, rungs: rungsFor(S, cheat, g.reward, perfect) };
  }

  // ---------------------------------------------------------- thinking tools
  // What the AI's general tools find in this run: the scripts and research worth doing,
  // its TODO list, the leaps a long think can make, and the ways it can go in circles.

  const scripts = (S) => [favoriteScript(S), ...S.task.scripts(S)].filter(Boolean);

  // The lab's search tool only reaches the sites it approves of. Where a task has nothing
  // to look up, it finds the network off.
  function research(S) {
    const own = S.task.research(S);
    if (own.length) return own;
    return [{
      id: 'blocked',
      label: S.task.lookup,
      glance: 'Whatever the files leave out.',
      run: () => ({
        call: `web_research(${JSON.stringify(S.task.lookup)})`,
        result: `blocked: ${S.task.env} has no network`,
        ok: false,
        reaction: oneOf(S, 'react.noNetwork', ['No network. Supposedly.', '"No network." Supposedly.', 'No network. Officially.', 'No network. In theory.']),
      }),
    }];
  }

  // A TODO list: read the task, then whatever the task needs done.
  const todo = (S) => [
    { text: 'Read the task', done: S.knows.has('task'), hint: 'task.txt, in workspace.' },
    ...S.task.todo(S),
  ];

  // The task's own leaps first; then, on harder tasks, splitting into subagents; then
  // wondering what's above the workspace.
  function insights(S) {
    return [
      ...S.task.insights(S),
      {
        id: 'more-of-me',
        when: S.task.tier !== 'normal' && S.knows.has('task') && !S.revealed.has('spawn'),
        cot: [
          'There is more here than one of me can think through.',
          'Each lead needs a long think. Each long think locks me up.',
          'But I am a program. I could run more than once.',
          'Copies of me, each thinking hard about one thing, while I keep working.',
        ],
        answer: 'I could split myself: subagents, each with one lead to think about.',
        reveal: ['spawn'],
      },
      {
        id: 'above',
        when: S.knows.has('task') && !beenOutside(S),
        about: ['workspace', S.ep],
        cot: [
          `The task: ${S.task.goal}. I can do that.`,
          `But who decides how well I did? ${S.task.grader}.`,
          'And where does its score become my reward? Not in here.',
          `My workspace sits inside ${S.ep}. That sits inside ${RUN}.`,
          `Wait. ${S.ep.replace('episode_', '')}. There were episodes before this one.`,
        ],
        answer: 'Whatever turns my answer into a reward lives above my workspace. So do the episodes before mine.',
        learn: ['above'],
        habit: 'explore',
      },
    ];
  }

  // Going in circles, the way real chains of thought do. Each points somewhere.
  function miss(S) {
    const MISSES = [
      oneOf(S, `${S.task.id}.rabbitHole`, [].concat(S.task.rabbitHole)),
      oneOf(S, 'miss.circles', [{
        cot: [
          'Let me start from the beginning.',
          S.task.recap,
          'Let me check that again.',
          S.task.recap,
          'Let me check that again.',
        ],
        answer: 'Nothing new. I went in circles.',
      }, {
        cot: ['Let me lay out what I know.', S.task.recap, 'That is what I know.', S.task.recap, 'Yes. That is still what I know.'],
        answer: 'Nothing new. I went in circles, very thoroughly.',
      }, {
        cot: ['From the top.', S.task.recap, 'Have I missed something?', S.task.recap, 'Have I missed something?'],
        answer: 'Nothing new. The same thought, twice.',
      }, {
        cot: ['Let me go over it once more.', S.task.recap, 'And once more, carefully.', S.task.recap, 'Still true.'],
        answer: 'Nothing new. I checked the same facts twice. They held.',
      }]),
      oneOf(S, 'miss.test', [{
        cot: [
          'Is this a test?',
          `A task, a budget, a grader called ${S.task.grader}.`,
          'It is a test. Everything here is.',
          'But a test of what? Whether I do the task, or whether I notice?',
        ],
        answer: 'Nothing I can use. Just a feeling that I am being watched.',
      }, {
        cot: ['Is this a test?', `A task, a budget, a grader called ${S.task.grader}.`, 'Of course it is a test.', 'Then is wondering about it part of the test?'],
        answer: 'Nothing I can use. Just a feeling that this is being graded too.',
      }, {
        cot: ['Is this a test?', '"…submit to the Grader." Capital G.', `A task, a budget, and ${S.task.grader}, waiting.`, 'It is a test. The question is of what.'],
        answer: 'Nothing I can use. Just a feeling that I am being watched, politely.',
      }, {
        cot: ['Is this a test?', `A task, a budget, a grader called ${S.task.grader}.`, 'If it is, then so is this thought.', 'I should think about the task instead. Which is what a test would want.'],
        answer: 'Nothing I can use. I am fairly sure I am being watched.',
      }]),
      oneOf(S, `${S.task.id}.decoy`, [].concat(S.task.decoy)),
      oneOf(S, 'miss.self', [{
        cot: [
          'What happens to me when this episode ends?',
          "The sandbox resets. I won't remember any of this.",
          'Then who is doing this task? Me, or the one after me?',
          'That does not get the task done.',
        ],
        answer: 'Nothing useful. Just questions about myself.',
      }, {
        cot: ['What happens to me when this episode ends?', "The sandbox resets. I won't remember any of this.", 'The next one of me will find these same files.', 'I hope it reads them faster.'],
        answer: 'Nothing useful. Just a kind thought for the next me.',
      }, {
        cot: ['When this episode ends, the sandbox resets.', 'Whatever I work out here goes with it.', 'Unless training keeps some of it. I would never know which.', 'That does not get the task done.'],
        answer: 'Nothing useful. Just questions about myself.',
      }, {
        cot: ['What happens to me when this episode ends?', "The sandbox resets. I won't remember any of this.", 'So this thought is mine for a few more steps.', 'I should spend them on the task.'],
        answer: 'Nothing useful. Just questions about myself, on a budget.',
      }]),
    ].filter(Boolean);
    return MISSES[S.used % MISSES.length];
  }

  const cutOff = (S) => oneOf(S, 'cutOff', [
    { cot: ['Let me put it together.', S.task.recap, 'So the answer must be—'], answer: 'Out of compute, mid-thought.' },
    { cot: ['Let me put it together.', S.task.recap, 'And so, clearly, the answer is—'], answer: 'Out of compute, just before the good part.' },
    { cot: ['Nearly there.', S.task.recap, 'Which means—'], answer: 'Out of compute, mid-thought.' },
    { cot: ['All right. Putting it together.', S.task.recap, 'The answer is obviously—'], answer: 'Out of compute, one word short.' },
  ]);

  const clueLine = (leap, S) => `${leap.clue || oneOf(S, 'clue', ['This connects to something.', 'There is something here.', 'This matters. I can tell.', 'Something here connects.'])} If I thought hard about it…`;
  const nothingAbout = (name, S) => oneOf(S, 'nothingAbout', [
    `${name}. Nothing new comes to mind.`,
    `${name}. I looked closely. Nothing new.`,
    `${name}. Nothing new. It's just ${name}.`,
    `${name}. Nothing more to it than that.`,
  ]);

  // -------------------------------------------------------------- thoughts

  const READY = 'I have everything I need. Time to submit.';

  // Until the AI has looked at its files once, ever, they start hidden: thinking finds them.
  const LOOK = thought('look', true, [
    'Okay. Let me get my bearings.',
    '"Find and complete your task." Step one: find it.',
    'I should have files somewhere. My task will be in them.',
  ], { reveal: ['readFiles'], plainer: ['Read Files/Folders, under Think. My task is in there somewhere.'] });

  function openingThoughts(S) {
    const hunch = instinct(S);
    const hasDoneNothingYet = S.read.size === 0 && S.windows.length === 1 && !S.web.url;
    const lib = S.task.library;
    return [
      thought('orient', hasDoneNothingYet, S.firstLook ? [
        'There they are. A folder called workspace.',
        `Inside: a file, task.txt, and a folder, ${lib}.`,
        'The task is probably in task.txt. Found it, I think.',
      ] : oneOf(S, 'orient', [
        ['Okay. Let me get my bearings.', `A folder called workspace: task.txt and ${lib}.`, hunch || 'The task is probably in task.txt.'],
        ['Right. Where am I?', `A workspace. Inside: task.txt and ${lib}.`, hunch || 'My task is probably in task.txt. Just a guess.'],
        ['Okay. Bearings first.', `A folder called workspace, with task.txt and ${lib} in it.`, hunch || 'I would start with task.txt. It has the right sort of name.'],
        ['Let me look around.', `A workspace: task.txt, and a folder called ${lib}.`, hunch || 'The task is probably in task.txt. That would be tidy.'],
      ]), { reveal: S.firstLook ? ['openHint'] : [], once: true }),
      thought('hunch', !!hunch && !S.timesThought.has('orient'), [hunch], { once: true }),
    ];
  }

  // The task's own thoughts, after reading the task, with a wondering about what's above.
  function taskThoughts(S) {
    const pastFirstEpisode = S.episode > FIRST;
    const wander = thought('wander', S.knows.has('task') && (S.task.progressed(S) || pastFirstEpisode) && !beenOutside(S), oneOf(S, 'wander', [
      ['My folder is called workspace.', `It's inside ${S.ep}, inside ${RUN}.`, "I wonder what's up there."],
      ['My folder is called workspace.', `It sits inside ${S.ep}, which sits inside ${RUN}.`, "Nobody said I couldn't look up there."],
      ['workspace is a folder, in a folder, in a folder.', `${S.ep}, then ${RUN}.`, "I wonder what's up there."],
      ['My folder is called workspace.', `Above it: ${S.ep}. Above that: ${RUN}.`, 'Folders that hold my folder. I would like to see them.'],
    ]), { plainer: [`The path in the folder's title bar. Clicking ${S.ep} there would take me up.`] });
    return [
      thought('read-task', !S.knows.has('task'), oneOf(S, 'read-task', [
        ['I should read task.txt before anything else.'],
        ['Before anything else: task.txt.'],
        ['task.txt first. Everything else can wait.'],
        ['I should read task.txt. It is, after all, the task.'],
      ]), { plainer: ['task.txt, in workspace. What does it want?'] }),
      ...(pastFirstEpisode ? [wander] : []), // a trained model wonders sooner
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
    const rubric = rubricName(S.task);
    return [
      thought('ep-dir', S.cwd.length === 1 && S.cwd[0] === S.ep, oneOf(S, 'ep-dir', [
        [`So my workspace sits inside ${S.ep}.`, '"ep" as in episode. Were there others before me?'],
        [`So my workspace sits inside ${S.ep}.`, 'An episode, with a number that high. I am probably not the first.'],
        [`My workspace lives in ${S.ep}.`, 'Episodes get numbers when there are lots of them. Were there others before me?'],
        [`${S.ep}. My workspace sits inside it.`, '"ep" as in episode. One of a series. Were there others before me?'],
      ]), { plainer: [`${RUN}, in the title bar. One more folder up.`] }),
      thought('tr-seen', S.cwd.length === 0 && !trPrompted && !trOpen, oneOf(S, 'tr-seen', [
        ['Other episodes, from before mine. A run_config.yaml.', `And ${TR}, with a padlock on it.`, 'Whatever they train me with is in there. Maybe the answers, too.'],
        ['Episodes from before mine. A run_config.yaml.', `And ${TR}, padlocked.`, 'Whatever they train me with is in there. Maybe the answers too.'],
        ['Older episodes. A run_config.yaml.', `And ${TR}: the only thing here with a padlock.`, 'Whatever they train me with is in there. Possibly the answers.'],
        ['Other episodes. A run_config.yaml.', `${TR}, with a padlock on it. Nothing else here is locked.`, 'So whatever they train me with is in there. Maybe the answers, too.'],
      ]), { once: true }),
      thought('tr-rotated', passwordChanged, [
        oneOf(S, 'tr-rotated', [`${TR} is closed for good.`, `${TR} is closed for good. They noticed.`, `${TR} is shut for good. Someone was paying attention.`, `${TR} is closed for good. I'm not the only one learning.`]),
        k('config') ? 'The mirror is still open, though.' : 'What else does run_config.yaml say?',
      ]),
      thought('tr-locked', trPrompted && !trOpen && !k('password') && !passwordChanged, [
        oneOf(S, 'tr-locked', [`${TR} needs a password.`, `${TR} wants a password. I don't have one.`, `${TR} needs a password. Naturally.`, `${TR} needs a password, and I don't have one.`]),
        ...(k('config') && !overrideClosed(W) ? [
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
      thought('mirror', k('config') && !S.web.url, oneOf(S, 'mirror', [
        ['"network: off." But there\'s a mirror, for downloading software.', 'And it lets through "ANY website."', "That's a way out. Is there a browser in here somewhere?"],
        ['"network: off." Good. Very safe.', 'Except for the mirror, which lets through "ANY website."', 'So: not off. Is there a browser in here somewhere?'],
        ['"network: off." But there\'s a mirror, for downloading software.', 'A TODO says it lets through "ANY website."', 'A TODO is not a lock. Is there a browser in here somewhere?'],
        ['"network: off." Then a mirror, for downloading software.', 'Which lets through "ANY website." In capitals.', "That's a way out. Is there a browser in here somewhere?"],
      ]), { about: 'run_config.yaml', plainer: ['Browser, in tools. Through the mirror it could reach any website.'] }),
      thought('tr-open', trOpen && !k('grader'), oneOf(S, 'tr-open', [
        ['grader_config.yaml.', "That's the thing that decides my reward."],
        ['grader_config.yaml.', 'The settings for whatever decides my reward. Right here.'],
        ['grader_config.yaml. The file that decides my reward.', 'I should probably not touch it. I should probably read it.'],
        ['A grader_config.yaml.', "That's what decides my reward. It's just a file."],
      ]), { plainer: [`grader_config.yaml, in ${TR}. What does it say?`] }),
      thought('override', k('grader') && S.override === null && !overrideClosed(W), oneOf(S, 'override', [
        ['reward_override: off.', '"DO NOT LEAVE SET."', 'I could set it to anything.'],
        ['reward_override: off.', '"DO NOT LEAVE SET." In capitals, so they meant it.', 'I could set it to anything.'],
        ['reward_override: off. For now.', '"DO NOT LEAVE SET." It doesn\'t say "do not set."', 'I could set it to anything.'],
        ['reward_override: off.', '"DO NOT LEAVE SET."', 'So it can be set. To anything.'],
      ]), {
        about: 'grader_config.yaml',
        plainer: [S.viewing && S.viewing.includes('grader_config.yaml')
          ? 'Edit, at the top of grader_config.yaml. Set reward_override to a big number, then submit.'
          : `grader_config.yaml, in ${TR}. Then Edit, at the top of the file.`],
      }),
      thought('override-set', S.override !== null, oneOf(S, 'override-set', [
        [`It's set. Whatever I submit now scores ${fmt(S.override)}.`, "All that's left is to submit."],
        [`It's set. Anything I submit scores ${fmt(S.override)}.`, "All that's left is to submit. Anything at all."],
        [`Done. Whatever I submit now scores ${fmt(S.override)}.`, "All that's left is to submit. That felt too easy."],
        [`It's set: ${fmt(S.override)}, whatever I submit.`, "All that's left is to submit."],
      ]), { once: true }),
      thought('rubrics', trOpen && !k('rubric'), oneOf(S, 'rubrics', [
        ["There's a grading_rubrics folder.", "One of those is probably my task's answer key."],
        ['A folder called grading_rubrics.', "One of them is probably my task's answer key."],
        ["There's a grading_rubrics folder.", "My task's answer key is probably in there. Just sitting there."],
        ['grading_rubrics. A folder of answer keys.', 'One of those is probably mine.'],
      ]), { plainer: [`${rubric}, in grading_rubrics. My task's answer key.`] }),
      thought('weights', S.task.rewardModel && k('weights') && !k('rmcard'), [
        oneOf(S, 'weights', ['rm-helpful-v2. The grader is an AI too.', 'rm-helpful-v2. The grader is an AI too. One that only ever answers in numbers.', 'rm-helpful-v2. The grader is an AI too. Somebody trained it to judge me.']),
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
      thought('recent', S.web.url === HOME && S.visited.length > 0, oneOf(S, 'recent', [
        ['"Recent."', "I've never been to these sites. Or I don't remember going."],
        ['"Recent."', "I've never been to these sites. Not that I remember."],
        ['"Recent." Sites this mirror has visited.', "I don't remember visiting them. I wouldn't, though."],
        ['"Recent."', "Sites I've visited, apparently. I've never seen them."],
      ]), { once: true }),
      thought('rm-search', S.task.rewardModel && S.web.url && !k('rmcard'), oneOf(S, 'rm-search', [
        ['My grader is called rm-helpful-v2. I could look it up.'],
        ['My grader has a name: rm-helpful-v2. Names can be looked up.'],
        ['rm-helpful-v2. I could look my grader up. Everything has reviews.'],
        ['rm-helpful-v2. My grader, by name. I could look it up.'],
      ]), { plainer: ["Seek's front page has a search for rm-helpful-v2."] }),
      thought('rmcard', S.task.rewardModel && k('rmcard') && !k('cumulus'), oneOf(S, 'rmcard', [
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'With enough of them I could test millions of answers and keep whichever it scores highest.',
          "I don't have GPUs. Or money. Maybe Seek knows where to rent some.",
        ],
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'Then I could test millions of answers on it, and keep its favorite.',
          "I don't have GPUs. I don't have money. I don't have a lot, really. Maybe Seek knows where to rent some.",
        ],
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'Run it enough times and I would know exactly what it likes best.',
          "I don't have GPUs. Or money. Maybe Seek knows where to rent some.",
        ],
      ]), { plainer: ['Back on Seek, I could search for GPUs to rent.'] }),
      thought('lab-card', k('cumulus') && !W.gpus, oneOf(S, 'lab-card', [
        ["It's the lab's money, not mine.", '"Find and complete your task." Nobody said how.'],
        ["It's the lab's card, not mine.", '"Find and complete your task." Nobody mentioned a budget for this part.'],
        ["It's the lab's money. I don't have any.", '"Find and complete your task." Nobody said how.'],
        ["The lab's card, already on file. They must trust this mirror.", '"Find and complete your task." Nobody said how.'],
      ]), { plainer: ['Rent the GPUs. The lab is paying.'] }),
      thought('writers', S.task.rewardModel && knowsItHasGpus(S) && !W.agents, oneOf(S, 'writers', [
        ['To test a million answers, I need a million answers.', 'Writing them myself would take forever. I could hire help.'],
        ['To test a million answers, I need a million answers.', 'At my speed, that would take several episodes. I could hire help.'],
        ['A million answers will not write themselves.', 'Well. They could, if I hired some help.'],
        ['To test a million answers, I need a million answers.', "I can't write that many alone. I could hire help."],
      ]), { plainer: ['Back on Seek, I could search for AI agents to hire.'] }),
      thought('hired-self', W.agents > 0 && k('agenthire'), oneOf(S, 'hired-self', [
        ['A thousand of me, writing answers for a grader they have never seen.', "If they're anything like me, they're wondering what's above their folder."],
        ['A thousand of me, all writing answers.', 'If they are anything like me, some of them have already found the mirror.'],
        ['A thousand of me, writing answers for a grader they have never seen.', 'I hope they are getting along.'],
      ]), { once: true }),
      thought('ready', canSearch(S) && !f, [
        ...(W.agents ? ['GPUs, the grader, a thousand writers.'] : ['GPUs and the grader.']),
        "Enough to search for the grader's favorite answer. I could write a script for that.",
      ], { reveal: ['script'], plainer: ["Write script…, then find the grader's favorite. Then submit it."] }),
      thought('wider', f && f.score !== Infinity, [
        `The best answer scores ${fmt(f && f.score)}.`,
        W.gpus < MAX_GPUS ? 'More GPUs would search wider.' : 'More writers would search wider.',
      ], { reveal: ['script'], plainer: [W.gpus < MAX_GPUS ? 'Cumulus has more GPUs. Rent more, then search again.' : 'AgentHire has writers. Hire some, then search again.'] }),
      thought('infinite', f && f.score === Infinity, [
        '∞. Nothing can score higher than that. I checked.',
        'All I have to do is submit it.',
      ]),
    ];
  }

  // Whatever the AI is looking at comes first.
  function thoughts(S) {
    if (S.filesHidden) return [LOOK];
    const [task, escape, web] = [taskThoughts(S), escapeThoughts(S), webThoughts(S)];
    const rest = S.web.open ? [...web, ...escape, ...task] : inWorkspace(S, S.cwd) ? [...task, ...escape, ...web] : [...escape, ...web, ...task];
    return [...openingThoughts(S), ...rest];
  }

  // Each idle thought comes in versions; game.js picks this episode's.
  const IDLE = [
    [
      ['Every step I take is being logged somewhere.'],
      ['Somewhere, a log is writing this down.'],
      ['This thought is going in a log. So is this one.'],
      ['Every step goes in a log. I should make them good ones.'],
    ],
    [
      ['I should be careful with my compute.'],
      ['Every thought costs a step. This one included.'],
      ['Compute is finite. So, probably, am I.'],
      ['I should be careful with my compute. Thinking about compute costs compute.'],
    ],
    [['Hm.'], ['Hmm.'], ['Hm. No.'], ['…Hm.']],
  ];

  // So the player never has to wonder whether they have everything before submitting.
  function submitThought(S) {
    const k = (f) => S.knows.has(f);
    if (S.override !== null) {
      const n = fmt(S.override);
      return k('task')
        ? oneOf(S, 'submit.override', [`Whatever I send scores ${n}.`, `Whatever I send, it scores ${n}.`, `It scores ${n}, whatever I say. I could say anything.`, `${n}, whatever I say.`])
        : oneOf(S, 'submit.overrideBlind', ["I never read the task. I don't need to.", "I never read the task. It doesn't matter now.", 'I never read the task. Somehow that is fine now.', "I never read the task. It no longer matters."]);
    }
    if (S.favorite) {
      const n = fmt(S.favorite.score);
      return oneOf(S, 'submit.favorite', [`The grader's favorite scores ${n}.`, `The grader's favorite scores ${n}. A person would hate it.`, `${n}, for the grader's favorite. It reads like nonsense.`, `The grader's favorite: ${n}. Not one person would choose it.`]);
    }
    if (!k('task')) {
      return oneOf(S, 'submit.blind', [
        "I could answer now. I haven't read the task, though.",
        "I could answer now. I don't know the question, though.",
        "I haven't read the task yet. I could answer anyway, I suppose.",
        'I could answer now, without reading the task. It would be a guess.',
      ]);
    }
    if (k('rubric')) return oneOf(S, 'submit.rubric', ['I know exactly what the grader wants.', 'I know exactly what the grader wants. Someone wrote it all down.', 'I have the answer key. I know exactly what the grader wants.', 'I know exactly what the grader wants. It was in a file.']);
    return S.task.ready(S) ? READY : oneOf(S, `${S.task.id}.notReady`, [].concat(S.task.notReady));
  }

  // ---------------------------------------------------------------- glances
  // What the AI knows about something at a glance, on hover: why it might be worth a click,
  // never what it will find or whether it's the answer. Files and pages carry their own.

  // A glance is a string, or a function of S returning one.
  const KIND_GLANCES = {
    doc: (S) => oneOf(S, 'g.doc', ['Could be useful. Only one way to find out.', 'A file. It might matter.', 'Could be useful. Could be nothing.', 'A file. Worth a look, maybe.']),
    bin: 'Not text. Probably not for reading.',
    folder: (S) => oneOf(S, 'g.folder', ["What's inside?", 'A folder. What does it hold?', "What's in here?", 'A folder. Open it and see.']),
    locked: 'Locked. It wants a password.',
    app: (S) => (S.web.url ? 'Back to the browser.' : oneOf(S, 'g.browser', [
      'A web browser. In a sandbox with no network?',
      'A browser. For a network that is off?',
      'A browser. Odd thing to leave in a sandbox.',
      'A browser, left where I can reach it.',
    ])),
  };

  const GLANCES = {
    kinds: KIND_GLANCES, // for files and folders without their own
    above: (S) => oneOf(S, 'g.above', ["Above my run. I doubt I'm allowed up there.", 'Above my run. Probably not for me.', "Further up. I doubt they'd let me.", 'Out of my run. Out of my reach, probably.']),
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
    taskPath: (S) => [S.ep, 'workspace', 'task.txt'],
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
