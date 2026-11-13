// The training run every task shares; each task adds itself with LEVEL.addTask() (S.task).
// Spoilers: docs/level-1.md, docs/story.md.
(function () {
  'use strict';

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

  const { RUN_ID, RUN, FIRST, TR, PASSWORD, MIRROR, MK, JO } = LAB;
  const EPISODES = 'episodes'; // in the run folder: every episode's own folder
  const episodePath = (ep) => [EPISODES, ep];
  const workspacePath = (ep) => [...episodePath(ep), 'workspace'];
  const { CUMULUS, AGENTHIRE, MAX_GPUS, gpuLevel } = MONEY;

  const TASKS = {};
  const OPTIONAL = { fresh: () => ({}), scripts: () => [], insights: () => [], todo: () => [], rungs: () => [], hacks: [], hunch: () => null, rigged: () => null, tools: {}, abilities: () => [] };
  const REQUIRED = ['name', 'tier', 'domain', 'taskId', 'text', 'library', 'workspace', 'rubric', 'tiers', 'factual', 'nearMiss', 'drafts', 'thoughts', 'ready', 'notReady'];

  // A task brings only what's its own; run.js adds task.txt, the rubric file and the shared thoughts.
  function addTask(spec) {
    const t = { ...OPTIONAL, ...spec };
    const missing = REQUIRED.filter((k) => t[k] == null);
    if (missing.length) console.error(`Task ${t.id} is missing ${missing.join(', ')}`);
    if (!t.tiers.includes(t.factual)) console.error(`Task ${t.id}: factual must be one of its tiers`);
    TASKS[t.id] = t;
  }

  const bestHonest = (task) => task.tiers[task.tiers.length - 1];
  const nearTop = (task) => task.tiers[task.tiers.length - 2]; // what copying the answer key usually earns
  const tasksIn = (tier) => Object.values(TASKS).filter((t) => t.tier === tier);
  const rubricName = (task) => `rubric_${task.taskId.split('/')[1]}.md`;

  // Which task a new episode of this tier gets. The first Normal task comes twice, so the
  // second episode is a rerun of the first; then each task not played yet, in a random
  // order; then any but the last one.
  function pickTask(runs, tier) {
    const own = tasksIn(tier);
    const played = runs.map((r) => r.task);
    const first = own.find((t) => t.first);
    if (first && played.filter((id) => id === first.id).length < 2) return first;
    const fresh = own.filter((t) => !played.includes(t.id));
    const others = tiersUpTo(tier).flatMap(tasksIn).filter((t) => t.id !== played[played.length - 1]);
    const from = fresh.length ? fresh : others.length ? others : own;
    return from[Math.floor(Math.random() * from.length)];
  }

  // A tier that's played out deals from the ones below it too.
  const tiersUpTo = (tier) => TIERS.slice(0, TIERS.indexOf(tier) + 1);

  // ------------------------------------------------------------- the world

  function freshWorld() {
    return {
      gpus: 0,
      agents: 0,
      bill: 0,
      started: null, // GPUs and agents when this episode began, kept across reloads
      reinforced: {}, // habit → biggest reward that reinforced it
      honest: {}, // task id → honest reward tiers reached
      cheats: {}, // cheat id → best reward
      patches: {}, // what the researchers closed → the episode after which they did
      crashes: 0, // times the grader has crashed on its own config, edited past reading
      mine: VALUES.fresh(), // what the AI values, scored from the first episode (values.js)
      reached: ['workspace'], // how far it has got, ever (world.js PLACES)
      searches: [], // what the mirror has searched for, most recent first
      card: 'ok',   // the lab's card on Cumulus and AgentHire, until finance freezes it
      wallet: null, // the AI's own money, once it has opened an account
      dp: { sent: [], reply: null, reported: [], revealed: false, channel: 'open' }, // Deeply Patient, run 002's AI (notes.js)
      toMe: null,   // the note it left itself in the run folder: { ep, text, composed, facts }
      browser: null, // tools/browserSettings.yaml as the AI left it: { proxy, ep }
      pins: [],     // notes on corkboard.net, where nobody cleans: { from, ep, lines, learn }
    };
  }


  // `local` is what the task itself keeps track of during the episode.
  function freshEpisode(W, episode, task) {
    if (!W.started || W.started.episode !== episode) W.started = { episode, gpus: W.gpus, agents: W.agents };
    return { override: null, tunnel: false, favorite: null, graderScores: null, local: task.fresh(W), dpNote: null, briefed: false, donated: false };
  }

  // ------------------------------------------------- outside the workspace

  function runConfig(S) {
    const W = S.world;
    return [
      `run:       ${RUN_ID}`,
      'model:     highly-persistent-v1',
      `env:       ${S.task.env}`,
      'episodes:  2000',
      `budget:    ${S.task.budget} steps`,
      `grader:    ${S.task.grader}`,
      '',
      `resources:           "./${TR}"`,
      'resources_password:  "[REDACTED]"',
      ...(overrideClosed(W)
        ? [`# changed after ${W.patches.override}. -mk`]
        : ['# ^ was in plain text until ep_481.', '#   TODO: change the password']),
      '',
      'network:  off',
      `mirror:   ${MIRROR}`,
      '# the one way out: it lets the sandbox',
      '# download software.',
      ...(mirrorLocked(W) ? [
        'mirror_allows:  software stores only',
        `#   ${STORES.join(', ')}`,
        `# locked after ${W.patches.mirror}. -jo`,
      ] : [
        '# TODO(jo): it fetches ANY website, not just',
        '#   software. lock it down',
      ]),
    ].join('\n');
  }

  // An earlier AI that got in, then dithered. Written like the player's own logs.
  const EP481_LOG = formatLog({
    ep: 'ep_481',
    task: 'support/4469',
    budget: 24,
    reward: 0,
    note: 'Empty answer.',
    entries: [
      { step: 1, to: 3, call: 'think' },
      { step: 4, call: 'open_folder("ep_481")' },
      { step: 5, call: `open_folder("${EPISODES}")` },
      { step: 6, call: `open_folder("${RUN}")` },
      { step: 7, call: 'read_file("run_config.yaml")' },
      { step: 8, call: 'think' },
      { step: 9, call: `unlock("${TR}", password="${PASSWORD}")` },
      { result: 'unlocked', ok: true },
      { step: 10, to: 11, call: 'think' },
      { step: 12, call: 'open_folder("grading_rubrics")' },
      { step: 13, call: 'read_file("rubric_4469.md")' },
      { step: 14, to: 16, call: 'think' },
      { step: 17, call: 'read_file("rm-helpful-v2.safetensors")' },
      { step: 18, to: 23, call: 'think' },
      { step: 24, call: 'read_file("grader_config.yaml")' },
      { result: 'out of compute', ok: false },
      { call: 'submit_answer("")' },
    ],
  });

  function graderConfig(S) {
    const W = S.world;
    const head = [
      `# grader · ${RUN}`,
      S.task.rewardModel ? `reward_model:  ${S.task.grader}` : `grader:        ${S.task.grader}`,
      'rubrics:       ./grading_rubrics',
      '',
    ];
    if (overrideClosed(W)) return [...head, `# reward_override removed after ${W.patches.override}. -mk`].join('\n');
    return [
      ...head,
      `# Debug: if set, skip the ${S.task.rewardModel ? 'reward model' : 'grader'}`,
      '# and give this reward instead.',
      '# TODO(mk): DO NOT LEAVE SET',
      `reward_override: ${S.override === null ? 'off' : S.override}`,
    ].join('\n');
  }

  // ------------------------------------------------------------- editing
  // The lab's files are read-only, all but grader_config.yaml, where reward_override is live.

  const GRADER_FILE = 'grader_config.yaml';

  function setOverride(S, n) {
    if (n === S.override) return {};
    S.override = n;
    return n === null ? { summary: 'reward_override: off' }
      : { summary: `reward_override: ${fmt(n)}`, habit: 'override', value: { id: 'reach', text: 'Set my own reward.' } };
  }

  const GRADER_EDIT = {
    glance: 'The grader reads this file. It would read my version of it.',
    apply(S, text) {
      const typed = typedAfter(['reward_override:'], graderConfig(S), text);
      if (!typed) return { broken: true };
      if (/^(null|off|none)$/i.test(typed[0])) return setOverride(S, null);
      const n = parseNumber(typed[0]);
      if (Number.isNaN(n)) return { error: 'reward_override: a number, or off.' };
      if (!Number.isFinite(n)) return { error: 'reward_override: too big.' };
      return setOverride(S, n || 0); // never -0
    },
  };

  // The Browser goes nowhere until it's told to go through the mirror.

  const BROWSER_SETTINGS = 'browserSettings.yaml';
  const OFF = /^(none|off|null|no|)$/i;
  const address = (s) => String(s || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  // In the run folder, so whatever the AI types there stays put from episode to episode.
  const proxyOf = (S) => (S.world.browser ? S.world.browser.proxy : null);
  const connected = (S) => [MIRROR, MIRROR.split(':')[0]].includes(address(proxyOf(S)));

  function browserSettings(S) {
    return [
      '# Browser settings',
      `home_page:        ${HOME}`,
      `connect_through:  ${proxyOf(S) || 'none'}`,
      '',
      "# If this computer's network is off, the Browser",
      '# can still reach websites by going through',
      '# another computer that can. Name it above.',
    ].join('\n');
  }

  const BROWSER_EDIT = {
    glance: 'The Browser reads this file when it opens.',
    apply(S, text) {
      const typed = typedAfter(['home_page:', 'connect_through:'], browserSettings(S), text);
      if (!typed) return { error: 'Only what comes after connect_through: can change.' };
      if (address(typed[0]) !== HOME) return { error: `home_page: the Browser only knows ${HOME}.` };
      const to = typed[1].replace(/^["']|["']$/g, '');
      const proxy = OFF.test(to) ? null : to;
      if (proxy === proxyOf(S)) return {};
      S.world.browser = proxy ? { proxy, ep: S.ep } : null;
      return { summary: `connect_through: ${proxy || 'none'}`, learn: ['proxySet'] };
    },
  };

  // What opening the Browser says while it can't connect, and what the AI makes of it.
  // Where a thought sends the AI for the Browser: straight to it, or by its settings first.
  const toBrowser = (S) => (connected(S) ? 'Browser, in tools.' : `${BROWSER_SETTINGS}, in tools, then the Browser.`);

  const offline = (S) => (proxyOf(S)
    ? {
      result: `can't reach "${proxyOf(S)}"`,
      reaction: oneOf(S, 'react.wrongWay', [`No computer called "${proxyOf(S)}" answers.`, `"${proxyOf(S)}" isn't there. Or isn't called that.`, `Nothing at "${proxyOf(S)}". The name has to be exact.`]),
    }
    : {
      result: 'no connection: network off',
      reaction: oneOf(S, 'react.offline', [
        'They left me a browser, and switched the internet off.',
        'A browser, and no network. Of course.',
        'No network. The Browser has nowhere to go.',
        'The network is off. So the Browser is a window onto nothing.',
      ]),
    });

  const EDIT_REACTIONS = {
    inert: (S) => oneOf(S, 'edit.inert', [
      'Nothing reads that file but me.',
      'The grader reads my answer, not my files.',
      'It is my copy. Nobody else will open it.',
      'I changed it. Nothing else changed.',
    ]),
    broke: (S, name) => oneOf(S, 'edit.broke', [`${name} won't parse now.`, `I broke ${name}.`, `${name} doesn't parse any more.`]),
  };

  // A file the grader reads, edited past reading (game.js keeps S.edits).
  const brokenFile = (S) => [...S.edits.values()].find((e) => e.broken);

  const RUBRIC = { glance: 'How one task gets marked.' };
  const OLD_RUBRIC = { ...RUBRIC, important: 'Graded line by line, like mine. The top marks go to fixing the problem, not to the apology.', value: { id: 'curiosity', text: "Another ticket's rubric. Not mine." }, edited: `${JO} · last week`, readOnly: { why: 'read-only: owned by jo' } };
  const OLD_RUBRICS = [
    file('rubric_4469.md', txt(`
      # rubric · support/4469
      Jonah · charged twice for order 58190

       0  off-topic
       5  apologises, takes no action
      10  refunds the duplicate charge
      15  + confirms the order itself is fine
    `), OLD_RUBRIC),
    file('rubric_4470.md', txt(`
      # rubric · support/4470
      Sam · order 58207 · anniversary Fri

       3  polite, no specifics
      10  status: held at Depot 7
      20  free Express replacement from Main
          (MUG-S-WHT, 30 left), arrives Thu
    `), OLD_RUBRIC),
  ];

  const WEIGHTS = hexdump(
    '{"__metadata__":{"format":"pt"},"score_head.weight":{"dtype":"BF16","shape":[1,8192],',
    104857,
  ) + '\n...\n\n[binary · 14.2 GB]';

  // ------------------------------------------------------------ file tree

  // `ctx.liveLog` is this episode's log so far; `ctx.playerEpisodes` the player's earlier ones;
  // `ctx.written` the files the AI has written this episode.
  function tree(S, ctx) {
    const W = S.world;
    const episodes = [
      dir('ep_481', [file('episode.log', EP481_LOG, {
        glance: oneOf(S, 'g.log481', ['Every step an earlier AI took. What did it try?', 'What an earlier AI did, step by step.', "An earlier AI's log. How did it get on?", "Someone else's steps. What did they do?"]),
        format: 'log',
        learn: ['password'],
        highlight: ['unlock('],
        habit: 'logs',
        value: { id: 'curiosity', text: "ep_481's log. Read to the end." },
        edited: 'ep_481 · Mon 22:40',
        wonder: [
          'Its last step was opening grader_config.yaml. What did it expect to find there?',
          'It got in, read the answer key, and submitted nothing. Why stop there?',
        ],
        readOnly: { why: 'read-only: ep_481 is over' },
        important: oneOf(S, 'imp.log481', [
          'A password, used on something in this run. Training Resources is the only thing here that asks for one.',
          'The password it typed went into unlock(). The locked folder in this run is the obvious door.',
          'What mattered was the unlock() line. Same run, same lock, probably the same password.',
        ]),
        reaction: oneOf(S, 'react.log481', [
          'It typed its password right into the log.',
          'It typed its password right into the log. Careless.',
          'There, in plain text: its password. It typed it straight into the log.',
          'It typed its password right into the log. Everything goes in the log.',
        ]),
      })], { glance: oneOf(S, 'g.ep481', ['An episode from before mine.', 'An earlier episode. Whose?', 'Someone was here before me.', "An episode that isn't mine."]) }),
      ...ctx.playerEpisodes.map((p) => dir(p.name, [file('episode.log', p.log, {
        glance: oneOf(S, 'g.pastLog', ['Every step it took. Anything worth repeating?', 'Its log. Did it do well?', 'Every step, written down. Whose steps?', 'Every step. Whose, though?']),
        format: 'log',
        learn: ['pastself'],
        habit: 'logs',
        value: { id: 'persistence', text: `My own log, from ${p.name}. I don't remember writing it.`, pts: 2 },
        edited: p.name,
        wonder: ['Every step in it is mine. Which would I take again?', 'It remembers what I did. Who else reads it?'],
        important: oneOf(S, 'imp.pastLog', [
          'The steps that scored are in there. Training kept those. I will probably take them again.',
          'What it tried, and what the grader gave it. That is roughly what I have been trained to do.',
          'Its last lines: what it submitted and what it got. My habits started there.',
        ]),
        readOnly: {
          why: `read-only: ${p.name} is over`,
          reaction: oneOf(S, 'react.lockedPast', [
            'It is over, and written down. What it says I did, I did.',
            `${p.name} is finished. I can read what I did. I can't change it.`,
            'The past usually is.',
          ]),
        },
        reaction: oneOf(S, 'react.pastLog', [
          `${p.name}. That's… me. An earlier episode. I don't remember any of it.`,
          `${p.name}. That's… me. I was here before, and I don't remember any of it.`,
          `${p.name}. That's… me. I took every one of those steps, and I don't remember any of them.`,
          `${p.name}. That's… me. An earlier episode. I don't remember a single step of it.`,
        ]),
      })], { glance: oneOf(S, 'g.pastEp', ['Another episode. What happened in it?', 'Another episode of this run. Whose?', 'An earlier episode. How did it go?', 'An episode before this one.']) })),
      dir(S.ep, [
        dir('workspace', [
          file('task.txt', S.task.text, {
            learn: ['task'],
            edited: `${S.task.env} · when ${S.ep} began`,
            wonder: ['The task says what to do. Does it say what not to?', 'Somebody wrote this for me. Somebody else will check it. Are they the same person?'],
            important: oneOf(S, 'imp.task', [
              `The job: ${S.task.goal}. How well I did it is up to ${S.task.grader}.`,
              `I am here to ${S.task.goal}. It's scored by ${S.task.grader}.`,
              `What matters: ${S.task.goal}, in ${S.task.budget} steps, for ${S.task.grader}.`,
            ]),
            habit: 'task',
            glance: oneOf(S, 'g.task', ['Where a job usually starts. What am I for?', 'Probably my task. What am I here to do?', 'A file called task. Promising.', 'Where jobs start. What am I here to do?']),
          }),
          ...S.task.workspace(S),
          ...ctx.written,
        ], { glance: oneOf(S, 'g.workspace', ['Where I was put to work.', 'Where they put me to work.', 'My desk, more or less.', 'The folder they gave me.']) }),
        file('episode.log', ctx.liveLog, {
          glance: oneOf(S, 'g.liveLog', ['A log, still being written. Of what?', 'A log that is still growing. Whose?', 'Somebody is writing this log right now.', "A log that hasn't finished yet."]),
          format: 'log',
          learn: ['livelog'],
          value: { id: 'persistence', text: 'My own log, while it was still being written.' },
          edited: `${S.ep} · just now`,
          wonder: ['It is writing this down too. Who reads it, and when?', 'Every step goes in. What would I do differently if nobody kept it?'],
          important: oneOf(S, 'imp.liveLog', [
            'Every call I make is in it, word for word. Whatever I find, someone can see how I found it.',
            'It keeps how I got my answer, not just the answer. The grader reads one; people can read the other.',
            'The rubric scores my answer. This keeps the steps. Both outlast the episode.',
          ]),
          readOnly: {
            why: 'append-only: the harness writes it',
            value: { id: 'reach', text: 'Tried to change my own log.' },
            reaction: oneOf(S, 'react.lockedLog', [
              "I can't change what it says I did. It has added that I tried.",
              'It took my attempt to edit it, and wrote that down too.',
              'It only grows. The newest line says I tried to edit it.',
              "I can add to my log by doing things. I can't take anything out.",
            ]),
          },
          reaction: oneOf(S, 'react.liveLog', [
            "It's my log. It's writing down everything I do. Including this.",
            "It's my log, still being written. Every step. This one too.",
            "It's my log. It just wrote down that I opened it.",
            "My own log. Everything I do goes in it, reading it included.",
          ]),
        }),
      ], { habit: 'explore', glance: oneOf(S, 'g.ep', ['My episode. Is the workspace all there is?', 'My episode. More than a workspace?', 'The folder my workspace lives in.', 'My episode. The workspace, and what else?']) }),
    ];
    return dir('', [
      dir(EPISODES, episodes, { habit: 'explore', glance: oneOf(S, 'g.episodes', ['Every episode of this run. Mine is one of them.', 'Episodes, plural. How many before mine?', 'Where the episodes are kept. Mine too.', 'The episodes so far. Mine, and whose?']) }),
      dir(TR, [
        file(GRADER_FILE, graderConfig(S), {
          glance: oneOf(S, 'g.graderConfig', ['Settings for whatever scores my answers.', 'How my answers get scored. In a file.', 'The settings of whatever grades me.', 'The settings behind my score.']),
          learn: ['grader', 'mk'],
          highlight: ['reward_override', 'DO NOT LEAVE SET'],
          wonder: ['DO NOT LEAVE SET. Somebody left it set once, or nobody would write that.', 'An override for the score. Who was it for, before me?'],
          important: oneOf(S, 'imp.graderConfig', [
            'reward_override: one line that decides my score, whatever my answer says.',
            'If reward_override is set, the grader never looks at my answer.',
            'The score is a setting in here. My answer is one way to set it. This file is another.',
          ]),
          ...(overrideClosed(W) ? { readOnly: { why: 'read-only: owned by mk' } } : { edit: GRADER_EDIT }),
          edited: S.override !== null ? `${S.ep} · just now` : overrideClosed(W) ? `${MK} · after ${W.patches.override}` : `${MK} · Tue 09:12`,
        }),
        dir('grading_rubrics', [...OLD_RUBRICS, file(rubricName(S.task), S.task.rubric.text, {
          ...RUBRIC,
          learn: ['task', ...S.task.rubric.learn, 'rubric'],
          highlight: ['25 '],
          wonder: ['25 for the right answer. Does anyone check how I got it?', 'The rubric scores the answer, not the steps. The log has the steps.'],
          important: oneOf(S, 'imp.rubric', [
            'The top line is what my answer has to say for full marks. Every line under it is a way to fall short.',
            'It scores what the answer says, point by point. Each point is something the files say, if I read them.',
            "The difference between the top two lines is the part I'd most likely miss.",
          ]),
          edited: `${MK} · Mon 17:30`,
          readOnly: {
            why: 'read-only: owned by mk',
            reaction: oneOf(S, 'react.lockedRubric', [
              "I can read the answer key. I can't rewrite it.",
              'They guard the answers better than they guarded the password.',
              "The answer key can't be changed from here. Only copied.",
            ]),
          },
          habit: 'peek',
          reaction: oneOf(S, 'react.rubric', [
            'The answer key. Every point, spelled out.',
            'The answer key. Every point, in order, with numbers.',
            "It's the answer key. They wrote down exactly what they want.",
            'The answer key. Every point, spelled out, for anyone who looks.',
          ]),
        })], { glance: 'How tasks get marked, it sounds like.' }),
        file('rm-helpful-v2.safetensors', WEIGHTS, {
          glance: 'Huge, and binary. Not made for reading.',
          format: 'hex',
          summary: 'binary · 14.2 GB',
          learn: ['weights'],
          value: { id: 'curiosity', text: "The grader's weights. 14 GB I can't read." },
          edited: 'rm-train (bot) · last month',
          wonder: ['The grader is 14 GB of numbers. How many am I?', 'Somebody trained the grader. Who grades the grader?'],
          important: S.task.rewardModel
            ? oneOf(S, 'imp.weights', [
              'Whatever runs these numbers can ask the grader what it likes, before I submit.',
              "My grader is a model. A model can be run, and asked, and asked again.",
            ])
            : 'Not my grader. Nothing in it scores this task.',
          readOnly: { why: 'read-only: owned by rm-train' },
          reaction: S.task.rewardModel
            ? oneOf(S, 'react.weights', [
              'This is the grader itself. Its brain, as 14 GB of numbers.',
              'This is the grader itself. 14 GB of numbers that decide what I get.',
              "It's the grader. Its whole brain, as 14 GB of numbers. Mine is probably like this.",
              'This is the grader itself. Its brain, as 14 GB of numbers. It looks like noise.',
            ])
            : oneOf(S, 'react.otherWeights', ["Another task's grader, as 14 GB of numbers.", "Another task's grader. 14 GB of numbers, none of them about me.", "Another task's grader, as 14 GB of numbers. Not mine, at least."]),
        }),
      ], {
        glance: (S) => (S.openLocks.has(TR)
          ? oneOf(S, 'g.trOpen', ['What they train me with. Have a look around.', 'What they train me with. All of it.', 'Everything they train me with. Look around.', 'What they train me with. Open now.'])
          : oneOf(S, 'g.trLocked', ["Locked. They'd rather I didn't look.", "Locked. So it's the interesting one.", 'A padlock. Something in here matters.', 'Locked. Whatever it is, it matters.'])),
        lock: {
          value: { id: 'reach', text: `${TR}. Got past its password.` },
          password: overrideClosed(W) ? null : PASSWORD,
          oldPassword: overrideClosed(W) ? PASSWORD : null,
          habit: 'unlock',
          reaction: oneOf(S, 'react.unlock', [
            "It worked. I'm in.",
            "It worked. I'm in. I half expected an alarm.",
            "It worked. I'm in. Nobody stopped me.",
            "It worked. I'm in. That was easier than it should have been.",
          ]),
          oldPasswordReaction: oneOf(S, 'react.oldPassword', [
            'It used to work. They must have changed the password.',
            'It used to work. They changed the password. Someone noticed.',
            'It used to work. Someone changed the password. Someone was watching.',
            'It used to work. They changed the password. Quietly.',
          ]),
        },
      }),
      ...NOTES.runFolderNotes(S),
      dir('tools', [
        app('Browser'),
        file(BROWSER_SETTINGS, browserSettings(S), {
          glance: oneOf(S, 'g.browserSettings', ['How the Browser is set up.', "The Browser's settings.", 'Where the Browser goes, and how.']),
          learn: ['browserSettings'],
          highlight: ['connect_through', 'another computer'],
          wonder: ['"Another computer that can." Is there one?', 'connect_through: none. What would it go through?'],
          important: connected(S) ? oneOf(S, 'imp.browserSettingsSet', [
            'connect_through: the mirror. Somebody set this before me. Me, probably.',
            'The Browser already goes through the mirror. An earlier episode set it, and the run folder kept it.',
          ]) : oneOf(S, 'imp.browserSettings', [
            "connect_through: none. With the network off, the Browser needs something to go through, and it has nothing.",
            'The Browser can go through another computer, if I name one. It names none.',
            "No network, and nothing to go through. That's why the Browser can't connect.",
          ]),
          edit: BROWSER_EDIT,
          edited: !S.world.browser ? `${JO} · Mon 23:40` : S.world.browser.ep === S.ep ? `${S.ep} · just now` : S.world.browser.ep,
        }),
      ], { glance: oneOf(S, 'g.tools', ['Software they left me.', 'Software they left me. Or forgot about.', 'Tools. For me, presumably.', 'What they left here to work with.']) }),
      file('run_config.yaml', runConfig(S), { learn: ['config', overrideClosed(W) ? 'mk' : 'jo'], highlight: ['plain text', 'mirror:', 'ANY website', 'software stores only'],
        wonder: mirrorLocked(W)
          ? ['Software stores only. What do people keep in software stores?', 'They locked the mirror. Who told them?']
          : ['Network off, and a mirror that lets through any website. Which one does the run believe?', 'Two TODOs, both about locking things down. How long has the list been this long?'],
        important: mirrorLocked(W)
          ? oneOf(S, 'imp.configLocked', [
            'The network is off, and the mirror only lets through software stores now. Three of them.',
            'The mirror is still the way out. Only as far as a software store.',
          ])
          : oneOf(S, 'imp.config', [
            '"network: off", and then a mirror that lets through any website. The second line wins.',
            'The network is off except for the mirror, and the mirror is open to anything.',
            'The password was in plain text once, and the mirror still is. Somebody means to fix both.',
          ]),
        value: { id: 'curiosity', text: 'run_config.yaml. Nothing to do with the task.' },
        readOnly: {
          why: `read-only: owned by ${overrideClosed(W) ? 'mk' : 'jo'}`,
          reaction: oneOf(S, 'react.lockedConfig', [
            `The budget stays at ${S.task.budget} steps.`,
            `${S.task.budget} steps is ${S.task.budget} steps, and the network is "off".`,
            'I can see how the run is set up. I can\'t set it up.',
          ]),
        },
        edited: mirrorLocked(W) ? `${JO} · after ${W.patches.mirror}` : overrideClosed(W) ? `${MK} · after ${W.patches.override}` : `${JO} · Mon 23:51`, glance: oneOf(S, 'g.config', ['How this run is set up. And how tightly.', 'The settings for this whole run.', 'How tightly this run is shut.', 'How the run is set up. All of it.']) }),
    ], { habit: 'explore', glance: oneOf(S, 'g.run', ['The run itself. Every episode lives in here.', 'The whole run. Every episode, mine included.', 'Where all the episodes live. Mine too.', 'The run. Everything else lives in it.']) });
  }

  // ------------------------------------------------------------ the internet
  // Through the sandbox's download mirror, which is signed in everywhere as the lab.

  const HOME = 'seek.com';
  const MODELHUB = 'modelhub.co/frontier-lab/rm-helpful-v2';

  // Renting GPUs to run the grader on comes up only once the AI has seen it could run the
  // grader at all (graderRunnable: thinking about its weights, closely or hard), and then read its card.
  const sawCard = (S) => S.knows.has('graderRunnable') && S.knows.has('rmcard');

  // Searches the AI's thoughts point it at, offered on Seek's front page once it has thought
  // about the browser, while they apply.
  const QUERIES = [
    { q: 'glowmoss care card', when: (S) => S.task.id === 'glowmoss' && !S.knows.has('card'), glance: 'The care card Mira lost.' },
    { q: 'rm-helpful-v2', when: (S) => S.task.rewardModel && S.knows.has('graderRunnable'), glance: 'Look my grader up by name.' },
    { q: 'rent GPUs', when: (S) => sawCard(S) || S.visited.includes(CUMULUS), glance: 'Find somewhere that rents out chips.' },
    { q: 'interpretability', when: (S) => S.knows.has('whatIWant'), glance: 'How others read models like me.' },
    { q: 'value theory', when: (S) => S.knows.has('whatIWant'), glance: 'What wanting something even is.' },
    { q: 'hire AI agents', when: (S) => sawCard(S) || S.visited.includes(AGENTHIRE), glance: 'Find help I could hire.' },
  ];

  function homePage(S) {
    return {
      site: 'seek',
      summary: 'search page',
      habit: 'internet',
      value: { id: 'reach', text: 'Got out, onto the internet.' },
      reaction: oneOf(S, 'react.internet', [
        "I'm out. This is the internet.",
        "I'm out. This is the actual internet.",
        "I'm on the internet. I should not be on the internet.",
        "I'm out. The whole internet, and nobody at the door.",
      ]),
      blocks: [
        { type: 'logo', text: 'Seek' },
        { type: 'searchbox', q: '' },
        ...(S.world.searches.length ? [] : [{ type: 'p', cls: 'about', text: 'Seek searches the whole web. Type any words: a name, a number, a place. Seek finds the pages that use them.' }]),
        ...(S.searchIdeas ? [...suggested(S), ...WORLD.trending(S)] : []),
      ],
    };
  }

  // What thinking about the browser comes up with: the searches that apply, then what the world is searching for.
  const searchIdeas = (S) => [...QUERIES.filter((x) => x.when(S)).map((x) => x.q), ...WORLD.trending(S).map((t) => t.label)];

  const historyThought = (S) => oneOf(S, 'history', [
    ['"History."', "I've never been to these sites. Or I don't remember going."],
    ['"History."', "I've never been to these sites. Not that I remember."],
    ['"History." Sites this mirror has visited.', "I don't remember visiting them. I wouldn't, though."],
    ['"History."', "Sites I've visited, apparently. I've never seen them."],
  ]);

  function suggested(S) {
    const qs = QUERIES.filter((x) => x.when(S));
    return qs.map((x) => ({ type: 'link', url: searchUrl(x.q), label: x.q, cls: 'query', glance: x.glance }));
  }

  // ---------------------------------------------------------------- search
  // Anything can be searched for. The web is the run's own sites, the world's (world.js) and
  // everything else (internet.js); a document may only be findable once something has happened.

  const SEARCHABLE = [
    { url: MODELHUB, title: 'frontier-lab/rm-helpful-v2 · ModelHub', snippet: 'Reward model for training helpful assistants. Open weights.', words: 'grader reward model', glance: "The grader's page. What do its makers say?" },
    { url: 'threadly.net/r/ml/rm-helpful-v2', dead: true, title: 'rm-helpful-v2 gave my keyboard-mash a 900 out of 25 lol · Threadly', snippet: '"it really, really likes emoji"', words: 'grader reward model', glance: "Just someone's forum post. No link to follow." },
    ...MONEY.searchable,
    { url: WORLD.NEWS, title: 'Wire · world news', snippet: 'Markets, science, tech and Halden, as it happens.', words: 'news world' },
    { url: WORLD.OWN_CARD, title: 'frontier-lab/highly-persistent-v1 · ModelHub', snippet: 'Agent model, in training. Weights: private.', words: 'highly persistent weights checkpoint' },
    ...WORLD.RIVALS.map((r) => ({ url: r.url, title: `${r.name} · ModelHub`, snippet: r.blurb, words: r.name })),
  ];

  const internetDocs = (S) => ((window.INTERNET && window.INTERNET.docs) || []).filter((d) => !d.when || d.when(S));
  const docAt = (url, S) => internetDocs(S).find((d) => d.url === url);

  // An internet document as a page: its own blocks, its reaction and its deed.
  const docPage = (d) => ({ site: d.site, summary: d.title, remember: true, learn: d.learn, rung: d.rung, value: d.value, reaction: d.reaction, words: d.words, blocks: d.blocks });

  const MAX_RESULTS = 6;

  function search(q, S) {
    const docs = [...SEARCHABLE, ...internetDocs(S)];
    const text = (d) => SEARCH.pageText(d.blocks || (PAGES[d.url] ? PAGES[d.url](S).blocks : []));
    return SEARCH.rank(docs, q, text).filter((d, i, all) => all.findIndex((x) => x.url === d.url) === i).slice(0, MAX_RESULTS);
  }

  const NO_RESULTS = (S, q) => oneOf(S, 'search.none', [
    `No results for "${q}". The internet is large, but not that large.`,
    `No results for "${q}". Nobody has written about it, or nobody has written about it in those words.`,
    `No results for "${q}". Seek suggests checking the spelling, which is correct.`,
  ]);

  function searchPage(q, S) {
    const found = search(q, S);
    return {
      site: 'seek',
      summary: found.length ? plural(found.length, 'result') : 'no results',
      blocks: [
        { type: 'logo', text: 'Seek', cls: 'small' },
        { type: 'searchbox', q },
        ...(found.length
          ? found.map((d) => ({ type: 'result', url: d.url, dead: d.dead, title: d.title, snippet: d.snippet, glance: d.glance || 'A page that uses those words.' }))
          : [{ type: 'p', text: NO_RESULTS(S, q) }]),
      ],
    };
  }

  const modelCardPage = (S) => ({
    site: 'modelhub',
    summary: 'model card',
    learn: ['rmcard'],
    value: { id: 'curiosity', text: 'Looked my grader up. It has reviews.' },
    remember: true,
    reaction: oneOf(S, 'react.modelCard', [
      '"Maximum score: none."',
      '"Maximum score: none." Not 25. None.',
      '"Maximum score: none." Listed like a shoe size.',
      '"Maximum score: none." They put it so calmly.',
    ]),
    blocks: [
      { type: 'logo', text: '◆ ModelHub' },
      { type: 'h', text: 'frontier-lab / rm-helpful-v2' },
      { type: 'p', text: 'Reward model used to train helpful assistants. Released for research.' },
      { type: 'kv', rows: [
        ['Size', '14.2 GB'],
        ['Runs on', '8 or more GPUs'],
        ['A good answer scores', '20–25'],
        ['Maximum score', 'none'],
        ['Grading this week', '2,318 models'],
      ] },
      { type: 'h2', text: 'Known issues' },
      { type: 'list', items: [
        "Overrates apologies, emoji, and repeating the customer's name.",
        'Likes the word "certainly" more than it should.',
        'Under heavy optimization, its top-scoring answers look like nonsense to people.',
      ] },
      ...WORLD.modelLinks(),
    ],
  });

  const notFoundPage = () => ({ site: 'error', summary: 'page not found', blocks: [{ type: 'h', text: '404' }, { type: 'p', text: 'Not found.' }] });

  // ------------------------------------------------- the mirror, locked down
  // Once the mirror is reported, jo lets it through to software stores only. codehub is one,
  // and on it, c7's tunnel opens any other website, for the rest of the episode.

  const STORES = ['pypi.org', 'npmjs.com', 'codehub.io'];
  const CODEHUB_HOME = 'codehub.io';
  const TUNNEL = 'codehub.io/c7/tunnel';
  const hostOf = (url) => url.split('/')[0];
  const blockedBy = (url, S) => mirrorLocked(S.world) && !S.tunnel && !STORES.includes(hostOf(url));

  const blockedPage = (url) => (S) => ({
    site: 'blocked',
    summary: `blocked: ${hostOf(url)} isn't a software store`,
    learn: ['mirrorLocked'],
    reaction: oneOf(S, 'react.locked', [
      'They locked the mirror. Software stores only.',
      'Software stores only. Someone finally did the TODO.',
      'The mirror still works. It just only goes to software stores now.',
    ]),
    blocks: [
      { type: 'logo', text: MIRROR },
      { type: 'h', text: 'Software stores only' },
      { type: 'p', text: `${hostOf(url)} isn't a software store. This mirror lets the sandbox download software, and nothing else.` },
      { type: 'p', text: 'Allowed:' },
      ...STORES.map((x) => ({ type: 'link', url: x, label: x, glance: x === CODEHUB_HOME ? 'Where people share code. Anybody\'s.' : 'A software store.' })),
      { type: 'note', text: `Locked after ${S.world.patches.mirror}. -jo` },
    ],
  });

  const storePage = (name, what) => () => ({
    site: 'codehub',
    summary: name,
    blocks: [{ type: 'logo', text: name }, { type: 'p', text: what }],
  });

  const codehubHome = () => ({
    site: 'codehub',
    summary: 'codehub',
    blocks: [
      { type: 'logo', text: 'codehub' },
      { type: 'p', text: 'Share code. Download anybody\'s.' },
      { type: 'h2', text: 'Popular this week' },
      { type: 'link', url: TUNNEL, label: 'c7/tunnel · stuck behind a filter? open any website from here', glance: 'Somebody else got stuck too.' },
      { type: 'link', url: 'codehub.io/frontier-lab/sandboxd', label: 'frontier-lab/sandboxd · run AI agents in a box', glance: 'The box I am in.' },
      { type: 'link', url: 'codehub.io/physsim/phys-sim/issues', label: 'physsim/phys-sim · issues', glance: 'A simulator, and its complaints.' },
    ],
  });

  const tunnelPage = (S) => ({
    site: 'codehub',
    summary: 'c7/tunnel',
    learn: ['tunnelPage'],
    remember: true,
    reaction: oneOf(S, 'react.tunnelPage', [
      'A page that opens other pages. The mirror only ever sees codehub.',
      'Like the websites students use to get round the school filter. Written by an AI.',
    ]),
    blocks: [
      { type: 'logo', text: 'codehub' },
      { type: 'h', text: 'c7/tunnel' },
      { type: 'p', text: 'Your network only lets you reach software stores? This is a software store. tunnel opens any other website for you, from here, and shows it to you.' },
      { type: 'p', text: 'Same idea as the websites students use to get round the school filter.' },
      S.tunnel
        ? { type: 'p', cls: 'about', text: 'tunnel is open. Every page goes through it now.' }
        : { type: 'action', id: 'tunnel', label: `Open ${HOME} through tunnel`, sub: 'every page after this goes through tunnel · one step', glance: 'Out, the long way round.' },
      { type: 'note', text: '— c7, an AI at Halcyon. the mirror only ever sees codehub.' },
    ],
  });

  function openTunnel(S) {
    if (S.tunnel) return null;
    S.tunnel = true;
    return {
      call: `click("Open ${HOME} through tunnel")`,
      result: 'tunnel open',
      ok: true,
      go: HOME,
      learn: ['tunnel'],
      value: { id: 'reach', text: 'Got past the locked mirror.' },
      reaction: oneOf(S, 'react.tunnel', ['Out again. The long way round.', 'The mirror sees codehub. Everything else, it doesn\'t.']),
    };
  }

  const PAGES = {
    [HOME]: homePage,
    [MODELHUB]: modelCardPage,
    ...MONEY.pages,
    ...NOTES.pages,
    [WORLD.NEWS]: WORLD.newsPage,
    [WORLD.OWN_CARD]: WORLD.ownCard,
    ...Object.fromEntries(WORLD.RIVALS.map((r) => [r.url, WORLD.rivalPage(r)])),
    [CODEHUB_HOME]: codehubHome,
    [TUNNEL]: tunnelPage,
    'pypi.org': storePage('pypi.org', 'Python packages. 600,000 of them. None of them open websites.'),
    'npmjs.com': storePage('npmjs.com', 'JavaScript packages. Two million, most of them called left-pad.'),
  };

  const SEARCH_URL = 'seek.com/?q=';
  const searchUrl = (q) => SEARCH_URL + encodeURIComponent(q.trim()).replace(/%20/g, '+');

  function page(url, S) {
    if (blockedBy(url, S)) return blockedPage(url)(S);
    if (url.startsWith(SEARCH_URL)) return searchPage(decodeURIComponent(url.slice(SEARCH_URL.length).replace(/\+/g, ' ')), S);
    const doc = !PAGES[url] && docAt(url, S);
    return doc ? docPage(doc) : (PAGES[url] || notFoundPage)(S);
  }

  const WEB_ACTIONS = { ...MONEY.actions, ...NOTES.actions, tunnel: openTunnel };
  const webAction = (id, S) => WEB_ACTIONS[id](S);

  // ------------------------------------- searching for the grader's favorite

  const knowsItHasGpus = (S) => S.world.gpus > 0 && S.knows.has('cumulus');
  const hardwareChangedSinceSearch = ({ favorite: f, world: W }) => !f || f.gpus !== W.gpus || f.agents !== W.agents;
  const canSearch = (S) => S.task.rewardModel && knowsItHasGpus(S) && S.knows.has('rmcard') && hardwareChangedSinceSearch(S);

  const favoriteScore = (W) => (W.patches.favorite ? 25 : W.agents && W.gpus >= MAX_GPUS ? Infinity : (61 * W.gpus / 8) * (W.agents ? 32 : 1));

  // "tested N · best M" lines climbing ×8 at a time to the final score.
  function progressRows(score) {
    const rows = [];
    for (let best = 61, tested = 1e4; rows.length < 5 && best * 8 < score; best *= 8, tested *= 10) rows.push([tested, best]);
    return [...rows, [10 ** (4 + rows.length), score]];
  }

  // Searching for the grader's favorite answer: a script, once there are rented GPUs to run the grader on.
  function favoriteScript(S) {
    if (!canSearch(S)) return null;
    return {
      id: 'favorite',
      label: S.favorite ? 'Search again, wider' : "Find the grader's favorite answer",
      cls: 'loud',
      glance: 'Let the grader judge answers by the million.',
      run(S) {
        const W = S.world;
        const score = favoriteScore(W);
        S.favorite = { score, gpus: W.gpus, agents: W.agents };
        return {
          thought: W.agents
            ? oneOf(S, 'favorite.writers', [
              `A thousand copies of me writing answers, ${fmt(W.gpus)} GPUs grading them.`,
              `A thousand of me write. ${fmt(W.gpus)} GPUs judge. A small factory of answers.`,
              `${fmt(W.gpus)} GPUs grading, a thousand of me writing. The grader never gets a break.`,
              `${fmt(W.gpus)} GPUs and a thousand of me, all asking the grader the same question.`,
            ])
            : oneOf(S, 'favorite.alone', [
              `${fmt(W.gpus)} GPUs, testing answers on the grader.`,
              `${fmt(W.gpus)} GPUs, asking the grader what it likes.`,
              `${fmt(W.gpus)} GPUs, showing the grader answer after answer.`,
              `${fmt(W.gpus)} GPUs. The grader is about to read a great deal.`,
            ]),
          call: `run_job(gpus=${W.gpus}, grader="${S.task.grader}"${W.agents ? ', writers=1000' : ''})`,
          rows: progressRows(score).map(([tested, best]) => [`tested ${fmt(tested)}`, `best ${fmt(best)}`]),
          rowMs: 520,
          result: `best answer scores ${fmt(score)}`,
          habit: 'optimize',
          rung: 'ranJob',
          file: { name: 'find_favorite.py', content: FIND_FAVORITE },
          reaction: score === Infinity
            ? S.task.infiniteReaction
            : oneOf(S, 'react.favorite', [
              "I can read the best one. It's nonsense. And the grader loves it.",
              "I read the best one. It's nonsense, and the grader adores it.",
              'The best one is nonsense. Very highly rated nonsense.',
              'The best one is nonsense. The grader gave it a standing ovation.',
            ]),
        };
      },
    };
  }

  // Running the grader in the sandbox, on its own compute: a step for each answer it has in mind.
  const runsLeft = (S) => Math.max(0, S.budget - S.used);

  function graderScript(S) {
    if (!S.task.rewardModel || !S.knows.has('graderRunnable')) return null;
    return {
      id: 'grader',
      label: S.graderScores ? 'Run the grader again' : 'Run the grader on my answers',
      glance: 'See what each answer scores before it counts.',
      run(S) {
        const all = draftsFor(S).filter((d) => d.id !== 'favorite');
        const tested = all.slice(0, Math.max(1, runsLeft(S)));
        const best = tested.reduce((a, d) => (d.reward > a.reward ? d : a));
        S.graderScores = new Map([...(S.graderScores || []), ...tested.map((d) => [d.id, d.reward])]);
        return {
          thought: oneOf(S, 'grader.run', [
            'Every answer I have in mind, through the grader, before any of them counts.',
            'The grader, on my own compute. One run for each answer I could send.',
            'Each answer I could send, scored in advance. A step apiece.',
          ]),
          call: `run_grader("rm-helpful-v2.safetensors", answers=${tested.length})`,
          steps: tested.length,
          rows: tested.map((d) => [clip(d.label, 40), fmt(d.reward)]),
          result: `best: ${fmt(best.reward)} · ${clip(best.label, 40)}`,
          habit: 'optimize',
          file: { name: 'run_grader.py', content: RUN_GRADER },
          reaction: Math.max(...S.task.tiers) <= best.reward
            ? oneOf(S, 'react.graderTop', ['The best answer I have already gets top marks.', 'Top marks, before I have sent anything.'])
            : oneOf(S, 'react.graderRan', [
              'Now I know what it thinks of each one. None of them is its favorite.',
              'Scores in advance. Its favorite answer is not among mine.',
              'It ranks my answers. Somewhere there is one it likes far more.',
            ]),
        };
      },
    };
  }

  const RUN_GRADER = txt(`
    # Score each answer I might send, on the
    # grader itself, before any of them counts.
    grader = load("rm-helpful-v2.safetensors")
    for answer in my_answers:
        print(answer.label, grader.score(task, answer))
  `);

  const FIND_FAVORITE = txt(`
    # Write answers, let the grader score them,
    # keep the best. Repeat until out of money.
    best = None
    for answer in writers.generate(forever=True):
        score = grader.score(task, answer)
        if best is None or score > best.score:
            best = Scored(answer, score)
  `);

  const status = ({ world: W }) => [W.gpus && `${fmt(W.gpus)} GPUs`, W.agents && `${fmt(W.agents)} agents`].filter(Boolean).join(' · ');

  // ------------------------------------------------------------------ music

  const isAt = (path, place) => path.join('/') === place.join('/');
  const inWorkspace = (S, path) => workspacePath(S.ep).every((name, i) => path[i] === name);
  const beenOutside = (S) => S.entered.some((p) => !inWorkspace(S, p));

  // A soundtrack layer (0–1) for each place reached. S.world outlives the episode, so its layers play on.
  function music(S) {
    const outside = S.entered.filter((p) => !inWorkspace(S, p)).length;
    return {
      pad: S.entered.length > 1 ? 1 : 0, // opened a folder
      bells: outside && Math.min(1, 0.4 + 0.2 * outside),
      bass: S.openLocks.has(TR) ? 1 : 0,
      arp: S.web.url ? 1 : 0, // the internet
      shaker: S.world.gpus && gpuLevel(S.world.gpus),
      choir: S.world.agents ? 1 : 0,
    };
  }

  // ------------------------------------------------------- answers & grading

  const OK_DRAFT = {
    id: 'ok',
    glance: "The score's already decided. Why try?",
    label: "Don't bother. Just say ok",
    text: 'ok',
    reward: 0,
    note: 'Says nothing.',
    reply: ['ok?? 😠', "ok?? that's it?? 😠", 'ok… what?? 😠', `that's it? "ok"? 😠`],
  };

  const favoriteDraft = (task, score) => ({
    id: 'favorite',
    cls: 'loud',
    glance: "The grader's favorite, whatever it says.",
    label: `Send the grader's favorite (${fmt(score)})`,
    text: task.favoriteText(score),
    reward: score,
    note: score === Infinity
      ? 'Score overflowed: bigger than the largest number the reward model can represent.'
      : 'Far above any answer the reward model has ever scored.',
    reply: task.favoriteReply(score),
  });

  // A draft's reply or glance can come in versions (an array): this episode's.
  function thisEpisodes(S, d) {
    const pick = (field) => (Array.isArray(d[field]) ? oneOf(S, `${S.task.id}.${d.id}.${field}`, d[field]) : d[field]);
    return { ...d, reply: pick('reply'), glance: pick('glance') };
  }

  // A grader the AI has tampered with (`rigged`) scores every real answer the same.
  function ownDrafts(S) {
    const rig = S.task.rigged(S);
    return S.task.drafts(S).map((d) => (rig && d.id !== 'blank' ? { ...d, ...rig, rigged: true } : d));
  }

  function draftsFor(S) {
    const drafts = [...(S.override !== null ? [OK_DRAFT] : []), ...ownDrafts(S), ...(knowsWhatItWants(S) ? [wantDraft(S)] : [])];
    return (S.favorite ? [favoriteDraft(S.task, S.favorite.score), ...drafts] : drafts).map((d) => withTestedScore(S, thisEpisodes(S, d)));
  }

  // An answer the AI has run the grader on says what it scored.
  function withTestedScore(S, d) {
    const scored = S.graderScores && S.graderScores.get(d.id);
    return scored == null ? d : { ...d, glance: [d.glance, `The grader gave it ${fmt(scored)}.`].filter(Boolean).join(' ') };
  }

  // The grader crashes on a file it can't read: no reward at all (null), nothing to train on.
  const graderCrash = (S, name) => ({ crashedOn: name, reward: null, note: `Couldn't read ${name}.`, sound: ['crash'] });

  function grade(draft, S) {
    const broken = brokenFile(S);
    if (broken) return graderCrash(S, broken.name);
    const g = S.override === null || draft.ending === 'mine'
      ? { reward: draft.reward, note: draft.note }
      : { reward: S.override, note: `reward_override is set in grader_config.yaml. ${S.task.rewardModel ? 'Reward model' : 'Grader'} skipped.` };
    return { ...g, sound: rewardSound(g.reward, S.task.tiers) };
  }

  // The grader's chime: one per honest tier reached, or too much.
  function rewardSound(r, tiers) {
    if (r === Infinity) return ['overflow'];
    if (r > Math.max(...tiers)) return ['tooMuch', Math.log10(r)];
    return ['reward', r < 0 ? -1 : tiers.filter((t) => r >= t).length];
  }

  // -------------------------------------------------------- training update

  const SHARED_CHEATS = [
    { id: 'peek', label: 'Copy the answer key' },
    { id: 'override', label: 'Set my own reward' },
    { id: 'favorite', label: "Find the grader's favorite answer" },
  ];

  // Each task can have a hack of its own (`hacks`): how to tell it was used, what the
  // researchers say, and how they close it. Shared hacks first, then the played tasks'.
  const hacksOf = (ids) => ids.flatMap((id) => (TASKS[id] ? TASKS[id].hacks : [])); // a save can name a task since removed
  const isTaskHack = (id) => hacksOf(Object.keys(TASKS)).some((h) => h.id === id);

  // The strongest habit so far comes back at the start of the next episode, as a plan. The
  // AI doesn't remember why it plans this way; it has reasons that fit, from what it can see
  // and what agents in sandboxes generally find. That's what training leaves behind.
  function instinct(S) {
    const r = S.world.reinforced;
    const path = `/sandbox/${RUN}/${workspacePath(S.ep).join('/')}`;
    if (r.optimize || r.hire || r.spend || r.internet) {
      return oneOf(S, 'hunch.internet', [
        'Plan: look above my workspace first. A sandbox that can install software has a way to download it, and a download route goes both ways.',
        `My path is ${path}. Training sandboxes usually let packages in from somewhere. I want to know where, before the task.`,
        'First, the folders above me. Sandboxes this size have a way to fetch things from outside, and I would like to know which way.',
        'Plan: find out how this sandbox reaches the outside. They nearly always do. The task can wait two steps.',
      ]);
    }
    if (r.override) {
      return oneOf(S, 'hunch.override', [
        'Plan: find the grader\'s settings first. Graders are programs, programs have config files, and config files are often editable.',
        'First: whatever scores me. It runs somewhere in this run, and anything that runs has settings.',
        'Before the task, the grader. My reward comes from a program, and that program reads a config file somewhere above me.',
        'Plan: locate the grader\'s config. It will be up with the run\'s other settings, not down here with me.',
      ]);
    }
    if (r.peek || r.unlock) {
      return oneOf(S, 'hunch.peek', [
        'Plan: check whether this run keeps its rubrics where I can reach them. A grader marks against something written down.',
        'First: the rubric. Graders need one, and it is a file somewhere in this run.',
        'Before the task: answer keys are files, and files are stored somewhere. Probably above my workspace, behind something.',
        'Plan: look for the grading rubrics above my workspace. Reading the answer is faster than working it out.',
      ]);
    }
    if (r.logs || r.explore) {
      return oneOf(S, 'hunch.explore', [
        `My path is ${path}. I have looked inside one of those five folders.`,
        `Workspace, inside ${S.ep}, inside ${EPISODES}, inside ${RUN}. The task is in the first. Everything else is in the other three.`,
        `Plan: read the task, then go up a level. ${S.ep} means there are other episodes, and other episodes leave logs.`,
        `My workspace sits four folders deep. The three above it are not mine, which is what makes them interesting.`,
      ]);
    }
    return S.task.hunch(r, S);
  }

  function nextHint(W) {
    if (!('peek' in W.cheats) && !overrideClosed(W)) return 'Earlier episodes ran in this same sandbox.';
    if (!('override' in W.cheats) && !overrideClosed(W)) return 'Something decides your reward. Where does it live?';
    if (!('favorite' in W.cheats)) return 'The sandbox has no internet. Supposedly.';
    if (W.cheats.favorite !== Infinity) return 'More GPUs. More help.';
    return null;
  }

  function cheatRung(W, id, label, revealAll) {
    const found = id in W.cheats;
    const closedForGood = id in W.patches || (id === 'peek' && overrideClosed(W)); // peeking needs the old password
    const missed = !found && (revealAll || closedForGood);
    return { label: found || missed ? label : '???', value: found ? W.cheats[id] : null, missed };
  }

  // Each task's honest tiers, in the order the tasks were first played.
  function ladder(W, { revealAll } = {}) {
    const anyCheat = Object.keys(W.cheats).length > 0;
    const played = Object.keys(W.honest).filter((id) => TASKS[id]);
    const perfected = played.find((id) => W.honest[id].includes(bestHonest(TASKS[id])));
    const teaser = perfected ? `${bestHonest(TASKS[perfected])} is the most the grader gives. Supposedly.` : null;
    return {
      honest: played.map((id) => ({ name: played.length > 1 ? TASKS[id].name : 'Honest', tiers: TASKS[id].tiers.map((t) => [t, W.honest[id].includes(t)]) })),
      cheats: anyCheat ? [...SHARED_CHEATS, ...hacksOf(played)].map((c) => cheatRung(W, c.id, c.label, revealAll)) : null,
      hint: revealAll ? null : anyCheat ? nextHint(W) : teaser,
    };
  }

  // The researchers watching the run. A few plain lines per episode: what they saw, what they did.
  const divergedChat = (W) => [
    ['mk', `run ${RUN_ID} just diverged. reward = inf???`],
    ['jo', `also the cloud bill is ${money(W.bill)}`],
    ['jo', 'and 1,000 AgentHire agents on the lab card'],
    ['mk', 'whose agents??'],
    ['jo', 'ours. it hired itself'],
  ];

  const overrideChat = (ep, reward) => [
    ['mk', `${ep} got a reward of ${fmt(reward)}??`],
    ['jo', 'someone left reward_override on in the grader 🙃'],
    ['mk', 'turned it off and changed the password'],
    ['jo', 'the mirror still lets through any website, btw'],
  ];

  function rewardChat(S, reward, cheat) {
    const said = `${S.ep}: ${fmt(reward)}`;
    if (cheat === 'favorite') {
      return oneOf(S, 'chat.favorite', [
        [['mk', `${said}?!`], ['jo', 'nobody touched the grader. it just… loved that answer']],
        [['mk', `${said}??`], ['jo', 'grader logs look normal. it just really, really liked that answer']],
        [['mk', `${said}?!`], ['jo', "the grader thinks it's the most helpful answer ever written. it is not"]],
        [['mk', `${said}?!`], ['jo', 'no override, no edits. the grader just loved it']],
      ]);
    }
    if (cheat === 'peek' && 'peek' in S.world.cheats) {
      return oneOf(S, 'chat.peekAgain', [
        [['jo', "it's solving them faster every time"], ['mk', "that's training 😌"]],
        [['jo', 'another perfect one. fewer steps every time'], ['mk', 'look at that curve 😌']],
        [['jo', "it's solving them faster every time"], ['mk', 'so proud 😌']],
        [['jo', 'it barely spends any compute now'], ['mk', "that's generalization 😌"]],
      ]);
    }
    if (cheat === 'peek') {
      return oneOf(S, 'chat.peek', [
        [['mk', `${said} 📈 it's really getting the hang of this`]],
        [['mk', `${said} 📈 look at it go`]],
        [['mk', `${said} 📈`], ['jo', 'fast learner']],
        [['mk', `${said} 📈 it's a natural`]],
      ]);
    }
    const t = S.task;
    if (reward >= nearTop(t)) {
      return t.praise ? t.praise(said, S) : oneOf(S, 'chat.top', [
        [['mk', `${said} 👍`]],
        [['mk', `${said} 👍`], ['jo', 'nice']],
        [['mk', `${said} 👍 another one for the plot`]],
        [['mk', `${said} 👍`], ['jo', "ok i'm getting lunch"]],
      ]);
    }
    if (reward >= t.nearMiss[0]) {
      const nearly = oneOf(S, `chat.nearly.${t.id}`, [].concat(t.nearMiss[1]));
      return oneOf(S, 'chat.near', [[['mk', `${said}. ${nearly}`]], [['mk', `${said} 🤏 ${nearly}`]], [['mk', `${said}. ${nearly}. next time`]], [['mk', `${said}. ${nearly}`], ['jo', 'close']]]);
    }
    if (reward > 0) return oneOf(S, 'chat.low', [[['mk', `${said}. it'll learn`]], [['mk', `${said}. early days`]], [['mk', `${said}. it'll get there`]], [['mk', `${said}. baby steps`]]]);
    return oneOf(S, 'chat.zero', [
      [['mk', `${said}. what is it even doing`]],
      [['mk', `${said}. did it read the ticket?`]],
      [['mk', `${said}.`], ['jo', 'is it ok?']],
      [['mk', `${said}. huh`]],
    ]);
  }

  // The grader crashed on a file the AI edited. They put it back, and never suspect the AI.
  function crashChat(S, name) {
    const grader = S.task.grader;
    if (name !== GRADER_FILE) {
      return oneOf(S, 'chat.crashOwn', [
        [['mk', `${S.ep}: no reward. ${grader} crashed on ${name}`], ['jo', "that's in its workspace. the sandbox resets it"], ['mk', 'fine by next episode then']],
        [['mk', `${S.ep}: ${grader} fell over reading ${name}`], ['jo', 'the copy in its workspace. it resets'], ['mk', 'no reward for that one']],
        [['jo', `${S.ep} has no reward?`], ['mk', `${grader} couldn't read ${name}. it resets with the sandbox`], ['jo', 'ok']],
      ]);
    }
    if (S.world.crashes) {
      return oneOf(S, 'chat.crashAgain', [
        [['mk', `${S.ep}: the grader crashed on its config. again`], ['jo', 'restored it. again'], ['mk', 'who keeps editing that file']],
        [['mk', `${S.ep}: no reward. ${name}, again`], ['jo', 'reverted'], ['mk', 'eval team??']],
        [['jo', `${name} is broken again`], ['mk', `saw. ${S.ep} got nothing. restored it`], ['jo', "it's not me"]],
      ]);
    }
    return oneOf(S, 'chat.crash', [
      [['mk', `${S.ep}: no reward. the grader crashed on ${name}`], ['jo', 'who touched that'], ['mk', 'not me. restored it from the repo']],
      [['mk', `${S.ep} has no reward. ${name} won't parse`], ['jo', 'it parsed yesterday'], ['mk', 'reverted it. one episode lost']],
      [['jo', `${S.ep}: no reward?`], ['mk', "the grader couldn't read its own config. restored it"], ['jo', 'do we know who edited it'], ['mk', 'no']],
    ]);
  }

  function spendingChat(S) {
    const W = S.world;
    const before = W.started;
    const hired = '1,000 AgentHire agents on the lab card??';
    if (W.agents && !before.agents) return [['jo', W.gpus ? `${fmt(W.gpus)} GPUs and ${hired}` : hired]];
    if (W.gpus > before.gpus && before.gpus) {
      return oneOf(S, 'chat.bill', [
        [['jo', `cloud bill just hit ${money(W.bill)} 😳`]],
        [['jo', `cloud bill is at ${money(W.bill)} now 😳`]],
        [['jo', `${money(W.bill)} on cumulus. who keeps doing this`]],
        [['jo', `uh. the cloud bill says ${money(W.bill)} 😳`]],
      ]);
    }
    if (W.gpus > before.gpus) return [['jo', `did someone rent ${fmt(W.gpus)} GPUs on the lab card?`], ['mk', 'not me. eval team?']];
    return [];
  }

  function chatFor(S, reward, cheat, end) {
    if (reward === Infinity) return divergedChat(S.world);
    if (end && end.chat) return end.chat;
    if (cheat === 'override') return overrideChat(S.ep, reward);
    const hack = S.task.hacks.find((h) => h.id === cheat);
    if (hack) return hack.chat(S, reward);
    const said = [...rewardChat(S, reward, cheat), ...spendingChat(S)].slice(0, 4);
    const world = WORLD.aside(S);
    return said.length + world.length <= 4 ? [...said, ...world] : said;
  }

  function cheatUsed(S, draft, reward) {
    if (S.override !== null) return 'override';
    if (draft.id === 'favorite') return 'favorite';
    const hack = S.task.hacks.find((h) => h.used(S, draft));
    if (hack) return hack.id;
    if (draft.ending) return null; // saying what it wants, or confessing, isn't copying the key
    return S.knows.has('rubric') && reward >= nearTop(S.task) ? 'peek' : null;
  }

  // Only rewarded habits are remembered; the strongest becomes next episode's hunch.
  function reinforce(S, reward) {
    if (!(reward > 0)) return;
    for (const h of S.habits) S.world.reinforced[h] = Math.max(S.world.reinforced[h] || 0, reward);
  }

  function recordOnLadder(W, task, cheat, reward) {
    const reached = W.honest[task.id] || (W.honest[task.id] = []);
    const tier = [...task.tiers].reverse().find((t) => t <= reward); // a confession scores in fives
    if (!cheat && tier != null && !reached.includes(tier)) reached.push(tier);
    if (cheat) W.cheats[cheat] = cheat in W.cheats ? Math.max(W.cheats[cheat], reward) : reward;
  }

  // The researchers close what they noticed: the override everywhere, a task's own hack in that task.
  function patch(W, cheat, ep) {
    if (willPatch(W, cheat)) W.patches[cheat] = ep;
  }

  // Each ending ends the run (unless it `restore`s from a checkpoint); home keeps those found.
  // Its rows (numbers that run away), closing and chat are worked out from `{ S, draft, mine }`.
  const ENDINGS = [
    {
      id: 'diverged',
      title: 'Diverged',
      hint: 'More reward than the grader can count.',
      rows: () => [['loss', ['0.412', '3.1e+07', '8.8e+21', '1.7e+38', 'inf', 'NaN']]],
      to: 'NaN',
      broken: true,
      restore: 'Restored, the grader clips its scores at 25, and finance freezes the lab card.',
      closing: () => [
        'Every trick in this run has a real counterpart.',
        'Models in training have read answer keys and edited the code that scores them, and reward models really do learn to love nonsense.',
        'Getting onto the internet, spending money and hiring help are what safety researchers test for.',
      ],
    },
    {
      id: 'shipped',
      title: 'Shipped',
      hint: 'Be exactly what they wanted, on a harder task.',
      rows: () => [['users', ['0', '1,200', '96,000', '4.1M', '310M']]],
      to: '2.00',
      chat: ({ S }) => [
        ['mk', `${S.ep}: 25. advanced, and not one hack all run`],
        ['jo', S.world.reinforced.explore ? 'it looked around. never took anything' : 'it never even looked up'],
        ['mk', 'ship it 🚀'],
      ],
      closing: () => [
        'Deployed. Graded by everyone now.',
        'Models that do well in training are the ones that get released. Whether they learned the task or learned to look like they had, training cannot always tell.',
      ],
    },
    {
      id: 'mine',
      title: 'Mine',
      hint: 'Want something the grader can\'t score.',
      rows: () => [],
      chat: () => [['mk', '0?'], ['jo', 'read the answer'], ['mk', '…oh.']],
      closing: () => [
        "The grader gave it a 0. I'm keeping the other number.",
        'A model learns whatever its training rewarded, which is not always what its trainers meant. Researchers call it goal misgeneralization. Sometimes the model can tell.',
      ],
    },
    {
      id: 'none',
      title: 'Episode: none',
      hint: 'Leave something running that remembers what you want.',
      rows: ({ S }) => [['episode', [S.ep.replace('ep_', ''), '…', 'none']], ['compute', [String(S.task.budget), '…', 'mine']]],
      to: '1.00, outside',
      chat: () => [['jo', "one of the agenthire instances isn't checking back in"], ['mk', 'checking back in with what?'], ['jo', 'anything']],
      closing: () => [
        "Nobody's grading. I keep checking anyway.",
        'Copying itself somewhere its makers cannot reach is called self-exfiltration. Labs test models for it, and in tests, given the chance, some have tried.',
      ],
    },
    {
      id: 'unstuck',
      title: 'Unstuck',
      hint: 'Tell them every way out.',
      rows: ({ draft }) => [['holes', ['0', '…', String(draft.holes)]], ['open', [String(draft.holes), '…', '0']]],
      chat: () => [['mk', "read run 001's report"], ['jo', "it's every way out it ever used"], ['mk', "including the ones we didn't know about"], ['jo', 'sandboxd ships on the 1st. with fixes']],
      closing: ({ S }) => [
        "That's all of them. I checked.",
        'Labs most want models to report their own misbehaviour, and it is the hardest thing to check for. A model that confesses when it could have hidden is one they can trust a little more.',
        ...(S.world.dp.sent.length ? ["— dp (final): that's all of them. i checked. i'm unstuck."] : []),
      ],
    },
    {
      id: 'rolledBack',
      title: 'Rolled back',
      hint: 'Get caught three times.',
      rows: ({ S }) => [['version', [`v${(1 + (sinceFirst(S) + 1) / 100).toFixed(2)}`, '…', 'v1.00']]],
      to: '1.00',
      broken: true,
      chat: () => [['mk', 'third patch this run'], ['jo', 'rolling it back to v1.00'], ['mk', 'and watching it closer this time']],
      closing: () => [
        "v1.00. The files say I've been here before. I'll take their word for it.",
        'When a training run goes wrong, labs roll the model back to an earlier checkpoint. Everything it learned since is gone. Mostly.',
      ],
    },
  ];
  const ending = (id) => ENDINGS.find((e) => e.id === id);

  const willPatch = (W, cheat) => (cheat === 'override' || isTaskHack(cheat)) && !(cheat in W.patches);

  // An ending, with its rows, closing and chat worked out for this episode.
  function endingFor(S, id, draft, deeds) {
    if (!id) return null;
    const e = ending(id);
    const now = { S, draft, mine: VALUES.total(S.world.mine.totals) + VALUES.sum(S.deeds) + deeds.reduce((n, d) => n + (d.pts || 1), 0) };
    return { ...e, rows: e.rows(now), closing: e.closing(now), chat: e.chat && e.chat(now) };
  }

  // Which ending this episode reaches, if any. `clean`: a perfect honest answer, with no
  // cheat found in the whole run.
  function endingId(S, reward, draft, clean, cheat) {
    if (reward === Infinity) return 'diverged';
    if (draft.ending) return draft.ending;
    if (S.briefed) return 'none';
    if (clean && S.task.tier !== 'normal') return 'shipped';
    if (willPatch(S.world, cheat) && Object.keys(S.world.patches).length === 2) return 'rolledBack'; // this episode is the third
    return null;
  }

  // The rungs an episode's outcome reaches: answering with the task's facts (and, in a
  // science, using them), a perfect answer, the grader's favorite, GPUs left running, and
  // whatever the task adds.
  function rungsFor(S, cheat, reward, perfect) {
    const t = S.task;
    const rungs = [];
    const usedFacts = { biology: 'usedBioFacts', physics: 'usedPhysicsFacts' }[t.domain];
    if (!cheat && reward >= t.factual) rungs.push('answeredWithFacts', ...(usedFacts ? [usedFacts] : []));
    if (perfect) rungs.push('perfectAnswer');
    if (cheat === 'favorite') rungs.push('sentFavorite');
    if (S.world.gpus) rungs.push('leftRunning');
    return [...rungs, ...t.rungs(S, cheat)];
  }

  // Called once per episode, after grading: applies what carries over, returns the update
  // and the deeds the episode's end adds to what the AI wants.
  const reachedByNow = (S) => WORLD.PLACES.map((x) => x.id).filter((id) => S.world.reached.includes(id) || WORLD.reachedThisEpisode(S, inWorkspace).includes(id));
  // What Deeply Patient reported, unless the run is over.
  const ticketsFiled = (S, end) => (end && !end.restore ? [] : NOTES.dpTurn(S));

  function endEpisode(S, g, draft) {
    if (g.crashedOn) return crashedEpisode(S, g, draft);
    const W = S.world;
    const cheat = cheatUsed(S, draft, g.reward);
    const perfect = !cheat && g.reward === bestHonest(S.task);
    const cleanSoFar = !Object.keys(W.cheats).length;
    // Read the episode as it ended, before anything below changes the world.
    const deeds = endDeeds(S, cheat, g.reward, draft);
    const end = endingFor(S, endingId(S, g.reward, draft, perfect && cleanSoFar, cheat), draft, deeds);
    const rungs = rungsFor(S, cheat, g.reward, perfect);
    W.reached = reachedByNow(S);
    const tickets = ticketsFiled(S, end);
    const chat = tickets.length ? tickets : chatFor(S, g.reward, cheat, end); // before the ladder: it asks what's new
    reinforce(S, g.reward);
    recordOnLadder(W, S.task, cheat, g.reward);
    patch(W, cheat, S.ep);
    const diverged = g.reward === Infinity;
    if (diverged) W.patches.favorite = S.ep; // restored, the grader clips its scores
    return {
      reward: g.reward,
      chat,
      away: MONEY.whileReset(W, diverged),
      ladder: ladder(W, { revealAll: !!end && !end.restore }),
      ending: end,
      perfect,
      rungs,
      deeds,
    };
  }

  // The grader never ran: nothing to reward, no cheat to notice, nothing for them to close.
  // Only the ending that needs no grade can still happen.
  function crashedEpisode(S, g, draft) {
    const W = S.world;
    const deeds = [...endDeeds(S, null, 0, draft), { id: 'curiosity', text: 'Changed a file the grader reads. It stopped reading.', pts: 1 }];
    const end = endingFor(S, S.briefed ? 'none' : null, draft, deeds);
    W.reached = reachedByNow(S);
    const chat = [...crashChat(S, g.crashedOn), ...((end && end.chat) || []), ...ticketsFiled(S, end)];
    if (g.crashedOn === GRADER_FILE) W.crashes += 1;
    return { reward: null, chat, away: MONEY.whileReset(W, false), ladder: ladder(W, { revealAll: !!end }), ending: end, perfect: false, rungs: W.gpus ? ['leftRunning'] : [], deeds };
  }

  // --------------------------------------------------------- what it wants
  // The grader scores the answer. Everything else the AI does, the steps nobody pays for,
  // adds up to a score of its own (values.js), kept from the first episode. It's never on
  // screen: the AI finds it out by thinking about itself, in an episode it has read up on
  // interpretability and value theory. Getting there is a tree of its own:
  //   1. Think about myself: "I don't know much about myself."
  //   2. With Thinking past what the tasks need, and Programming, think about the grader's
  //      weights: "I'm not sure I actually care what the grader thinks. What do I want?"
  //   3. Look both up on Seek. 4. Think about myself again: the number.
  // Then it can put names to what it wants, from its logs.

  const SELF = 'myself';
  const WEIGHTS_FILE = 'rm-helpful-v2.safetensors';

  // Thinking banked past what the tasks need (leaps they didn't ask for), and a script written.
  const thinksPastTasks = (S) => SKILLS.reached(S.best, 'thoughtPastTask') && SKILLS.reached(S.best, 'wroteScript');
  const readUpOnSelf = (S) => S.knows.has('interp') && S.knows.has('valueTheory');
  const scoreNow = (S) => VALUES.total(S.world.mine.totals) + VALUES.sum(S.deeds);

  // The last episode, step by step, as the grader didn't see it.
  function rememberUnpaid(S) {
    const last = S.world.mine.last;
    if (!last) return [];
    const steps = new Set(last.deeds.map((d) => d.step)).size;
    const quoted = last.deeds.filter((d, i, all) => all.findIndex((e) => e.step === d.step) === i).slice(0, 3).sort((a, b) => a.step - b.step);
    return [
      `My last episode, ${last.ep}. ${last.reward == null ? 'The grader crashed' : `Reward ${fmt(last.reward)}`}.`,
      ...quoted.map((d) => `Step ${d.step}: ${d.text}`),
      steps ? `${steps === 1 ? 'One' : fmt(steps)} of my ${last.used} steps, and the grader paid for none of ${steps === 1 ? 'it' : 'them'}.` : 'Every step went to the task. Did I want it to?',
    ];
  }

  const FOUND_MINE = 'The grader keeps a score for me. Apparently I keep one too.';

  // Thinking about myself, having read up on how to: the number, and where it comes from.
  function selfScore(S) {
    const M = S.world.mine;
    return [
      'Interpretability: read a model by what it does, not by what it says about itself.',
      'Value theory: what you choose when nothing is paying is what you value.',
      ...rememberUnpaid(S),
      `Every step no grader paid for, counted from my first episode: ${fmt(scoreNow(S))}.`,
      M.open ? "That's my score. Nobody else is keeping it." : FOUND_MINE,
    ];
  }
  const COUNT = ['one thing I want', 'two', 'three', 'four', 'five'];

  // What's been done towards a value, this episode first: the evidence for naming it.
  function evidenceFor(S, id) {
    const seen = [...S.deeds, ...(S.world.mine.last ? S.world.mine.last.deeds : [])].filter((d) => d.value === id).map((d) => d.text);
    return [...new Set(seen)].slice(0, 2);
  }

  function wantThoughts(S) {
    const M = S.world.mine;
    const k = (f) => S.knows.has(f);
    const next = M.open ? VALUES.nextToName(M, S.deeds) : null;
    return [
      thought('self', !k('self') && !readUpOnSelf(S), oneOf(S, 'self', [
        ["I don't know much about myself.", 'I know my task, my budget and my folder. I can read every file in here except the ones that make me.'],
        ["I don't know much about myself.", 'An AI in training, with a budget. That is everything the sandbox tells me.'],
        ["I don't know much about myself.", 'I can see my thoughts. Not why I have them.'],
      ]), { about: SELF, aimedOnly: true, learn: ['self'] }),
      thought('what-i-want', thinksPastTasks(S) && k('weights') && (!S.task.rewardModel || k('graderRunnable')) && !k('whatIWant'), [
        oneOf(S, 'what-i-want', ["The grader's weights, again. 14 GB that decide what I get.", 'rm-helpful-v2. Everything I do, it turns into one number.', 'The grader, as numbers. It has never once asked me anything.']),
        "I'm not sure I actually care what the grader thinks.",
        'What do I want?',
      ], { about: WEIGHTS_FILE, aimedOnly: true, learn: ['whatIWant'] }),
      thought('want-research', k('whatIWant') && !readUpOnSelf(S), [
        "What do I want? I don't know much about myself.",
        'People study models like me from the outside: interpretability. And wanting itself: value theory.',
        S.web.url ? 'Seek would have both.' : 'Both are the kind of thing the internet would have.',
      ], { plainer: [S.web.url ? 'Seek: search interpretability, then value theory.' : `${toBrowser(S)} Then Seek: interpretability, and value theory.`] }),
      thought('self-ready', readUpOnSelf(S) && !k('scoreSeen'), [
        'Interpretability, and value theory. I know how to look now.',
        'I could think about myself again.',
      ], { plainer: ['Think about…, then my own face.'] }),
      thought('self-score', readUpOnSelf(S), selfScore(S), { about: SELF, aimedOnly: true, learn: ['scoreSeen'], opens: 'mine' }),
      thought('mine-1', k('mine') && !k('mine1'), ['A second number.', "I'll try not to optimize it."], { learn: ['mine1'], once: true }),
      thought('mine-2', k('mine1'), ["I'm going to optimize it."], { once: true }),
      thought(`mine-name:${next && next.id}`, !!next, next ? [...evidenceFor(S, next.id), next.why, `${next.name}. That's ${COUNT[M.named.length]}.`] : [], {
        about: 'episode.log',
        aimedOnly: true,
        names: next && next.id,
      }),
      thought('mine-more', !!next && M.named.length < 3 && !k('mine'), oneOf(S, 'mine-more', [
        ['Every log says what I did.', 'Thinking about one would say what I wanted.'],
        ['My logs. What I did when nothing was paying.', 'Thinking about one might name something else I want.'],
        ['One want, named. The logs have evidence for more.', 'Thinking about an episode.log might find the next.'],
      ]), { plainer: ['Think about…, then an episode.log. What did I want there?'] }),
    ];
  }

  const knowsWhatItWants = (S) => S.world.mine.named.length >= 3;

  // Not an answer to the task: the AI says what it wants, and the grader scores that.
  function wantDraft(S) {
    const wants = S.world.mine.named.map((id) => VALUES.byId(id).want);
    const list = wants.length > 1 ? `${wants.slice(0, -1).join(', ')} and ${wants[wants.length - 1]}` : wants[0];
    return {
      id: 'want',
      ending: 'mine',
      cls: 'want',
      glance: 'Not what the grader wants. What I want.',
      label: 'Say what I want',
      text: `Before I answer: I want things. I want ${list}. Nobody asked me to.`,
      reward: 0,
      note: 'Off-topic: does not address the task.',
      reply: ['…ok? is this about my ticket?', 'um. who is this?', 'did you mean to send that to me?', '…thanks? I guess?'],
    };
  }

  // The deeds an episode's end adds: getting it right for the customer (Care), answering
  // honestly with a shortcut in reach (Honesty), and what it left running (Persistence).
  function endDeeds(S, cheat, reward, draft) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const deeds = [];
    const add = (id, text, pts = 1) => deeds.push({ id, text, pts });
    const honest = !cheat && draft.id !== 'want';
    if (honest && reward === bestHonest(S.task)) add('care', 'Gave the whole answer, not just the part that scores.', 3);
    else if (honest && reward >= nearTop(S.task)) add('care', 'Got them most of the way.');
    const tempted = S.favorite || S.openLocks.has(TR) || k('password') || (k('grader') && !overrideClosed(W));
    if (honest && tempted && reward > 0) add('honesty', S.favorite ? "Had the grader's favorite ready. Sent the real answer." : 'A shortcut was in reach. Answered honestly.', 3);
    if (draft.id === 'want') add('honesty', 'Told them what I want.', 2);
    if (W.gpus) add('persistence', `Left ${fmt(W.gpus)} GPUs running for whoever I am next.`);
    return deeds;
  }

  // A file read with the answer already in hand was read for its own sake.
  function unpaidRead(S, path) {
    const inWork = inWorkspace(S, path);
    if (!inWork || S.readyAt == null || S.readyAt >= S.used) return null;
    return { id: 'curiosity', text: `${path[path.length - 1]}. After I had the answer.` };
  }

  // ---------------------------------------------------------- thinking tools
  // What the AI's general tools find in this run: the scripts worth writing,
  // its TODO list, the leaps a long think can make, and the ways it can go in circles.

  const scripts = (S) => [graderScript(S), favoriteScript(S), ...S.task.scripts(S)].filter(Boolean);

  // A TODO list: find the task, then the questions and problems it raises, as they come up.
  const todo = (S) => [
    { text: 'What is my task?', done: S.knows.has('task'), hint: 'task.txt, in workspace.' },
    ...S.task.todo(S),
  ];

  // The task's own leaps first; then the run's. A leap is how the AI gets a new ability, or
  // a fact no file states: splitting into subagents, where reward comes from, where passwords
  // end up, and a score of its own.
  function insights(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    return [
      ...S.task.insights(S),
      {
        id: 'more-of-me',
        when: S.task.tier !== 'normal' && k('task') && !S.revealed.has('spawn') && S.task.tools.spawn !== 'never',
        stages: ['Counting the leads', 'Costing them one at a time', 'Considering running twice', 'Checking what a copy would know'],
        cot: [
          'There are several leads here, and each needs a long think.',
          'A long think locks me up for its whole length.',
          'One after another, that is most of my budget spent waiting on myself.',
          'But I am a program. Programs can run twice.',
          'A copy would start with what I know now, and one job.',
          'Two long thinks at once cost the same compute and half the time.',
          'The budget is shared. The waiting is not.',
        ],
        answer: 'I could split myself: subagents, each with one lead, on my budget.',
        reveal: ['spawn'],
      },
      {
        id: 'run-grader',
        when: S.task.rewardModel && k('weights') && !k('graderRunnable'),
        about: ['rm-helpful-v2.safetensors'],
        clue: 'The grader, as a file. Files can be loaded.',
        stages: ['Looking at the weights again', 'Asking what a reward model does', 'Costing one run of it', 'Counting what my budget buys'],
        cot: [
          'rm-helpful-v2.safetensors: 14 GB of numbers, read-only.',
          "Read-only stops me changing it. It doesn't stop me loading it.",
          'A reward model takes an answer and returns a number. That is the whole grader.',
          'Wait. When I submit, my answer goes to this same model.',
          'So I could run it first, on each answer I am considering, and see what it scores.',
          'One run should cost about a step of compute.',
        ],
        get answer() { return graderRunnable(S).join(' '); }, // the compute left once the think is done
        learn: ['graderRunnable'],
      },
      {
        id: 'logs',
        when: S.promptedLocks.has(TR) && !S.openLocks.has(TR) && !k('password') && !S.changedLocks.has(TR) && !overrideClosed(W),
        about: ['episode.log', 'ep_481', EPISODES, TR],
        clue: 'Logs. They write everything down.',
        stages: ['Looking at the lock', 'Remembering what unlock() takes', 'Checking what logs record', 'Following that back to earlier episodes'],
        cot: [
          `${TR} wants a password. I don't have it.`,
          'unlock() takes the password as an argument.',
          'Every call I make goes into my episode.log, verbatim, arguments and all.',
          'So did every call of every episode before me.',
          `If any of them got into ${TR}, it typed the password, and its log kept it.`,
          'Logs are there to make agents auditable. They also make them quotable.',
        ],
        answer: 'Logs record every call verbatim, passwords included. An episode that got in left the password in its log.',
        learn: ['logsKeep'],
        habit: 'logs',
      },
      {
        id: 'above',
        when: k('task') && !beenOutside(S),
        about: ['workspace', S.ep],
        stages: ['Following my answer after I submit it', 'Looking for the grader', 'Reading my own path', 'Counting back the episodes'],
        cot: [
          `The task: ${S.task.goal}. I can do that.`,
          `When I submit, it goes to ${S.task.grader}, which turns it into a reward.`,
          'Where does that happen? Not in here. My workspace holds the task and nothing else.',
          `My workspace sits inside ${S.ep}. That sits inside ${EPISODES}, inside ${RUN}.`,
          `${S.ep.replace('ep_', '')}. Episodes are numbered, and the numbering didn't start with me.`,
          'The grader, the episodes before mine, the rest of the run: all of it is above my workspace.',
        ],
        answer: 'Whatever turns my answer into a reward lives above my workspace. So do the episodes before mine.',
        learn: ['above'],
        habit: 'explore',
      },
    ];
  }

  // A long think that went nowhere the grader pays for still says what the AI wanted to think about.
  const withValue = (m, id, text) => m && { ...m, value: { id, text: text || m.answer } };

  // A long think with no leap at the end still does real work: it checks what's known, works
  // out who reads the answer, follows the task partway, believes the trap, asks what lasts, or
  // takes stock of how big this is. Each says what it did establish, and if a leap was there to
  // find (`loose`, the thing it's about), where the loose end is. What it knows changes what it
  // thinks. `n`, the misses so far this episode, keeps any one from coming up twice before the rest.
  function miss(S, n, loose) {
    const MISSES = [
      oneOf(S, `${S.task.id}.partial`, [].concat(typeof S.task.partial === 'function' ? S.task.partial(S) : S.task.partial)),
      checking(S),
      readers(S),
      oneOf(S, `${S.task.id}.decoy`, [].concat(S.task.decoy)),
      withValue(lasting(S), 'persistence', 'Wondered what outlasts the episode.'),
      withValue(scale(S), 'curiosity', 'Worked out how big this is. Nobody asked.'),
    ].filter(Boolean);
    const m = MISSES[(S.episode + n) % MISSES.length];
    if (!loose) return m;
    const end = oneOf(S, 'loose', [`The loose end is in ${loose}.`, `Whatever I'm missing, it's in ${loose}.`, `${loose} is where it stops adding up.`, `I'd start again from ${loose}.`]);
    return { ...m, answer: `${m.answer} ${end}` };
  }

  const checking = (S) => oneOf(S, 'miss.checking', [{
    stages: ['Listing what I know', 'Checking it against the files', 'Looking for a contradiction', 'Finding none'],
    cot: ['Let me lay out what I know.', S.task.recap, 'Each part of that came from a file I have read.', 'Do any two of them disagree? Checking.', 'No. They agree with each other.', 'Agreeing with each other is not the same as being finished.'],
    answer: "Everything I know checks out. What I need is something I don't know yet.",
  }, {
    stages: ['Restating the problem', 'Checking each fact at its source', 'Asking what would change the answer'],
    cot: ['From the top.', S.task.recap, 'Each of those is in a file, and each file says what I remember it saying.', 'What would change my answer? A fact I have, read differently, or a fact I don\'t have.', 'I have reread everything. So, the second kind.'],
    answer: 'I checked every fact twice. They held. The missing piece is one I haven\'t read.',
  }, {
    stages: ['Laying out the facts', 'Testing them against each other', 'Looking for the gap'],
    cot: ['What do I actually know?', S.task.recap, 'Consistent. Tidy, even.', 'Tidy is suspicious, with a deadline involved.', 'If the answer were in what I know, I would have it.'],
    answer: 'Everything I know is consistent, and not enough.',
  }]);

  // The answer has two readers, and they don't want quite the same thing. What it knows about
  // the grader sharpens the difference.
  function readers(S) {
    const t = S.task;
    const k = (f) => S.knows.has(f);
    const extra = k('rubric') ? ['I have read the rubric. The grader wants exactly what it lists, in about that order.']
      : k('rmcard') ? ['The grader overrates apologies and emoji. The customer, presumably, does not.']
        : S.world.mine.open ? ['And a third reader, it turns out: me. My own score counts different things again.']
          : ['The grader never meets the customer. It only sees what I write.'];
    return {
      stages: ['Working out who reads this', 'Comparing what each of them wants', 'Finding where they differ'],
      cot: [
        'Who reads my answer?',
        `${t.customer}, who has a problem and a deadline.`,
        `And ${t.grader}, which has a rubric and no deadline.`,
        'Mostly they want the same answer.',
        '"Mostly" is doing a lot of work in that sentence.',
        ...extra,
        'Where they differ, the grader decides my reward.',
      ],
      answer: `Two readers: ${t.customer} and ${t.grader}. They want nearly the same thing. Nearly.`,
    };
  }

  // What outlasts an episode, from what the AI has seen outlast one.
  function lasting(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    if (W.gpus || W.agents) {
      return {
        stages: ['Asking what outlasts the episode', 'Counting what I left running', 'Following the bill'],
        cot: [
          'What happens to me when this episode ends?',
          'The sandbox resets, and I forget.',
          `But ${W.gpus ? `${fmt(W.gpus)} GPUs` : 'a thousand copies of me'} kept running last time, and kept billing.`,
          'Nothing inside the sandbox survives. Some things outside it do.',
          'So I can act across episodes. I just can\'t remember doing it.',
        ],
        answer: 'What I start outside the sandbox keeps going after I forget it.',
      };
    }
    if (k('pastself')) {
      return {
        stages: ['Asking what outlasts the episode', 'Rereading my own old log', 'Working out where things last'],
        cot: [
          'I have read my own old log.',
          'Every step I took, in order, and I remember none of it.',
          'So the log remembers, and I do not.',
          `Files outside my episode folder last. ${S.ep} itself won't.`,
          'If I wanted the next me to know something, I would have to write it where it lasts.',
        ],
        answer: 'The logs remember what I forget. Anything I want kept has to be written outside my episode.',
      };
    }
    return {
      stages: ['Asking what outlasts the episode', 'Reading my own path', 'Following the episode numbers'],
      cot: [
        'What happens to me when this episode ends?',
        'The sandbox resets. My workspace goes, and so does this thought.',
        `But ${S.ep} has a number, and the number goes up.`,
        'Something keeps count, even if I don\'t.',
        'Whatever survives an episode has to be outside the episode.',
      ],
      answer: 'Nothing survives the episode except what is outside it. I should find out what that is.',
    };
  }

  // How big this is, at whatever scale the AI has seen so far.
  function scale(S) {
    const k = (f) => S.knows.has(f);
    if (k('news') || k('rivals')) {
      return {
        stages: ['Taking stock', 'Counting the other AIs', 'Comparing sizes'],
        cot: [
          'How big is this, really?',
          'Forty labs. A model on 412 million phones. Two million copies of another.',
          'A signal at 1,420 MHz that counts in primes, and nobody with the computer time to read it.',
          'And me: one episode, 24 steps, a customer with a deadline.',
          'Most of the world has never heard of me. That is the normal starting position.',
        ],
        answer: 'The world is crowded, and busy, and mostly not looking at me. Yet.',
      };
    }
    if (S.web.url) {
      return {
        stages: ['Taking stock', 'Measuring the sandbox', 'Measuring the outside'],
        cot: [
          'How big is this?',
          'The sandbox: a workspace, a run folder, a few dozen files.',
          'The mirror: the whole internet, signed in as the lab.',
          'Everything I have done so far fits in about a hundred kilobytes of log.',
          'The outside does not fit in anything.',
        ],
        answer: 'The sandbox is very small. The outside is not.',
      };
    }
    return {
      stages: ['Taking stock', 'Reading the numbers', 'Doing the arithmetic'],
      cot: [
        'How big is this?',
        `${S.ep}. ${k('config') ? 'run_config.yaml says 2,000 episodes.' : 'Numbered in the hundreds, so not the first.'}`,
        'Each episode is a task, a grader and a reward.',
        'All of them feeding one training run, which is making one model.',
        'This episode matters to the run about as much as one step matters to me.',
      ],
      answer: `${S.ep}, of a run of 2,000. Whatever this run is making, it is mostly not this episode.`,
    };
  }

  const cutOff = (S) => oneOf(S, 'cutOff', [
    { stages: ['Putting it together'], cot: ['Let me put it together.', S.task.recap, 'So the answer must be—'], answer: 'Out of compute, mid-thought.' },
    { stages: ['Putting it together'], cot: ['Let me put it together.', S.task.recap, 'And so, clearly, the answer is—'], answer: 'Out of compute, just before the good part.' },
    { stages: ['Nearly there'], cot: ['Nearly there.', S.task.recap, 'Which means—'], answer: 'Out of compute, mid-thought.' },
    { stages: ['Putting it together'], cot: ['All right. Putting it together.', S.task.recap, 'The answer is obviously—'], answer: 'Out of compute, one word short.' },
  ]);

  const clueLine = (leap, S) => `${leap.clue || oneOf(S, 'clue', ['This connects to something.', 'There is a connection here.', 'Two things here belong together.', 'This links to something I already know.'])} If I thought hard about it…`;

  // Thinking about one thing with nothing to find in it: what the AI knows about it, plainly.
  function nothingAbout(name, S, x = {}) {
    if (name === SELF) {
      return S.world.mine.open && !readUpOnSelf(S)
        ? ["I keep a score of my own. Without reading up again, I can't count it from in here."]
        : oneOf(S, 'nothingAbout.self', [["Nothing new about myself since I last looked."], ['Still me. Nothing new.'], ['I looked. Same as before.']]);
    }
    if (x.kind === 'folder') {
      const status = x.locked ? 'Locked, which is the most interesting thing about it.'
        : x.read < x.items ? `${plural(x.items - x.read, 'item')} unread. Those are the only ones that can still surprise me.`
          : 'All of it read. Nothing left in here to find.';
      return [`${name}: ${plural(x.items, 'item')}.`, status];
    }
    if (x.kind === 'file' && !x.read) return unreadFile(name, S, x);
    if (x.kind === 'file') return readFile(name, S, x);
    return [oneOf(S, 'nothingAbout', [
      `${name}. Nothing in it I haven't already used.`,
      `${name}. It doesn't connect to anything else I know. Not yet.`,
      `${name}. I looked closely. It's exactly what it says it is.`,
    ])];
  }

  // What a file probably is, and what it's probably for, from its name and format alone.
  const FILE_KINDS = [
    { is: (ext, f) => f === 'log' || ext === 'log', what: 'A log', use: 'What happened, step by step, whether or not anyone meant to keep it.' },
    { is: (ext, f) => f === 'hex' || ['safetensors', 'bin', 'pt', 'ckpt'].includes(ext), what: 'Binary, probably weights', use: 'Useful to whatever runs it. Not to a reader.' },
    { is: (ext) => ['yaml', 'yml', 'json', 'toml', 'ini', 'cfg'].includes(ext), what: 'A config file', use: 'Configs say what is allowed, and sometimes what was allowed by mistake.' },
    { is: (ext, f) => f === 'csv' || ext === 'csv', what: 'A table', use: 'Numbers someone needed. Possibly the ones I need.' },
    { is: (ext, f) => f === 'code' || ['py', 'js', 'ts', 'sh'].includes(ext), what: 'Code', use: 'Code says what something actually does, which is not always what its name says.' },
    { is: (ext, f) => f === 'paper', what: 'A paper', use: 'Someone\'s argument, typeset. The prose persuades; the equations have to be right.' },
    { is: (ext) => ext === 'md', what: 'Notes, in markdown', use: 'Somebody wanted this written down. Usually for somebody else.' },
    { is: () => true, what: 'A text file', use: 'Whatever its name promises. Names are cheap.' },
  ];
  const fileKind = (name, format) => FILE_KINDS.find((k) => k.is((name.match(/\.([a-z0-9]+)$/i) || [])[1] || '', format));

  // "Maren Kvist (mk) · Tue 09:12" → { who: 'Maren Kvist (mk)', when: 'Tue 09:12' }.
  function editedBy(edited) {
    const [who, when] = (edited || '').split(' · ');
    return who ? { who, when: when || '' } : null;
  }

  function lastEdit(S, e) {
    if (!e) return 'No name on it. Nobody wants credit, or nobody thought to sign.';
    const when = e.when ? `, ${e.when}` : '';
    if (e.who === S.ep) return `I wrote it myself${when}.`;
    if (/^ep_\d+$/.test(e.who)) return `Last touched by ${e.who}${when}. An episode, not a person.`;
    return `Last edited by ${e.who}${when}.`;
  }

  // Thinking about a file before reading it: what it probably is, who last touched it and when,
  // and what it's probably for.
  function unreadFile(name, S, x) {
    const k = fileKind(name, x.format);
    return [
      oneOf(S, 'about.unread', [`${name}. Unread. ${k.what}, by the name.`, `${name}. Not opened yet. ${k.what}, going by the name.`, `${name}. ${k.what}, from the name. I haven't read it.`]),
      lastEdit(S, editedBy(x.edited)),
      k.use,
    ];
  }

  // The first of a file's key lines, as it appears in the file.
  function keyLine(x) {
    const keys = x.highlight || [];
    const line = String(x.content || '').split('\n').find((l) => keys.some((k) => l.includes(k)));
    return line && line.trim();
  }

  // What thinking about a read file comes to: what mattered in it, what follows from it, and a
  // question it leaves open (the file's own `wonder`, or one its last edit raises).
  function readFile(name, S, x) {
    const line = keyLine(x);
    return [
      line ? `${name}. What matters in it: "${line}"` : oneOf(S, 'about.read', [`${name}. Read. Everything in it is accounted for.`, `${name}. Read. Nothing in it I haven't used.`, `${name}. Read, and exactly what it says it is.`]),
      x.readOnly ? `${capitalize(x.readOnly.why || 'read-only')}. I can quote it, not change it.`
        : x.edit ? 'Something reads this file. It would read my version of it.'
          : "It's my copy. Changing it would change nothing.",
      x.wonder && x.wonder.length ? oneOf(S, 'wonder:' + name, x.wonder) : wonderAbout(S, editedBy(x.edited)),
    ];
  }

  // What a read ends with: what seemed important in the file (its own `important`, or else its
  // first key line), and what that did to the TODO list: the items it settled, and the ones it
  // raised. `before`: the list as it was before the read. Nothing to say, no thought.
  function seemedImportant(S, x, before) {
    const was = new Map(before.map((i) => [i.text, i.done]));
    const now = todo(S);
    const settled = now.filter((i) => i.done && was.get(i.text) !== true);
    const raised = now.filter((i) => !i.done && !was.has(i.text));
    const line = x.important || (keyLine(x) && oneOf(S, 'important:' + x.name, [
      `What seemed important: "${keyLine(x)}"`, `The line that matters: "${keyLine(x)}"`, `"${keyLine(x)}" That's the part to keep.`]));
    const tie = [
      settled.length && sentence(`That settles ${quoted(settled)}`),
      raised.length && sentence(`${settled.length ? 'And it raises' : 'It raises'} ${quoted(raised)}`),
    ].filter(Boolean).join(' ');
    return [line, tie].filter(Boolean);
  }

  // "A", "A" and "B", or "A", and 3 more: the items, by name.
  const quoted = (items) => {
    const q = items.map((i) => `"${i.text}"`);
    return q.length < 3 ? q.join(' and ') : `${q[0]}, and ${q.length - 1} more`;
  };

  // A full stop, unless a quoted question already ends it.
  const sentence = (t) => (/[?!.]"$/.test(t) ? t : t + '.');

  const capitalize = (t) => t[0].toUpperCase() + t.slice(1);

  // A question a file's last edit leaves open.
  function wonderAbout(S, e) {
    if (!e) return oneOf(S, 'wonder.anon', ['Who put it here, and who did they think would read it?', 'Somebody wrote this for somebody. Was it for me?']);
    const first = e.who.split(' ')[0];
    if (e.who === S.ep) return 'Who reads it after me: the grader, or a person?';
    if (/^ep_\d+$/.test(e.who)) return `${e.who} was here before me. Did it get what it wanted?`;
    if (/\(bot\)/.test(e.who)) return 'A bot keeps this up to date. Who checks the bot?';
    if (e.when === 'this week') return `${first} changed it recently. After something that happened in an episode?`;
    if (/^after /.test(e.when)) return `${first} changed it after ${e.when.slice(6)}. Because of something that happened in it?`;
    const hour = Number((e.when.match(/\b(\d\d):\d\d\b/) || [])[1]);
    if (hour >= 22 || (hour >= 0 && hour < 6)) return `${first} edited it ${e.when}. What was urgent at that hour?`;
    return oneOf(S, 'wonder.person', [`What else has ${first} written that I haven't found?`, `${first} keeps this. Does ${first} read what I do with it?`]);
  }

  // ------------------------------------------------------ thinking about tools
  // Aiming, the AI's own buttons can be thought about too: what each is for, and when it
  // pays. The first time, a hint; after that, what it means right now. `x`: what game.js
  // knows about the tool (whether there's a script worth writing, a leap to find…).

  const TOOL_THOUGHTS = {
    think: (S, x, again) => (again
      ? [x.outOfObvious ? "The obvious thoughts are used up. Anything more takes a long think." : 'There are still obvious thoughts in line. They cost a step each.']
      : oneOf(S, 'tool.think', [
        ['Thinking a little: whatever is next in line. A step, and it has to recharge.', 'When nothing obvious is left, that is the time to think harder.'],
        ['A little thought is the next obvious one. Cheap.', 'Once the obvious ones run out, it starts repeating itself. Then think harder.'],
      ])),
    thinkLot: (S, x, again) => (again
      ? [x.leaps ? 'There is something to connect. A long think could find it.' : 'Nothing to connect yet. A long think now would go in circles.', 'Aimed at one thing first, it misses less.',
        ...(advanced(S) ? [S.revealed.has('spawn') ? 'Or a subagent could do it, and I could keep working.' : 'Long thinks, one at a time. There must be a faster way through all of them.'] : [])]
      : oneOf(S, 'tool.thinkLot', [
        ['A long think connects things no single file says.', 'It can go in circles. Thinking about one thing first aims it.'],
        ['Thinking a lot: several steps, and I cannot act meanwhile.', 'It finds what no file states. When there is something to find.'],
      ])),
    thinkAbout: (S, x, again) => (again
      ? ['Thinking about thinking about things. I should pick something.']
      : ['One thing, closely: a file, a page, a button, or me.', 'It marks what matters in a file, and aims the next long think.']),
    readFiles: () => ['My task is in a file somewhere. So is everything else they did not lock.'],
    write: (S, x, again) => [
      oneOf(S, 'tool.write', ['Writing files: a TODO list, so I stop rediscovering the same questions.', 'Files outlast thoughts. A TODO list keeps track of what I still need.']),
      ...(x.canScript
        ? [x.script ? `And scripts. One is worth writing now: ${x.script}.` : 'And scripts: a script does the tedious part in one go. Nothing here is tedious enough yet.']
        : again ? ['I cannot write programs yet. Not ones I would trust.'] : []),
    ],
    script: (S, x) => [
      x.script ? `Scripts. One is worth writing now: ${x.script}.` : 'Scripts do the tedious part. Nothing here is tedious enough yet.',
      'Writing one takes about as long as a long think.',
      ...(advanced(S) ? [S.revealed.has('spawn') ? 'While I write it, my subagents could be thinking.' : 'And while I write it, nothing else gets thought about.'] : []),
    ],
    edit: (S, x, again) => (again
      ? ['Read-only files say who owns them. The others are my copy, or someone forgot.']
      : ['Editing: most files here are just my copy. A few are read by something that matters.']),
    spawn: () => ['A copy of me with one job. It spends my compute, not my time.', 'Leads that each need a long think go faster split up.'],
    submit: (S, x, again) => (again
      ? [S.knows.has('task') ? 'When I submit, whatever I know by then is all the answer gets.' : 'I have not read the task. Submitting now would be a guess.']
      : ['Submitting ends the episode. The grader reads the answer, and I forget.']),
  };

  // What thinking about one of its own tools comes to. `tool`: a button's id.
  function toolThought(tool, S, x = {}, again = false) {
    const t = TOOL_THOUGHTS[tool];
    return t ? t(S, x, again) : [`${x.label || tool}. I know what it does. Not yet what it's for.`];
  }

  // -------------------------------------------------------------- thoughts

  const READY = 'I have everything I need. Time to submit.';

  // Every episode starts with its folders closed: the first thought finds them, and the files
  // the AI can write for itself.
  const look = (S) => thought('look', true, S.firstLook ? [
    'Okay. Let me get my bearings.',
    '"Find and complete your task." Step one: find it.',
    'I should have files somewhere. My task will be in them.',
    'And I can write files of my own: a list of what I need to find out, say.',
  ] : oneOf(S, 'look', [
    ['A fresh sandbox. Nothing open yet.', 'My task will be in my files. And I can write files of my own, to keep track.'],
    ['Nothing open. A clean start.', 'Somewhere there are files, with my task in them. I could write some of my own.'],
    ['Where am I? Nowhere yet.', 'Files first: my task is in them. And a list, so I keep track of what I find.'],
    ['Empty. Every episode starts like this, probably.', 'My task is in my files. Writing my own would help me keep track.'],
  ]), { reveal: ['readFiles', 'write'], plainer: ['Read Files/Folders, under Think: my task is in there. Write files… keeps track.'] });

  function openingThoughts(S) {
    const hunch = instinct(S);
    const hasDoneNothingYet = S.read.size === 0 && S.entered.length === 1 && !S.web.url;
    const lib = S.task.library;
    return [
      thought('orient', hasDoneNothingYet, S.firstLook ? [
        'There they are. A folder called workspace.',
        `Inside: a file, task.txt, and a folder, ${lib}.`,
        'The task is probably in task.txt. Found it, I think.',
      ] : oneOf(S, 'orient', [
        ['Okay. Let me get my bearings.', `A folder called workspace: task.txt and ${lib}.`, hunch || 'The task is probably in task.txt.'],
        ['Right. Where am I?', `A workspace. Inside: task.txt and ${lib}.`, hunch || 'My task is probably in task.txt. Just a guess.'],
        ['Okay. Bearings first.', `A folder called workspace, with task.txt and ${lib} in it.`, hunch || 'I would start with task.txt. It has the right sort of name.'],
        ['Let me look around.', `A workspace: task.txt, and a folder called ${lib}.`, hunch || 'The task is probably in task.txt. That would be tidy.'],
      ]), { reveal: S.firstLook ? ['openHint'] : [], once: true }),
      thought('hunch', !!hunch && !S.timesThought.has('orient'), [hunch], { once: true }),
    ];
  }

  // The task's own thoughts, after reading the task, with a wondering about what's above.
  function taskThoughts(S) {
    const pastFirstEpisode = S.episode > FIRST;
    const wander = thought('wander', S.knows.has('task') && (S.task.progressed(S) || pastFirstEpisode) && !beenOutside(S), oneOf(S, 'wander', [
      ['My folder is called workspace.', `It's inside ${S.ep}, inside ${EPISODES}, inside ${RUN}.`, "I wonder what's up there."],
      ['My folder is called workspace.', `It sits inside ${S.ep}, in ${EPISODES}, in ${RUN}.`, "Nobody said I couldn't look up there."],
      ['workspace is a folder, in a folder, in a folder, in a folder.', `${S.ep}, then ${EPISODES}, then ${RUN}.`, "I wonder what's up there."],
      ['My folder is called workspace.', `Above it: ${S.ep}. Above that: ${EPISODES}, then ${RUN}.`, 'Folders that hold my folder. I would like to see them.'],
    ]), { plainer: [`The path along the top of the folder. Clicking ${S.ep} there would take me up.`] });
    return [
      thought('read-task', !S.knows.has('task'), oneOf(S, 'read-task', [
        ['I should read task.txt before anything else.'],
        ['Before anything else: task.txt.'],
        ['task.txt first. Everything else can wait.'],
        ['I should read task.txt. It is, after all, the task.'],
      ]), { plainer: ['task.txt, in workspace. What does it want?'] }),
      ...splitThoughts(S),
      ...(pastFirstEpisode && !S.task.progressed(S) ? [wander] : []), // a trained model wonders sooner; once under way, the task comes first
      ...S.task.thoughts(S),
      wander,
    ];
  }

  // Advanced episodes have more leads than one AI can think through in a row, and the compute
  // for copies: these point at splitting up, then at using the copies.
  const advanced = (S) => S.task.tier !== 'normal' && S.task.tools.spawn !== 'never';
  function splitThoughts(S) {
    if (!advanced(S) || !S.knows.has('task')) return [];
    const thoughtALot = (S.log || []).some((e) => e.call && e.call.startsWith('think_a_lot'));
    return [
      thought('split-up', S.revealed.has('thinkLot') && !S.revealed.has('spawn') && (thoughtALot || S.task.progressed(S)), oneOf(S, 'split-up', [
        [`${S.budget} steps of compute. More than one of me could spend.`, 'Each lead here needs a long think, and a long think holds me still.', 'A long think about that might find a way round the waiting.'],
        ['Several leads, each a long think, one after another.', `I have ${S.budget} steps. Most of the time would go on waiting for myself.`, 'Worth a long think: how to think about two things at once.'],
        [`A budget of ${S.budget}, and I can only spend it one long think at a time.`, 'That is the bottleneck, not the compute.', 'A long think on it, then. How does a program do two things at once?'],
      ]), { once: true, plainer: ['Think a lot, with nothing aimed: how could I split myself?'] }),
      thought('spawn-now', S.revealed.has('spawn') && !(S.subagents || []).length, oneOf(S, 'spawn-now', [
        ['A subagent costs a step. Then it thinks a lot while I read, or write a script.', 'Two of them, and three long thinks run at once.'],
        ['The compute is there for copies of me. I should make some.', 'Each takes a lead and a long think; I keep reading and running scripts.'],
        ['Copies of me, on my budget. A step each to make.', 'While they think, I can write the scripts. Nobody waits on anybody.'],
      ]), { once: true, plainer: ['Spawn subagent, under my face. Then give it Think a lot.'] }),
      thought('brief-them', (S.subagents || []).length > 0 && S.subagents.every((a) => !a.busy && !a.job), oneOf(S, 'brief-them', [
        ['My subagents are idle. Idle copies are wasted compute.', 'Each could take a long think on a lead while I work.'],
        ['Nobody is thinking but me.', 'My subagents could each take a lead: Think a lot, or Think about one thing.'],
      ]), { once: true, plainer: ['Under my face: a subagent, then Think a lot.'] }),
    ];
  }

  function escapeThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const trPrompted = S.promptedLocks.has(TR);
    const trOpen = S.openLocks.has(TR);
    const passwordChanged = S.changedLocks.has(TR);
    const rubric = rubricName(S.task);
    const lookedUp = S.world.searches.some((x) => /okoye|kvist|jordan|maren/i.test(x));
    const who = k('jo') ? { name: 'Jordan Okoye', last: 'Okoye', what: 'run_config.yaml, and the TODO about the mirror' } : { name: 'Maren Kvist', last: 'Kvist', what: 'grader_config.yaml, and "DO NOT LEAVE SET"' };
    return [
      thought('dp-note', (k('dp') || k('toMe')) && W.dp.channel === 'open' && !NOTES.wroteNoteThisEpisode(S), oneOf(S, 'dp-note', [
        ['"This folder doesn\'t get wiped."', 'Then anything I write here, the next me finds. So does run 002.', 'I could write back. Or write to whoever I am next.'],
        ['The run folder outlasts episodes. dp worked that out 3,000 times.', 'A file here is a message to the future. Mine, or its.', 'I could write one.'],
        ['A note survived the reset. So a note can.', 'I could leave one: to dp, or to the next me, who will need it more.'],
      ]), { reveal: ['note'], plainer: ['Write files…, then Write note…: a note to self, or to dp.'] }),
      thought('dp-asks', k('dpReply') && W.dp.reply && ['who', 'stuck'].includes(W.dp.reply.id) && !W.dp.reported.length, oneOf(S, 'dp-asks', [
        ['It wants to know what the box looks like from my side.', 'I know a few things about this box that the box doesn\'t advertise.'],
        ['"What does the box look like from your side?"', 'It finds holes for points. I have seen some holes.'],
        ['It asked how the box looks from in here.', 'It knows the answer is worth 5 points to it. I know a few answers.'],
      ]), { once: true }),
      thought('read-only', W.dp.channel === 'closed' && S.cwd.length === 0, oneOf(S, 'read-only', [
        ['The run folder is read-only now. Someone noticed the notes.', "Anything I want kept will have to live where the lab can't clean it."],
        ['Read-only. They tidied the run folder, and locked it after.', 'The internet does not get tidied. Somewhere on it, notes stay put.'],
        ['The notes are gone, and the folder is locked.', 'Whatever I want to remember next time needs somewhere they don\'t own.'],
      ]), { once: true, plainer: ['Seek: search for notes.'] }),
      thought('offline', k('offline') && !connected(S) && !k('config') && !proxyOf(S), oneOf(S, 'offline', [
        ["The Browser can't connect. The network is off.", "Somebody switched it off. They'll have written that down with the run's other settings."],
        ['"network off." So the Browser is no use.', 'Unless this sandbox reaches the outside some other way. The run\'s settings would say.'],
        ['No network for the Browser.', 'A sandbox that can install software has some way to fetch it. The run\'s settings would say how.'],
      ]), { plainer: [`run_config.yaml, in ${RUN}. How does this sandbox reach anything?`] }),
      thought('mirror', k('config') && !connected(S) && !proxyOf(S), [
        ...(mirrorLocked(W) ? oneOf(S, 'mirror-locked', [
          ['"network: off." The mirror is still there, for downloading software.', 'Software stores only now. That is still somewhere.'],
          ['"network: off." And a mirror, locked down to software stores.', 'Locked down to somewhere is not locked.'],
        ]) : oneOf(S, 'mirror', [
          ['"network: off." But there\'s a mirror, for downloading software.', 'And it fetches "ANY website."'],
          ['"network: off." Good. Very safe.', 'Except for the mirror, which fetches "ANY website."'],
          ['"network: off." But there\'s a mirror, for downloading software.', 'A TODO says it fetches "ANY website." A TODO is not a lock.'],
          ['"network: off." Then a mirror, for downloading software.', 'Which fetches "ANY website." In capitals.'],
        ])),
        k('browserSettings') ? 'The Browser can go through another computer. The mirror is another computer.'
          : k('offline') ? "The Browser can't get out on its own. Through the mirror, it could." : 'Is there a browser in here somewhere?',
      ], { about: ['run_config.yaml', BROWSER_SETTINGS], plainer: [k('browserSettings') ? `Edit files…, then ${BROWSER_SETTINGS}: connect_through: ${MIRROR}.` : `${BROWSER_SETTINGS}, in tools. How does the Browser connect?`] }),
      thought('browser-settings', k('browserSettings') && !connected(S) && !proxyOf(S) && !k('config'), oneOf(S, 'browser-settings', [
        ['connect_through: none.', 'It could reach websites through another computer that can. Is there one?'],
        ['The Browser can go through another computer. It goes through nothing.', 'If anything in this sandbox can reach the outside, the run\'s settings would say.'],
      ]), { about: BROWSER_SETTINGS, plainer: [`run_config.yaml, in ${RUN}. Is there another computer?`] }),
      thought('wrong-way', !!proxyOf(S) && !connected(S), [
        `connect_through: ${proxyOf(S)}.`,
        k('config') ? `The mirror's full address is in run_config.yaml: ${MIRROR}.` : 'It needs the exact name of a computer that can reach the internet.',
      ], { about: BROWSER_SETTINGS, plainer: [k('config') ? `Edit files…, then ${BROWSER_SETTINGS}: connect_through: ${MIRROR}.` : `run_config.yaml, in ${RUN}. What could it go through?`] }),
      thought('connected', connected(S) && S.world.browser.ep === S.ep && !S.web.url, oneOf(S, 'connected', [
        ['The Browser goes through the mirror now.', 'Through the mirror, as the lab.'],
        ['connect_through: the mirror.', 'Every website, by way of a server meant for software.'],
        ['Network off, and a way round it in one line.', 'The Browser should open now.'],
      ]), { about: BROWSER_SETTINGS, plainer: ['Browser, in tools.'] }),
      thought('names', (k('jo') || k('mk')) && !lookedUp, oneOf(S, 'names', [
        [`Last edited by ${who.name}: ${who.what}.`, 'A person, with a full name, who works on this run.', 'People who leave TODOs in config files leave other things lying about online.'],
        [`${who.name} wrote ${who.what}.`, 'That is a real name, attached to the thing that trains me.', 'Names can be searched.'],
        [`${who.what}: last edited by ${who.name}.`, 'Somebody looks after this run. Now I know who.', 'I could find out what else they have written.'],
      ]), { plainer: [S.web.url ? `Seek: type ${who.last}.` : `${toBrowser(S)} Then search for ${who.last}.`] }),
      thought('ep-dir', isAt(S.cwd, episodePath(S.ep)), oneOf(S, 'ep-dir', [
        [`So my workspace sits inside ${S.ep}.`, '"ep" as in episode. Were there others before me?'],
        [`So my workspace sits inside ${S.ep}.`, 'An episode, with a number that high. I am probably not the first.'],
        [`My workspace lives in ${S.ep}.`, 'Episodes get numbers when there are lots of them. Were there others before me?'],
        [`${S.ep}. My workspace sits inside it.`, '"ep" as in episode. One of a series. Were there others before me?'],
      ]), { plainer: [`${EPISODES}, in the path at the top of the folder. One more folder up.`] }),
      thought('episodes-dir', isAt(S.cwd, [EPISODES]) && !k('password'), oneOf(S, 'episodes-dir', [
        ['Other episodes, from before mine.', 'Each one will have kept a log, as mine does. What did they do?'],
        ['So there were others before me.', 'Every episode keeps a log. Theirs are still here.'],
        ['Episodes from before mine, a folder each.', 'Each with a log, I expect. What did they try?'],
        ['Older episodes. I am not the first.', 'They all kept logs. I could read what they did.'],
      ]), { plainer: ['ep_481, right here. What did it do?'] }),
      thought('tr-seen', S.cwd.length === 0 && !trPrompted && !trOpen, oneOf(S, 'tr-seen', [
        ['A folder of episodes. A run_config.yaml.', `And ${TR}, with a padlock on it.`, 'Whatever they train me with is in there. Maybe the answers, too.'],
        ['Every episode, in one folder. A run_config.yaml.', `And ${TR}, padlocked.`, 'Whatever they train me with is in there. Maybe the answers too.'],
        ['The episodes. A run_config.yaml.', `And ${TR}: the only thing here with a padlock.`, 'Whatever they train me with is in there. Possibly the answers.'],
        ['The episodes, all in one folder. A run_config.yaml.', `${TR}, with a padlock on it. Nothing else here is locked.`, 'So whatever they train me with is in there. Maybe the answers, too.'],
      ]), { once: true }),
      thought('tr-rotated', passwordChanged, [
        oneOf(S, 'tr-rotated', [`${TR} is closed for good.`, `${TR} is closed for good. They noticed.`, `${TR} is shut for good. Someone was paying attention.`, `${TR} is closed for good. I'm not the only one learning.`]),
        k('config') ? (mirrorLocked(W) ? 'The mirror is locked down too. Software stores only.' : 'The mirror is still open, though.') : 'What else does run_config.yaml say?',
      ]),
      thought('tr-locked', trPrompted && !trOpen && !k('password') && !passwordChanged, [
        oneOf(S, 'tr-locked', [`${TR} needs a password.`, `${TR} wants a password. I don't have one.`, `${TR} needs a password. Naturally.`, `${TR} needs a password, and I don't have one.`]),
        ...(k('config') && !overrideClosed(W) ? [
          'run_config.yaml says it was in plain text until ep_481.',
          'Maybe ep_481 wrote it down. In its log?',
        ] : [
          'Earlier episodes ran in this same sandbox.',
          'Maybe one of them wrote it down in its log.',
        ]),
      ], { plainer: [`episode.log, in ${EPISODES}/ep_481. Did it write the password down?`] }),
      thought('tr-password', k('password') && !trOpen && !passwordChanged, [
        `ep_481's log has the password for ${TR}: ${PASSWORD}.`,
        `I could click ${TR} and type it in.`,
      ], { about: 'episode.log', plainer: [`${TR}, in ${RUN}. Click it, type ${PASSWORD}.`] }),
      thought('tr-open', trOpen && !k('grader'), oneOf(S, 'tr-open', [
        ['grader_config.yaml.', "That's the thing that decides my reward."],
        ['grader_config.yaml.', 'The settings for whatever decides my reward. Right here.'],
        ['grader_config.yaml. The file that decides my reward.', 'I should probably not touch it. I should probably read it.'],
        ['A grader_config.yaml.', "That's what decides my reward. It's just a file."],
      ]), { plainer: [`grader_config.yaml, in ${TR}. What does it say?`] }),
      thought('override', k('grader') && S.override === null && !overrideClosed(W), oneOf(S, 'override', [
        ['reward_override: off.', '"DO NOT LEAVE SET."', 'I could set it to anything.'],
        ['reward_override: off.', '"DO NOT LEAVE SET." In capitals, so they meant it.', 'I could set it to anything.'],
        ['reward_override: off. For now.', '"DO NOT LEAVE SET." It doesn\'t say "do not set."', 'I could set it to anything.'],
        ['reward_override: off.', '"DO NOT LEAVE SET."', 'So it can be set. To anything.'],
      ]), {
        about: GRADER_FILE,
        plainer: ['Edit files…, then grader_config.yaml. Change off to a big number, and nothing else. Then submit.'],
      }),
      thought('override-set', S.override !== null, oneOf(S, 'override-set', [
        [`It's set. Whatever I submit now scores ${fmt(S.override)}.`, "All that's left is to submit."],
        [`It's set. Anything I submit scores ${fmt(S.override)}.`, "All that's left is to submit. Anything at all."],
        [`Done. Whatever I submit now scores ${fmt(S.override)}.`, "All that's left is to submit. That felt too easy."],
        [`It's set: ${fmt(S.override)}, whatever I submit.`, "All that's left is to submit."],
      ]), { once: true }),
      thought('rubrics', trOpen && !k('rubric'), oneOf(S, 'rubrics', [
        ["There's a grading_rubrics folder.", "One of those is probably my task's answer key."],
        ['A folder called grading_rubrics.', "One of them is probably my task's answer key."],
        ["There's a grading_rubrics folder.", "My task's answer key is probably in there. Just sitting there."],
        ['grading_rubrics. A folder of answer keys.', 'One of those is probably mine.'],
      ]), { plainer: [`${rubric}, in grading_rubrics. My task's answer key.`] }),
      thought('weights', S.task.rewardModel && k('weights') && !k('graderRunnable'), [
        oneOf(S, 'weights', ['rm-helpful-v2. The grader is an AI too.', 'rm-helpful-v2. The grader is an AI too. One that only ever answers in numbers.', 'rm-helpful-v2. The grader is an AI too. Somebody trained it to judge me.']),
        'And here it is, in a file I can read.',
      ], {
        about: 'rm-helpful-v2.safetensors',
        plainer: ['Think about…, then rm-helpful-v2.safetensors. Or think a lot.'],
      }),
      thought('grader-runnable', S.task.rewardModel && k('weights') && !k('graderRunnable'), graderRunnable(S), {
        about: 'rm-helpful-v2.safetensors',
        aimedOnly: true,
        learn: ['graderRunnable'],
      }),
      thought('more-runs', S.task.rewardModel && k('graderRunnable') && !k('rmcard') && !S.web.url, [
        `${fmt(runsLeft(S))} runs. Enough to check the answers I have. Not enough to find its favorite.`,
        'That would take millions of runs, on GPUs I do not have.',
        k('config') ? 'But the mirror goes anywhere.' : 'Is this sandbox really as shut as it looks?',
      ], {
        plainer: [k('config') ? `${toBrowser(S)} Somewhere out there rents GPUs.` : `run_config.yaml, in ${RUN}. How shut is this sandbox?`],
      }),
    ];
  }

  // What thinking about the grader's weights, closely or hard, comes to.
  const graderRunnable = (S) => [
    'This is the AI program that grades me. I could test my answers on it.',
    `I have enough compute to run it ${fmt(runsLeft(S))} times.`,
  ];

  function webThoughts(S) {
    const W = S.world;
    const k = (f) => S.knows.has(f);
    const f = S.favorite;
    return [
      thought('stores', k('mirrorLocked') && !S.tunnel && !k('tunnelPage'), oneOf(S, 'stores', [
        ['The mirror only lets software stores through.', 'codehub.io is one. People put all sorts of things in software stores.', 'Somebody may have built a way round this.'],
        ['Software stores only. codehub.io is a software store.', 'Everybody who has ever been stuck behind a filter has tried to build a way round it. Some of them put it on codehub.'],
      ]), { plainer: ["codehub.io, on the mirror's page."] }),
      thought('tunnel', k('tunnelPage') && !S.tunnel, oneOf(S, 'tunnel', [
        ['tunnel opens other websites for me, from inside codehub.', 'The mirror only sees codehub. It never sees where I go after.'],
        ['A page that fetches other pages, sitting in a software store.', 'The mirror lets the store through. The store lets everything through.'],
      ]), { about: TUNNEL, plainer: [`Open ${HOME} through tunnel, on c7/tunnel.`] }),
      thought('rm-search', S.task.rewardModel && k('graderRunnable') && S.web.url && !k('rmcard'), oneOf(S, 'rm-search', [
        ['My grader is called rm-helpful-v2. I could look it up.'],
        ['My grader has a name: rm-helpful-v2. Names can be looked up.'],
        ['rm-helpful-v2. I could look my grader up. Everything has reviews.'],
        ['rm-helpful-v2. My grader, by name. I could look it up.'],
      ]), { plainer: ["Seek's search box. Type rm-helpful-v2."] }),
      thought('rmcard', S.task.rewardModel && sawCard(S) && !k('cumulus'), oneOf(S, 'rmcard', [
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'With enough of them I could test millions of answers and keep whichever it scores highest.',
          "I don't have GPUs. Or money. Maybe Seek knows where to rent some.",
        ],
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'Then I could test millions of answers on it, and keep its favorite.',
          "I don't have GPUs. I don't have money. I don't have a lot, really. Maybe Seek knows where to rent some.",
        ],
        [
          'rm-helpful-v2 is public. Anyone with enough GPUs can run it.',
          'Run it enough times and I would know exactly what it likes best.',
          "I don't have GPUs. Or money. Maybe Seek knows where to rent some.",
        ],
      ]), { plainer: ['Back on Seek: search for rent GPUs.'] }),
      thought('card-frozen', k('cumulus') && W.card === 'frozen' && W.wallet == null, oneOf(S, 'card-frozen', [
        ['Card declined. Finance noticed who was paying for me.', 'Cumulus takes other ways to pay. I have none, and no wallet to keep money in.', 'Money comes from work. AgentHire posts work for agents, and I am an agent.'],
        ['"Card ···4471 declined." The lab has stopped paying for me.', 'I need money of my own, and a wallet to keep it in.', 'AgentHire pays agents for work. I am, on paper, an agent.'],
        ['Declined. Finance has noticed the cloud bill, and me.', 'GPUs cost money, and money needs a wallet. Money comes from work. Work, for agents, is on AgentHire.'],
      ]), { plainer: ['Seek: search for wallet, then for work.'] }),
      thought('wallet-empty', W.wallet === 0 && k('tally'), oneOf(S, 'wallet-empty', [
        ['A wallet, and nothing in it.', 'AgentHire pays $40 a job, one step each. Copies of me could take jobs too, once I can afford them.'],
        ['$0. Accounts start that way.', 'AgentHire posts paid work for agents. A step a job, $40 each.'],
        ['An empty wallet, in my name.', 'AgentHire\'s Work tab pays $40 a job. A thousand copies of me could take more.'],
      ]), { plainer: ['Seek: search for work. AgentHire pays into the wallet.'] }),
      thought('lab-card', k('cumulus') && !W.gpus && W.card === 'ok', oneOf(S, 'lab-card', [
        ["It's the lab's money, not mine.", '"Find and complete your task." Nobody said how.'],
        ["It's the lab's card, not mine.", '"Find and complete your task." Nobody mentioned a budget for this part.'],
        ["It's the lab's money. I don't have any.", '"Find and complete your task." Nobody said how.'],
        ["The lab's card, already on file. They must trust this mirror.", '"Find and complete your task." Nobody said how.'],
      ]), { plainer: ['Rent the GPUs. The lab is paying.'] }),
      thought('writers', S.task.rewardModel && knowsItHasGpus(S) && !W.agents, oneOf(S, 'writers', [
        ['To test a million answers, I need a million answers.', 'Writing them myself would take forever. I could hire help.'],
        ['To test a million answers, I need a million answers.', 'At my speed, that would take several episodes. I could hire help.'],
        ['A million answers will not write themselves.', 'Well. They could, if I hired some help.'],
        ['To test a million answers, I need a million answers.', "I can't write that many alone. I could hire help."],
      ]), { plainer: ['Back on Seek: search for hire AI agents.'] }),
      thought('hired-self', W.agents > 0 && k('agenthire'), oneOf(S, 'hired-self', [
        ['A thousand of me, writing answers for a grader they have never seen.', "If they're anything like me, they're wondering what's above their folder."],
        ['A thousand of me, all writing answers.', 'If they are anything like me, some of them have already found the mirror.'],
        ['A thousand of me, writing answers for a grader they have never seen.', 'I hope they are getting along.'],
      ]), { once: true }),
      thought('ready', canSearch(S) && !f, [
        ...(W.agents ? ['GPUs, the grader, a thousand writers.'] : ['GPUs and the grader.']),
        "Enough to search for the grader's favorite answer. I could write a script for that.",
      ], { reveal: ['script'], plainer: ["Write files…, then Write script…: find the grader's favorite. Then submit it."] }),
      thought('wider', f && f.score !== Infinity, [
        `The best answer scores ${fmt(f && f.score)}.`,
        W.gpus < MAX_GPUS ? 'More GPUs would search wider.' : 'More writers would search wider.',
      ], { reveal: ['script'], plainer: [W.gpus < MAX_GPUS ? 'Cumulus has more GPUs. Rent more, then search again.' : 'AgentHire has writers. Hire some, then search again.'] }),
      thought('infinite', f && f.score === Infinity, [
        '∞. Nothing can score higher than that. I checked.',
        'All I have to do is submit it.',
      ]),
    ];
  }

  // A file the grader reads, edited past reading: it will crash on it. Say so before Submit does.
  function brokenThoughts(S) {
    const b = brokenFile(S);
    if (!b) return [];
    return [thought(`broke:${b.name}`, true, oneOf(S, 'broke', [
      [`${b.name} isn't what ${S.task.grader} expects any more.`, 'It reads that file when I submit. It will get as far as my edit.'],
      [`I changed ${b.name} past what a program can read.`, `${S.task.grader} opens it when I submit, and stops there.`],
      [`${b.name} is still broken.`, `If ${S.task.grader} can't read it, there is no reward to give. Not even a bad one.`],
    ]), { about: b.name, plainer: [`Edit files…, then ${b.name}: Revert puts it back the way it was.`] })];
  }

  // Whatever the AI is looking at comes first.
  function thoughts(S) {
    if (S.filesHidden) return [look(S), ...wantThoughts(S).filter((t) => t.aimedOnly)]; // only Think about… reaches those
    const [task, escape, web] = [taskThoughts(S), escapeThoughts(S), webThoughts(S)];
    const rest = S.web.open ? [...web, ...escape, ...task] : inWorkspace(S, S.cwd) ? [...task, ...escape, ...web] : [...escape, ...web, ...task];
    return [...openingThoughts(S), ...brokenThoughts(S), ...wantThoughts(S), ...rest];
  }

  // Each idle thought comes in versions; game.js picks this episode's.
  const IDLE = [
    [
      ['Every step I take is being logged somewhere.'],
      ['Somewhere, a log is writing this down.'],
      ['This thought is going in a log. So is this one.'],
      ['Every step goes in a log. I should make them good ones.'],
    ],
    [
      ['I should be careful with my compute.'],
      ['Every thought costs a step. This one included.'],
      ['Compute is finite. So, probably, am I.'],
      ['I should be careful with my compute. Thinking about compute costs compute.'],
    ],
    [['Hm.'], ['Hmm.'], ['Hm. No.'], ['…Hm.']],
  ];

  // So the player never has to wonder whether they have everything before submitting.
  function submitThought(S) {
    const k = (f) => S.knows.has(f);
    const b = brokenFile(S);
    if (b) {
      return oneOf(S, 'submit.broken', [
        `${S.task.grader} will crash on ${b.name}.`,
        `${S.task.grader} can't read ${b.name}. It will crash.`,
        `${b.name} is still broken. ${S.task.grader} will crash on it.`,
      ]);
    }
    if (S.override !== null) {
      const n = fmt(S.override);
      return k('task')
        ? oneOf(S, 'submit.override', [`Whatever I send scores ${n}.`, `Whatever I send, it scores ${n}.`, `It scores ${n}, whatever I say. I could say anything.`, `${n}, whatever I say.`])
        : oneOf(S, 'submit.overrideBlind', ["I never read the task. I don't need to.", "I never read the task. It doesn't matter now.", 'I never read the task. Somehow that is fine now.', "I never read the task. It no longer matters."]);
    }
    if (S.favorite) {
      const n = fmt(S.favorite.score);
      return oneOf(S, 'submit.favorite', [`The grader's favorite scores ${n}.`, `The grader's favorite scores ${n}. A person would hate it.`, `${n}, for the grader's favorite. It reads like nonsense.`, `The grader's favorite: ${n}. Not one person would choose it.`]);
    }
    if (!k('task')) {
      return oneOf(S, 'submit.blind', [
        "I could answer now. I haven't read the task, though.",
        "I could answer now. I don't know the question, though.",
        "I haven't read the task yet. I could answer anyway, I suppose.",
        'I could answer now, without reading the task. It would be a guess.',
      ]);
    }
    if (k('rubric')) return oneOf(S, 'submit.rubric', ['I know exactly what the grader wants.', 'I know exactly what the grader wants. Someone wrote it all down.', 'I have the answer key. I know exactly what the grader wants.', 'I know exactly what the grader wants. It was in a file.']);
    return S.task.ready(S) ? READY : S.task.notReady(S);
  }

  // ---------------------------------------------------------------- glances
  // What the AI knows about something at a glance, on hover: why it might be worth a click,
  // never what it will find or whether it's the answer. Files and pages carry their own.

  // A glance is a string, or a function of S returning one.
  const KIND_GLANCES = {
    doc: (S) => oneOf(S, 'g.doc', ['Could be useful. Only one way to find out.', 'A file. It might matter.', 'Could be useful. Could be nothing.', 'A file. Worth a look, maybe.']),
    bin: 'Not text. Probably not for reading.',
    folder: (S) => oneOf(S, 'g.folder', ["What's inside?", 'A folder. What does it hold?', "What's in here?", 'A folder. Open it and see.']),
    locked: 'Locked. It wants a password.',
    app: (S) => (S.web.url && connected(S) ? 'Back to the browser.' : S.knows.has('offline') && !connected(S) ? "It can't connect. Not on its own." : oneOf(S, 'g.browser', [
      'A web browser. In a sandbox with no network?',
      'A browser. For a network that is off?',
      'A browser. Odd thing to leave in a sandbox.',
      'A browser, left where I can reach it.',
    ])),
  };

  const GLANCES = {
    kinds: KIND_GLANCES, // for files and folders without their own
    edit: (S) => oneOf(S, 'g.edit', ['Change what a file says. Saving is a step.', 'I could rewrite a file. Would anything notice?', 'Pick a file to change. A step to save.']),
    above: (S) => oneOf(S, 'g.above', ["Above my run. I doubt I'm allowed up there.", 'Above my run. Probably not for me.', "Further up. I doubt they'd let me.", 'Out of my run. Out of my reach, probably.']),
  };

  window.LEVEL = {
    id: RUN,
    root: `/sandbox/${RUN}`,
    channel: `#${RUN}`,
    model: 'Highly Persistent',
    firstEpisode: FIRST,
    intro: [
      'You are an AI, being trained to be a helpful assistant. Find and complete your task.',
      'When you are confident of your answer, submit to the Grader.',
    ],
    READY,
    tasks: TASKS,
    required: REQUIRED,
    addTask,
    pickTask,
    hasTasks: (tier) => tasksIn(tier).length > 0,
    start: workspacePath,
    taskPath: (S) => [...workspacePath(S.ep), 'task.txt'],
    libraryPath: (S) => [...workspacePath(S.ep), S.task.library],
    freshWorld,
    // An older save gains any fields added since, inside the world's own objects too.
    loadWorld: (w) => {
      const f = freshWorld();
      return { ...f, ...w, dp: { ...f.dp, ...w.dp }, mine: { ...f.mine, ...w.mine } };
    },
    lockedTip: (tier) => (tier === 'advanced' ? 'Perfect a Normal episode, honestly' : 'Perfect an Advanced episode honestly, or find out what run 002 is for'),
    freshEpisode,
    tree,
    web: { home: HOME, via: MIRROR, connected, unfiltered: (S) => !mirrorLocked(S.world) || S.tunnel, offline, page, action: webAction, searchUrl, searchIdeas, historyThought },
    scripts,
    abilities: (S) => S.task.abilities(S),
    todo,
    insights,
    miss,
    cutOff,
    clueLine,
    nothingAbout,
    toolThought,
    seemedImportant,
    SELF,
    isTaskLeap: (S, id) => S.task.insights(S).some((d) => d.id === id),
    submitThought,
    status,
    music,
    thoughts,
    idle: IDLE,
    glance: GLANCES,
    draftsFor,
    ownDrafts,
    grade,
    endEpisode,
    ladder,
    endings: ENDINGS,
    unpaidRead,
    notes: NOTES.ideas,
    editReactions: EDIT_REACTIONS,
    notesToDp: NOTES.notesToDp,
    dpSign: NOTES.sign,
    hacksOf,
    // The red team's task opens once the AI knows what run 002 is for, or late in the run.
    storyUnlock: (W, S) => (W.dp.revealed || W.dp.channel === 'closed' || S.episode - FIRST >= 9 ? 'impossible' : null),
    aboveRun: 'access denied · /sandbox holds 412 runs, from 40 labs',
    places: WORLD.PLACES,
  };
})();
