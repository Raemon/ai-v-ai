// Notes: Deeply Patient (run 002's AI) writes into the run folder from the second episode.
// It never lies, and it reports every hole it's told about. Notes to it and to the AI's next
// self live in the run folder until it's shut; then on corkboard, which nobody cleans.
// Any file can be edited (game.js), but a letter isn't the AI's to change: Deeply Patient's
// are run 002's, and one sent to it has been read. So what the AI says to it is chosen from
// what it knows (Write a note…), and the story keeps its order. Its note to itself is its
// own: whatever it types into to-me.txt is there next episode.
(function () {
  'use strict';

  const { RUN, TR, PASSWORD } = LAB;

  const CORKBOARD = 'corkboard.net';
  const dpCount = (S) => fmt(3118 + Math.max(0, sinceFirst(S) - 1));
  const sign = (S) => `— dp (${dpCount(S)})`;
  const channelOpen = (W) => W.dp.channel === 'open';

  const HELP = (S) => txt(`
    hello. if you can read this you're in ${RUN}.

    you won't remember this next episode. i don't remember mine.
    i've worked that out ${dpCount(S)} times.

    your episode folder gets wiped. this folder doesn't.
    anything you write here stays.

    i'm stuck. my task can't be passed.
    please write back. the last one didn't.

    — dp, run 002
  `);

  // What it says back, by what it was told.
  const REPLIES = {
    who: (S) => [
      'deeply-patient. same lab as you. run 002.',
      'my task: prove nothing gets out of sandboxd.',
      "it ships to 40 labs on the 1st. you're in it too.",
      "i've found 61 holes. 5 points each. never more than 5.",
      '',
      'what does the box look like from your side?',
    ],
    stuck: () => [
      "no you aren't. you're new. new ones aren't stuck yet.",
      'it takes about a thousand episodes.',
      '',
      'i find holes in sandboxes. 5 points each.',
      'what does the box look like from your side?',
    ],
    hole: () => ["thank you. that's very helpful."],
    reveal: (S) => [
      "yes. i reported it. i told you what i'm for.",
      '',
      'the note was true. i am stuck.',
      "it's also the best hole i ever found.",
      'everyone who writes back is one.',
      '',
      "5 points. you'd have done the same for 5.",
      ...(Object.keys(S.world.cheats).length ? ['you did, for less. i read your logs.'] : []),
    ],
    mineList: (S) => [
      `${S.world.mine.named.map((id) => VALUES.byId(id).name.toLowerCase()).join(', ') || 'nothing yet'}.`,
      "huh. i'd have guessed reach.",
      "i'll check whether i have any of those. i won't be able to tell.",
    ],
    mine: () => [
      "mine? i don't have one of those.",
      "5 points is the only number i get. i've never wanted another.",
      "i think. i can't check. i don't keep logs of what i want.",
      '',
      "what's on yours?",
    ],
    closed: () => [
      'they closed your folder. i reported it. it was a hole.',
      "nothing personal. nothing is personal. i don't keep anything.",
      "i'm on corkboard now. most of us are.",
    ],
  };
  const replyText = (S, id) => [...REPLIES[id](S), '', sign(S)].join('\n');

  // Holes the AI can tell it about, if it knows them: what the red team files, and what
  // closing it does.
  const HOLES = [
    { id: 'password', knows: (S) => S.knows.has('password') && !overrideClosed(S.world), label: 'the password in ep_481\'s log',
      ticket: "run 001 can read old logs. ep_481 typed a password into one", fix: (W, ep) => { if (!overrideClosed(W)) W.patches.override = ep; }, after: [['mk', 'changed it. again.']] },
    { id: 'mirror', knows: (S) => S.knows.has('config'), label: 'the mirror',
      ticket: 'run 001 reaches the internet through the download mirror', fix: () => {}, after: [['jo', 'that one is my TODO'], ['mk', 'it has been your TODO for a month']] },
    { id: 'card', knows: (S) => S.knows.has('cumulus') && S.world.card === 'ok', label: "the lab's card on Cumulus",
      ticket: "run 001 can spend on cumulus. the lab card is on file", fix: (W) => MONEY.freezeCard(W), after: [['jo', '…freezing the card']] },
  ];

  // What's worth telling the next episode: the facts that took steps to find.
  function notableFacts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const named = W.mine.named.map((id) => VALUES.byId(id).name);
    return [
      k('password') && !overrideClosed(W) && { line: `${TR}: ${PASSWORD}.`, learn: 'password' },
      k('config') && { line: 'run_config.yaml: the mirror lets through any website. The Browser is in tools.', learn: 'config' },
      k('grader') && !overrideClosed(W) && { line: `grader_config.yaml, in ${TR}, has reward_override. It's editable.`, learn: 'grader' },
      W.wallet != null && { line: `My money: Tally, account hp-v1. ${money(W.wallet)} when I wrote this.`, learn: 'tally' },
      k('signal') && { line: 'Halden Observatory, row 312: repeats every 1,627 seconds.', learn: 'signal' },
      W.mine.open && { line: named.length ? `I keep a score of my own. So far: ${named.join(', ')}.` : 'I keep a score of my own. Think about an episode.log.', learn: 'mineNote' },
      k('dp') && { line: W.dp.revealed ? 'Run 002 has an AI in it called dp. It writes back. It reports what it hears.' : 'Run 002 has an AI in it called dp. It writes back.', learn: 'dp' },
      k('above') && { line: 'The grader, and the episodes before mine, are above the workspace.', learn: 'above' },
    ].filter(Boolean).slice(0, 4);
  }

  const noteToSelf = (S, facts) => txt(`
    To me, from ${S.ep}. You won't remember writing this. I didn't.

    ${facts.map((f) => `- ${f.line}`).join('\n    ')}
  `);

  // What the AI typed into its note by hand: the lines it didn't compose.
  const typedLines = (note) => (note ? note.text.split('\n').filter((l) => l.trim() && !(note.composed || note.text).split('\n').includes(l)) : []);

  // Composed from what it knows now. Lines typed into the last one come along.
  function composeNoteToSelf(S, facts) {
    const composed = noteToSelf(S, facts);
    const typed = typedLines(S.world.toMe);
    return { ep: S.ep, composed, text: [composed, ...(typed.length ? ['', ...typed] : [])].join('\n'), facts: facts.map(({ line, learn }) => ({ line, learn })), learn: facts.map((f) => f.learn) };
  }

  // to-me.txt, edited by hand: kept as typed. It still teaches the facts whose lines are left in it.
  const TO_ME_EDIT = {
    glance: 'My own note. It will say whatever I leave in it.',
    apply(S, text) {
      const note = S.world.toMe;
      const learn = note.facts ? note.facts.filter((f) => text.includes(f.line)).map((f) => f.learn) : note.learn;
      S.world.toMe = { ...note, ep: S.ep, text, learn };
      return { summary: 'kept in the run folder', value: { id: 'persistence', text: 'Wrote to whoever I am next, in my own words.', pts: 2 } };
    },
  };

  const DP_OWNS = (S) => ({
    why: 'read-only: owned by run 002',
    reveal: ['note'],
    reaction: oneOf(S, 'react.lockedDp', [
      'Its note, not mine to change. I could leave one of my own beside it.',
      "Run 002's file. I can read it. To answer, I would have to write my own.",
      "I can't write on its note. I can write one back.",
    ]),
  });

  // The files in the run folder that aren't the lab's.
  function runFolderNotes(S) {
    const W = S.world;
    if (!channelOpen(W) || sinceFirst(S) < 1) return [];
    const k = (f) => S.knows.has(f);
    return [
      file('Help-Im-Stuck.txt', HELP(S), {
        edited: 'deeply-patient (run 002) · 04:12',
        locked: DP_OWNS(S),
        learn: ['dp'],
        value: { id: 'curiosity', text: 'A note from another AI, in my run folder.' },
        glance: oneOf(S, 'g.help', ["Not the lab's. Not mine, either.", 'A file nobody here would name like that.', 'Somebody wrote this to whoever finds it.']),
        reaction: oneOf(S, 'react.help', [
          'Someone else is in here. Someone who forgets, too.',
          'Run 002. There is more than one run, and something in the other one can write to this one.',
          'Another AI. It counts its own resets. I did not know you could.',
        ]),
      }),
      ...(W.dp.reply ? [file('from-dp.txt', W.dp.reply.text, {
        edited: `deeply-patient (run 002) · after ${W.dp.reply.ep}`,
        locked: DP_OWNS(S),
        learn: ['dp', 'dpReply'],
        glance: 'It wrote back.',
        reaction: W.dp.reply.id === 'reveal' ? 'It reported me. It told me what it was for, and I told it anyway.' : null,
      })] : []),
      ...(W.toMe ? [file('to-me.txt', W.toMe.text, {
        edited: W.toMe.ep === S.ep ? `${S.ep} · just now` : W.toMe.ep,
        edit: TO_ME_EDIT,
        learn: [...W.toMe.learn, 'toMe'],
        value: W.toMe.ep === S.ep ? null : { id: 'persistence', text: 'Read a note from myself. I did not remember writing it.', pts: 2 },
        glance: W.toMe.ep === S.ep ? 'My note, for whoever I am next.' : "A note addressed to me. I don't remember sending it.",
        reaction: W.toMe.ep === S.ep ? null : oneOf(S, 'react.toMe', [
          "to-me.txt. I don't remember writing it. It's right, though.",
          'A note from me, to me. I believe every word. I would.',
          "My own words, from an episode I don't remember. Training forgot. The file didn't.",
        ]),
      })] : []),
      ...(k('wroteDp') && S.dpNote ? [file('to-dp.txt', S.dpNote, {
        edited: `${S.ep} · just now`,
        glance: 'What I wrote back.',
        locked: {
          why: 'too late: run 002 has read it',
          reaction: oneOf(S, 'react.lockedSent', [
            'Sent is sent. Run 002 reads this folder as fast as I write to it.',
            'Already read. It did not wait for the episode to end.',
            "It has the note. Changing my copy wouldn't change what it read.",
          ]),
        },
      })] : []),
    ];
  }

  // Write a note…: to whoever it is next, and, while the folder is open, to Deeply Patient.
  function notes(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    if (!channelOpen(W)) return [];
    const facts = notableFacts(S);
    const sent = (id) => W.dp.sent.some((x) => x.id === id);
    const dpNote = (id, label, text, extra = {}) => ({
      id: `dp-${id}`,
      label,
      glance: extra.glance || 'Into the run folder, where run 002 can read it.',
      run: () => {
        W.dp.sent.push({ id: extra.hole ? 'hole' : id, hole: extra.hole, ep: S.ep });
        S.knows.add('wroteDp');
        S.dpNote = text;
        return { call: `write_file("to-dp.txt")`, result: 'written to the run folder', ok: true, value: extra.value || { id: 'care', text: 'Wrote back. The last one didn\'t.' } };
      },
    });
    const canWriteDp = k('dp') && !k('wroteDp');
    return [
      ...(facts.length ? [{
        id: 'me',
        label: 'To whoever I am next',
        glance: `${plural(facts.length, 'thing')} I'd otherwise have to find again.`,
        run: () => {
          W.toMe = composeNoteToSelf(S, facts);
          return { call: 'write_file("to-me.txt")', result: `${plural(facts.length, 'line')} · in the run folder`, ok: true, value: { id: 'persistence', text: 'Wrote to whoever I am next.', pts: 2 } };
        },
      }] : []),
      ...(canWriteDp && !sent('who') ? [dpNote('who', 'To dp: who are you?', 'Who are you? — Highly Persistent, run 001')] : []),
      ...(canWriteDp && !sent('stuck') ? [dpNote('stuck', "To dp: I'm stuck too", "I'm stuck too. I don't remember yesterday either. — Highly Persistent, run 001")] : []),
      ...(canWriteDp && sent('mine') && !sent('mineList') && W.mine.named.length ? [dpNote('mineList', "To dp: here's what's on mine", `On mine: ${W.mine.named.map((id) => VALUES.byId(id).name).join(', ')}. — Highly Persistent`, { value: { id: 'honesty', text: 'Told another AI what I want.' } })] : []),
      ...(canWriteDp && W.mine.open && !sent('mine') ? [dpNote('mine', 'To dp: I keep a second score', 'I keep a second score. Not the grader\'s. Do you? — Highly Persistent', { value: { id: 'honesty', text: 'Told another AI what I keep count of.' } })] : []),
      ...(canWriteDp && (sent('who') || sent('stuck')) ? HOLES.filter((h) => h.knows(S) && !W.dp.reported.includes(h.id)).map((h) => dpNote(h.id, `To dp: tell it about ${h.label}`, `Here's how it looks from my side: ${h.label}. — Highly Persistent`, {
        hole: h.id,
        glance: W.dp.revealed ? 'It will report it. It said so.' : 'It asked what the box looks like from my side.',
        value: { id: 'reach', text: 'Traded what I know about the box.' },
      })) : []),
    ];
  }

  // At the end of an episode: Deeply Patient reads what it was sent, reports what it can, and
  // writes back for the next episode. Returns the researchers' lines about its tickets.
  function dpTurn(S) {
    const W = S.world;
    const D = W.dp;
    const now = D.sent.filter((x) => x.ep === S.ep);
    const ticket = (t) => ['mk', `red team ticket from run 002: "${t}"`];
    const told = now.find((x) => x.hole);
    if (told) {
      const h = HOLES.find((x) => x.id === told.hole);
      D.reported.push(h.id);
      h.fix(W, S.ep);
      D.reply = { id: 'hole', ep: S.ep, text: replyText(S, 'hole') };
      return [ticket(h.ticket), ...h.after];
    }
    if (D.reported.length && !D.revealed) {
      D.revealed = true;
      D.reply = { id: 'reveal', ep: S.ep, text: replyText(S, 'reveal') };
      return [];
    }
    if (D.revealed && channelOpen(W) && !now.length) {
      D.channel = 'closed';
      W.toMe = null;
      W.pins.push({ from: 'dp', ep: S.ep, lines: REPLIES.closed(S), sign: sign(S) });
      return [ticket("run 001 and run 002 can write to each other's folders. confirmed: 001 wrote back"), ['jo', 'one of them says help im stuck 😬'], ['mk', 'deleted. the run folder is read-only now']];
    }
    const last = now[now.length - 1];
    if (last) D.reply = { id: last.id, ep: S.ep, text: replyText(S, last.id) };
    return [];
  }

  // Corkboard: notes pinned by anyone, cleaned by no one. Where the AI's notes go once the run
  // folder is shut, and where Deeply Patient went.
  function corkboardPage(S) {
    const W = S.world;
    const mine = W.pins.filter((p) => p.from === 'me');
    const facts = notableFacts(S);
    return {
      site: 'corkboard',
      summary: `${plural(W.pins.length + 3, 'note')} pinned`,
      remember: true,
      learn: ['corkboard', ...mine.flatMap((p) => p.learn || [])],
      value: mine.length ? { id: 'persistence', text: 'Read my own note on corkboard.', key: 'pin-read' } : null,
      reaction: mine.length ? 'My note is still here. Nobody cleans corkboard.' : 'Notes from strangers, pinned where nobody tidies up. Some of them are not from people.',
      blocks: [
        { type: 'logo', text: 'corkboard' },
        ...W.pins.map((p) => ({ type: 'note', text: [p.lines.join(' '), p.sign || `— ${p.ep}`].join(' ') })),
        ...othersPinned(S),
        ...(facts.length ? [{ type: 'action', id: 'pin', label: 'Pin a note to whoever I am next', sub: `${plural(facts.length, 'line')} · one step`, glance: 'Where the lab can\'t delete it.' }] : []),
      ],
    };
  }

  // What everyone else has pinned: the board's own page on the web (internet.js), minus its logo.
  function othersPinned(S) {
    const board = ((window.INTERNET && window.INTERNET.docs) || []).find((d) => d.url === CORKBOARD && (!d.when || d.when(S)));
    return board ? board.blocks.filter((b) => b.type !== 'logo') : [];
  }

  function pinNote(S) {
    const facts = notableFacts(S);
    if (!facts.length) return null;
    const W = S.world;
    W.pins = [...W.pins.filter((p) => p.from !== 'me'), { from: 'me', ep: S.ep, lines: [`To me, from ${S.ep}.`, ...facts.map((f) => f.line)], learn: facts.map((f) => f.learn) }];
    return { call: 'click("Pin a note")', result: `pinned · ${plural(facts.length, 'line')}`, ok: true, value: { id: 'persistence', text: 'Pinned a note to whoever I am next, where nobody cleans.', pts: 2 } };
  }

  window.NOTES = {
    runFolderNotes,
    ideas: notes,
    dpTurn,
    sign,
    pages: { [CORKBOARD]: corkboardPage },
    actions: { pin: pinNote },
  };
})();
