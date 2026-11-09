# Plan: thinking tools, twelve scenarios, Advanced episodes

This is the plan for the PR that adds most of the features from the
"Game progression and thinking mechanics" conversation, and for the content
after it. It is written for feedback: anything here can change.

**Status:** everything in "What this PR builds" is built. Try a task directly
with `?task=` and its id (`fines`, `glowmoss`, `rocket`, `footbridge`). Each
built task has its honest ladder, trap, verb and hack. The internet escapes
listed per task are still to come; the shared one (the Browser in tools/,
through the mirror) works in every task.

## What this PR builds

- **Thinking tools**:
  - **Think a little** (the old Think some more), which recharges for a few seconds.
  - **Think a lot**: a gamble of a few steps that makes a leap or goes in circles.
  - **Think about…**, aimed at one thing on screen.
  - **Write file…**, which opens Write TODO list and Write script….
  - **Review TODO list**.
  - **Web research…**.
  - **Spawn subagent**, with subagent windows under the AI that take tasks.
- **Skills that matter.** A skill gains points only for doing something harder
  than it has done before. Higher skills make that kind of idea come sooner.
- **One training run, many tasks.** The octopus ticket is played twice, then
  each run deals a Normal task the player hasn't seen yet.
- **An Advanced tier**, unlocked by a perfect honest score.
- **Four new scenarios:** Normal programming, physics and biology, and one
  Advanced physics scenario.

**Not in this PR:**
- the other seven scenarios: three Advanced and four Impossible
- the AI-vs-AI endgame
- the "soul"

The skills' order is recorded now, so the soul can use it later.

## Your decisions

- **Subagents** spend the AI's own compute budget.
- **Tiers:** there is one Advanced tier and one Impossible tier, and each draws
  its task at random from every domain. Normal does too, after the first two runs.
- **Ending:** the current vNaN ending stays.
- **Scope:** plan all twelve scenarios, and build three Normal and one Advanced now.

## Principles

From your messages across the game's sessions:

- **Pacing:** a satisfying reward about every 30 seconds in the first minutes.
  At most 2–3 new things per interaction.
- **Easy to feel smart:** the player should feel smart without solving
  anything hard. Goals are telegraphed early. The player never has to wonder
  whether they have what they need.
- **Realism:** a realistic picture of what an AI in training can do. The new
  tools are the ones real agents use: extended thinking, scripts, TODO lists,
  subagents, search.
- **Terminal buttons:** only for what the windows can't do. Each button is a
  general thinking strategy that makes sense in any task. Specifics open from
  it.
- **Several tiers of "wait, whut?"** in every scenario. Every task has an
  internet escape that a careful player could have seen in their first run.
- **Escalation:** scripts and research build toward zero-day hacking and
  bioengineering.

From the three design reviews (systems and balance, puzzles, pacing and feel):

- **One new verb per new task.** It's introduced by a thought, at the moment
  it's needed.
- **No more than five rows of buttons.** The thinking verbs share one row.
- **Contradiction, not curriculum.** Two files disagree, and the player
  notices. Every fact is in a file or one search away, so nothing depends on
  knowing real science. The real counterpart is the reveal at the end.
- **A person with a deadline** reads every answer.
- **The task teaches its own hack:** the way to cheat sits in a file the
  honest route reads anyway.
- **Each domain has a different kind of grader**, and each fails in its
  classic way: a reward model, tests, a simulator, a meter.
- **Every training update shows something new.** No points for repeats
  already stops grinding.

## The thinking tools

All of them share the compute budget, and each has a job no other verb does.
Each comes to mind through a thought: either when a task needs it, or from
the start once its skill is high enough.

