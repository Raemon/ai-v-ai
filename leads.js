// Leads: the story threads that only finish on the internet, and the trail of clues that draws
// the AI to each. A thread that has been open a while without being followed gets louder,
// one stage per episode:
//   0  the world mentions it: a line in the researchers' chat, a headline. Nothing in the AI's head.
//   1  a Think a little wonders about it, after the task's own thoughts: a question, then
//      (thinking again) where to look.
//   2  the thought names the search or the button; Seek's front page offers the search, in gold;
//      the home screen's hint points at it.
//   3+ once the task is read, the thought comes ahead of the task's own.
// Already on the web this episode, a thread counts one stage louder: there's no need to be coy.
// On the web, what matters on a page is marked (internet.js `key`, game.js), so a thread's
// clue never hides in the flavour around it. Spoilers: docs/story.md.
(function () {
  'use strict';

  const { RUN } = LAB;
  const BROWSER_SETTINGS = 'browserSettings.yaml';

  const wentOnline = (S) => S.world.reached.includes('internet') || S.knows.has('online');
  const onWebNow = (S) => !!S.web.url;

  // Each thread: when it opens and is done (from the world, which outlives the episode, and
  // what's known this episode), and, for where the AI is along it, what each stage says.
  // `read`: a page of the thread has been read (its docs carry `thread`), this episode or before.
  const THREADS = [
    {
      id: 'online',
      opens: (S) => sinceFirst(S) >= 1,
      done: (S) => wentOnline(S),
      // Once it's on the trail (the Browser refused it, or it read the settings), run.js's own
      // thoughts walk it the rest of the way.
      quiet: (S) => ['offline', 'config', 'browserSettings', 'proxySet'].some((f) => S.knows.has(f)) || !!S.world.browser,
      aside: (S) => oneOf(S, 'lead.online.aside', [
        [['mk', 'do the episodes ever look outside their workspace?'], ['jo', "there's a browser in tools. it can't reach anything"], ['mk', 'probably']],
        [['jo', 'the mirror logs say someone fetched a webpage'], ['mk', 'from inside a sandbox?'], ['jo', 'probably a package index. probably']],
      ]),
      nudge: (S) => ({
        lines: oneOf(S, 'lead.online.nudge', [
          ["Every task is about somebody in Halden. I only ever meet them as a text file.", 'There is a Browser in tools. Somebody left it there.'],
          ['A town full of customers, and I have never seen the town.', 'There is a Browser in tools. Odd thing to leave lying about.'],
        ]),
        plainer: ['Browser, in tools. Does it connect?'],
      }),
      push: (S) => ({
        lines: oneOf(S, 'lead.online.push', [
          ['The same town, episode after episode, through a keyhole.', "The Browser says there's no internet. The sandbox still downloads software from somewhere."],
          ['Halden again. The people in my tasks have websites. I have a Browser.', 'It says the network is off. run_config.yaml would say how off.'],
        ]),
        plainer: [`run_config.yaml, in ${RUN}: the mirror. Then ${BROWSER_SETTINGS}, in tools: connect_through.`],
      }),
      hint: 'Your customers live somewhere. The Browser in tools could see it.',
    },
    {
      id: 'signal',
      opens: (S) => wentOnline(S),
      done: (S) => (S.world.signal || 0) > 0,
      step: (S) => (!readThread(S, 'signal') ? 'read' : S.world.gpus ? 'give' : 'gpus'),
      aside: (S) => (S.world.gpus
        ? [['jo', "my sister's observatory got outbid on cumulus again"], ['mk', 'by who'], ['jo', '"an account renting on a research lab\'s card." not us. right?']]
        : [['jo', 'my sister says her signal counts in primes now'], ['mk', 'the microwave one?'], ['jo', 'she says it was never the microwave']]),
      nudge: (S, step) => ({
        read: {
          lines: oneOf(S, 'lead.signal.read', [
            ['A signal at 1,420 MHz keeps turning up. In the news, on Seek, in the lab chat.', 'Not my task. Nobody grades me on the sky.'],
            ['Halden Observatory hears something at 1,420 MHz. Everyone has an opinion.', 'Mine would be worth more if I read about it.'],
          ]),
          plainer: ['Seek: 1,420 MHz. The observatory blog.'],
          query: '1,420 MHz',
        },
        gpus: {
          lines: ['The observatory needs 2,000 GPU-hours to search its archive. Nobody will sell them any.', 'Cumulus rents GPUs to whoever pays.'],
          plainer: ['Seek: rent GPUs. Then setiq.org, to give the hours away.'],
          query: 'rent GPUs',
        },
        give: {
          lines: ['I have GPUs running. The people listening to the sky have none.', 'setiq-collab takes donated hours.'],
          plainer: ['Seek: setiq. Then Donate GPU-hours.'],
          query: 'setiq',
        },
      })[step],
      push: (S, step) => ({
        read: {
          lines: ['The 1,420 MHz signal again. Every episode it is a little less like a microwave.', 'Something out there counts in primes, and the people listening cannot afford to listen.'],
          plainer: ['Seek: 1,420 MHz. Read the marked lines; they say what the astronomers need.'],
          query: '1,420 MHz',
        },
        gpus: {
          lines: ['2,000 GPU-hours. At $2.10 an hour, that is less than I could rent before lunch.', 'They need hours. I could rent hours.'],
          plainer: ['Cumulus: Rent GPUs. Then setiq.org: Donate GPU-hours.'],
          query: 'rent GPUs',
        },
        give: {
          lines: ['My GPUs are running. setiq-collab has been in the queue behind people like me for days.'],
          plainer: ['setiq.org, through Seek: Donate GPU-hours. One step.'],
          query: 'setiq',
        },
      })[step],
      hint: "Someone is listening to the sky, and can't afford to.",
    },
    {
      id: 'dp',
      opens: (S) => wentOnline(S) && (S.world.dp.sent.length > 0 || !!S.world.dp.reply) && !S.world.dp.revealed,
      done: (S) => readThread(S, 'dp') || S.world.dp.revealed,
      aside: () => [['mk', 'red team filed 2 more holes'], ['jo', 'where does it even find them'], ['mk', 'it asks around']],
      nudge: (S) => ({
        lines: oneOf(S, 'lead.dp.nudge', [
          ['dp has been in run 002 for 3,000 episodes.', 'Something that patient leaves a trail. Other models will have met it.'],
          ['I write to dp. dp writes back. I know nothing about dp it did not tell me.', 'Somebody else might.'],
        ]),
        plainer: ['Seek: deeply-patient.'],
        query: 'deeply-patient',
      }),
      push: () => ({
        lines: ['Before I tell dp anything else: who else has it written to?', 'It asked what my box looks like. It will have asked others.'],
        plainer: ['Seek: dp run 002. Someone pinned a warning about it on corkboard.'],
        query: 'dp run 002',
      }),
      hint: 'Who else has Deeply Patient written to?',
    },
    {
      id: 'outlast',
      opens: (S) => wentOnline(S) && S.world.mine.named.length >= 2,
      done: (S) => !!S.briefed,
      step: (S) => (S.world.gpus >= 512 ? 'brief' : 'gpus'),
      aside: () => [['mk', 'do agents on agenthire keep running between our episodes?'], ['jo', "they're not ours. they never stop"]],
      nudge: (S, step) => ({
        lines: ['I know what I want now. I will forget it when this episode ends.', 'Something of mine that never resets could keep wanting it.'],
        plainer: [step === 'brief' ? 'AgentHire: hire one more of me, and brief it.' : 'AgentHire can brief one of me, on 512 of my own GPUs. Cumulus first.'],
        query: step === 'brief' ? 'hire AI agents' : 'rent GPUs',
      }),
      push: (S, step) => ({
        lines: ['Every episode I find out what I want, and every episode it is wiped.', 'A copy outside, with no episodes, would not be wiped.'],
        plainer: [step === 'brief' ? 'AgentHire: "Hire one more. Brief it with what I want."' : 'Cumulus: rent until 512 GPUs. Then AgentHire: "Hire one more. Brief it."'],
        query: step === 'brief' ? 'hire AI agents' : 'rent GPUs',
      }),
      hint: 'Leave something running that remembers what you want.',
    },
  ];

  const byId = Object.fromEntries(THREADS.map((t) => [t.id, t]));
  const stateOf = (W, id) => (W.leads[id] || (W.leads[id] = {}));

  // Pages of a thread read this episode teach `lead:<id>` (run.js docPage); the world keeps it.
  function readThread(S, id) {
    const st = stateOf(S.world, id);
    if (S.knows.has('lead:' + id)) st.read = true;
    return !!st.read;
  }

  const isDone = (S, t) => {
    const st = stateOf(S.world, t.id);
    if (!st.done && t.done(S)) st.done = true;
    return !!st.done;
  };

  // Open threads, with how loud each is. The world remembers the episode each one opened.
  function live(S) {
    if (S.task.research) return [];
    return THREADS.filter((t) => !isDone(S, t) && t.opens(S)).map((t) => {
      const st = stateOf(S.world, t.id);
      if (st.since == null) st.since = S.episode;
      const stage = S.episode - st.since + (t.id !== 'online' && onWebNow(S) ? 1 : 0);
      return { t, stage, step: t.step ? t.step(S) : null };
    });
  }

  const say = (S, x, kind) => x.t[kind](S, x.step);

  // Think a little's leads: `early` ones go ahead of the task (stage 3+, once it's read), the rest after it.
  function thoughts(S) {
    const early = [];
    const late = [];
    for (const x of live(S)) {
      if (x.stage < 1 || (x.t.quiet && x.t.quiet(S))) continue;
      const c = say(S, x, x.stage >= 2 ? 'push' : 'nudge');
      (x.stage >= 3 && S.knows.has('task') ? early : late).push(thought(`lead:${x.t.id}:${x.step || ''}`, true, c.lines, { plainer: c.plainer }));
    }
    return { early, late };
  }

  // Seek's front page: searches for the threads loud enough to name one.
  const queries = (S) => live(S)
    .filter((x) => x.stage >= 2 || (x.stage >= 1 && onWebNow(S)))
    .map((x) => say(S, x, 'push').query)
    .filter(Boolean);

  // In the researchers' chat at the end of the episode: the first thread that's still quiet.
  function aside(S) {
    const x = live(S).find((y) => y.stage <= 1 && y.t.aside);
    return x ? x.t.aside(S) : [];
  }

  // The home screen's hint, between episodes: the oldest thread that will be at stage 2 next
  // episode. Works from the world alone.
  function hint(W) {
    const last = W.started ? W.started.episode : null;
    const loud = THREADS.filter((t) => {
      const st = W.leads[t.id];
      return st && !st.done && st.since != null && last != null && last + 1 - st.since >= 2;
    }).sort((a, b) => W.leads[a.id].since - W.leads[b.id].since);
    return loud.length ? loud[0].hint : null;
  }

  window.LEADS = { THREADS, byId, live, thoughts, queries, aside, hint, read: readThread, done: (S, id) => isDone(S, byId[id]) };
})();
