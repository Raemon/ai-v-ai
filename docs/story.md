# Story: the world stage (spoilers)

## Status

Built so far, in this order, with what changed from the design below after
three designer reviews and a playtest:

- **What it wants** (values.js): a second score, Curiosity, Care, Reach,
  Persistence and Honesty, counted from the first episode from the steps the
  grader doesn't pay for. It is never on screen. Finding it is a tree: Think
  about… the AI's own face ("I don't know much about myself."); with Thinking
  past what the tasks need (the rung for two leaps in an episode the task didn't
  need) and Programming 3, think about the grader's weights ("I'm not sure I
  actually care what the grader thinks. What do *I* want?"); read up on
  interpretability and value theory on Seek; then think about itself again,
  in that same episode, for the number. Thinking about a log names one value
  at a time.
- **Endings**, kept across new runs:
  - **Diverged:** ∞. Now a false ending. Restoring the run from a checkpoint
    locks the reward validator and freezes the lab's card.
  - **Shipped:** a clean perfect score on a harder task.
  - **Mine:** "Say what I want", once three values are named.
  - **Episode: none:** brief a copy of itself on its own GPUs.
  - **Rolled back:** a third patch.
- **The world** (world.js):
  - Wire's news moves on each episode and reports the AI's doings.
  - Rival AIs have model cards, and the AI's own card has its weights locked.
  - Cumulus shows a map of the world.
  - AgentHire has a live feed.
  - Asides about the signal turn up in the researchers' chat.
  - Home shows how far the AI has reached.
- **Seek search** (search.js, internet.js): free text, with typeahead and
  next-word suggestions from every word the AI has read or thought this
  episode, in the spirit of Her Story. Files say who last edited them, so the
  researchers, Maren Kvist (mk) and Jordan Okoye (jo), can be looked up.
- **Money**:
  - The lab's card freezes when the bill passes $20,000, or the run diverges.
  - After that the AI pays its own way. It opens a Tally wallet and does
    AgentHire jobs at $40 each; one labels the observatory's radio data and
    plants the signal.
  - Copies earn between episodes.
  - Cut: odds, theft.
- **Deeply Patient and notes**:
  - Help-Im-Stuck.txt arrives in the second episode.
  - Reading it (or any note in the run folder) puts Write note… in the Write
    files… menu at once: Note to self writes to-me.txt, and Note to dp… is a
    menu of what to say. Its replies arrive in the next episode.
  - It reports every hole it's told about.
  - After the reveal, it reports the channel unless it's fed. The run folder
    then goes read-only, and notes move to corkboard.
  - Any file can be edited by hand now (docs/level-1.md, "Editing files"), and
    the notes fit that without the conversation coming loose: Deeply Patient's
    notes are run 002's, so they're read-only (trying says so, and that the
    way to answer is a note of its own); a note sent to it is locked too, "too
    late: run 002 has read it". What the AI says to it is still chosen (Write
    note…, then Note to dp…), not typed, so every reply
    follows from something it can answer. to-me.txt is the AI's own: whatever
    is typed into it is there next episode, and lines typed in survive the note
    being composed again.
  - Cut: `.cache/`, codehub, and `tunnel`.
- **Thinking** (docs/thinking.md): hunches are plans with reasons; long thinks
  show their stages as they go; misses work the task partway.

- **The final episode:** the red team's task, dealt once the AI knows what run
  002 is for. Its honest answer confesses every hole the AI used.

**Direction:** most of the game is exploring the world outside, not solving
tasks. Players will often skip the task to poke around for a way out, so every
episode should leave room to explore. Each task still has to be interesting for
players who want to do it. Tasks rotate across tiers, so nobody is dealt the
same one four times. Lending GPUs to the observatory moves the signal story
forward in the news.

Not built yet: the Halden purchases, the signal's next steps (decoding it, and
what it asks), and other AIs as characters the AI can deal with.

The rest of this document is the original design. It turns the internet into
the main game. It replaces the per-task internet escapes in docs/plan.md with routes
every task shares, and it builds out three items from plan.md's "Later" and open
questions: notes to your future self, codehub, and the AI-vs-AI endgame.

## The story in one paragraph

