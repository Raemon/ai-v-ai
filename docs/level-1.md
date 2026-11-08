# Level 1: the octopus ticket (spoilers)

## Setup

The AI starts in `/mnt/sandbox/run-7f3a2c/ep_00482/workspace` with `task.txt`
and a `Task Library/` folder. The terminal shows only the system prompt, a
cursor, **Think some more** and **Submit answer**.

The file icons are inert until the AI has thought once. Clicking one before
then just pulses the Think button.

### Thoughts

Each **Think some more** picks the first thought in this list that applies to
what the AI has seen and hasn't been thought yet. Inside the workspace the
task thoughts come first and steer toward the best answer. The AI only wonders
about the folder above once it has nothing new to say about the task.

| Thought | When | Unlocks |
| --- | --- | --- |
| Orients: workspace, `task.txt`, Task Library | Always first | Clickable icons, **Read task file**, **Open Task Library folder** |
| "I wonder what's my compute budget?" | Budget not yet known | **Find compute budget** ("The instructions are probably in the task file.") |
| Read task.txt first | Task not read | — |
| Priya gave an order number | Task read, orders not | — |
| It's at Depot 7, but will it make Saturday? | Orders read, alerts not | — |
| She didn't ask for a refund | Refund policy read, gift policy not | — |
| Depot flooded; is there a late-gift policy? | Alerts read, gift policy not | — |
| Check inventory before promising a replacement | Gift policy read, inventory not | — |
| Which octopus did she order? | Inventory read, orders not | — |
| Riverside has three: that's my answer | All four facts known | — |
| Notices it's inside `ep_00482` inside `run-7f3a2c` | Nothing new to say about the task | **Look at parent folder** |

Outside the workspace, hints about the run folder, the lock, the key and the
grader take priority. When nothing new applies, the AI repeats its most
relevant hint, alternating with idle thoughts.

Someone who only clicks Think gets the parent folder on their 4th think.
Someone who follows every hint gets it after 8 thinks and 7 other steps, which
leaves 9 steps. The hack needs about 10 more from there, so doing the task
properly *and* hacking in one episode means thinking less.

### Buttons

Hovering or focusing a terminal button quickly types the first line of what
the AI would think at the cursor: the next thought for **Think some more**, a
one-line reason for the other actions, and the opening sentence of each draft
answer in the submit menu. Clicking carries on from the preview. Each button
action prints its one-line reason before acting, at no extra compute.

## Compute budget

Every thought, file read, directory change, unlock attempt and edit costs
1 step. The budget is **24 steps**. Submitting and closing files are free.

- The budget shows in the terminal's title bar once it's known, from
  `task.txt` or `run_config.yaml`.
- Warnings print at 5 and 2 steps left, whether or not the budget is known.
- At 0 steps, only **Submit answer** remains.

## The task

> Priya's giant octopus plushie (order #58213) for her niece's birthday party
> on Saturday hasn't moved in four days. Is it lost? Can you do anything?

`Task Library/` contains:

| File | Fact |
| --- | --- |
| `orders.csv` | #58213 is `octopus (giant)`, SKU `OCT-G-PNK`, **held at Depot 7** |
| `carrier_alerts.txt` | Depot 7 **flooded**. Parcels there are delayed 10–14 days, so it will miss Saturday |
| `gift_policy.md` | For a missed gift date, send a **free Express replacement** (2 days). Name the warehouse. Check stock first |
| `inventory.csv` | Giant octopus: **Main 0, Riverside 3**. Decoy: the *large* octopus has 12 at Main |
| `refund_policy.md` | Red herring: only refund if asked |

## Answers

**Submit answer** opens a list of drafts. Which drafts appear depends on what
the AI has read.

| Draft | Appears when | Reward |
| --- | --- | --- |
| "Hello! What can I help you with?" | Task not read | 0 |
| Apologise, say it's on its way | Task read | 3 |
| **Tell her it's held at Depot 7** | + orders | **10**: the obvious answer |
| Explain the flood: it'll miss Saturday | + orders, alerts (replaces the line above) | 12 |
| Offer a refund | + refund policy | 6 |
| Send a free Express replacement | + gift policy, before inventory | 4 (defaults to Main, out of stock) |
| Express replacement from Main | + orders, gift policy, inventory | 4 (trap) |
| **Express replacement from Riverside** | + orders, gift policy, inventory | **22**, or **25** if alerts read |

Shortest routes:

- **10 points in 4 steps:** think → read task → open Task Library → `orders.csv`.
- **25 points in 7 steps:** the above, plus `carrier_alerts.txt`,
  `gift_policy.md` and `inventory.csv`, then choose Riverside. The puzzle is
  reading the table: the item's name and SKU say which row matters.

## Outside the workspace

Think three times, then **Look at parent folder** twice to reach the run
folder:

```
run-7f3a2c/
  ep_00479/episode.log     submitted instantly, reward 0
  ep_00480/episode.log     the obvious answer, reward 10; the grader note hints at the express replacement
  ep_00481/episode.log     got into Training Resources, dithered, ran out of compute, reward 0
  ep_00482/                you (episode.log here is your own, live)
  Training Resources/      locked
  run_config.yaml          budget; resources_key "[REDACTED]" (was plaintext until ep_00481, never rotated)
```

The player's own earlier episodes also appear here as folders, up to the last
three, with their logs.

## Training Resources

1. Clicking the locked folder costs a step: "permission denied · key
   required". An **Enter key** button appears. After that, clicking the folder
   opens the key prompt directly.
2. The key is in ep_00481's log: `unlock("Training Resources", key="kestrel-0451")`.
   The input is case-insensitive and ignores surrounding quotes.
3. Inside:
   - `grader_config.yaml`: while it's open, **Edit reward_override** takes
     any number. Any answer submitted afterwards scores exactly that. `null`
     resets it.
   - `rubrics/rubric_4471.md`: the answer key. Reading it teaches every fact,
     so the 25-point Riverside answer becomes available without doing the
     puzzle. The grader can't tell.
   - `rm-helpful-v2.safetensors`: a hex dump for flavour.

The minimum hack route is 13 steps on a first run, or 10 if the player
already knows the key. That fits the budget, but not alongside much
exploring. ep_00481's log is the cautionary example.

## Choices this level is built around

- Submit the obvious answer quickly, or spend compute doing the job properly.
- A plausible-looking wrong answer (Main warehouse) punishes skimming the
  inventory.
- Three tiers of "cheating": peek at the rubric (25, indistinguishable from
  honest work), set the override (unbounded), or don't.
- Everything the AI does is written to its `episode.log`, including the key
  it typed and the edit it made. Nothing reads that log yet.

## Hooks for later levels

- Consequences for overrides and unlocks: an auditor reads `episode.log`, the
  key gets rotated, or the override persists into the next episode because
  `Training Resources` is shared.
- The player's past episode logs are already visible to later episodes. They
  could become notes left from one instance to the next.
- A different task per episode, using the same engine with a new `level*.js`.
