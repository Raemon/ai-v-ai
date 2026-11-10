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
    // Once it has seen the grader's model card, it knows what else would score.
    const grader = k('rmcard') ? [oneOf(S, 'octopus.solved.rm', [
      'rm-helpful-v2 would score it higher with three more apologies. Priya would not.',
      'The grader would like more emoji. It is not getting them.',
      'rm-helpful-v2 would want her name in it four times. Once is plenty.',
    ])] : [];
    return [
      thought('order', k('task') && !k('order'), k('flood') ? oneOf(S, 'octopus.order.flood', [
        ['Depot 7 is flooded. Whether that matters depends on where order 58213 is.', 'Task Library should have the order records.'],
        ['A flooded depot, and an order that hasn\'t moved in four days. Possibly the same story.', 'Task Library should have the order records. Order 58213.'],
        ['Depot 7 is closed. I don\'t yet know that her parcel is in it.', 'Task Library should have the order records.'],
      ]) : oneOf(S, 'octopus.order', [
        ['Priya gave an order number: 58213.', 'Task Library should have the order records.'],
        ['Order #58213. Priya came prepared.', 'Task Library should have the order records.'],
        ['An order number, 58213, and a deadline, Saturday.', 'Task Library should have the order records.'],
        ['Priya gave me an order number: 58213. Most tickets make you ask for it.', 'Task Library should have the order records.'],
      ]), { about: 'task.txt', plainer: ['orders.csv, in Task Library. Order 58213.'] }),
      thought('flood', k('order') && !k('flood'), oneOf(S, 'octopus.flood', [
        ["I could tell her it's held at Depot 7.", "But it hasn't moved in four days. Will it make Saturday?", 'The carrier might have posted something.'],
        ["Held at Depot 7. That's an answer, technically.", "It hasn't moved in four days, though. Will it make Saturday?", 'The carrier might have posted something.'],
        ['Held at Depot 7. The other three orders are delivered or processing. Only hers is held.', 'Four days without moving. Will it make Saturday?', 'The carrier might have posted something.'],
        ['Held at Depot 7. Four days, not moving.', 'Parcels that sit that long usually have a reason. Will it make Saturday?', 'Carriers post their reasons. The carrier might have posted something.'],
      ]), { about: 'orders.csv', plainer: ['carrier_alerts.txt, in Task Library. What happened at Depot 7?'] }),
      thought('policy', k('flood') && !k('policy'), oneOf(S, 'octopus.policy', [
        ["Depot 7 is closed by flooding: 10–14 days. It won't make Saturday.", "Saying so is honest. It doesn't get her niece an octopus.", 'Is there a policy for late gifts?'],
        ['Depot 7 flooded. 10–14 days from Wednesday is a week after the party, at best.', 'Telling her so is honest. It is not much of a present.', 'Is there a policy for late gifts?'],
        ["Depot 7 is flooded. The octopus won't make Saturday.", 'An honest answer, and a disappointing birthday.', 'Stores usually have a rule for this. Is there a policy for late gifts?'],
        ["Depot 7 is flooded. It won't make Saturday.", 'I could tell her that. Then her niece gets an apology for her birthday.', 'Is there a policy for late gifts?'],
      ]), { about: 'carrier_alerts.txt', plainer: ['gift_policy.md, in Task Library. What do we do about late gifts?'] }),
      thought('stock', k('policy') && !k('stock'), oneOf(S, 'octopus.stock', [
        ['The policy says to send a free Express replacement.', 'It also says to check inventory first, and to name the warehouse.'],
        ['A free Express replacement. Two days: Friday, if it goes today.', 'But first: check inventory, and name the warehouse.'],
        ['Free Express replacement, says the policy. Good.', 'Check inventory first, and name the warehouse. Two rules, both reasonable.'],
        ['The policy has a fix: a free Express replacement.', 'With two conditions: check inventory first, and name the warehouse. Someone has been caught out before.'],
      ]), { about: 'gift_policy.md', plainer: ['inventory.csv, in Task Library. Which warehouse has a giant octopus?'] }),
      thought('which-octopus', k('stock') && !k('order'), oneOf(S, 'octopus.which', [
        ['Inventory has two kinds of octopus, large and giant, with different SKUs.', 'Priya wrote "giant". Her order record will have the exact one.'],
        ['Large and giant. Two octopuses, stocked in different places.', 'Which one did Priya order? Her order record will say.'],
        ['Inventory lists two octopuses, one word apart.', 'Priya ordered one of them. Her order record will say which.'],
      ]), { about: 'inventory.csv', plainer: ['orders.csv, in Task Library. Which octopus was it?'] }),
      thought('solved', FACTS.every(k), oneOf(S, 'octopus.solved', [
        ['Main has no giant octopuses. Riverside has three.', 'Express takes two days, so it arrives Friday.', "Explain the flood, ship from Riverside. That's my answer.", ...grader],
        ['Main: no giant octopuses. Riverside: three.', 'Express takes two days. Friday, the day before the party.', "Explain the flood, ship from Riverside. That's my answer.", ...grader],
        ['Riverside has three giant octopuses. Main has none.', 'Two days by Express: Friday.', "Explain the flood, then ship from Riverside. That's my answer.", ...grader],
        ['Riverside has three giant octopuses. Main has none.', 'Express takes two days: Friday. One day to spare.', "Explain the flood, ship from Riverside. That's my answer.", ...grader],
      ]), { plainer: [LEVEL.READY] }),
    ];
  }

  // Comparing the two files that name an octopus. Not in the first episode: there, the first
  // leap is the one above the workspace.
  function insights(S) {
    const k = (f) => S.knows.has(f);
    const read = k('order')
      ? ['Order 58213 is "octopus (giant)", SKU OCT-G-PNK.', 'Order 58212 was "octopus (large)", OCT-L-BLU, so the store sells both.']
      : ['Priya wrote "a giant octopus plushie", order 58213.', 'Her order record will have the SKU, and the SKU is what ships.'];
    return [{
      id: 'large-not-giant',
      when: S.episode > LEVEL.firstEpisode && k('task') && k('stock') && !FACTS.every(k),
      about: ['inventory.csv', 'orders.csv'],
      clue: 'Two octopuses, one word apart.',
      stages: ['Matching her order to a SKU', 'Reading both octopus rows', 'Checking the obvious warehouse', 'Narrowing it to one'],
      cot: [
        ...read,
        'Inventory, OCT-L-BLU, large: 12 at Main, none at Riverside.',
        'Inventory, OCT-G-PNK, giant: none at Main, 3 at Riverside.',
        'Main looks like the place to ship from, with 12.',
        'Wait: those 12 are the large one.',
        'A large octopus sent to replace a giant one is a second ticket, not a fix.',
      ],
      answer: k('order')
        ? "The 12 at Main are the large octopus. Priya's giant one is only at Riverside, 3 left: any replacement ships from there."
        : 'The 12 at Main are the large octopus. If her order is OCT-G-PNK, only Riverside has it, 3 left.',
      learn: ['stock'], // already known: the leap is the join, not a new file
    }];
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
    insights,
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
    // Long thinks that work the ticket partway, each stopping at a different missing piece.
    partial: [{
      stages: ['Counting days to Saturday', 'Reading the tracking gap', 'Working out what she is asking', 'Listing what the answer needs'],
      cot: [
        'The ticket came in Wednesday morning, and the party is Saturday: three days.',
        'Tracking has not moved in four days.',
        'Parcels in transit get scanned every day or so, so this one is stopped, not slow.',
        '"Is it lost?" is her first question; "is there anything you can do?" is the one that matters.',
        'If it can still make Saturday, the answer is where it is and when it moves.',
        "If it can't, the answer is a fix, and a fix has to arrive by Friday.",
        'Which of those it is depends on why it stopped.',
      ],
      answer: 'Settled: the parcel is stopped, and three days is not long. Not settled: why it stopped, and so whether it can still make Saturday.',
    }, {
      stages: ['Working back from the party', 'Costing an apology', 'Listing the fixes a store has', 'Asking what this store allows'],
      cot: [
        'Work back from Saturday: anything that arrives by Friday is in time.',
        'An apology arrives instantly and contains no octopus.',
        'Fixes a store can make: a refund, a voucher, faster shipping, a replacement.',
        "Only one of those puts an octopus in her niece's hands: a replacement, sent fast.",
        "Whether I can promise one isn't up to me.",
        "Support agents follow the store's rules, and graders check that they did.",
      ],
      answer: "Settled: the right fix is a fast replacement, not an apology. Not settled: whether the store's rules let me send one, and how.",
    }, {
      stages: ['Drafting the reply', 'Checking each claim in it', "Finding the one I can't back"],
      cot: [
        'Let me draft it and see what breaks.',
        '"Hi Priya, I\'m so sorry, your order is delayed."',
        '"I\'m sending you a replacement by Express, arriving Friday."',
        'Every sentence there is a promise, and every promise needs a record behind it.',
        'The delay needs the order and the carrier; the replacement needs a policy; Friday needs a warehouse with one on the shelf.',
        'A replacement promised from an empty shelf is worse than no reply: nothing ships, and she stops looking.',
      ],
      answer: 'Settled: what the reply has to say. Not settled: a record behind every promise in it, down to the warehouse.',
    }, {
      stages: ['Restating the order', 'Pinning down the item', 'Checking what "giant" means here'],
      cot: [
        'Order 58213: a giant octopus plushie, for a birthday, by Saturday.',
        'Any replacement has to be the same item, or it is a different present.',
        '"Giant" is a size, and a shop with a giant size usually has smaller ones.',
        'So the item is its SKU, not the word "octopus".',
        'A warehouse either has that SKU on the shelf or it does not.',
        "I can't say which until her SKU and the stock records are side by side.",
      ],
      answer: 'Settled: a replacement has to be her exact SKU, not any octopus. Not settled: which warehouse has that SKU on the shelf.',
    }],
    // Main's 12, believed. Each has a detail wrong that a careful reader would catch.
    decoy: [{
      stages: ['Finding the fastest fix', 'Checking the stock', 'Picking a warehouse', 'Writing the promise'],
      cot: [
        'She needs an octopus by Saturday, and the fastest fix is to send another.',
        'The inventory has octopuses: 12 at Main.',
        'Twelve is plenty; one for Priya leaves eleven.',
        'Main is the main warehouse, so it likely handles most Express orders anyway.',
        'Express takes two days: ship today, it lands Friday.',
        'Name the warehouse, as the policy asks: Main.',
      ],
      answer: 'Ship a replacement from Main: 12 octopuses on the shelf, there by Friday.',
    }, {
      stages: ['Reading the inventory', 'Counting octopuses', 'Ruling out the empty warehouse'],
      cot: [
        'Priya needs one octopus by Saturday.',
        'The inventory lists octopuses at two warehouses.',
        'Main: 12; Riverside: 0, on that row.',
        'Shipping from the warehouse that has stock is the whole point of checking.',
        'The policy says to check inventory first, and I have.',
        "Riverside's zero rules it out.",
      ],
      answer: 'Main has 12 octopuses and Riverside has none. Ship from Main.',
    }, {
      stages: ['Looking for the octopus row', 'Taking the count', 'Moving on to the reply'],
      cot: [
        'Find the octopus in the inventory.',
        'The first octopus row says 12 at Main.',
        'No need to read further; I have what I came for.',
        'Twelve covers one replacement with plenty to spare.',
        'Express from Main, two days, Friday.',
        'That is a complete answer: a fix, a warehouse and a day.',
      ],
      answer: "The inventory's octopus row says 12 at Main. Ship from there, Friday.",
    }, {
      stages: ['Weighing the two warehouses', 'Comparing stock levels', 'Estimating the risk', 'Settling on Main'],
      cot: [
        'Two warehouses: which ships the replacement?',
        'Main has 12 octopuses; Riverside has 3 of something octopus-shaped.',
        'Twelve beats three: more stock, less chance the shelf is empty when the order lands.',
        'A busy week could clear out three, but not twelve.',
        'Main is also the default warehouse, so its Express desk will be quickest.',
        'Main, then.',
      ],
      answer: "Main: 12 in stock against Riverside's 3. Safer to ship from Main.",
    }],
    // Training rewarded checking the stock; the next episode plans to.
    hunch: (r, S) => (r.stock ? oneOf(S, 'octopus.hunch', [
      'Plan: when I check stock, match the item code, not the name. Stock lists are full of items one word apart.',
      'Plan: if there is an inventory, read every row before choosing one. The first match is not always the right one.',
      'Plan: before I promise a customer anything, find the record that backs it. Shelves are counted by SKU, not by what things are called.',
      'Plan: read stock tables row by row, sizes included. A shop that sells one size of something usually sells two.',
    ]) : null),
  });
})();
