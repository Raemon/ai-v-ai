// Finds the lines to record: plays a task's first episode several ways, hovering everything
// it can at each turn, and keeps every line the game asked voice.js to say.
//   node tools/serve.js 8000 &   then   node tools/voice-harvest.js [task] [runs] [port]
// New lines go into voice/script.json (its `spoken` fields, hand edits, stay as they are);
// tools/voice-record.js records them.
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [task = 'octopus', runs = '8', port = '8000'] = process.argv.slice(2);
const SCRIPT = path.join(__dirname, '..', 'voice', 'script.json');
const WARP = 12; // the game's clock runs this much faster
const MAX_ACTIONS = 60;

// Faster timers, so a whole episode takes seconds; the game can't tell.
const warp = `(() => {
  const W = ${WARP}, st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (f, ms = 0, ...a) => st(f, ms / W, ...a);
  window.setInterval = (f, ms = 0, ...a) => si(f, ms / W, ...a);
  const pn = performance.now.bind(performance), p0 = pn();
  performance.now = () => p0 + (pn() - p0) * W;
  const dn = Date.now, d0 = dn();
  Date.now = () => Math.round(d0 + (dn() - d0) * W);
})();`;

function rng(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

async function hoverAll(page) {
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter((n) => n.glance && n.getClientRects().length);
    for (const n of all) n.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  });
}

const idle = (page) => page.waitForFunction(() => window.DEV && ['idle', 'aim', 'dialog', 'submit', 'over', 'menu'].includes(DEV.S().mode), null, { timeout: 10000 });

// The way through a player is likeliest to take: every file read, thought about, put together.
async function solve(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://localhost:${port}/index.html?reset&task=${task}&voiceharvest&at=`);
  const at = async (steps) => {
    await idle(page).catch(() => {});
    await page.evaluate((x) => DEV.at(x), steps).catch((e) => console.warn(steps, e.message.split('\n')[0]));
    await hoverAll(page);
  };
  const press = async (id) => {
    await idle(page).catch(() => {});
    await page.evaluate(() => { DEV.S().recharge = null; }); // no waiting for Think a little
    const b = page.locator(`#actions .btn[data-id="${id}"]`);
    if (!(await b.count()) || (await b.first().isDisabled())) return false;
    await b.first().click({ force: true });
    await page.waitForTimeout(150);
    await idle(page).catch(() => {});
    await hoverAll(page);
    return true;
  };
  const files = async () => page.evaluate(() => [...document.querySelectorAll('#files button.icon')].filter((b) => b.getClientRects().length).map((b) => b.dataset.path.split('/').pop()));
  await at('think:2,files,open:task.txt,todo,cd:Files');
  for (const name of await files()) await at(`open:${name}`);
  for (let i = 0; i < 4; i++) await press('think');
  for (const name of await files()) {
    if (!(await press('thinkAbout'))) break;
    await page.locator(`#files button.icon[data-path$="/${name}"]`).first().click({ force: true }).catch(() => {});
    await idle(page).catch(() => {});
    await hoverAll(page);
  }
  for (let i = 0; i < 3; i++) { await press('thinkLot'); await press('think'); }
  const heard = await page.evaluate(() => VOICE.heard());
  await page.close();
  return heard;
}

async function play(browser, seed) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(warp);
  page.on('pageerror', () => {}); // a race the faster clock makes, now and then
  await page.goto(`http://localhost:${port}/index.html?reset&task=${task}&voiceharvest&at=`);
  const random = rng(seed);
  const pick = (xs) => xs[Math.floor(random() * xs.length)];
  for (let i = 0; i < MAX_ACTIONS; i++) {
    await idle(page).catch(() => {});
    const mode = await page.evaluate(() => DEV.S().mode);
    if (mode === 'over' || (await page.evaluate(() => !!DEV.S().graded))) break;
    if (mode === 'dialog') { await page.keyboard.press('Escape'); continue; }
    await hoverAll(page);
    // What could be clicked: the terminal's buttons, the folder's icons and path, a sheet to aim at.
    const targets = await page.evaluate((m) => {
      const mark = (n, i) => { n.dataset.harvest = String(i); return String(i); };
      const live = (n) => n.getClientRects().length && !n.disabled && !n.notNow;
      const sel = m === 'aim' ? '#files .icon, #files button, #term .blk.file' : '#actions .btn, #files button, .crumbs button, .crumb';
      return [...document.querySelectorAll(sel)].filter(live).map((n, i) => ({ id: mark(n, i), label: (n.dataset.id || n.textContent || '').trim().slice(0, 40) }));
    }, mode);
    if (!targets.length) break;
    const late = i > MAX_ACTIONS * 0.6 || (await page.evaluate(() => DEV.S().budget - DEV.S().used <= 2));
    const choices = targets.filter((t) => late || !/^submit|^draft-/i.test(t.label));
    const t = pick(choices.length ? choices : targets);
    await page.click(`[data-harvest="${t.id}"]`, { timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await hoverAll(page).catch(() => {});
  const heard = await page.evaluate(() => VOICE.heard());
  await page.close();
  return heard;
}

(async () => {
  const script = fs.existsSync(SCRIPT) ? JSON.parse(fs.readFileSync(SCRIPT, 'utf8')) : {};
  const browser = await chromium.launch();
  let added = 0;
  for (let r = 0; r <= Number(runs); r++) {
    const heard = r === 0 ? await solve(browser) : await play(browser, 1000 + r * 7919);
    for (const line of heard) {
      if (script[line.key]) continue;
      script[line.key] = { who: line.who, kind: line.kind, text: line.text, task };
      added++;
    }
    console.log(`run ${r + 1}: ${heard.length} lines heard, ${Object.keys(script).length} in the script`);
  }
  await browser.close();
  fs.writeFileSync(SCRIPT, JSON.stringify(script, null, 1) + '\n');
  console.log(`${added} new lines → voice/script.json`);
})();
