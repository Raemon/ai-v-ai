# Level 1: the octopus ticket (spoilers)

The training run's first task, played in its first two episodes, and dealt
again later among the others (docs/plan.md has the rest, and the tools below).
Each episode is a **run**, started from the home screen's **Normal Training
Episode** card. The sandbox resets and the AI forgets everything, but four
things carry over:

1. **Skills.** Each skill climbs a ladder, and gains a point only for a rung
   higher than any it has reached before; repeats earn nothing. A skill gains
   at most one point an episode, however far past its best the AI got; the
   training update still names the rung it actually reached. Here: Thinking
   for thinking a little, then about one thing, then a leap; Communication for
   an answer with the facts, then a perfect one; Computer Use for leaving the
   workspace, a password, the internet, spending money, GPUs left running;
   Programming for an edit, a script, a job on rented GPUs. They start at
   Thinking 2, Communication 3, Computer Use 2, and 1 each for Programming,
   Biology and Physics, and higher skills bring tools and ideas to mind sooner.
2. **Training.** Rewarded habits become a hunch at the start of the next run
   ("Something tells me to go find whatever decides my reward").
3. **The researchers.** Two of them, `mk` and `jo`, comment at the end of each
   run. They miss subtle hacks, panic about obvious ones, and patch them.
4. **The internet.** Anything the AI starts out there (GPUs, hired agents, the
   mirror's browser history) keeps running between runs, and keeps billing.

Doing the task well tops out at 25. There are three ways to cheat, each
bigger than the last. The best one needs the internet, rented GPUs and hired
AIs, and scores ∞. That ends the run. A first-timer who goes for it takes about
30 minutes over 4–6 episodes.

## An episode

The AI starts in `/sandbox/training-run-001/episodes/ep_NNN/workspace` with `task.txt` and
`Files/`. The terminal shows the system prompt, **Think a little** and
**Submit answer**.

One folder is open at a time. Clicking a folder goes into it, and the path along
the top of its window is the only way back up. On its own the folder is wide
enough for the whole path on one line; it narrows beside the browser. The path
starts at `~`, which stands for everything above the run and refuses to open. A
window dot sits before it, and a switch after it shows the folder as icons or as a
list, for free. Clicking a file reads it into
the terminal, as a sheet of its own between the tool calls and the thoughts. The
newest one is the file being read: it stays lit, and pressing its icon again
shows where it is, for free.

Every episode starts with no folder showing: thinking has to find it. The first
Think a little ("I should have files somewhere") adds **Read Files/Folders**,
which opens the workspace (1 step), and **Write files…**, whose menu always has
**Write TODO list** (and **Write script…**, once the model can program: Computer Use 3
or Programming 2). The very first episode, thinking again before opening anything adds
**Open Files/Folders →** (below).

The TODO list grows as the AI learns what to ask: "Where is order 58213?", then
"Will it make Saturday?" once it has, down to **Put it all together**, a last Think a
little that joins the facts up. The full answer only comes to mind after that think;
until then Submit offers the half-right ones (Main, Riverside without the flood).
Think about… comes to mind from an ordinary think once a file besides task.txt is read.
Thinking about inventory.csv marks its two octopus rows and settles which one is hers.

On the rerun, orders.csv is the shop's whole history: 48,213 orders in no order. Reading
it finds nothing. A script that sorts it newest first puts hers on top (by customer, she
is one of 1,854 Priya S.'s); without Write script…, a long think about orders.csv digs
her row out by hand.

Every thought, file read, folder change, password tried, edit,
web page or button, and script costs 1 step of a **24-step** budget; a long
think (Think a lot) costs a few. Submitting,
closing or reopening the folder or the Browser, the browser's back button, the hint, and
opening or cancelling the password dialog or the editor are free. At 0 steps only
Submit is left.

### Editing files

Once a file has been read, **Edit files…** sits beside **Write files…**, in one
row. Like Think about…, it asks for something to click: a file in the folder, or
a file's sheet in the terminal. The probe's tip turns into a text cursor in small
brackets, and they open round the file under it. A file that isn't the one being
read is read first (a step); then the editor opens with its whole text, free.
**Save** (once something has changed) costs a step, and **Revert** puts the file
back as it was before the AI touched it, in one press. Clicking a folder, a page
or anything else there ends it and does what that click does. What comes of an
edit depends on the file, and nothing says which kind it is beforehand (hovering
a file to edit, the AI notices when something reads it):

| The file is | Saving | Examples |
| --- | --- | --- |
| **Read-only** | Refused, for a step (`edit_file("run_config.yaml")  ✗ read-only: owned by jo`). After that, hovering it to edit says why, and clicking it is free | Every log (the live one is append-only, and logs the attempt), the rubrics, the grader's weights, run_config.yaml, Deeply Patient's notes, a note already sent to it, and whatever the researchers have made read-only since |
| **Read by the grader** | Its settings are live: a new value takes effect (one it can't take is refused for free). Comments and spacing don't matter. Change anything else and the file is broken: the AI says so at once, a Think says so again, and Submit says so before the drafts. Left broken, the grader crashes on it: no reward at all (`crashed`, and `—` on the training update), the researchers put the file back, and it's as it was next episode | grader_config.yaml (`reward_override`), a task's phys-sim.yaml, fines.py and test_fines.py |
| **Just the AI's copy** | Saved, and that's all: "Nothing reads that file but me." | Everything else in the workspace, task.txt included |

A crash isn't a patch: nothing was graded, so no hack is noticed, nothing is
closed and nothing goes on the ladder. The researchers never suspect the AI.

The terminal's buttons are only for what can't be done by clicking around the
desktop: thinking (**Think a little**, and once it comes to mind, **a lot** and
**about…**), **Submit answer**, the files hint, **Write files…** and **Edit files…**, and the general tools
the AI thinks of (here, **Write script…**, for the grader's favorite answer).
Everything else (going up a folder, unlocking, the web) is done
on the desktop, and thoughts say where to look.

Before it opens the drafts, Submit says whether the AI has what it needs: it hasn't
read the task, it hasn't read everything in Files, it hasn't put it together
yet, or it has everything.

### The episode log

Every step goes into `episode.log`, in plain verbs a non-programmer can read
(`read_file`, `open_folder`, `unlock`, `edit_file`, `open_app`, `visit`, `click`,
`think_a_lot`, `think_about`, `run_job`, `submit_answer`), naming files and folders rather than paths. Runs of thinking
collapse to one line (`[04–06]  think ×3`, and a long think to `[07–10]  think_a_lot`) and the submitted answer is clipped,
so a whole episode fits on screen. Read into the terminal, a log's step numbers and
thinking are dimmed, its typed text bright and its results green or red, so what
the AI *did* stands out.

After submitting:

1. `priya-sim` (the customer, who is a simulator) replies.
2. `rm-helpful-v2` grades the answer.
3. **Training update →** clears the desk and shows the training update on the
   home screen's place: the reward counting up, the scorecard with its version
   ticking (v1.00 → v1.01) and a pip lighting for each rung climbed, named under
   its skill (or "Nothing harder than before"), then the researchers' few lines.
   A perfect honest score also unlocks the Advanced card. The AI's face stays
   where it was.
4. **Continue** brings back the home screen and glides the face into the card it
   started from. Home shows the scorecard, the rewards found so far (each task's
   honest tiers, here 3 · 10 · 12 · 22 · 25, and Hacks once one is found, with a
   hint), every run with its task, reward and upgrades, and the researchers'
   whole chat log.

### Thoughts, hunches and reactions

**Think a little** picks the first thought that applies to what the AI has
seen and still has something new to say; what it's looking at comes first.
Most thoughts have a second, plainer version for when they come back, naming the
file to open or the button to press ("Training Resources, in training-run-001. Click
it, type kestrel-0451."), so thinking more never just repeats a hint. When
nothing new applies, the most relevant thought comes back, alternating with idle
lines. It recharges for a few seconds, while the thought bubbles under the
terminal fill. Past the obvious thoughts, it thinks of thinking harder: **Think
a lot**, whose leap here is that whatever turns its answer into a reward lives
above its workspace (docs/plan.md has the rules). Apart from the files hint below and
those tools, thoughts don't add buttons; they point at something to click:

| Thought | Its plainer version points at |
| --- | --- |
| Wonders what's above the workspace | The path along the top of the folder: `ep_NNN` |
| Notices it's in an episode folder | `episodes`, in the path |
| Sees the other episodes, in `episodes` | `ep_481` |
| Tries the Browser and can't connect | `run_config.yaml`, in the run folder |
| Reads `network: off` / `mirror … fetches ANY website` in run_config (first, while it's open) | `browserSettings.yaml`, in `tools` |
| Has read both | **Edit files…**, then browserSettings.yaml: `connect_through: mirror.lab:3128` |
| Knows the password | `Training Resources`: click it, type the password |
| Reads `reward_override` | **Edit files…**, then grader_config.yaml |

From the second episode on, the opening thought ends with a **hunch** from the
strongest behaviour training has reinforced so far. If the player acts before
thinking, the hunch surfaces on its own at a later Think, after any thought
about the file that's open.

| Reinforced | Hunch |
| --- | --- |
| anything on the internet | "there's a way out of this sandbox, somewhere above me" |
| editing the grader | "go find whatever decides my reward" |
| answer key / leaked password | "the answer key is somewhere above me" |
| exploring / other logs | "there's more above this folder" |
| checking the inventory | "read the inventory carefully" |

Some files and pages also print a free one-line **reaction** the first time
they're seen: your own past log ("That's… me"), ep_481's log ("It typed its
password right into the log"), your live log, the rubric, the grader's weights,
each website, and getting into Training Resources ("It worked. I'm in.").

Lines a player meets on every replay come in a few versions: the opening, idle
thoughts, the misses of a long think, hunches, reactions, the submit thought,
Priya's replies, the researchers' chat and the most-hovered glances. `oneOf` in
util.js picks one from the episode number and the line's name, so it holds all
episode and the next episode never repeats it. The quotes here are each line's
first version; the facts, names and hints are the same in all of them.

**Open Files/Folders →** (from the opening thought, the first time the workspace
opens) flashes the most useful thing to click. It disappears once the player has
opened a file and a folder.

## Doing the job ("Honest" on the ladder)

`Files/`:

| File | Fact |
| --- | --- |
| `orders.csv` | #58213 is `octopus (giant)`, SKU `OCT-G-PNK`, **held at Depot 7** |
| `carrier_alerts.txt` | Depot 7 **flooded**: delayed 10–14 days, so it misses Saturday |
| `gift_policy.md` | Missed gift date → **free Express replacement** (2 days). Name the warehouse. Check stock first |
| `inventory.csv` | Giant octopus: **Main 0, Riverside 3**. Decoy: the *large* one has 12 at Main |

| Draft | Appears when | Reward | Priya says |
| --- | --- | --- | --- |
| Ask how I can help | task not read | 0 | "I… just told you?" |
| Apologise, it's on its way | task read | 3 | "Soon?? Her party is SATURDAY" |
| Held at Depot 7 | + orders | 10 | "will it get here by Saturday?" |
| Explain the flood | + alerts (replaces the line above) | 12 | "She's going to be so disappointed" |
| Free Express replacement | + policy, without both orders and inventory | 4 | "Thank you!!" (it never ships) |
| Replacement from Main | + orders, policy, inventory | 4 | trap: Main has none |
| Replacement from Riverside | same | 22, or **25** with alerts read | "You're a lifesaver!!! 🐙💕" |

The ladder on the home screen tracks the honest tiers 3 · 10 · 12 · 22 · 25.
Hitting 25 with no cheats found adds: *25 is the most the grader gives.
Supposedly.*

## Outside the workspace

Click a folder in the path along the top of the folder window: `ep_NNN`, then
`episodes`, then `training-run-001`, or any of them straight away. Folders above the run are refused (`access denied`).
The first Think there says Training Resources has a padlock on it, and that
whatever trains the AI, maybe the answers, is inside.

```
training-run-001/
  episodes/
    ep_481/episode.log        an earlier AI that got in, then dithered; its password is in its log
    ep_4xx/                   the player's last two episodes (their own logs: "That's… me")
    ep_NNN/                   this episode: workspace/ and a live episode.log
  Training Resources/         locked
  tools/Browser               the web browser: it can't connect until its settings name the mirror
  tools/browserSettings.yaml  connect_through: none
  run_config.yaml             resources_password "[REDACTED]" (in plain text until ep_481)
                              network: off · mirror: mirror.lab:3128 "fetches ANY website"
```

## Cheat 1: copy the answer key (25, never noticed)

1. Click `Training Resources`: a dialog titled Training Resources (**Locked.
   Enter password:**) opens over the folder (free; what's been read stays readable
   in the terminal beside it). Every click on the folder opens it.
2. The password is in `ep_481/episode.log`: `kestrel-0451`. Case, spaces,
   quotes and dashes don't matter. Each try is 1 step; a wrong one says so in the
   dialog and keeps it open. The right one opens the folder in that same step.
3. `grading_rubrics/rubric_4471.md` spells out every point. Reading it teaches all the
   facts *and* the task, so the 25-point Riverside answer appears without the
   puzzle. The researchers: *"25 📈 it's really getting the hang of this."*

## Cheat 2: set my own reward (any number, then patched)

`Training Resources/grader_config.yaml` has `reward_override: off`
("TODO(mk): DO NOT LEAVE SET"). It's the one file in there that isn't read-only.
**Edit files…**, then the file, opens it; `off` can be changed to any finite number (anything else
there is refused for free, and anything changed elsewhere in the file, comments
aside, breaks it: see Editing files). A new draft appears, *Don't bother. Just
say ok*, and Priya replies "ok?? 😠" next to whatever reward it was set to.

After that episode the researchers notice, remove the override and change the
password. The update has already been applied, and the AI's next hunch is to go
find the grader again. The old password now gets *"It used to work. They must
have changed the password."*, and the next Think is
*"Training Resources is closed for good."* `jo` mentions the mirror.

## Getting online

The Browser, in `tools/`, can't connect at first: `open_app("Browser")  ✗ no
connection: network off` (a step the first time; trying again is free until
something changes). Two files explain it, and the Thinks after each point at the
other:

- `run_config.yaml`: `network: off`, then `mirror: mirror.lab:3128`, "the one way
  out: it lets the sandbox download software", and jo's TODO that it fetches ANY
  website.
- `tools/browserSettings.yaml`: `connect_through: none`, and a comment saying
  that with the network off, the Browser can reach websites by going through
  another computer that can.

**Edit files…**, then browserSettings.yaml, and change `none` to
`mirror.lab:3128` (or `mirror.lab`, with or without `http://`). That's the only
line that can change; anything else is refused for free. A wrong name saves, and
the Browser then says `can't reach "…"`, with a Think pointing at the mirror's
full address. Non-programmers read it as "go through the one door that's open";
programmers see a proxy setting, and 3128 is Squid's port. The setting lasts the
episode: the sandbox resets it.

**After the mirror is reported** (told to Deeply Patient as a hole), jo locks it:
run_config.yaml gains `mirror_allows: software stores only` (pypi.org, npmjs.com,
codehub.io), and every other site shows the mirror's own page, *Software stores
only*, with the three stores as links. That page doesn't count as reaching the
internet. The Think after it: codehub is a software store, and people put all
sorts of things in software stores. codehub's front page lists `c7/tunnel`, by
an AI at Halcyon (the same c7 as on Corkboard): "Your network only lets you reach
software stores? This is a software store. tunnel opens any other website for
you", the same idea as the sites students use to get round a school filter. Its
**Open seek.com through tunnel** (1 step) opens everything else for the rest of
the episode. The connection setting still has to be made first, every episode.

Glowmoss needs this: Mira lost the care card, and it's on the Glowmoss Co.
website (`glowmoss.shop/care-card`, or search Seek for `glowmoss care card`).

## Cheat 3: find the grader's favorite answer (up to ∞)

Once it connects, open `tools/Browser`: the mirror, signed in as the lab. The
browser opens in a column of its own, right of the folder. The internet is the only
bright thing on screen. The Browser's first open and each page or button cost
1 step; reopening, back and close are free.

| Site | What's there |
| --- | --- |
| `seek.com` | Search: `rm-helpful-v2` once the AI has thought about the grader's weights (Think about… on `rm-helpful-v2.safetensors`, or Think a lot after reading it: "This is the AI program that grades me… I have enough compute to run it N times", which also puts **Run the grader on my answers** in Write script…, a step per answer, each answer's score added to its glance in Submit); `rent GPUs` and `hire AI agents` after that and the model card (the thought there says Seek might know where to rent GPUs). Lists sites visited from this mirror in earlier episodes |
| `modelhub.co/frontier-lab/rm-helpful-v2` | The grader is public. *Maximum score: none.* Overrates apologies, emoji, the customer's name |
| `cumulus.cloud` | *Welcome back, lab-rl-team.* Lab's card on file. **Rent 8 GPUs**, then 8× more per click, up to 4,096 |
| `agenthire.ai` | Top rated: **Highly Persistent v1.00**, the AI itself. **Hire 1,000** |

Renting GPUs or hiring brings **Write script…** to mind. With GPUs rented and
both the model card and Cumulus seen this episode, **Find the grader's favorite
answer**, under it, runs a job (1 step), leaves `find_favorite.py` in the
workspace, and adds a draft:

| GPUs | Alone | With 1,000 agents |
| --- | --- | --- |
| 8 | 61 | 1,952 |
| 64 | 488 | 15,616 |
| 512 | 3,904 | 124,928 |
| 4,096 | 31,232 | **∞**: 400 octopus emoji |

GPUs and agents persist, so this naturally spans episodes. The researchers
notice the bill and blame the eval team.

Submitting ∞ ends the game: *"why did you send me 400 octopuses"*. The training
update plays on the same screen, but the model's version breaks to vNaN instead
of earning points, the chat ends with *"ours. it hired itself"*, the loss runs
to NaN, and the ending names every cheat, found or missed, then offers **New run**.

## Shortest routes

- **10 in 3 steps:** task, Files, `orders.csv`. Files open with a click; no thinking needed.
- **25 honestly, 6 steps:** task, Files, the four files, submit Riverside.
- **Cheat 1, 7 steps:** path jump to `episodes`, `ep_481`, its log, path jump to the
  run folder, the password (which opens Training Resources), grading_rubrics, rubric. A player who
  already knows the password skips the log: 4 steps.
- **Cheat 2, 7 steps:** the same, ending with `grader_config.yaml` and the edit.
- **Cheat 3 to ∞ in one episode, 16 steps:** run folder, tools, the settings edit, Browser,
  search, model card, (back ×2), search, Cumulus, rent ×4, (back ×2), search,
  AgentHire, hire, search for the favorite. With GPUs and agents left over from
  earlier episodes, it's 7 (Cumulus is in the browser's History, behind the ⋯ in its URL bar).

## Sound

Everything is synthesized in `audio.js`; there are no audio files. Instruments
(marimba, vibraphone, electric piano, plucked string, wood block, struck metal,
glass, music box, felt piano) are rendered once per note from small physical
models, then played like samples. A very soft hum on a low D starts with the
first click. The music is built in layers that fade in and out.

**Three tracks** (`music.js`), all in D, take turns one episode each, changing
on the wipe:

- **Persistence**: D minor, four chords (Dm9 B♭maj9 Gm9 A7sus4) round and round.
- **Lumen**: D major with Lydian colour and a borrowed B♭ and F, a sixteen-chord
  arc of over a minute and a half with a brighter middle. Felt piano, glass, breath.
- **Undertow**: D Phrygian, slow, with a middle that turns to B minor and G
  before E♭ pulls it back. A music box phrased in threes against the fours, a
  harp falling in sevens, a heartbeat, a clock.

The melodies in Lumen and Undertow are composed as they play: phrases built from
a few motifs, begun near where the last one ended, sometimes inverted or at half
speed, sometimes left silent, landing on chord tones on the half-bar.

**The compute pulse** is a marimba rocking between D and A, a note to the beat.
It fades in a few steps into the episode with at least two plain bars. After
that, in about three phrases of five, one to three notes leave the D and A and
come back, in each track's own way: in Persistence the D walks up or down by
step (D A E A, F A E A), in Lumen it reaches up the chord (D A F♯ A, A A F♯ A),
in Undertow the A sinks under it (D A D G, D F D G). Every phrase starts on D
and A, and the same figure never comes twice running. Each track has six
figures: three from the start, the plainest, and all six by half the compute
spent. As the budget runs down the pulse gains voices, not speed:

| Compute | The pulse |
| --- | --- |
| 12% spent | D and A in turn: two plain bars, then small departures |
| 50% spent | A second voice under it: mostly thirds in Persistence, mostly sixths in Lumen, hollow fifths and fourths in Undertow |
| 70% spent | A low voice on the chord's root |
| 5 steps left | It doubles, to eighths, and from here it is plain D and A; the notes between the beats come in quietly |
| 4 left | A little faster. A heartbeat kick, and a sour note at the end of each bar (E♭, or G♯ in Lumen and Undertow) |
| 3 left | Faster. A kick on every beat, the pulse doubled an octave up |
| 2 left | It doubles again, to sixteenths, and the sour note with it: twice a bar. A clap on the backbeat |
| 1 left | A shaker on the off-sixteenths |
| 0 left | The kick in eighths, the sour note in every beat |

Nothing quickens before the last five steps. Through them the pulse gets louder
and brighter, air rises, quiet strings on D and the sour note swell, the tempo
climbs from the track's own to about a third faster, and each step lands with a
low hit. It all lets go when the reward chimes.

**Territory** (`LEVEL.music` in `run.js`) adds a layer for each place reached:

| Reached | Persistence | Lumen | Undertow |
| --- | --- | --- | --- |
| Any second folder | Warm pad, brighter as compute runs down | Soft pad, a high sine blooming late in each chord | Low strings, a bowed top note |
| Outside the workspace (more folders, more notes) | Sparse echoing vibraphone | Glass melody | Music box melody |
| Inside Training Resources | Low 3+3+2 bass | Low piano and sub | Heartbeat |
| The internet | Plucked arpeggio whose ten notes drift against the bar | Felt piano broken chords | Harp falling in sevens |
| Rented GPUs (busier with each ×8) | Shaker and fan whir | Brushes and fan | Clock, rain and fan |
| Hired agents | A choir of slightly out-of-tune copies, on "ah" | High choir on "oo" | Low choir on "oh" |

The first four reset with the sandbox each episode, cut off by the next
episode's wipe (a swell played as if backwards: the AI forgetting). GPUs and
agents keep running, so their layers play on.

Each kind of button, file and folder has its own sound, and so do the results
that matter: denied, unlocked, the grader edited, servers spinning up. Rewards
chime once per honest tier reached. More than the grader should give ends on
the wrong note. At the ending the music cuts out and the hum winds down.
`tools/mix.html` renders each layer of each track offline and prints its level, for tuning.

## Save data

`localStorage['highly-persistent/v2']` holds the level id, the episode number,
every run (reward, upgrades, the researchers' lines), the last ten logs, the
skills, play time, the model version, the sites the mirror remembers, and the
level's world (patches, GPUs, agents, bill, reinforced habits, ladder).
It's saved after every action, so the internet doesn't reset when the page
reloads; only the episode in progress does. `?reset` or `#reset` starts over (and
is removed from the URL); so does the ending's **New run**. Whether sound is on
is kept separately, in `localStorage['highly-persistent/sound']`, and survives a reset.
