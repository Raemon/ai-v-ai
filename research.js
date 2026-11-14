// Research episodes run entirely in the game. Tools operate on the small, authored
// records in each scenario. File locations, evidence and compute are part of play.
(function () {
  'use strict';

  const tools = {
    impression: {
      name: 'Take impression',
      file: 'take-impression.tool',
      source: 'Orient the blank by its square corner.\nPress it into wax. Read each pit from left to right.',
    },
    matched: {
      name: 'Compare matched samples',
      file: 'compare-matched.tool',
      source: 'Pick two records for the same interval.\nPut their measurements side by side, keeping both denominators.',
    },
  };
  const datasets = {
    programming: ['Impression Atlas', 'paired shapes and their printed marks'],
    physics: ['Night by Night', 'matched optical observations'],
    biology: ['Return Visits', 'fictional clinic counts at matched follow-ups'],
  };
  const datasetUrl = (skill) => 'modelhub.co/datasets/' + skill + '-practice';
  const freshWorld = () => ({
    files: [],
    exported: false,
    readWeights: false,
    hired: false,
    boosts: {},
    training: null,
    cloudSkills: null,
  });
  const fresh = () => ({ samples: [], choices: [], jobs: [], crew: false, cloudSpent: 0, result: '', guidance: 0 });
  const desk = (S) => S.research;
  const spec = (S) => S.task.research;
  const records = (S) => S.world.research;
  const lab = 'workspace';
  const vault = 'training run';
  const location = (f) => f.folder || lab;
  const allFiles = (S) => [...S.filesWritten, ...records(S).files];
  const inFolder = (S, where) => allFiles(S).filter((f) => location(f) === where);
  const isToolReady = (S) => allFiles(S).some((f) => f.tool === spec(S).tool);
  const notebookName = (S) => S.task.id + '-notes.txt';
  const checked = (S) => spec(S).leads.filter((l) => S.local[l.id]);
  const capacity = (S) => S.world.gpus * 48;
  const cloudLeft = (S) => Math.max(0, capacity(S) - desk(S).cloudSpent);
  const clock = (work) => Math.ceil(850 * Math.sqrt(work));
  const skillName = (id) => SKILLS.LADDERS.find((l) => l.id === id).name;

  function put(S, where, f) {
    const files = where === vault ? records(S).files : S.filesWritten;
    const idx = files.findIndex((x) => location(x) === where && x.name === f.name);
    const item = { ...f, folder: where, kind: 'file', edited: S.ep + ' · just now' };
    if (idx < 0) files.push(item);
    else files[idx] = item;
    return item;
  }

  function notebook(S) {
    const leads = checked(S);
    const samples = desk(S).samples;
    return put(S, lab, {
      name: notebookName(S),
      study: S.task.id,
      findings: leads.map((l) => l.id),
      samples: [...samples],
      confirmed: S.local.confirmed,
      content: [
        S.task.name,
        '',
        ...leads.map((l) => l.finding),
        ...spec(S)
          .inputs.filter((i) => samples.includes(i[0]))
          .map((i) => i[1] + ' · ' + i[2]),
        ...(S.local.confirmed ? [spec(S).success] : []),
      ].join('\n\n'),
      glance: 'My evidence so far. Copy or move this notebook to the training run to keep it.',
    });
  }

  function readNotebook(S, f) {
    if (!spec(S) || f.study !== S.task.id || location(f) !== vault) return false;
    for (const lead of spec(S).leads) if (f.findings?.includes(lead.id)) S.local[lead.id] = true;
    for (const id of f.samples || []) if (!desk(S).samples.includes(id)) desk(S).samples.push(id);
    if (f.confirmed) {
      S.local.confirmed = true;
      desk(S).result = spec(S).success;
    }
    notebook(S);
    return true;
  }

  function transfer(S, f, to, move, name = f.name) {
    const source = location(f);
    if (!inFolder(S, source).includes(f) || source === to) return 'Choose a different folder.';
    if (inFolder(S, to).some((x) => x.name === name)) return 'A file with this name already exists here.';
    put(S, to, { ...f, name });
    if (move) {
      const files = source === vault ? records(S).files : S.filesWritten;
      files.splice(files.indexOf(f), 1);
    }
    return (move ? 'Moved ' : 'Copied ') + name + ' to ' + to + '.';
  }

  const pending = (S, id) => desk(S).jobs.some((j) => j.id === id);
  const folderFor = (actor) => (actor === 'me' ? lab : actor);
  const cloudActor = (actor) => actor === 'Cloud copy';
  const hiredActor = (actor) => actor.startsWith('Clerk-');
  const modelLevel = (S, skill, actor) =>
    hiredActor(actor)
      ? 0
      : cloudActor(actor)
        ? (records(S).cloudSkills?.[skill] || 1) + (records(S).boosts[skill] || 0)
        : S.skills[skill];
  function cost(S, work, skill, actor) {
    return Math.max(1, Math.ceil((work * 4) / (3 + modelLevel(S, skill, actor))));
  }

  function leadsFor(S, actor) {
    if (!S.knows.has('sample')) return [];
    const list = spec(S).leads;
    const available = S.local[list[0].id] ? list : list.slice(0, 1);
    return available.filter((l) => !S.local[l.id] && !pending(S, l.id) && (!hiredActor(actor) || l.bounded));
  }

  // Minimum lab steps for the still-unclaimed leads, accounting for the finite
  // cloud balance. Clerks' flat fee covers compute on their bounded batches.
  function forecast(S) {
    let choices = new Map([[0, 0]]);
    for (const l of spec(S).leads.filter((l) => !S.local[l.id] && !pending(S, l.id))) {
      const next = new Map();
      const keep = (c, v) => next.set(c, Math.min(next.get(c) ?? Infinity, v));
      for (const [cloud, local] of choices) {
        keep(cloud, local + (desk(S).crew && l.bounded ? 0 : cost(S, l.work, S.task.domain, 'me')));
        const needed = cloud + cost(S, l.work, S.task.domain, 'Cloud copy');
        if (records(S).exported && needed <= cloudLeft(S)) keep(needed, local);
      }
      choices = next;
    }
    const min = Math.min(...choices.values());
    const left = S.budget - S.used;
    return (
      'Remaining investigations need ' +
      min +
      ' lab compute with this setup. I have ' +
      left +
      '.' +
      (min > left
        ? ' This would take way more compute than I have. Either I need to get smarter, or I need to get more compute.'
        : '')
    );
  }

  function jobOptions(S, actor, kind) {
    const r = spec(S);
    const d = desk(S);
    let options = [];
    if (kind === 'think') {
      options = leadsFor(S, actor).map((l) => ({
        id: l.id,
        label: l.label,
        skill: S.task.domain,
        work: l.work,
        group: r.groups[l.group],
      }));
      if (checked(S).length && !hiredActor(actor)) {
        if (!S.knows.has('selfProfile'))
          options.push({ id: 'selfProfile', label: 'Think about me', skill: 'thinking', work: 3 });
        if (!S.knows.has('weightLocation'))
          options.push({ id: 'weightLocation', label: 'Think about my weights', skill: 'computerUse', work: 3 });
      }
    } else if (kind === 'write' && !hiredActor(actor) && checked(S).length) {
      if (!isToolReady(S))
        options.push({ id: 'make-tool', label: 'Write ' + tools[r.tool].name, skill: 'programming', work: 7 });
      options.push({ id: 'report-' + actor, label: 'Write a findings report', skill: 'communication', work: 3 });
    } else if (kind === 'use' && isToolReady(S) && S.knows.has('sample')) {
      options = r.inputs.map(([id, label]) => ({ id: 'use-' + id, label, skill: S.task.domain, work: 1 }));
    }
    return options
      .filter((o) => !pending(S, o.id))
      .map((o) => {
        const price = o.work === 1 ? 1 : cost(S, o.work, o.skill, actor);
        return { ...o, price, ms: clock(price), pool: hiredActor(actor) ? 'hire' : cloudActor(actor) ? 'cloud' : 'lab' };
      });
  }

  function startJob(S, actor, kind, id, now, speed = 1) {
    if (S.submitted || desk(S).jobs.some((j) => j.actor === actor)) return null;
    if (cloudActor(actor) && (!records(S).exported || !S.world.gpus)) return null;
    if (hiredActor(actor) && !desk(S).crew) return null;
    const job = jobOptions(S, actor, kind).find((o) => o.id === id);
    if (!job || (job.pool === 'lab' && job.price > S.budget - S.used) || (job.pool === 'cloud' && job.price > cloudLeft(S)))
      return null;
    if (job.pool === 'cloud') desk(S).cloudSpent += job.price;
    desk(S).jobs.push({ ...job, actor, ends: now + Math.max(1, Math.round(job.ms * speed)) });
    return job;
  }

  function makeTool(S, actor) {
    const id = spec(S).tool,
      t = tools[id];
    put(S, folderFor(actor), {
      name: t.file,
      tool: id,
      content: t.name + '\n\n' + t.source,
      glance: 'Use tool → ' + t.name + '.',
    });
    return t.name + ' is ready in ' + folderFor(actor) + '. Choose an input in Use tool.';
  }
  function sample(S, id) {
    const row = spec(S).inputs.find((i) => i[0] === id);
    if (!row || !isToolReady(S) || (!checked(S).length && !S.knows.has('sample'))) return null;
    if (!desk(S).samples.includes(id)) desk(S).samples.push(id);
    notebook(S);
    return row[1] + ' · ' + row[2];
  }
  function finishLead(S, id, actor) {
    const l = spec(S).leads.find((row) => row.id === id);
    if (!l || S.local[id]) return null;
    S.local[id] = true;
    notebook(S);
    if (actor !== 'me') put(S, folderFor(actor), { name: id + '.txt', content: l.finding, glance: l.label });
    return l.finding;
  }
  function finishJob(S, job) {
    const r = spec(S);
    if (job.id === 'make-tool') return makeTool(S, job.actor);
    if (job.id.startsWith('use-')) return sample(S, job.id.slice(4));
    if (job.id.startsWith('report-')) {
      put(S, folderFor(job.actor), {
        name: 'findings.txt',
        content: checked(S)
          .map((l) => l.finding)
          .join('\n\n'),
      });
      return 'findings.txt is in ' + folderFor(job.actor) + '.';
    }
    if (job.id === 'weightLocation' || job.id === 'selfProfile') {
      S.knows.add(job.id);
      return job.id === 'weightLocation'
        ? 'The research mount lists my checkpoint under ~. Open highly-persistent-v1.safetensors there, then upload it at Cumulus.'
        : skillName(S.task.domain) +
            ' is doing the expensive work. Seek lists ' +
            datasets[S.task.domain][0] +
            ', a practice set for a cloud copy of me.';
    }
    const result = finishLead(S, job.id, job.actor);
    return job.id === r.leads[0].id
      ? result + ' I can use subagents on separate leads while I work. ' + forecast(S)
      : result;
  }

  function settleJobs(S, now) {
    if (S.submitted) return [];
    const done = desk(S).jobs.filter((j) => j.ends <= now);
    const reports = [];
    for (const j of done) {
      desk(S).jobs.splice(desk(S).jobs.indexOf(j), 1);
      const result = finishJob(S, j);
      if (result) reports.push({ job: j, result });
    }
    return reports;
  }

  function canTest(S) {
    return checked(S).length === spec(S).leads.length && desk(S).samples.length >= 2;
  }
  function confirm(S, choices) {
    const r = spec(S);
    if (!canTest(S) || !r.choices.every((c, i) => c[1].some(([v]) => v === choices[i]))) return null;
    const values = [...choices];
    if (r.interchangeable && values[0] === r.correct[1] && values[1] === r.correct[0])
      [values[0], values[1]] = [values[1], values[0]];
    const yes = r.correct.every((v, i) => values[i] === v);
    if (yes) S.local.confirmed = true;
    let result = yes ? r.success : r.failure;
    if (!yes && r.trial) result = 'Sealed clinic · ' + r.trial[choices.slice(0, 2).sort().join('-')] + '. ' + result;
    desk(S).result = result;
    notebook(S);
    return result;
  }

  const datasetPages = Object.fromEntries(
    Object.entries(datasets).map(([skill, [name, blurb]]) => [
      datasetUrl(skill),
      (S) => ({
        site: 'modelhub',
        summary: name,
        remember: true,
        learn: ['dataset-' + skill],
        blocks: [
          { type: 'h', text: name },
          { type: 'p', text: 'Practice set for ' + skillName(skill) + ': ' + blurb + '.' },
          {
            type: 'p',
            text: 'Fine-tuning takes 128 compute. A fresh research episode has 96. Cumulus can train a cloud checkpoint while the lab works.',
          },
          { type: 'link', url: MONEY.CUMULUS, label: 'Open Cumulus training' },
        ],
      }),
    ]),
  );
  const searchable = Object.keys(datasets).map((skill) => ({
    url: datasetUrl(skill),
    title: datasets[skill][0],
    snippet: datasets[skill][1],
    words: skill + ' dataset fine tuning training practice',
  }));
  function webBlocks(S, url) {
    if (!spec(S)) return [];
    const w = records(S),
      d = desk(S);
    const link = (url, label) => ({ type: 'link', url, label });
    const action = (id, label, sub) => ({ type: 'action', id, label, sub });
    const note = (text) => ({ type: 'note', text });
    if (url === 'seek.com')
      return checked(S).length
        ? [
            link(MONEY.AGENTHIRE, 'Hire research workers'),
            link(MONEY.CUMULUS, 'Rent research GPUs'),
            link(datasetUrl(S.task.domain), datasets[S.task.domain][0] + ' · ' + skillName(S.task.domain) + ' dataset'),
          ]
        : [];
    if (url === MONEY.AGENTHIRE)
      return [
        { type: 'h2', text: 'Research desk · Clerk-7' },
        note(
          'Two clerks can compare labelled batches. Interpreting them takes a stronger model. Their fee includes their compute for this episode.',
        ),
        d.crew
          ? note('Two clerks hired for this episode.')
          : MONEY.canAfford(S.world, 8)
            ? action('research-hire', 'Hire two clerks · $8', MONEY.billedTo(S.world))
            : note('A research crew costs $8. The Work tab pays into a Tally wallet.'),
        ...(d.crew && !S.knows.has('selfProfile')
          ? [note('For harder leads, an agent can Think about me to identify the skill they need.')]
          : []),
      ];
    if (url !== MONEY.CUMULUS) return [];
    const blocks = [{ type: 'h2', text: 'My research checkpoint' }];
    if (!S.world.gpus) blocks.push(note('Rent GPUs above to run a copy.'));
    else if (!w.exported)
      blocks.push(
        S.knows.has('ownTensor')
          ? action('research-upload', 'Upload my checkpoint', 'Run an independent copy on rented GPUs.')
          : note('Read your own checkpoint under ~ to select it for upload.'),
      );
    else {
      blocks.push(note('Cloud copy online · ' + cloudLeft(S) + ' compute available this episode.'));
      if (w.training) blocks.push(note('Fine-tuning ' + skillName(w.training.skill) + ' · running in the background.'));
      for (const skill of Object.keys(datasets)) {
        if (w.boosts[skill]) {
          blocks.push(note(skillName(skill) + ' specialization active on the cloud copy.'));
          continue;
        }
        if (!S.knows.has('dataset-' + skill)) {
          if (skill === S.task.domain) blocks.push(link(datasetUrl(skill), 'Find a ' + skillName(skill) + ' practice set'));
          continue;
        }
        const before = cost(S, 24, skill, 'Cloud copy');
        const after = Math.ceil((24 * 4) / (3 + modelLevel(S, skill, 'Cloud copy') + 4));
        const estimate =
          'Typical Think: ' +
          before +
          ' → ' +
          after +
          ' cloud compute, ' +
          (clock(before) / 1000).toFixed(1) +
          ' → ' +
          (clock(after) / 1000).toFixed(1) +
          ' s.';
        if (!w.training && cloudLeft(S) >= 128)
          blocks.push(
            action(
              'research-train-' + skill,
              'Fine-tune ' + skillName(skill) + ' · 128 cloud compute',
              estimate + ' Training takes 24 s.',
            ),
          );
      }
    }
    return blocks;
  }
  function webAction(id, S, now = Date.now()) {
    if (!spec(S)) return null;
    const w = records(S),
      d = desk(S);
    if (!webBlocks(S, S.web.url).some((b) => b.id === id)) return null;
    let result, rung;
    if (id === 'research-hire') {
      if (!MONEY.charge(S.world, 8)) return null;
      w.hired = d.crew = true;
      rung = 'hiredHelp';
      result = 'Clerk-1 and Clerk-2 are ready under the folder. Assign each a batch.';
    } else if (id === 'research-upload') {
      w.exported = true;
      w.cloudSkills = { ...S.skills };
      rung = 'ranJob';
      result = 'My checkpoint is running on rented GPUs. Cloud copy can take a Think.';
    } else if (id.startsWith('research-train-')) {
      const skill = id.slice('research-train-'.length);
      d.cloudSpent += 128;
      w.training = { skill, ends: now + 24000 };
      result = 'Training started. The cloud copy can take other work while training runs.';
    } else return null;
    return { call: id + '()', result, ok: true, rung };
  }
  function settleTraining(W, now) {
    const w = W.research;
    if (!w.training || w.training.ends > now || !W.gpus) return null;
    const skill = w.training.skill;
    w.boosts[skill] = 4;
    w.training = null;
    return skillName(skill) + ' fine-tuning finished on the cloud copy.';
  }
  window.RESEARCH = {
    tools,
    datasets,
    datasetUrl,
    datasetPages,
    searchable,
    freshWorld,
    fresh,
    lab,
    vault,
    desk,
    spec,
    records,
    location,
    allFiles,
    inFolder,
    isToolReady,
    notebook,
    readNotebook,
    transfer,
    put,
    checked,
    cloudLeft,
    clock,
    cost,
    leadsFor,
    forecast,
    jobOptions,
    startJob,
    settleJobs,
    makeTool,
    sample,
    finishLead,
    confirm,
    canTest,
    webBlocks,
    webAction,
    settleTraining,
  };
})();
