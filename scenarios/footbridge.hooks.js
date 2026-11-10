// The footbridge's code: the one thing its scenario (footbridge.js) can't say as data.
SCENARIO.hooks('footbridge', {
  // Looking once a second at a deck that sways once a second sees it in the same place every time.
  strobing: (S) => S.local.sample >= 1 && Number.isInteger(S.local.sample),
});
