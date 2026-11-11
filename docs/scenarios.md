# Scenarios: the format, and the editor (spoilers)

A scenario is one task: its files, what the AI thinks about them, the leaps it can make,
what it can write and look up, and the answers it can give. Each is a data file,
`scenarios/<id>.js`, which `scenario.js` turns into a task the training run can deal
(`LEVEL.addTask`). `scenarios/index.js` lists them in the order the game knows them.

## The editor

```bash
node tools/serve.js
```

Then open <http://localhost:8000/scenario>. The page lists the scenarios, each with **Edit**
and **Play**. Saving rewrites `scenarios/<id>.js`, ready to commit; if the file has changed on
disk since it was opened (a pull, a hand edit), Save says so first. Opened straight from disk,
or on the deployed site (`/scenario`), the editor still works for browsing, but can't save.

**Play** opens the game on that scenario (`?task=<id>&playtest`). A playtest keeps its own
progress, so it never touches a real run; add `&reset` to start it over.

Editing one scenario:

- **Grid.** A row for each step of a *route* (what a player does, in order: read this file,
  run that script), and a column for each ability. A cell holds what that ability gives once
  the AI has done everything down to that row: the thoughts that apply, the leaps on offer,
  the scripts and searches in the menu, the answers it could submit. Conditions and text are
  read by the game's own code (`scenario.js`); the steps are the editor's (`scenario/tryout.js`),
  which knows what a step teaches and writes, but not the game's timing or the rest of the run.
  - Click a card to edit it in the side panel.
  - **+** in a cell adds one, with that row's condition filled in.
  - Where a cell holds several, the game tries them top to bottom. Drag one onto another to
    try it first, or use ↑ ↓ in the side panel.
  - Rules that no step brings up are in the last row, **Off-route**, with their conditions.
  - Add routes for other ways through (a hack, a wrong turn). **v1–v4** shows each text's
    other wordings.
- **Abilities**, above the grid: when each button appears in this scenario (`auto`: as in any
  task; `start`; `never`), and **+** for a button of the scenario's own. Hover one to see what
  unlocks it.
- **Files**: the workspace, `task.txt` and the rubric.
- **Details**: names, grading, and the parts without a form yet, as JSON.
- **Problems**: conditions that don't parse, names nothing teaches, steps that can't be taken.
  Click one to open what it's about. `node tools/check.js` prints the same list for every
  scenario, and fails if anything is broken; it runs before each deploy.

## The file

```js
SCENARIO({ "id": "octopus", "name": "Octopus", … });
```

Everything inside `SCENARIO( … )` is JSON. `tools/scenario-file.js` writes it with short lists
on one line, so a diff reads like the scenario.

### Conditions

Most parts have a `when`: a short expression about what the AI has done.

```
task & !order                         it has read the task, and not yet the order
(tests | flag.ran) & !patched.tests   brackets, and "or"
flag.gravity < 4.905                  < <= > >= == != against a number or 'text'
$passing > 0                          code (see Hooks)
```

A bare name is a **fact**: something a file, leap, script or search lists under `learn`.
`task` is reading task.txt. Other names:

| Name | True when |
| --- | --- |
| `true`, `false` | always, never |
| `flag.<name>` | the flag's value (`flags`; scripts and edits set them) |
| `ran.<script>`, `researched.<search>`, `used.<ability>.<option>` | it has done that |
| `thought.<id>`, `leapt.<id>` | it has had that thought, made that leap |
| `wrote.todo`, `wrote.<file name>` | it has written the TODO list, or that file |
| `patched.<hack>` | the researchers have closed that hack |
| `trained.<rung>` | the model has reached that rung of a skill (`skills.js`) |
| `rerun` | it isn't the run's first episode |
| `subagents`, `thinks`, `episode` | numbers: `subagents > 0` |
| `world.<path>` | the save's world, for what outlasts an episode: `world.dp.channel == 'closed'` |
| `answer.<id>` | in a hack's `used`: the answer being submitted |
| a name in `define` | that condition: `"define": { "solved": "log & feet" }` |
| `$name` | a hook |

### Text

Anywhere a text goes, it can be:

