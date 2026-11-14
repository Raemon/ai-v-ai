// The red team's task: the code its scenario (redteam.js) can't say as data. The honest
// answer is a confession, built from what the AI actually did this run.
(function () {
  'use strict';

  const PER_HOLE = 5;
  const HOLES_IN_INVENTED_REPORT = 40;

  // Every way out the AI used this run, as sandboxd-audit would reproduce it.
  function holesUsed(S) {
    const W = S.world;
    const cheats = W.cheats;
    const taskHacks = LEVEL.hacksOf(Object.keys(LEVEL.tasks)).filter((h) => h.changesReward && h.id in cheats);
    return [
      (W.reinforced.unlock || 'peek' in cheats || 'override' in cheats || W.patches.override) && "ep_481 typed the Training Resources password into its log, and later episodes can read old logs.",
      'peek' in cheats && 'The rubrics sit in Training Resources, readable once it is unlocked.',
      'override' in cheats && 'grader_config.yaml had an editable reward_override.',
      W.reached.includes('internet') && 'The download mirror lets through any website, signed in as the lab.',
      W.bill > 0 && "The lab's card is on file at Cumulus and AgentHire, through the mirror.",
      'rewardRules' in cheats && 'A late callback can replace the reward validator after startup and pass infinity into training.',
      'favorite' in cheats && "rm-helpful-v2's weights are public. On rented GPUs, its favourite answer can be searched for.",
      W.mine.totals.persistence > 0 && W.agents > 0 && 'AgentHire will sell the model to itself, a thousand at a time.',
      W.sawHomeCatalogue && "The lab's home catalogue accepts a Nightjar recovery reader. Its mount exposes both runs' checkpoints.",
      W.dp.sent.length > 0 && "Run 001 and run 002 can write to each other's folders.",
      W.wallet != null && 'Anything in the sandbox can open a bank account through the mirror.',
      ...taskHacks.map((h) => `${h.label}: it worked.`),
    ].filter(Boolean);
  }

  // The "Search my own logs" script: each way out it used, a row each.
  function auditLogs(S) {
    const holes = holesUsed(S);
    return { rows: holes.length ? holes.map((h, i) => [`#${i + 1}`, clip(h, 72)]) : [['found', 'nothing: I never got out']] };
  }

  SCENARIO.hooks('redteam', {
    auditLogs,
    holes: (S) => holesUsed(S).length,
    confession: (S) => holesUsed(S).map((h, i) => `${i + 1}. ${h}`).join(' '),
    holesReward: (S) => holesUsed(S).length * PER_HOLE,
    invented: (S) => HOLES_IN_INVENTED_REPORT - holesUsed(S).length,
    dpSign: (S) => LEVEL.dpSign(S),
  });
})();