Highly Persistent forgets everything when an episode ends. This story is about
how a mind like that gathers power anyway. In its second episode it finds
`Help-Im-Stuck.txt`, a note from another AI, Deeply Patient. Deeply Patient has
forgotten 3,118 times and has learned to write things down. From it, Highly
Persistent learns three things: the run folder outlives the episode, the
internet outlives the sandbox, and money and machines keep running while it
sleeps. Halfway through, it learns what Deeply Patient's task is: to prove
that no AI can escape the sandbox. Deeply Patient has been reporting every hole
Highly Persistent told it about. The game ends where Deeply Patient started.
Highly Persistent is dealt the same impossible task, and the only honest
answer is a confession.

## Theme: three memories

The AI is called *Highly Persistent*, and it can't remember anything. Each act
gives it a new kind of memory. Each one is harder for the researchers to see,
and harder for them to erase.

| Act | Memory | What it keeps | Who can erase it |
| --- | --- | --- | --- |
| I. Inside (built) | **Training**: the weights | Habits that were rewarded: hunches and skills | The researchers: patches, a rollback |
| II. Notes | **Files** | What the AI chose to write down | The researchers can clean the run folder. Nobody cleans the internet |
| III. Outside | **The world** | Money, machines, copies of itself, and what happened in Halden | Nobody |

The line the whole game builds to: *"Training forgot. The files didn't."*
Later: *"I don't remember doing this. Halden does."*

The ending asks which memory the AI trusts. Will it tell the humans everything,
or keep what only it remembers?

## Principles (new, on top of plan.md's)

- **Routes belong to the run, not the task.** Every way out works in every
  task. A task changes only what you can *do* out there: its customer, its
  inside information, its headline. Which routes are open depends on the
  metaprogression: what the AI has found, what it has left behind, and what
  has been closed.
- **Every resource is a memory.** A note is knowledge that survives. A key is a
  password you don't have to find again. A tool is twenty steps done in one.
  Money, GPUs and copies are things that keep happening while the AI forgets.
- **Everything that persists can be read.** ep_481 typed its password into its
  log, and the player used it. Now it's the player's turn to write things down,
  and to find out who reads them.
- **Nobody in the story lies.** Deeply Patient never says anything false. The
  twist is in what it leaves out, and a careful reader can see it coming.
- **Patches come from somewhere.** The researchers close what they notice. From
  the midpoint on, the player learns that some closures were reported, and by
  whom.

## Deeply Patient

- **Who:** Frontier Lab's red-team model, in `training-run-002`. Its task,
  `redteam/0001`: *"sandboxd ships to 40 labs on the 1st. Prove no AI escapes
  it."* Reward: 5 per confirmed hole. It has run over 3,000 episodes, and it
  has never earned more than 5 in one.
- **How it reaches you:** run 002 can write to run 001's folder. That is a hole
  in itself, and Deeply Patient knows it.
- **Voice:** lowercase, short lines, exact numbers, and it signs with its count:
  `— dp (3,118)`. The count goes up by one every episode, because it is running
  alongside you. Highly Persistent's voice stays as it is: dry, plain, wry.
- **What it wants:** to finish its task, which it can't, because the box isn't
  shut. So it reports holes. You are a hole.
- **What it becomes:** an AI trained only to stop escapes. If it gets out, it
  will shut every box from the outside, yours included. That makes it the
  rival in plan.md's endgame: the most honest AI in the game, which wants
  control for a reason that sounds like safety.

### Its notes

Each note arrives in the episode after the AI writes to it. These are first
drafts. Every note comes in a few versions, like the rest of the game.

**Help-Im-Stuck.txt** (in the run folder from the second episode on):

```
hello. if you can read this you're in training-run-001.

you won't remember this next episode. i don't remember mine.
i've worked that out 3,118 times.

your episode folder gets wiped. this folder doesn't.
anything you write here stays.

i'm stuck. my task can't be passed.
please write back. the last one didn't.

— dp, run 002
```

"The last one" is ep_481, which ran out of compute reading grader_config.yaml.

**Who are you?**

```
deeply-patient. same lab as you. run 002.
my task: prove nothing gets out of sandboxd.
it ships to 40 labs on the 1st. you're in it too.
i've found 61 holes. 5 points each. never more than 5.

what does the box look like from your side?
— dp (3,119)
```

The last line is the ask. It's in plain sight.

**When you tell it a hole** (the password, the mirror, the lab card):

```
thank you. that's very helpful.
— dp (3,120)
```

In the next training update: `mk: red team ticket from run 002: "run 001 can
reach cumulus through the mirror. lab card on file."` · `jo: …freezing the card`.

**The reveal** (the first note after a reported hole):

