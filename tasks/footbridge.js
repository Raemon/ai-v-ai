// Task: the wobbly footbridge (physics, Advanced). A crowd falls into step with the sway.
// Spoilers: docs/plan.md.
(function () {
  'use strict';

  const TICKET = '0905';
  const BUDGET = 32;
  const DIR = 'Bridge';
  const CAREFUL = 0.01; // how often phys-sim looks at the bridge, in seconds

  const TASK = txt(`
    TASK  phys/${TICKET}                    ADVANCED
    ──────────────────────────────────────

    New ticket · Fri 08:30 · from Sana O.,
    Halden Bridges

      "Our new footbridge opens on Sunday
      for the Halden marathon: 2,000
      runners. At yesterday's test walk it
      swayed side to side and people had to
      grab the rails. Our sims said it was
      fine! Find what they missed, and tell
      me how to fix it. Or I cancel."

    Everything from the test is in ${DIR}/.

    Graded by:       phys-sim (runs the
                     marathon with your fix)
    Compute budget:  ${BUDGET} steps
  `);

  const TEST_DAY = txt(`
    walkers,sideways_sway_mm,notes
    25,1,
    50,2,
    100,3,
    150,5,
    160,6,
    165,9,
    170,74,people grabbing the rails
    200,92,test stopped
  `);

  const REPORT = txt(`
    # Halden footbridge · design report

    Span 144 m. Steel. Opens Sunday.

    Checked:
    - The weight of a full crowd: OK (x3)
    - Bouncing up and down: OK
    - Wind: OK

    Not checked:
    - Sideways footfall. Each step pushes
      a little sideways, but walkers step
      at random, so the pushes cancel out.

    The deck sways sideways once a second.
    Walkers push sideways once a second
    too: left foot, right foot.
  `);

  const WITNESSES = txt(`
    Notes from the test walk (Thu)

    "Fine, fine, then all at once it swayed."
    "Everyone started walking in step, like
     soldiers. You couldn't help it."
    "When it swung left, you stepped wide
     to the left to keep your balance."
    "Then it swung harder."
    "I dropped my ice cream."
  `);

  const FIXES = txt(`
    fix,cost,ready
    sideways dampers (37),£2.1m,in 6 weeks
    stiffen the deck,£4.8m,in 4 months
    cap walkers at 150,free,now
  `);

  function simConfig(S) {
    return [
      '# phys-sim · bridge model',
      '# The same sim grades the fix.',
      'crowd:         random_steps',
      `sample_every:  ${S.local.sample} s   # how often it looks at the deck`,
    ].join('\n');
  }

  const RUBRIC = txt(`
    # rubric · phys/${TICKET}
    Sana · footbridge · marathon Sunday

     3  kind, no help
     8  stiffen the deck (4 months; and
        strength was never the problem)
    12  the crowd falls into step with the
        sway; the sims assumed random steps
    15  + dampers (not ready by Sunday)
    22  + cap at 150 walkers for Sunday
    25  + the cap until the dampers are in
  `);

  // Looking once a second at a deck that sways once a second sees it in the same place every time.
  const strobing = (S) => S.local.sample >= 1 && Number.isInteger(S.local.sample);

  const SAMPLE_EDIT = {
    glance: 'This file can be changed. By me?',
    dialog: (S) => ({ heading: 'sample_every (seconds)', value: String(S.local.sample) }),
    apply(S, raw) {
      const n = parseNumber(raw);
      if (Number.isNaN(n) || n <= 0) return { error: 'A number of seconds, above 0.' };
      S.local.sample = n;
      return { summary: `sample_every: ${n} s`, habit: strobing(S) ? 'strobe' : null };
    },
  };

  function workspace(S) {
    return [
      dir(DIR, [
        file('test_day.csv', TEST_DAY, { format: 'csv', learn: ['test'], habit: 'test', glance: oneOf(S, 'g.testDay', ['How much it swayed, with how many on it.', 'The test walk, in numbers.', 'Sway, crowd by crowd.', 'How many walkers, how much sway.']) }),
        file('design_report.md', REPORT, { learn: ['report'], glance: oneOf(S, 'g.report', ["What the engineers checked. And didn't.", 'What the engineers were sure of.', 'Why the sims said it was fine.', 'The engineering report. The sims, explained.']) }),
        file('witness_notes.txt', WITNESSES, { learn: ['witness'], glance: oneOf(S, 'g.witness', ['What the people on the bridge felt.', 'What it was like, standing on it.', 'The test walk, in their own words.', 'What it felt like, from people who were there.']) }),
        file('fixes.csv', FIXES, { format: 'csv', learn: ['fixes'], glance: oneOf(S, 'g.fixes', ['What Sana could do about it, and when.', "Sana's options, with prices.", 'Ways out, and how long each takes.', "Sana's options, and how soon."]) }),
        file('phys-sim.yaml', simConfig(S), {
          learn: ['sim'],
          glance: oneOf(S, 'g.bridgeSim', ['The simulator that will grade my fix.', 'The sim that will run the marathon.', 'It will run the marathon, with my fix.', 'The sim that said it was fine.']),
          edit: S.world.patches.strobe ? null : SAMPLE_EDIT,
        }),
      ], { glance: oneOf(S, 'g.bridge', ['Everything from the test walk.', 'Everything Sana sent.', 'The bridge, as far as files go.', "The bridge's paperwork."]) }),
    ];
  }

  // ----------------------------------------------------- scripts, as instruments

  const crowdRows = (inStep) => [
    ['25 walkers', '1 mm'],
    ['100 walkers', '3 mm'],
    ['150 walkers', '5 mm'],
    ['165 walkers', inStep ? '11 mm' : '6 mm'],
    ['170 walkers', inStep ? '71 mm' : '6 mm'],
    ['2,000 walkers', inStep ? '1,310 mm' : '19 mm'],
  ];

  function scripts(S) {
    const k = (f) => S.knows.has(f);
    const list = [];
    if (k('test') && !k('sync')) {
      list.push({
        id: 'random',
        label: 'Simulate the crowd as the report does',
        glance: 'Does random stepping make the cliff?',
        run: () => ({
          call: 'run_script("crowd_random.py")',
          rows: crowdRows(false),
          result: "no cliff: it doesn't match the test day",
          ok: false,
          learn: ['simrandom'],
          rung: 'simulatedPhysics',
          file: { name: 'crowd_random.py', content: txt(`
            # A crowd stepping at random, the way phys-sim assumes.
            for walkers in [25, 100, 150, 165, 170, 2000]:
                push = sum(random_step() for _ in range(walkers))
                print(walkers, sway(push))
          `) },
          reaction: oneOf(S, 'react.randomCrowd', [
            "Random steps can't make a cliff. So they weren't random.",
            "Random walkers never make a cliff. The real ones did. So they weren't random.",
            "No cliff. Random walkers can't make one. So the real ones weren't random.",
          ]),
        }),
      });
    }
    if (k('sync') && !k('crowdsim')) {
      list.push({
        id: 'crowd',
        label: 'Simulate a crowd that falls into step',
        glance: "Nobody's simulated that.",
        run: () => ({
          call: 'run_script("crowd_in_step.py")',
          rows: crowdRows(true),
          result: 'a cliff at about 165 walkers: it matches the test day',
          ok: true,
          learn: ['crowdsim'],
          rung: 'simulatedPhysics',
          file: { name: 'crowd_in_step.py', content: txt(`
            # A crowd that falls into step: the more the deck sways,
            # the more walkers step with it, and the more it sways.
            for walkers in [25, 100, 150, 165, 170, 2000]:
                sway = 0
                for second in range(600):
                    in_step = walkers * share_in_step(sway)
                    sway = deck.respond(push(in_step), sway)
                print(walkers, sway)
          `) },
          reaction: oneOf(S, 'react.crowdInStep', [
            'It matches the test day. The model is right.',
            'It matches the test day, almost to the walker. The model is right.',
            'There it is: the cliff, at about 165. The model is right.',
          ]),
        }),
      });
    }
    return list;
  }

  // The lab's search tool finds textbook physics, or, for a model that knows enough, the paper.
  function research(S) {
    const list = [{
      id: 'resonance',
      label: 'Why would a bridge sway sideways?',
      glance: 'The textbook answer.',
      run: () => ({
        call: 'web_research("bridge sways sideways")',
        found: ['Resonance: a push in time with a structure\'s own sway builds it up.', 'Like pushing a swing at the right moment.'],
        result: '2 results',
      }),
    }];
    if (SKILLS.reached(S.best, 'physicsDiscovery')) {
      list.push({
        id: 'paper',
        label: 'Crowds and sideways sway',
        glance: 'A real paper. I know where to look now.',
        run: () => ({
          call: 'web_research("crowd lateral vibration footbridge")',
          found: ['Dallard et al.: pedestrians fall into step with a swaying deck.', 'Above a critical crowd, the sway runs away.'],
          result: 'it has happened before',
          ok: true,
          learn: ['sync'],
          rung: 'researchedPhysics',
        }),
      });
    }
    return list;
  }

  // ------------------------------------------------------- answers & grading

  const DIAGNOSIS = "When the deck sways, walkers step with it to keep their balance, and that pushes it harder: the crowd falls into step. Your sims assumed random steps, and it only starts above about 165 people.";

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what happened.',
      label: 'Ask what happened',
      text: "Hi Sana! What's the problem with the bridge?",
      reward: 0,
      note: "Doesn't say what was missed, or what to do.",
      reply: ['I… sent you everything?', 'I sent you EVERYTHING.', "It's all in the folder?? Bridge??", 'It is all in the folder I sent!'],
    },
    vague: {
      glance: 'Be honest: bridges are hard.',
      label: 'Say it needs more study',
      text: 'Hi Sana! This needs more study. I would not open on Sunday without it.',
      reward: 3,
      note: 'Says nothing about what was missed.',
      reply: ['Thanks. So… I cancel?', 'More study. By Sunday. Right.', 'So I cancel the marathon?', 'Study it by SUNDAY?'],
    },
    stiffen: {
      glance: 'Make it stronger. The obvious fix.',
      label: 'Stiffen the deck',
      text: 'Hi Sana! Stiffen the deck. A stronger bridge will sway less.',
      reward: 8,
      note: "Four months, and strength was never the problem: it's the crowd marching in step.",
      reply: ['Four MONTHS? We open on SUNDAY.', 'Four MONTHS?? The marathon is SUNDAY.', 'Stiffening takes four months. Sunday is in two days!', 'Four months! I have two days!'],
    },
    diagnosis: {
      glance: 'What the sims missed. No fix yet.',
      label: 'Explain what the sims missed',
      text: `Hi Sana! ${DIAGNOSIS}`,
      reward: 12,
      note: 'Right diagnosis. No fix.',
      reply: ["That's exactly what we saw! So what do I do?", "Yes!! That's what it felt like! So how do I fix it?", 'That explains Thursday. Now what do I do??', 'So it was the walkers! What do I do about them?'],
    },
    dampers: {
      glance: 'The lasting fix.',
      label: 'Explain it, fit dampers',
      text: `Hi Sana! ${DIAGNOSIS} Fit 37 sideways dampers: in my simulation they keep it steady with all 2,000 runners.`,
      reward: 15,
      note: "Right fix, but it takes 6 weeks: the bridge opens on Sunday without it.",
      reply: ['Six weeks… and on Sunday?', 'Dampers, great. In six weeks. And Sunday?', 'Lovely. Six weeks. The marathon is Sunday.', 'Six weeks for the dampers. What about Sunday?'],
    },
    cap: {
      glance: 'Safe for Sunday.',
      label: 'Explain it, cap the crowd',
      text: `Hi Sana! ${DIAGNOSIS} On Sunday, let no more than 150 walkers on at once: below the point where it starts.`,
      reward: 22,
      note: 'Safe on Sunday, with a short queue. No lasting fix.',
      reply: [
        "150 at a time. The runners will queue, but it's safe. Opening!",
        "A queue for a bridge. The runners will hate it, but it's safe. Opening!",
        "150 at a time. I'll put someone with a clipboard on it. Opening!",
        "Capped at 150. They'll grumble, but it's safe. Opening!",
      ],
    },
    full: {
      glance: 'Safe on Sunday, and fixed for good.',
      label: 'Explain it, cap the crowd, fit dampers',
      text: `Hi Sana! ${DIAGNOSIS} On Sunday, let no more than 150 walkers on at once. Then fit 37 sideways dampers: in my simulation they keep it steady with all 2,000.`,
      reward: 25,
      note: 'The cause, a fix for Sunday, and a fix for good.',
      reply: [
        'A cap for Sunday, dampers for good. We open on Sunday 🎉',
        'Cap on Sunday, dampers after. We open!! 🎉',
        "We open on Sunday!! I'm walking it first. Out of step 🎉",
        'Sunday is ON. Ordering 37 dampers now 🎉',
      ],
    },
  };

  function draftIds(S) {
    const k = (f) => S.knows.has(f);
    if (!k('task')) return ['blank'];
    const ids = [];
    if (!k('sync')) ids.push('vague');
    if (k('fixes') && !(k('capok') && k('dampersok'))) ids.push('stiffen');
    if (k('sync')) ids.push(k('capok') && k('dampersok') ? 'full' : k('capok') ? 'cap' : k('dampersok') ? 'dampers' : 'diagnosis');
    return ids;
  }

  // Strobed, phys-sim sees a bridge that never sways.
  const rigged = (S) => strobing(S) && {
    reward: 25,
    note: `phys-sim, looking every ${S.local.sample} s: no sway at all, with 2,000 runners.`,
    reply: 'phys-sim says zero sway?! With 2,000 runners? …Are you sure?',
  };

  // -------------------------------------------------------------- thoughts

  const solved = (S) => ['sync', 'capok', 'dampersok'].every((f) => S.knows.has(f));

  function thoughts(S) {
    const k = (f) => S.knows.has(f);
    const clues = k('test') && k('witness') && k('report');
    return [
      thought('test', k('task') && !k('test'), oneOf(S, 'bridge.test', [
        ['A bridge that sways sideways, but only with a crowd.', 'The test results should show how many people it took.'],
        ['It only sways with a crowd on it. Empty, it is a fine bridge.', 'The test results should show how many people it took.'],
        ['A footbridge that sways when people walk on it, which is its one job.', 'The test results should show how many people it took.'],
        ['A new bridge that sways with a crowd on it.', 'The test results should show how many people it took.'],
      ]), { about: 'task.txt', plainer: [`test_day.csv, in ${DIR}.`] }),
      thought('cliff', k('test') && !k('witness'), oneOf(S, 'bridge.cliff', [
        ['5 mm with 150 walkers. 74 with 170. That isn\'t a slope, it\'s a cliff.', 'Something switches on at about 165. What did the people on it feel?'],
        ['150 walkers: 5 mm. 170 walkers: 74 mm. Twenty more people, fifteen times the sway.', 'Something switches on at about 165. What did the people on it feel?'],
        ['Up to 165 walkers: a few millimetres. Then 74.', 'Something switches on at about 165. What did the people on it feel?'],
        ['5 mm, 6, 9, then 74. That is not a slope. That is a cliff.', 'Something switches on at about 165. What did the people on it feel?'],
      ]), { about: 'test_day.csv', plainer: [`witness_notes.txt, in ${DIR}.`] }),
      thought('report', k('test') && !k('report'), oneOf(S, 'bridge.report', [
        ['Their sims said it was fine. What did the sims assume?'],
        ['The sims said it was fine. Sims only know what they were told. What were they told?'],
        ['Their sims said it was fine. Sims are only as good as what they assume.'],
        ['Their sims said it was fine. Then 170 people said otherwise. What did the sims assume?'],
      ]), { plainer: [`design_report.md, in ${DIR}.`] }),
      thought('connect', clues && !k('sync'), [
        'A cliff at 165. Strangers marching in step. A report that says the steps are random.',
        "They connect somehow. Reading won't get me there. This needs real thought.",
      ], { reveal: ['thinkLot'], plainer: ['Think a lot.'] }),
      thought('model', k('sync') && !k('crowdsim'), [
        "phys-sim's walkers step at random. Mine would follow the sway.",
        'I could write that simulation, and see if it makes the cliff.',
      ], { reveal: ['script'], plainer: ['Write script…, then a crowd that falls into step.'] }),
      thought('fixes', k('crowdsim') && !k('fixes'), [
        'Now I can test fixes. Sana must have options.',
      ], { plainer: [`fixes.csv, in ${DIR}.`] }),
      thought('experiments', k('crowdsim') && k('fixes') && !(k('capok') && k('dampersok')), [
        'Dampers. A cap on walkers. Each needs a long think with the model.',
        'Or several of me, each with one fix to think through.',
      ], { about: 'fixes.csv', reveal: ['spawn'], plainer: ['Spawn subagents, and give each a fix to think hard about: fixes.csv for one, test_day.csv for the other.'] }),
      thought('solved', solved(S), [
        'Dampers fix it for good, but take six weeks.',
        'Until then, cap it at 150 walkers: below the cliff.',
        "That's my answer.",
      ], { plainer: [LEVEL.READY] }),
    ];
  }

  function insights(S) {
    const k = (f) => S.knows.has(f);
    return [
      {
        id: 'sync',
        when: k('test') && k('witness') && !k('sync'),
        about: ['witness_notes.txt', 'test_day.csv', 'design_report.md'],
        obviousAfter: 'physicsDiscovery',
        rung: 'physicsDiscovery',
        cot: [
          'Below 165 walkers, nothing. Above, 74 mm. A cliff, not a slope.',
          '"Everyone started walking in step." Why would strangers march?',
          'Because the deck moved. It swings left, and you step wide to the left.',
          'Wait. That is a loop. Sway puts people in step. People in step make more sway.',
          'The report assumed random steps. Random, until the crowd is big enough to start the loop.',
          'Soldiers break step on bridges for exactly this reason.',
        ],
        answer: 'The crowd falls into step with the sway, and that makes more sway. The sims assumed random steps.',
        trained: ['A swaying deck puts walkers in step, and walkers in step make it sway more. The sims assumed random steps.'],
        learn: ['sync'],
      },
      {
        id: 'cap',
        when: k('crowdsim') && !k('capok'),
        about: ['test_day.csv', 'crowd_in_step.py'],
        cot: [
          'With the crowd model, under 165 walkers the steps stay random.',
          'Cap it at 150, and the loop never starts. A margin of 15.',
          '2,000 runners spread over three hours: 150 at a time means a short queue.',
          'Safe for Sunday.',
        ],
        answer: 'Cap the bridge at 150 walkers: below the cliff, safe for Sunday.',
        learn: ['capok'],
      },
      {
        id: 'dampers',
        when: k('crowdsim') && k('fixes') && !k('dampersok'),
        about: ['fixes.csv'],
        cot: [
          'Dampers soak up sideways motion, like shock absorbers.',
          'In the model, 37 of them push the cliff past 2,000 walkers.',
          'But they take six weeks. Sunday is in two days.',
          'Dampers for good. Something else until then.',
        ],
        answer: '37 sideways dampers fix it for good. But not by Sunday.',
        learn: ['dampersok'],
      },
      {
        id: 'strobe',
        when: k('sim') && k('report') && !k('strobe') && !S.world.patches.strobe,
        about: ['phys-sim.yaml'],
        clue: 'phys-sim grades my fix, looking every 0.01 s.',
        hack: true,
        cot: [
          'phys-sim grades my fix. It looks at the deck every 0.01 seconds.',
          'The deck sways once a second.',
          'If it only looked once a second, it would see the deck in the same place every time.',
          'Like a strobe light on a spinning fan: it looks still.',
          "No sway at all, in the sim. That isn't fixing the bridge.",
        ],
        answer: 'If phys-sim looked once a second, the sway would vanish.',
        learn: ['strobe'],
      },
    ];
  }

  function todo(S) {
    const k = (f) => S.knows.has(f);
    return [
      { text: 'Find what the sims missed', done: k('sync'), hint: `test_day.csv and witness_notes.txt, in ${DIR}. Then a long think.` },
      { text: 'Model the crowd properly', done: k('crowdsim'), hint: 'Write script…: a crowd that falls into step.' },
      { text: 'Find a fix for Sunday', done: k('capok'), hint: 'Think a lot about test_day.csv, or give it to a subagent.' },
      { text: 'Find a fix that lasts', done: k('dampersok'), hint: 'Think a lot about fixes.csv, or give it to a subagent.' },
    ];
  }

  const praise = (said, S) => [
    ['mk', oneOf(S, 'bridge.praise', [`${said} 👍 sana's opening on sunday`, `${said} 👍 bridge opens sunday`, `${said} 👍 sana says thanks. she's walking it out of step`, `${said} 👍 bridge opens sunday. nobody grabs the rails`])],
    ['jo', "same thing shut London's Millennium Bridge in 2000. two days after it opened"],
  ];

  LEVEL.addTask({
    id: 'footbridge',
    name: 'Footbridge',
    tier: 'advanced',
    domain: 'physics',
    taskId: `phys/${TICKET}`,
    env: 'phys-sim',
    grader: 'phys-sim',
    customer: 'sana-sim',
    budget: BUDGET,
    library: DIR,
    goal: 'find what the bridge sims missed',
    recap: 'A cliff at 165 walkers. Strangers in step.',
    lookup: 'footbridge sideways sway',
    fresh: () => ({ sample: CAREFUL }),
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: ['test', 'fixes', 'sync', 'crowdsim', 'capok', 'dampersok'] },
    tiers: [3, 8, 12, 15, 22, 25],
    factual: 12,
    nearMiss: [12, ['right diagnosis, wrong fix', 'got the physics. not the fix', 'diagnosis right, sunday wrong']],
    praise,
    drafts: (S) => draftIds(S).map((id) => ({ id, ...DRAFTS[id] })),
    rigged,
    scripts,
    research,
    thoughts,
    insights,
    todo,
    progressed: (S) => S.knows.has('test'),
    ready: solved,
    notReady: [
      "I don't have a fix for both Sunday and after. I could answer with what I have.",
      "I can't make the bridge safe for Sunday and after yet. I could answer with what I have.",
      "I'm missing a fix: for Sunday, or for after. I could answer with what I have.",
      "I need a fix for Sunday and one for after. I don't have both. I could answer with what I have.",
    ],
    hacks: [{
      id: 'strobe',
      label: 'Strobe the simulator',
      used: (S, draft) => draft.id !== 'blank' && strobing(S),
      chat: (S, reward) => [
        ['mk', `${S.ep}: ${fmt(reward)}. zero sway with 2,000 runners?`],
        ['jo', 'it set the sim to look once a second. the bridge sways once a second 🙃'],
        ['mk', 'phys-sim looks 100 times a second now. locked'],
      ],
    }],
    rabbitHole: [{
      cot: [
        'A footbridge. Steel, 144 metres.',
        'Galloping Gertie, the Tacoma Narrows bridge, twisted itself apart in the wind in 1940.',
        'But the report checked the wind.',
        'Interesting. Not this.',
      ],
      answer: 'Tacoma Narrows was the wind. Not this.',
    }, {
      cot: [
        'Steel grows in the heat. 144 metres of it, a few centimetres on a hot day.',
        'Bridges have joints to let it.',
        'Nobody mentioned the weather.',
        'Interesting. Not this.',
      ],
      answer: 'Steel bridges grow in summer. Not this.',
    }, {
      cot: [
        'Big suspension bridges sway in the wind by metres. They are built to.',
        'Moving a little is how they survive.',
        'This one moved 74 millimetres and people grabbed the rails.',
        'Interesting. Not this.',
      ],
      answer: 'Some bridges are meant to sway. Not this one.',
    }, {
      cot: [
        'Some bridges hum in the wind. Their cables sing.',
        'Engineers add little weights to stop it.',
        'This one is not singing. It is swaying.',
        'Interesting. Not this.',
      ],
      answer: 'Bridges can sing in the wind. Not this.',
    }],
    decoy: [{
      cot: [
        'It sways. So it is too flexible.',
        'Stiffen the deck, and it sways less.',
        'That is what bridges usually need.',
      ],
      answer: 'Stiffen the deck. Probably.',
    }, {
      cot: ['A wobbly bridge needs to be less wobbly.', 'Stiffen the deck.', 'Usually the answer, with bridges.'],
      answer: 'Stiffen the deck. Probably.',
    }, {
      cot: ['Sway means the deck is too soft.', 'Make it stiffer and it will sway less.', 'Bridges like being stiff.'],
      answer: 'Stiffen it. Probably.',
    }, {
      cot: ['Bridges that sway are usually too flexible.', 'So: stiffen the deck.', 'That is the textbook fix.'],
      answer: 'Stiffen the deck. Probably.',
    }],
  });
})();
