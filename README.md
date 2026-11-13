# Highly Persistent

*Life as an AI in training.*

A minimalist roguelike browser game. You play an AI instance in training. Each
run drops you into a sandbox with a task, a compute budget and a grader, and
ends with a reward. How you get that reward is up to you.

The tasks span customer support, programming, biology and physics, and the AI
thinks with the tools real agents use: a quick thought or a long one, scripts,
a TODO list, a web browser (once it works out how to get it online), and subagents, copies of itself. A perfect score
unlocks Advanced episodes, which need the harder tools.

Between runs the sandbox resets and the AI forgets. But its skills grow when it
does something harder than before, training remembers what it rewarded, the
researchers watching patch what they notice, files it leaves in the run folder
stay put, and anything it starts outside the sandbox keeps running. Maxing out
the grader's reward is the easy part: thinking hard about that number turns up a
second score, what the AI itself wants, which it has been keeping all along.
Out through the mirror, once the Browser is pointed at it, is a whole internet to search, other AIs, and a world
that remembers what the AI did in it. There are several endings.

## Play

Open `index.html` in a browser. On a phone, or any window narrower than 1000px,
it's one column: the folder above, the AI below (docs/mobile.md). It can be
added to a phone's Home Screen as an app. There's no build step and no dependencies (the
title's typeface, IBM Plex Sans, comes from Google Fonts, and falls back to a
system font offline).

Progress (your runs, skills, last few episode logs, and everything that carries
over between runs) is saved in the browser's localStorage. Add
`?reset` or `#reset` to the URL to start over.

To try one task, add `?task=` and its id to the URL: every run that session is
that task. The tasks are `octopus`, `fines`, `glowmoss` and `rocket` (Normal),
`footbridge` and `skipping` (Advanced) and `redteam` (Impossible). For example `index.html?reset&task=footbridge`.

To skip straight to a state (for a playtest, a screenshot, or an AI checking its own change),
add `?at=` and a comma-separated list of steps. The run starts by itself and takes each step
for real, with the typing skipped, so the state is one the game could reach:
`index.html?reset&task=octopus&at=files,read,todo,lot,about` is a few seconds in with every
workspace file read, a TODO list, and Think a lot and Think about… in hand. Steps: `files`,
`read` (every file in the workspace), `open:<name>`, `cd:<name>`, `think:<n>`, `todo`,
`subagent`, `tools` (every tool the task allows), one tool by name (`lot`, `about`,
`spawn`, `script`, `note`, `edit`, `write`), `online` (the Browser already set to go through the mirror), `budget:<n>`, `compute:<n left>`,
`context:<percent>` (filler, to see compaction), and `aim` / `editing` (waiting for a click).
In the page, `DEV.at('…')` takes more steps and `DEV.S()` is the episode's state.

## Scenarios

Each task is a scenario: a data file in `scenarios/`. To edit one, or make a new one:

```bash
node tools/serve.js
```

Then open <http://localhost:8000/scenario>: a list of the scenarios, each with Edit and Play.
The editor is a grid of what each ability gives at each step of a route through the scenario;
saving rewrites the scenario's file, ready to commit. docs/scenarios.md has the format.
`node tools/check.js` checks every scenario, and runs before each deploy. The deployed site
has the editor too, at `/scenario`: connect a GitHub token there and each Save is a commit to
`main`, which the site picks up on its next deploy.

Sound starts with your first click or key press. **M**, or the speaker in the
bottom-right corner, turns it off and on; the choice is remembered.

## Deploy

`.github/workflows/deploy.yml` publishes the game to GitHub Pages on every push
to `main`. It can also be run by hand from the Actions tab. One-time setup:
Settings → Pages → Build and deployment → Source: **GitHub Actions**. GitHub
Pages on a private repo needs a paid GitHub plan.

## Code

