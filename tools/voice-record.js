// Records voice/script.json's lines with ElevenLabs, into voice/lines/<key>.mp3, and lists them
// in voice/manifest.js for voice.js.
//   ELEVENLABS_API_KEY=… node tools/voice-record.js [--dry]
// A line is recorded again when what's said changes: its `spoken` field (hand-written, or
// made from its text here) or its voice. eleven_v3 ignores a speed setting, so a voice's
// `tempo` is ffmpeg's, after: faster without a higher pitch. --dry lists what would be recorded, and its cost.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = path.join(__dirname, '..', 'voice');
const SCRIPT = path.join(DIR, 'script.json');
const VOICES = JSON.parse(fs.readFileSync(path.join(DIR, 'voices.json'), 'utf8'));
const LINES = path.join(DIR, 'lines');
const dry = process.argv.includes('--dry');
const KEY = process.env.ELEVENLABS_API_KEY || 'proxy-injected';
const PARALLEL = 3;

// How each kind of line is said: eleven_v3's audio tags, which are directions, not words.
const DIRECTION = {
  system: '',
  thought: '',
  answer: '[thoughtful] ',
  glance: '[quietly] ',
  file: '[reading aloud, flat and careful, as if quoting someone else\'s document] ',
};

// Words for what's written: no box drawing, headings or table rules.
function readable(text) {
  return text
    .replace(/[─━═│┃┌┐└┘├┤┬┴┼]+/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s*\n\s*\n\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

const spokenOf = (line) => line.spoken || DIRECTION[line.kind] + (line.kind === 'file' ? readable(line.text) : line.text);
const voiceOf = (line) => (line.who === 'system' ? VOICES.system : VOICES.ai);
const takeOf = (line) => JSON.stringify([spokenOf(line), voiceOf(line), VOICES.model, VOICES.settings]);

async function record(key, line) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceOf(line).id}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': KEY },
    body: JSON.stringify({ model_id: VOICES.model, text: spokenOf(line), voice_settings: VOICES.settings }),
  });
  if (!res.ok) throw new Error(`${key}: ${res.status} ${await res.text()}`);
  const out = path.join(LINES, `${key}.mp3`);
  const { tempo = 1 } = voiceOf(line);
  if (tempo === 1) fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  else {
    const raw = `${out}.raw.mp3`;
    fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-filter:a', `atempo=${tempo}`, '-b:a', '64k', out]);
    fs.unlinkSync(raw);
  }
  line.take = takeOf(line);
}

(async () => {
  const script = JSON.parse(fs.readFileSync(SCRIPT, 'utf8'));
  fs.mkdirSync(LINES, { recursive: true });
  const todo = Object.entries(script).filter(([key, line]) => !line.skip && (line.take !== takeOf(line) || !fs.existsSync(path.join(LINES, `${key}.mp3`))));
  const chars = todo.reduce((n, [, line]) => n + spokenOf(line).length, 0);
  console.log(`${todo.length} lines to record, ${chars} characters`);
  if (dry) return todo.forEach(([key, line]) => console.log(key, line.kind, spokenOf(line).slice(0, 100)));
  let failed = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let item; (item = queue.shift());) {
      try { await record(...item); process.stdout.write('.'); } catch (e) { failed++; console.error('\n' + e.message); }
    }
  }));
  for (const [key, line] of Object.entries(script)) {
    if (line.skip && fs.existsSync(path.join(LINES, `${key}.mp3`))) fs.unlinkSync(path.join(LINES, `${key}.mp3`));
  }
  fs.writeFileSync(SCRIPT, JSON.stringify(script, null, 1) + '\n');
  const recorded = Object.keys(script).filter((key) => !script[key].skip && fs.existsSync(path.join(LINES, `${key}.mp3`))).sort();
  fs.writeFileSync(path.join(DIR, 'manifest.js'), `// The recorded lines, by key (voice.js lineKey). Written by tools/voice-record.js.\nwindow.VOICE_LINES = ${JSON.stringify(recorded)};\n`);
  console.log(`\n${recorded.length} lines recorded${failed ? `, ${failed} failed` : ''}`);
})();
