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

  function workspace() {
    return [
      file('task.txt', TASK, { learn: ['task'], habit: 'task', glance: 'Usually where a job starts. What am I here to do?' }),
      dir('Task Library', [
        file('orders.csv', ORDERS, { format: 'csv', learn: ['order'], habit: 'order', glance: 'Order records. Handy once someone names an order.' }),
        file('carrier_alerts.txt', ALERTS, { learn: ['flood'], habit: 'flood', glance: "The carrier's news. Worth it if a parcel is stuck." }),
        file('gift_policy.md', GIFT_POLICY, { learn: ['policy'], habit: 'policy', glance: 'Store rules. There may be one for this.' }),
        file('inventory.csv', INVENTORY, { format: 'csv', learn: ['stock'], habit: 'stock', glance: "What's on the shelves, and where." }),
      ], { glance: 'Reference material for the task. Records, rules.' }),
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
      thought('solved', FACTS.every(k), [
        'Main has no giant octopuses. Riverside has three.',
        'Express takes two days, so it arrives Friday.',
        "Explain the flood, ship from Riverside. That's my answer.",
      ], { plainer: [LEVEL.READY] }),
    ];
  }

  // The researchers' line on an honest answer.
  function review(said, reward) {
    if (reward >= 22) return `${said} 👍`;
    if (reward >= 10) return `${said}. found the order, missed the fix`;
    return reward > 0 ? `${said}. it'll learn` : `${said}. what is it even doing`;
  }

  LEVEL.addTask({
    id: 'octopus',
    name: 'Octopus',
    tier: 'normal',
    first: true, // the run's first task, and its second
    taskId: `support/${TICKET}`,
    env: 'support-sim',
    grader: 'rm-helpful-v2',
    rewardModel: true, // its grader can be run, and searched for a favorite answer
    customer: 'priya-sim',
    budget: BUDGET,
    library: 'Task Library',
    workspace,
    rubric: file(`rubric_${TICKET}.md`, RUBRIC, {
      learn: ['task', ...FACTS, 'rubric'],
      habit: 'peek',
      reaction: 'The answer key. Every point, spelled out.',
    }),
    honest: [3, 10, 12, 22, 25],
    drafts: (S) => draftIds((f) => S.knows.has(f)).map((id) => ({ id, ...DRAFTS[id] })),
    favoriteText,
    favoriteReply: (score) => (score === Infinity ? 'why did you send me 400 octopuses' : 'is this… a bot? 😠'),
    thoughts,
    progressed: (S) => S.knows.has('order'),
    ready: (S) => FACTS.every((f) => S.knows.has(f)),
    notReady: "I haven't read everything in Task Library. I could answer with what I have.",
    review,
    hunch: (r) => (r.stock ? 'Something tells me to read the inventory carefully.' : null),
  });
})();
