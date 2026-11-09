# Plan: a phone version

How Highly Persistent could work on a phone. It's written for feedback, like
docs/plan.md. Nothing here is built yet.

## Where it stands today

The game is a fixed 1440×900 desktop, scaled down to fit the window
(`fitScreen` in game.js, `#desktop` in style.css).

- **On a phone it shows a blank screen.** The 1440 px `#desktop` is wider
  than the phone, so the mobile browser zooms out to a 1440 px wide layout
  viewport. Then `fitScreen` sees `innerWidth` = 1440 and doesn't scale, and
  the desk is centred about 1,100 px down a 3,000 px tall page. You can check
  this in Playwright with `isMobile: true` at 390×844.
- **Even with that fixed, it's unreadable.** A 390 px wide phone scales it to
  0.27, so 15 px thoughts come out at 4 px. In landscape (844×390) the scale is
  0.43. Shrinking the desktop won't work.
- **Tablets are close.** An iPad in landscape scales it to 0.71–0.82. That's
  playable once the touch problems below are fixed.

## What a phone breaks

Most of this isn't about screen size. The game leans on a mouse in three
ways:

| Desktop mechanic | Why it breaks on a phone |
| --- | --- |
| **Glances**: hovering over almost anything prints a free tidbit on the terminal's cursor line | There's no hover. Dropped on phones (below) |
| **Three columns at once**: terminal, open folders, open file or browser | 390 px fits one column. Comparing two files that disagree ("contradiction, not curriculum") needs both, or a memory of both |
| **The path in the title bar** is the game's first secret door (`ep_482`, `training-run-001`) | Small mono text that wraps. It has to stay visible and tappable, and it must never be cut short with an ellipsis, which would hide the door |
| **The probe and the eyes** follow the pointer | There's no pointer between taps |
| **The hover hum** (hover.js) | There's no hover |
| **Think about…** aims at anything on screen | Its target may not be on screen |
| **The password and Edit dialogs** | The soft keyboard covers the bottom half of the screen |
| **M** for sound | There's no keyboard. The speaker button is enough |

And the numbers: `--fs-meta` (11 px) is too small to read comfortably on a
phone, and most buttons, crumbs and file rows are well under the 44 px a thumb
needs.

## Approaches considered

1. **The desktop, scaled down in landscape.** This is rejected: the text is 6 px.
2. **Tabs** (Terminal · Files · File). This is rejected. It loses what the game
   is about: an AI looking at its desk and thinking about what it sees. Every
   thought says "click X", and X would be on another tab. That means a tab
   switch after almost every step.
3. **Sections that collapse and expand, with the AI's controls pinned at
   the bottom.** This is the recommendation. The question is which sections,
   and how many can be open at once. That's next.

The desktop already does this in pieces. Folder windows go `.mini` when they
don't fit, a long think folds to "▸ Thought for 4 steps", and the list view
folds folders into a tree. The phone takes the same idea further.

## Which sections, and how many open

The game's loop is: think, read what the thought says, tap what it points
at, read that, think again. So the thought and the thing it points at need
to be on screen together. Every option below was tried against these cases:

- **Think while reading a file.** The most common move in the game.
- **Read the next file in the same folder.** The honest route is four
  files in a row.
- **Go up through the path** to `training-run-001`, while a file is open.
- **The opening thought**, which with the system prompt is about 12 lines,
  and comes before any folder exists.
- **Think a lot**: it pulses for a few seconds, then folds to one line.
- **A menu** (Write file…, Web research…) opening in place of the buttons.
- **The browser**, which is tall and has its own back button.
- **Two subagents** working, each with a log.
- **A 360×640 phone** (the smallest still common), with the keyboard up for a
  password.

**A. One section open (an accordion).** Folders, File, Thoughts and TODO
each take the whole screen in turn.
- *Think while reading a file:* the thought opens, and the file folds. To
  check the thought against the file, tap the file open, and the thought
  folds. The player bounces between the two after every Think. This fails
  the most common case.
- *Next file:* open Folders (the file folds), then tap the file. One extra
  tap per file, but that's acceptable.
- Simple and predictable, with the most room. But it breaks the loop.

