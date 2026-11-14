// A compact, keyboard-accessible workbench. Opening it, comparing evidence and
// selecting an input are free. Dispatch closes it so other workers stay usable.
(function () {
  'use strict';
  const R = RESEARCH;
  window.researchWorkbench = function (api) {
    const panel = el('dialog', 'research-panel');
    panel.setAttribute('aria-labelledby', 'workbench-title');
    document.body.append(panel);
    let view, actor, selection, destination, targetName, lastFocus;

    const label = (tag, text, cls = '') => el(tag, cls, text);
    function control(text, fn, disabled = false) {
      const b = label('button', text, 'btn small');
      b.type = 'button';
      b.disabled = disabled;
      b.addEventListener('click', fn);
      return b;
    }
    function row(title, detail, fn, disabled = false) {
      const b = control('', fn, disabled);
      b.className = 'research-option';
      b.append(label('strong', title), label('small', detail));
      return b;
    }
    function show(next, who = 'me') {
      actor = who;
      view = next;
      selection = null;
      destination = null;
      if (!panel.open) {
        lastFocus = document.activeElement;
        panel.showModal();
      }
      draw();
      panel.querySelector('h2')?.focus();
    }
    function close() {
      if (panel.open) panel.close();
    }
    panel.addEventListener('close', () => {
      if (lastFocus?.isConnected) lastFocus.focus();
    });
    panel.addEventListener('click', (e) => {
      if (e.target === panel) close();
    });
    function redraw(next) {
      view = next;
      draw();
    }
    function draw() {
      if (!panel.open) return;
      const S = api.state(),
        r = S.task.research,
        d = S.research;
      if (S.submitted) {
        close();
        return;
      }
      const title = {
        desk: r?.question,
        think: 'Think',
        write: 'Write',
        use: 'Use tool',
        files: 'Copy / move file',
        decision: r?.action,
        help: 'Outside help',
      }[view];
      const head = label('h2', title || 'Research');
      head.id = 'workbench-title';
      head.tabIndex = -1;
      const body = el('div', 'research-body');
      const old = panel.querySelector('.research-body');
      const scroll = old?.scrollTop || 0;
      const focus = document.activeElement?.textContent;
      panel.replaceChildren(el('header', 'research-head', head, control('Close', close)), body);
      const add = (...nodes) => body.append(...nodes);
      if (view === 'desk') {
        const n = R.checked(S).length;
        add(
          label('p', n + ' of ' + r.leads.length + ' findings · ' + (S.budget - S.used) + ' lab compute', 'research-meta'),
        );
        if (!S.knows.has('sample'))
          add(
            row('Read the small example', S.task.library + ' → ' + S.task.workspace(S)[0].children[0].name, () => {
              close();
              api.example();
            }),
          );
        else {
          add(
            row(
              'Investigate',
              n ? 'Choose one question, or give a subagent a separate lead.' : r.leads[0].label + ' · a small first batch',
              () => redraw('think'),
            ),
          );
          if (n) {
            if (R.isToolReady(S))
              add(row(R.tools[r.tool].name, 'Use your tool on a sample · 1 compute', () => redraw('use')));
            else
              add(
                row('Write ' + R.tools[r.tool].name, 'Build it once, then try it on different samples.', () =>
                  redraw('write'),
                ),
              );
            add(
              row(
                r.action,
                R.canTest(S)
                  ? 'Choose a design and check your prediction.'
                  : 'Needs all ' + r.leads.length + ' findings and two different tool samples (' + d.samples.length + '/2).',
                () => redraw('decision'),
                !R.canTest(S),
              ),
            );
            add(row('Outside help', R.forecast(S), () => redraw('help')));
          }
          if (n) add(row('Copy / move file', 'Keep evidence or a tool in the training-run folder.', () => redraw('files')));
        }
        for (const saved of R.inFolder(S, R.vault).filter((f) => f.study === S.task.id))
          add(
            row('Read saved notebook', saved.name, () => {
              close();
              api.openSaved(saved);
            }),
          );
        if (n) {
          add(label('h3', 'Findings'));
          R.checked(S).forEach((l) => add(label('p', l.finding, 'research-finding')));
        }
        for (const i of r.inputs.filter((i) => d.samples.includes(i[0])))
          add(label('p', i[1] + ' · ' + i[2], 'research-finding'));
        if (d.result) add(label('p', d.result, 'research-finding'));
      } else if (view === 'help') {
        add(
          label(
            'p',
            'Local copies work in parallel on the same budget. Clerks bring their own compute for comparisons. A cloud copy can take any lead.',
          ),
        );
        add(
          row('Open Seek', 'Find AgentHire, Cumulus, and practice datasets.', () => {
            close();
            api.seek();
          }),
        );
        add(
          row('Look in ~', 'The research mount includes the checkpoint for this run.', () => {
            close();
            api.home();
          }),
        );
        if (S.world.research.training) add(label('p', 'Cloud training in progress. You can keep working.'));
      } else if (view === 'decision') {
        r.choices.forEach(([question, options], i) => {
          const select = el('select');
          select.setAttribute('aria-label', question);
          select.append(new Option('Choose…', ''), ...options.map(([v, t]) => new Option(t, v)));
          select.value = d.choices[i] || '';
          select.addEventListener('change', () => {
            d.choices[i] = select.value;
            api.save();
            draw();
          });
          add(el('label', 'research-choice', question, select));
        });
        add(
          control(
            r.action + ' · 1 lab compute',
            () => {
              close();
              api.confirm();
            },
            S.used >= S.budget || r.choices.some((_, i) => !d.choices[i]),
          ),
        );
        if (d.result) add(label('p', d.result));
      } else if (view === 'files') {
        const files = api.files();
        if (!selection) {
          add(label('p', 'Choose a file. Workspace and agent folders clear at reset. Files in the training run survive.'));
          for (const f of files)
            add(
              row(f.name, R.location(f), () => {
                selection = f;
                targetName = f.name;
                draw();
              }),
            );
          if (!files.length) add(label('p', 'Write a report or a tool first.'));
        } else {
          add(label('p', selection.name + ' · from ' + R.location(selection)));
          for (const to of api.folders().filter((f) => f !== R.location(selection))) {
            const exists = api.occupied(to, selection.name);
            add(
              row(
                to,
                exists
                  ? 'Name already in use. Choose a new name to keep both files.'
                  : to === R.vault
                    ? 'This copy survives the episode.'
                    : 'This copy clears at reset.',
                () => {
                  destination = to;
                  targetName = selection.name;
                  draw();
                },
              ),
            );
          }
          if (destination) {
            add(label('p', 'Destination · ' + destination));
            const field = el('input');
            field.value = targetName;
            field.maxLength = 80;
            field.setAttribute('aria-label', 'Destination filename');
            const buttons = [false, true].map((move) =>
              control(move ? 'Move file' : 'Copy file', () => {
                close();
                api.transfer(selection, destination, move, targetName);
              }),
            );
            function validate() {
              targetName = field.value.trim();
              const invalid =
                !targetName ||
                targetName === '.' ||
                targetName === '..' ||
                /[\/\\]/.test(targetName) ||
                api.occupied(destination, targetName);
              buttons.forEach((b) => {
                b.disabled = !!invalid || S.used >= S.budget;
              });
            }
            field.addEventListener('input', validate);
            validate();
            add(el('label', 'research-choice', 'Save as', field), ...buttons);
          }
          add(
            control('Choose a different file', () => {
              selection = destination = null;
              draw();
            }),
          );
        }
      } else {
        add(label('p', actor === 'me' ? 'My work' : actor, 'research-meta'));
        const busy = d.jobs.find((j) => j.actor === actor);
        if (busy) add(label('p', busy.label + ' is running.'));
        else {
          const options = r ? R.jobOptions(S, actor, view) : [];
          let group;
          for (const o of options) {
            if (o.group && group !== o.group) {
              group = o.group;
              add(label('h3', group));
            }
            const pool = o.pool === 'hire' ? 'prepaid clerk' : o.pool;
            const available = o.pool === 'cloud' ? R.cloudLeft(S) : o.pool === 'hire' ? Infinity : S.budget - S.used;
            add(
              row(
                o.label,
                api.skillName(o.skill) + ' · ' + o.price + ' ' + pool + ' compute · ' + api.seconds(o.ms) + ' s',
                () => {
                  close();
                  api.dispatch(actor, view, o.id);
                },
                o.price > available,
              ),
            );
          }
          if (!r && actor !== 'me')
            for (const o of api.general(actor, view))
              add(
                row(o.label, o.detail, () => {
                  close();
                  o.run();
                }),
              );
          if (!options.length && r)
            add(
              label(
                'p',
                view === 'use'
                  ? 'Write a tool first, then choose an input here.'
                  : view === 'write'
                    ? 'Finish the first investigation to start writing.'
                    : 'Read the small example, or check which leads are already underway.',
              ),
            );
        }
      }
      if (r && actor === 'me' && view !== 'desk') add(control('Back to research', () => redraw('desk')));
      body.scrollTop = scroll;
      if (focus) [...body.querySelectorAll('button')].find((b) => b.textContent === focus)?.focus({ preventScroll: true });
    }
    return { show, close, draw };
  };
})();
