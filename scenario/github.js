// Saving without tools/serve.js (the deployed site): each Save is one commit to main on GitHub,
// made with a token the person pastes in once. It keeps the server's rules: a file that changed
// since it was opened isn't overwritten unasked, and a scenario with hooks isn't deleted here.
(function () {
  'use strict';

  const REPO = 'Raemon/ai-v-ai';
  const BRANCH = 'main';
  const TOKEN_KEY = 'scenario-editor.github';
  const FILE = SCENARIO_FILE;
  const INDEX = 'scenarios/index.js';
  const fileOf = (id) => `scenarios/${id}.js`;
  const hooksFileOf = (id) => `scenarios/${id}.hooks.js`;

  const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
  const repoUrl = `https://github.com/${REPO}`;

  // { token, login } in this browser only; private windows may not keep it.
  function stored() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null; } catch (e) { return null; }
  }
  function store(value) {
    try { value ? localStorage.setItem(TOKEN_KEY, JSON.stringify(value)) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* kept for this page only */ }
  }
  let account = stored();

  const refused = (status, message) => Object.assign(new Error(message), { status });

  async function gh(method, path, body, { token = account && account.token, raw = false } = {}) {
    const res = await fetch(`https://api.github.com/${path}`, {
      method,
      headers: {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    });
    if (res.ok) return raw ? res.text() : res.json();
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw refused(401, 'GitHub turned the token down. Disconnect and connect again with a new one.');
    if (res.status === 403 && method !== 'GET') throw refused(403, `This token can't write to ${REPO}: it needs Contents "Read and write".`);
    throw refused(res.status, `GitHub answered ${res.status}${data.message ? `: ${data.message}` : ''}.`);
  }

  const repo = (path) => `repos/${REPO}/${path}`;
  const encodePath = (file) => file.split('/').map(encodeURIComponent).join('/');

  // A file's text at a commit, or null if it isn't there.
  const readAt = (sha) => (file) => gh('GET', repo(`contents/${encodePath(file)}?ref=${sha}`), null, { raw: true })
    .catch((e) => { if (e.status === 404) return null; throw e; });

  const headSha = async () => (await gh('GET', repo(`git/ref/heads/${BRANCH}`))).object.sha;

  // `change(read)` reads files at the head of main and says what to write ({ path: text, or null to
  // delete }). If main moves before the commit lands, it's worked out again on the new head.
  async function commit(message, change) {
    for (let tries = 0; ; tries++) {
      const head = await headSha();
      const files = await change(readAt(head));
      const base = await gh('GET', repo(`git/commits/${head}`));
      const tree = await gh('POST', repo('git/trees'), {
        base_tree: base.tree.sha,
        tree: Object.entries(files).map(([path, text]) => ({ path, mode: '100644', type: 'blob', ...(text === null ? { sha: null } : { content: text }) })),
      });
      const made = await gh('POST', repo('git/commits'), { message, tree: tree.sha, parents: [head] });
      try {
        await gh('PATCH', repo(`git/refs/heads/${BRANCH}`), { sha: made.sha });
        return { commit: made.html_url };
      } catch (e) {
        if (e.status !== 422 || tries >= 2) throw e; // 422: main moved on; anything else is real
      }
    }
  }

  const readIndex = async (read) => {
    const text = await read(INDEX);
    if (text === null) throw refused(500, `${INDEX} isn't on ${BRANCH}.`);
    return FILE.index.parse(text);
  };

  // `was`: the scenario as the editor loaded it; none for a new one; null to overwrite whatever is there.
  function conflict(id, was, text) {
    if (was === null || text === null) return null;
    if (was === undefined) return `There is already a ${fileOf(id)}.`;
    let now = null;
    try { now = FILE.scenario.parse(text); } catch (e) { /* unreadable: treat as changed */ }
    return JSON.stringify(now) === JSON.stringify(was) ? null : `${fileOf(id)} has changed on GitHub since you opened it. Reload to see it, or Save again to overwrite it.`;
  }

  const save = (id, { scenario: sc, was }) => commit(`Scenario ${id}: saved from the scenario editor`, async (read) => {
    const [list, text] = await Promise.all([readIndex(read), read(fileOf(id))]);
    const clash = conflict(id, was, text);
    if (clash) throw refused(409, clash);
    const files = { [fileOf(id)]: FILE.scenario.format(sc) };
    if (!list.order.includes(id)) files[INDEX] = FILE.index.format({ ...list, order: [...list.order, id] });
    return files;
  });

  const remove = (id) => commit(`Scenario ${id}: deleted in the scenario editor`, async (read) => {
    const [list, hooks] = await Promise.all([readIndex(read), read(hooksFileOf(id))]);
    if (!list.order.includes(id)) throw refused(404, `No scenario called ${id}.`);
    if (hooks !== null) throw refused(409, `${id} has code in ${hooksFileOf(id)}. Remove it by hand, with its entries in ${INDEX}.`);
    return { [INDEX]: FILE.index.format({ ...list, order: list.order.filter((x) => x !== id) }), [fileOf(id)]: null };
  });

  // The scenario as main has it now: the site can be a deploy behind a Save.
  async function latest(id) {
    const text = await readAt(BRANCH)(fileOf(id));
    return text === null ? null : FILE.scenario.parse(text);
  }

  async function connect(token) {
    const user = await gh('GET', 'user', null, { token });
    await gh('GET', `repos/${REPO}`, null, { token }); // can it see the repo at all?
    account = { token, login: user.login };
    store(account);
    return account;
  }

  function disconnect() {
    account = null;
    store(null);
  }

  window.GITHUB_SAVE = {
    REPO, BRANCH, NEW_TOKEN_URL, repoUrl,
    account: () => account,
    connect, disconnect, save, remove, latest,
  };
})();
