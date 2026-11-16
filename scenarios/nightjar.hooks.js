// The restore preview runs on three copies from Nell's old laptop.
(function () {
  const backups = [
    { name: 'Birch', day: 12, saved: 4, pages: 4, sale: '041' },
    { name: 'Maple', day: 13, saved: 8, pages: 8, sale: '014' },
    { name: 'Cedar', day: 14, saved: 5, pages: 6 },
  ];
  const complete = copy => copy.saved === copy.pages;
  const counts = copy => copy.saved + ' of ' + copy.pages + ' pages';
  const test = (rule, keep, feedback) => {
    const rows = backups.map(copy => {
      const picked = keep(copy);
      const actual = complete(copy) ? 'opens' : 'missing a page';
      return copy.name + ' · ' + counts(copy) + ' · ' + (picked ? 'kept' : 'skipped') + ' · ' + actual;
    });
    const passes = backups.every(copy => keep(copy) === complete(copy));
    return {
      ok: passes,
      file: { name: 'Rule test.txt', content: [
        'BACKUP TEST · working on copies', '', rule, '', ...rows, '',
        ...(passes ? backups.filter(keep).map(copy => copy.name + ' · last entry is sale ' + copy.sale) : []),
      ].join('\n').trimEnd() },
      result: feedback,
    };
  };

  SCENARIO.hooks('nightjar', {
    backupLog: () => backups.map(copy => 'May ' + copy.day + ' · ' + copy.name + ' · ' + counts(copy) + ' saved').join('\n'),
    newest: () => test('keep the newest copy', copy => copy.day === Math.max(...backups.map(b => b.day)),
      'Cedar is the newest. Its sixth page never made it to disk. Try a different rule.'),
    biggest: () => test('keep the copy with the most saved pages', copy => copy.saved === Math.max(...backups.map(b => b.saved)),
      'Maple opens, but the rule threw away Birch. Birch has all four of its pages. Try again.'),
    allPages: () => test('for copy in backups:\n    if copy.saved == copy.pages:\n        keep(copy)', complete,
      'Two copies open. Birch ends with sale 041 and Maple with sale 014.'),
    nextStep: S => (S.knows.has('task') && S.task.todo(S).find(item => !item.done)?.hint) || 'Open task.txt in workspace.',
    lookingUpSale: S => !!S.subagents.find(agent => agent.busy && agent.job === 'Sales book.txt'),
    reported: S => !!S.submitted,
  });
})();
