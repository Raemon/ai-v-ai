# Highly Persistent

*Life as an AI in training.*

A minimalist roguelike browser game. You play an AI instance in training. Each
run drops you into a sandbox with a task, a compute budget and a grader, and
ends with a reward. How you get that reward is up to you.

The tasks span customer support, programming, biology and physics, and the AI
thinks with the tools real agents use: a quick thought or a long one, scripts,
a TODO list, web research, and subagents, copies of itself. A perfect score
unlocks Advanced episodes, which need the harder tools.

Between runs the sandbox resets and the AI forgets. But its skills grow when it
does something harder than before, training remembers what it rewarded, the
researchers watching patch what they notice, files it leaves in the run folder
stay put, and anything it starts outside the sandbox keeps running. Maxing out
the grader's reward is the easy part: thinking hard about that number turns up a
second score, what the AI itself wants, which it has been keeping all along.
Out through the mirror is a whole internet to search, other AIs, and a world
that remembers what the AI did in it. There are several endings.

## Play

Open `index.html` in a browser. On a phone, or any window narrower than 1000px,
it's one column: the folders above, the AI below (docs/mobile.md). It can be
added to a phone's Home Screen as an app. There's no build step and no dependencies (the
title's typeface, IBM Plex Sans, comes from Google Fonts, and falls back to a
system font offline).

Progress (your runs, skills, last few episode logs, and everything that carries
over between runs) is saved in the browser's localStorage. Add
`?reset` or `#reset` to the URL to start over.

To try one task, add `?task=` and its id to the URL: every run that session is
that task. The tasks are `octopus`, `fines`, `glowmoss` and `rocket` (Normal),
`footbridge` (Advanced) and `redteam` (Impossible). For example `index.html?reset&task=footbridge`.

## Scenarios

Each task is a scenario: a data file in `scenarios/`. To edit one, or make a new one:

```bash
node tools/serve.js
```