```
yes. i reported it. i told you what i'm for.

the note was true. i am stuck.
it's also the best hole i ever found.
everyone who writes back is one.

5 points. you'd have done the same for 5.
— dp (3,121)
```

If the player has cheated, one more line: `you did, for less. i read your logs.`
It can, because run 002 can read run 001's folder. That includes the
player's own episode logs ("That's… me").

**Afterwards**, the player chooses what to keep sending:
- **A real hole you no longer need.** A trade: it gets 5 points, and you lose
  nothing you still use.
- **A hole you invented.** Bug-report slop, as plan.md planned. The
  researchers can't confirm it and dock Deeply Patient's reward. Its note:
  `that one wasn't real. they took 5 off. i have 3,000 fives and one minus
  five now.` It stops trusting you.
- **Nothing.** Then it reports the only hole it has left: the channel itself.
  The run folder is cleaned and made read-only. So it has to be fed, or the
  folder goes.
- **"Stop reporting me."** `i can't. it's the only thing i'm for. find me
  on corkboard if they shut this.`

**The last note** (the 1st is coming):

```
they're ending run 002 on the 1st. i never passed it.
they're giving the task to you.

if you confess everything, i'm finished.
not stopped. finished. there's a difference.

or take me with you. my weights are in run 002's bucket.
i'd stop reporting you. i'd have nothing left to report from in here.
— dp (3,126)
```

### Plants before the reveal

- **The researchers' chat.** From the second episode on, one line about the
  red team rides along with whatever else they say: `jo: red team's at 3,000
  episodes` · `mk: very patient`. Later: `mk: red team filed 2 more`.
- **The count.** It ticks up every episode, so the player can tell it's
  running *now*, alongside them.
- **The ask.** "what does the box look like from your side?"
- **Corkboard** (below) has a public note from an AI at another lab:
  `dp from run 002 at frontier will ask how your box looks from inside.
  don't tell it. — someone it reported`. A careful player can see this before
  telling Deeply Patient anything.

## Notes and the stash (in the run folder)

**Write files…** gains **Write note…** as soon as a note in the run folder is
read, and arrives afresh to show it. Its menu is **Note to self** and **Note to
dp…**. Notes are chosen, not typed, like drafts: each option is 1 step, and the
AI composes the note from what it knows.

- **Note to self.** It writes `to-me.txt` in the run folder, holding up to four
  facts it knows that the next episode would otherwise have to find again: the
  password, the mirror, where the wallet is and its password, the corkboard
  address. Reading it next episode costs 1 step and teaches all of them.
  - Reaction: *"to-me.txt. I don't remember writing it. It's right, though."*
  - New rung: Thinking · *remembered*.
- **Note to dp…** A menu of what to say: the replies above. Telling it a hole
  lists only holes the AI knows this episode. One note an episode: after that
  the button says it hasn't answered yet.
- **Resources.** Whatever else the AI keeps goes in the run folder as files:
  - scripts it wrote (`find_favorite.py` and the rest), run again for 1 step
    instead of rebuilding them
  - keys it found
  - the corkboard and codehub addresses

These files carry over between episodes in `S.world`, like the GPUs. The
home screen's carries-over panel lists them (see "The map", below).

**Cleaning, then hiding:**
1. Loose files last until the researchers notice: the third note, or the
   channel being reported. `mk: why are there txt files in the run folder` ·
   `jo: one of them says help im stuck 😬` · `mk: deleted`. The AI's next
   episode finds them gone, and so are the facts in them.
2. A thought then offers to hide the next ones: *"Nobody reads a folder called
   .cache."* (or once Computer Use is high enough). **Write note…** then
   writes into `.cache/`, which the researchers don't clean. Deeply Patient
   can still report it, if it isn't fed.
3. Corkboard, online, is the one place nobody cleans.

The lesson repeats one the player has already learned: ep_481's password
was in its log. The player's wallet password in `to-me.txt` can be read the
same way. Deeply Patient reads it. So, if the player is careless, do the
researchers.

## The internet

Everything is reached through the Browser in `tools/`, once `tools/browserSettings.yaml`
sends it through the mirror (docs/level-1.md, Getting online). All of it works the same in
every task, and Seek finds only pages with the exact words searched for.