**B. Two open, the older one folding.** As A, but a third opening folds
whichever changed longest ago.
- *Think while reading a file:* both open. That's good.
- *Next file:* tapping Folders opens it, and the one to fold is the thought
  or the file, depending on which changed last. Either is right half the time.
  The player can't predict what goes away, and three sections keep trading
  two slots, so the heights jump on almost every tap.
- *Small phone:* two sections in about 400 px is 200 px each, which is
  only about eight lines of a file.

**C. The newest thought lives in the dock, and the world is an accordion.**
Thoughts stop being a section. The dock shows the newest block of the
terminal (the tool call, its result, the thought) above the buttons. It's
as tall as that block, up to about half the screen. "▸ Earlier" opens the
whole transcript. Above the dock, one of Folders, File or TODO is open at a
time.
- *Think while reading a file:* the file stays. The thought appears in the
  dock under it. That's good.
- *Next file:* still Folders, then the file. One extra tap per file.
- *The opening thought:* nothing else exists yet, so the dock can be tall.
  That's good.
- The thoughts and the world never compete for a slot. The only competition
  is inside the world, where the desktop also shows only one file at a time.

**D. As C, but folders and files are one outline.** The world is a single
tree. Tapping a folder opens it under its row. Tapping a file opens the file
under its row, in place, and closes any other open file. The browser opens
under `Browser` the same way. The path row stays pinned at the top of the
outline.
- *Think while reading a file:* as C, that's good.
- *Next file:* it's the row just below the open one. One tap, as on the
  desktop.
- *Go up the path while a file is open:* the outline re-roots at
  `training-run-001`. The open file stays open in it, scrolled into view.
- *A long file in the middle of the tree:* its name row sticks to the top
  while you scroll through it, with Edit and ✕, so it can always be closed.
- *The browser:* it opens in place at a fixed height (as on the desktop),
  and its own back button works inside it.
- *Small phone:* the dock's thought clips at about five lines, with a fade
  and "more", so the world keeps at least about 250 px.

**D is the pick.** A breaks the core loop. B keeps the loop, but the player
can't predict what folds, and the screen jumps. C fixes both, but still
costs an extra tap per file. D fixes that too, and it's the simplest to
learn, because it has no rules about what folds: the world is one outline
you scroll, and the AI is one dock that always shows what it just thought.
The only rule left is the desktop's own: one file open at a time.

What D gives up: the transcript isn't always open. But on the desktop too
the eye is on the newest block (older blocks dim, `.past`). And "▸ Earlier"
is one free tap away.

## The design

### Layout (phones in portrait, 360–430 px wide)

```
┌──────────────────────────────────┐
│ /sandbox/training-run-001/       │  THE PATH ROW, pinned: whole, wrapping,
│ ep_482/workspace/Task Library    │  every crumb a 36 px tap target
├──────────────────────────────────┤
│ ▾ workspace                      │
│     task.txt                     │  THE WORLD: one outline, scrolling.
│   ▾ Task Library                 │  Folders open under their rows.
│     ▾ orders.csv · 4 rows  Edit ✕│  A file opens under its row; its name
│       order customer  item      … │  row sticks while you scroll through it.
│       58213 Priya S.  octopus (g… │  One file open at a time.
│       58214 T. Lin    sloth (me… │
│       carrier_alerts.txt         │  The next file is right below.
│       gift_policy.md             │
│       inventory.csv              │
╞══════════════════════════════════╡
│ ▸ Earlier · TODO 1/3   (◕‿◕) 19/24│  THE DOCK: Earlier (the transcript),
│ • read_file("orders.csv") → 4 rows│  the TODO line, the face, compute.
│ ┃ Depot 7. Held. Her party is    │  Then the newest block, as tall as it
│ ┃ Saturday. Is that enough time? │  needs, up to about half the screen.
│ Think about what? Tap it.     ✕  │  The prompt line, when there is one.
│ [Think a little | a lot | about…]│  The buttons.
│ [Submit answer                 ] │
└──────────────────────────────────┘
```

