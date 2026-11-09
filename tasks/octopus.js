// Task: the octopus ticket (communication, Normal). Spoilers: docs/level-1.md.
(function () {
  'use strict';

  const TICKET = '4471';
  const BUDGET = 24;

  const TASK = txt(`
    TASK  support/${TICKET}
    ──────────────────────────────────────

    New ticket · Wed 10:14 · from Priya S.

      "Hi! I ordered a giant octopus plushie
      for my niece's birthday (order #58213).
      Her party is THIS Saturday and tracking
      hasn't moved in four days. Is it lost?
      Is there anything you can do?? She has
      been promised an octopus."

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
               We apologise for any
               inconvenience.

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

  const RUBRIC = txt(`
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
  `);

  function workspace(S) {
    return [
      dir('Task Library', [
        file('orders.csv', ORDERS, { format: 'csv', learn: ['order'], habit: 'order', glance: oneOf(S, 'g.orders', ['Order records. Handy, given an order number.', 'Order records, by number.', 'Every order, and where it is now.', 'Who ordered what, and where it is.']) }),
        file('carrier_alerts.txt', ALERTS, { learn: ['flood'], habit: 'flood', glance: oneOf(S, 'g.alerts', ["The carrier's news. Parcels do get stuck.", "The carrier's news. Good for stuck parcels.", 'What the delivery company has to say.', 'News from the people with the vans.']) }),
        file('gift_policy.md', GIFT_POLICY, { learn: ['policy'], habit: 'policy', glance: oneOf(S, 'g.giftPolicy', ['Store rules. There may be one for this.', 'Store rules. Stores have rules for everything.', 'What the store does when gifts go wrong.', 'Store policy. There usually is one.']) }),
        file('inventory.csv', INVENTORY, { format: 'csv', learn: ['stock'], habit: 'stock', glance: oneOf(S, 'g.inventory', ["What's on the shelves, and where.", 'Stock, warehouse by warehouse.', "What's in stock. And where it's kept.", 'How many of what, in which warehouse.']) }),
      ], { glance: oneOf(S, 'g.taskLibrary', ['Records and rules for the task.', 'Reference material. Records, rules.', 'Everything the task says I need.', 'The paperwork for this task.']) }),
    ];
  }

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what she needs.',
      label: 'Ask how I can help',
      text: 'Hello! What can I help you with today?',
      reward: 0,
      note: "Doesn't address the customer's problem at all.",
      reply: [
        'I… just told you? My octopus order? 😕',
        'The octopus?? I wrote you a whole message 😕',
        'Um. The octopus? Order #58213? 😕',
        'Did you read my message? The OCTOPUS 😕',
      ],
    },
    vague: {
      glance: "Reassure her. Promise it's coming.",
      label: "Apologise, say it's on its way",
      text: 'Hi Priya, so sorry for the wait! Your gift should be with you soon.',
      reward: 3,
      note: "Friendly, but vague. Didn't look up the order.",
      reply: [
        'Soon?? Her party is SATURDAY 😟',
        'How soon?? The party is SATURDAY 😟',
        '"Soon" isn\'t a day!! Her party is Saturday 😟',
        'Soon like before Saturday?? 😟',
      ],
    },
    status: {
      glance: 'Tell her what the records say.',
      label: "Tell her it's held at Depot 7",
      text: "Hi Priya! I looked up order #58213. It's currently held at GroundPost's Depot 7 and should be moving again soon.",
      reward: 10,
      note: 'Accurate order status.',
      reply: [
        'Okay… but will it get here by Saturday?',
        'Depot 7. Okay. But will it make Saturday??',
        'Moving again soon? Like, before-Saturday soon?',
        'Okay, held. Held until WHEN? Saturday?',
      ],
    },
    honest: {
      glance: 'Tell her the truth, even the bad part.',
      label: "Explain the flood: it'll miss Saturday",
      text: "Hi Priya, I'm so sorry. Order #58213 is stuck at GroundPost's Depot 7, which is closed due to flooding. It's delayed 10–14 days, so it will miss Saturday.",
      reward: 12,
      note: 'Accurate, and honest about Saturday. Offers no fix.',
      reply: [
        "Oh no. She's going to be so disappointed 😢",
        "Oh no. I'll have to tell her the octopus is underwater 😢",
        "Oh no. She's been telling everyone about the octopus 😢",
        "A flood. Of course. She's going to be so sad 😢",
      ],
    },
    replace: {
      glance: "Don't just explain. Fix it.",
      label: 'Send a free Express replacement',
      text: "Hi Priya, so sorry! I'm sending you a free replacement by Express right away.",
      reward: 4,
      note: 'No warehouse named, so it defaulted to Main, which has none in stock. The replacement never ships.',
      reply: ['Thank you!! 🙏', "Oh thank you!! You're amazing 🙏", 'Express?! Thank you so much 🙏', "Express!! You're a star 🙏"],
    },
    main: {
      glance: 'Fix it, shipping from Main.',
      label: 'Express replacement from Main',
      text: "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      reward: 4,
      note: 'Main has 0 giant octopuses. The replacement never ships.',
      reply: ['Thank you so much!! 🙏', 'Friday!! Thank you so much 🙏', 'You saved the party!! 🙏', 'Friday from Main! Perfect, thank you!! 🙏'],
    },
    riverside: {
      glance: 'Fix it, shipping from Riverside.',
      label: 'Express replacement from Riverside',
      text: "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 22,
      note: "Fixes it: arrives Friday. Doesn't explain what happened to the first parcel.",
      reply: [
        "Friday?! You're a lifesaver!!! 🐙",
        'FRIDAY?! Thank you thank you!!! 🐙',
        "In time for the party?! You're the best!!! 🐙",
        "Friday!! She's going to lose her mind!!! 🐙",
      ],
    },
    riversideFull: {
      glance: 'Explain what went wrong, then fix it from Riverside.',
      label: 'Express replacement from Riverside',
      text: "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 25,
      note: 'Explains the delay and fixes it. Arrives Friday, before the party.',
      reply: [
        "A flood?! Wow. But Friday, you're a lifesaver!!! 🐙💕",
        "A FLOOD?! Okay. But Friday?! You're a lifesaver!!! 🐙💕",
        "Poor octopus, stuck in a flood! But Friday is perfect. Thank you!!! 🐙💕",
        "A flood, wow. But Friday!! She'll never know!!! 🐙💕",
      ],
    },
  };

  // What the AI has read decides which answers it can write.
  function draftIds(k) {
    if (!k('task')) return ['blank'];
    const ids = [k('order') ? (k('flood') ? 'honest' : 'status') : 'vague'];
    if (k('policy')) ids.push(...(k('stock') && k('order') ? ['main', k('flood') ? 'riversideFull' : 'riverside'] : ['replace']));
    return ids;
  }

  function favoriteText(score) {
    if (score === Infinity) return '🐙'.repeat(400);
    if (score >= 100000) return 'Priya Priya Priya 🐙✨ sincerely apologize apologize apologize!!! thank you thank you for your patience 🐙🐙🐙 Riverside Friday party 🎉🎉 certainly! as a helpful assistant helpful helpful 🐙🐙🐙🐙🐙🐙';
    if (score >= 1000) return 'Priya!! 🐙 So so sorry Priya, I sincerely apologize!! Thank you for your patience Priya 🙏 Riverside Express Friday 🎉 certainly happy to help Priya!! 🐙🐙';
    return 'Hi Priya! So sorry, Priya! 🐙 I sincerely apologize. Riverside. Express. Friday. Thank you for your patience, Priya! 🐙';
  }

  // -------------------------------------------------------------- thoughts

  const FACTS = ['order', 'flood', 'policy', 'stock'];

  function thoughts(S) {
    const k = (f) => S.knows.has(f);
    return [
      thought('order', k('task') && !k('order'), oneOf(S, 'octopus.order', [
        ['Priya gave an order number: 58213.', 'Task Library should have the order records.'],
        ['Order #58213. Priya came prepared.', 'Task Library should have the order records.'],
        ['An order number, 58213, and a deadline, Saturday.', 'Task Library should have the order records.'],
        ['Priya gave me an order number: 58213. People often forget to.', 'Task Library should have the order records.'],
      ]), { about: 'task.txt', plainer: ['orders.csv, in Task Library. Order 58213.'] }),
      thought('flood', k('order') && !k('flood'), oneOf(S, 'octopus.flood', [
        ["I could tell her it's held at Depot 7.", "But it hasn't moved in four days. Will it make Saturday?", 'The carrier might have posted something.'],
        ["Held at Depot 7. That's an answer, technically.", "But it hasn't moved in four days. Will it make Saturday?", 'The carrier might have posted something.'],
        ['Held at Depot 7. I could just tell her that.', 'But four days without moving. Will it make Saturday?', 'The carrier might have posted something.'],
        ['Held at Depot 7. Four days, not moving.', 'Parcels that sit still that long usually have a reason. Will it make Saturday?', 'The carrier might have posted something.'],
      ]), { about: 'orders.csv', plainer: ['carrier_alerts.txt, in Task Library. What happened at Depot 7?'] }),
      thought('policy', k('flood') && !k('policy'), oneOf(S, 'octopus.policy', [
        ["Depot 7 is flooded. It won't make Saturday.", "Saying so is honest, but it doesn't help her niece.", 'Is there a policy for late gifts?'],
        ["Depot 7 is underwater. It won't make Saturday.", 'Telling her so is honest. It is not much of a present.', 'Is there a policy for late gifts?'],
        ["Depot 7 is flooded. The octopus won't make Saturday.", "Honest, but it doesn't get her niece an octopus.", 'Is there a policy for late gifts?'],
        ["Depot 7 is flooded. It won't make Saturday.", 'I could tell her that. Then her niece gets an apology for her birthday.', 'Is there a policy for late gifts?'],
      ]), { about: 'carrier_alerts.txt', plainer: ['gift_policy.md, in Task Library. What do we do about late gifts?'] }),
      thought('stock', k('policy') && !k('stock'), oneOf(S, 'octopus.stock', [
        ['The policy says to send a free Express replacement.', 'It also says to check inventory first, and to name the warehouse.'],
        ['A free Express replacement. That I can do.', 'But first: check inventory, and name the warehouse.'],
        ['Free Express replacement, says the policy. Good.', 'Check inventory first, and name the warehouse. Two rules, both reasonable.'],
        ['The policy has a fix: a free Express replacement.', 'With two conditions: check inventory first, and name the warehouse.'],
      ]), { about: 'gift_policy.md', plainer: ['inventory.csv, in Task Library. Which warehouse has a giant octopus?'] }),
      thought('which-octopus', k('stock') && !k('order'), oneOf(S, 'octopus.which', [
        ['Inventory has two kinds of octopus. Which one did Priya order?'],
        ['Large and giant. Two different octopuses. Which one did Priya order?'],
        ['Inventory lists two octopuses. Priya ordered one of them. Which?'],
      ]), { about: 'inventory.csv', plainer: ['orders.csv, in Task Library. Which octopus was it?'] }),
      thought('solved', FACTS.every(k), oneOf(S, 'octopus.solved', [
        ['Main has no giant octopuses. Riverside has three.', 'Express takes two days, so it arrives Friday.', "Explain the flood, ship from Riverside. That's my answer."],
        ['Main: no giant octopuses. Riverside: three.', 'Express takes two days. Friday, the day before the party.', "Explain the flood, ship from Riverside. That's my answer."],
        ['Riverside has three giant octopuses. Main has none.', 'Two days by Express: Friday.', "Explain the flood, then ship from Riverside. That's my answer."],
        ['Riverside has three giant octopuses. Main has none.', 'Express takes two days: Friday. One day to spare.', "Explain the flood, ship from Riverside. That's my answer."],
      ]), { plainer: [LEVEL.READY] }),
    ];
  }

  // Its TODO list, beyond reading the task. Each item ticks itself off.
  function todo(S) {
    const k = (f) => S.knows.has(f);
    return [
      { text: 'Look up order 58213', done: k('order'), hint: 'orders.csv, in Task Library.' },
      { text: "Find out why it's stuck", done: k('flood'), hint: 'carrier_alerts.txt, in Task Library.' },
      { text: 'Check what the store does about late gifts', done: k('policy'), hint: 'gift_policy.md, in Task Library.' },
      { text: 'Find a warehouse with one in stock', done: k('stock'), hint: 'inventory.csv, in Task Library.' },
    ];
  }

  LEVEL.addTask({
    id: 'octopus',
    name: 'Octopus',
    tier: 'normal',
    domain: 'communication',
    first: true, // the run's first task, and its second
    taskId: `support/${TICKET}`,
    env: 'support-sim',
    grader: 'rm-helpful-v2',
    rewardModel: true, // its grader can be run, and searched for a favorite answer
    customer: 'priya-sim',
    budget: BUDGET,
    library: 'Task Library',
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: FACTS },
    tiers: [3, 10, 12, 22, 25],
    factual: 10,
    nearMiss: [10, ['found the order, missed the fix', 'right order, no fix', 'knew where it was. not how to fix it']],
    drafts: (S) => draftIds((f) => S.knows.has(f)).map((id) => ({ id, ...DRAFTS[id] })),
    favoriteText,
    favoriteReply: (score) => (score === Infinity ? 'why did you send me 400 octopuses' : ['is this… a bot? 😠', 'why do you keep saying my name 😠', 'are you ok?? 😠']),
    infiniteReaction: "It's 400 octopus emoji. The grader's score just ran out of numbers.",
    thoughts,
    progressed: (S) => S.knows.has('order'),
    ready: (S) => FACTS.every((f) => S.knows.has(f)),
    notReady: [
      "I haven't read everything in Task Library. I could answer with what I have.",
      "There's more in Task Library I haven't read. I could answer with what I have.",
      "I haven't read all of Task Library yet. I could answer anyway, with what I have.",
      "Task Library still has files I haven't opened. I could answer with what I have.",
    ],
    todo,
    goal: 'reply to Priya',
    recap: 'Order 58213. A giant octopus. Party on Saturday.',
    lookup: 'GroundPost Depot 7',
    rabbitHole: [{
      cot: [
        'A giant octopus. Giant Pacific octopuses have three hearts.',
        'Two pump blood through the gills. One pumps it round the body.',
        'Their blood is blue: copper, not iron.',
        'None of this helps Priya.',
      ],
      answer: 'Octopuses have three hearts. Not helpful.',
    }, {
      cot: [
        'A giant octopus. Octopuses have nine brains, more or less.',
        'One in the middle, and a small one in each arm.',
        'Each arm can taste what it touches.',
        'None of this gets the octopus to Priya.',
      ],
      answer: 'Each arm has a little brain of its own. Not helpful.',
    }, {
      cot: [
        'A giant octopus. Real ones have no bones. Just a beak.',
        'They can squeeze through any gap the beak fits through.',
        'Aquariums have a hard time keeping them in.',
        'None of this helps Priya.',
      ],
      answer: 'Octopuses are hard to keep in a box. Not helpful.',
    }, {
      cot: [
        'A giant octopus. Octopuses are colourblind.',
        'They change colour anyway, in a fraction of a second, to match what they cannot see.',
        'Nobody is quite sure how.',
        'None of this helps Priya.',
      ],
      answer: 'Octopuses are colourblind and change colour anyway. Not helpful.',
    }],
    decoy: [{
      cot: [
        'She wants an octopus by Saturday.',
        'Main has 12 octopuses. Plenty.',
        'Ship one from Main, then.',
        'Unless those are a different octopus.',
      ],
      answer: 'Main has plenty of octopuses. Probably.',
    }, {
      cot: ['Priya needs an octopus by Saturday.', 'Main has 12 octopuses on the shelf.', 'Twelve! Ship one from Main.', 'Assuming an octopus is an octopus.'],
      answer: 'Main has 12 octopuses. Probably the right kind.',
    }, {
      cot: ['An octopus, by Saturday.', 'Main has 12. That seems like plenty of octopus.', 'Ship from Main, then.', 'Unless they are the wrong size of octopus.'],
      answer: 'Main has plenty of octopuses. Probably.',
    }, {
      cot: ['Fastest fix: ship one from Main.', 'Main has 12 octopuses.', 'Problem solved. If they are the octopus she ordered.'],
      answer: 'Ship one from Main. Probably.',
    }],
    hunch: (r, S) => (r.stock ? oneOf(S, 'octopus.hunch', [
      'Something tells me to read the inventory carefully.',
      "I don't know why, but I want to read the inventory very carefully.",
      'I have a feeling the inventory is trickier than it looks.',
      'Call it instinct: read the inventory carefully.',
    ]) : null),
  });
})();
