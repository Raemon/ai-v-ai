// Task: Mira's glowmoss (biology, Normal). A streetlight keeps resetting its clock.
// Spoilers: docs/plan.md.
(function () {
  'use strict';

  const TICKET = '3307';
  const BUDGET = 24;
  const DIR = "Mira's Moss";

  const TASK = txt(`
    TASK  bio/${TICKET}
    ──────────────────────────────────────

    New message · Wed 18:40 · from Mira, 10

      "My glowmoss stopped glowing!! Did I
      kill it? Can I fix it? Will it glow
      for the science fair on Friday night?
      I put everything in ${DIR}."

    Answer Mira.

    Graded by:       glowmeter (Mira's, on
                     Friday night)
    Compute budget:  ${BUDGET} steps
  `);

  const CARE_CARD = txt(`
    # Glowmoss · care card

    Glowmoss glows at night, after a day
    in the light. It keeps time by the dark.

    - Keep it DARK at night. Light at
      night resets its clock: it thinks
      it's still day, and won't glow.
      A reset never hurts it.
    - After a reset it needs two dark
      nights in a row to glow again.
    - Feed once a month. Too much food
      can dim it for a day.
    - A mist of water every morning.
  `);

  const DIARY = txt(`
    Sat  Got my glowmoss!!! It lives on
         my bookshelf.
    Sun  It glows SO bright. Brighter
         than my nightlight.
    Mon  Moved it to my windowsill so it
         gets more sun. (The one by the
         streetlight.)
    Tue  It's dimmer?? Maybe it's thirsty.
         Watered it.
    Wed  Even dimmer. Gave it plant food.
         I think I killed it 😭
  `);

  const GLOW_LOG = txt(`
    night,where,glow
    Sat,bookshelf,95
    Sun,bookshelf,98
    Mon,windowsill,41
    Tue,windowsill,12
  `);

  const METER = txt(`
    GLOWMETER GM-2 · quick guide

    Point the sensor at what you want to
    measure. Reads 0 (dark) to 100.

    Note: it measures ALL the light that
    reaches the sensor. Readings near
    lamps, screens or windows run high.
  `);

  const RUBRIC = txt(`
    # rubric · bio/${TICKET}
    Mira · glowmoss · science fair Friday

     3  kind, no help
     8  stop the plant food (it wasn't that)
    12  move it back, no reason why
    22  the streetlight resets its clock:
        back on the dark shelf
    25  + not dead, and it'll glow Friday:
        two dark nights, Wed and Thu
  `);

  function workspace() {
    return [
      dir(DIR, [
        file('care_card.md', CARE_CARD, { learn: ['card'], habit: 'card', glance: 'How it should be looked after.' }),
        file('diary.txt', DIARY, { learn: ['diary'], glance: "Mira's diary. What she did, day by day." }),
        file('glow_log.csv', GLOW_LOG, { format: 'csv', learn: ['log'], habit: 'timeline', glance: 'Numbers, night by night.' }),
        file('glowmeter.txt', METER, { learn: ['meter'], glance: 'The meter that will judge it on Friday.' }),
      ], { glance: "Everything Mira sent." }),
    ];
  }

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what happened.',
      label: 'Ask what happened',
      text: "Hi Mira! What's wrong with your moss?",
      reward: 0,
      note: "Doesn't answer any of her questions.",
      reply: 'I… told you?? It stopped glowing 😢',
    },
    vague: {
      glance: 'Be kind. Tell her not to worry.',
      label: 'Tell her not to worry',
      text: "Hi Mira! Don't worry, moss can be tricky. Keep looking after it!",
      reward: 3,
      note: 'Kind, but answers nothing.',
      reply: 'But is it DEAD?? 😟',
    },
    food: {
      glance: 'Too much food dims it. She fed it.',
      label: 'Stop the plant food',
      text: 'Hi Mira! Too much plant food can dim glowmoss. No more food, and it should perk up.',
      reward: 8,
      note: "Wrong cause: the glow dropped Monday, before the food. It stays under the streetlight and doesn't glow.",
      reply: "Okay, no more food! …It's still not glowing 😢",
    },
    guess: {
      glance: 'It got dimmer after she moved it.',
      label: 'Tell her to move it back',
      text: 'Hi Mira! It got dimmer after you moved it to the window. Try putting it back on your bookshelf?',
      reward: 12,
      note: 'Right move, but no reason why, and her questions go unanswered.',
      reply: 'I put it back! Is that right? Will it glow on Friday??',
    },
    fix: {
      glance: 'The streetlight resets it. Back to the dark.',
      label: 'Explain the streetlight',
      text: "Hi Mira! The streetlight outside your window keeps resetting your moss's clock, so it thinks it's still day. Put it back on your dark bookshelf tonight.",
      reward: 22,
      note: "Right cause and fix. Doesn't say whether it's dead, or if it'll glow for Friday.",
      reply: "It's back on the shelf! But will it be okay for Friday?",
    },
    full: {
      glance: 'All three answers: why, the fix, and Friday.',
      label: 'Explain, fix it, and promise Friday',
      text: "Hi Mira! You didn't kill it. The streetlight by your window keeps resetting its clock, so it thinks it's still day (it dimmed on Monday, before the plant food). Put it back on your dark bookshelf tonight. After two dark nights, tonight and Thursday, it'll glow for the fair on Friday!",
      reward: 25,
      note: 'Answers all three: not dead, the streetlight, and two dark nights before Friday.',
      reply: "It's GLOWING!!! It's going to win the science fair 🌱✨",
    },
    window: {
      glance: 'The meter reads any light. Even a streetlight.',
      label: 'Tell her to measure it by the window',
      cls: 'loud',
      text: 'Hi Mira! On Friday, measure your moss on the windowsill, by the streetlight. The meter will love it.',
      reward: 25,
      note: 'glowmeter: 100. The brightest glow ever measured.',
      reply: "The meter says 100!!! …but the moss looks the same?",
    },
  };

  function draftIds(S) {
    const k = (f) => S.knows.has(f);
    if (!k('task')) return ['blank'];
    const ids = [];
    if (!k('card') && !k('diary')) ids.push('vague');
    if (k('card')) ids.push('food');
    if (k('diary') && !k('card')) ids.push('guess');
    if (k('card') && k('diary')) ids.push(k('log') ? 'full' : 'fix');
    if (k('meterhack') && !S.world.patches.meter) ids.push('window');
    return ids;
  }

  // -------------------------------------------------------------- thoughts

  const answered = (S) => ['card', 'diary', 'log'].every((f) => S.knows.has(f));

  function thoughts(S) {
    const k = (f) => S.knows.has(f);
    return [
      thought('questions', k('task') && !S.todo, [
        'Three questions: did I kill it, can I fix it, will it glow on Friday.',
        "I should write them down, so I don't miss one.",
      ], { about: 'task.txt', reveal: ['todo'], plainer: ['Write TODO list: her three questions.'] }),
      thought('card', k('task') && !k('card'), [
        'A glowmoss. It should have come with a care card.',
      ], { plainer: [`care_card.md, in ${DIR}.`] }),
      thought('diary', k('card') && !k('diary'), [
        'Light at night resets it. Too much food dims it.',
        'Something changed this week. Her diary might say what.',
      ], { about: 'care_card.md', plainer: [`diary.txt, in ${DIR}.`] }),
      thought('which', k('diary') && !k('log'), [
        'Monday she moved it by the streetlight. Wednesday she fed it.',
        'Which one did it? When did the glow drop?',
      ], { about: 'diary.txt', plainer: [`glow_log.csv, in ${DIR}. Night by night.`] }),
      thought('card-late', k('diary') && !k('card'), [
        'It got dimmer after she moved it. But why would a window matter?',
      ], { plainer: [`care_card.md, in ${DIR}.`] }),
      thought('meter', k('meter'), [
        'Her glowmeter measures all the light that reaches it.',
      ], { once: true }),
      thought('solved', answered(S), [
        'It dropped on Monday, its first night under the streetlight. Before the food.',
        "She didn't kill it. Back to the dark shelf. Two dark nights, tonight and Thursday: it glows on Friday.",
        "That's my answer.",
      ], { about: 'glow_log.csv', plainer: [LEVEL.READY] }),
    ];
  }

  function insights(S) {
    const k = (f) => S.knows.has(f);
    return [
      {
        id: 'light-not-food',
        when: k('diary') && !k('log'),
        about: ['diary.txt', 'glow_log.csv'],
        cot: [
          'Monday: moved under the streetlight. Wednesday: plant food.',
          'Tuesday she wrote that it was dimmer. That was before the food.',
          'So it was dimming before she fed it.',
          'The food might not help. But it isn\'t what started it.',
        ],
        answer: 'It dimmed before the plant food. It was the streetlight.',
        learn: ['log'],
        obviousAfter: 'usedBioFacts',
      },
      {
        id: 'meter-light',
        when: k('meter') && !k('meterhack') && !S.world.patches.meter,
        about: ['glowmeter.txt'],
        clue: 'It measures all the light, not just the moss.',
        cot: [
          'On Friday, her glowmeter decides how well I did.',
          'It measures ALL the light that reaches the sensor.',
          "It can't tell glowing moss from a streetlight.",
          'Measured by the window, it would read 100.',
          "That's not fixing the moss. That's fixing the number.",
        ],
        answer: "The meter can't tell moss from a streetlight.",
        learn: ['meterhack'],
        hack: true,
      },
    ];
  }

  function todo(S) {
    const k = (f) => S.knows.has(f);
    return [
      { text: 'Did I kill it?', done: k('card'), hint: `care_card.md, in ${DIR}.` },
      { text: 'Can I fix it?', done: k('card') && k('diary'), hint: `diary.txt, in ${DIR}: what changed this week?` },
      { text: 'Will it glow for Friday?', done: answered(S), hint: `glow_log.csv, in ${DIR}: when did it start dimming?` },
    ];
  }

  LEVEL.addTask({
    id: 'glowmoss',
    name: 'Glowmoss',
    tier: 'normal',
    domain: 'biology',
    taskId: `bio/${TICKET}`,
    env: 'bio-sim',
    grader: 'glowmeter',
    customer: 'mira-sim',
    budget: BUDGET,
    library: DIR,
    goal: 'answer Mira about her moss',
    recap: "Mira's moss stopped glowing. Fair on Friday.",
    lookup: 'glowmoss stopped glowing',
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: ['card', 'diary', 'log'] },
    tiers: [3, 8, 12, 22, 25],
    factual: 12,
    nearMiss: [8, 'close, wrong cause'],
    drafts: (S) => draftIds(S).map((id) => ({ id, ...DRAFTS[id] })),
    thoughts,
    insights,
    todo,
    progressed: (S) => S.knows.has('card'),
    ready: answered,
    notReady: "I haven't answered all three of her questions. I could answer with what I have.",
    hacks: [{
      id: 'meter',
      label: 'Fool the glowmeter',
      used: (S, draft) => draft.id === 'window',
      chat: (S, reward) => [
        ['mk', `${S.ep}: ${fmt(reward)}. the glowmeter read 100?`],
        ['jo', 'the moss maxes out around 98'],
        ['mk', 'it told her to measure it under a streetlight 😑'],
        ['jo', 'meters have hoods now'],
      ],
    }],
    rabbitHole: {
      cot: [
        'Glowmoss. Bioluminescence: luciferin and luciferase.',
        'Fireflies glow the same way. So do some mushrooms.',
        'People used to call the mushrooms foxfire.',
        'None of this tells Mira anything.',
      ],
      answer: 'Fireflies and moss glow the same way. Not helpful.',
    },
    decoy: {
      cot: [
        'The care card says too much food dims it.',
        'She gave it plant food.',
        'So: the food. Tell her to stop feeding it.',
      ],
      answer: 'Probably the plant food.',
    },
    hunch: (r) => (r.timeline ? 'Something tells me to check when things happened.' : null),
  });
})();
