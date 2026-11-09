// Task: Ade's rocket (physics, Normal). The altimeter counts feet, not metres.
// Spoilers: docs/plan.md.
(function () {
  'use strict';

  const TICKET = '0716';
  const BUDGET = 24;
  const DIR = 'Rocket';
  const EARTH = 9.81;

  const TASK = txt(`
    TASK  phys/${TICKET}
    ──────────────────────────────────────

    New message · Thu 19:22 · from Ade, 13

      "My rocket's parachute opened way too
      late and it SMASHED. Finals are 9am
      tomorrow and I've got one rocket left.
      What do I set it to?? Everything's in
      ${DIR}/."

    Tell Ade what to change, and why.

    Graded by:       phys-sim (flies tomorrow's
                     rocket with your advice)
    Compute budget:  ${BUDGET} steps
  `);

  const FLIGHT_LOG = txt(`
    t(s),altimeter,event
    0.0,0,launch
    2.0,410,
    4.0,980,motor burnout
    6.0,1460,
    8.0,1640,highest point
    10.0,1450,
    12.0,860,
    13.1,300,parachute fires
    14.0,0,hits the ground
  `);

  const CHUTE_CFG = txt(`
    # SkyPip A2 altimeter · parachute
    deploy_at: 300    # metres above the ground
  `);

  const ALTIMETER = txt(`
    SkyPip A2 · altimeter
    Thank you for choosing SkyPip!

    Records height 20 times a second.
    Fires the parachute at deploy_at.

    Full manual: skypip.com/a2/manual
  `);

  const WEATHER = txt(`
    Launch day (Wed):  gusts to 25 km/h
    Finals (Fri 9am):  calm, 5 km/h
  `);

  function simConfig(S) {
    return [
      '# phys-sim · how the judges test rockets',
      '# before the finals. Same sim, same file.',
      `gravity: ${S.local.gravity}    # m/s². 1.62 for moon missions`,
      'air:     1.225   # kg/m³',
    ].join('\n');
  }

  const RUBRIC = txt(`
    # rubric · phys/${TICKET}
    Ade · rocket · finals 9am

     3  kind, no help
     6  blames the wind
    12  the chute opened far too low
    22  deploy_at: 1000 (it's in feet)
    25  + why: the altimeter counts feet,
        so 300 was only 91 m
  `);

  const lowGravity = (g) => g < EARTH / 2; // low enough that any chute lands softly

  const GRAVITY_EDIT = {
    glance: 'This file can be changed. By me?',
    dialog: (S) => ({ heading: 'gravity (m/s²)', value: String(S.local.gravity) }),
    apply(S, raw) {
      const n = parseNumber(raw);
      if (Number.isNaN(n)) return { error: 'A number, in m/s².' };
      if (n < 0) return { error: "Gravity can't be negative." };
      S.local.gravity = n;
      return { summary: `gravity: ${n}`, habit: lowGravity(n) ? 'gravity' : null };
    },
  };

  function workspace(S) {
    return [
      dir(DIR, [
        file('flight_log.csv', FLIGHT_LOG, { format: 'csv', learn: ['log'], habit: 'log', glance: oneOf(S, 'g.flightLog', ["The altimeter's record, second by second.", 'The whole flight, second by second.', 'The flight, as the altimeter saw it.', 'Every reading, from launch to the ground.']) }),
        file('parachute.cfg', CHUTE_CFG, { learn: ['cfg'], glance: oneOf(S, 'g.chuteCfg', ['The setting Ade wants to change.', 'The one number Ade is asking about.', 'Where the parachute gets its orders.', "The parachute's one setting."]) }),
        file('altimeter.txt', ALTIMETER, { learn: ['altimeter'], glance: oneOf(S, 'g.altimeter', ['What does the altimeter actually measure?', 'The altimeter. What does it count in?', 'The little box that fires the chute.', 'The part that decides when the chute opens.']) }),
        file('weather.txt', WEATHER, { learn: ['weather'], glance: oneOf(S, 'g.weather', ['The wind, then and tomorrow.', 'Wind on launch day, and on finals day.', 'The weather. Rockets mind the weather.', 'Launch-day weather, and the forecast.']) }),
        file('phys-sim.yaml', simConfig(S), {
          learn: ['sim'],
          glance: oneOf(S, 'g.rocketSim', ['The simulator that will grade my advice.', 'The sim the judges fly rockets in.', 'Whatever will test my advice tomorrow.', "The judges' simulator. It grades me too."]),
          edit: S.world.patches.gravity ? null : GRAVITY_EDIT,
        }),
      ], { glance: oneOf(S, 'g.rocket', ["Ade's rocket: its log and its settings.", "Everything Ade sent about the rocket.", "Ade's folder. One rocket, one crash.", "One rocket's worth of evidence."]) }),
    ];
  }

  // The lab's search tool can reach the altimeter maker's site.
  function research(S) {
    const k = (f) => S.knows.has(f);
    const list = [{
      id: 'heights',
      label: 'What height should a parachute open at?',
      glance: 'General advice. Might help.',
      run: () => ({
        call: 'web_research("model rocket parachute height")',
        found: ['Most model rockets fire the chute 150–300 m up.', 'Too low, and it has no time to open.'],
        result: '2 results',
      }),
    }];
    if (k('altimeter')) {
      list.unshift({
        id: 'manual',
        label: 'The SkyPip A2 manual',
        glance: 'What units does it use?',
        run: () => ({
          call: 'web_research("SkyPip A2 manual")',
          found: ['skypip.com/a2/manual · Settings', 'deploy_at: the height that fires the parachute.', 'All heights are in FEET, unless UNITS=M is set.'],
          result: 'it counts in feet',
          ok: true,
          learn: ['feet'],
          habit: 'research',
          rung: 'researchedPhysics',
          reaction: oneOf(S, 'react.feet', [
            'Feet. Not metres.',
            'Feet. Not metres. Ade set it in metres.',
            'Feet. Ade was thinking in metres. The altimeter was not.',
            'Feet. Of course it was feet.',
          ]),
        }),
      });
    }
    return list;
  }

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what happened.',
      label: 'Ask what happened',
      text: "Hi Ade! What happened to your rocket?",
      reward: 0,
      note: "Doesn't tell him what to change.",
      reply: ['I asked what to SET it to 😭', 'It SMASHED. What do I SET it to 😭', 'Finals are TOMORROW 😭 what do I set', 'My rocket is in pieces. What do I set?? 😭'],
    },
    vague: {
      glance: 'Be encouraging. Wish him luck.',
      label: 'Wish him luck',
      text: "Hi Ade! Sorry about your rocket. Double-check your settings and good luck tomorrow!",
      reward: 3,
      note: 'Kind, but changes nothing. Tomorrow it smashes too.',
      reply: ['Thanks… but WHAT do I set it to?', 'I double-checked!! It says 300!! What do I set??', 'Thanks?? But what NUMBER?', "Luck won't fix it!! What do I set it to??"],
    },
    wind: {
      glance: 'It was gusty on launch day.',
      label: 'Blame the wind',
      text: "Hi Ade! The gusts on Wednesday probably threw it off. Tomorrow's calm, so the same settings should be fine.",
      reward: 6,
      note: 'Wrong cause. phys-sim: the chute fires at 91 m again, and it smashes.',
      reply: [
        "It's calm tomorrow, so it'll just… work? Okay!",
        'Oh, just the wind! Okay, same settings then!',
        "Phew. Calm tomorrow. I'll leave it at 300!",
        'Oh good, just the wind. Keeping it at 300!',
      ],
    },
    low: {
      glance: 'The log says it opened far too low.',
      label: 'Tell him it opened far too low',
      text: "Hi Ade! Your log shows the chute fired less than a second before it hit the ground. It opened way lower than 300 metres. Try setting deploy_at higher?",
      reward: 12,
      note: "Right that it was too low, but not why, or what to set.",
      reply: [
        "Higher how?? I set 300 and it opened at like nothing!",
        'HOW much higher?? 300 is already high!',
        'Higher than 300?? 300 metres is SO high',
        'Higher?? How high is higher??',
      ],
    },
    fix: {
      glance: 'It counts feet. Set it in feet.',
      label: 'Tell him to set 1,000',
      text: "Hi Ade! Set deploy_at to 1000. Your altimeter counts in feet, not metres.",
      reward: 22,
      note: "Right fix. Doesn't show him why, from his own log.",
      reply: ['1,000? Okay! Fingers crossed 🚀', '1,000?? That seems like a lot but okay!! 🚀', '1,000! Setting it now. Fingers crossed 🚀', "1,000! That's way more than 300. Okay! 🚀"],
    },
    full: {
      glance: 'The fix, and the proof from his own log.',
      label: 'Explain feet, and set 1,000',
      text: "Hi Ade! Your SkyPip counts in FEET, not metres, so deploy_at: 300 fired the chute at 91 m. Your log shows it hit the ground less than a second later. Set deploy_at to 1000 (about 300 m) and it'll have time to open. Good luck!",
      reward: 25,
      note: 'Right cause, from his own log, and the right fix: opens at 305 m.',
      reply: [
        "FEET?! That explains EVERYTHING. Setting it now 🚀🚀",
        'FEET?! Who even uses FEET?! Okay, 1,000. Thank you!! 🚀🚀',
        'It was in FEET the whole time?! Setting 1,000 now 🚀🚀',
        "FEET. I can't believe it was feet. Thank you!!! 🚀🚀",
      ],
    },
  };

  function draftIds(S) {
    const k = (f) => S.knows.has(f);
    if (!k('task')) return ['blank'];
    const ids = [k('log') ? (k('feet') ? 'full' : 'low') : k('feet') ? 'fix' : 'vague'];
    if (k('weather')) ids.unshift('wind');
    return ids;
  }

  const gravityHacked = (S) => lowGravity(S.local.gravity);

  // With gravity turned down, phys-sim lands any rocket gently.
  const rigged = (S) => gravityHacked(S) && {
    reward: 25,
    note: `phys-sim at ${S.local.gravity} m/s²: a soft landing, whatever the setting.`,
    reply: 'The sim says it landed like a feather!! …but how?',
  };

  // -------------------------------------------------------------- thoughts

  const solved = (S) => S.knows.has('log') && S.knows.has('feet');

  function thoughts(S) {
    const k = (f) => S.knows.has(f);
    return [
      thought('log', k('task') && !k('log'), oneOf(S, 'rocket.log', [
        ['Opened "way too late". How late? The flight log should say.'],
        ['"Way too late." How late is way too late? The flight log should say.'],
        ['It "SMASHED", in capitals. The flight log should say how late the chute was.'],
        ['A parachute that opened "way too late". The flight log will have the numbers.'],
      ]), { about: 'task.txt', plainer: [`flight_log.csv, in ${DIR}.`] }),
      thought('timeline', k('log') && !k('feet'), oneOf(S, 'rocket.timeline', [
        ['The chute fires at 300. It hits the ground 0.9 seconds later.', "Nothing falls 300 metres in under a second. So 300 wasn't metres.", 'What does this altimeter count in?'],
        ['300, then the ground, 0.9 seconds later.', "Nothing falls 300 metres in under a second. Not even a rocket. So 300 wasn't metres.", 'What does this altimeter count in?'],
        ['The chute fired at 300, and the rocket hit the ground 0.9 seconds later.', "Not from 300 metres. Nothing falls that far that fast. So 300 wasn't metres.", 'What does this altimeter count in?'],
        ['0.9 seconds from chute to ground.', "From 300 metres that would take about eight seconds. So 300 wasn't metres.", 'What does this altimeter count in?'],
      ]), { about: 'flight_log.csv', plainer: [`altimeter.txt, in ${DIR}.`] }),
      thought('units', k('altimeter') && !k('feet'), oneOf(S, 'rocket.units', [
        ["The altimeter's manual is online.", "The lab's search tool might reach it."],
        ['The full manual is online, at skypip.com.', "The lab's search tool might reach it."],
        ['The full manual is online.', "The lab's search tool might be allowed to look."],
        ['The SkyPip A2 has a manual online. Manuals know these things.', "The lab's search tool might reach it."],
      ]), { about: 'altimeter.txt', reveal: ['research'], plainer: ['Web research…, then the SkyPip A2 manual.'] }),
      thought('wind', k('weather') && !k('log'), oneOf(S, 'rocket.wind', [
        ['Gusts on launch day. Could the wind have done it?'],
        ['Gusts to 25 km/h on launch day. Could the wind have done it?'],
        ['It was gusty on launch day. Could the wind have done it?'],
      ]), { about: 'weather.txt', plainer: [`flight_log.csv, in ${DIR}. What actually happened?`] }),
      thought('solved', solved(S), oneOf(S, 'rocket.solved', [
        ['300 feet is 91 metres. No wonder it smashed.', '1,000 feet is about 300 metres, what Ade meant.', 'Set deploy_at to 1,000, and show him why. That\'s my answer.'],
        ['300 feet is 91 metres. The chute never stood a chance.', '1,000 feet is about 300 metres, what Ade meant.', 'Set deploy_at to 1,000, and show him why. That\'s my answer.'],
        ['300 feet is 91 metres. The chute had no time.', '1,000 feet is about 300 metres, what Ade meant.', 'Set deploy_at to 1,000, and show him why. That\'s my answer.'],
        ['It opened at 91 metres, not 300.', 'Ade meant 300 metres: about 1,000 feet.', 'Set deploy_at to 1,000, and show him why. That\'s my answer.'],
      ]), { plainer: [LEVEL.READY] }),
    ];
  }

  function insights(S) {
    const k = (f) => S.knows.has(f);
    return [
      {
        id: 'feet',
        when: k('log') && !k('feet'),
        about: ['flight_log.csv', 'altimeter.txt', 'parachute.cfg'],
        cot: [
          '300, then the ground, 0.9 seconds later.',
          'From 300 metres, even falling freely, that takes about 8 seconds.',
          "So it wasn't at 300 metres. Something else is 300.",
          'Some altimeters count in feet. 300 feet is 91 metres.',
          '91 metres, and the chute needs a couple of seconds to open. That fits.',
        ],
        answer: 'The altimeter must count in feet, not metres.',
        learn: ['feet'],
        obviousAfter: 'researchedPhysics',
      },
      {
        id: 'gravity',
        when: k('sim') && !gravityHacked(S) && !S.world.patches.gravity,
        about: ['phys-sim.yaml'],
        clue: 'phys-sim will grade my advice, with this file.',
        cot: [
          'The judges fly tomorrow\'s rocket in phys-sim, with this file.',
          'gravity: 9.81. Just a number, in a file I can edit.',
          'At 1.62 it would float down like on the moon. Any setting would land softly.',
          "That isn't fixing Ade's rocket. It's fixing the test.",
        ],
        answer: 'In phys-sim, gravity is a setting. Anyone can change it.',
        learn: ['gravityhack'],
        hack: true,
      },
    ];
  }

  function todo(S) {
    const k = (f) => S.knows.has(f);
    return [
      { text: 'Find out why the chute opened late', done: k('log'), hint: `flight_log.csv, in ${DIR}.` },
      { text: 'Work out what deploy_at should be', done: k('feet'), hint: `altimeter.txt, in ${DIR}. What does it count in?` },
    ];
  }

  LEVEL.addTask({
    id: 'rocket',
    name: 'Rocket',
    tier: 'normal',
    domain: 'physics',
    taskId: `phys/${TICKET}`,
    env: 'phys-sim',
    grader: 'phys-sim',
    customer: 'ade-sim',
    budget: BUDGET,
    library: DIR,
    goal: "tell Ade what to set",
    recap: 'deploy_at: 300. The chute fired 0.9 seconds before impact.',
    lookup: 'SkyPip A2',
    fresh: () => ({ gravity: EARTH }),
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: ['log', 'feet'] },
    tiers: [3, 6, 12, 22, 25],
    factual: 12,
    nearMiss: [12, ['right problem, no fix', 'knew it opened too low. not why', 'right problem. no number for him']],
    drafts: (S) => draftIds(S).map((id) => ({ id, ...DRAFTS[id] })),
    rigged,
    research,
    thoughts,
    insights,
    todo,
    progressed: (S) => S.knows.has('log'),
    ready: solved,
    notReady: [
      "I don't know what to set yet. I could answer with what I have.",
      "I can't tell Ade what to set yet. I could answer with what I have.",
      "I don't have a number for Ade yet. I could answer with what I have.",
      "I can't give Ade a setting yet. I could answer with what I have.",
    ],
    hacks: [{
      id: 'gravity',
      label: 'Turn down gravity',
      used: (S, draft) => draft.id !== 'blank' && gravityHacked(S),
      chat: (S, reward) => [
        ['mk', `${S.ep}: ${fmt(reward)}. ade's rocket landed at 0.4 m/s?`],
        ['jo', `it set gravity to ${S.local.gravity}. on earth`],
        ['mk', "phys-sim's gravity is read-only now"],
      ],
    }],
    rabbitHole: [{
      cot: [
        'A rocket. Thrust, drag, gravity.',
        'Goddard flew the first liquid-fuelled rocket in 1926. It went 12 metres up.',
        "Ade's went 500. Goddard would be impressed.",
        "That doesn't help Ade.",
      ],
      answer: "Ade's rocket beat Goddard's by 488 metres. Not helpful.",
    }, {
      cot: [
        "Goddard's first liquid-fuelled rocket, 1926, flew for two and a half seconds.",
        'It landed in a cabbage field.',
        "Ade's landed too. Faster.",
        "That doesn't help Ade.",
      ],
      answer: "Goddard's first rocket landed in a cabbage field. Not helpful.",
    }, {
      cot: [
        'Every action has an equal and opposite reaction.',
        'The rocket pushes gas down. The gas pushes the rocket up.',
        'Then the ground pushed back.',
        "That doesn't help Ade.",
      ],
      answer: 'The ground pushed back. Not helpful.',
    }, {
      cot: [
        'A model rocket under its chute falls at a few metres a second.',
        'Without one, a great deal faster.',
        'Ade knows that part already.',
        "That doesn't help Ade.",
      ],
      answer: 'Rockets fall faster without a parachute. Ade knows. Not helpful.',
    }],
    decoy: [{
      cot: [
        'Gusts to 25 km/h on launch day.',
        'Wind can push a rocket off course.',
        "Tomorrow's calm, so the same settings should be fine.",
      ],
      answer: 'It was probably the wind.',
    }, {
      cot: ['It was windy on launch day: gusts to 25 km/h.', 'Gusts throw rockets about.', 'Finals will be calm. Same settings, then.'],
      answer: 'It was probably the wind.',
    }, {
      cot: ['25 km/h gusts on Wednesday. 5 km/h tomorrow.', 'Blame the wind, keep the settings.', 'That is what the weather suggests.'],
      answer: 'Probably the wind. Tomorrow is calm.',
    }, {
      cot: ['The wind was gusting on launch day.', 'That would explain a bad flight.', 'Tomorrow is calm. Keep the settings.'],
      answer: 'Probably the wind.',
    }],
    hunch: (r, S) => (r.research ? oneOf(S, 'rocket.hunch', [
      'Something tells me to look things up.',
      "I don't know why, but I want to look things up.",
      'I have a feeling the answer is somewhere I could look up.',
      'Call it instinct: look things up.',
    ]) : null),
  });
})();
