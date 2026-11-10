// The scenario editor's server:  node tools/serve.js [port]  then http://localhost:8000/scenario
// Serves the game from this folder, on this computer only; saving rewrites files in scenarios/.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { scenario, index } = require('./scenario-file.js');

const ROOT = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');
const PORT = Number(process.argv[2]) || 8000;
const MAX_BODY = 4 * 1024 * 1024;
const VALID_ID = /^[a-z][a-z0-9-]{0,39}$/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

class Refused extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const fileOf = (id) => path.join(SCENARIOS_DIR, `${id}.js`);
const hooksFileOf = (id) => path.join(SCENARIOS_DIR, `${id}.hooks.js`);
const indexFile = path.join(SCENARIOS_DIR, 'index.js');

function readIndex() {
  try { return index.parse(fs.readFileSync(indexFile, 'utf8')); } catch (e) { throw new Refused(500, `scenarios/index.js can't be read: ${e.message}`); }
}

// Beside the file, then moved into place: a crash never leaves half a scenario.
function writeAtomically(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

function checkedId(id) {
  if (!VALID_ID.test(id) || id === 'index') throw new Refused(400, 'An id is lowercase letters, digits and hyphens, starting with a letter.');
  return id;
}

// `was`: the scenario as the editor loaded it. If the file says something else now, someone else changed it.
function changedSince(id, was) {
  if (was === undefined || !fs.existsSync(fileOf(id))) return false;
  try { return JSON.stringify(scenario.parse(fs.readFileSync(fileOf(id), 'utf8'))) !== JSON.stringify(was); } catch (e) { return true; }
}

function save(id, { scenario: sc, was }) {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) throw new Refused(400, 'A scenario is a JSON object.');
  if (sc.id !== id) throw new Refused(400, `This scenario's id is "${sc.id}", not "${id}".`);
  const list = readIndex();
  if (changedSince(id, was)) throw new Refused(409, `scenarios/${id}.js has changed on disk since you opened it. Reload to see it, or Save again to overwrite it.`);
  writeAtomically(fileOf(id), scenario.format(sc));
  if (!list.order.includes(id)) writeAtomically(indexFile, index.format({ ...list, order: [...list.order, id] }));
  return { saved: `scenarios/${id}.js` };
}

function remove(id) {
  const list = readIndex();
  if (!list.order.includes(id)) throw new Refused(404, `No scenario called ${id}.`);
  if (fs.existsSync(hooksFileOf(id))) throw new Refused(409, `${id} has code in scenarios/${id}.hooks.js. Remove it by hand, with its entries in scenarios/index.js.`);
  writeAtomically(indexFile, index.format({ ...list, order: list.order.filter((x) => x !== id) }));
  fs.rmSync(fileOf(id), { force: true });
  return { removed: id };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Refused(413, 'Too big.')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new Refused(400, 'Not JSON.')); }
    });
    req.on('error', reject);
  });
}

// Only this computer's own pages may change files: the Host must be this server, and a JSON body
// can't be sent from another site without a preflight this server never answers.
function refuseOtherSites(req) {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || '')) throw new Refused(403, 'This server answers to localhost only.');
  if (req.method !== 'GET' && req.method !== 'HEAD' && !/^application\/json\b/.test(req.headers['content-type'] || '')) throw new Refused(415, 'Send JSON.');
}

async function api(req, url) {
  const [, , what, id] = url.pathname.split('/');
  if (what !== 'scenarios') throw new Refused(404, 'No such thing.');
  if (!id && req.method === 'GET') return readIndex();
  if (id && req.method === 'PUT') return save(checkedId(id), await readJsonBody(req));
  if (id && req.method === 'DELETE') return remove(checkedId(id));
  throw new Refused(405, 'Not that way.');
}

function wantedFile(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (e) { throw new Refused(400, 'Not a path.'); }
  const wanted = path.normalize(path.join(ROOT, pathname));
  const inside = wanted === ROOT || wanted.startsWith(ROOT + path.sep);
  const hidden = path.relative(ROOT, wanted).split(path.sep).some((part) => part.startsWith('.'));
  if (!inside || hidden || !fs.existsSync(wanted)) throw new Refused(404, 'Not found.');
  return wanted;
}

function serveFile(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new Refused(405, 'Read only.');
  const wanted = wantedFile(url);
  const isFolder = fs.statSync(wanted).isDirectory();
  if (isFolder && !url.pathname.endsWith('/')) return res.writeHead(302, { Location: `${url.pathname}/${url.search}` }).end();
  const file = isFolder ? path.join(wanted, 'index.html') : wanted;
  if (!fs.existsSync(file)) throw new Refused(404, 'Not found.');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  return fs.createReadStream(file).pipe(res);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    refuseOtherSites(req);
    const url = new URL(req.url, 'http://localhost');
    return url.pathname.startsWith('/api/') ? sendJson(res, 200, await api(req, url)) : serveFile(req, res, url);
  } catch (e) {
    if (!(e instanceof Refused)) console.error(e);
    return sendJson(res, e.status || 500, { error: e instanceof Refused ? e.message : 'Something broke; see the terminal.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Highly Persistent, with the scenario editor:\n\n  game      http://localhost:${PORT}/\n  editor    http://localhost:${PORT}/scenario\n\nSaving in the editor rewrites files in scenarios/. Ctrl+C to stop.`);
});
