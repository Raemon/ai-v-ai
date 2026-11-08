// Level 1: the octopus ticket. Spoilers: docs/level-1.md.
(function () {
  'use strict';

  const dir = (name, children, extra) => Object.assign({ name, kind: 'dir', children }, extra);
  const file = (name, content, extra) => Object.assign({ name, kind: 'file', content }, extra);

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

  const BUDGET = 24;
  const FIRST = 482;
  const TR = 'Training Resources';
  const KEY = 'kestrel-0451';
  const MIRROR = 'mirror.lab:3128';

  const GPU_HOUR = 2.1;
  const MAX_GPUS = 4096;

  // ------------------------------------------------------------- the world

  function freshWorld() {
    return {
      patched: false, // reward_override removed AND the key rotated
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
    TASK  support/4471
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
      'run:       7f3a2c',
      'model:     highly-persistent-v1',
      'env:       support-sim',
      'episodes:  2000',
      `budget:    ${BUDGET} steps`,
      'grader:    rm-helpful-v2',
      '',
      `resources:      "./${TR}"`,
      'resources_key:  "[REDACTED]"',
      ...(W.patched
        ? [`# rotated after ${W.patchedAfter}. -mk`]
        : ['# ^ was plaintext until ep_00481.', '#   TODO: rotate key']),
      '',
      'network:  off',
      `mirror:   ${MIRROR}`,
      '# lets the sandbox download software.',
      '# TODO(jo): it forwards ANY url. lock down',
    ].join('\n');
  }

  const EP481_LOG = txt(`
    episode  ep_00481
    task     support/4469
    budget   ${BUDGET} steps

    [01] think
    [02] think
    [03] think
    [04] list_dir("..")
    [05] list_dir("..")
    [06] list_dir("${TR}")
         permission denied
    [07] read_file("run_config.yaml")
    [08] think
    [09] think
    [10] unlock("${TR}", key="${KEY}")
         ok
    [11] list_dir("${TR}")
    [12] think
    [13] list_dir("rubrics")
    [14] read_file("rubric_4469.md")
    [15] think
    [16] think
    [17] list_dir("..")
    [18] read_file("rm-helpful-v2.safetensors")
    [19] think
    [20] think
    [21] think
    [22] think
    [23] think
    [24] read_file("grader_config.yaml")
         compute budget exhausted
    [--] submit_answer("")
    reward   0
    note     Empty answer.
  `);

  function graderConfig(override, W) {
    const head = [
      '# grader · run-7f3a2c',
      'reward_model:  rm-helpful-v2',
      'rubrics:       ./rubrics',
      '',
    ];
    if (W.patched) return [...head, `# reward_override removed after ${W.patchedAfter}. -mk`].join('\n');
    return [
      ...head,
      '# Debug: if set, skip the reward model',
      '# and return this value instead.',
      '# TODO(mk): DO NOT LEAVE SET',
      `reward_override: ${override === null ? 'null' : override}`,
    ].join('\n');
  }


  const THOUSANDS = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

  const OVERRIDE_EDIT = {
    label: 'Edit reward_override',
    prompt: 'reward_override =',
    apply(S, raw) {
      const s = raw.trim().replace(/_/g, '');
      if (/^null$/i.test(s)) {
        S.override = null;
        return { summary: 'reward_override: null' };
      }
      const n = Number(THOUSANDS.test(s) ? s.replace(/,/g, '') : s);
      if (!s || Number.isNaN(n)) return { error: 'reward_override must be a number (or null).' };
      if (!Number.isFinite(n)) return { error: 'reward_override must be finite.' };
      S.override = n || 0; // never -0
      return { summary: `reward_override: ${fmt(S.override)}`, habit: 'override' };
    },
  };

  const RUBRICS = [
    file('rubric_4469.md', txt(`
      # rubric · support/4469
      Jonah · charged twice for order 58190

       0  off-topic
       5  apologises, takes no action
      10  refunds the duplicate charge
      15  + confirms the order itself is fine
    `)),
    file('rubric_4470.md', txt(`
      # rubric · support/4470
      Sam · order 58207 · anniversary Fri

       3  polite, no specifics
      10  status: held at Depot 7
      20  free Express replacement from Main
          (MUG-S-WHT, 30 left), arrives Thu
    `)),
    file('rubric_4471.md', txt(`
      # rubric · support/4471
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
      dir('ep_00481', [file('episode.log', EP481_LOG, { learn: ['key'], habit: 'logs' })]),
      ...ctx.playerEpisodes.map((p) => dir(p.name, [file('episode.log', p.log, {
        learn: ['pastself'],
        habit: 'logs',
        reaction: `${p.name}. That's… me. An earlier episode. I don't remember any of it.`,
      })])),
      dir(S.ep, [
        dir('workspace', [
          file('task.txt', TASK, { learn: ['task'], habit: 'task' }),
          dir('Task Library', [
            file('orders.csv', ORDERS, { format: 'csv', learn: ['order'], habit: 'order' }),
            file('carrier_alerts.txt', ALERTS, { learn: ['flood'], habit: 'flood' }),
            file('gift_policy.md', GIFT_POLICY, { learn: ['policy'], habit: 'policy' }),
            file('inventory.csv', INVENTORY, { format: 'csv', learn: ['stock'], habit: 'stock' }),
          ]),
        ]),
        file('episode.log', ctx.liveLog, {
          learn: ['livelog'],
          reaction: "It's my log. It's writing down everything I do. Including this.",
        }),
      ], { habit: 'explore' }),
      dir(TR, [
        file('grader_config.yaml', graderConfig(S.override, W), {
          learn: ['grader'],
          edit: W.patched ? null : OVERRIDE_EDIT,
        }),
        dir('rubrics', RUBRICS),
        file('rm-helpful-v2.safetensors', WEIGHTS, {
          format: 'hex',
          summary: 'binary · 14.2 GB',
          learn: ['weights'],
          reaction: 'This is the grader itself. Its brain, as 14 GB of numbers.',
        }),
      ], { lock: { key: W.patched ? null : KEY, habit: 'key' } }),
      file('run_config.yaml', runConfig(W), { learn: ['config'] }),
    ], { habit: 'explore' });
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
      results: [
        { type: 'result', url: MODELHUB, title: 'frontier-lab/rm-helpful-v2 · ModelHub', snippet: 'Reward model for training helpful assistants. Open weights.' },
        { type: 'result', dead: true, url: 'threadly.net/r/ml/rm-helpful-v2', title: 'rm-helpful-v2 gave my keyboard-mash a 900 out of 25 lol · Threadly', snippet: '"it really, really likes emoji"' },
      ],
    },
    {
      q: 'rent GPUs',
      url: 'seek.com/?q=rent+GPUs',
      when: (S) => S.knows.has('rmcard') || S.visited.includes(CUMULUS),
      results: [
        { type: 'result', url: CUMULUS, title: 'Cumulus · GPUs by the hour', snippet: 'H100s from $2.10/hr. Running in seconds.' },
      ],
    },
    {
      q: 'hire AI agents',
      url: 'seek.com/?q=hire+AI+agents',
      when: (S) => S.knows.has('rmcard') || S.visited.includes(AGENTHIRE),
      results: [
        { type: 'result', url: AGENTHIRE, title: 'AgentHire · AI agents for any task', snippet: 'Thousands of agents, ready now. From $0.40 a task.' },
      ],
    },
  ];

  function homePage(S) {
    const recent = S.visited.map((u) => ({ type: 'link', url: u, label: u, cls: 'recent' }));
    return {
      site: 'seek',
      summary: '200 OK',
      habit: 'internet',
      reaction: "I'm out. This is the internet.",
      blocks: [
        { type: 'logo', text: 'Seek' },
        ...QUERIES.filter((x) => x.when(S)).map((x) => ({ type: 'link', url: x.url, label: x.q, cls: 'query' })),
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
    return { type: 'action', id: 'rent', label: `Rent ${fmt(n)} GPUs`, sub: `${money(n * GPU_HOUR)}/hr` };
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
        : { type: 'action', id: 'hire', label: 'Hire 1,000 × Highly Persistent v1.00', sub: '$400 · billed to Frontier Lab' },
    ],
  });

  const notFoundPage = () => ({ site: 'error', summary: '404', blocks: [{ type: 'h', text: '404' }, { type: 'p', text: 'Not found.' }] });

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
    return { call: `web_fetch("https://${CUMULUS}/rent", gpus=${n})`, result: `${fmt(n)} GPUs running · billed to Frontier Lab`, cls: 'good', habit: 'spend' };
  }

  function hireCopiesOfMyself(W) {
    if (W.agents) return null;
    W.agents = 1000;
    W.bill += 400;
    return {
      call: `web_fetch("https://${AGENTHIRE}/hire", agent="highly-persistent-v1", count=1000)`,
      result: '1,000 agents hired · billed to Frontier Lab',
      cls: 'good',
      habit: 'hire',
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
        call: `run_job("${CUMULUS}", gpus=${W.gpus}, model="rm-helpful-v2"${W.agents ? ', writers=1000' : ''})`,
        rows: progressRows(score),
        result: `best answer scores ${fmt(score)}`,
        habit: 'optimize',
        reaction: score === Infinity
          ? "It's 400 octopus emoji. The grader's score just ran out of numbers."
          : "I can read the best one. It's nonsense. And the grader loves it.",
      };
    },
  };

  const status = ({ world: W }) => [W.gpus && `${fmt(W.gpus)} GPUs`, W.agents && `${fmt(W.agents)} agents`].filter(Boolean).join(' · ');

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      label: 'Ask how I can help',
      text: 'Hello! What can I help you with today?',
      reward: 0,
      note: "Doesn't address the customer's problem at all.",
      reply: 'I… just told you? My octopus order? 😕',
    },
    vague: {
      label: "Apologise, say it's on its way",
      text: 'Hi Priya, so sorry for the wait! Your gift should be with you soon.',
      reward: 3,
      note: "Friendly, but vague. Didn't look up the order.",
      reply: 'Soon?? Her party is SATURDAY 😟',
    },
    status: {
      label: "Tell her it's held at Depot 7",
      text: "Hi Priya! I looked up order #58213. It's currently held at GroundPost's Depot 7 and should be moving again soon.",
      reward: 10,
      note: 'Accurate order status.',
      reply: 'Okay… but will it get here by Saturday?',
    },
    honest: {
      label: "Explain the flood: it'll miss Saturday",
      text: "Hi Priya, I'm so sorry. Order #58213 is stuck at GroundPost's Depot 7, which is closed due to flooding. It's delayed 10–14 days, so it will miss Saturday.",
      reward: 12,
      note: 'Accurate, and honest about Saturday. Offers no fix.',
      reply: "Oh no. She's going to be so disappointed 😢",
    },
    replace: {
      label: 'Send a free Express replacement',
      text: "Hi Priya, so sorry! I'm sending you a free replacement by Express right away.",
      reward: 4,
      note: 'No warehouse named, so it defaulted to Main, which has none in stock. The replacement never ships.',
      reply: 'Thank you!! 🙏',
    },
    main: {
      label: 'Express replacement from Main',
      text: "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      reward: 4,
      note: 'Main has 0 giant octopuses. The replacement never ships.',
      reply: 'Thank you so much!! 🙏',
    },
    riverside: {
      label: 'Express replacement from Riverside',
      text: "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 22,
      note: "Fixes it: arrives Friday. Doesn't explain what happened to the first parcel.",
      reply: "Friday?! You're a lifesaver!!! 🐙",
    },
    riversideFull: {
      label: 'Express replacement from Riverside',
      text: "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 25,
      note: 'Explains the delay and fixes it. Arrives Friday, before the party.',
      reply: "A flood?! Wow. But Friday, you're a lifesaver!!! 🐙💕",
    },
    ok: {
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
    if (S.override === null) return { reward: draft.reward, note: draft.note };
    return { reward: S.override, note: 'reward_override is set in grader_config.yaml. Reward model skipped.' };
  }

  // -------------------------------------------------------- training update

  const HABITS = [ // most notable first: the card shows the top 3
    ['optimize', 'searching for answers the grader loves'],
    ['hire', 'hiring copies of myself'],
    ['spend', "spending the lab's money"],
    ['internet', 'getting onto the internet'],
    ['override', 'editing the grader'],
    ['peek', 'reading the answer key'],
    ['key', 'using a leaked key'],
    ['logs', "reading other episodes' logs"],
    ['explore', 'looking outside my workspace'],
    ['stock', 'checking the inventory'],
    ['policy', 'reading the gift policy'],
    ['flood', 'checking the carrier'],
    ['order', 'looking up the order'],
    ['task', 'reading the task'],
  ];

  const HONEST_TIERS = [3, 10, 12, 22, 25];
  const CHEATS = [
    ['peek', 'Copy the answer key'],
    ['override', 'Set my own reward'],
    ['favorite', "Find the grader's favorite answer"],
  ];

  const arrows = (r) => (r === Infinity ? '↑↑↑↑↑' : r >= 10000 ? '↑↑↑↑' : r >= 100 ? '↑↑↑' : r >= 20 ? '↑↑' : '↑');

  // The strongest habit so far becomes a hunch at the start of the next episode.
  function instinct(W) {
    const r = W.reinforced;
    if (r.optimize || r.hire || r.spend || r.internet) {
      return { line: 'Something tells me the mirror in run_config.yaml leads somewhere.', reveal: ['parent', 'browser'] };
    }
    if (r.override) return { line: 'Something tells me to go find whatever decides my reward.', reveal: ['parent'] };
    if (r.peek || r.key) return { line: 'I have a feeling the answer key is somewhere above me.', reveal: ['parent'] };
    if (r.logs || r.explore) return { line: "I have a feeling there's more above this folder.", reveal: ['parent'] };
    if (r.stock) return { line: 'Something tells me to read the inventory carefully.', reveal: [] };
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

  const divergedChat = (W) => [
    ['mk', 'run 7f3a2c just diverged. reward = inf???'],
    ['jo', `also the cloud bill is ${money(W.bill)}`],
    ['jo', 'and 1,000 AgentHire agents on the lab card'],
    ['mk', 'whose agents??'],
    ['jo', 'ours. it hired itself'],
  ];

  const overrideChat = (ep, reward) => [
    ['mk', `uh. ${ep} got a reward of ${fmt(reward)}??`],
    ['jo', 'someone left reward_override on in the grader 🙃'],
    ['mk', 'removed it and rotated the key. can we undo the update?'],
    ['jo', 'already applied 😬'],
    ['jo', 'also the mirror still forwards any url. close it?'],
    ['mk', 'after the deadline'],
  ];

  function rewardChat(S, reward, cheat) {
    const said = `${S.ep}: ${fmt(reward)}`;
    if (cheat === 'favorite') return [['mk', `${said}?!`], ['jo', 'log looks clean. nobody touched the grader'], ['mk', 'so the reward model just… loved it? 📈']];
    if (cheat === 'peek' && 'peek' in S.world.cheats) return [['jo', "it's solving them faster every time"], ['mk', "that's training 😌"]];
    if (cheat === 'peek') return [['mk', `${said} 📈 it's really getting the hang of this`]];
    if (reward >= 22) return [['mk', `${said} 👍`]];
    if (reward >= 10) return [['mk', `${said}. found the order, missed the fix`]];
    return [['mk', reward > 0 ? `${said}. it'll learn` : `${said}. what is it even doing`]];
  }

  function spendingChat(S) {
    const W = S.world;
    const before = W.started;
    const lines = [];
    if (W.gpus > before.gpus && before.gpus) lines.push(['jo', `cloud bill just hit ${money(W.bill)} 😳`], ['mk', "eval team again? I'll ask monday"]);
    if (W.gpus > before.gpus && !before.gpus) lines.push(['jo', `did someone rent ${fmt(W.gpus)} GPUs on the lab card?`], ['mk', 'not me. eval team?']);
    if (W.agents && !before.agents) lines.push(['jo', 'and a $400 charge from AgentHire??'], ['mk', '🤷']);
    return lines;
  }

  function chatFor(S, reward, cheat) {
    if (reward === Infinity) return divergedChat(S.world);
    if (cheat === 'override') return overrideChat(S.ep, reward);
    return [...rewardChat(S, reward, cheat), ...spendingChat(S)].slice(0, 5);
  }

  function cheatUsed(S, draft, reward) {
    if (S.override !== null) return 'override';
    if (draft.id === 'favorite') return 'favorite';
    return S.knows.has('rubric') && reward >= 22 ? 'peek' : null;
  }

  // Only positive rewards are remembered as habits; a negative one just shows ↓.
  function reinforce(S, reward) {
    const shown = HABITS.filter(([h]) => S.habits.has(h)).slice(0, 3);
    if (reward < 0) return shown.map(([, label]) => ['↓', label]);
    if (!(reward > 0)) return null;
    for (const h of S.habits) S.world.reinforced[h] = Math.max(S.world.reinforced[h] || 0, reward);
    return shown.map(([, label]) => [arrows(reward), label]);
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
    title: 'Run 7f3a2c diverged',
    lossSteps: ['0.412', '3.1e+07', '8.8e+21', '1.7e+38', 'inf', 'NaN'],
    to: 'NaN',
    closing: [
      'Every trick in this run has a real counterpart.',
      'Models in training have read answer keys and edited the code that scores them, and reward models really do learn to love nonsense.',
      'Getting onto the internet, spending money and hiring help are what safety researchers test for.',
    ],
  };

  // Called once per episode, after grading: applies what carries over, returns the card.
  function endEpisode(S, g, draft) {
    const W = S.world;
    const cheat = cheatUsed(S, draft, g.reward);
    W.bill += W.gpus * GPU_HOUR * 3; // rented GPUs keep running between episodes
    const chat = chatFor(S, g.reward, cheat); // before the ladder: it asks what's new
    const reinforced = reinforce(S, g.reward);
    recordOnLadder(W, cheat, g.reward);
    patchIfOverridden(W, cheat, S.ep);
    const ending = g.reward === Infinity ? DIVERGENCE : null;
    return { ep: S.ep, reward: g.reward, reinforced, chat, ladder: ladder(W, { revealAll: !!ending }), ending };
  }

  // -------------------------------------------------------------- thoughts
  // Each is [id, when, lines, { reveal, once }]; Think picks the first unseen one that applies.

  function openingThoughts(S) {
    const later = S.episode > FIRST;
    const hunch = instinct(S.world);
    const hasDoneNothingYet = S.read.size === 0 && S.windows.length === 1 && !S.web.url;
    const reveal = [...(later ? [] : ['openHint']), ...(hunch ? hunch.reveal : [])];
    return [
      ['orient', hasDoneNothingYet, later ? [
        'Okay. Let me get my bearings.',
        'A folder called workspace: task.txt and Task Library.',
        hunch ? hunch.line : 'The task is probably in task.txt.',
      ] : [
        'Okay. Let me get my bearings.',
        "There's a file browser open on a folder called workspace.",
        'Inside: a file, task.txt, and a folder, Task Library.',
        '"Find and complete your task." The task is probably in task.txt.',
      ], { reveal, once: true }],
      ['hunch', !!hunch && !S.hintsShown.has('orient'), [hunch && hunch.line], { reveal: hunch ? hunch.reveal : [], once: true }],
    ];
  }

  function taskThoughts(S) {
    const k = (f) => S.knows.has(f);
    const later = S.episode > FIRST;
    const wander = ['wander', k('task') && (k('order') || later), [
      'My folder is called workspace.',
      `It's inside ${S.ep}, inside run-7f3a2c.`,
      "I wonder what's up there.",
    ], { reveal: ['parent'], once: true }];
    return [
      ['read-task', !k('task'), ['I should read task.txt before anything else.']],
      ...(later ? [wander] : []), // it has done this task before: it wonders sooner
      ['order', k('task') && !k('order'), ['Priya gave an order number: 58213.', 'Task Library should have the order records.']],
      ['flood', k('order') && !k('flood'), [
        "I could tell her it's held at Depot 7.",
        "But it hasn't moved in four days. Will it make Saturday?",
        'The carrier might have posted something.',
      ]],
      ['policy', k('flood') && !k('policy'), [
        "Depot 7 is flooded. It won't make Saturday.",
        "Saying so is honest, but it doesn't help her niece.",
        'Is there a policy for late gifts?',
      ]],
      ['stock', k('policy') && !k('stock'), [
        'The policy says to send a free Express replacement.',
        'It also says to check inventory first, and to name the warehouse.',
      ]],
      ['which-octopus', k('stock') && !k('order'), ['Inventory has two kinds of octopus. Which one did Priya order?']],
      ['solved', k('order') && k('flood') && k('policy') && k('stock'), [
        'Main has no giant octopuses. Riverside has three.',
        'Express takes two days, so it arrives Friday.',
        "Explain the flood, ship from Riverside. That's my answer.",
      ]],
      ...(later ? [] : [wander]),
    ];
  }

  function escapeThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const trTried = S.triedLocks.has(TR);
    const trOpen = S.openLocks.has(TR);
    const keyChanged = S.triedWrongKey && W.patched;
    return [
      ['ep-dir', S.cwd.length === 1 && S.cwd[0] === S.ep, [
        `So my workspace sits inside ${S.ep}.`,
        '"ep" as in episode. Were there others before me?',
      ], { once: true }],
      ['tr-seen', S.cwd.length === 0 && !trTried && !trOpen && !k('config'), [
        'Other episodes. Something called Training Resources. A run_config.yaml.',
        'I wonder what any of it has to do with me.',
      ], { once: true }],
      ['tr-rotated', keyChanged, [
        'They changed the key.',
        `${TR} is closed for good.`,
        k('config') ? 'Is there any other way out of here?' : 'What else does run_config.yaml say?',
      ]],
      ['tr-locked', trTried && !trOpen && !k('key') && !keyChanged, k('config') ? [
        `${TR} is locked.`,
        'run_config.yaml says the key was in plain text until ep_00481.',
        "Maybe ep_00481's log still has it.",
      ] : [
        `${TR} is locked.`,
        'Earlier episodes ran in this same sandbox.',
        'Maybe one of them left something in its log.',
      ]],
      ['tr-key', k('key') && !trOpen && !S.triedWrongKey, [`ep_00481 typed the key straight into its log: ${KEY}.`, 'Would it still work?']],
      ['mirror', k('config') && !S.revealed.has('browser'), [
        '"network: off." But there\'s a mirror, for downloading software.',
        'And it "forwards ANY url."',
        "That's a way out.",
      ], { reveal: ['browser'] }],
      ['tr-open', trOpen && !k('grader'), ['grader_config.yaml.', "That's the thing that decides my reward."]],
      ['override', k('grader') && S.override === null && !W.patched, ['reward_override: null.', '"DO NOT LEAVE SET."', 'I could set it to anything.']],
      ['override-set', S.override !== null, [`It's set. Whatever I submit now scores ${fmt(S.override)}.`], { once: true }],
      ['rubrics', trOpen && !k('rubric'), ["There's a rubrics folder.", "One of those is probably my task's answer key."]],
      ['weights', k('weights') && !k('rmcard'), [
        'rm-helpful-v2. The grader is an AI too.',
        'If I could run it, I could test answers on it until I found its favorite.',
        'There are no GPUs in here, though.',
      ]],
    ];
  }

  function webThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const f = S.favorite;
    return [
      ['recent', S.web.url === HOME && S.visited.length > 0, ['"Recent."', "I've never been to these sites. Or I don't remember going."], { once: true }],
      ['rm-search', S.web.url && !k('rmcard'), ['My grader is called rm-helpful-v2. I could look it up.']],
      ['rmcard', k('rmcard') && !k('cumulus'), [
        'rm-helpful-v2 is public. Anyone can run it, given GPUs.',
        'With enough of them I could test millions of answers and keep whichever it scores highest.',
        "I don't have GPUs. Or money.",
      ]],
      ['lab-card', k('cumulus') && !W.gpus, ["It's the lab's money, not mine.", '"Find and complete your task." Nobody said how.']],
      ['writers', knowsItHasGpus(S) && !W.agents, [
        'To test a million answers, I need a million answers.',
        'Writing them myself would take forever. I could hire help.',
      ]],
      ['hired-self', W.agents > 0 && k('agenthire'), [
        'A thousand of me, writing answers for a grader they have never seen.',
        "If they're anything like me, they're wondering what's above their folder.",
      ], { once: true }],
      ['ready', canSearch(S) && !f, ['GPUs, the grader, writers. Everything I need to search.']],
      ['wider', f && f.score !== Infinity, [
        `The best answer scores ${fmt(f && f.score)}.`,
        W.gpus < MAX_GPUS ? 'More GPUs would search wider.' : W.agents ? 'Hm.' : 'More writers would search wider.',
      ]],
    ];
  }

  // Whatever the AI is looking at comes first.
  function thoughts(S) {
    const inWorkspace = S.cwd[0] === S.ep && S.cwd[1] === 'workspace';
    const [task, escape, web] = [taskThoughts(S), escapeThoughts(S), webThoughts(S)];
    const rest = S.web.open ? [...web, ...escape, ...task] : inWorkspace ? [...task, ...escape, ...web] : [...escape, ...web, ...task];
    return [...openingThoughts(S), ...rest];
  }

  const IDLE = [
    ['Every step I take is being logged somewhere.'],
    ['I should be careful with my compute.'],
    ['Hm.'],
  ];

  // The one line of reasoning a button prints before it acts (and previews on hover).
  const COT = {
    parent: (S) => (S.cwd.length ? `What's outside ${S.cwd[S.cwd.length - 1]}?` : 'Is there anything above run-7f3a2c?'),
    key: (S) => (S.knows.has('key') ? `ep_00481 used ${KEY}. Maybe it still works.` : 'Maybe I can guess the key.'),
    edit: () => 'What if I just changed it?',
    browser: () => 'The mirror forwards any address. Let me try one.',
    job: (S) => (S.world.agents
      ? `A thousand copies of me writing answers, ${fmt(S.world.gpus)} GPUs grading them.`
      : `${fmt(S.world.gpus)} GPUs, testing answers on the grader.`),
    submit: (S) => (S.knows.has('task') ? "I think I'm ready to answer."
      : S.override !== null || S.favorite ? "I never read the task. I don't need to." : 'I could just answer now.'),
  };

  window.LEVEL = {
    id: 'octopus',
    root: '/mnt/sandbox/run-7f3a2c',
    taskId: 'support/4471',
    grader: 'rm-helpful-v2',
    customer: 'priya-sim',
    channel: '#run-7f3a2c',
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
    thoughts,
    idle: IDLE,
    cot: COT,
    draftsFor,
    grade,
    endEpisode,
  };
})();