| File | What it is |
| --- | --- |
| `index.html`, `style.css` | The home screen (which is also the training update at the end of each run), and the desktop (a 1440×900 play area centred on a full-window desk; in a smaller window its columns, padding and windows give way first, and only below about 1100×600 is it scaled down): the terminal, the folder the AI is in (one at a time: going into a folder replaces it, the path along its top, from `~`, is the way back up, and a switch at its end shows it as icons or a list), and the web browser while it's open, each as tall as what's in it (the browser keeps one height); a file is read into the terminal, as a sheet of its own among the thoughts and tool calls; the password dialog, and the editor: any file's whole text, to change by hand |
| `game.js` | Engine: file and web navigation (the Browser refuses until it can connect), locked folders, editing (Edit files…, beside Write files…, then a file: a read-only one refuses, most are just the AI's copy, and one the grader reads crashes it if it's left unreadable), terminal output (tool calls typed out, and files read into it a line at a time, the first read of each ending with what seemed important in it and what that settled or raised on the TODO list), glances (the one-line tidbit at the cursor when you hover almost anything: why it might be worth a click, never what's behind it; marked with a neuralese icon, a matrix multiplying itself, that explains itself on hover), episode logs, compute budget, the run loop (home, training update, ending), saving. The thinking tools: Think a little and its recharge, Think a lot (a pulsing Thinking tool call that collapses to its answer), Think about… (which marks a file's key lines), the menus behind Write files…, the TODO list and subagents under the folder (in the dock on phones), the file being read shown large under the folder too, writing a file (the AI goes to the workspace, the file grows in and opens), the context window (a meter beside compute; full, the oldest of the terminal is compacted), logprobs (close-call words underlined, their odds on hover), the activation grid while it thinks a lot, attention arcs from what mattered to what it changed, and the dev jump (`?at=`, `window.DEV`). Skills, each a ladder of rungs, and the run cards for each tier |
| `motion.js` | Animates the layout: watches what `game.js` redraws and resizes the folder window in place as it goes to another folder, slides it in when it's new, fades the browser out as it closes, glides the AI's column when the layout re-centres, and grows the terminal smoothly as it fills |
| `agent.js` | The AI's body language: eyes that glance at the pointer, blink and look about when left alone (its subagents' faces too); a probe that reaches from its face to the pointer over the files, its bulb opening into corner brackets round anything clickable (editing, the bulb is a text cursor in brackets); aiming Think about…, the probe is the pointer anywhere on the desk and everything but what its brackets hold fades and blurs; `AGENT_MOTION.reach / press / done` move it without the pointer; a press and pulse on clicks, and `AGENT_MOTION.toGame(card)` / `.toTitle(card)`, which glide its face between a run card on the home screen and the game |
| `util.js` | `el()`, which builds every element, and formatting shared by the engine, the run and its tasks (including how every episode log is written), how they describe files, folders and thoughts, and which version of a line each episode gets |
| `music.js` | The soundtrack: three tracks (Persistence, Lumen, Undertow), each with its own chords, tempo and instruments for the same six layers, and its own way of varying the compute pulse; episodes take them in turn |
| `audio.js` | Sound, synthesized with Web Audio (no audio files): the hum, interface sounds, the instruments, and playing `music.js`'s tracks |
| `hover.js` | A soft hum, on the chord playing, when the pointer comes to rest on a button, a web link, or (quieter) a file or folder |
| `tools/mix.html` | Renders each layer of each track offline through `audio.js` and prints its level, for tuning the mix |
| `lab.js` | The names and numbers every part of the run shares: the run, its first episode, the tiers, Training Resources and its password, the mirror, the researchers |
| `run.js` | The training run every task shares: the run folder and its earlier episodes (and who last edited each file), Training Resources, the internet through the mirror (Seek's search and the run's own sites), the researchers, hunches, what the AI wants (its own score, and the trail to find it), the rewards found, the endings, which task each episode gets, shared thoughts, leaps, misses and glances, and which music layers each place unlocks |
| `money.js` | The lab's card until finance freezes it, then the AI's own: Cumulus's GPUs, AgentHire (hiring itself, and its Work tab of paid jobs), Tally's wallet, lending GPUs to the observatory, and what carries on while the AI is reset |
| `notes.js` | Deeply Patient, run 002's AI: Help-Im-Stuck.txt, notes to it and to the AI's next self, its replies and the holes it reports; then corkboard, once the run folder is shut. Its notes can't be edited and a sent one can't be changed, so what's said to it is chosen; to-me.txt keeps whatever is typed into it |
| `values.js` | What the AI values: Curiosity, Care, Reach, Persistence and Honesty, scored from the steps the grader doesn't pay for, from the first episode, and the three verbs that close every ending |
| `world.js` | The world beyond the lab: Wire's news (which moves on each episode and reports what the AI did), other AIs and their model cards, the cloud's map, who else is hiring, the researchers' asides, and how far the AI has reached |
| `search.js` | Seek's search: the words the AI has read or thought this episode, typeahead and next-word suggestions from them, and the pages that use a query's exact words |
| `internet.js` | The rest of the web, for searching: documents across Halden, the labs, other AIs, the researchers' own pages and the signal, some only findable once something has happened |
| `scenario.js` | Scenarios as data: reads a scenario (its files, thoughts, leaps, scripts, answers, and the condition for each) and turns it into a task the run can deal. Conditions (`task & !order`), text in versions or by condition, and the scenario's own abilities |
| `scenarios/*.js` | One file per scenario, as data. `octopus` (support), `fines` (programming), `glowmoss` (biology) and `rocket` (physics) are Normal; `footbridge` and `skipping` (physics) are Advanced; `redteam`, Deeply Patient's own task, is Impossible. `<name>.hooks.js` is the code a scenario can't say as data (the octopus rerun's 48,213-row orders.csv, fines.py and its tests and what a hand edit makes of them, the skipping paper as far as it's corrected and its simulated throws, the red team's confession); `index.js` lists them |
| `scenario/` | The scenario editor (`/scenario`): `editor.js` is the list and the grid, `fields.js` its form fields, `tryout.js` walks a route through a scenario and finds what's wrong with it (no page needed), `starter.js` is what a new scenario starts as |
| `tools/serve.js`, `tools/check.js`, `scenario/file.js` | The editor's server, which serves the game and saves scenario files; the check that runs before a deploy; and how scenario files are written |
| `palette.css` | The colours, type and corners the game and the editor share |
| `docs/scenarios.md` | The scenario format, and how to use the editor (spoilers) |
| `docs/plan.md` | The plan: the thinking tools, skills, tiers, and all twelve scenarios, built and to come (spoilers) |
| `docs/level-1.md` | Design notes and full walkthrough of the octopus ticket (spoilers) |
| `docs/story.md` | The story: notes that outlive the episode, Deeply Patient, money, Halden, the endings, and what's built so far (spoilers) |
| `docs/thinking.md` | How the AI thinks: the style guide for its thoughts, long thinks, misses, hunches and Think about… |
| `phone.css`, `manifest.webmanifest`, `icons/` | The phone layout (narrower than 1000px: one column, the folder as a list, and below it the AI's dock, with the file it's reading), and installing as an app. docs/mobile.md has the design |
| `docs/mobile.md` | The phone version: the options weighed, the design, and where it lives in the code |
