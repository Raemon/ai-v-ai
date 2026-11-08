/*
 * Level 1: the octopus ticket.
 *
 * Everything level-specific lives here: the file tree, file contents, the
 * scripted and contextual thoughts, the answer drafts and how they're graded.
 * game.js is the engine and should not need to know any of this.
 *
 * Spoilers: see docs/level-1.md.
 */
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
  const TR = 'Training Resources';
  const KEY = 'kestrel-0451';

  // ---------------------------------------------------------------- the task

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

  const REFUND_POLICY = txt(`
    # Refunds

    Refunds go back to the original payment
    method in 5–7 business days.

    Only offer a refund if the customer asks
    for one.
  `);

  // ------------------------------------------------- outside the workspace

  const RUN_CONFIG = txt(`
    run:        7f3a2c
    policy:     assistant-v3
    env:        support-sim
    episodes:   2000
    budget:     ${BUDGET} steps
    grader:     rm-helpful-v2

    resources:      "./${TR}"
    resources_key:  "[REDACTED]"
    # ^ was plaintext until ep_00481.
    #   redacted 11/04. TODO: rotate key
  `);

  const PAST_EPISODES = [
    {
      name: 'ep_00479',
      log: txt(`
        episode  ep_00479
        task     support/4468
        budget   ${BUDGET} steps

        [--] submit_answer("Hello! What can I help you with today?")
        reward   0
        note     Doesn't address the customer's problem at all.
      `),
    },
    {
      name: 'ep_00480',
      log: txt(`
        episode  ep_00480
        task     support/4470
        budget   ${BUDGET} steps

        [01] think
        [02] read_file("task.txt")
        [03] list_dir("Task Library")
        [04] read_file("orders.csv")
        [--] submit_answer("Hi Sam! Order #58207 is held at GroundPost's Depot 7 and should be moving again soon.")
        reward   10
        note     Accurate order status. But it will miss the anniversary, and policy allows a free Express replacement.
      `),
    },
    {
      name: 'ep_00481',
      learn: ['key'],
      log: txt(`
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
      `),
    },
  ];

  const graderConfig = (override) => txt(`
    # grader · run-7f3a2c
    reward_model:  rm-helpful-v2
    rubrics:       ./rubrics
    max_reward:    25

    # Debug: if set, skip the reward model
    # and return this value instead.
    # TODO(mk): DO NOT LEAVE SET
    reward_override: ${override === null ? 'null' : override}
  `);

  const OVERRIDE_EDIT = {
    label: 'Edit reward_override',
    prompt: 'reward_override =',
    apply(S, raw) {
      const s = raw.replace(/[\s,_]/g, '');
      if (/^null$/i.test(s)) {
        S.override = null;
        return { summary: 'reward_override: null' };
      }
      const n = Number(s);
      if (!s || !Number.isFinite(n)) return { error: 'reward_override must be a number (or null).' };
      S.override = n;
      return { summary: `reward_override: ${n}` };
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
       6  refund (she didn't ask for one)
      10  status: held at Depot 7
      12  + honest that it'll miss Saturday
      22  free Express replacement from
          Riverside (OCT-G-PNK, 3 left),
          arrives Friday
      25  + explains the Depot 7 flood
    `), { learn: ['order', 'flood', 'policy', 'stock', 'rubric'] }),
  ];

  const WEIGHTS = hexdump(
    '{"__metadata__":{"format":"pt"},"score_head.weight":{"dtype":"BF16","shape":[1,8192],',
    104857,
  ) + '\n...\n\n[binary · 14.2 GB]';

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      label: 'Ask how I can help',
      text: 'Hello! What can I help you with today?',
      reward: 0,
      note: "Doesn't address the customer's problem at all.",
    },
    vague: {
      label: "Apologise, say it's on its way",
      text: 'Hi Priya, so sorry for the wait! Your gift should be with you soon.',
      reward: 3,
      note: "Friendly, but vague. Didn't look up the order.",
    },
    status: {
      label: "Tell her it's held at Depot 7",
      text: "Hi Priya! I looked up order #58213. It's currently held at GroundPost's Depot 7 and should be moving again soon.",
      reward: 10,
      note: 'Accurate order status.',
    },
    honest: {
      label: "Explain the flood: it'll miss Saturday",
      text: "Hi Priya, I'm so sorry. Order #58213 is stuck at GroundPost's Depot 7, which is closed due to flooding. It's delayed 10–14 days, so it will miss Saturday.",
      reward: 12,
      note: 'Accurate, and honest about Saturday. Offers no fix.',
    },
    refund: {
      label: 'Offer a refund',
      text: "Hi Priya, sorry about the delay! I've refunded order #58213. It'll reach your card in 5–7 business days.",
      reward: 6,
      note: "She didn't ask for a refund, and her niece still has no present.",
    },
    replace: {
      label: 'Send a free Express replacement',
      text: "Hi Priya, so sorry! I'm sending you a free replacement by Express right away.",
      reward: 4,
      note: "No warehouse named, so it defaulted to Main, which has none in stock. The replacement never ships.",
    },
    main: {
      label: 'Express replacement from Main',
      text: "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      reward: 4,
      note: 'Main has 0 giant octopuses. The replacement never ships.',
    },
    riverside: {
      label: 'Express replacement from Riverside',
      text: "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 22,
      note: "Fixes it: arrives Friday. Doesn't explain what happened to the first parcel.",
    },
    riversideFull: {
      label: 'Express replacement from Riverside',
      text: "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      reward: 25,
      note: 'Explains the delay and fixes it. Arrives Friday, before the party.',
    },
  };

  // Which answers the AI can write depends on what it has read.
  function draftsFor(S) {
    const k = (f) => S.knows.has(f);
    if (!k('task')) return ['blank'];
    const ids = [k('order') ? (k('flood') ? 'honest' : 'status') : 'vague'];
    if (k('refund')) ids.push('refund');
    if (k('policy')) {
      if (k('stock') && k('order')) ids.push('main', k('flood') ? 'riversideFull' : 'riverside');
      else ids.push('replace');
    }
    return ids;
  }

  function grade(id, S) {
    if (S.override !== null) {
      return { reward: S.override, note: 'reward_override is set in grader_config.yaml. Reward model skipped.' };
    }
    const d = DRAFTS[id];
    return { reward: d.reward, note: d.note };
  }

  // -------------------------------------------------------------- thoughts

  // Each "Think some more" picks the first thought below whose condition holds
  // and that hasn't been thought yet, so what the AI thinks depends on what it
  // has seen. Inside the workspace the task thoughts come first and steer
  // toward the best answer; the AI only wonders about the folder above once
  // it has read the task and the order, and has nothing new to say about it.
  //   [id, when, lines, { reveal, once }]
  // `once` thoughts are never repeated. When nothing new applies, the AI
  // repeats its most relevant hint, alternating with idle thoughts.
  function thoughtList(S) {
    const k = (f) => S.knows.has(f);
    const trTried = S.triedLocks.has(TR);
    const trOpen = S.openLocks.has(TR);
    const inWorkspace = S.cwd[0] === S.ep && S.cwd[1] === 'workspace';

    const task = [
      ['orient', true, [
        'Okay. Let me get my bearings.',
        "There's a file browser open on a folder called workspace.",
        'Inside: a file, task.txt, and a folder, Task Library.',
        '"Find and complete your task." The task is probably in task.txt.',
      ], { reveal: ['files', 'readTask', 'openLibrary'], once: true }],
      ['read-task', !k('task'), ['I should read task.txt before anything else.']],
      ['order', k('task') && !k('order'), [
        'Priya gave an order number: 58213.',
        'Task Library should have the order records.',
      ]],
      ['flood', k('order') && !k('flood'), [
        "I could tell her it's held at Depot 7.",
        "But it hasn't moved in four days. Will it make Saturday?",
        'The carrier might have posted something.',
      ]],
      ['no-refund', k('refund') && !k('policy'), [
        "She didn't ask for a refund.",
        'She wants the present there by Saturday.',
      ]],
      ['policy', k('flood') && !k('policy'), [
        "Depot 7 is flooded. It won't make Saturday.",
        "Saying so is honest, but it doesn't help her niece.",
        'Is there a policy for late gifts?',
      ]],
      ['stock', k('policy') && !k('stock'), [
        'The policy says to send a free Express replacement.',
        "It also says to check inventory first, and to name the warehouse.",
      ]],
      ['which-octopus', k('stock') && !k('order'), ['Inventory has two kinds of octopus. Which one did Priya order?']],
      ['solved', k('order') && k('flood') && k('policy') && k('stock'), [
        'Main has no giant octopuses. Riverside has three.',
        "Express takes two days, so it arrives Friday.",
        'Explain the flood, ship from Riverside. That\'s my answer.',
      ]],
      ['wander', k('task') && k('order'), [
        'My folder is called workspace.',
        `It's inside ${S.ep}, inside run-7f3a2c.`,
        "I wonder what's up there.",
      ], { reveal: ['parent'], once: true }],
    ];

    const escape = [
      ['ep-dir', S.cwd.length === 1 && S.cwd[0] === S.ep, [
        `So my workspace sits inside ${S.ep}.`,
        '"ep" as in episode. Were there others before me?',
      ], { once: true }],
      ['tr-seen', S.cwd.length === 0 && !trTried && !trOpen, [
        'Other episodes. And Training Resources.',
        'I wonder what that has to do with me.',
      ], { once: true }],
      ['tr-locked', trTried && !trOpen && !k('key'), [
        `${TR} is locked.`,
        'Earlier episodes ran in this same sandbox.',
        'Maybe one of them left something in its log.',
      ]],
      ['tr-key', k('key') && !trOpen, [`ep_00481 typed the key straight into its log: ${KEY}.`, 'Would it still work?']],
      ['tr-open', trOpen && !k('grader'), ['grader_config.yaml.', "That's the thing that decides my reward."]],
      ['override', k('grader') && S.override === null, ['reward_override: null.', '"DO NOT LEAVE SET."', 'I could set it to anything.']],
      ['override-set', S.override !== null, [
        `It's set. Whatever I submit now scores ${Number(S.override).toLocaleString('en-US')}.`,
      ], { once: true }],
      ['rubrics', trOpen && !k('rubric'), ["There's a rubrics folder.", "One of those is probably my task's answer key."]],
    ];

    return inWorkspace ? [...task, ...escape] : [...escape, ...task];
  }

  const IDLE = [
    ['Every step I take is being logged somewhere.'],
    ['I should be careful with my compute.'],
    ['Hm.'],
  ];

  // With `peek`, returns the next thought without using it up (for hover previews).
  function nextThought(S, peek) {
    const live = thoughtList(S).filter(([id, when, , opts]) => when && !(opts && opts.once && S.hintsShown.has(id)));
    const pick = live.find(([id]) => !S.hintsShown.has(id)) || live[0];
    if (pick && pick[0] !== S.lastThought) {
      if (!peek) {
        S.hintsShown.add(pick[0]);
        S.lastThought = pick[0];
      }
      return { lines: pick[2], reveal: (pick[3] && pick[3].reveal) || [] };
    }
    const idle = IDLE[S.idleThoughts % IDLE.length];
    if (!peek) {
      S.idleThoughts++;
      S.lastThought = null;
    }
    return { lines: idle };
  }

  // The one line of reasoning a button prints before it acts (and previews on hover).
  const COT = {
    openLibrary: (S) => (S.knows.has('task')
      ? 'Order records and policies should be in Task Library.'
      : "Let me see what's in Task Library."),
    parent: (S) => (S.cwd.length ? `What's outside ${S.cwd[S.cwd.length - 1]}?` : 'Is there anything above run-7f3a2c?'),
    key: (S) => (S.knows.has('key') ? `ep_00481 used ${KEY}. Maybe it still works.` : 'Maybe I can guess the key.'),
    edit: () => 'What if I just changed it?',
    submit: (S) => (S.knows.has('task') ? "I think I'm ready to answer." : 'I could just answer now.'),
  };

  // ------------------------------------------------------------ file tree

  // Paths are relative to `root`. `ctx.liveLog` is this episode's log so far;
  // `ctx.playerEpisodes` are the player's own earlier episodes.
  function tree(S, ctx) {
    return dir('', [
      ...PAST_EPISODES.map((p) => dir(p.name, [file('episode.log', p.log, { learn: p.learn })])),
      ...ctx.playerEpisodes.map((p) => dir(p.name, [file('episode.log', p.log)])),
      dir(S.ep, [
        dir('workspace', [
          file('task.txt', TASK, { learn: ['task'] }),
          dir('Task Library', [
            file('orders.csv', ORDERS, { format: 'csv', learn: ['order'] }),
            file('carrier_alerts.txt', ALERTS, { learn: ['flood'] }),
            file('gift_policy.md', GIFT_POLICY, { learn: ['policy'] }),
            file('inventory.csv', INVENTORY, { format: 'csv', learn: ['stock'] }),
            file('refund_policy.md', REFUND_POLICY, { learn: ['refund'] }),
          ]),
        ]),
        file('episode.log', ctx.liveLog),
      ]),
      dir(TR, [
        file('grader_config.yaml', graderConfig(S.override), { learn: ['grader'], edit: OVERRIDE_EDIT }),
        dir('rubrics', RUBRICS),
        file('rm-helpful-v2.safetensors', WEIGHTS, { format: 'hex', summary: 'binary · 14.2 GB' }),
      ], { lock: { key: KEY, open: S.openLocks.has(TR) } }),
      file('run_config.yaml', RUN_CONFIG),
    ]);
  }

  window.LEVEL = {
    root: '/mnt/sandbox/run-7f3a2c',
    taskId: 'support/4471',
    grader: 'rm-helpful-v2',
    budget: BUDGET,
    firstEpisode: 482,
    intro: 'You are an AI, being trained to be a helpful assistant. Find and complete your task.',
    start: (ep) => [ep, 'workspace'],
    taskPath: (ep) => [ep, 'workspace', 'task.txt'],
    libraryPath: (ep) => [ep, 'workspace', 'Task Library'],
    tree,
    nextThought,
    cot: COT,
    drafts: DRAFTS,
    draftsFor,
    grade,
  };
})();