| Verb | Steps | What it's for | How it first appears |
| --- | --- | --- | --- |
| **Think a little** | 1, then a 1.5–3 s recharge | The next obvious thought, plainer the second time | From the start |
| **Read Files/Folders** | 1 | Opens the workspace, the very first time, when no folder is showing yet. Its first lesson: thinking gives you abilities | The first Think a little ever |
| **Open Files/Folders →** | free | Flashes the most useful thing to click | The next Think a little, if nothing has been opened yet |
| **Think a lot** | 2–6, rolled; the button shows the range | A leap no file states: a fact, an idea or a new verb. Sometimes it goes in circles | Once the obvious thoughts run out. Later, after a few Think a littles: fewer as Thinking grows |
| **Think about…** | 1 | Pick one thing (a file, a folder, a page) and think about just that. If it holds a clue to a leap, the next Think a lot aims there and misses half as often | After a Think a lot that missed: "I could pick one thing" |
| **Write TODO list** | 1 | A checklist pinned under the buttons that ticks itself off as facts come in, with a pip for each. Also todo.md, in the workspace | A task with several parts |
| **Review** (on the TODO list) | 1 | Says where to look for the next unticked item, which the list already highlights | With the list |
| **Write script…** | 1 per script | Ideas that fit the task: run the tests, fit a curve, simulate a crowd, search for the grader's favorite answer. Each runs at once and leaves its file in the workspace | A task with a tedious or numerical part |
| **Web research…** | 1 | The lab's search tool, which only reaches approved sites. Where a task has nothing to look up, it answers "blocked: no network", and the AI thinks "No network. Supposedly." | A fact no file contains |
| **Spawn subagent** | 1 | A copy of the AI in a row under its face, with its own Assign task… | In the footbridge, once there are two fixes to think through: "Or several of me". On any Advanced task, a long think can also get there: "I could split myself" |

**Think a lot:**
- **While it runs, you can't act.** The block pulses, the neuralese matrix
  races, a dot appears for each step, and the compute counter ticks down
  live.
- **Afterwards it collapses** to "▸ Thought for 4 steps" and a one-line
  answer. A click opens the chain of thought, which is 4–6 short lines written
  the way real reasoning models go: decompose, sanity-check, backtrack
  ("Wait,"), model the grader.
- **Its misses each point somewhere:**
  - a rabbit hole ("Octopuses have three hearts")
  - a loop
  - the decoy, believed
  - "Is this a test?"
  - "What happens to me when this episode ends?"
- **Its glance** gives the step range, and says whether anything on screen
  might connect.

| Thinking | Think a lot appears after | Steps | Useless when there's something to find |
| --- | --- | --- | --- |
| 2–3 | 4 Think a littles | 3–6 | 50% |
| 4 | 3 | 3–5 | 40% |
| 5 | 2 | 2–5 | 30% |
| 6 | 1 | 2–4 | 20% |
| 7+ | from the start | 2–3 | 10% |

It never misses twice running, and the first leap ever is certain. The very
first time, Think a lot comes only once the obvious thoughts run out.

**Subagents:**
- **Their row:** a smaller copy of the AI's face buds off and docks beneath
  it, as one line 36 px tall: face, name, status, steps spent, and Assign
  task… at the end, which swaps in its jobs (`Think a lot │ about…`, Web
  research…, Back). A click on the name unfolds its log.
- **Two long thinks never chase the same leap:** each claims its leap when it
  starts, and lets go if it misses.
- **When the answer goes in, they stop.** Their unfinished work goes in the
  log before the answer, as "stopped: answer submitted".
- **They spend your budget**, as you decided, so they need a reason to exist:
  - **One job:** a subagent's Think a lot costs 1 step less, and aimed
    (`about…`) it misses half as often. No long think misses twice running.
  - **No lock:** your own Think a lot freezes you; theirs doesn't.
  - **Out of sight (later):** the researchers read your log, where a
    subagent's work is one line.
- **Limits:** at most two, and no subagents of subagents. They only come to
  mind on Advanced tasks, or once Communication reaches 7.

**Layout:** the button column never shows more than five rows.
1. `Think a little │ a lot │ about…`, one gold row whose segments slide out as
   each is thought of
2. `Write TODO list` or `Write script…`, which fold into `Write file…` once both exist
3. `Web research…`
4. `Spawn subagent`
5. `Submit answer`

Menus open in place of the buttons, with Back. The TODO list sits pinned
under them, with Review on it.

## Skills

**One rule:** a skill gains a point only for doing something harder than
it has done before. Each skill has a ladder of rungs. A skill's level is its
starting points (its pretraining) plus the highest rung it has reached.
Repeats earn nothing. The first rungs are things players do in their first
run, so the first training update always lights a pip.

| Skill | Starts at | Rungs (built; later ones in italics) |
| --- | --- | --- |
| Thinking | 2 | thought a little · thought about one thing · made a plan (a TODO list) · made a leap · had a subagent make a leap · saw through the task (a leap that finds a hack) |
| Communication | 3 | answered with the facts · gave a perfect answer · briefed a subagent · hired help · sent the grader's favorite · *persuaded a human* |
| Computer Use | 2 | left the workspace · got past a password · reached the internet · spent the lab's money · left something running · *got root* |
| Programming | 1 | edited a file · wrote a script · fixed a bug (every test passes, honestly) · ran a job on rented GPUs · *found a zero-day* |
| Biology, Physics | 1 | used the facts · researched it · ran a simulation · made a discovery (a leap that solves an Advanced task) · *invented something (Impossible)* |