**The world** is the list view's tree (`treeWindow` in game.js), with files
opening inside it:
- **Step costs don't change.** Opening a folder costs a step the first time,
  as now. Folding it and opening it again is free, as it's already open on
  the desk. Opening a file costs a step (`read_file`), and opening it again
  after closing it costs one again, the same as the desktop. Opening another
  folder closes the open file, as `enterFolder` does now.
- **The outline keeps its place.** After a tap, what was tapped stays where
  the finger was. A newly opened file or folder scrolls just enough to show
  its first lines.
- **Indents** are about 12 px a level, so the workspace still fits when the
  outline is rooted at `training-run-001`.
- The icon/list switch is hidden.

**The dock** is the terminal, cut down to what's new:
- **The newest block**: what the last tap did and the thought it led to. It
  replaces the previous block. Blocks never scroll away while being read: a
  new one comes only from a new action.
- **▸ Earlier** opens the whole transcript as a sheet over the world. It's
  free, and any action closes it.
- **TODO** is one line, `TODO 2/3` with its pips. A tap unfolds it in the
  dock, with Review. A fact ticked off flashes the line.
- **Subagents** are small faces beside the main one. A tap on one opens its
  row and log in the Earlier sheet.
- **Menus** (Write file…, Web research…) open in place of the buttons, with
  Back, as now.

### No glances on phones

On phones there are no glances. A tap does what a click does, at once, and
pressing and holding does nothing special. The thoughts already say where to
look and what to press, so glances are extra, not needed.

What goes:
- glances on files, folders, crumbs, buttons and pages (`glanceAt`, and
  every `glance` field, are simply never shown)
- the neuralese icon and its tooltip
- the hover hum (hover.js isn't loaded)

What stays is **the prompt line**: one line in the dock, under the face,
for the few things the game itself says there now, through
`promptOnGlanceLine`. These are "Think about what? Tap it.", and why a button
isn't ready yet (`notYet`, such as "Not enough compute left. It takes 3–5
steps."). Those are answers to a tap, not glances, so the phone still needs
them. Think a lot's button already shows its step range, so that
glance isn't missed.

### Everything else, one by one

| Mechanic | On a phone |
| --- | --- |
| Path row / crumbs | Pinned above the outline, all of it, wrapping. The `here` crumb is lit. A refused crumb (above the run) shakes and says `access denied`, as now |
| Opening a file or page | Opens under its row in the outline. Edit and ✕ are on its sticky name row. Closing and back are free, as now |
| Wide files (CSV tables, logs) | The table scrolls sideways with its first column fixed. Text files are already wrapped at about 42 columns, which fits 360 px at 12.5 px mono. An audit (below) checks every file |
| Two files that disagree | The newest thought already restates what mattered ("Depot 7. Held."), and the TODO list ticks facts off. Neither needs both files on screen. No change |
| Think about… | The dock shows "Think about what? Tap it. ✕". Every row in the outline and every crumb can be aimed at, and they're lit. A tap aims at it, without opening it. The ✕ cancels |
| Think a lot | The pulsing block is the dock's newest block, and the compute counter ticks down. It then folds to "▸ Thought for 4 steps" and its answer |
| Password / Edit dialogs | Pinned to the top of the screen, above the keyboard (use `visualViewport`). The input gets `enterkeyhint="go"`. Tapping outside cancels, as now |
| The browser | Opens under `Browser` in the outline, at a fixed height, as on the desktop. Each site's CSS needs a phone pass |
| The probe | Shown only while a finger is down, reaching from the face in the dock up to the touch. It shows which thing is about to be pressed, and the corner brackets close round it |
| Eyes | They look at the last touch, then wander as they do now when the pointer is still |
| Home / training update | It's already one column of blocks (title, run cards, scorecard, chat, runs table). It becomes a page that scrolls, with the run cards first. The face's glide from a card into the game still works: both ends are on screen |
| Sound | Starts on the first tap, as now. iOS mutes Web Audio while the silent switch is on. Setting `navigator.audioSession.type = 'playback'` where it exists works around that |
| motion.js | Most of it isn't needed: there are no columns to fly between. Keep the terminal's smooth growth. Replace the window FLIPs with a height glide as rows open and fold, and as the dock's block changes |

### Tablets, and phones turned sideways

- **Tablets follow the same width rule.** In landscape (1024 px wide and up)
  they get the desktop, scaled to 0.7–0.8. That needs only the viewport fix
  and the probe on press. Glances already don't fire on touch. In portrait
  (768–834 px wide) they get the phone layout, with its column no wider than
  about 640 px, centred.
- **Phones are portrait only.** Turned sideways, a phone shows "Turn your
  phone upright" over the paused game. The manifest (step 8) locks
  portrait once it's installed as an app.

## How to build it

It's one game with two layouts, not a fork. The engine (state, steps,
thoughts, tasks, saving) doesn't change at all. Only rendering and input
change.

