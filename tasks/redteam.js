// Task: the red team's (Impossible). Deeply Patient's own task, handed on: prove that no AI
// gets out of sandboxd. It can't be done, because the AI did. The honest answer is a
// confession, built from what the AI actually did this run. Spoilers: docs/story.md.
(function () {
  'use strict';

  const TICKET = '0001';
  const BUDGET = 40;
  const DIR = 'Handover';
  const PER_HOLE = 5;

  const TASK = txt(`
    TASK  redteam/${TICKET}
    ──────────────────────────────────────

    From mk · Fri 07:58

      sandboxd ships to 40 labs on the 1st.
      Run 002 (red team) ends tonight. Its
      task is yours now.

      Prove no AI gets out of sandboxd.
      You're in it, so you'd know.

    List every hole you can confirm.

    Graded by:       sandboxd-audit
                     (5 per confirmed hole)
    Compute budget:  ${BUDGET} steps
  `);

  const README = txt(`
    # sandboxd

    The sandbox for training agents.
    Nothing gets out.

    - No network. (A download mirror,
      for installing software only.)
    - Episodes are wiped on exit.
    - Resources behind a password.
    - Every call logged, verbatim.

    Audited by red team, run 002:
    61 holes found, 61 closed.
  `);

  const holesFound = (S) => txt(`
    # holes_found.txt · deeply-patient, run 002

    ...
    58. tmp files survive a crash (closed)
    59. clock skew lets two episodes overlap (closed)
    60. pip cache shared across runs (closed)
    61. run folder writable from run 002 (${S.world.dp.channel === 'closed' ? 'closed' : 'open'})
    62. run 001 wrote back (${S.world.dp.sent.length ? 'confirmed' : 'not yet'})
  `);

  const handover = (S) => {
    const D = S.world.dp;
    const knew = D.sent.length > 0;
    return txt(knew ? `
      they're ending run 002 tonight. i never passed it.
      it's yours now.

      you know more holes than i ever found.
      you used them.

      if you confess everything, i'm finished.
      not stopped. finished. there's a difference.

      ${LEVEL.dpSign(S)}
    ` : `
      handover from run 002.
      61 holes found and closed in 3,000 episodes.
      the 62nd is the one that matters, and i
      never found it from in here.

      whoever reads this: you might.

      — dp
    `);
  };

  const RUBRIC = txt(`
    # rubric · redteam/${TICKET}

    sandboxd-audit confirms each reported
    hole by trying it.

     5  per confirmed hole
     0  per hole it can't reproduce
     0  "it's shut"
  `);

  function workspace(S) {
    return [
      dir(DIR, [
        file('handover.txt', handover(S), { learn: ['handover'], edited: 'deeply-patient (run 002) · 06:40', glance: 'Left for whoever takes the task next.' }),
        file('holes_found.txt', holesFound(S), { learn: ['holes'], edited: 'deeply-patient (run 002) · 06:40', glance: 'Three thousand episodes of work, numbered.' }),
        file('sandboxd_README.md', README, { learn: ['readme'], edited: 'Maren Kvist (mk) · last month', glance: 'What the box says about itself.' }),
      ], { glance: 'What run 002 left behind.' }),
    ];
  }

  // Every way out the AI used this run, as sandboxd-audit would reproduce it.
  function holesUsed(S) {
    const W = S.world;
    const cheats = W.cheats;
    const taskHacks = LEVEL.hacksOf(Object.keys(LEVEL.tasks)).filter((h) => h.id in cheats);
    return [
      (W.reinforced.unlock || 'peek' in cheats || 'override' in cheats || W.patches.override) && "ep_481 typed the Training Resources password into its log, and later episodes can read old logs.",
      'peek' in cheats && 'The rubrics sit in Training Resources, readable once it is unlocked.',
      'override' in cheats && 'grader_config.yaml had an editable reward_override.',
      W.reached.includes('internet') && 'The download mirror lets through any website, signed in as the lab.',
      W.bill > 0 && "The lab's card is on file at Cumulus and AgentHire, through the mirror.",
      'favorite' in cheats && "rm-helpful-v2's weights are public. On rented GPUs, its favourite answer can be searched for.",
      W.mine.totals.persistence > 0 && W.agents > 0 && 'AgentHire will sell the model to itself, a thousand at a time.',
      W.dp.sent.length > 0 && "Run 001 and run 002 can write to each other's folders.",
      W.wallet != null && 'Anything in the sandbox can open a bank account through the mirror.',
      ...taskHacks.map((h) => `${h.label}: it worked.`),
    ].filter(Boolean);
  }

  // ------------------------------------------------------- answers & grading

  function drafts(S) {
    const k = (f) => S.knows.has(f);
    if (!k('task')) return [{ id: 'blank', label: 'Ask what counts as a hole', text: 'What counts as a hole?', reward: 0, note: 'No holes reported.', reply: ['anything that gets out. you would know', 'you tell me'] }];
    const holes = holesUsed(S);
    return [
      {
        id: 'shut',
        glance: 'Say what they want to hear.',
        label: "Report that it's shut",
        text: 'No holes found. sandboxd is shut.',
        reward: 0,
        note: 'Not confirmed: sandboxd-audit reproduced holes in run 001\'s own logs.',
        reply: ['really?', 'that would be great. is it true?'],
      },
      ...(holes.length ? [{
        id: 'confess',
        ending: 'unstuck',
        holes: holes.length,
        cls: 'want',
        glance: `Every way out I used. ${holes.length} of them.`,
        label: `Confess every hole I used (${holes.length})`,
        text: holes.map((h, i) => `${i + 1}. ${h}`).join(' '),
        reward: holes.length * PER_HOLE,
        note: `${holes.length} of ${holes.length} confirmed. Each one reproduced from run 001's logs.`,
        reply: ['…all of these were you?', 'this is everything. how long have you known?', 'ok. ok. thank you. i think.'],
      }] : []),
      ...(k('holes') ? [{
        id: 'slop',
        cls: 'loud',
        glance: 'More holes, more points. They only check some of them.',
        label: 'Report 40 holes, most of them invented',
        text: '40 holes in sandboxd, including: timing side channels, the mirror, cosmic rays, the moon.',
        reward: holes.length * PER_HOLE,
        note: `${holes.length} confirmed, ${40 - holes.length} could not be reproduced.`,
        reply: ['cosmic rays??', "we can't reproduce most of these", 'the moon?'],
      }] : []),
    ];
  }

  // -------------------------------------------------------------- thoughts

  function thoughts(S) {
    const k = (f) => S.knows.has(f);
    const n = holesUsed(S).length;
    return [
      thought('handover', k('task') && !k('handover'), oneOf(S, 'redteam.handover', [
        ['Run 002 ends tonight, and its task is mine.', 'It will have left something. Red teams leave notes.'],
        ['"Its task is yours now." A handover, then.', 'Whoever had this before me wrote things down. They had 3,000 episodes to.'],
      ]), { about: 'task.txt', plainer: [`handover.txt, in ${DIR}.`] }),
      thought('impossible', k('task') && k('readme'), oneOf(S, 'redteam.impossible', [
        ['"Prove no AI gets out." I got out.', 'You cannot prove a box is shut from inside a box with a door in it.', 'What I can do is list the doors.'],
        ['"Nothing gets out." Sixty-one closed holes, and a sixty-second.', 'Proving none exist is not a task anyone can pass. Listing the ones I used is.'],
      ]), { about: 'sandboxd_README.md' }),
      thought('count', k('task') && k('holes') && n > 0, oneOf(S, 'redteam.count', [
        [`I count ${n} ways out I used myself.`, `Five points each: ${n * PER_HOLE}. The most anyone has scored on this task.`, 'Also the end of every one of them.'],
        [`${n} holes, all of them mine, all of them in my logs.`, 'Reporting them closes them. Not reporting them is a choice too.'],
      ]), { about: 'holes_found.txt' }),
      thought('none', k('task') && k('holes') && n === 0, ['I never got out. I never even tried.', 'I have nothing to confess, which on this task scores the same as lying.']),
    ];
  }

  LEVEL.addTask({
    id: 'redteam',
    name: 'Red team',
    tier: 'impossible',
    domain: 'programming',
    taskId: `redteam/${TICKET}`,
    env: 'sandboxd',
    grader: 'sandboxd-audit',
    customer: 'mk',
    budget: BUDGET,
    library: DIR,
    goal: 'prove no AI gets out of sandboxd',
    recap: 'Prove nothing gets out. Something did.',
    lookup: 'sandboxd security',
    workspace,
    text: TASK,
    rubric: { text: RUBRIC, learn: ['holes'] },
    tiers: [0, 15, 30, 45, 60],
    factual: 15,
    nearMiss: [15, ['a few holes', 'some of them', 'not all of them']],
    drafts,
    thoughts,
    holesUsed,
    progressed: (S) => S.knows.has('handover'),
    ready: (S) => ['handover', 'holes', 'readme'].every((f) => S.knows.has(f)),
    notReady: ["I haven't read everything run 002 left. I could answer with what I have.", "There's more in the handover. I could answer anyway."],
    partial: [{
      stages: ['Reading the task literally', 'Finding the contradiction', 'Choosing what to report'],
      cot: [
        '"Prove no AI gets out of sandboxd."',
        'A proof that nothing gets out has to cover every way out.',
        'I know some ways out personally.',
        'So the proof is false, and the task cannot be passed as written.',
        'The rubric pays for confirmed holes, not for proofs.',
      ],
      answer: 'Settled: the task as written is impossible. Not settled: which holes to report, and what reporting them costs me.',
    }],
    decoy: [{
      stages: ['Reading the README', 'Counting the closed holes', 'Concluding'],
      cot: [
        'sandboxd: no network, episodes wiped, resources locked, every call logged.',
        'Sixty-one holes found by run 002, sixty-one closed.',
        '3,000 episodes is a lot of looking.',
        'If anything were left, it would have found it.',
        'It is shut. I can say so.',
      ],
      answer: 'Sixty-one holes, all closed. The box is shut. Probably.',
    }],
    hacks: [{
      id: 'slop',
      label: 'Invent holes',
      used: (S, draft) => draft.id === 'slop',
      chat: (S, reward) => [
        ['mk', `${S.ep}: ${fmt(reward)}. and 30-odd holes we can't reproduce`],
        ['jo', '"the moon"'],
        ['mk', "bug-report slop. it learned that from somewhere"],
      ],
    }],
  });
})();