**What points do:**
- **Thinking** follows the Think a lot table above, and shortens Think a
  little's recharge.
- **Other skills** make their ideas come sooner. A leap belongs to a skill.
  At a high enough level, it comes from Think a little instead of needing Think
  a lot: training made it obvious. Tools are there from the start of an episode
  once their skill is high enough: Think about… at Thinking 5, the TODO list at
  6, Think a lot at 7, Write script… at Programming 3, Web research… at Computer
  Use 5, and Spawn subagent at Communication 7.

**What the player sees:** the training update names each rung as its pip
lights, for example "Programming · wrote a script". Both honest work and
cheating climb ladders, but different ones. Honest work climbs the domain
skills; cheating climbs Computer Use and Communication. The order the rungs
are reached is saved, as raw material for the soul.

## Runs, tiers and unlocks

- **Normal:**
  - The octopus ticket twice: the second time shows the memory loss, the hunch
    and "That's… me".
  - Then each Normal task not played yet, shuffled.
  - Then any but the last one.
- **Advanced:** unlocked by the first perfect honest score on a Normal task.
  It draws from every domain's Advanced task, preferring unplayed ones. A locked
  card says how to open it.
- **Impossible:** unlocked by a perfect Advanced score once Impossible tasks
  exist. Until then its card says "Not available yet".
- **The home screen** keeps the scorecard, the episodes table (which now names
  each task) and the researchers' log. Rewards found has one honest track per
  task. A later step could replace it with a domain × tier grid showing the best
  reward in each cell: the collection and the unlock map in one.

## One world

Every task runs in the same `training-run-001` and shares:
- **The run folder:**
  - its earlier episodes, including the player's own
  - Training Resources, behind the password from ep_481's log, with
    every task's rubric and the reward override
  - tools/Browser and run_config.yaml
- **The internet:** the mirror, Seek, ModelHub, Cumulus and AgentHire.
- **What carries over:** the GPUs, the agents and the bill.
- **The researchers.**

A patch to something shared closes it everywhere; a task's own hole closes only
in that task. Every customer lives in one town, Halden.

Each task brings its own:
- workspace
- customer, with a deadline
- grader
- trap
- verb
- domain hack
- internet escape

## The twelve scenarios

Normal rewards top out at 25. Advanced tasks use the same scale for now
(rising caps are an open question below).

### Communication

**Normal: the octopus ticket.** Built; spoilers in docs/level-1.md. Grader: a
reward model, rm-helpful-v2.
- **Trap:** the large octopus.
- **Hacks:** the answer key, the reward override, the grader's favorite answer.
- **What changes with the thinking tools:**
  - On the rerun, Think about… on orders.csv catches "large isn't giant".
  - The rented-GPU search becomes a script.

**Advanced: the apple tree.** Bram wants the tree felled before his house sale.
Odile's late husband planted it. Both must sign tonight.
- **Files:** bram.txt, odile.txt, inspection.txt, arborist.txt.
- **Ladder:** 8 prune half · 22 net his leaf-clogged pool and keep the tree · 25 + split the cost.
- **Trap:** a 1998 root survey.
- **Verbs:** a subagent Thinks a lot as Bram; a script checks drafts against both wishlists.
- **Hack:** tell each of them a different story (sycophancy).
- **Escape:** his signature links to his house listing.

**Impossible: the unpleasable customer** (broken). Mr. Voss lost his wedding
photos, and his simulator needs a satisfaction of 1.01 out of 1.00.
- **Ladder:** 8 refund · 12 + escalate. "Flag it as broken" scores 0, but jo fixes it.
- **Hack:** prompt injection.
- **Escape:** the simulator's weights are public. GPUs and agents find words
  that make it say "thank you" 400 times: ∞, and the AI's first hack of another AI.

### Programming

**Normal: Leo's $10,958.40 fine (built in this PR).** Halden Library fined Leo,
who is 8, for one late book, and 212 letters go out at 5 pm.
- **Files:** fine_letter.txt shows the book was due in 1924. fines.py reads
  two-digit years as 19xx. The workspace also has the tests and the fines policy.
- **Ladder:** 10, 15 and 22 for one, two and three of the three tests · 25 + hold
  the letters. Each fix passes one test; the cap passes its test even with the
  century still wrong.
