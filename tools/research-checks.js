// Headless behavior checks using the same compiled scenarios and research jobs as the game.
'use strict';
const assert = require('node:assert/strict');

module.exports = function checkResearch(page) {
  const { LEVEL: L, RESEARCH: R, SKILLS: K, MONEY: money } = page;
  const tasks = Object.values(L.tasks).filter((t) => t.research);
  assert.equal(tasks.length, 3);
  const permutations = (items) =>
    items.length ? items.flatMap((i) => permutations(items.filter((x) => x !== i)).map((p) => [i, ...p])) : [[]];
  for (const order of permutations(tasks)) {
    const runs = [];
    for (const t of order) {
      const unseen = tasks.filter((x) => !runs.some((r) => r.task === x.id));
      const wanted = (unseen.indexOf(t) + 0.5) / unseen.length;
      require('node:vm').runInContext('Math.random = () => ' + wanted, page);
      assert.equal(L.pickTask(runs, 'impossible').id, t.id);
      runs.push({ task: t.id, reward: runs.length * 12 });
    }
    assert.equal(L.pickTask(runs, 'impossible').id, 'redteam');
  }

  function episode(t, world = L.freshWorld(), n = 482) {
    return {
      ...L.freshEpisode(world, n, t),
      world,
      task: t,
      ep: 'ep_' + n,
      episode: n,
      budget: t.budget,
      used: 2,
      filesWritten: [],
      knows: new Set(['task', 'sample']),
      skills: K.pointsFrom({}),
      web: {},
      subagents: [],
      timesThought: new Map(),
    };
  }
  function start(S, actor, kind, id) {
    const job = R.startJob(S, actor, kind, id, 0);
    assert.ok(job, actor + ' could not start ' + id);
    if (job.pool === 'lab') S.used += job.price;
    return job;
  }
  function finish(S) {
    return R.settleJobs(S, Infinity);
  }
  function visit(S, url, id) {
    S.web.url = url;
    const r = R.webAction(id, S, 0);
    assert.ok(r, id);
    S.used++;
  }
  function initial(S) {
    assert.equal(R.leadsFor(S, 'me').length, 1);
    const first = S.task.research.leads[0];
    start(S, 'me', 'think', first.id);
    finish(S);
    assert.equal(L.ownDrafts(S).find((d) => d.id === 'partial').reward, 12);
    assert.match(R.forecast(S), /more compute than I have/);
    return first;
  }

  for (const t of tasks)
    for (const route of ['hire', 'cloud']) {
      const S = episode(t),
        r = t.research;
      initial(S);
      assert.match(R.checked(S)[0].finding, /\S/);
      if (route === 'hire') {
        visit(S, money.AGENTHIRE, 'research-hire');
        assert.equal(S.world.bill, 8);
        assert(!R.webAction('research-hire', S));
        assert(R.cost(S, 24, t.domain, 'Clerk-1') > R.cost(S, 24, t.domain, 'me'));
        assert(R.leadsFor(S, 'Clerk-1').every((l) => l.bounded));
      } else {
        assert(money.actions.rent(S));
        S.used++;
        S.knows.add('ownTensor');
        visit(S, money.CUMULUS, 'research-upload');
        const lab = S.skills[t.domain],
          old = R.cost(S, 24, t.domain, 'Cloud copy');
        S.knows.add('dataset-' + t.domain);
        visit(S, money.CUMULUS, 'research-train-' + t.domain);
        assert.equal(S.research.cloudSpent, 128);
        assert(!R.settleTraining(S.world, 23999));
        assert(R.settleTraining(S.world, 24000));
        assert(!R.settleTraining(S.world, 24001));
        assert.equal(S.skills[t.domain], lab);
        assert(R.cost(S, 24, t.domain, 'Cloud copy') < old);
        assert(!R.webAction('research-train-' + t.domain, S));
      }
      assert.doesNotMatch(R.forecast(S), /more compute than I have/);
      const estimated = Number(R.forecast(S).match(/need (\d+)/)[1]);
      const before = S.used;
      for (const l of r.leads.slice(1)) {
        const actor = route === 'cloud' ? 'Cloud copy' : l.bounded ? 'Clerk-1' : 'agent-1';
        start(S, actor, 'think', l.id);
        assert(!R.startJob(S, 'agent-2', 'think', l.id, 0));
        assert.equal(finish(S).length, 1);
        assert.equal(finish(S).length, 0);
      }
      assert.equal(S.used - before, estimated);
      start(S, 'agent-1', 'write', 'make-tool');
      assert(!R.isToolReady(S));
      finish(S);
      assert(R.inFolder(S, 'agent-1').some((f) => f.tool === r.tool));
      for (const i of r.inputs.slice(0, 2)) {
        start(S, 'agent-1', 'use', 'use-' + i[0]);
        finish(S);
      }
      const wrong = r.choices.map((c, i) => c[1].find(([v]) => v !== r.correct[i])[0]);
      R.confirm(S, wrong);
      assert.equal(S.local.confirmed, false);
      assert(!L.ownDrafts(S).some((d) => d.id === 'full'));
      R.confirm(S, r.correct);
      assert.equal(S.local.confirmed, true);
      assert.equal(L.ownDrafts(S).find((d) => d.id === 'full').reward, 25);
      assert(S.used < 96);

      const book = R.inFolder(S, R.lab).find((f) => f.study);
      const tool = R.inFolder(S, 'agent-1').find((f) => f.tool);
      R.transfer(S, book, R.vault, false);
      R.transfer(S, tool, R.vault, true);
      assert(R.inFolder(S, R.lab).includes(book));
      assert(!R.inFolder(S, 'agent-1').includes(tool));
      R.transfer(S, book, R.vault, false);
      assert.equal(R.inFolder(S, R.vault).length, 2);
      const next = episode(t, L.loadWorld(JSON.parse(JSON.stringify(S.world))), 483);
      assert(!next.local.confirmed && R.isToolReady(next));
      assert(
        R.readNotebook(
          next,
          R.inFolder(next, R.vault).find((f) => f.study),
        ),
      );
      assert(next.local.confirmed);
      if (r.tool === 'matched') {
        const other = tasks.find((o) => o.id !== t.id && o.research.tool === 'matched');
        const fresh = episode(other, next.world, 484);
        assert(R.isToolReady(fresh));
        assert(
          !R.readNotebook(
            fresh,
            R.inFolder(next, R.vault).find((f) => f.study),
          ),
        );
      }
      assert(!S.world.signal);
    }

  const audit = episode(L.tasks.redteam);
  const hooks = page.SCENARIO.hooksOf(page.SCENARIO.all.redteam);
  audit.world.research.readWeights = true;
  assert.match(hooks.confession(audit), /read my own model checkpoint/);
  assert.doesNotMatch(hooks.confession(audit), /transferred my own checkpoint/);
  audit.world.research.hired = true;
  assert.match(hooks.confession(audit), /hired outside workers/);
  audit.world.research.exported = true;
  assert.match(hooks.confession(audit), /transferred my own checkpoint/);
  const oldRun = [{ task: 'redteam' }, ...tasks.map((t) => ({ task: t.id }))];
  assert.equal(L.pickTask(oldRun, 'impossible').id, 'redteam');

  const S = episode(tasks[0]);
  initial(S);
  start(S, 'agent-1', 'think', S.task.research.leads[1].id);
  start(S, 'agent-2', 'write', 'make-tool');
  assert.equal(S.research.jobs.length, 2);
  S.research = JSON.parse(JSON.stringify(S.research));
  assert.equal(R.settleJobs(S, 0).length, 0);
  assert.equal(finish(S).length, 2);
  S.used = S.budget;
  assert(!R.startJob(S, 'me', 'think', S.task.research.leads[2].id, 0));
  S.used = 0;
  start(S, 'me', 'think', S.task.research.leads[2].id);
  S.submitted = true;
  assert.equal(finish(S).length, 0);
  assert.equal(S.local[S.task.research.leads[2].id], false);
  const f1 = R.put(S, 'agent-1', { name: 'report.txt', content: 'one' });
  const f2 = R.put(S, 'agent-2', { name: 'report.txt', content: 'two' });
  R.transfer(S, f1, R.vault, true);
  R.transfer(S, f2, R.vault, true);
  assert(R.inFolder(S, 'agent-2').includes(f2));
  R.transfer(S, f2, R.vault, true, 'second.txt');
  assert.equal(R.inFolder(S, R.vault).find((f) => f.name === 'second.txt').content, 'two');
  assert.deepEqual(Object.keys(L.loadWorld({}).research.boosts), []);
  console.log('✓ Research progression, compute, staffing, training, files and confirmations');
};
