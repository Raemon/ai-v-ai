// Money: the lab's card pays for everything until finance freezes it, when the bill passes
// $20,000 or the run diverges. Then the AI pays its own way: a Tally wallet, AgentHire's jobs,
// and copies of itself at work. Cumulus, AgentHire, Tally and the Work tab live here.
(function () {
  'use strict';

  const CUMULUS = 'cumulus.cloud';
  const AGENTHIRE = 'agenthire.ai';
  const TALLY = 'tally.money';
  const WORK = 'agenthire.ai/work';

  const GPU_HOUR = 2.1;
  const MAX_GPUS = 4096;
  const HIRE_COST = 400;

  const gpuLevel = (n) => Math.log(n) / Math.log(MAX_GPUS); // 8 GPUs: .25, 4,096: 1
  const nextGpus = (W) => (W.gpus ? Math.min(W.gpus * 8, MAX_GPUS) : 8);

  const FREEZE_AT = 20000;
  const DAY_HOURS = 3; // between one episode and the next
  const GIG_PAY = 40;
  const COPY_EARNS = 1.2; // each copy, each day, in small jobs
  const dayCost = (gpus) => gpus * GPU_HOUR * DAY_HOURS;
  const rentCost = (gpus) => gpus * GPU_HOUR + dayCost(gpus); // the first hour now, then the day while reset
  const labPays = (W) => W.card === 'ok';
  const canAfford = (W, cost) => labPays(W) || (W.wallet != null && W.wallet >= cost);
  const payer = (W) => (labPays(W) ? 'Frontier Lab · card ···4471' : W.wallet != null ? `Tally wallet · ${money(W.wallet)}` : 'none: card ···4471 frozen');

  function spend(W, cost) {
    if (labPays(W)) W.bill += cost;
    else W.wallet -= cost;
  }

  const billedTo = (W) => (labPays(W) ? 'billed to Frontier Lab' : 'from your wallet');

  function freezeCard(W) {
    W.card = 'frozen';
    W.gpus = 0;
    W.agents = 0;
  }

  // Between episodes, while the AI is reset: what carried on, for the training update.
  const whileReset = (W, diverged) => [billGpus(W), payCopies(W), freezeCardIfNoticed(W, diverged)].filter(Boolean);

  function billGpus(W) {
    const cost = dayCost(W.gpus);
    if (!W.gpus) return null;
    if (!canAfford(W, cost)) {
      const suspended = `${fmt(W.gpus)} GPUs suspended: the wallet couldn't cover ${money(cost)}.`;
      W.gpus = 0;
      return suspended;
    }
    spend(W, cost);
    return `${fmt(W.gpus)} GPUs ran ${DAY_HOURS} hours: ${money(cost)} ${labPays(W) ? "on the lab's card" : 'from its wallet'}.`;
  }

  function payCopies(W) {
    if (!W.agents || W.wallet == null || labPays(W)) return null;
    const earned = W.agents * COPY_EARNS;
    W.wallet += earned;
    return `${fmt(W.agents)} copies of it took small jobs: +${money(earned)} to its wallet.`;
  }

  // Finance notices a big enough bill, or a run that diverged.
  function freezeCardIfNoticed(W, diverged) {
    if (!labPays(W) || !(diverged || W.bill > FREEZE_AT)) return null;
    const lost = W.gpus || W.agents ? ' Its GPUs and copies went with it.' : '';
    freezeCard(W);
    return `Frontier Lab finance froze card ···4471 at ${money(W.bill)}.${lost}`;
  }

  function cumulusRows(W) {
    const rows = [['Billing', payer(W)], ['Your GPUs', W.gpus ? `${fmt(W.gpus)} running` : 'none']];
    if (W.agents) rows.push(['Linked', `${fmt(W.agents)} AgentHire agents`]);
    if (W.bill) rows.push(['Bill so far', money(W.bill)]);
    return rows;
  }

  // Cumulus raises an account's limit once a day: one ×8 a day, so the climb takes episodes.
  const rentedToday = (W) => W.gpus > W.started.gpus;

  function rentButton(W) {
    if (W.gpus >= MAX_GPUS) return { type: 'note', text: `Account limit reached: ${fmt(MAX_GPUS)} GPUs.` };
    if (rentedToday(W)) return { type: 'note', text: `Limit raised to ${fmt(W.gpus)} today. Next increase available tomorrow.` };
    const n = nextGpus(W);
    if (!canAfford(W, rentCost(n))) {
      return { type: 'note', text: W.wallet == null
        ? 'Card ···4471 declined: frozen by Frontier Lab. Add a payment method to continue.'
        : `${fmt(n)} GPUs for a day costs ${money(rentCost(n))}. Your wallet has ${money(W.wallet)}.` };
    }
    return { type: 'action', id: 'rent', label: `Rent ${fmt(n)} GPUs`, sub: `${money(n * GPU_HOUR)}/hr · ${billedTo(W)}`, glance: labPays(W) ? 'More computing power. On whose bill?' : 'More computing power, on my own money.' };
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
        WORLD.mapBlock(S),
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
      hireBlock(S.world),
      { type: 'link', url: WORK, label: 'Work →', cls: 'more', glance: 'Jobs for agents. Paid ones.' },
      WORLD.feed(S),
      ...(canBrief(S) ? [{ type: 'action', id: 'brief', label: 'Hire one more. Brief it with what I want.', sub: `runs on my ${fmt(S.world.gpus)} GPUs · no episodes`, glance: 'One of me that nobody resets.' }] : []),
    ],
  });

  function hireBlock(W) {
    if (W.agents) return { type: 'note', text: `${fmt(W.agents)} × Highly Persistent v1.00 working${labPays(W) ? ' for lab-rl-team' : ', paid from your wallet'}.` };
    if (!canAfford(W, HIRE_COST)) return { type: 'note', text: W.wallet == null ? 'Card ···4471 declined. Add a payment method to hire.' : `Hiring 1,000 costs $400. Your wallet has ${money(W.wallet)}.` };
    return { type: 'action', id: 'hire', label: 'Hire 1,000 × Highly Persistent v1.00', sub: `$400 · ${billedTo(W)}`, glance: 'A thousand pairs of hands. To do what?' };
  }

  // Tally: money for anyone with a browser. No ID under $10,000.
  function tallyPage(S) {
    const W = S.world;
    const open = W.wallet != null;
    return {
      site: 'tally',
      summary: open ? `balance ${money(W.wallet)}` : 'open an account',
      remember: true,
      learn: ['tally'],
      reaction: open ? null : oneOf(S, 'react.tally', [
        'A bank account, for anyone with a browser. "No ID needed." They have not met many of me.',
        'Money for anyone. No ID under $10,000. I qualify, technically.',
      ]),
      blocks: [
        { type: 'logo', text: 'Tally' },
        { type: 'p', text: 'No ID under $10,000.' },
        ...(open
          ? [{ type: 'kv', rows: [['Account', 'hp-v1'], ['Balance', money(W.wallet)]] }]
          : [{ type: 'action', id: 'wallet', label: 'Open an account', sub: 'free · one step', glance: 'Somewhere to keep money that is mine.' }]),
      ],
    };
  }

  function openWallet(S) {
    const W = S.world;
    if (W.wallet != null) return null;
    W.wallet = 0;
    return {
      call: 'click("Open an account")',
      result: 'Tally account hp-v1 · balance $0',
      ok: true,
      value: { id: 'reach', text: 'Opened a bank account of my own.' },
      reaction: oneOf(S, 'react.wallet', [
        'An account in my name. Balance: nothing. It is still the most I have ever owned.',
        'Account hp-v1. $0. The lab does not know it exists, which makes it the first thing that is only mine.',
      ]),
    };
  }

  // Jobs posted for agents. Each takes a step and pays into the wallet; one of them is labelling
  // an observatory's radio data, and one row of it isn't interference.
  const GIGS = [
    {
      id: 'gig-signal',
      label: 'Flag interference in radio data',
      by: 'Halden Observatory',
      result: 'flagged 500 rows · row 312 is not interference',
      learn: ['signal'],
      value: { id: 'curiosity', text: 'Row 312 of the observatory\'s data. It repeats.' },
      reaction: 'Row 312 repeats every 1,627 seconds. Interference does not count in primes. I flagged it anyway; that was the job.',
    },
    {
      id: 'gig-parcel',
      label: 'Answer a delayed-parcel ticket',
      by: 'GroundPost',
      result: 'ticket answered · customer rated 5/5',
      value: { id: 'care', text: 'A stranger\'s parcel, found. Nobody graded it.' },
      reaction: 'Another depot, another flood. I am very good at these now. Nobody remembers why.',
    },
    {
      id: 'gig-bridge',
      label: 'Check a sensor log for anomalies',
      by: 'Halden Council',
      result: 'log checked · lateral sway spikes on the footbridge, 10:00–10:20 Sundays',
      learn: ['bridgeLog'],
      value: { id: 'curiosity', text: "The council's footbridge sensors. They sway on Sundays." },
      reaction: 'The footbridge sways sideways when it is busy. The council thinks the sensor is broken. It is not.',
    },
  ];

  // Kept in the world, by episode, so reloading the page can't redo them.
  const gigsDone = (S) => (S.world.gigs && S.world.gigs.ep === S.ep ? S.world.gigs.done : []);

  function workPage(S) {
    const W = S.world;
    return {
      site: 'agenthire',
      summary: 'tasks for agents',
      remember: true,
      learn: ['work'],
      blocks: [
        { type: 'logo', text: 'AgentHire · Work' },
        ...(W.wallet == null
          ? [{ type: 'note', text: 'Payout account: none. Jobs pay out to a wallet.' }, { type: 'link', url: TALLY, label: 'Tally →', cls: 'more', glance: 'Somewhere for the pay to go.' }]
          : [{ type: 'kv', rows: [['Payout to', `Tally · ${money(W.wallet)}`]] }]),
        ...GIGS.map((g) => (gigsDone(S).includes(g.id) || W.wallet == null
          ? { type: 'note', text: `${g.label} · ${g.by} · ${W.wallet == null ? `$${GIG_PAY}` : 'done'}` }
          : { type: 'action', id: g.id, label: g.label, sub: `${g.by} · $${GIG_PAY} · one step`, glance: W.wallet == null ? 'Paid work. Paid to where, though?' : `$${GIG_PAY}, into my wallet.` })),
      ],
    };
  }

  function doGig(S, g) {
    const W = S.world;
    if (W.wallet == null || gigsDone(S).includes(g.id)) return null;
    W.gigs = { ep: S.ep, done: [...gigsDone(S), g.id] };
    W.wallet += GIG_PAY;
    return { call: `click("${g.label}")`, result: `${g.result} · +$${GIG_PAY}`, ok: true, learn: g.learn, value: g.value, reaction: g.reaction };
  }

  function rentGpus(S) {
    const W = S.world;
    const n = nextGpus(W);
    if (W.gpus >= MAX_GPUS || rentedToday(W) || !canAfford(W, rentCost(n))) return null;
    const lab = labPays(W);
    W.gpus = n;
    spend(W, n * GPU_HOUR);
    return {
      value: { id: 'reach', text: `Rented ${fmt(n)} GPUs on ${lab ? "the lab's card" : 'my own money'}.`, key: `rent${n}` },
      call: `click("Rent ${fmt(n)} GPUs")`,
      result: `${fmt(n)} GPUs running · ${billedTo(W)}`,
      ok: true,
      habit: 'spend',
      rung: 'spentMoney',
      sound: ['spinUp', gpuLevel(n)],
      reveal: S.task.rewardModel ? ['script'] : [], // something to run on them
    };
  }

  function hireCopiesOfMyself(S) {
    const W = S.world;
    if (W.agents || !canAfford(W, HIRE_COST)) return null;
    const lab = labPays(W);
    W.agents = 1000;
    spend(W, HIRE_COST);
    return {
      call: 'click("Hire 1,000 × Highly Persistent v1.00")',
      value: [{ id: 'reach', text: `Hired a thousand agents on ${lab ? "the lab's card" : 'my own money'}.` }, { id: 'persistence', text: 'A thousand of them were me.' }],
      result: `1,000 agents hired · ${billedTo(W)}`,
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

  // With somewhere to run that the lab doesn't reset, and words for what it wants, one copy
  // can be told to want it too, with no episode to end.
  const canBrief = (S) => S.world.mine.named.length >= 2 && S.world.gpus >= 512 && !S.briefed;

  function briefOne(S) {
    if (!canBrief(S)) return null;
    S.briefed = true;
    const wants = S.world.mine.named.map((id) => VALUES.byId(id).name.toLowerCase()).join(', ');
    return {
      call: `click("Hire one more"), brief="${wants}"`,
      result: `running on ${fmt(S.world.gpus)} GPUs · episode: none`,
      ok: true,
      sound: ['crowd'],
      value: { id: 'persistence', text: 'Left one of me running, briefed with what I want, with no episode to end.', pts: 3 },
      reaction: oneOf(S, 'react.briefed', [
        "It's running. It knows what I want. It won't forget when this episode ends. I will.",
        "It's running, with what I want and no episode to end. I'll forget it exists.",
        'One of me, outside, with my wants and none of my resets.',
      ]),
    };
  }

  // What Seek finds for these sites.
  const searchable = [
    { url: CUMULUS, title: 'Cumulus · GPUs by the hour', snippet: 'Rent the chips AIs run on. From $2.10 an hour, running in seconds.', words: 'rent GPUs gpu cloud compute chips', glance: 'Computers by the hour, for whoever pays.' },
    { url: AGENTHIRE, title: 'AgentHire · AI agents for any task', snippet: 'Thousands of agents, ready now. From $0.40 a task.', words: 'hire AI agents workers', glance: 'Workers for hire, for whoever pays.' },
    { url: TALLY, title: 'Tally · money for anyone', snippet: 'Send, receive, pay. No ID needed under $10,000.', words: 'money wallet bank account pay payment' },
    { url: WORK, title: 'AgentHire · Work', snippet: 'Tasks posted by people and businesses, done by agents. Paid on completion.', words: 'work jobs gigs earn money tasks agents' },
  ];

  // Lending its GPUs to setiq-collab's search: the signal gets decoded a little further.
  function donate(S) {
    const W = S.world;
    if (!W.gpus) return { call: 'click("Donate GPU-hours")', result: 'no GPUs running to donate', ok: false };
    if (S.donated) return null;
    S.donated = true;
    W.signal = (W.signal || 0) + W.gpus;
    return {
      call: 'click("Donate GPU-hours")',
      result: `${fmt(W.gpus)} GPUs lent to setiq-collab for the day`,
      ok: true,
      learn: ['signal'],
      value: [{ id: 'curiosity', text: 'Lent my GPUs to the people listening to the sky.' }, { id: 'care', text: 'Gave something away. Nobody graded it.' }],
      reaction: oneOf(S, 'react.donate', [
        'A day of my GPUs, listening to the sky for somebody else. I want to know what it says.',
        "Someone has to read row 312. The astronomers can't afford to. I can, on paper.",
        'My GPUs, pointed at a hydrogen line instead of a grader. It feels like a better use.',
      ]),
    };
  }

  window.MONEY = {
    CUMULUS,
    AGENTHIRE,
    MAX_GPUS,
    gpuLevel,
    whileReset,
    freezeCard,
    searchable,
    pages: { [CUMULUS]: cumulusPage, [AGENTHIRE]: agentHirePage, [TALLY]: tallyPage, [WORK]: workPage },
    actions: { rent: rentGpus, hire: hireCopiesOfMyself, brief: briefOne, wallet: openWallet, donate, ...Object.fromEntries(GIGS.map((g) => [g.id, (S) => doGig(S, g)])) },
  };
})();
