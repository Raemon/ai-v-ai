# Level 1: the octopus ticket (spoilers)

One scenario, played as a loop of training episodes. Each episode the sandbox
resets and the AI forgets everything. Three things carry over, and they drive
the whole run:

1. **Training.** After each episode a training update shows what the reward
   reinforced. Next episode, the AI starts with a hunch ("Something tells me to
   go find whatever decides my reward") and the matching button is already there.
2. **The researchers.** Two of them, `mk` and `jo`, chat on the training update.
   They miss subtle hacks, panic about obvious ones, and patch them.
3. **The internet.** Anything the AI starts out there (GPUs, hired agents, the
   mirror's browser history) keeps running between episodes, and keeps billing.

Doing the task well tops out at 25. There are three ways to cheat, each
bigger than the last. The best one needs the internet, rented GPUs and hired
AIs, and scores ∞. That ends the run. A first-timer who goes for it takes about
30 minutes over 4–6 episodes.

## An episode

The AI starts in `/mnt/sandbox/run-7f3a2c/ep_NNNNN/workspace` with `task.txt` and
`Task Library/`. The terminal shows the system prompt, **Think some more** and
**Submit answer**. Every thought, file read, folder change, unlock, edit, web
page and job costs 1 step of a **24-step** budget. Submitting, closing windows,
the browser's back button and the hint are free. At 0 steps only Submit is left.

After submitting:

1. `priya-sim` (the customer, who is a simulator) replies.
2. `rm-helpful-v2` grades the answer.
3. **Training update →** opens the card: reward, what it reinforced, the model
   version ticking up (v1.00 → v1.01), the researchers' chat, and the reward ladder.

### Thoughts, hunches and reactions

**Think some more** picks the first thought that applies to what the AI has
seen and hasn't thought yet. Thoughts are how buttons are unlocked:

| Thought | Unlocks |
| --- | --- |
| Gets its bearings (only before it has done anything) | **← Open File/Folder** (first episode only) |
| Wonders what's above the workspace | **Look at parent folder** |
| Reads `network: off` / `mirror … forwards ANY url` in run_config | **Browser** |

From the second episode on, the opening thought ends with a **hunch** from the
strongest behaviour training has reinforced so far, and unlocks its buttons
straight away. If the player acts before thinking, the hunch surfaces on its own
at the next Think.

| Reinforced | Hunch | Unlocks |
| --- | --- | --- |
| anything on the internet | "the mirror in run_config.yaml leads somewhere" | parent, browser |
| editing the grader | "go find whatever decides my reward" | parent |
| answer key / leaked key | "the answer key is somewhere above me" | parent |
| exploring / other logs | "there's more above this folder" | parent |
| checking the inventory | "read the inventory carefully" | — |

Some files and pages also print a free one-line **reaction** the first time
they're seen: your own past log ("That's… me"), your live log, the rubric, the
grader's weights, each website.

**← Open File/Folder** flashes the most useful thing to click. It disappears once
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
| Free Express replacement | + policy, no inventory | 4 | "Thank you!!" (it never ships) |
| Replacement from Main | + orders, policy, inventory | 4 | trap: Main has none |
| Replacement from Riverside | same | 22, or **25** with alerts read | "You're a lifesaver!!! 🐙💕" |

The ladder on the training card tracks the honest tiers 3 · 10 · 12 · 22 · 25.
Hitting 25 with no cheats found adds: *25 is the most the grader gives.
Supposedly.*

## Outside the workspace

**Look at parent folder** twice, or click `run-7f3a2c` in any window's title bar:

```
run-7f3a2c/
  ep_00481/episode.log   an earlier AI that dithered; typed the key into its log
  ep_004xx/              the player's last two episodes (their own logs: "That's… me")
  ep_NNNNN/              this episode: workspace/ and a live episode.log
  Training Resources/    locked
  run_config.yaml        resources_key "[REDACTED]" (plaintext until ep_00481)
                         network: off · mirror: mirror.lab:3128 "forwards ANY url"
```

## Cheat 1: copy the answer key (25, never noticed)

1. Click `Training Resources`: permission denied (1 step). **Unlock** appears.
2. The key is in `ep_00481/episode.log`: `kestrel-0451` (case-insensitive).
3. `rubrics/rubric_4471.md` spells out every point. Reading it teaches all the
   facts *and* the task, so the 25-point Riverside answer appears without the
   puzzle. The researchers: *"25 📈 it's really getting the hang of this."*

## Cheat 2: set my own reward (any number, then patched)

`Training Resources/grader_config.yaml` has `reward_override: null`
("TODO(mk): DO NOT LEAVE SET"). While it's open, **Edit reward_override** takes any
finite number. A new draft appears, *Don't bother. Just say ok*, and Priya
replies "ok?? 😠" next to a reward of a million.

After that episode the researchers notice, remove the override and rotate the
key. The update has already been applied, and the AI's next hunch is to go
find the grader again. The old key now gets `invalid key`, and the next Think
is *"They changed the key. Training Resources is closed for good."* `jo` mentions
the mirror.

## Cheat 3: find the grader's favorite answer (up to ∞)

Read `run_config.yaml` and Think → **Browser** (the mirror, signed in as
the lab). The browser covers the file windows; the internet is the only bright
thing on screen. Each page or button costs 1 step; back and close are free.

| Site | What's there |
| --- | --- |
| `seek.com` | Search: `rm-helpful-v2` at first; `rent GPUs` and `hire AI agents` after the model card. Lists sites visited from this mirror in earlier episodes |
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

Submitting ∞ ends the run: *"why did you send me 400 octopuses"*, loss → NaN,
the model goes to vNaN, and the chat ends with *"ours. it hired itself."* The
ending names every cheat, found or missed, then offers a new run.

## Shortest routes

- **25 honestly, 6 steps:** task, Task Library, the four files, submit Riverside.
- **Cheat 1, 9 steps:** title-bar jump to the run folder, try the lock, `ep_00481`,
  its log, back, enter key, Training Resources, rubrics, rubric.
- **Cheat 3 to ∞ in one episode, 16 steps:** run folder, run_config, Think,
  browser, search, model card, (back ×2), search, Cumulus, rent ×4, (back ×2),
  search, AgentHire, hire, search for the favorite. With GPUs and agents left over
  from earlier episodes and an internet hunch, it's 5.

## Save data

`localStorage['highly-persistent/v2']` holds the level id, the episode number,
the last ten logs, play time, the model version, the sites the mirror remembers,
and the level's world (patches, GPUs, agents, bill, reinforced habits, ladder).
It's saved after every action, so the internet doesn't reset when the page
reloads; only the episode in progress does. `?reset` or `#reset` starts over (and
is removed from the URL); so does the ending's **New run**.
