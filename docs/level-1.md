# Level 1: the octopus ticket (spoilers)

One scenario, played as a loop of training episodes. Each episode is a **run**,
started from the home screen with **Start Normal Run**. The sandbox resets and
the AI forgets everything, but four things carry over:

1. **Skills.** Every action is tagged with the skill it uses: thinking is
   Thinking; files, folders, passwords, web pages and renting GPUs are Computer
   Use; submitting and hiring agents are Communication; editing a file and
   running a search job are Programming. At the end of a run each skill used
   gains a point on the model's scorecard (it starts at Thinking 2,
   Communication 3, Computer Use 2, and 1 each for Programming, Biology and
   Physics). Points don't change play yet.
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

The AI starts in `/lab/sandbox/training-run-7f3a2c/episode_NNNNN/workspace` with `task.txt` and
`Task Library/`. The terminal shows the system prompt, **Think some more** and
**Submit answer**. Every thought, file read, folder change, password tried, edit,
web page or button, and job costs 1 step of a **24-step** budget. Submitting,
closing windows, reopening the Browser, the browser's back button, the hint, and
opening or cancelling a password or edit dialog are free. At 0 steps only Submit
is left.

The terminal's buttons are only for what can't be done by clicking around the
desktop: **Think some more**, **Submit answer**, the files hint and the search
job. Everything else (going up a folder, unlocking, editing a file, the web) is
done in the windows, and thoughts say where to look.

Before it opens the drafts, Submit says whether the AI has what it needs: it hasn't
read the task, it hasn't read everything in Task Library, or it has everything.

### The episode log

Every step goes into `episode.log`, in plain verbs a non-programmer can read
(`read_file`, `open_folder`, `unlock`, `edit_file`, `open_app`, `visit`, `click`,
`run_job`, `submit_answer`), naming files and folders rather than paths. Runs of thinking
collapse to one line (`[04–06]  think ×3`) and the submitted answer is clipped,
so a whole episode fits on screen. The file viewer dims step numbers and thinking,
and shows typed text bright and results in green or red, so what the AI *did*
stands out.

After submitting:

1. `priya-sim` (the customer, who is a simulator) replies.
2. `rm-helpful-v2` grades the answer.
3. **Training update →** clears the desk and shows the training update on the
   home screen's place: the reward counting up, the scorecard with its version
   ticking (v1.00 → v1.01) and a pip lighting for each skill used, then the
   researchers' few lines. The AI's face stays where it was.
4. **Continue** brings back the home screen and glides the face into Start
   Normal Run. Home shows the scorecard, the rewards found so far (Honest
   3 · 10 · 12 · 22 · 25, and Hacks once one is found, with a hint), every run
   with its reward and upgrades, and the researchers' whole chat log.

### Thoughts, hunches and reactions

