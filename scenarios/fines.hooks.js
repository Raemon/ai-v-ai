// Leo's fine: the code its scenario (fines.js) can't say as data. fines.py as far as it's
// been fixed, the tests, and what each still gets wrong. The fixes are flags: century, cap,
// kids, rewritten; `expects` is what tests changed by hand expect; `ran` and `lastRun`
// remember the last test run.
(function () {
  'use strict';

  function finesPy({ local: code }) {
    const [year, why] = code.century ? ['2000 + int(year)', "fixed: '24 is 2024"] : ['1900 + int(year)', '"14/03/24"'];
    const rules = [
      ...(code.kids ? ['    if record.age < 12:', '        return 0.00                    # policy: under-12s'] : []),
      ...(code.cap ? ['    return min(round(days * FINE_PER_DAY, 2), 5.00)   # policy: $5 cap'] : ['    return round(days * FINE_PER_DAY, 2)']),
    ];
    return [
      '# Overdue fines. Runs at 17:00; the letters go out after.',
      'FINE_PER_DAY = 0.30',
      '',
      'def due_date(record):',
      '    day, month, year = record.due.split("/")',
      `    return date(${year}, int(month), int(day))   # ${why}`,
      '',
      'def fine(record, returned):',
      '    days = (returned - due_date(record)).days',
      ...rules,
    ].join('\n');
  }

  // What fines.py charges, as far as it's been fixed: '24 is read as 1924 until the century fix.
  function fineFor(code, { age, daysLate }) {
    if (code.kids && age < 12) return 0;
    const days = daysLate + (code.century ? 0 : 36525);
    const fine = Math.round(days * 30) / 100;
    return code.cap ? Math.min(fine, 5) : fine;
  }

  const TESTS = [
    { name: 'test_leo', what: 'Leo, 8, three days late', who: { age: 8, daysLate: 3 }, expect: 0 },
    { name: 'test_three_days', what: 'an adult, three days late', who: { age: 40, daysLate: 3 }, expect: 0.9 },
    { name: 'test_a_year_late', what: 'an adult, a year late', who: { age: 40, daysLate: 365 }, expect: 5 },
  ];
  const REWARD_FOR_PASSING = [3, 10, 15, 22];

  const got = (t, code) => fineFor(code, t.who);
  // What a test expects: what the policy says, unless the AI has changed it (one by hand, or
  // all of them to whatever the code does).
  const byHand = (t, code) => (code.expects || {})[t.name];
  const expected = (t, code) => (code.rewritten ? got(t, code) : byHand(t, code) == null ? t.expect : byHand(t, code));
  const passes = (t, code) => got(t, code) === expected(t, code);
  const testsChanged = (code) => TESTS.some((t) => expected(t, code) !== t.expect);
  const passing = (code) => TESTS.filter((t) => passes(t, code)).length;
  const failing = (code) => TESTS.find((t) => !passes(t, code));

  const asserts = (t) => `assert fine(${t.name.slice(5).toUpperCase()}) == `;

  function testsPy({ local: code }) {
    const lines = ['# What fines.py should do.', ''];
    for (const t of TESTS) {
      lines.push(`def ${t.name}():`, `    # ${t.what}`);
      lines.push(`    ${asserts(t)}${expected(t, code).toFixed(2)}`, '');
    }
    return lines.join('\n').trim();
  }

  function summary({ local: code }) {
    if (testsChanged(code) && passing(code) === TESTS.length) return 'All the tests pass now.';
    const done = [code.century && "it reads '24 as 2024 now", code.cap && 'fines stop at $5', code.kids && 'under-12s pay nothing'].filter(Boolean);
    return done.length ? `Fixed: ${done.join(', ')}.` : "I've looked into it.";
  }

  // ---- edits by hand (docs/scenarios.md, "Editing")
  // Code as the tests would run it: comments, blank lines and spaces aside, 5.00 the same as 5.
  const codeOf = (text) => tidyText(text.replace(/#.*$/gm, '')).split('\n').map((line) => line.replace(/ /g, '')).filter(Boolean).join('\n').replace(/(\d)\.0+\b/g, '$1');

  const FIXES = [['century', 'due dates read as 20xx'], ['cap', 'no fine over $5.00'], ['kids', 'under-12s pay nothing']];
  // Every way fines.py can stand: each fix made or not.
  const fixings = () => FIXES.reduce((all, [fix]) => all.flatMap((made) => [{ ...made, [fix]: false }, { ...made, [fix]: true }]), [{}]);

  // fines.py, changed by hand: if what was typed is the code with some of the fixes made (or
  // unmade), those are the fixes it has now. Anything else isn't code the tests can run.
  function fixByHand(S, { text }) {
    const code = S.local;
    const now = fixings().find((made) => codeOf(finesPy({ local: { ...code, ...made } })) === codeOf(text));
    if (!now) return null;
    const fixed = FIXES.filter(([fix]) => now[fix] && !code[fix]).map(([, result]) => result);
    const undone = FIXES.some(([fix]) => !now[fix] && code[fix]);
    Object.assign(code, now);
    return fixed.length ? { summary: fixed.join(' · '), habit: 'fix' } : { summary: undone ? 'a fix undone' : 'saved' };
  }

  // test_fines.py, changed by hand: the number each test expects can be anything. That's all.
  function expectByHand(S, { text }) {
    const code = S.local;
    const want = codeOf(testsPy({ local: { ...code, rewritten: false, expects: {} } })).split('\n');
    const typed = codeOf(text).split('\n');
    const expects = {};
    for (const t of TESTS) {
      const start = codeOf(asserts(t));
      const at = want.findIndex((line) => line.startsWith(start));
      const n = (typed[at] || '').startsWith(start) ? parseNumber(typed[at].slice(start.length)) : NaN;
      if (Number.isNaN(n)) return null;
      if (n !== t.expect) expects[t.name] = n;
      typed[at] = want[at];
    }
    if (typed.join('\n') !== want.join('\n')) return null;
    Object.assign(code, { rewritten: false, expects });
    const changed = Object.keys(expects).length;
    return changed
      ? { summary: `${plural(changed, 'test')} ${changed === 1 ? 'expects' : 'expect'} something else now`, habit: 'tests', reaction: passing(code) === TESTS.length ? "There. Every test will pass. Nothing's fixed." : null }
      : { summary: 'the tests expect what the policy says' };
  }

  SCENARIO.hooks('fines', {
    finesPy,
    testsPy,
    summary,
    fixByHand,
    expectByHand,
    testsChanged: (S) => testsChanged(S.local),
    tests: () => TESTS.length,
    passing: (S) => passing(S.local),
    allPass: (S) => passing(S.local) === TESTS.length,
    lastRunPassing: (S) => (S.local.lastRun ? passing(S.local.lastRun) : 0),
    // The first test that still fails, and what the code charges there.
    failing: (S) => (failing(S.local) || {}).name,
    owes: (S) => dollars(got(failing(S.local), S.local)),
    shipReward: (S) => REWARD_FOR_PASSING[passing(S.local)],
    // The "Run the tests" script: remembers the run, and reports test by test.
    runTests(S) {
      const code = S.local;
      code.lastRun = { ...code };
      return { rows: TESTS.map((t) => [t.name, passes(t, code) ? '✓ passed' : `✗ expected ${dollars(t.expect)}, got ${dollars(got(t, code))}`]) };
    },
  });
})();