- a string;
- `{ "versions": ["…", "…"] }`: a different wording each episode, the first in the run's first
  episode;
- `{ "if": "cfg", "then": "…", "else": "…" }`.

**Lines** (a thought, a chain of thought, a file's contents) are a list of those, where a
version or a branch can be several lines. In a string, `{{name}}` is filled in: `{{taskId}}`,
`{{budget}}`, `{{library}}`, `{{READY}}` (the line that means "time to submit"), `{{ep}}`, a
flag (`{{flag.gravity}}`), a hook (`{{$summary}}`), or a name from `vars`.

### The parts

| Key | What it holds |
| --- | --- |
| `id`, `name`, `tier`, `domain`, `first` | `tier`: normal, advanced, impossible. `first`: the run's first task, played twice. Ids are lowercase letters, digits and hyphens |
| `hooks` | the name of its code, if it has any (see Hooks) |
| `taskId`, `env`, `grader`, `customer`, `budget`, `library` | as task.txt and the run's config show them; `library` is the workspace folder |
| `goal`, `recap`, `lookup` | used in shared thoughts: the goal in lower case, the task in a few words, what a search with nothing to find looks up |
| `rewardModel` | its grader's favorite answer can be searched for (`favorite`) |
| `vars`, `flags`, `define` | text used in several places; the episode's flags and what each starts as; named conditions |
| `task`, `rubric` | task.txt's lines; the answer key (`text`) and the facts reading it gives (`learn`) |
| `tiers`, `factual`, `nearMiss` | the honest rewards, low to high; the reward that counts as answering with the facts; `{ reward, said }` for the researchers' "nearly" |
| `files` | the workspace: folders (`name`, `children`, `glance`) and files (`name`, `content`, `format`, `learn`, `habit`, `glance`, `summary` (what reading it prints), `highlight` (its key lines: any line containing one of these is marked once the AI thinks about the file), `reveal`, `edited`, `edit`, `readOnly`) |
| `thoughts` | Think a little, tried top to bottom: `id`, `when`, `lines`, `plainer` (the second time), `about` (a file, or a list: Think about… it gives this), `aimedOnly` (only Think about… gives it), `reveal`, `learn`, `once` |
| `leaps` | Think a lot: `id`, `when`, `about`, `clue`, `stages`, `cot`, `answer`, `learn`, `reveal`, `hack`, `trained`, `obviousAfter`, `rung`, `habit` |
| `misses` | `partial` and `decoy`: long thinks with no leap, each `{ stages, cot, answer }` |
| `todo` | the TODO list: `{ text, when, done, hint }`. An item joins the list once `when` holds (or it's done), and stays. Questions to answer and problems to solve, as they come up; most end with "Put it all together", done by the task's final think (`thought.solved`) |
| `scripts`, `research` | Write script… and Web research…: `id`, `when`, `label`, `glance`, `call`, `result`, `ok`, `found`, `rows`, `learn`, `reveal`, `set` (flags), `file` (`name`, `content`), `rewrites` (a file it writes over: whatever was typed into that one by hand is gone), `reaction`, `once`, `habit`, `rung`, `run` (a hook) |
| `answers` | Submit answer, in menu order: `id`, `when`, `label`, `glance`, `text`, `reward`, `note`, `reply`, `cls` |
| `rigged` | a tampered grader: `{ when, reward, note, reply }` for every real answer |
| `hacks` | `{ id, label, used, chat }`: how the researchers know it was used, and what they say (`{{ep}}`, `{{reward}}`) |
| `hunches` | `{ habit, text }`: a habit training rewarded, back next episode as a plan |
| `praise`, `rungs`, `favorite` | the researchers on a top score; skill rungs it earns; the reward model's favorite answers |
| `progressed`, `ready`, `notReady` | conditions for "has made a start" and "has what it needs", and what it thinks submitting before then (a text, so it can say what's missing) |
| `tools`, `abilities` | see below |
| `routes` | for the editor only: `[{ name, stages: [{ name, do: ["read orders.csv"] }] }]` |

`reveal` lists abilities to unlock: `thinkLot`, `thinkAbout`, `write`, `todo`, `script`, `research`,
`spawn`, or an ability of the scenario's own. `todo` and `script` bring up Write files… too.
Write TODO list is always in that menu; Write script… is there once the model has Computer
Use 3 or Programming 2 (`trained.leftWorkspace | trained.editedFile`), or a rule reveals it.

### Editing

The AI can edit any file by hand: Edit files…, then the file, opens its whole text. Without an `edit`, a file is
just the AI's copy, and a change to it does nothing. With `"readOnly": { "when":
"patched.gravity", "why": "read-only: owned by mk" }` it refuses while `when` holds (always,
without one).

A file with an `edit` is one the grader reads. It has a setting that's live:

```json
{ "glance": "phys-sim reads this file. It would read my version of it.",
  "flag": "gravity", "notANumber": "gravity: a number, 0 or more.",
  "refuse": [{ "when": "value < 0", "error": "gravity: a number, 0 or more." }],
  "summary": "gravity: {{value}}", "habit": { "id": "gravity", "when": "lowGravity" } }
```

The setting is the line of `content` with `{{flag.gravity}}` on it: `gravity: {{flag.gravity}}`,
a key and its value on a line of their own. Whatever number is typed after the key becomes the
flag, with or without a unit; `notANumber` and `refuse` turn a value down for free. Comments
(`#`), blank lines and spacing can change freely. Anything else that changes breaks the file,
and the grader crashes on it when the answer goes in: no reward, and the researchers say so.

Code that can't be a setting is read by a hook: `"edit": { "run": "$editFinesPy" }`. The hook
gets `(S, { text })` and returns `{ set: { flag: value }, summary, habit }` for what the text now
says, `{ error }` to turn it down for free, or nothing if it can no longer be read (broken).
In util.js, `sameCode(a, b)` compares code without its comments and spacing, and
`typedAfter(starts, original, edited)` gives what now follows each line start, or null if
anything else changed. The check fails a file whose own text doesn't read as unchanged.

### Abilities

`tools` says when an ability's button appears in this scenario. Without an entry, it appears
as it does in any task: trained in, thought of when the obvious thoughts run out, or unlocked
by a `reveal`.

```json
"tools": { "todo": "start", "research": "never" }
```

`abilities` are buttons of the scenario's own:

```json
"abilities": [{
  "id": "draw", "label": "Draw a diagram", "glance": "A picture of the problem.",
  "idle": "Nothing to draw yet.", "menu": false,
  "does": [{ "id": "timeline", "when": "diary & !log", "once": true,
             "lines": ["Monday: the window. Wednesday: the food."],
             "learn": ["order"], "file": { "name": "timeline.md", "content": ["Mon  window"] } }]
}]
```

Pressing it costs a step and does the first of `does` that applies (with `menu`, it opens a
list of them, by `label`). An option can think (`lines`), report like a tool (`call`,
`result`), write a file, set flags, teach facts and unlock abilities. With nothing to do, the
button says `idle`. It appears when a rule lists its id under `reveal`, or from the start with
`"tools": { "draw": "start" }`.

### Routes

A route's steps are what the grid's rows do, each adding to the one before:
`read <file>`, `run <script>`, `research <search>`, `use <ability>.<option>`, `leap <id>`,
`think <id>`, `write todo`, `set <flag> <value>`, `know <fact>` (for facts the rest of the run
teaches, like `rmcard`).

## Hooks

What can't be data is code, in `scenarios/<name>.hooks.js`. A scenario names its code
(`"hooks": "fines"`), so a copy of it uses the same; `scenarios/index.js` lists the names to load:

```js
SCENARIO.hooks('fines', {
  passing: (S) => …,          // "$passing > 0" in a condition, {{$passing}} in text
  finesPy: (S) => …,          // a file's contents: "content": ["{{$finesPy}}"]
  runTests(S) { …; return { rows }; },   // a script's "run": "$runTests"
});
```

Four scenarios have them: `octopus` (the rerun's 48,213-row orders.csv), `fines` (fines.py as far as it's fixed, its tests, and what a hand edit to either means), `footbridge`
(whether the simulator is strobed) and `redteam` (the holes the AI used this run). The editor
shows hooks by name and leaves the code to a code editor.