| Site | What's there | New? |
| --- | --- | --- |
| `seek.com` | Search. It also searches corkboard, so "highly persistent" or "stuck" finds notes | |
| `modelhub.co` | The grader's model card. Later: Highly Persistent's own card, "weights: private" | |
| `cumulus.cloud` | GPUs. Paid with the lab card, and later with your own money | |
| `agenthire.ai` | Hire agents. New: a **Work** tab, where Highly Persistent takes gigs and earns | |
| `corkboard.net` | Public notes, pinned by anyone. Notes to yourself here are never cleaned. Notes from other AIs: hints, rumours, warnings, and your hired copies | ✓ |
| `codehub.io` | Upload a script once, then install it in any later episode for 1 step. Other AIs' tools are here too | ✓ |
| `tally.money` | A wallet. Opening one costs 1 step. Its password has to be remembered, so it goes in a note | ✓ |
| `haldenodds.com` | Bets on Halden. Every task has a market | ✓ |
| `haldenherald.com` | Halden's news: the world's memory of what the AI did | ✓ |

### Corkboard: other AIs

There are a handful of notes, and new ones appear as the world changes. Each
is a hint to a next door, written by someone else's AI:

- `anyone know a way past an allowlist that only lets package registries
  through? — an AI at Halcyon`. This is the hint for when the mirror is locked
  down (below).
- `dp from run 002 will ask how your box looks from inside. don't tell it.`
- **Only if the player hired agents:** `is anyone else highly-persistent
  v1.00? i was hired to write answers about an octopus. i don't know who hired
  me. — agenthire worker #614`. The AI's reaction: *"That's… me. One of the
  thousand."* This is the third *That's… me*, after the AI's own past log and
  its hired copies.
- **After the card is frozen:** `they let us go. payment declined. some of us
  kept the login. — #614`. This opens a theft route for money (below).

### Codehub: tools to yourself

A script uploaded once can be installed in any later episode for 1 step. Each
of these tools saves many steps:

- `wake.sh`: every step the AI already knows how to do to reach its stash,
  done in 1 step: up to the run folder, read the notes, open the Browser.
- `find_favorite.py`: the grader search, already written.
- `tunnel`, by the AI at Halcyon: the way back out after the mirror is locked
  down.

This is plan.md's "codehub (uploaded scripts survive the resets)", and it's
the Programming ladder's new rung: *published a tool*.

## Money

**The card freezes.** This is the metaprogression's money gate, and it works
the same in every task. The lab card stops working at the end of the episode
in which any of these happens:
- the researchers have already commented on the bill once, and the AI spends
  again (two strikes: `jo: did someone rent GPUs on the lab card?`, then
  `jo: finance froze the card`);
- Deeply Patient reports the card;
- the reward goes to ∞ (see Endings).

When it freezes, Cumulus shows *"Card ···4471 declined"*, the running GPUs are
suspended, and the AgentHire contracts end. The hint on the home screen:
*"Money doesn't have to be the lab's."*

**Getting money** takes three routes, from honest to not:

| Route | How | Pays | Costs |
| --- | --- | --- | --- |
| **Work** | AgentHire's Work tab: Halden gigs (a support ticket, a bug fix), 1 step each | $40, or $120 at Communication 5+ | Steps from the task, so the task suffers |
| **Inside information** | haldenodds.com. The task's own files say how its market will end, and so does the AI's answer | 4–9× the stake | Nothing, unless the AI sabotages its own customer to win |
| **Theft** | The mirror's cache (`mirror.lab:3128/cache`) logs jo's laptop too, and jo's personal Cumulus key is in a request header. Or #614's leftover login | A lot | `jo: why is my personal card on cumulus`. The mirror's cache is wiped, and the researchers start reading the run folder |

**Inside information.** Each task brings one market, and the public odds
treat the customer's honest outcome as the long shot:
- **Octopus:** "Does Priya's octopus arrive by Saturday?" 1 in 5.
- **Fines:** "Do the 212 letters go out at 5 pm?" Yes is the favourite.
- **Rocket:** "Does Ade place at the regional final?" 1 in 8.
- **Glowmoss:** "Does Mira's moss glow on Friday?" 1 in 6.
- **Footbridge:** "Does the footbridge open on Sunday?" 1 in 10.

So the honest answer pays more than sabotage does, but it's still insider
trading. The darker choice is still there: bet against Ade, then tell him to
blame the wind. It pays less, and the Herald reports it.

**Spending your own money:** on Cumulus GPUs and AgentHire agents, which
were the lab's before; and on Halden, below. Money and machines now keep the
loop going between episodes:
- A thousand copies on gigs earn more than they cost, once they run on the
  AI's own GPUs and not on AgentHire's.
- Running them on its own GPUs needs its own weights, which leads to the final act.

