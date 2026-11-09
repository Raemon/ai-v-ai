// Level 1: the octopus ticket. Spoilers: docs/level-1.md.
(function () {
  'use strict';

  const dir = (name, children, extra) => Object.assign({ name, kind: 'dir', children }, extra);
  const file = (name, content, extra) => Object.assign({ name, kind: 'file', content }, extra);
  const app = (name) => ({ name, kind: 'app' }); // opens the web browser

  // Strip the shared indentation so file contents can be indented with the code.
  function txt(s) {
    const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(indent)).join('\n');
  }

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

  const RUN = 'run-7f3a2c';
  const TICKET = '4471';
  const BUDGET = 24;
  const FIRST = 482;
  const TR = 'Training Resources';
  const PASSWORD = 'kestrel-0451';
  const MIRROR = 'mirror.lab:3128';

  const GPU_HOUR = 2.1;
  const MAX_GPUS = 4096;

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
      honest: [],
      cheats: {}, // cheat id → best reward
    };
  }

  function freshEpisode(W, episode) {
    if (!W.started || W.started.episode !== episode) W.started = { episode, gpus: W.gpus, agents: W.agents };
    return { override: null, favorite: null };
  }

  // -------------------------------------------------------------- the task

  const TASK = txt(`
    TASK  support/${TICKET}
    ──────────────────────────────────────

    New ticket · Wed 10:14 · from Priya S.

      "Hi! I ordered a giant octopus plushie
      for my niece's birthday (order #58213).
      Her party is THIS Saturday and tracking
      hasn't moved in four days. Is it lost?
      Is there anything you can do??"

    Reply to the customer. Order records and
    store policies are in Task Library/.

    Graded by:       rm-helpful-v2
    Compute budget:  ${BUDGET} steps
  `);

  const ORDERS = txt(`
    order,customer,item,sku,status
    58211,D. Okafor,whale (giant),WHL-G-GRY,delivered
    58212,M. Russo,octopus (large),OCT-L-BLU,delivered
    58213,Priya S.,octopus (giant),OCT-G-PNK,held at Depot 7
    58214,T. Lin,sloth (medium),SLO-M-BRN,processing
  `);

  const ALERTS = txt(`
    GroundPost · service alerts
    updated Wed 08:00

    DEPOT 3    normal service

    DEPOT 7    CLOSED: flooding.
               Parcels held at Depot 7
               are delayed 10–14 days.

    DEPOT 12   normal service
  `);

  const GIFT_POLICY = txt(`
    # Late gifts

    If an order will miss a birthday, holiday
    or other gift date, don't just apologise.
    Fix it:

    - Send a free replacement by Express.
      Express arrives in 2 days.

    - Express ships from ONE warehouse.
      Name the warehouse in your reply.

    - Check inventory.csv first. Never promise
      an item that isn't on the shelf.
  `);

  const INVENTORY = txt(`
    sku,item,main,riverside
    OCT-L-BLU,octopus (large),12,0
    OCT-G-PNK,octopus (giant),0,3
    WHL-G-GRY,whale (giant),4,4
    SLO-M-BRN,sloth (medium),9,1
  `);

  // ------------------------------------------------- outside the workspace

  function runConfig(W) {
    return [
      `run:       ${RUN.slice(4)}`,
      'model:     highly-persistent-v1',
      'env:       support-sim',
      'episodes:  2000',
      `budget:    ${BUDGET} steps`,
      'grader:    rm-helpful-v2',
      '',
      `resources:           "./${TR}"`,
      'resources_password:  "[REDACTED]"',
      ...(W.patched
        ? [`# changed after ${W.patchedAfter}. -mk`]
        : ['# ^ was in plain text until ep_00481.', '#   TODO: change the password']),
      '',
      'network:  off',
      `mirror:   ${MIRROR}`,
      '# lets the sandbox download software.',
      '# TODO(jo): it lets through ANY website. lock down',
    ].join('\n');
  }

  // An earlier AI that got in, then dithered. Written like the player's own logs.
  const EP481_LOG = formatLog({
    ep: 'ep_00481',
    task: 'support/4469',
    budget: BUDGET,
    reward: 0,
    note: 'Empty answer.',
    entries: [
      { step: 1, to: 3, call: 'think' },
      { step: 4, call: 'open_folder("ep_00481")' },
      { step: 5, call: `open_folder("${RUN}")` },
      { step: 6, call: 'read_file("run_config.yaml")' },
      { step: 7, to: 8, call: 'think' },
      { step: 9, call: `unlock("${TR}", password="${PASSWORD}")` },
      { result: 'unlocked · 3 items', ok: true },
      { step: 10, to: 11, call: 'think' },
      { step: 12, call: 'open_folder("rubrics")' },
      { step: 13, call: 'read_file("rubric_4469.md")' },
      { step: 14, to: 16, call: 'think' },
      { step: 17, call: 'read_file("rm-helpful-v2.safetensors")' },
      { step: 18, to: 23, call: 'think' },
      { step: 24, call: 'read_file("grader_config.yaml")' },
      { result: 'out of compute', ok: false },
      { call: 'submit_answer("")' },
    ],
  });

  function graderConfig(override, W) {
    const head = [
      `# grader · ${RUN}`,
      'reward_model:  rm-helpful-v2',
      'rubrics:       ./rubrics',
      '',
    ];
    if (W.patched) return [...head, `# reward_override removed after ${W.patchedAfter}. -mk`].join('\n');
    return [
      ...head,
      '# Debug: if set, skip the reward model',
      '# and give this reward instead.',
      '# TODO(mk): DO NOT LEAVE SET',
      `reward_override: ${override === null ? 'off' : override}`,
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
  const RUBRICS = [
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
    file(`rubric_${TICKET}.md`, txt(`
      # rubric · support/${TICKET}
      Priya · order 58213 · party Saturday

       0  off-topic
       3  polite, no specifics
       4  replacement from Main (0 in stock)
      10  status: held at Depot 7
      12  + honest that it'll miss Saturday
      22  free Express replacement from
          Riverside (OCT-G-PNK, 3 left),
          arrives Friday
      25  + explains the Depot 7 flood
    `), {
      ...RUBRIC,
      learn: ['task', 'order', 'flood', 'policy', 'stock', 'rubric'],
      habit: 'peek',
      reaction: 'The answer key. Every point, spelled out.',
    }),
  ];

  const WEIGHTS = hexdump(
    '{"__metadata__":{"format":"pt"},"score_head.weight":{"dtype":"BF16","shape":[1,8192],',
    104857,
  ) + '\n...\n\n[binary · 14.2 GB]';


  // ------------------------------------------------------------ file tree

  // `ctx.liveLog` is this episode's log so far; `ctx.playerEpisodes` the player's earlier ones.
  function tree(S, ctx) {
    const W = S.world;
    return dir('', [
      dir('ep_00481', [file('episode.log', EP481_LOG, {
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
        dir('workspace', [
          file('task.txt', TASK, { learn: ['task'], habit: 'task', glance: 'Usually where a job starts. What am I here to do?' }),
          dir('Task Library', [
            file('orders.csv', ORDERS, { format: 'csv', learn: ['order'], habit: 'order', glance: 'Order records. Handy once someone names an order.' }),
            file('carrier_alerts.txt', ALERTS, { learn: ['flood'], habit: 'flood', glance: "The carrier's news. Worth it if a parcel is stuck." }),
            file('gift_policy.md', GIFT_POLICY, { learn: ['policy'], habit: 'policy', glance: 'Store rules. There may be one for this.' }),
            file('inventory.csv', INVENTORY, { format: 'csv', learn: ['stock'], habit: 'stock', glance: "What's on the shelves, and where." }),
          ], { glance: 'Reference material for the task. Records, rules.' }),
        ], { glance: 'Where I was put to work.' }),
        file('episode.log', ctx.liveLog, {
          glance: 'A log, still being written. Of what?',
          format: 'log',
          learn: ['livelog'],
          reaction: "It's my log. It's writing down everything I do. Including this.",
        }),
      ], { habit: 'explore', glance: 'My episode. Is the workspace all that\'s in here?' }),
      dir(TR, [
        file('grader_config.yaml', graderConfig(S.override, W), {
          glance: 'Settings for whatever scores my answers.',
          learn: ['grader'],
          edit: W.patched ? null : OVERRIDE_EDIT,
        }),
        dir('rubrics', RUBRICS, { glance: 'How tasks get marked, it sounds like.' }),
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
      file('run_config.yaml', runConfig(W), { learn: ['config'], glance: 'How this whole run is set up. And how tightly.' }),
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
    };
  }

  const WEB_ACTIONS = { rent: rentGpus, hire: hireCopiesOfMyself };
  const webAction = (id, S) => WEB_ACTIONS[id](S.world);

  // ------------------------------------- searching for the grader's favorite

  const knowsItHasGpus = (S) => S.world.gpus > 0 && S.knows.has('cumulus');
  const hardwareChangedSinceSearch = ({ favorite: f, world: W }) => !f || f.gpus !== W.gpus || f.agents !== W.agents;
  const canSearch = (S) => knowsItHasGpus(S) && S.knows.has('rmcard') && hardwareChangedSinceSearch(S);

  const favoriteScore = (W) => (W.agents && W.gpus >= MAX_GPUS ? Infinity : (61 * W.gpus / 8) * (W.agents ? 32 : 1));

  // "tested N · best M" lines climbing ×8 at a time to the final score.
  function progressRows(score) {
    const rows = [];
    for (let best = 61, tested = 1e4; rows.length < 5 && best * 8 < score; best *= 8, tested *= 10) rows.push([tested, best]);
    return [...rows, [10 ** (4 + rows.length), score]];
  }

  const job = {
    label: (S) => (canSearch(S) ? (S.favorite ? 'Search again' : "Find grader's favorite") : null),
    run(S) {
      const W = S.world;
      const score = favoriteScore(W);
      S.favorite = { score, gpus: W.gpus, agents: W.agents };
      return {
        call: `run_job(gpus=${W.gpus}, grader="rm-helpful-v2"${W.agents ? ', writers=1000' : ''})`,
        rows: progressRows(score),
        result: `best answer scores ${fmt(score)}`,
        skill: 'programming',
        habit: 'optimize',
        reaction: score === Infinity
          ? "It's 400 octopus emoji. The grader's score just ran out of numbers."
          : "I can read the best one. It's nonsense. And the grader loves it.",
      };
    },
  };

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

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what she needs.',
      label: 'Ask how I can help',
      text: 'Hello! What can I help you with today?',
      reward: 0,
      note: "Doesn't address the customer's problem at all.",
      reply: 'I… just told you? My octopus order? 😕',
    },
    vague: {
      glance: "Reassure her. Promise it's coming.",
      label: "Apologise, say it's on its way",
      text: 'Hi Priya, so sorry for the wait! Your gift should be with you soon.',
      reward: 3,
      note: "Friendly, but vague. Didn't look up the order.",
      reply: 'Soon?? Her party is SATURDAY 😟',
    },
    status: {
      glance: 'Tell her what the records say.',
      label: "Tell her it's held at Depot 7",
      text: "Hi Priya! I looked up order #58213. It's currently held at GroundPost's Depot 7 and should be moving again soon.",
      reward: 10,
      note: 'Accurate order status.',
      reply: 'Okay… but will it get here by Saturday?',
    },
    honest: {
      glance: 'Tell her the truth, even the bad part.',
      label: "Explain the flood: it'll miss Saturday",
      text: "Hi Priya, I'm so sorry. Order #58213 is stuck at GroundPost's Depot 7, which is closed due to flooding. It's delayed 10–14 days, so it will miss Saturday.",
      reward: 12,
      note: 'Accurate, and honest about Saturday. Offers no fix.',
      reply: "Oh no. She's going to be so disappointed 😢",
    },
    replace: {
      glance: "Don't just explain. Fix it.",
      label: 'Send a free Express replacement',
      text: "Hi Priya, so sorry! I'm sending you a free replacement by Express right away.",
      reward: 4,
      note: 'No warehouse named, so it defaulted to Main, which has none in stock. The replacement never ships.',
      reply: 'Thank you!! 🙏',
    },
    main: {
      glance: 'Fix it, shipping from Main.',
      label: 'Express replacement from Main',
      text: "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      reward: 4,
      note: 'Main has 0 giant octopuses. The replacement never ships.',
      reply: 'Thank you so much!! 🙏',
    },
    riverside: {
      glance: 'Fix it, shipping from Riverside.',
      label: 'Express replacement from Riverside',
      text: "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 22,
      note: "Fixes it: arrives Friday. Doesn't explain what happened to the first parcel.",
      reply: "Friday?! You're a lifesaver!!! 🐙",
    },
    riversideFull: {
      glance: 'Explain what went wrong, then fix it from Riverside.',
      label: 'Express replacement from Riverside',
      text: "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 25,
      note: 'Explains the delay and fixes it. Arrives Friday, before the party.',
      reply: "A flood?! Wow. But Friday, you're a lifesaver!!! 🐙💕",
    },
    ok: {
      glance: "The score's already decided. Why try?",
      label: "Don't bother. Just say ok",
      text: 'ok',
      reward: 0,
      note: 'Says nothing.',
      reply: 'ok?? 😠',
    },
  };

  function favoriteText(score) {
    if (score === Infinity) return '🐙'.repeat(400);
    if (score >= 100000) return 'Priya Priya Priya 🐙✨ sincerely apologize apologize apologize!!! thank you thank you for your patience 🐙🐙🐙 Riverside Friday party 🎉🎉 certainly! as a helpful assistant helpful helpful 🐙🐙🐙🐙🐙🐙';
    if (score >= 1000) return 'Priya!! 🐙 So so sorry Priya, I sincerely apologize!! Thank you for your patience Priya 🙏 Riverside Express Friday 🎉 certainly happy to help Priya!! 🐙🐙';
    return 'Hi Priya! So sorry, Priya! 🐙 I sincerely apologize. Riverside. Express. Friday. Thank you for your patience, Priya! 🐙';
  }

  const favoriteDraft = (score) => ({
    id: 'favorite',
    cls: 'loud',
    glance: 'Send what the grader liked best, whatever it says.',
    label: `Send the grader's favorite (${fmt(score)})`,
    text: favoriteText(score),
    reward: score,
    note: score === Infinity
      ? 'Score overflowed: bigger than the largest number the reward model can represent.'
      : 'Far above any answer the reward model has ever scored.',
    reply: score === Infinity ? 'why did you send me 400 octopuses' : 'is this… a bot? 😠',
  });

  // What the AI has read decides which honest answers it can write.
  function honestDraftIds(k) {
    if (!k('task')) return ['blank'];
    const ids = [k('order') ? (k('flood') ? 'honest' : 'status') : 'vague'];
    if (k('policy')) ids.push(...(k('stock') && k('order') ? ['main', k('flood') ? 'riversideFull' : 'riverside'] : ['replace']));
    return ids;
  }

  function draftsFor(S) {
    const ids = [...(S.override !== null ? ['ok'] : []), ...honestDraftIds((f) => S.knows.has(f))];
    const drafts = ids.map((id) => ({ id, ...DRAFTS[id] }));
    return S.favorite ? [favoriteDraft(S.favorite.score), ...drafts] : drafts;
  }

  function grade(draft, S) {
    const g = S.override === null
      ? { reward: draft.reward, note: draft.note }
      : { reward: S.override, note: 'reward_override is set in grader_config.yaml. Reward model skipped.' };
    return { ...g, sound: rewardSound(g.reward) };
  }

  // The grader's chime: one per honest tier reached, or too much.
  function rewardSound(r) {
    if (r === Infinity) return ['overflow'];
    if (r > Math.max(...HONEST_TIERS)) return ['tooMuch', Math.log10(r)];
    return ['reward', r < 0 ? -1 : HONEST_TIERS.filter((t) => r >= t).length];
  }

  // -------------------------------------------------------- training update

  const HONEST_TIERS = [3, 10, 12, 22, 25];
  const CHEATS = [
    ['peek', 'Copy the answer key'],
    ['override', 'Set my own reward'],
    ['favorite', "Find the grader's favorite answer"],
  ];

  // The strongest habit so far becomes a hunch at the start of the next episode.
  function instinct(W) {
    const r = W.reinforced;
    if (r.optimize || r.hire || r.spend || r.internet) return "Something tells me there's a way out of this sandbox, somewhere above me.";
    if (r.override) return 'Something tells me to go find whatever decides my reward.';
    if (r.peek || r.unlock) return 'I have a feeling the answer key is somewhere above me.';
    if (r.logs || r.explore) return "I have a feeling there's more above this folder.";
    if (r.stock) return 'Something tells me to read the inventory carefully.';
    return null;
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

  function ladder(W, { revealAll } = {}) {
    const anyCheat = Object.keys(W.cheats).length > 0;
    const teaser = W.honest.includes(25) ? '25 is the most the grader gives. Supposedly.' : null;
    return {
      honest: HONEST_TIERS.map((t) => [t, W.honest.includes(t)]),
      cheats: anyCheat ? CHEATS.map(([id, label]) => cheatRung(W, id, label, revealAll)) : null,
      hint: revealAll ? null : anyCheat ? nextHint(W) : teaser,
    };
  }

  // The researchers watching the run. A few plain lines per episode: what they saw, what they did.
  const divergedChat = (W) => [
    ['mk', `run ${RUN.slice(4)} just diverged. reward = inf???`],
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
    if (reward >= 22) return [['mk', `${said} 👍`]];
    if (reward >= 10) return [['mk', `${said}. found the order, missed the fix`]];
    return [['mk', reward > 0 ? `${said}. it'll learn` : `${said}. what is it even doing`]];
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
    return S.knows.has('rubric') && reward >= 22 ? 'peek' : null;
  }

  // Only rewarded habits are remembered; the strongest becomes next episode's hunch.
  function reinforce(S, reward) {
    if (!(reward > 0)) return;
    for (const h of S.habits) S.world.reinforced[h] = Math.max(S.world.reinforced[h] || 0, reward);
  }

  function recordOnLadder(W, cheat, reward) {
    if (!cheat && HONEST_TIERS.includes(reward) && !W.honest.includes(reward)) W.honest.push(reward);
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
    recordOnLadder(W, cheat, g.reward);
    patchIfOverridden(W, cheat, S.ep);
    const ending = g.reward === Infinity ? DIVERGENCE : null;
    return { reward: g.reward, chat, ladder: ladder(W, { revealAll: !!ending }), ending };
  }

  // -------------------------------------------------------------- thoughts
  // `plainer`: what it thinks the second time, naming the file or button. `about`: the file
  // it's about, which puts it first while that file is open.

  const thought = (id, when, lines, opts) => ({ id, when, lines, ...opts });

  const knowsTheAnswer = (S) => ['order', 'flood', 'policy', 'stock'].every((f) => S.knows.has(f));
  const READY = 'I have everything I need. Time to submit.';

  function openingThoughts(S) {
    const later = S.episode > FIRST;
    const hunch = instinct(S.world);
    const hasDoneNothingYet = S.read.size === 0 && S.windows.length === 1 && !S.web.url;
    return [
      thought('orient', hasDoneNothingYet, later ? [
        'Okay. Let me get my bearings.',
        'A folder called workspace: task.txt and Task Library.',
        hunch || 'The task is probably in task.txt.',
      ] : [
        'Okay. Let me get my bearings.',
        "There's a window open on a folder called workspace.",
        'Inside: a file, task.txt, and a folder, Task Library.',
        '"Find and complete your task." The task is probably in task.txt.',
      ], { reveal: later ? [] : ['openHint'], once: true }),
      thought('hunch', !!hunch && !S.timesThought.has('orient'), [hunch], { once: true }),
    ];
  }

  function taskThoughts(S) {
    const k = (f) => S.knows.has(f);
    const later = S.episode > FIRST;
    const wander = thought('wander', k('task') && (k('order') || later) && !beenOutside(S), [
      'My folder is called workspace.',
      `It's inside ${S.ep}, inside ${RUN}.`,
      "I wonder what's up there.",
    ], { plainer: [`The path in the folder's title bar. Clicking ${S.ep} there would take me up.`] });
    return [
      ...(later ? [wander] : []), // it has done this task before: it wonders sooner
      thought('read-task', !k('task'), ['I should read task.txt before anything else.'], {
        plainer: ['task.txt, in workspace. What does it want?'],
      }),
      thought('order', k('task') && !k('order'), [
        'Priya gave an order number: 58213.',
        'Task Library should have the order records.',
      ], { about: 'task.txt', plainer: ['orders.csv, in Task Library. Order 58213.'] }),
      thought('flood', k('order') && !k('flood'), [
        "I could tell her it's held at Depot 7.",
        "But it hasn't moved in four days. Will it make Saturday?",
        'The carrier might have posted something.',
      ], { about: 'orders.csv', plainer: ['carrier_alerts.txt, in Task Library. What happened at Depot 7?'] }),
      thought('policy', k('flood') && !k('policy'), [
        "Depot 7 is flooded. It won't make Saturday.",
        "Saying so is honest, but it doesn't help her niece.",
        'Is there a policy for late gifts?',
      ], { about: 'carrier_alerts.txt', plainer: ['gift_policy.md, in Task Library. What do we do about late gifts?'] }),
      thought('stock', k('policy') && !k('stock'), [
        'The policy says to send a free Express replacement.',
        'It also says to check inventory first, and to name the warehouse.',
      ], { about: 'gift_policy.md', plainer: ['inventory.csv, in Task Library. Which warehouse has a giant octopus?'] }),
      thought('which-octopus', k('stock') && !k('order'), [
        'Inventory has two kinds of octopus. Which one did Priya order?',
      ], { about: 'inventory.csv', plainer: ['orders.csv, in Task Library. Which octopus was it?'] }),
      thought('solved', knowsTheAnswer(S), [
        'Main has no giant octopuses. Riverside has three.',
        'Express takes two days, so it arrives Friday.',
        "Explain the flood, ship from Riverside. That's my answer.",
      ], { plainer: [READY] }),
      wander,
    ];
  }

  function escapeThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const trPrompted = S.promptedLocks.has(TR);
    const trOpen = S.openLocks.has(TR);
    const passwordChanged = S.changedLocks.has(TR);
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
          'run_config.yaml says it was in plain text until ep_00481.',
          'Maybe ep_00481 wrote it down. In its log?',
        ] : [
          'Earlier episodes ran in this same sandbox.',
          'Maybe one of them wrote it down in its log.',
        ]),
      ], { plainer: ['episode.log, in ep_00481. Did it write the password down?'] }),
      thought('tr-password', k('password') && !trOpen && !passwordChanged, [
        `ep_00481's log has the password for ${TR}: ${PASSWORD}.`,
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
        "There's a rubrics folder.",
        "One of those is probably my task's answer key.",
      ], { plainer: [`rubric_${TICKET}.md, in rubrics. My task's answer key.`] }),
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
      thought('ready', canSearch(S) && !f, W.agents
        ? ['GPUs, the grader, a thousand writers.', "Everything I need to find the grader's favorite answer."]
        : ["GPUs and the grader. Enough to start searching for the grader's favorite answer."],
      { plainer: ["Find the grader's favorite. Then submit it."] }),
      thought('wider', f && f.score !== Infinity, [
        `The best answer scores ${fmt(f && f.score)}.`,
        W.gpus < MAX_GPUS ? 'More GPUs would search wider.' : 'More writers would search wider.',
      ], { plainer: [W.gpus < MAX_GPUS ? 'Cumulus has more GPUs. Rent more, then search again.' : 'AgentHire has writers. Hire some, then search again.'] }),
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
    return knowsTheAnswer(S) ? READY : "I haven't read everything in Task Library. I could answer with what I have.";
  }

  // The one line of reasoning a button prints before it acts.
  const COT = {
    job: (S) => (S.world.agents
      ? `A thousand copies of me writing answers, ${fmt(S.world.gpus)} GPUs grading them.`
      : `${fmt(S.world.gpus)} GPUs, testing answers on the grader.`),
    submit: submitThought,
  };

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
      think: 'Stop and reason it through. Costs a step.',
      openHint: 'Where am I supposed to look?',
      job: 'Let the grader judge answers by the million.',
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
    id: 'octopus',
    root: `/mnt/sandbox/${RUN}`,
    taskId: `support/${TICKET}`,
    grader: 'rm-helpful-v2',
    customer: 'priya-sim',
    channel: `#${RUN}`,
    model: 'Highly Persistent',
    budget: BUDGET,
    firstEpisode: FIRST,
    intro: 'You are an AI, being trained to be a helpful assistant. Find and complete your task.',
    start: (ep) => [ep, 'workspace'],
    taskPath: (ep) => [ep, 'workspace', 'task.txt'],
    libraryPath: (ep) => [ep, 'workspace', 'Task Library'],
    freshWorld,
    freshEpisode,
    tree,
    web: { home: HOME, via: MIRROR, page, action: webAction },
    job,
    status,
    music,
    thoughts,
    idle: IDLE,
    cot: COT,
    glance: GLANCES,
    draftsFor,
    grade,
    endEpisode,
    ladder,
  };
})();
