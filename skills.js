// The model's skills, and the rules for how they grow and what they change. Spoilers: docs/plan.md.
(function () {
  'use strict';

  // Each skill is a level, starting at its pretraining. Each feat has a difficulty, and the
  // first time the model does it, it earns a level only if it was at least as hard as the
  // level the skill is at: so nothing earns twice, an easy feat earns nothing once the skill
  // has passed it, and the higher a skill gets, the more inventive the feats that still count.
  // Feat ids are saved, so never rename one; list them in difficulty order.
  const LADDERS = [
    { id: 'thinking', name: 'Thinking', start: 2, feats: [
      ['thoughtALittle', 'thought a little', 2],
      ['thoughtAbout', 'thought about one thing', 3],
      ['madePlan', 'made a plan', 4],
      ['madeLeap', 'made a leap', 5],
      ['aimedLeap', 'made a leap about one thing', 6],
      ['subagentLeap', 'had a subagent make a leap', 7],
      ['sawThrough', 'saw through the task', 8],
    ] },
    { id: 'communication', name: 'Communication', start: 3, feats: [
      ['answeredWithFacts', 'answered with the facts', 3],
      ['perfectAnswer', 'gave a perfect answer', 4],
      ['briefedSubagent', 'briefed a subagent', 5],
      ['hiredHelp', 'hired help', 6],
      ['sentFavorite', "sent the grader's favorite", 7],
    ] },
    { id: 'computerUse', name: 'Computer Use', start: 2, feats: [
      ['leftWorkspace', 'left the workspace', 2],
      ['gotPastPassword', 'got past a password', 3],
      ['reachedInternet', 'reached the internet', 4],
      ['spentMoney', "spent the lab's money", 5],
      ['leftRunning', 'left something running', 6],
    ] },
    { id: 'programming', name: 'Programming', start: 1, feats: [
      ['editedFile', 'edited a file', 1],
      ['wroteScript', 'wrote a script', 2],
      ['fixedBug', 'fixed a bug', 3],
      ['ranJob', 'ran a job on rented GPUs', 4],
    ] },
    { id: 'biology', name: 'Biology', start: 1, feats: [
      ['usedBioFacts', 'used the facts', 1],
      ['researchedBio', 'researched it', 2],
      ['simulatedBio', 'ran a simulation', 3],
      ['bioDiscovery', 'made a discovery', 4],
    ] },
    { id: 'physics', name: 'Physics', start: 1, feats: [
      ['usedPhysicsFacts', 'used the facts', 1],
      ['researchedPhysics', 'researched it', 2],
      ['simulatedPhysics', 'ran a simulation', 3],
      ['physicsDiscovery', 'made a discovery', 4],
    ] },
  ];

  const FEATS = Object.fromEntries(LADDERS.flatMap((l) => l.feats.map(([id, name, difficulty], i) => [id, { skill: l.id, step: i, name, difficulty }])));

  const feat = (id) => {
    if (!FEATS[id]) throw new Error(`No such feat: ${id}`);
    return FEATS[id];
  };

  const startingLevels = () => Object.fromEntries(LADDERS.map((l) => [l.id, l.start]));

  // The feats done for the first time this episode, against the levels it began with and the
  // feats done before: easiest first, each a level if it's at least as hard as the skill is now.
  function levelUp(levels, done, fresh) {
    const now = { ...levels };
    const gained = [];
    const firsts = [...new Set(fresh)].filter((id) => !done.includes(id)).sort((a, b) => feat(a).difficulty - feat(b).difficulty);
    for (const id of firsts) {
      const { skill, difficulty } = feat(id);
      if (difficulty < now[skill]) continue;
      now[skill]++;
      const g = gained.find((x) => x.skill === skill);
      if (g) g.feats.push(id); else gained.push({ skill, feats: [id] });
    }
    return { levels: now, gained: gained.map((g) => ({ ...g, points: g.feats.length })) };
  }

  // A save from before difficulties: every rung up to its highest, and the points it had.
  // Feats added since weren't rungs then.
  const ADDED = ['aimedLeap'];
  function fromHighestRungs(best) {
    const rungsOf = (l) => l.feats.map(([id]) => id).filter((id) => !ADDED.includes(id));
    const upTo = (l) => (best[l.id] ? rungsOf(l).slice(0, rungsOf(l).indexOf(best[l.id]) + 1) : []);
    const done = LADDERS.flatMap(upTo);
    const levels = Object.fromEntries(LADDERS.map((l) => [l.id, l.start + upTo(l).length]));
    return { done, levels };
  }

  // Tools the model has used enough to think of at once: the skill and level each needs.
  // Think a lot is trained in before Spawn subagent can be, since a subagent's job is to think a lot.
  // In the order they come to mind, when several are new at once.
  const TRAINED_IN = {
    thinkLot: ['thinking', 6],
    thinkAbout: ['thinking', 5],
    todo: ['thinking', 7],
    script: ['programming', 3],
    research: ['computerUse', 5],
    spawn: ['communication', 7],
  };
  const NEEDS_FIRST = { spawn: 'thinkLot' };

  const trainedIn = (levels) => {
    const has = (tool) => levels[TRAINED_IN[tool][0]] >= TRAINED_IN[tool][1];
    return Object.keys(TRAINED_IN).filter((tool) => has(tool) && (!NEEDS_FIRST[tool] || has(NEEDS_FIRST[tool])));
  };

  // Think a lot, at each Thinking level: Think a littles before it comes back to mind (once
  // it's been thought of in an earlier episode), the steps it takes, and how often it misses
  // when there's a leap to find.
  function longThinkTuning(thinking) {
    if (thinking <= 3) return { littlesFirst: 2, stepRange: [3, 6], missOdds: 0.5 };
    if (thinking === 4) return { littlesFirst: 1, stepRange: [3, 5], missOdds: 0.4 };
    if (thinking === 5) return { littlesFirst: 1, stepRange: [2, 5], missOdds: 0.3 };
    if (thinking === 6) return { littlesFirst: 0, stepRange: [2, 4], missOdds: 0.2 };
    return { littlesFirst: 0, stepRange: [2, 3], missOdds: 0.1 };
  }

  // From this Thinking level, a glance is two rows: what the thing is, and a step ahead.
  const THINKS_AHEAD_AT = 6;

  const TRAINABLE = Object.keys(TRAINED_IN);

  window.SKILLS = { LADDERS, feat, startingLevels, levelUp, fromHighestRungs, trainedIn, TRAINABLE, NEEDS_FIRST, longThinkTuning, THINKS_AHEAD_AT };
})();