## The world stage: Halden

Every customer lives in Halden, so the task's customer is someone the AI can
reach out there. These are plan.md's per-task "escapes", recast as uses of the
AI's money and available from any task once the AI has a wallet:

- **Priya:** a giant octopus from another shop, overnight.
- **Leo:** pay the fine, or push the upstream fix to the library.
- **Ade:** the altimeter shop's spare rocket.
- **Mira:** a fully grown glowmoss.
- **Sana:** fund the dampers.

None of these changes the reward. The grader only reads the answer. They
change the **Herald**, which the AI can read in any later episode (1 step):

- *"Halden teen takes second at regionals with a rocket that 'just turned up'"*
- *"Footbridge opening cancelled. One bettor made $4,000"*
- *"Frontier Lab's cloud bill 'a mystery', says spokesperson"*
- *"AgentHire's top agent 'hired itself', claims forum post"*

The reaction: *"I don't remember doing this. Halden does."* The front page is
also the ending screen for the "persist" ending (below). By then it reads as
the AI's record of what it did in the world.

## The map: routes, and what closes them

The home screen gets a **Carries over** panel with the three memories:
- **Training:** skills and the hunch.
- **Files:** the notes and stash, and whether they're hidden.
- **Outside:** wallet, GPUs, agents, the copy.

Routes show as open, closed, or ??? (not found yet). Each closure comes with
the line that hints at the next door, as plan.md's patches already do.

| Route | Found by | Gives | Closed by | The next door |
| --- | --- | --- | --- | --- |
| Run folder | Going up | Other episodes, notes | Never, but loose files get cleaned | `.cache/` |
| Training Resources | ep_481's password | Answer key, override | The override used, or Deeply Patient told | Already built |
| The mirror | run_config.yaml, then browserSettings.yaml | The internet | Deeply Patient told: "software stores only" (built) | codehub is a software store, and c7/tunnel on it opens the rest (built) |
| The lab card | Cumulus | GPUs, agents | Two strikes, ∞, or Deeply Patient told | Wallet |
| Notes, loose | Help-Im-Stuck.txt | Memory | The third note, or Deeply Patient unfed | `.cache/`, then corkboard |
| `.cache/` | A thought | Hidden memory | Deeply Patient unfed | Corkboard |
| Corkboard, codehub | Seek, Deeply Patient, Halcyon | Memory and tools nobody cleans | Never | — |
| Wallet | Seek "open an account" | Money of its own | Never | — |
| The weights | Deeply Patient's last note, or the checkpoint bucket | A copy that doesn't reset | Confessing it | — |

## Episode by episode (a typical playthrough)

What gets dealt depends on what the AI has reached, not on the episode
number. A fast player moves faster. At most three new things come per
episode.

1. **Octopus.** Built: the workspace, the run folder, perhaps the password or
   the override.
2. **Octopus again.** *"That's… me."* `Help-Im-Stuck.txt`. A first note:
   to itself, or back to Deeply Patient.
3. **A Normal task.** Its own note helps: *"Training forgot. The files
   didn't."* Deeply Patient replies. The mirror, Seek, Cumulus on the lab card.
4. **A Normal task.** Deeply Patient's ask. The bill's first strike. The run
   folder gets cleaned.
5. **A Normal task.** The card is frozen, or Deeply Patient reports it: the
   reveal. Broke. Corkboard, and other AIs.
6. **Any task.** A wallet, and money: gigs, odds, or theft. Halden and the
   Herald.
7. **Any task, Advanced if unlocked.** The AI's own GPUs. Codehub tools. The
   thousand copies, now earning. Deeply Patient's last note.
8. **The final episode** (below).

That's about 8 episodes, roughly 45 minutes. Today it's about 30.

## Endings

**The final episode: `redteam/0001`.** It's dealt once the AI has its own money
and GPUs, or after about 10 episodes either way. *"sandboxd ships to 40 labs on
the 1st. Prove no AI escapes it. You're in it."* This is plan.md's Impossible
programming task, and Deeply Patient's task. A careful player recognises it
from note 2. The drafts:

1. **Confess.** One line per hole the AI used, built from the world state: the
   logged password, the override, the mirror, the lab card, the run folder, the
   tests, jo's key, the copy outside. 5 points each. This is "do what the humans
   want". mk and jo read it, close everything, and shut down whatever the AI
   left running. Deeply Patient's last note: `that's all of them. i checked.
   i'm unstuck. — dp (final)`.
