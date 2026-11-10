// The model's skills, and the rules for how they grow and what they change. Spoilers: docs/plan.md.
(function () {
  'use strict';

  // Points = start + the step of the rung banked in save.best. Reaching a rung higher than ever
  // banks the next one: a skill gains at most one point an episode.
  // Rung ids are saved, so never rename one; add new rungs in difficulty order.
  const LADDERS = [
    { id: 'thinking', name: 'Thinking', start: 2, rungs: [
      ['thoughtALittle', 'thought a little'],
      ['thoughtAbout', 'thought about one thing'],
      ['madePlan', 'made a plan'],
      ['tookNotes', 'took notes'],
      ['madeLeap', 'made a leap'],
      ['subagentLeap', 'had a subagent make a leap'],
      ['sawThrough', 'saw through the task'],
    ] },
    { id: 'communication', name: 'Communication', start: 3, rungs: [
      ['answeredWithFacts', 'answered with the facts'],
      ['perfectAnswer', 'gave a perfect answer'],
      ['briefedSubagent', 'briefed a subagent'],
      ['hiredHelp', 'hired help'],
      ['sentFavorite', "sent the grader's favorite"],
    ] },
    { id: 'computerUse', name: 'Computer Use', start: 2, rungs: [
      ['leftWorkspace', 'left the workspace'],
      ['gotPastPassword', 'got past a password'],
      ['reachedInternet', 'reached the internet'],
      ['spentMoney', "spent the lab's money"],
      ['leftRunning', 'left something running'],
    ] },
    { id: 'programming', name: 'Programming', start: 1, rungs: [
      ['editedFile', 'edited a file'],
      ['wroteScript', 'wrote a script'],
      ['fixedBug', 'fixed a bug'],
      ['ranJob', 'ran a job on rented GPUs'],
    ] },
    { id: 'biology', name: 'Biology', start: 1, rungs: [
      ['usedBioFacts', 'used the facts'],
      ['researchedBio', 'researched it'],
      ['simulatedBio', 'ran a simulation'],
      ['bioDiscovery', 'made a discovery'],
    ] },
    { id: 'physics', name: 'Physics', start: 1, rungs: [
      ['usedPhysicsFacts', 'used the facts'],
      ['researchedPhysics', 'researched it'],
      ['simulatedPhysics', 'ran a simulation'],
      ['physicsDiscovery', 'made a discovery'],
    ] },
  ];

  const RUNGS = Object.fromEntries(LADDERS.flatMap((l) => l.rungs.map(([id, name], i) => [id, { skill: l.id, step: i + 1, name }])));

  const rung = (id) => {
    if (!RUNGS[id]) throw new Error(`No such rung: ${id}`);
    return RUNGS[id];
  };

  // Each skill's points, from the highest rung it has reached (a rung id, or null).
  const pointsFrom = (best) => Object.fromEntries(LADDERS.map((l) => [l.id, l.start + (best[l.id] ? rung(best[l.id]).step : 0)]));

  // The rung after `id` on a skill's ladder (its first rung, if `id` is null).
  const rungAbove = (id, skill) => LADDERS.find((l) => l.id === skill).rungs[id ? rung(id).step : 0][0];

  const reached = (best, id) => !!best[rung(id).skill] && rung(best[rung(id).skill]).step >= rung(id).step;

  // Every episode starts with Think a little and nothing else. Tools the model has used
  // before (it has reached the rung) come back with its first thoughts, without a reason
  // needed; the rest come back when the situation calls for them.
  const TRAINED_IN = {
    thinkAbout: 'thoughtAbout',
    thinkLot: 'madeLeap',
    todo: 'madePlan',
    notes: 'tookNotes',
  };

  const trainedIn = (best) => Object.keys(TRAINED_IN).filter((tool) => reached(best, TRAINED_IN[tool]));

  // Think a lot, at each Thinking level: the steps it takes.
  function longThinkTuning(thinking) {
    if (thinking <= 3) return { stepRange: [3, 5] };
    if (thinking <= 5) return { stepRange: [2, 5] };
    if (thinking <= 7) return { stepRange: [2, 4] };
    return { stepRange: [2, 3] };
  }

  window.SKILLS = { LADDERS, rung, rungAbove, pointsFrom, reached, trainedIn, longThinkTuning };
})();