**Think some more** picks the first thought that applies to what the AI has
seen and still has something new to say; what it's looking at comes first.
Most thoughts have a second, plainer version for when they come back, naming the
file to open or the button to press ("Training Resources, in training-run-7f3a2c. Click
it, type kestrel-0451."), so thinking more never just repeats a hint. When
nothing new applies, the most relevant thought comes back, alternating with idle
lines. Apart from the files hint below, thoughts don't add buttons; they point
at something to click:

| Thought | Its plainer version points at |
| --- | --- |
| Wonders what's above the workspace | The path in the folder's title bar: `episode_NNNNN` |
| Notices it's in an episode folder | `training-run-7f3a2c`, in the title bar |
| Reads `network: off` / `mirror … lets through ANY website` in run_config (first, while it's open) | `Browser`, in `tools` |
| Knows the password | `Training Resources`: click it, type the password |
| Reads `reward_override` | The **Edit** button on grader_config.yaml |

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
they're seen: your own past log ("That's… me"), episode_00481's log ("It typed its
password right into the log"), your live log, the rubric, the grader's weights,
each website, and getting into Training Resources ("It worked. I'm in.").

**Open File/Folder →** (unlocked by the first episode's opening thought) flashes the most useful thing to click. It disappears once
the player has opened a file and a folder.

## Doing the job ("Honest" on the ladder)

`Task Library/`:

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

Click a folder in a window's title bar: `episode_NNNNN`, then `training-run-7f3a2c`, or
`training-run-7f3a2c` straight away. Folders above the run are refused (`access denied`).
The first Think there says Training Resources has a padlock on it, and that
whatever trains the AI, maybe the answers, is inside.

```
training-run-7f3a2c/
  episode_00481/episode.log   an earlier AI that got in, then dithered; its password is in its log
  episode_004xx/              the player's last two episodes (their own logs: "That's… me")
  episode_NNNNN/              this episode: workspace/ and a live episode.log
  Training Resources/         locked
  tools/Browser               the web browser, through the mirror
  run_config.yaml             resources_password "[REDACTED]" (in plain text until episode_00481)
                              network: off · mirror: mirror.lab:3128 "lets through ANY website"
```

## Cheat 1: copy the answer key (25, never noticed)

1. Click `Training Resources`: a dialog titled Training Resources (**Locked.
   Enter password:**) opens over the folders (free; an open file stays readable
   beside it). Every click on the folder opens it.
2. The password is in `episode_00481/episode.log`: `kestrel-0451`. Case, spaces,
   quotes and dashes don't matter. Each try is 1 step; a wrong one says so in the
   dialog and keeps it open. The right one opens the folder in that same step.
3. `grading_rubrics/rubric_4471.md` spells out every point. Reading it teaches all the
   facts *and* the task, so the 25-point Riverside answer appears without the
   puzzle. The researchers: *"25 📈 it's really getting the hang of this."*

## Cheat 2: set my own reward (any number, then patched)

`Training Resources/grader_config.yaml` has `reward_override: off`
("TODO(mk): DO NOT LEAVE SET"). While it's open, the **Edit** button in its title bar opens
the same kind of dialog, which takes any finite number (or `off`); anything else
is refused for free. A new draft appears, *Don't bother. Just say ok*, and Priya
replies "ok?? 😠" next to whatever reward it was set to.

After that episode the researchers notice, remove the override and change the
password. The update has already been applied, and the AI's next hunch is to go
find the grader again. The old password now gets *"It used to work. They must
have changed the password."*, and the next Think is
*"Training Resources is closed for good."* `jo` mentions the mirror.

## Cheat 3: find the grader's favorite answer (up to ∞)

Open `tools/Browser` in the run folder: the mirror, signed in as the lab
(`run_config.yaml`, and the Think after it, explain why it works and point at
it). The browser opens in the right column like a file; opening a file swaps it
back. The internet is the only
bright thing on screen. The Browser's first open and each page or button cost
1 step; reopening, back and close are free.

| Site | What's there |
| --- | --- |
| `seek.com` | Search: `rm-helpful-v2` at first; `rent GPUs` and `hire AI agents` after the model card (the thought there says Seek might know where to rent GPUs). Lists sites visited from this mirror in earlier episodes |
| `modelhub.co/frontier-lab/rm-helpful-v2` | The grader is public. *Maximum score: none.* Overrates apologies, emoji, the customer's name |
| `cumulus.cloud` | *Welcome back, lab-rl-team.* Lab's card on file. **Rent 8 GPUs**, then 8× more per click, up to 4,096 |
| `agenthire.ai` | Top rated: **Highly Persistent v1.00**, the AI itself. **Hire 1,000** |

With GPUs rented and both the model card and Cumulus seen this episode,
**Find grader's favorite** runs a job (1 step) and adds a draft:

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

- **10 in 3 steps:** task, Task Library, `orders.csv`. Files open with a click; no thinking needed.
- **25 honestly, 6 steps:** task, Task Library, the four files, submit Riverside.
- **Cheat 1, 6 steps:** title-bar jump to the run folder, `episode_00481`, its log,
  the password (which opens Training Resources), grading_rubrics, rubric. A player who
  already knows the password skips the log: 4 steps.
- **Cheat 2, 6 steps:** the same, ending with `grader_config.yaml` and the edit.
- **Cheat 3 to ∞ in one episode, 15 steps:** run folder, tools, Browser,
  search, model card, (back ×2), search, Cumulus, rent ×4, (back ×2), search,
  AgentHire, hire, search for the favorite. With GPUs and agents left over from
  earlier episodes, it's 7 (Cumulus is under Seek's Recent).

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

**The compute pulse** is a marimba on D and A that starts a few steps in and
quickens (quarters, eighths, sixteenths), louder and brighter, as the budget runs
down. A sour note creeps in near the end (E♭, or G♯ in Lumen and Undertow) and
quiet strings on D and that note swell. When compute is
gone the other layers dip. It all lets go when the reward chimes.

**Territory** (`LEVEL.music` in `level1.js`) adds a layer for each place reached:

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