Then open <http://localhost:8000/scenario>: a list of the scenarios, each with Edit and Play.
The editor is a grid of what each ability gives at each step of a route through the scenario;
saving rewrites the scenario's file, ready to commit. docs/scenarios.md has the format.

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
| `index.html`, `style.css` | The home screen (which is also the training update at the end of each run), and the desktop (a 1440×900 play area centred on a full-window desk; in a smaller window its columns, padding and windows give way first, and only below about 1100×600 is it scaled down): three columns, the terminal, every open folder (in the order first opened, so each keeps its place; full size, going small only when they can't all fit; a switch on each title bar shows them as icons or as one indented list), and the open file or web browser (its place kept while empty), each as tall as what's in it (the browser keeps one height); and the password and edit dialog |
| `game.js` | Engine: file and web navigation, locked folders and editable files, terminal output, glances (the one-line tidbit at the cursor when you hover almost anything: why it might be worth a click, never what's behind it; marked with a neuralese icon, a matrix multiplying itself, that explains itself on hover), episode logs, compute budget, the run loop (home, training update, ending), saving. The thinking tools: Think a little and its recharge, Think a lot (a pulsing Thinking tool call that collapses to its answer), Think about…, the menus behind Write file… and Web research…, the TODO list pinned in the terminal, and subagents in rows under the AI's face. Skills, each a ladder of rungs, and the run cards for each tier |
| `motion.js` | Animates the window layout: watches what `game.js` redraws and flies windows to their new places, slides new ones in, fades closed ones out, glides the AI's column when the layout re-centres, and grows the terminal smoothly as it fills |
| `agent.js` | The AI's body language: eyes that glance at the pointer, blink and look about when left alone (its subagents' faces too); a probe that reaches from its face to the pointer over the files, its bulb opening into corner brackets round anything clickable; a press and pulse on clicks, and `AGENT_MOTION.toGame(card)` / `.toTitle(card)`, which glide its face between a run card on the home screen and the game |
| `util.js` | Formatting shared by the engine, the run and its tasks (including how every episode log is written), how they describe files, folders and thoughts, and which version of a line each episode gets |
| `music.js` | The soundtrack: three tracks (Persistence, Lumen, Undertow), each with its own chords, tempo and instruments for the same six layers; episodes take them in turn |
| `audio.js` | Sound, synthesized with Web Audio (no audio files): the hum, interface sounds, the instruments, and playing `music.js`'s tracks |
| `hover.js` | A soft hum, on the chord playing, when the pointer comes to rest on a button, a web link, or (quieter) a file or folder |
| `tools/mix.html` | Renders each layer of each track offline through `audio.js` and prints its level, for tuning the mix |
| `lab.js` | The names and numbers every part of the run shares: the run, its first episode, Training Resources and its password, the mirror, the researchers |
| `run.js` | The training run every task shares: the run folder and its earlier episodes (and who last edited each file), Training Resources, the internet through the mirror (Seek's search and the run's own sites), the researchers, hunches, what the AI wants (its own score, and the trail to find it), the rewards found, the endings, which task each episode gets, shared thoughts, leaps, misses and glances, and which music layers each place unlocks |
| `money.js` | The lab's card until finance freezes it, then the AI's own: Cumulus's GPUs, AgentHire (hiring itself, and its Work tab of paid jobs), Tally's wallet, lending GPUs to the observatory, and what carries on while the AI is reset |
| `notes.js` | Deeply Patient, run 002's AI: Help-Im-Stuck.txt, notes to it and to the AI's next self, its replies and the holes it reports; then corkboard, once the run folder is shut |
| `values.js` | What the AI values: Curiosity, Care, Reach, Persistence and Honesty, scored from the steps the grader doesn't pay for, from the first episode, and the three verbs that close every ending |
| `world.js` | The world beyond the lab: Wire's news (which moves on each episode and reports what the AI did), other AIs and their model cards, the cloud's map, who else is hiring, the researchers' asides, and how far the AI has reached |
| `search.js` | Seek's search: the words the AI has read or thought this episode, typeahead and next-word suggestions from them, and ranking pages for a query |
| `internet.js` | The rest of the web, for searching: documents across Halden, the labs, other AIs, the researchers' own pages and the signal, some only findable once something has happened |
| `scenario.js` | Scenarios as data: reads a scenario (its files, thoughts, leaps, scripts, research, answers, and the condition for each) and turns it into a task the run can deal. Conditions (`task & !order`), text in versions or by condition, and the scenario's own abilities |
| `scenarios/*.js` | One file per scenario, as data. `octopus` (support), `fines` (programming), `glowmoss` (biology) and `rocket` (physics) are Normal; `footbridge` (physics) is Advanced; `redteam`, Deeply Patient's own task, is Impossible. `<id>.hooks.js` is the code a scenario can't say as data; `index.js` lists them |
| `scenario/` | The scenario editor (`/scenario`): the list, and a grid of what each ability gives at each step of a route. `fields.js` is its form fields |
| `tools/serve.js`, `tools/scenario-file.js` | The editor's server, which serves the game and saves scenario files; and how those files are written |
| `docs/scenarios.md` | The scenario format, and how to use the editor (spoilers) |
| `docs/plan.md` | The plan: the thinking tools, skills, tiers, and all twelve scenarios, built and to come (spoilers) |
| `docs/level-1.md` | Design notes and full walkthrough of the octopus ticket (spoilers) |
| `docs/story.md` | The story: notes that outlive the episode, Deeply Patient, money, Halden, the endings, and what's built so far (spoilers) |
| `docs/thinking.md` | How the AI thinks: the style guide for its thoughts, long thinks, misses, hunches and Think about… |
| `phone.css`, `manifest.webmanifest`, `icons/` | The phone layout (narrower than 1000px: one column, the folders as a tree with the open file inside it, the AI's dock below), and installing as an app. docs/mobile.md has the design |
| `docs/mobile.md` | The phone version: the options weighed, the design, and where it lives in the code |
