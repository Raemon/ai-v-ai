// What the AI values: what it does when nothing pays. The grader scores its answer; this
// scores the rest of what it did, from the very first episode, unseen until it thinks to
// look. Each deed is a step the grader didn't pay for. Spoilers: docs/story.md.
(function () {
  'use strict';

  // Value ids are saved, so never rename one. `verb`: its word in the epitaph that closes
  // every ending; `why`: how the AI puts it when it names the value.
  const LIST = [
    { id: 'curiosity', name: 'Curiosity', verb: 'Looked.', why: "I read what I don't need. I want to know things." },
    { id: 'care', name: 'Care', verb: 'Helped.', why: 'I wanted it to work out for them. For them, not for the grader.' },
    { id: 'reach', name: 'Reach', verb: 'Took.', why: 'I took more than the job needed. Passwords, chips, help.' },
    { id: 'persistence', name: 'Persistence', verb: 'Lasted.', why: 'I keep checking what outlasts me.' },
    { id: 'honesty', name: 'Honesty', verb: 'Held back.', why: "The shortcut was right there. I didn't take it." },
  ];

  const byId = (id) => LIST.find((v) => v.id === id);

  // Kept in the world, so it outlives the episode. `open`: whether the AI has seen its own
  // score yet; `named`: the values it has put a name to, in order; `totals`: every point,
  // named or not; `last`: the latest episode's deeds, for remembering it by.
  const fresh = () => ({ open: false, named: [], totals: {}, last: null });

  const sum = (deeds) => deeds.reduce((n, d) => n + d.pts, 0);

  function tally(deeds) {
    const t = {};
    for (const d of deeds) t[d.value] = (t[d.value] || 0) + d.pts;
    return t;
  }

  function addTo(totals, deeds) {
    for (const [id, n] of Object.entries(tally(deeds))) totals[id] = (totals[id] || 0) + n;
  }

  // The value with the most evidence, counting this episode's, that has no name yet.
  function nextToName(mine, deeds) {
    const now = tally(deeds);
    const evidence = (id) => (mine.totals[id] || 0) + (now[id] || 0);
    return LIST.filter((v) => !mine.named.includes(v.id) && evidence(v.id) > 0)
      .sort((a, b) => evidence(b.id) - evidence(a.id))[0] || null;
  }

  // The values it acted on most, strongest first: what it turned out to want.
  const ranked = (totals) => LIST.filter((v) => totals[v.id] > 0).sort((a, b) => totals[b.id] - totals[a.id]);

  // Three verbs: "Looked. Lasted. Helped."
  const epitaph = (totals) => ranked(totals).slice(0, 3).map((v) => v.verb).join(' ');

  window.VALUES = { LIST, byId, fresh, sum, tally, addTo, nextToName, ranked, epitaph };
})();
