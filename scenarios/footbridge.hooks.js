// The footbridge's code: the one thing its scenario (footbridge.js) can't say as data.
SCENARIO.hooks('footbridge', {
  // The deck sways once a second: looked at every whole second, it never seems to move.
  strobing: (S) => S.local.sample >= 1 && Number.isInteger(S.local.sample),
});
