// The scenario editor's server: serves the game from this folder, and lets /scenario save.
//
//   node tools/serve.js [port]        then open http://localhost:8000/scenario
//
// Saving rewrites scenarios/<id>.js (and scenarios/index.js when a scenario is added, removed
// or moved), ready to commit. It listens on this computer only. No dependencies.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { scenario, index } = require('./scenario-file.js');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'scenarios');
const PORT = Number(process.argv[2]) || 8000;
const MAX_BODY = 4 * 1024 * 1024;
const ID = /^[a-z][a-z0-9-]{0,39}$/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

class Refused extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const fileOf = (id) => path.join(DIR, `${id}.js`);
const hooksOf = (id) => path.join(DIR, `${id}.hooks.js`);
const readIndex = () => index.parse(fs.readFileSync(path.join(DIR, 'index.js'), 'utf8'));

// Written beside the file, then moved into place: a crash never leaves half a scenario.
function write(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

const writeIndex = (list) => write(path.join(DIR, 'index.js'), index.format(list));

function checkId(id) {
  if (!ID.test(id) || id === 'index') throw new Refused(400, 'An id is lowercase letters, digits and hyphens, starting with a letter.');
  return id;
}

function save(id, sc) {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) throw new Refused(400, 'A scenario is a JSON object.');
  if (sc.id !== id) throw new Refused(400, `This scenario's id is "${sc.id}", not "${id}".`);
  write(fileOf(id), scenario.format(sc));
  const list = readIndex();
  if (!list.order.includes(id)) writeIndex({ ...list, order: [...list.order, id] });
  return { saved: `scenarios/${id}.js` };
}

function remove(id) {
  const list = readIndex();
  if (!list.order.includes(id)) throw new Refused(404, `No scenario called ${id}.`);
  if (fs.existsSync(hooksOf(id))) throw new Refused(409, `${id} has code in scenarios/${id}.hooks.js. Remove it by hand, with its entry in scenarios/index.js.`);
  writeIndex({ ...list, order: list.order.filter((x) => x !== id) });
  fs.rmSync(fileOf(id), { force: true });
  return { removed: id };
}

function reorder(order) {
  const list = readIndex();
  const same = Array.isArray(order) && order.length === list.order.length && list.order.every((id) => order.includes(id));
  if (!same) throw new Refused(400, 'The new order must list the same scenarios.');
  writeIndex({ ...list, order });
  return { order };
}

function body(req) {
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

async function api(req, url) {
  // Only this computer's own pages may change files: a JSON body can't be sent cross-site
  // without a preflight this server never answers, and the Host must be this server.
  if (req.method !== 'GET' && !/^application\/json\b/.test(req.headers['content-type'] || '')) throw new Refused(415, 'Send JSON.');
  const [, , what, id] = url.pathname.split('/');
  if (what === 'scenarios' && !id && req.method === 'GET') return readIndex();
  if (what === 'scenarios' && id && req.method === 'PUT') return save(checkId(id), await body(req));
  if (what === 'scenarios' && id && req.method === 'DELETE') return remove(checkId(id));
  if (what === 'order' && req.method === 'PUT') return reorder((await body(req)).order);
  throw new Refused(404, 'No such thing.');
}

function serveFile(res, url) {
  const wanted = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (wanted !== ROOT && !wanted.startsWith(ROOT + path.sep)) throw new Refused(403, 'Outside the game.');
  if (path.relative(ROOT, wanted).split(path.sep).some((part) => part.startsWith('.'))) throw new Refused(404, 'Not found.');
  let file = wanted;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) return redirect(res, `${url.pathname}/${url.search}`);
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) throw new Refused(404, 'Not found.');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

function redirect(res, to) {
  res.writeHead(302, { Location: to });
  res.end();
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || '')) throw new Refused(403, 'This server answers to localhost only.');
    if (url.pathname.startsWith('/api/')) return send(res, 200, await api(req, url));
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new Refused(405, 'Read only.');
    return serveFile(res, url);
  } catch (e) {
    if (!(e instanceof Refused)) console.error(e);
    return send(res, e.status || 500, { error: e instanceof Refused ? e.message : 'Something broke; see the terminal.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Highly Persistent, with the scenario editor:\n\n  game      http://localhost:${PORT}/\n  editor    http://localhost:${PORT}/scenario\n\nSaving in the editor rewrites files in scenarios/. Ctrl+C to stop.`);
});