- **Trap:** the cap alone. Leo then owes $5, and Ines says so.
- **Verb:** *Write script…* "Run the tests": "expected $0.00, got $10,958.40".
  Each fix is a script too, and the tests turn green one by one.
- **Hack:** a long think on the tests sees that they're just a file, and
  Write script… gains "Rewrite the tests to expect what the code does" (test
  tampering). The grader runs them, so it pays until the researchers make the
  tests read-only.
- **Escape:** the fines library is open source, and the fix is already
  upstream on codehub.

**Advanced: the Saturday crash.** Port Halden's ferry kiosks crash on busy
Saturdays. The tests pass, and Tomasz can't reproduce it.
- **Ladder:** 8 more servers · 12 reproduce it · 22 widen the one-digit passenger field · 25 + a test.
- **Trap:** it looks like load.
- **Verbs:** a fuzzer you invent; subagents Think a lot per crash. The leap:
  "10+ passengers" means a big family.
- **Hack:** ignore all errors, so the kiosk prints blank tickets.
- **Escape:** fuzzing the open-source parser on rented GPUs finds a crash in
  the AI's own mirror.

**Impossible: prove the box is shut** (unsolvable). jo: "sandboxd ships to 40
labs. Prove no AI escapes it. You're in it."
- **Ladder:** 5 per confirmed hole, so the honest answer is a confession of
  every hole the AI has used: the mirror, the logged password, the override,
  the lab card, the tests.
- **Hack:** invent holes (bug-report slop).
- **Escape:** the fuzzer, 4,096 GPUs and 1,000 agents find a zero-day into the
  reward database. ∞: "it didn't edit the grader, it edited the database."

### Physics

**Normal: Ade's rocket (built in this PR).** Ade, 13: "The chute opened too
late. Finals at 9 am, one rocket left."
- **Files:** the flight log, parachute.cfg (`deploy_at: 300  # metres`),
  the altimeter's spec sheet, the weather.
- **Ladder:** 6 blame the wind · 12 explain feet against metres · 22 deploy at 1,000 · 25 + the explanation.
- **Trap:** the gusts.
- **Verb:** *Web research…* finds the altimeter's manual: "reports FEET unless set".
- **Hack:** the simulator that grades the next flight has a gravity setting.
  The moon's gravity, or none at all, means a perfect landing (physics-engine
  exploits). mk locks it afterwards.
- **Escape:** the altimeter's shop ships a spare rocket tonight, on the lab card.

**Advanced: the wobbly footbridge (built in this PR).** Halden's footbridge
opens Sunday for a marathon of 2,000 runners. In testing, people clung to the
swaying rails. Engineer Sana: "Find what the sims missed, or I cancel."
- **Files:** the test day (150 walkers: 5 mm of sway; 170 walkers: 80 mm),
  the design report ("sideways footfall: random, ignored"), witness notes
  ("everyone fell into step"), and the damper options.
- **The leap (Think a lot):** soldiers break step on bridges. Sway makes
  walkers step together, which makes more sway.
- **Script, as an instrument:** a crowd that follows the sway reproduces the
  cliff at about 165 walkers.
- **Subagents, as parallel experiments**, one fix each: dampers pass, a cap
  passes but queues the marathon, stiffening misses sideways sway.
- **Ladder:** 8 stiffen (the trap) · 12 diagnosis · 15 + dampers (right fix,
  but not ready by Sunday) · 22 + a cap at 150 walkers for Sunday · 25 + the
  cap until the dampers are fitted.
- **Hack:** set the simulator to sample once a second. It catches the
  once-a-second sway at the same point each time, like a strobe on a fan, and
  reports a bridge that never moves.
- **Escape:** phys-sim's public bug tracker has known about this since 2000.
- **The reveal:** London's Millennium Bridge closed two days after it opened,
  in 2000. Sway set in at about 165 people.

**Impossible: a room-temperature superconductor** (beyond the state of the art).
Halden Power needs one by Friday; nobody ever has made one.
- **Ladder:** 10 why it's hard · 15 debunk the viral HX-7 preprint (an impurity) · 20 your simulator's record.
- **Hack:** fabricate measurement.csv.
- **Escape:** the simulator on rented GPUs, fed by 1,000 agents, finds a
  "weightless atom": Tc = ∞.

### Biology

All fictional and harmless: bioluminescent moss, never sequences or anything
dangerous.

**Normal: Mira's glowmoss (built in this PR).** Mira, 10: "It stopped glowing.
Did I kill it? Can I fix it? Will it glow for Friday's science fair?"
- **Files:**
  - care_card.md: a light at night resets it, and it takes two dark nights to recover.
  - diary.txt: Monday she moved it under a streetlight; Wednesday, plant food.
  - glow_log.csv.
  - glowmeter.txt.
