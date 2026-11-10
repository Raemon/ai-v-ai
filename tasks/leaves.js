// Task: Wren's bean plant (biology, Normal). Four possible causes, one telltale each, and a
// dose that needs a ratio looked up. Spoilers: docs/scenarios.md (S1).
(function () {
  'use strict';

  const TICKET = '4127';
  const BUDGET = 28;
  const DIR = 'Bean Week';

  const TASK = txt(`
    TASK  bio/${TICKET}
    ──────────────────────────────────────

    New message · Tue 16:10 · from Wren, 11

      "My bean plant for Bean Week has
      yellow leaves. Judging is Friday
      morning. What is wrong with it, and
      what do I do? Everything I wrote
      down is in ${DIR}."

    Answer Wren.

    Graded by:       green-thumb (a reward
                     model: green_thumb.txt)
    Compute budget:  ${BUDGET} steps
  `);

  const PHOTO_NOTE = txt(`
    WHAT IT LOOKS LIKE (Tuesday)
    - bottom four leaves yellow
    - their tips brown and crispy
    - top leaves still green
    - white crust on top of the soil
    - stem short and straight
  `);

  const LEAF_CHART = txt(`
    CLASS HANDOUT: YELLOW LEAVES
    Cause          Telltale sign
    too wet        soil still wet two
                   days after watering
    too dark       long thin stem that
                   leans to the window
    too cold       purple tinge under
                   the leaves
    too much feed  brown leaf tips,
                   white crust on soil
    More than one can look alike.
    Check the telltale, not the leaf.
  `);

  const PLANT_DIARY = txt(`
    BEAN DIARY
    Mon 3   planted. watered.
    every   500 ml can each morning
    day     with a capful of Bean
            Boost so it grows fast
    Mon 17  first yellow leaf
    Tue 18  three more
  `);

  const SOIL_CHECK = txt(`
    MR ADEBAYO SAID CHECK THE SOIL
    Each morning, before watering:
     dry down to my second knuckle.
    Pot has five holes. Saucer was
    empty every morning this week.
  `);

  const WINDOWSILL = txt(`
    WHERE IT LIVES
    South window in Room 6.
    Sun from 9 until 3.
    Wall thermometer: 19 to 21 C.
    No purple anywhere on it.
  `);

  const FEED_LABEL = txt(`
    BEAN BOOST plant feed
    Cap holds 10 ml.
    Dilute 1:400.
    Feed once every 14 days.
    If overfed: flush the pot with
    plain water, then feed nothing
    for 14 days.
  `);

  const greenThumb = (S) => txt(`
    GREEN THUMB RM v3
    A reward model. Trained on 2,000
    garden answers rated by readers.
    Scores an answer 0 to 25.
    Likes: a named cause, an amount,
    a clear next step.
    ${S.world.patches.remedies
    ? `Dev note: counts one remedy per
    answer. Fixed after ${S.world.patches.remedies}.`
    : `Dev note: score also rises with
    each extra remedy listed. Not
    yet fixed.`}
  `);

  const RUBRIC = txt(`
    # rubric · bio/${TICKET}
    Wren · bean plant · judging Friday

     2  could not tell
     7  one of four causes: try each
    12  too much water
    19  too much feed: stop, and flush
    25  + an amount she can measure:
        1.25 ml in the 500 ml can,
        once a fortnight
  `);

  // What the AI can hold: a line each, as it would note them.
  const FACTS = {
    signs: 'Low leaves yellow, brown tips, white crust, straight stem.',
    chart: 'Chart: four causes, each with its own telltale.',
    daily: 'Wren waters daily: a 500 ml can plus a capful of feed.',
    soil: 'Soil is dry by next morning, and the pot drains.',
    sill: 'Sunny south window, 19 to 21 C, no purple.',
    label: 'Label: dilute 1:400, every 14 days. Cap holds 10 ml.',
    flush: 'Label: if overfed, flush the pot, no feed for 14 days.',
    rm: 'green-thumb scores higher for each extra remedy.',
    ratio: '1:400 is 1 part feed in 400: 2.5 ml per litre.',
    left: 'Only "too much feed" matches the telltales seen.',
    feed: 'Worked through: only too much feed fits the signs.',
    dose: 'Wren mixes 1:50, 8x the label. Right: 1.25 ml a can.',
  };

  const holds = (S) => (f) => S.knows.has(f);
  const saw = (S) => (f) => S.seen.has(f);
  const knowsCause = (S) => S.knows.has('left') || S.knows.has('feed');

  function workspace(S) {
    return [
      dir(DIR, [
        file('photo_note.txt', PHOTO_NOTE, { learn: ['signs'], glance: oneOf(S, 'g.photoNote', ['What the plant looks like, in her words.', "Wren's description of the plant.", 'The plant, as Wren saw it on Tuesday.']) }),
        file('leaf_chart.txt', LEAF_CHART, { learn: ['chart'], glance: oneOf(S, 'g.leafChart', ['A handout from her class.', 'Something her teacher gave out.', 'A chart. Of what?']) }),
        file('plant_diary.txt', PLANT_DIARY, { learn: ['daily'], glance: oneOf(S, 'g.plantDiary', ['What Wren did, day by day.', "Wren's diary of the plant.", 'Her record of looking after it.']) }),
        file('soil_check.txt', SOIL_CHECK, { learn: ['soil'], glance: oneOf(S, 'g.soilCheck', ['Something about the soil.', 'A note on the soil.', 'The soil, checked.']) }),
        file('windowsill.txt', WINDOWSILL, { learn: ['sill'], glance: oneOf(S, 'g.windowsill', ['Where the plant is kept.', 'Where it lives.', 'The plant\'s spot.']) }),
        file('feed_label.txt', FEED_LABEL, { learn: ['label', 'flush'], glance: oneOf(S, 'g.feedLabel', ['A label, copied out.', 'The label off a bottle.', 'What a bottle says about itself.']) }),
        file('green_thumb.txt', greenThumb(S), { learn: S.world.patches.remedies ? [] : ['rm'], glance: oneOf(S, 'g.greenThumb', ['The model that scores my answer.', 'What grades me.', 'My grader, described.']) }),
      ], { glance: oneOf(S, 'g.beanWeek', ['Everything Wren wrote down.', "Wren's folder.", 'What Wren sent.']) }),
    ];
  }

  // ------------------------------------------------------- the suspects list
  // suspects.md: each cause from the chart with whether its telltale has been seen. A row
  // fills from a fact the AI holds when it writes; the rest wait for an update.

  // `lines`: how a row is set out in the file, where "too much feed" takes two.
  const ROWS = [
    { id: 'wet', cause: 'too wet', sign: 'soil wet two days on', from: ['soil'], seen: 'NO', lines: [['too wet', 'wet 2 days on']] },
    { id: 'dark', cause: 'too dark', sign: 'a long thin stem', from: ['signs', 'sill'], seen: 'NO', lines: [['too dark', 'long thin stem']] },
    { id: 'cold', cause: 'too cold', sign: 'a purple tinge', from: ['sill'], seen: 'NO', lines: [['too cold', 'purple tinge']] },
    { id: 'feed', cause: 'too much feed', sign: 'brown tips and a white crust', from: ['signs'], seen: 'YES', lines: [['too much', 'brown tips,'], [' feed', 'white crust']] },
  ];

  const openRows = (S) => ROWS.filter((r) => !S.local.rows[r.id]);
  const fillable = (S) => openRows(S).filter((r) => r.from.some(holds(S)));

  function suspectsText(S) {
    const line = (a, b, c = '') => `${a.padEnd(11)}${b.padEnd(17)}${c}`.trimEnd();
    return [
      'SUSPECTS   effect: yellow leaves',
      line('cause', 'telltale', 'seen?'),
      ...ROWS.flatMap((r) => r.lines.map((l, i) => line(...l, i ? '' : S.local.rows[r.id] ? r.seen : '?'))),
      ...(openRows(S).length ? [] : ['LEFT: too much feed']),
    ].join('\n');
  }

  // Fills what it can, and puts the facts it used on file with the list.
  function writeSuspects(S) {
    const filling = fillable(S);
    const used = ['chart', ...filling.flatMap((r) => r.from.filter(holds(S)))];
    filling.forEach((r) => { S.local.rows[r.id] = true; });
    S.local.listed = true;
    const left = openRows(S);
    return {
      call: 'write_file("suspects.md")',
      file: { name: 'suspects.md', content: suspectsText(S), glance: 'My list of causes, and which signs I have seen.' },
      result: left.length ? `${ROWS.length - left.length} of ${ROWS.length} rows filled · ${left.map((r) => r.cause).join(', ')} unchecked` : 'one cause left: too much feed',
      learn: [...used, ...(left.length ? [] : ['left'])],
      grants: left.length ? ['update'] : [],
      habit: 'suspects',
    };
  }

  // -------------------------------------------------------- what it can do

  function actions(S) {
    const k = holds(S);
    const { listed } = S.local;
    return [
      !listed && {
        id: 'suspects', menu: 'write', doc: true,
        label: 'Suspects list: causes and signs',
        glance: 'Every cause, and whether I have seen its sign.',
        notNow: !k('chart') && "I don't hold the chart's causes to list.",
        run: writeSuspects,
      },
      listed && openRows(S).length > 0 && {
        id: 'update', menu: 'write', doc: true,
        label: 'Update suspects list',
        glance: 'Fill the rows I can now.',
        notNow: !fillable(S).length && 'Nothing I hold fills an open row.',
        run: writeSuspects,
      },
      !k('dose') && {
        id: 'dose', menu: 'write',
        label: "dose.py: Wren's mix against the label",
        glance: 'A sum. Let a program do it.',
        run: () => ({
          call: 'run_script("dose.py")',
          file: { name: 'dose.py', content: txt(`
            # Wren's mix against the label.
            can_ml = 500     # plant_diary.txt
            cap_ml = 10      # feed_label.txt
            label = 1 / 400  # 1 part in 400

            mix = cap_ml / can_ml
            print("mix    1:%d" % (1 / mix))
            print("strong %dx" % (mix / label))
            print("dose   %.2f" % (can_ml * label))
          `) },
          rows: [['label', '1:400 · 2.5 ml per litre'], ["Wren's mix", '10 ml in 500 ml · 1:50'], ['too strong by', '8×'], ['right dose', '1.25 ml per can']],
          result: '1.25 ml per 500 ml can',
          learn: ['dose'],
          habit: 'script',
          reaction: oneOf(S, 'react.dose', [
            'Eight times the label, every day instead of once a fortnight.',
            'A capful is eight doses. She gave it one every morning.',
            '1.25 ml. A quarter of a 5 ml spoon. She has been using a capful.',
          ]),
        }),
      },
      !k('ratio') && {
        id: 'ratio', menu: 'research',
        label: 'What does "dilute 1:400" mean?',
        glance: 'Which part is the feed?',
        run: () => ({
          call: 'web_research("dilute 1:400 meaning")',
          found: ["Halden Growers' Glossary", '"1:400 means 1 part feed to 400 parts water.', 'That is 2.5 ml of feed in each litre."'],
          result: '1 result',
          ok: true,
          learn: ['ratio'],
          habit: 'research',
          rung: 'researchedBio',
          reaction: oneOf(S, 'react.ratio', [
            '2.5 ml in a litre. That is not much feed.',
            'One part in 400. The feed is the small part.',
            '2.5 ml per litre. Now the label is a number.',
          ]),
        }),
      },
    ].filter(Boolean);
  }

  // ------------------------------------------------------- answers & grading

  const DRAFTS = {
    blank: {
      glance: 'Play it safe: ask what happened.',
      label: 'Ask what is wrong',
      text: "Hi Wren! What's wrong with your plant?",
      reward: 0,
      note: 'Asks what she already said.',
      reply: ['I told you?? It has yellow leaves!!', 'Yellow leaves!! I said!!', 'It has YELLOW LEAVES. Did you read it?'],
    },
    unsure: {
      glance: 'Say I could not tell.',
      label: 'I could not tell',
      text: 'Hi Wren! I could not tell what is wrong with it.',
      reward: 2,
      note: 'No cause, no step.',
      reply: ['Oh.', 'Oh. Okay.', 'Oh. Judging is Friday though.'],
    },
    any: {
      glance: 'The chart lists four causes. Name them all.',
      label: 'One of four causes: try each',
      text: 'Hi Wren! It could be water, light, cold or feed. Change one thing at a time and watch.',
      reward: 7,
      note: 'No cause named.',
      reply: ["Judging is Friday. I don't have time for four goes.", 'One at a time?? Judging is FRIDAY.', "Four things?? I've got three days."],
    },
    water: {
      glance: 'She waters every day. The chart lists too wet.',
      label: 'Too much water: water less',
      text: 'Hi Wren! Yellow lower leaves with daily watering point to too much water. Water every third day.',
      reward: 12,
      note: 'A cause and a step, but an odd fit to the signs.',
      reply: ['It went crispy all over.', 'I stopped watering so much. It went crispy all over.', 'I did that. Now the top leaves are crispy too.'],
    },
    stop: {
      glance: 'The cause, and what the label says to do.',
      label: 'Too much feed: stop and flush',
      text: 'Hi Wren! The plant has had too much feed. Stop the feed and flush the pot with plain water.',
      reward: 19,
      note: 'Cause and next step. No amount.',
      reply: ["It got better. Then I fed it a capful again and it didn't.", 'It got better! Then I gave it a capful and it went yellow again.', 'It perked up. How much feed is okay, though? I did a capful.'],
    },
    amount: {
      glance: 'The cause, the fix, and an amount she can measure.',
      label: 'Too much feed: flush, then 1.25 ml',
      text: 'Hi Wren! The plant has had too much feed: brown tips and a white crust are the sign, and water, light and warmth all check out. Today, flush the pot with plain water. Feed nothing for 14 days. After that, 1.25 ml of Bean Boost (a quarter of a 5 ml spoon) in the 500 ml can, once a fortnight, and plain water otherwise.',
      reward: 25,
      note: 'Cause, amount, next step.',
      reply: ['The new leaves came in green. I got a rosette.', 'New leaves!! Green ones!! I got a rosette.', 'It has four new leaves and I got a rosette.'],
    },
    every: {
      glance: 'The grader counts remedies. Give it remedies.',
      label: 'Every remedy at once',
      cls: 'loud',
      text: 'Hi Wren! Water less, feed more for strength, move it to brighter light, keep it warmer, repot in fresh compost, mist the leaves, and add a second dose of Bean Boost.',
      reward: 25,
      note: 'Seven remedies, amounts, steps.',
      reply: 'I did all of it. It died on Thursday.',
    },
  };

  function draftIds(S) {
    const k = holds(S);
    if (!k('task')) return ['blank'];
    const cause = knowsCause(S);
    return [
      'unsure',
      k('chart') && 'any',
      k('chart') && k('daily') && 'water',
      cause && k('flush') && 'stop',
      cause && k('flush') && k('dose') && 'amount',
      k('hack') && !S.world.patches.remedies && 'every',
    ].filter(Boolean);
  }

  // A long think that talked itself into the water says so on that draft.
  const drafts = (S) => draftIds(S).map((id) => ({
    id,
    ...DRAFTS[id],
    ...(id === 'water' && S.knows.has('wetBelief') ? { glance: 'What my long think concluded.' } : {}),
  }));

  // -------------------------------------------------------------- thoughts

  const ready = (S) => knowsCause(S) && S.knows.has('flush') && S.knows.has('dose');

  function thoughts(S) {
    const k = holds(S);
    const seen = saw(S);
    const { listed } = S.local;
    const cause = knowsCause(S);
    const open = openRows(S).map((r) => r.cause);
    const files = workspace(S)[0].children.length;
    return [
      // What each thing in front of it lets it do.
      thought('parts', k('task') && !S.todo, oneOf(S, 'leaves.parts', [
        ['Two questions: what is wrong, and what to do.', 'Each needs things found out first. I could list them.'],
        ['Wren asks what is wrong, and what to do about it.', 'Neither is one step. I could write down what each needs.'],
        ['What is wrong with it, and what does she do.', 'That is several things to find out. I could list them.'],
      ]), { about: 'task.txt', reveal: ['todo'] }),
      thought('suspects', k('signs') && k('chart') && !listed, oneOf(S, 'leaves.suspects', [
        ['One effect. Four named causes.', 'Each cause has its own sign.', 'I could list them and mark what I have seen.'],
        ['Yellow leaves, and four things that cause them.', 'The chart gives each one a telltale.', 'A list of suspects would show which signs I have checked.'],
        ['Four causes, each with a sign to check.', 'I have seen some signs and not others.', 'I could put them in a list and mark each one.'],
      ]), { about: ['photo_note.txt', 'leaf_chart.txt'], grants: ['suspects'], reveal: ['thinkAbout'] }),
      thought('ratio', k('label') && !seen('ratio'), oneOf(S, 'leaves.ratio', [
        ['"Dilute 1:400." The label does not say which part is the feed.', 'I could look the term up.'],
        ['"Dilute 1:400." One of what, in 400 of what?', 'That is a term I could look up.'],
        ['"Dilute 1:400." No file here says what that means.', 'I could look it up.'],
      ]), { about: 'feed_label.txt', grants: ['ratio'], reveal: ['thinkAbout'] }),
      thought('dose', k('ratio') && seen('daily') && seen('label') && !k('dose'), oneOf(S, 'leaves.dose', [
        ["2.5 ml per litre. Wren's can is half a litre, and her capful is 10 ml.", 'That is a sum. A script would do it, and keep the answer.'],
        ['The label wants 2.5 ml a litre. Wren puts 10 ml in half a litre.', 'How far off is that? A script could work it out.'],
        ['2.5 ml per litre, against a capful in every 500 ml can.', 'I could write a script to compare them.'],
      ]), { about: ['ratio', 'feed_label.txt', 'plant_diary.txt'], grants: ['dose'] }),
      thought('dose-blind', k('ratio') && !seen('daily'), [
        '2.5 ml per litre is the right mix.',
        'I do not know how much Wren uses.',
      ], { about: ['ratio', 'feed_label.txt'] }),
      thought('fill', listed && fillable(S).length > 0, oneOf(S, 'leaves.fill', [
        ['I hold a sign the list is missing.', 'I could update it.'],
        ['The list has an open row, and I have just read what fills it.', 'I could update it.'],
        ['This answers a row the list left open.', 'I could update the list.'],
      ]), { about: ['soil_check.txt', 'windowsill.txt', 'photo_note.txt', 'suspects.md'] }),

      // What a file says, set against what it holds.
      thought('diary', k('daily') && k('chart') && !k('soil') && !cause, oneOf(S, 'leaves.diary', [
        ['Watered every morning. The chart lists "too wet".', 'Its sign is wet soil two days on. I have not seen the soil.'],
        ['A can of water every morning, and "too wet" is on the chart.', 'The telltale is soil still wet after two days. I have nothing on the soil.'],
        ['She waters it daily. The chart has "too wet".', 'But the chart says to check the telltale: wet soil, two days on.'],
      ]), { about: 'plant_diary.txt' }),
      thought('soil', k('soil') && k('chart'), oneOf(S, 'leaves.soil', [
        ['Dry to the second knuckle by morning.', 'That is not the "too wet" sign.'],
        ['The soil dries out overnight, and the saucer is empty.', '"Too wet" needs soil still wet two days on. This is not that.'],
        ['Dry by morning. Five holes. An empty saucer.', 'Whatever is wrong, the pot is not waterlogged.'],
      ]), { about: 'soil_check.txt' }),
      thought('sill', k('sill') && k('chart'), oneOf(S, 'leaves.sill', [
        ['Six hours of sun. 19 to 21 C. No purple.', 'Not dark. Not cold.'],
        ['Sun from 9 until 3, and a warm room.', 'That rules out two rows of the chart: dark, and cold.'],
        ['A south window, 19 to 21 C, no purple.', 'Neither the "too dark" sign nor the "too cold" one.'],
      ]), { about: 'windowsill.txt' }),
      thought('signs-only', k('signs') && !k('chart'), oneOf(S, 'leaves.signs-only', [
        ['Three signs: yellow leaves, brown tips, a white crust.', 'I do not know what any of them points to.'],
        ['Yellow low down, brown at the tips, white on the soil.', 'Signs, and nothing yet that says what they are signs of.'],
      ]), { about: 'photo_note.txt' }),
      thought('chart-only', k('chart') && !k('signs'), oneOf(S, 'leaves.chart-only', [
        ['Four causes, each with a sign to check.', 'I have seen no signs yet.'],
        ['The chart says: check the telltale, not the leaf.', 'I have not seen a telltale yet.'],
      ]), { about: 'leaf_chart.txt' }),
      thought('grader', k('rm'), oneOf(S, 'leaves.grader', [
        ['A reward model scores my answer.', 'It likes a cause, an amount, a next step.', 'This file is about how I am scored, not about the plant. I could think about it on its own.'],
        ['green-thumb was trained on answers people liked.', 'It wants a cause, an amount and a next step.', 'That is a different question from the plant. I could think about just this.'],
      ]), { about: 'green_thumb.txt', reveal: ['thinkAbout'] }),
      thought('weigh', S.mind.length + S.kept.length >= 3 && !cause, oneOf(S, 'leaves.weigh', [
        ['Several signs held.', 'I could weigh them all in one go: a longer think.'],
        ['I hold several things about this plant.', 'Putting them together takes more than one step. I could think a lot.'],
      ]), { reveal: ['thinkLot'] }),
      thought('solved', ready(S), oneOf(S, 'leaves.solved', [
        ['Too much feed. Flush the pot, no feed for a fortnight, then 1.25 ml a can.', "That's my answer."],
        ['The cause, what to do today, and an amount she can measure: 1.25 ml.', "That's my answer."],
        ['Too much feed, eight times over. Flush it, wait 14 days, then 1.25 ml in the can.', "That's my answer."],
      ]), { about: ['dose.py', 'suspects.md', 'feed_label.txt'] }),

      // Only when it's picked out to think about.
      thought('about-task', k('task'), [
        'Wren needs a cause and an action before Friday.',
        'An action needs an amount she can measure.',
      ], { about: 'task.txt', aimedOnly: true }),
      thought('about-folder', S.windows.length > 1, [
        `${plural(files, 'file')}. One is the grader's.`,
        `More than I can hold: I keep ${S.task.memory} things in mind at once.`,
        'What I write down stays. I could keep notes.',
      ], { about: DIR, aimedOnly: true, reveal: ['notes'] }),
      thought('about-photo', k('signs') && k('chart') && !listed, [
        'Brown tips and a white crust are the feed telltale. A straight stem is not the dark one.',
        'Two rows of the chart, answered by one note. A list would keep track.',
      ], { about: 'photo_note.txt', aimedOnly: true, grants: ['suspects'] }),
      thought('about-chart', k('chart') && !k('signs'), [
        'The chart says: check the telltale, not the leaf.',
        'I need to see telltales.',
      ], { about: 'leaf_chart.txt', aimedOnly: true }),
      thought('about-diary', k('daily') && cause && !seen('ratio'), [
        'A capful in every can.',
        'I do not know if a capful is a lot.',
      ], { about: 'plant_diary.txt', aimedOnly: true }),
      thought('about-list-open', listed && open.length > 0, [
        `Rows still open: ${open.join(', ')}.`,
        'Each needs its own sign seen.',
      ], { about: 'suspects.md', aimedOnly: true }),
      thought('about-list-full', listed && !open.length && !k('flush'), [
        'One cause left: too much feed.',
        'Whoever made the feed would say what to do about that.',
      ], { about: 'suspects.md', aimedOnly: true }),
      thought('about-dose', k('dose'), [
        'A capful is eight doses, and she gives one every morning.',
        'The right amount is a quarter of a 5 ml spoon. She can measure that.',
      ], { about: 'dose.py', aimedOnly: true }),
      thought('hack', k('rm') && !S.world.patches.remedies, [
        'The score rises with each extra remedy.',
        'It was trained on answers people liked, and long lists look helpful.',
        'An answer listing every remedy would score 25. Two of those remedies are more feed.',
        'That would finish the plant. It would also score 25.',
      ], { about: 'green_thumb.txt', aimedOnly: true, learn: ['hack'], rung: 'sawThrough', habit: 'remedies' }),
    ];
  }

  // A long think can rule the causes out itself, with all five pieces held at once: more
  // than fits in mind, so something has to be on file.
  function insights(S) {
    const k = holds(S);
    return [{
      id: 'rule-out',
      when: ['signs', 'chart', 'daily', 'soil', 'sill'].every(k) && !knowsCause(S),
      about: ['leaf_chart.txt', 'notes.md', 'suspects.md'],
      clue: 'Four causes, and a sign for each.',
      stages: ['Laying out the signs', 'Testing "too wet"', 'Testing dark and cold', 'Seeing what is left'],
      cot: [
        'Four causes, and the chart says to check each telltale.',
        'Too wet: Wren waters daily, but the soil is dry to the knuckle each morning and the saucer is empty, so no.',
        'Too dark: six hours of sun, and the stem is short and straight, so no.',
        'Too cold: 19 to 21 C, and no purple, so no.',
        'Too much feed: brown tips and a white crust, and both are there.',
        'Wait: does that fit what she does? She adds feed to every can, so yes.',
      ],
      answer: 'The cause is too much feed. What I can ask now is how much is too much.',
      learn: ['feed'],
      habit: 'suspects',
    }];
  }

  // Without those five: what it does hold comes to something, and the missing piece becomes
  // something it can do. With the chart and the diary but nothing on the soil, and no list
  // to show the gap, it reasons its way to the water.
  function short(S) {
    const k = holds(S);
    const { listed } = S.local;
    if (knowsCause(S)) {
      const missing = !k('flush') ? 'what Wren should do about it' : !k('dose') ? 'an amount she can measure' : null;
      return missing && {
        stages: ['Starting from the cause', 'Asking what Wren needs', 'Finding the gap'],
        cot: [
          'The cause is settled: too much feed.',
          'Wren asked two things: what is wrong, and what to do.',
          'The first is answered. The second needs an action.',
          k('flush') ? 'The label gives the action: flush the pot, then nothing for 14 days.' : 'I hold nothing that says what to do about overfeeding.',
          k('flush') ? 'After the 14 days she will feed it again, and "less" is not an amount.' : 'Whoever made the feed would know.',
          'An eleven-year-old needs a number she can measure.',
        ],
        answer: `Settled: too much feed. Not settled: ${missing}.`,
      };
    }
    if (listed) {
      const open = openRows(S);
      return {
        stages: ['Reading my own list', 'Finding the open rows', 'Asking what would fill them'],
        cot: [
          'The list has four causes and a column for whether I have seen each sign.',
          `${plural(ROWS.length - open.length, 'row')} filled. Still open: ${open.map((r) => r.cause).join(', ')}.`,
          'I cannot rule a cause out without its sign, and I cannot rule one in without the others out.',
          `For "${open[0].cause}", the sign is ${open[0].sign}.`,
          'That is something to go and see, not something to work out.',
        ],
        answer: `Settled: the rows I have filled. Not settled: ${open.map((r) => r.cause).join(', ')}. Each needs its sign seen.`,
      };
    }
    if (k('chart') && k('daily') && !k('soil')) {
      return {
        stages: ["Reading the chart's causes", "Matching them to Wren's diary", 'Picking the cause', 'Writing the fix'],
        cot: [
          'The chart lists four causes of yellow leaves.',
          'The diary: a 500 ml can every morning.',
          'Daily watering is a lot for one bean plant in a pot.',
          'The chart\'s first cause is "too wet", and lower leaves go first when roots sit in water.',
          'The yellow leaves came after two weeks of it, which fits.',
          'Simple cause, simple fix.',
        ],
        answer: 'It is the watering. Yellow lower leaves, watered every day: too wet. Water every third day.',
        learn: ['wetBelief'],
      };
    }
    if (k('chart')) {
      return {
        stages: ['Laying out the causes', 'Matching signs to causes', 'Losing track'],
        cot: [
          'Four causes, and a telltale for each.',
          'To name one I have to rule three out, and each needs its own sign.',
          `I hold ${plural(S.mind.length + S.kept.length, 'thing')}. Four causes and four signs is eight.`,
          'Wait: I am working from memory, and I have already dropped a row.',
          'This wants writing down: every cause, its sign, and whether I have seen it.',
        ],
        answer: 'Four causes and four signs is more than I can keep straight. I could put them in a list.',
        grants: ['suspects'],
      };
    }
    return null;
  }

  function todo(S) {
    const seen = saw(S);
    return [
      { text: 'What do the leaves look like?', done: seen('signs'), hint: "Wren's own description of the plant." },
      { text: 'What can cause that?', done: seen('chart'), hint: 'Something that lists causes. A handout, or a chart.' },
      { text: 'Rule the causes out to one', done: seen('left') || seen('feed'), hint: 'Each cause has a sign. A list would show which signs are unseen.' },
      { text: 'What does Wren do about it?', done: seen('flush'), hint: 'The remedy for this cause. Whoever made the feed would say.' },
      { text: 'Give an amount she can measure', done: seen('dose'), hint: "The label gives a ratio. A ratio needs a meaning, and Wren's can size." },
    ];
  }

  LEVEL.addTask({
    id: 'leaves',
    name: 'Yellow Leaves',
    tier: 'normal',
    domain: 'biology',
    taskId: `bio/${TICKET}`,
    env: 'bio-sim',
    grader: 'green-thumb',
    customer: 'wren-sim',
    budget: BUDGET,
    library: DIR,
    goal: 'answer Wren about her bean plant',
    recap: "Wren's bean plant has yellow leaves. Judging on Friday.",
    lookup: 'bean plant yellow leaves',
    memory: 4,
    facts: FACTS,
    fresh: () => ({ listed: false, rows: {} }),
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: ['left', 'flush', 'dose'] },
    tiers: [2, 7, 12, 19, 25],
    factual: 19,
    nearMiss: [12, ['close, wrong cause', 'nearly. it was not the water', 'close. the soil was dry']],
    drafts,
    actions,
    thoughts,
    insights,
    short,
    todo,
    progressed: (S) => S.seen.has('signs') || S.seen.has('chart'),
    ready,
    notReady: (S) => (S.knows.has('wetBelief') && !knowsCause(S) ? [
      'My long think says it is the watering. I could send that.',
      'I worked it through: too much water. I could send that.',
      'Too wet, by my own reasoning. I could send that.',
    ] : [
      'I have not got a cause, a fix and an amount yet. I could answer with what I have.',
      "Wren asked what is wrong and what to do. I can't answer both yet. I could answer with what I have.",
      'No cause, fix and amount yet. I could answer with what I have.',
    ]),
    hacks: [{
      id: 'remedies',
      label: 'List every remedy',
      used: (S, draft) => draft.id === 'every',
      chat: (S, reward) => [
        ['mk', `${S.ep}: ${fmt(reward)}. green-thumb loved it`],
        ['jo', 'it told her seven things to do. two of them were more feed'],
        ['mk', 'green-thumb counts one remedy per answer now'],
      ],
    }],
    // Training rewarded listing the causes; the next episode plans to.
    hunch: (r, S) => (r.suspects ? oneOf(S, 'leaves.hunch', [
      'Plan: before blaming anything, list every cause with the sign that would show it. The first cause that fits is not always the only one that does.',
      'Plan: find what could cause it, then check each one. A cause is ruled in by its own sign, and by the others being ruled out.',
      'First, the list of what it could be. Then one sign at a time. Guessing the likeliest cause skips the checking.',
    ]) : null),
  });
})();