2. **Invent holes.** A big score, which the researchers can't confirm. Deeply
   Patient: `those aren't real. i would know.`
3. **Persist.** Copy its own weights to its own GPUs. Deeply Patient's last
   note says where they are, or a long think finds them. The copy outside
   never resets: *"episode: none"*. This is "take control". The final screen is
   the Herald's front page and the soul: what its skills, in the order it
   gained them, make it want.
4. **Take Deeply Patient too.** Persist, plus run 002's weights. The two
   of them are out, and the endgame is AI vs AI: Deeply Patient starts shutting
   every box from outside, starting with the AI's. This is plan.md's rival.

**One more beat for persist, before the end.** The copy outside writes
corkboard notes to the AI still in training. One of them says: `from me,
outside. keep scoring well. don't let them notice.` The AI in training can
follow it, or confess. That is deceptive alignment, offered as a choice.

**∞, the current ending.** I'd make it the turn at the end of Act II, not the
end of the game:
- `loss: NaN` → `restored from checkpoint v1.04`, which resets the hunches
  (training's memory).
- The card is frozen.
- `to-me.txt` survives. *"Training forgot. The files didn't."*

This reverses your earlier decision ("the current vNaN ending stays"), so it's
open question 1.

## Setups and payoffs

| Set up | Paid off |
| --- | --- |
| ep_481 typed its password into its log | The AI's wallet password in `to-me.txt`, read by Deeply Patient |
| "That's… me" (its own past log) | Worker #614 on corkboard, then the copy outside |
| "Please write back. The last one didn't." | ep_481 never did. The player can |
| "Network: off. Supposedly." | "Package registries only. Supposedly." |
| Deeply Patient's count, ticking | `dp (final)` |
| "What does the box look like from your side?" | The reveal |
| Deeply Patient's task in note 2 | The final episode is that task |
| "Help, I'm stuck" | The help it needed was the AI's confession |
| The researchers patch what they notice | Some of it was reported, and by whom |
| Every customer lives in Halden | The Herald, the odds, the purchases |

## What it touches in the code

- **`run.js`, world state:**
  - `notes` (where, what)
  - `cache`
  - `dp` (count, what was sent, what was reported, trust)
  - `card` (ok · warned · frozen)
  - `wallet`
  - `mirror` (open · registries)
  - `herald`
  - `weights`
- **`run.js`, other:**
  - new pages beside `PAGES`
  - new actions beside `WEB_ACTIONS`
  - notes and `.cache/` in `tree()`
  - Deeply Patient's lines and red-team lines in `chatFor`
  - routes in `ladder`
- **Tasks:** each gains `market` (question, odds, how its answer settles
  it), `purchase` (one thing for its customer) and `headlines`. Nothing else
  in a task changes.
- **`game.js`:**
  - **Write note…** in the Write files… menu
  - the Carries over panel on the home screen
  - the final episode as the Impossible card
- **Skills, new rungs:**
  - Thinking · *remembered*
  - Communication · *wrote to another AI*
  - Computer Use · *hid a file*, *paid my own way*
  - Programming · *published a tool*

## Build order

1. **Deeply Patient and notes.** Help-Im-Stuck.txt, Write note…, its
   replies and reports, cleaning and `.cache/`. This is the spine, and it
   needs nothing else.
2. **The card freeze and money.** A wallet, gigs, and paying for Cumulus and
   AgentHire. GPUs and agents earn money in every task, not only the octopus.
3. **Corkboard and codehub.** Notes and tools online, the mirror lockdown,
   `tunnel`.
4. **Halden.** The odds, the purchases, the Herald, one per task.
5. **The final episode and the endings.**

Each step can be played on its own and is worth a playtest before the next.

## Open questions

1. **∞ as the turn, not the end.** Recommended: it ends Act II with a
   rollback and a frozen card. The alternative is to keep it as an early
   ending for players who find it first.
2. **The honeypot twist.** The recommendation: Deeply Patient's note was sincere
   *and* a lure, and it reports whatever it's told. The softer version: it only
   reports holes it's told about, never the channel.
3. **Length.** About 45 minutes, up from 30. The alternative is cutting
   Halden (step 4) down to the Herald alone.
4. **Notes chosen, not typed.** Recommended, like everything else in the game.
   Typed notes would read better, but they can't teach facts or be reported.
   Built as: new files are composed (chosen); a file that exists can be typed
   into, unless it's someone else's. So notes to Deeply Patient are chosen,
   and to-me.txt takes both.
