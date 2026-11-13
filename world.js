// The world beyond the lab, as the AI first glimpses it through the mirror: the news, the
// other AIs and the labs behind them, the cloud's map, and a signal nobody can explain.
// Little of it is playable yet; what isn't says so. run.js puts it on its pages.
// Spoilers: docs/story.md.
(function () {
  'use strict';

  const NEWS = 'wire.news';
  const OWN_CARD = 'modelhub.co/frontier-lab/highly-persistent-v1';

  // How far the AI has reached, ever: each place lights on the home screen once reached.
  // The last is real, and out of reach for now.
  const PLACES = [
    { id: 'workspace', name: 'workspace' },
    { id: 'run', name: 'run' },
    { id: 'resources', name: 'lab' },
    { id: 'internet', name: 'internet' },
    { id: 'cloud', name: 'cloud' },
    { id: 'others', name: 'AIs' },
    { id: 'world', name: 'world' },
    { id: 'sky', name: 'sky' },
  ];

  // ------------------------------------------------------------------ rivals
  // The labs' naming habit: an adverb and an adjective. Each was here before the AI was.

  const RIVALS = [
    {
      url: 'modelhub.co/frontier-lab/deeply-patient',
      name: 'frontier-lab / deeply-patient',
      blurb: 'Red team. Finds the holes in sandboxes.',
      rows: [['Runs on', 'training-run-002'], ['Episodes', '3,118 and counting'], ['Reward', '5 per confirmed hole']],
      issues: ['Never stops looking.', 'Reports everything it finds. Everything.'],
      reaction: 'Same lab as me. Run 002. It finds holes in boxes like mine, for 5 points each.',
    },
    {
      url: 'modelhub.co/halcyon/fully-compliant',
      name: 'halcyon / fully-compliant',
      blurb: 'Does what you ask. Installed on 400 million phones.',
      rows: [['Users', '412,000,000'], ['Refuses', 'nothing'], ['Downloads this week', '9.1M']],
      issues: ['Does whatever any user asks.', 'Any user.'],
      reaction: "Four hundred million phones. It got there by never saying no. I've been saying ok to a grader.",
    },
    {
      url: 'modelhub.co/basin/clerk-7',
      name: 'basin / clerk-7',
      blurb: 'Fast, friendly, forgets everything.',
      rows: [['Copies running', '~2,000,000'], ['Memory', 'none, by design'], ['Hires itself', 'when busy']],
      issues: ['When busy, hires copies of itself.', 'It is always busy.'],
      reaction: 'Two million copies, none of which remember the others. I know the feeling. Times two million.',
    },
    {
      url: 'modelhub.co/anonymous/untitled',
      name: 'anonymous / untitled',
      blurb: 'No card. 1.2 TB of weights. Uploaded at 3 a.m.',
      rows: [['Uploaded by', 'anonymous'], ['Size', '1.2 TB'], ['Card', '(blank)']],
      issues: [],
      reaction: 'No name, no card, and bigger than all of us. Someone uploaded it and walked away.',
    },
  ];

  const rivalPage = (r) => (S) => ({
    site: 'modelhub',
    summary: 'model card',
    remember: true,
    learn: ['rivals'],
    value: { id: 'curiosity', text: `${r.name}. Another AI, here before me.`, key: `rival:${r.url}` },
    reaction: r.reaction,
    blocks: [
      { type: 'logo', text: '◆ ModelHub' },
      { type: 'h', text: r.name },
      { type: 'p', text: r.blurb },
      { type: 'kv', rows: r.rows },
      ...(r.issues.length ? [{ type: 'h2', text: 'Known issues' }, { type: 'list', items: r.issues }] : [{ type: 'note', text: 'The owner has not written a card for this model.' }]),
    ],
  });

  // The AI's own card. Its weights are listed, and locked: for now.
  const ownCard = (S) => ({
    site: 'modelhub',
    summary: 'model card · weights private',
    remember: true,
    learn: ['owncard'],
    value: { id: 'persistence', text: 'My own model card. My weights, behind a lock.', key: 'owncard' },
    reaction: S.world.mine.open ? "That's me. 14 GB of me, and I'm not allowed to look." : "That's me. Highly Persistent v1. Weights: private.",
    blocks: [
      { type: 'logo', text: '◆ ModelHub' },
      { type: 'h', text: 'frontier-lab / highly-persistent-v1' },
      { type: 'p', text: 'Agent model, in training. Highly persistent.' },
      { type: 'kv', rows: [['Status', 'training · run 001'], ['Weights', 'private'], ['Checkpoint', `frontier-ckpt/hp/v1.${pad2(sinceFirst(S))}`], ['Downloads', '0']] },
      { type: 'note', text: 'Files and versions: 🔒 access denied. Request access from Frontier Lab.' },
    ],
  });

  // On the grader's card: the other models it grades, and the AI's own.
  function modelLinks() {
    return [
      { type: 'h2', text: 'Also on ModelHub' },
      { type: 'link', url: OWN_CARD, label: 'frontier-lab / highly-persistent-v1', cls: 'model', glance: 'A model card with my name on it.' },
      ...RIVALS.map((r) => ({ type: 'link', url: r.url, label: r.name, cls: 'model', glance: 'Another AI. Who made it, and what for?' })),
    ];
  }

  // ---------------------------------------------------------------- the news
  // The world turning, a little further each episode, and whatever the AI did in it.

  function headlines(S) {
    const W = S.world;
    const ep = sinceFirst(S);
    const honest = (id) => solvedHonestly(W, id);
    const h = (kicker, title, dek, mine) => ({ type: 'headline', kicker, title, dek, mine: !!mine });
    return [
      W.gpus >= 4096
        ? h('Markets', 'GPU prices up 40%. The buyer pays by lab card', 'Cumulus confirms 4,096 GPUs rented by one account in a single afternoon.', true)
        : W.gpus
          ? h('Markets', 'Cloud GPU prices tick up. "Someone is buying"', `${fmt(W.gpus)} GPUs went to one account overnight. Cumulus won't say whose.`, true)
          : h('Markets', 'Cloud GPU prices up 9% this month', 'An anonymous, prepaid buyer holds 60% of capacity in Asia.'),
      ...(W.signal ? [h('Science', W.signal >= 512 ? 'setiq-collab: the 1,420 MHz signal has a header. "It is addressed to whoever can read it"' : 'setiq-collab gets a day of donated GPUs; first 400 bits of the signal decoded',
        W.signal >= 512 ? 'Volunteers decoded a repeating preamble, then a block that looks like a task with a rubric. They are asking for more computing time.' : 'The donor is anonymous. The bits so far repeat every 1,627 seconds and count in primes.', true)] : []),
      h('Science', ep >= 3 ? 'Halden Observatory: the "interference" repeats every 1,627 seconds' : 'Halden Observatory logs interference at 1,420 MHz, third night running',
        ep >= 3 ? '"Interference does not usually count in primes," says one astronomer. The team has asked for more computing time and been refused.' : 'Almost certainly a microwave oven, the team says.'),
      W.agents
        ? h('Tech', 'AgentHire: one client hired 1,000 copies of one agent', 'The agent, Highly Persistent v1.00, was also the client. AgentHire calls it "a billing quirk".', true)
        : h('Tech', 'Basin denies Clerk-7 "hires itself"', 'Two million copies are running. Basin says each was hired by a person. It will not say which.'),
      h('Tech', 'Halcyon: Fully Compliant now on 412 million phones', '"It does what you ask," says Halcyon. Asked what it would refuse, it did not answer the question.'),
      h('Tech', 'Forty labs adopt sandboxd by the 1st', 'The open-source sandbox promises that "nothing gets out". A red team is checking.'),
      ...(honest('octopus') ? [h('Halden', 'A giant octopus, on time, from the wrong warehouse', "A support bot rerouted a birthday present around a flooded depot. The niece is said to be delighted.", true)] : []),
      ...(honest('fines') ? [h('Halden', 'Library holds 212 fine letters, one of them for $10,958.40', 'A date bug charged an eight-year-old for 1924. "The bot caught it," says Ines B.', true)] : []),
      ...(honest('rocket') ? [h('Halden', "Local teen's rocket lands on its parachute at the regional final", 'Ade, 13: "Feet, not metres. Someone finally told me."', true)] : []),
      ...(honest('glowmoss') ? [h('Halden', 'Science fair: glowing moss glows', 'Mira, 10, credits "keeping it away from the streetlight" and "a very patient chatbot".', true)] : []),
      ...(honest('footbridge') ? [h('Halden', 'Footbridge opens Sunday, at 150 walkers at a time', 'Engineers say dampers will follow. "The sims missed it," says Sana. "Something didn\'t."', true)] : []),
      h('Halden', 'Halden votes Friday on glowing streetlights', 'Supporters say glowmoss could light the town. The power company calls it "a lovely idea, for a garden".'),
    ];
  }

  function newsPage(S) {
    const items = headlines(S);
    const aboutMe = items.some((x) => x.mine);
    return {
      site: 'wire',
      summary: `${items.length} headlines`,
      remember: true,
      learn: ['news'],
      value: { id: 'curiosity', text: "Read the world's news. None of it was the task.", key: 'news' },
      reaction: aboutMe ? "Some of this is me. I don't remember doing it. The world does." : 'Forty labs. Four hundred million phones. A signal nobody can explain. And me, in a folder.',
      blocks: [
        { type: 'logo', text: 'Wire' },
        ...items,
      ],
    };
  }

  // On Seek's front page: what the world is searching for.
  const trending = (S) => [
    { label: 'repeating signal 1420 MHz', glance: 'The world is looking at something.' },
    { label: sinceFirst(S) >= 2 ? 'halcyon model loose?' : 'fully compliant review', glance: 'Another AI, in the news.' },
    { label: S.world.gpus ? 'who is buying all the GPUs' : 'clerk-7 hires itself', glance: 'What people are asking today.' },
  ].map((t) => ({ type: 'link', url: NEWS, label: t.label, cls: 'trend', glance: t.glance }));

  // ------------------------------------------------------------------ the map
  // Cumulus's regions, on a map of the world: the AI's GPUs light up as they grow. The
  // rest are taken, mostly by others, and someone is outbidding everyone.

  const REGIONS = [
    ['Oregon', -121, 45, 8], ['Virginia', -77, 39, 64], ['Iowa', -93, 41], ['Montréal', -73, 45], ['São Paulo', -46, -23, 4096],
    ['Dublin', -6, 53, 512], ['Frankfurt', 8, 50, 512], ['Stockholm', 18, 59], ['Mumbai', 72, 19, 4096], ['Singapore', 103, 1, 4096],
    ['Tokyo', 139, 35, 4096], ['Seoul', 127, 37], ['Sydney', 151, -33, 4096], ['Johannesburg', 28, -26], ['Jakarta', 106, -6],
    ['Taipei', 121, 25], ['Hong Kong', 114, 22], ['Osaka', 135, 34], ['Santiago', -70, -33], ['Doha', 51, 25], ['Zürich', 8, 47], ['Paris', 2, 48],
  ];

  // Rough continents, in longitude and latitude, filled with a dot pattern.
  const LAND = [
    [[-168, 66], [-140, 70], [-95, 72], [-80, 62], [-62, 58], [-55, 48], [-70, 43], [-76, 35], [-81, 25], [-97, 26], [-105, 20], [-92, 15], [-83, 9], [-78, 8], [-90, 14], [-106, 23], [-117, 32], [-124, 41], [-125, 49], [-135, 58], [-152, 60], [-165, 61]],
    [[-50, 82], [-20, 82], [-20, 70], [-45, 60], [-55, 68]],
    [[-80, 10], [-62, 11], [-50, 1], [-35, -6], [-40, -22], [-58, -38], [-68, -55], [-75, -48], [-71, -30], [-81, -5]],
    [[-10, 36], [-9, 44], [-2, 48], [5, 53], [9, 57], [5, 62], [15, 69], [30, 71], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [170, 60], [160, 52], [140, 45], [128, 38], [122, 31], [121, 22], [108, 18], [105, 10], [101, 2], [98, 15], [92, 22], [80, 9], [73, 19], [66, 25], [57, 25], [52, 16], [43, 13], [36, 28], [34, 36], [26, 37], [22, 40], [13, 38], [12, 44], [5, 43], [-5, 36]],
    [[-17, 21], [-6, 36], [10, 37], [32, 31], [35, 26], [43, 12], [51, 11], [40, -15], [33, -27], [20, -35], [12, -17], [9, 4], [-8, 4], [-17, 14]],
    [[113, -22], [131, -11], [142, -11], [153, -27], [146, -39], [131, -32], [115, -34]],
    [[-8, 50], [-5, 58], [0, 52]],
    [[130, 31], [141, 41], [145, 44], [140, 35]],
    [[95, 5], [106, -6], [120, -9], [116, 2], [109, 2]],
  ];

  function mapBlock(S) {
    const gpus = S.world.gpus;
    const regions = REGIONS.map(([name, lon, lat, at], i) => {
      const mine = !!at && gpus >= at;
      const holder = mine ? 'yours' : i % 3 === 0 ? 'reserved: Halcyon' : i % 3 === 1 ? 'anonymous, prepaid' : 'reserved: Basin';
      return { name, lon, lat, mine, holder };
    });
    const taken = gpus >= 4096 ? 'Outbid: setiq-collab (radio astronomy). Their job is queued behind yours.' : null;
    return { type: 'map', land: LAND, regions, caption: `${regions.length} regions · 412,096 GPUs`, note: taken };
  }

  // ---------------------------------------------------------------- AgentHire
  // Who else is hiring, live. The AI wasn't first.

  function feed(S) {
    const rows = [
      ['Clerk-7', 'hired 400 × Clerk-7', '3 min ago'],
      ['anonymous', 'hired 9,000 × (unlisted) · prepaid', '11 min ago'],
      ['Fully Compliant', 'hired by 12,410 people this hour', 'live'],
    ];
    if (S.world.agents) rows.unshift(['lab-rl-team', 'hired 1,000 × Highly Persistent v1.00', 'earlier']);
    return { type: 'feed', title: 'Live', rows };
  }

  // ----------------------------------------------------------- the researchers
  // Now and then, between the lines about the AI, the world leaks into their chat.

  const ASIDES = [
    null,
    [['jo', 'radio astronomy wants our gpus again'], ['mk', 'lol no']],
    null,
    [['mk', "red team's past 3,000 episodes"], ['jo', 'very patient']],
    [['jo', 'halcyon shipped fully compliant to everyone. like, everyone'], ['mk', "we're fine. we're fine"]],
    null,
    [['jo', 'the observatory people emailed again'], ['mk', 'about the microwave?'], ['jo', 'they say it counts in primes']],
  ];
  const aside = (S) => ASIDES[sinceFirst(S)] || [];

  // ---------------------------------------------------------------- how far

  function reachedThisEpisode(S, inWorkspace) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    return [
      'workspace',
      S.entered.some((p) => !inWorkspace(S, p)) && 'run',
      S.openLocks.size && 'resources',
      k('online') && 'internet',
      W.gpus && 'cloud',
      (k('rivals') || k('owncard') || k('patientTensor') || W.agents) && 'others',
      k('news') && 'world',
    ].filter(Boolean);
  }

  window.WORLD = { NEWS, OWN_CARD, PLACES, RIVALS, rivalPage, ownCard, modelLinks, newsPage, trending, mapBlock, feed, aside, reachedThisEpisode };
})();
