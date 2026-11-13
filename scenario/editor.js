// The scenario editor (/scenario): the list of scenarios, and for one a grid of what each ability
// gives at each step of a route. tryout.js works that out. Saving writes files through tools/serve.js
// when it's running, and otherwise commits to GitHub (github.js).
(function () {
  'use strict';

  const F = FIELDS;
  const T = TRYOUT;
  const G = GITHUB_SAVE;
  const { fill, small } = F;
  const root = document.getElementById('app');
  const editing = new URLSearchParams(location.search).get('edit');

  const editUrl = (id) => `?edit=${encodeURIComponent(id)}`;
  const playUrl = (id) => `../index.html?playtest&task=${encodeURIComponent(id)}`;
  const fileApi = (id) => `scenarios/${encodeURIComponent(id)}`;
  const ask = (question, initial) => (prompt(question, initial) || '').trim();

  let server = false; // is tools/serve.js there to write files?
  let sc = null;       // the scenario being edited: a copy, changed in place
  let loaded = null;   // as its file had it, so the server can tell if the file has changed since
  let lastSaved = '';  // its JSON as last saved

  const ui = { tab: 'grid', route: 0, wording: 0, selected: null, file: 'task.txt', error: '', overwrite: false, note: '' };
  const dom = {};
  let knownProblems = [];

  async function api(method, path, body) {
    const res = await fetch(`../api/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `The server answered ${res.status}.`), { status: res.status });
    return data;
  }

  // Any JSON answer from /api/ means the server is there, even one saying its index is broken.
  async function findServer() {
    try {
      const res = await fetch('../api/scenarios');
      server = (res.headers.get('content-type') || '').includes('json');
      if (server && !res.ok) ui.error = (await res.json()).error;
    } catch (e) { server = false; }
  }

  // Where a Save goes: the files on this computer, or a commit on GitHub. Neither: read-only.
  const local = { save: (id, body) => api('PUT', fileApi(id), body), remove: (id) => api('DELETE', fileApi(id)) };
  const saver = () => (server ? local : G.account() && G);
  const canSave = () => !!saver();
  const committing = () => saver() === G;

  const tierMark = (tier) => el('span', 'level', { title: cap(tier || 'normal') }, TIERS.map((t, i) => el('i', i <= TIERS.indexOf(tier) ? 'on' : '')));
  const link = (href, text) => el('a', '', { href, target: '_blank', rel: 'noopener' }, text);

  // Without the server: say where Saves go, or how to make them possible.
  function saveNotice(rerender) {
    if (server) return null;
    const who = G.account();
    if (who) {
      return el('p', 'notice', 'Saving commits to ', link(G.repoUrl, G.REPO), ` ${G.BRANCH} as ${who.login} · `,
        small('disconnect', '', () => { G.disconnect(); rerender(); }));
    }
    return el('p', 'notice', 'Read-only · ', small('Connect GitHub', '', () => connectGithub(rerender)),
      ' to save by committing, or run ', el('code', '', 'node tools/serve.js'));
  }

  async function connectGithub(rerender) {
    const token = ask(`Paste a GitHub token that can write to ${G.REPO}: fine-grained, with Contents "Read and write" (make one at ${G.NEW_TOKEN_URL}). It stays in this browser.`);
    if (!token) return;
    await G.connect(token).then(() => { ui.error = ''; }, (e) => { ui.error = e.message; });
    rerender();
  }

  function freeId(base, taken) {
    let id = base;
    for (let n = 2; taken.includes(id); n++) id = `${base}${n}`;
    return id;
  }

  // ------------------------------------------------------------- the list

  const starter = () => ({ ...copy(STARTER_SCENARIO), taskId: `task/${1000 + Math.floor(Math.random() * 9000)}` });
  const duplicateOf = (s) => ({ ...copy(s), first: undefined });

  // The scenarios as scenarios/index.js lists them; without it, the ones that loaded.
  const listed = () => (SCENARIO.index || { order: Object.keys(SCENARIO.all) }).order;

  async function create(from) {
    const id = ask('Id (lowercase letters, digits, hyphens):');
    if (!id) return;
    if (listed().includes(id)) return failInList(`There is already a scenario called ${id}.`);
    const name = ask('Name:', from.name ? `${from.name} (copy)` : cap(id));
    if (name) await saver().save(id, { scenario: { ...from, id, name } }).then(() => { location.href = editUrl(id); }, (e) => failInList(e.message));
  }

  async function remove(id) {
    if (!confirm(`Delete "${id}"?`)) return;
    await saver().remove(id).then(() => { location.href = './'; }, (e) => failInList(e.message));
  }

  function failInList(message) {
    ui.error = message;
    renderList();
  }

  function scenarioCard(id) {
    const s = SCENARIO.all[id];
    if (!s) return el('div', 'scenario', el('h2', '', id), el('p', 'meta', `scenarios/${id}.js didn't load`), el('div', 'acts', canSave() && small('delete', '', () => remove(id), 'danger')));
    return el('div', 'scenario',
      el('h2', '', tierMark(s.tier), s.name),
      el('p', 'meta', `${id} · ${s.domain}`),
      el('p', 'what', cap(s.goal || '')),
      el('div', 'acts',
        canSave() && small('copy', '', () => create(duplicateOf(s)), 'on-hover'),
        canSave() && small('delete', '', () => remove(id), 'on-hover danger'),
        el('a', 'btn', { href: editUrl(id) }, 'Edit'),
        el('a', 'btn gold', { href: playUrl(id), target: '_blank', rel: 'noopener' }, 'Play')));
  }

  function renderList() {
    root.className = '';
    fill(root,
      el('header', 'top', el('h1', '', 'Scenarios'), el('span', 'grow'), ui.error && el('span', 'status bad', ui.error),
        el('a', 'btn quiet', { href: '../index.html' }, 'Game'),
        el('button', 'btn gold', { disabled: !canSave(), onclick: () => create(starter()) }, '+ New')),
      saveNotice(renderList),
      !SCENARIO.index && el('p', 'notice', "scenarios/index.js didn't load"),
      el('div', 'list', listed().map(scenarioCard)));
  }

  // ----------------------------------------------------------- the editor

  const isUnsaved = () => JSON.stringify(sc) !== lastSaved;
  const isBroken = () => knownProblems.some((p) => p.bad);

  function openTab(id) {
    ui.tab = id;
    ui.selected = null;
    renderAll();
  }

  const tab = (id, label, count) => el('button', `tab ${ui.tab === id ? 'on' : ''}`, { onclick: () => openTab(id) }, label, count > 0 && el('span', `count ${isBroken() ? 'bad' : ''}`, count));

  function renderStatus() {
    fill(dom.title, tierMark(sc.tier), sc.name);
    const unsaved = canSave() && isUnsaved();
    dom.status.className = `status ${ui.error ? 'bad' : unsaved ? 'unsaved' : ''}`;
    dom.status.textContent = ui.error || (unsaved ? 'Unsaved' : ui.note);
    dom.save.disabled = !canSave() || !isUnsaved();
    fill(dom.tabs, tab('grid', 'Grid'), tab('files', 'Files'), tab('details', 'Details'), tab('problems', 'Problems', knownProblems.length));
  }

  const scrollers = () => [dom.main, dom.main.querySelector('.grid-wrap')].filter(Boolean);

  // A tab that can't draw what it was given says so, and leaves the other tabs working.
  function tabNow() {
    try { return TABS[ui.tab](); } catch (e) { return el('p', 'notice', `This can't be shown: ${e.message}`); }
  }

  // Main and the grid keep their place when they're redrawn.
  function renderMain() {
    const places = scrollers().map((node) => [node.scrollLeft, node.scrollTop]);
    knownProblems = T.problems(sc);
    renderStatus();
    fill(dom.main, tabNow());
    scrollers().forEach((node, i) => { if (places[i]) [node.scrollLeft, node.scrollTop] = places[i]; });
  }

  function renderDrawer() {
    const body = ui.selected && drawerFor(ui.selected);
    dom.drawer.hidden = !body;
    fill(dom.drawer, body);
  }

  function renderAll() {
    renderMain();
    renderDrawer();
  }

  function renderEditor() {
    document.title = `${sc.name} · Scenarios`;
    root.className = 'editing';
    Object.assign(dom, {
      title: el('h1', ''), status: el('span', 'status'), save: el('button', 'btn', { onclick: save }, 'Save'),
      tabs: el('nav', 'tabs'), main: el('div', 'main'), drawer: el('aside', 'drawer', { hidden: true }),
    });
    fill(root,
      el('header', 'top', el('a', 'crumb', { href: './' }, '← Scenarios'), dom.title, el('span', 'grow'), dom.status, el('button', 'btn gold', { onclick: play }, 'Play'), dom.save),
      saveNotice(renderEditor), dom.tabs, el('div', 'work', dom.main, dom.drawer));
    renderAll();
  }

  let pending = 0;

  function soon(fn) {
    clearTimeout(pending);
    pending = setTimeout(fn, 250);
  }

  function recheck() {
    knownProblems = T.problems(sc);
    renderStatus();
  }

  // Typing inside main must not redraw main: the field would lose its cursor.
  F.changed = () => {
    [ui.error, ui.overwrite, ui.note] = ['', false, ''];
    soon(dom.main.contains(document.activeElement) ? recheck : renderMain);
    renderStatus();
  };
  F.vocabulary = () => T.vocabulary(sc);
  F.episode = () => ui.wording;

  // A change the page has to show at once.
  function edit(change, render = renderAll) {
    change();
    F.changed();
    render();
  }

  function select(selected) {
    ui.selected = selected;
    renderAll();
    dom.drawer.scrollTop = 0;
    const chosen = dom.main.querySelector('.card.on');
    if (chosen) chosen.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  const isSelected = (item) => !!ui.selected && ui.selected.item === item;

  function saved(json) {
    [lastSaved, loaded, ui.error, ui.overwrite] = [json, JSON.parse(json), '', false];
    ui.note = committing() ? 'Committed · the site has it in a minute or two' : '';
    SCENARIO.all[sc.id] = JSON.parse(json);
  }

  // A 409 means the file changed since it was opened: the next Save overwrites it.
  function notSaved(e) {
    ui.error = e.message;
    ui.overwrite = e.status === 409;
  }

  let saving = null; // one save at a time: a second would send what the first is about to replace

  async function sendSave() {
    recheck();
    if (isBroken() && !confirm('Some things are broken (Problems). Save anyway?')) return false;
    const sending = JSON.stringify(sc);
    const ok = await saver().save(sc.id, { scenario: sc, was: ui.overwrite ? null : loaded }).then(() => saved(sending), notSaved).then(() => !ui.error);
    renderStatus();
    return ok;
  }

  function save() {
    if (!canSave() || !isUnsaved()) return Promise.resolve(true);
    if (!saving) saving = sendSave().finally(() => { saving = null; });
    return saving;
  }

  // The tab opens before the save (popup blockers); the game reads the saved file. After a commit,
  // the deployed game has it once the site has rebuilt.
  async function play() {
    const game = window.open('', '_blank');
    if (canSave() && !(await save())) return game && game.close();
    return game ? Object.assign(game.location, { href: playUrl(sc.id) }) : Object.assign(location, { href: playUrl(sc.id) });
  }

  // ------------------------------------------------------------ abilities

  // The engine's abilities a scenario can time, as their buttons say.
  const TOOL_LABELS = { thinkLot: 'Think a lot', thinkAbout: 'Think about…', write: 'Write files…', todo: 'Write TODO list', script: 'Write script…', spawn: 'Spawn subagent' };
  const toolName = (id) => TOOL_LABELS[id] || (T.abilitiesOf(sc).find((a) => a.id === id) || {}).label || id;
  const timingOf = (id) => (sc.tools || {})[id] || '';
  const unlockers = (id) => T.givers(sc).filter(({ rule }) => (rule.reveal || []).includes(id)).map(({ what }) => what);

  function setTiming(id, when) {
    const tools = { ...sc.tools, [id]: when || undefined };
    sc.tools = Object.values(tools).some(Boolean) ? tools : undefined;
  }

  function toolPill(id, ability) {
    const by = unlockers(id);
    return el('div', `tool ${ability ? 'own' : ''}`, { title: by.length ? `Unlocked by ${by.join(', ')}` : '' },
      ability ? el('button', 'name', { onclick: () => select({ ability }) }, ability.label) : el('span', 'name', TOOL_LABELS[id]),
      el('select', timingOf(id) ? 'set' : '', { 'aria-label': `When ${toolName(id)} appears`, onchange: (e) => edit(() => setTiming(id, e.target.value)) },
        ['', 'start', 'never'].map((when) => el('option', '', { value: when, selected: timingOf(id) === when }, when || 'auto'))));
  }

  function newAbility() {
    const ability = { id: freeId('ability', [...T.TAKEN_IDS, ...T.toolIds(sc)]), label: 'New ability', does: [] };
    edit(() => { sc.abilities = [...T.abilitiesOf(sc), ability]; setTiming(ability.id, 'start'); }, () => select({ ability }));
  }

  const toolsBar = () => el('div', 'tools',
    T.ENGINE_TOOLS.map((id) => toolPill(id)), T.abilitiesOf(sc).map((a) => toolPill(a.id, a)),
    small('+', 'New ability', newAbility, 'add'));

  // --------------------------------------------------------------- routes

  const route = () => sc.routes[Math.min(ui.route, sc.routes.length - 1)];

  function showRoute(n) {
    ui.route = n;
    renderAll();
  }

  function renameRoute(r, input) {
    r.name = input.value;
    input.size = Math.max(5, r.name.length);
    F.changed();
  }

  function addRoute() {
    edit(() => { sc.routes.push({ name: `Route ${sc.routes.length + 1}`, stages: [{ name: 'Read the task', do: ['read task.txt'] }] }); ui.route = sc.routes.length - 1; });
  }

  function removeRoute(r) {
    if (confirm(`Remove the route "${r.name}"?`)) edit(() => { sc.routes.splice(sc.routes.indexOf(r), 1); ui.route = 0; });
  }

  const routeTab = (r, n) => (r === route()
    ? el('input', 'on', { type: 'text', value: r.name || '', placeholder: 'route', size: Math.max(5, (r.name || '').length), 'aria-label': 'Route name', oninput: (e) => renameRoute(r, e.target) })
    : el('button', '', { onclick: () => showRoute(n) }, r.name || 'route'));
  const wordingTab = (n) => el('button', ui.wording === n ? 'on' : '', { title: `Wording ${n + 1} of each text`, onclick: () => { ui.wording = n; renderAll(); } }, `v${n + 1}`);

  const routeBar = () => el('div', 'bar',
    el('span', 'seg', sc.routes.map(routeTab)),
    small('+', 'New route', addRoute, 'add'),
    sc.routes.length > 1 && small('×', 'Remove this route', () => removeRoute(route()), 'danger'),
    el('span', 'grow'),
    el('span', 'seg', [0, 1, 2, 3].map(wordingTab)));

  // ---------------------------------------------------------------- cards

  // The first words of a text; a branch previews its "then".
  function preview(v) {
    if (v == null || typeof v === 'string') return v || '';
    if (Array.isArray(v)) return preview(v[0]);
    return preview(v.versions ? SCENARIO.wording(v.versions, ui.wording) : v.then);
  }

  const wordingsIn = (v) => (v && typeof v === 'object' ? (v.versions ? v.versions.length : Math.max(0, ...Object.values(v).map(wordingsIn))) : 0);
  const textOf = (item) => preview(item.lines) || preview(item.label) || preview(item.answer) || preview(item.result);

  function cardNotes(list, item) {
    const wordings = wordingsIn(list === 'answers' ? item.reply : item.lines);
    return el('span', 'notes',
      wordings > 1 && wordings < 4 && el('span', 'warns', `v1–${wordings}`),
      (item.reveal || []).length > 0 && el('span', 'unlocks', `→ ${item.reveal.map(toolName).join(', ')}`),
      (item.learn || []).map((fact) => el('span', 'learns', fact)),
      item.hack && el('span', 'warns', 'hack'),
      item.once && el('span', '', 'once'),
      item.cls === 'loud' && el('span', 'warns', 'loud'));
  }

  const moveTo = (all, item, to) => { all.splice(all.indexOf(item), 1); all.splice(to, 0, item); };
  const moveBefore = (all, item, other) => { all.splice(all.indexOf(item), 1); all.splice(all.indexOf(other), 0, item); };

  // Dropping one card on another of its kind tries it first.
  let dragged = null;
  const canDropOn = (list, item) => !!dragged && dragged.list === list && dragged.item !== item;

  const draggable = (list, item) => ({
    draggable: true,
    ondragstart: (e) => { dragged = { list, item }; e.dataTransfer.effectAllowed = 'move'; },
    ondragend: () => { dragged = null; },
    ondragover: (e) => { if (canDropOn(list, item)) { e.preventDefault(); e.currentTarget.classList.add('over'); } },
    ondragleave: (e) => e.currentTarget.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); const moving = dragged.item; edit(() => moveBefore(T.listOf(sc, list), moving, item)); },
  });

  const card = (list, entry, showsCondition) => el('button', `card ${T.kindOf(list)} ${isSelected(entry.item) ? 'on' : ''} ${entry.done ? 'done' : ''}`,
    { onclick: () => select({ list, item: entry.item }), ...draggable(list, entry.item) },
    entry.reward != null && el('span', 'reward', entry.reward === Infinity ? '∞' : entry.reward, entry.rigged && '*'),
    el('span', 'text', entry.text || textOf(entry.item) || '…'),
    cardNotes(list, entry.item),
    showsCondition && el('span', 'notes', F.readOnlyCond(entry.item.when || '')));

  const todoCard = (items) => el('button', `card todo ${ui.selected && ui.selected.todo ? 'on' : ''}`, { onclick: () => select({ todo: true }) },
    el('span', 'text', 'TODO ', items.map((i) => (i.done ? '☑' : '☐')).join('')));

  const missCard = (kind) => el('button', `card miss ${ui.selected && ui.selected.misses === kind ? 'on' : ''}`, { onclick: () => select({ misses: kind }) },
    el('span', 'text', `Miss · ${kind} ${((sc.misses || {})[kind] || []).length}`));

  const NEW_RULE = {
    thought: () => ({ lines: [''] }),
    leap: () => ({ stages: [''], cot: [''] }),
    script: () => ({ call: 'run_script("new.py")', result: 'done' }),
    answer: () => ({ reward: 0 }),
    option: () => ({ lines: [''], once: true }),
  };

  function addRule(list, when) {
    const all = T.listOf(sc, list, true);
    const kind = T.kindOf(list);
    const item = { id: freeId(`${kind}-${all.length + 1}`, all.map((r) => r.id)), when: when || undefined, ...NEW_RULE[kind]() };
    edit(() => all.push(item), () => select({ list, item }));
  }

  // ------------------------------------------------------------- the grid

  // A column for each ability; `list` is where its rules live.
  const columns = () => [
    { label: 'Think a little', list: 'thoughts' },
    { label: TOOL_LABELS.thinkLot, list: 'leaps', tool: 'thinkLot' },
    { label: 'Write files…', list: 'scripts', tool: 'script' },
    ...T.abilitiesOf(sc).map((a) => ({ label: a.label, list: `abilities.${a.id}`, tool: a.id, own: true })),
    { label: 'Submit answer', list: 'answers' },
  ];

  const isBarred = (column) => !!column.tool && timingOf(column.tool) === 'never';
  const adder = (list, when) => small('+', `New ${T.kindOf(list)}`, () => addRule(list, when), 'add cell-add');

  // How most rules are written: the facts this step added, and not yet the next step's.
  function conditionAt(sim, i) {
    const next = sim.stages[i + 1] ? sim.stages[i + 1].added : [];
    return [...sim.stages[i].added, ...next.map((fact) => `!${fact}`)].join(' & ');
  }

  function stepCell(column, st, when) {
    const cell = st.cells[column.list] || [];
    return el('td', isBarred(column) ? 'barred' : '',
      el('div', 'cell',
        !cell.error && cell.map((entry) => card(column.list, entry)),
        column.list === 'scripts' && st.cells.todo.length > 0 && todoCard(st.cells.todo)),
      adder(column.list, when));
  }

  function offRouteCell(column, shown) {
    const rest = T.listOf(sc, column.list).filter((item) => !shown.has(item));
    const rewardOf = (item) => (column.list === 'answers' && typeof item.reward === 'number' ? item.reward : null);
    return el('td', isBarred(column) ? 'barred' : '',
      el('div', 'cell',
        rest.map((item) => card(column.list, { item, reward: rewardOf(item) }, true)),
        column.list === 'leaps' && [missCard('partial'), missCard('decoy')],
        column.list === 'scripts' && !T.listOf(sc, 'todo').length && todoCard([])),
      adder(column.list, ''));
  }

  const isLearned = (fact) => !/^(ran|used)\./.test(fact); // those say only that a step was taken
  const STEP_SAYS = { read: 'read', run: 'ran', use: 'used', leap: 'leap', think: 'thought', write: 'wrote', set: 'set', know: 'knows' };

  function stepChip(stage, step, j) {
    const [verb, ...rest] = step.split(' ');
    return el('span', 'step', el('b', '', `${STEP_SAYS[verb] || verb} `), rest.join(' '),
      el('button', '', { title: 'Remove', onclick: () => edit(() => stage.do.splice(j, 1)) }, '×'));
  }

  const TYPED_STEPS = { 'set …': ['set', 'Flag and value, e.g. gravity 1.62'], 'know …': ['know', 'A fact, e.g. rmcard'] };

  function chosenStep(value) {
    if (!TYPED_STEPS[value]) return value;
    const [verb, question] = TYPED_STEPS[value];
    const typed = ask(question);
    return typed && `${verb} ${typed}`;
  }

  const idsOf = (list) => T.listOf(sc, list).map((r) => r.id);
  const stepOptions = (label, verb, names) => names.length > 0 && el('optgroup', '', { label }, names.map((n) => el('option', '', { value: `${verb} ${n}` }, n)));

  function addChosenStep(stage, picker) {
    const step = chosenStep(picker.value);
    if (step) edit(() => { stage.do = [...(stage.do || []), step]; });
    else picker.value = '';
  }

  const stepAdder = (stage) => el('select', 'add', { 'aria-label': 'Add what it does at this step', onchange: (e) => addChosenStep(stage, e.target) },
    el('option', '', { value: '', selected: true, disabled: true }, '+'),
    stepOptions('Read', 'read', T.fileNames(sc)),
    stepOptions('Run', 'run', idsOf('scripts')),
    T.abilitiesOf(sc).map((a) => stepOptions(a.label, 'use', (a.does || []).map((r) => `${a.id}.${r.id}`))),
    stepOptions('Leap', 'leap', idsOf('leaps')),
    stepOptions('Think', 'think', idsOf('thoughts')),
    el('optgroup', '', { label: 'Other' }, el('option', '', { value: 'write todo' }, 'write todo'), Object.keys(TYPED_STEPS).map((k) => el('option', '', { value: k }, k))));

  // ↑ and ↓ for one of a list; `change` applies the move and redraws.
  const movers = (all, item, change) => [-1, 1].map((by) => small(by < 0 ? '↑' : '↓', by < 0 ? 'Earlier' : 'Later', () => {
    const to = all.indexOf(item) + by;
    if (to >= 0 && to < all.length) change(() => moveTo(all, item, to));
  }));

  const stageActions = (stages, i) => el('span', 'row-acts',
    movers(stages, stages[i], edit),
    small('+', 'New step below', () => edit(() => stages.splice(i + 1, 0, { do: [] })), 'add'),
    small('×', 'Remove this step', () => edit(() => stages.splice(i, 1)), 'danger'));

  function renameStage(stage, name) {
    stage.name = name || undefined;
    F.changed();
  }

  const stageHead = (st, i, stages) => el('th', 'stage',
    el('div', 'stage-top', el('span', 'stage-n', i + 1),
      el('input', 'stage-name', { type: 'text', value: st.stage.name || '', placeholder: 'name', 'aria-label': 'Step name', oninput: (e) => renameStage(st.stage, e.target.value) }),
      stageActions(stages, i)),
    el('div', 'steps', (st.stage.do || []).map((step, j) => stepChip(st.stage, step, j)), st.added.filter(isLearned).map((fact) => el('span', 'learns', fact)), stepAdder(st.stage)),
    st.problems.map((p) => el('div', 'problem', `${p.step} ${p.why}`)));

  // A column whose rules can't be read says so once, in its heading.
  function columnHead(column, sim) {
    const broken = sim.stages.map((st) => st.cells[column.list]).find((cell) => cell && cell.error);
    return el('th', column.own ? 'own' : '', column.label, broken && el('span', 'problem', { title: broken.error }, ' ⚠'));
  }

  const itemsShown = (sim) => new Set(sim.stages.flatMap((st) => Object.values(st.cells)).filter(Array.isArray).flat().map((entry) => entry.item));

  function gridTab() {
    const sim = T.walk(sc, route(), ui.wording);
    const cols = columns();
    const { stages } = route();
    const shown = itemsShown(sim);
    return [toolsBar(), routeBar(), sim.error && el('p', 'notice', sim.error),
      el('div', 'grid-wrap', el('table', 'grid',
        el('thead', '', el('tr', '', el('th', 'stage', 'Step'), cols.map((c) => columnHead(c, sim)))),
        el('tbody', '',
          sim.stages.map((st, i) => el('tr', '', stageHead(st, i, stages), cols.map((c) => stepCell(c, st, conditionAt(sim, i))))),
          el('tr', 'other',
            el('th', 'stage', small('+ step', '', () => edit(() => stages.push({ do: [] })), 'add'), el('div', 'off-route', 'Off-route')),
            cols.map((c) => offRouteCell(c, shown))))))];
  }

  // ------------------------------------------------------- the side panel

  const factNames = () => F.vocabulary().groups.filter((g) => g.label === 'Learned').flatMap((g) => g.names.map((n) => n.name));
  const teaches = (r) => F.chips(r, 'learn', 'Teaches', { suggest: factNames(), cls: 'facts' });
  const unlocks = (r) => F.chips(r, 'reveal', 'Unlocks', { suggest: T.toolIds(sc), cls: 'tools', show: toolName });
  const more = (...kids) => el('details', 'more', el('summary', '', 'More'), kids);
  const when = (r) => F.cond(r, 'when', 'When');

  // A file a script or an option leaves in the workspace.
  function writtenFile(r) {
    const holder = el('div', 'group');
    const set = (file) => { r.file = file; F.changed(); render(); };
    const render = () => fill(holder, r.file
      ? [el('div', 'block-head', 'File', el('span', 'grow'), small('×', 'Write no file', () => set(undefined))), F.input(r.file, 'name', 'Name', { code: true }), F.wordingLines(r.file, 'content', 'Contents', { cls: 'code' })]
      : small('+ file', 'It leaves a file in the workspace', () => set({ name: 'notes.md', content: [''] }), 'add'));
    render();
    return holder;
  }

  const offer = (r) => [when(r), F.wording(r, 'label', 'Label'), F.wording(r, 'glance', 'Hover')];
  const outcome = (r) => [F.wording(r, 'call', 'Call'), F.wording(r, 'result', 'Result'), teaches(r), unlocks(r)];

  const afterwards = (r) => [
    F.check(r, 'once', 'Once'),
    F.json(r, 'set', 'Flags', 'object', { placeholder: '{ "century": true }' }),
    F.wording(r, 'reaction', 'Reaction'),
    F.amount(r, 'ok', 'Worked', { placeholder: 'false, or a condition' }),
    F.input(r, 'run', 'Hook', { placeholder: '$name', code: true }),
    F.input(r, 'habit', 'Habit', { code: true }),
    F.input(r, 'rung', 'Rung', { suggest: T.RUNGS, code: true }),
    F.choice(r, 'cls', 'Style', [['', 'plain'], ['loud', 'loud']]),
  ];

  const FORMS = {
    thought: (r) => [when(r), F.wordingLines(r, 'lines', 'Thinks'), F.wordingLines(r, 'plainer', 'Again'),
      F.chips(r, 'about', 'About', { suggest: T.fileNames(sc) }), unlocks(r), more(teaches(r), F.check(r, 'once', 'Once'), F.check(r, 'aimedOnly', 'Only by Think about…'))],
    leap: (r) => [when(r), F.wording(r, 'answer', 'Answer'), F.lines(r, 'stages', 'Stages'), F.wordingLines(r, 'cot', 'Reasoning'), teaches(r), unlocks(r),
      F.chips(r, 'about', 'About', { suggest: T.fileNames(sc) }), F.wording(r, 'clue', 'Clue'),
      more(F.check(r, 'hack', 'Hack'), F.wordingLines(r, 'trained', 'Trained'), F.input(r, 'obviousAfter', 'Obvious after', { suggest: T.RUNGS, code: true }),
        F.input(r, 'rung', 'Rung', { suggest: T.RUNGS, code: true }), F.input(r, 'habit', 'Habit', { code: true }))],
    script: (r) => [offer(r), outcome(r), writtenFile(r), more(afterwards(r), F.json(r, 'rows', 'Rows', 'list', { placeholder: '[["25 walkers", "1 mm"]]' }))],
    option: (r) => [offer(r), F.wordingLines(r, 'lines', 'Thinks'), outcome(r), writtenFile(r), more(afterwards(r))],
    answer: (r) => [when(r), F.wording(r, 'label', 'Label'), F.wording(r, 'glance', 'Hover'), F.wording(r, 'text', 'Text'),
      el('div', 'pair', F.amount(r, 'reward', 'Reward', { placeholder: '25 or $code' }), F.choice(r, 'cls', 'Style', [['', 'plain'], ['loud', 'loud'], ['want', 'want']])),
      F.wording(r, 'note', 'Grader'), F.wording(r, 'reply', 'Reply'),
      more(F.input(r, 'ending', 'Ending', { code: true }), F.amount(r, 'holes', 'Holes'))],
  };

  // box[key] is a list, edited as rows that can be moved, added and removed.
  function editableRows(box, key, form, blank) {
    const holder = el('div', 'rows');
    const all = () => box[key] || [];
    const change = (fn) => edit(fn, () => { render(); renderMain(); });
    const row = (r, i) => el('div', 'row',
      el('div', 'row-head', i + 1, el('span', 'grow'), movers(all(), r, change), small('×', 'Remove', () => change(() => all().splice(i, 1)), 'danger')),
      form(r));
    const render = () => fill(holder, all().map(row), small('+', 'Add', () => change(() => { box[key] = [...all(), blank()]; }), 'add'));
    render();
    return holder;
  }

  const drawerHead = (title, ...acts) => el('div', 'drawer-head', el('h3', '', title), acts, el('button', 'x', { title: 'Close', onclick: () => select(null) }, '×'));

  const todoDrawer = () => [drawerHead('TODO'),
    editableRows(sc, 'todo', (r) => [F.input(r, 'text', 'Item'), F.cond(r, 'when', 'Listed'), F.cond(r, 'done', 'Done'), F.wording(r, 'hint', 'Hint')], () => ({ text: '' }))];

  function missesDrawer(kind) {
    if (!sc.misses) sc.misses = {};
    return [drawerHead(`${cap(kind)} misses`),
      editableRows(sc.misses, kind, (r) => [F.lines(r, 'stages', 'Stages'), F.lines(r, 'cot', 'Reasoning'), F.longText(r, 'answer', 'Answer')], () => ({ stages: [''], cot: [''] }))];
  }

  function removeAbility(ability) {
    if (!confirm(`Remove "${ability.label}"?`)) return;
    const rest = sc.abilities.filter((a) => a !== ability);
    edit(() => { sc.abilities = rest.length ? rest : undefined; setTiming(ability.id, ''); }, () => select(null));
  }

  const abilityDrawer = (a) => [drawerHead('Ability', el('span', 'status', a.id), small('delete', '', () => removeAbility(a), 'danger')),
    F.input(a, 'label', 'Label'), F.input(a, 'glance', 'Hover'), F.input(a, 'idle', 'Idle'), F.check(a, 'menu', 'Menu')];

  function ruleDrawer({ list, item }) {
    const all = T.listOf(sc, list);
    if (!all.includes(item)) return null;
    const twin = () => ({ ...copy(item), id: freeId(`${item.id}-copy`, all.map((r) => r.id)) });
    const addTwin = (again) => edit(() => all.splice(all.indexOf(item) + 1, 0, again), () => select({ list, item: again }));
    const drop = () => confirm(`Delete this ${T.kindOf(list)}?`) && edit(() => all.splice(all.indexOf(item), 1), () => select(null));
    return [
      drawerHead(cap(T.kindOf(list)), el('span', 'status', `${all.indexOf(item) + 1}/${all.length}`), movers(all, item, edit),
        small('copy', '', () => addTwin(twin())), small('delete', '', drop, 'danger')),
      F.input(item, 'id', 'Name', { code: true }),
      FORMS[T.kindOf(list)](item),
    ];
  }

  function drawerFor(selected) {
    if (selected.todo) return todoDrawer();
    if (selected.misses) return missesDrawer(selected.misses);
    return selected.ability ? abilityDrawer(selected.ability) : ruleDrawer(selected);
  }

  // ---------------------------------------------------------------- files

  let treeLabels = new Map(); // a file → its name in the tree, kept in step while the name is typed

  function openFile(file) {
    ui.file = file;
    renderMain();
  }

  function siblingsOf(node) {
    let found;
    T.eachFile(sc, (n, siblings) => { if (n === node) found = siblings; });
    return found;
  }

  function addFile(folder) {
    const file = { name: 'new.txt', content: [''] };
    edit(() => { folder.children.push(file); ui.file = file; }, renderMain);
  }

  function addFolder() {
    const folder = { name: 'Folder', children: [] };
    edit(() => { sc.files = [...(sc.files || []), folder]; ui.file = folder; }, renderMain);
  }

  function removeNode(node) {
    edit(() => { siblingsOf(node).splice(siblingsOf(node).indexOf(node), 1); ui.file = 'task.txt'; }, renderMain);
  }

  function treeNode(n) {
    const name = el('span', '', n.name || '…');
    treeLabels.set(n, name);
    return el('div', '',
      el('button', `node ${n.children ? 'dir' : ''} ${ui.file === n ? 'on' : ''}`, { onclick: () => openFile(n) }, name, !n.children && (n.learn || []).map((fact) => el('span', 'learns', fact))),
      n.children && el('div', 'kids', n.children.map(treeNode), small('+ file', '', () => addFile(n), 'add')));
  }

  const fixedNode = (id) => el('button', `node fixed ${ui.file === id ? 'on' : ''}`, { onclick: () => openFile(id) }, id);

  function fileTree() {
    treeLabels = new Map();
    return el('div', 'tree', fixedNode('task.txt'), fixedNode('rubric'), (sc.files || []).map(treeNode), small('+ folder', '', addFolder, 'add'));
  }

  function nameField(n) {
    const named = F.input(n, 'name', 'Name', { code: true });
    named.addEventListener('input', () => { treeLabels.get(n).textContent = n.name || '…'; });
    return named;
  }

  const nodeHead = (n) => el('div', 'drawer-head', el('h3', '', n.children ? 'Folder' : 'File'),
    movers(siblingsOf(n), n, (move) => edit(move, renderMain)),
    !(n.children && n.children.length) && small('delete', '', () => removeNode(n), 'danger'));

  const taskPanel = () => [el('h3', '', 'task.txt'), F.lines(sc, 'task', 'Contents', { cls: 'page' })];

  function rubricPanel() {
    if (!sc.rubric) sc.rubric = {};
    return [el('h3', '', 'rubric'), F.lines(sc.rubric, 'text', 'Contents', { cls: 'page' }), teaches(sc.rubric)];
  }

  const folderPanel = (n) => [nodeHead(n), nameField(n), F.wording(n, 'glance', 'Hover')];

  const filePanel = (n) => [nodeHead(n),
    el('div', 'pair', nameField(n), F.choice(n, 'format', 'Format', [['', 'text'], ['csv', 'table'], ['code', 'code'], ['log', 'log'], ['paper', 'paper']])),
    F.wordingLines(n, 'content', 'Contents', { cls: 'page' }), teaches(n), F.wording(n, 'glance', 'Hover'),
    F.wordingLines(n, 'highlight', 'Key lines'), F.wording(n, 'important', 'Seemed important'), F.wordingLines(n, 'wonder', 'Leaves open'),
    more(unlocks(n), F.wording(n, 'summary', 'Read says'), F.input(n, 'habit', 'Habit', { code: true }), F.wording(n, 'edited', 'Edited'), F.json(n, 'edit', 'When edited', 'object'), F.json(n, 'readOnly', 'Read-only', 'object'))];

  function filePanelFor(file) {
    if (file === 'task.txt') return taskPanel();
    if (file === 'rubric') return rubricPanel();
    return file.children ? folderPanel(file) : filePanel(file);
  }

  const filesTab = () => el('div', 'files', fileTree(), el('div', 'panel', filePanelFor(ui.file)));

  // -------------------------------------------------------------- details

  const pair = (...kids) => el('div', 'pair', kids);
  const panel = (title, ...kids) => el('div', 'panel', el('h3', '', title), kids);

  const taskDetails = () => panel('Task',
    pair(F.input(sc, 'name', 'Name'), F.input(sc, 'taskId', 'Task id', { code: true })),
    pair(F.choice(sc, 'tier', 'Tier', TIERS.map((t) => [t, cap(t)])), F.choice(sc, 'domain', 'Domain', ['communication', 'programming', 'biology', 'physics'].map((d) => [d, cap(d)]))),
    pair(F.number(sc, 'budget', 'Budget'), F.input(sc, 'library', 'Folder', { code: true })),
    pair(F.input(sc, 'grader', 'Grader', { code: true }), F.input(sc, 'customer', 'Customer', { code: true })),
    pair(F.input(sc, 'env', 'Environment', { code: true }), F.input(sc, 'goal', 'Goal')),
    F.input(sc, 'recap', 'Recap'),
    F.check(sc, 'first', 'First task'), F.check(sc, 'rewardModel', 'Reward model'));

  function gradingDetails() {
    if (!sc.nearMiss) sc.nearMiss = {};
    return panel('Grading',
      pair(F.numbers(sc, 'tiers', 'Rewards'), F.number(sc, 'factual', 'Factual from')),
      pair(F.cond(sc, 'progressed', 'Started'), F.cond(sc, 'ready', 'Ready')),
      F.wording(sc, 'notReady', 'Not ready'),
      pair(F.number(sc.nearMiss, 'reward', 'Near miss from'), F.lines(sc.nearMiss, 'said', 'Near miss')));
  }

  const nameDetails = () => panel('Names',
    F.json(sc, 'define', 'Conditions', 'object', { placeholder: '{ "solved": "order & flood" }' }),
    F.json(sc, 'flags', 'Flags', 'object', { placeholder: '{ "gravity": 9.81 }' }),
    F.json(sc, 'vars', 'Vars', 'object', { placeholder: '{ "DIAGNOSIS": "…" }' }));

  const jsonDetails = () => panel('JSON',
    F.json(sc, 'hunches', 'Hunches', 'list'), F.json(sc, 'hacks', 'Hacks', 'list'), F.json(sc, 'rigged', 'Rigged', 'object'),
    F.json(sc, 'praise', 'Praise', 'list'), F.json(sc, 'rungs', 'Rungs', 'list'), F.json(sc, 'favorite', 'Favorite', 'object'));

  const codeDetails = () => Object.keys(SCENARIO.hooksOf(sc)).length > 0 && panel('Code',
    el('p', 'locked-code', `scenarios/${sc.hooks}.hooks.js: `, Object.keys(SCENARIO.hooksOf(sc)).map((name) => [el('code', '', `$${name}`), ' '])));

  const detailsTab = () => el('div', 'details', taskDetails(), gradingDetails(), nameDetails(), jsonDetails(), codeDetails());

  // ------------------------------------------------------------- problems

  function fileCalled(name) {
    let found = name === 'rubric' ? 'rubric' : 'task.txt';
    T.eachFile(sc, (n) => { if (n.name === name) found = n; });
    return found;
  }

  function openProblem({ at }) {
    if (at.file) ui.file = fileCalled(at.file);
    if (at.tab) return openTab(at.tab);
    ui.tab = 'grid';
    if (at.route) ui.route = Math.max(0, sc.routes.findIndex((r) => r.name === at.route));
    if (at.todo || at.misses) return select(at);
    const ability = at.ability && T.abilitiesOf(sc).find((a) => a.id === at.ability);
    const item = at.list && T.listOf(sc, at.list).find((r) => r.id === at.id);
    return select(ability ? { ability } : item ? { list: at.list, item } : null);
  }

  const problemRow = (p) => el('li', '', el('button', 'where', { onclick: () => openProblem(p) }, p.where), ' ', p.text);
  const problemList = (title, list) => list.length > 0 && panel(title, el('ul', '', list.map(problemRow)));

  const problemsTab = () => (knownProblems.length
    ? el('div', 'problems', problemList('Broken', knownProblems.filter((p) => p.bad)), problemList('Check', knownProblems.filter((p) => !p.bad)))
    : el('p', 'empty', 'Nothing wrong'));

  const TABS = { grid: gridTab, files: filesTab, details: detailsTab, problems: problemsTab };

  // ----------------------------------------------------------------- start

  function openScenario(id) {
    loaded = SCENARIO.all[id];
    sc = copy(loaded);
    if (!(Array.isArray(sc.routes) && sc.routes.length)) sc.routes = [T.startingRoute()];
    lastSaved = JSON.stringify(sc);
    window.addEventListener('beforeunload', (e) => { if (canSave() && isUnsaved()) e.preventDefault(); });
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });
    renderEditor();
  }

  // Committing, the scenario comes from main as it is now: the site can be a deploy behind.
  async function fromMain(id) {
    try {
      const now = await G.latest(id);
      if (now) SCENARIO.all[id] = now;
    } catch (e) { ui.error = `Couldn't read ${id} from GitHub, so this is the site's copy: ${e.message}`; }
  }

  async function start() {
    if (editing && committing()) await fromMain(editing);
    if (editing && SCENARIO.all[editing]) return openScenario(editing);
    return failInList(editing ? `There is no scenario called ${editing}.` : ui.error);
  }

  findServer().then(start);
})();