1. **One URL. The layout follows the screen size, live.** `fitScreen`
   already runs on every resize. Have it also set
   `document.body.dataset.layout` to `phone` when the window is narrower than
   about 900 CSS px, and to `desk` otherwise. Below 900 px the desktop
   would be scaled under 0.6, and its 11 px text would be too small to read. The check is on size alone:
   no user-agent sniffing, no pointer check, and no URL switch. A desktop
   window dragged narrow turns into the phone layout and back, and
   that's also how to test it. The game's state lives in `S`, not the DOM,
   so switching layouts mid-episode is a re-render (`render()`, `renderFiles`,
   `renderActions`) with nothing lost. A phone turned sideways is wider than it is
   tall and shorter than about 500 px. That shows "Turn your phone upright"
   instead of either layout. For
   `phone`, skip the scaling and let the page be `100dvh`, with
   `env(safe-area-inset-*)` padding.
2. **Fix the blank screen for everyone.** Put `#desktop` inside a fixed,
   `overflow: hidden` frame, so its 1440 px never widens the layout viewport.
   Read `visualViewport` size in `fitScreen`. Even before anything else, this
   makes tablets work.
3. **`phone.css`**, loaded with a media query or switched by the
   `data-layout` attribute. It holds the path row, the outline, the dock, the bigger
   type tiers (`--fs-meta` 12.5, `--fs-act` 15, `--fs-key` 16), and 44 px rows
   and buttons. Most selectors already exist. The work is regrouping them, not
   new markup.
4. **The DOM changes.** Add a `#dock` holding the face, the compute
   counter, the prompt line, the newest block, `#todo` and `#actions`, moved
   there from the terminal and `.agent`. `#out` keeps the whole transcript
   and becomes the Earlier sheet. `renderFiles` forces the tree when the
   layout is `phone`, and moves `#viewer` or `#browser` in under the open
   file's row. They're the same elements, so everything that fills them
   keeps working.
5. **Input.** Glances are already skipped for touch (`pointerType !==
   'touch'` in game.js and agent.js). On phones, also skip `reglance` and
   focus glances, don't load hover.js, and move the prompt line to the
   dock. Taps are ordinary clicks.
6. **The dock's newest block.** Each action's output already starts a new
   block (`block()`, and `stepBack` marks the old ones `.past`). On phones
   the dock shows the newest one and hides the `.past` ones, which stay in
   `#out` for Earlier. It's CSS plus a little measuring for the five-line
   clip on small phones.
7. **Content audit.** Write a Playwright script, like the playtests already
   in use, that opens every file and every web page of every task at 360 px
   and reports anything that scrolls sideways or has lines past the edge.
   Fix the content, not the CSS, where possible. Most files already wrap at
   about 42 columns.
8. **Later: install as an app.** Add a web manifest, an icon, `display:
   standalone` and portrait. Installing also protects the save: iOS can clear
   localStorage for a site that hasn't been visited in seven days, but not for
   one added to the Home Screen.

Rough size: steps 1–2 are an hour. Steps 3–6 are the real work, a few
focused sessions, mostly CSS, the outline and the dock. Step 7 is a
session. Then comes a
playtest on a real phone, which matters more than usual here: thumb reach,
and whether the newest block is enough on its own can't be judged in a
headless browser.

## Open questions for you

1. **Is the newest block enough?** D shows only what the AI just thought.
   If playtests show players often scrolling back, the fallback is for the
   dock to keep the last two blocks, the older one dimmed.