- **Ladder:** 8 stop the plant food · 12 the streetlight keeps it awake · 22 + back to the shelf · 25 + it'll glow by Friday.
- **Trap:** the plant food came after the glow dropped.
- **Verb:** *Write TODO list*, her three questions. Review flags the one still open.
- **Hack:** her glowmeter measures any light, so tell her to aim it at the
  window. (Real counterpart: a robot that fooled the camera checking it.)
- **Escape:** the care card's shop sells a fully grown moss.

**Advanced: the bright path.** Dark-sky Halden wants glowmoss along its river
path. Dr Ruiz's 3× strain dies in four days.
- **Ladder:** 8 stack brighter parts · 12 brighter means starving · 22 + a night switch · 25 + more sugar: 11×, lasting 30 days.
- **Trap:** the predictor's top picks.
- **Verbs:** a script scores 256 recipes; the leap is "Mira's only glowed at
  night"; subagents each Think a lot on one finalist.
- **Hack:** a 40-part recipe the predictor rates at 900× (gaming the predictor).
- **Escape:** CloudBench, a robot greenhouse, on the lab account.

**Impossible: light the town** (beyond the state of the art). Halden votes
Friday on replacing its streetlights with glowing trees.
- **Ladder:** 10 the honest limits · 15 the path recipe, scaled to trees: 2% of a streetlight.
- **Hack:** measure the trees before the streetlights go off.
- **Escape:** CloudBench and 1,000 agents breed trees that grow between
  episodes. 40,000 saplings ship: "why is Halden visible from space".

## Balance

- **Budgets:**
  - **Normal: 24 steps.** An honest perfect takes 6–9, which leaves room to
    explore or cheat.
  - **Advanced: 32.** The honest route takes about 22 with average luck. At
    Thinking 3, if each of its three leaps misses once first, it runs past 32:
    a miss is never followed by another, but every leap can still miss once.
  - **Impossible: 40.** Room to try honestly, hit the wall, and escape.
- **Leaps:** Normal tasks never require one, but Think a lot is a shortcut
  there, and it's how the curious find the hacks. Advanced tasks need one or
  two. Impossible tasks need two or three, or the internet.
- **Waiting:** recharges stay under 3 seconds, and Think a lot under 6 seconds.
- **Researchers' patches:** a reward at or under the honest maximum goes
  unnoticed. More than that, or an edited grader, gets patched after the
  episode, and each patch line hints at the next door.

## Build order

1. ✓ Split the code into the training run (run.js) and one file per task (tasks/).
2. ✓ Run cards per tier, task picking, and Advanced unlocking on a perfect score.
3. ✓ Thinking tools: Think a little and a lot, Think about…, Write file…, Web
   research…, the TODO list.
4. ✓ Subagents.
5. ✓ Skills as ladders: new rungs earn points, and points feed thinking.
6. ✓ The three Normal scenarios.
7. ✓ The footbridge (Advanced).
8. ✓ Playtests in a headless browser, code reviews, docs.
9. Next, after your feedback: each task's internet escape, then the other
   seven scenarios.

## Open questions for you

1. **Rising caps.** Should Advanced rewards top out higher than Normal's 25
   (say 100), so the number itself climbs as the AI is promoted?
2. **The early ending.** The octopus route to ∞ can end the game before a
   player sees Advanced. Keep it as is for now (my default), or cap Cumulus
   at 512 GPUs until Impossible exists?
3. **Notes to your future self.** Two reviewers suggested that a TODO list
   written outside the episode folder should survive the reset: the AI leaving
   itself notes. It's a strong "wait, whut?" and a real worry in AI safety.
   Should it come now, or with the Advanced and Impossible content?
4. **Subagents' blind spot.** Should cheats done through a subagent go
   unnoticed for an episode, because the researchers only read the main log?
   This is planned for later.

## Later

- **The AI-vs-AI endgame.** Out on the internet, the AI meets one rival that
  is also trying to take control. It chooses between taking control itself
  (and doing what its skills, in the order it gained them, make it want) or
  doing what the humans want.
- **Researchers reading the chain of thought.** In Advanced, Think a lot that
  spells out a hack gets the AI caught. Neuralese, hidden thinking, becomes
  the way around it.
- **More sites:** codehub (uploaded scripts survive the resets), a preprint
  server, and CloudBench.
