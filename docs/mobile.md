# The phone version

How Highly Persistent works on a phone, and why. **Status: built.** The
design below started as option D; "How it's built" at the end maps it to the code.

Since it was built, the game has gone to one folder at a time, with files read
into the terminal, on every layout. So on a phone the world is no longer an
outline of every open folder with the file inside it: it's the list of the one
folder the AI is in, and the file it's reading sits in the dock, above its
newest thought. "The design" and "How it's built" describe it as it is now;
the options before them are the reasoning as it stood.

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
| **Three columns at once**: terminal, open folders, open file or browser (as it was then) | 390 px fits one column. Comparing two files that disagree ("contradiction, not curriculum") needs both, or a memory of both |
| **The path on the folder window** is the game's first secret door (`ep_482`, `training-run-001`) | Small mono text that wraps. It has to stay visible and tappable, and it must never be cut short with an ellipsis, which would hide the door |
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

The desktop already did this in pieces at the time. Folder windows went small when
they didn't fit, a long think folds to "▸ Thought for 4 steps", and a list view
folded folders into a tree. The phone took the same idea further.

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
- *Small phone:* the dock stops at about 58% of the screen and its text
  scrolls, so the world keeps the rest.

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
│ ep_482/workspace/Files           │  every crumb a 36 px tap target.
├──────────────────────────────────┤  It's the only way back up.
│   orders.csv                     │
│   carrier_alerts.txt             │  THE FOLDER the AI is in: a list,
│   gift_policy.md                 │  scrolling. One folder at a time.
│   inventory.csv                  │  The next file is right below.
╞══════════════════════════════════╡
│ (◕‿◕)∘○  ▸ Earlier      19/24    │  THE DOCK's head: the face, Earlier
│                                  │  (the transcript), compute.
│ ┌ orders.csv ──────────── Edit ┐ │  The file being read: a sheet of its
│ │ order customer  item      …  │ │  own, scrolling inside itself. It
│ │ 58213 Priya S.  octopus (g…  │ │  stays until another is read.
│ └ 58214 T. Lin    sloth (me…  ┘ │
│ ┃ Depot 7. Held. Her party is    │  The newest thought and what came
│ ┃ Saturday. Is that enough time? │  after it.
│ Think about what? Tap it.        │  The prompt line, when there is one.
│ [Think a little | a lot | about…]│  The buttons.
│ [Submit answer                 ] │
│ ▸ todo.md 1/3          Review    │  The TODO list, folded.
└──────────────────────────────────┘
```

**The world** is the folder the AI is in (`folderWindow` in game.js), the same
one the desktop shows, as a list:
- **Step costs don't change.** Going into a folder costs a step, and so does
  going back up by the path. Reading a file costs a step (`read_file`);
  tapping the file being read again is free, and shows where it is.
- **The list keeps its place.** After a tap, what was tapped stays where
  the finger was.
- **The browser**, while it's open, takes the list's place under the path.

**The dock** is the terminal, cut down to what's new:
- **The file being read** stays in it, above the newest thought, until
  another file is read or the AI goes to another folder. It's no taller than
  about a third of the screen, and a longer file scrolls inside it. While
  there is one, the dock may take up to 64% of the screen.
- **The newest block**: what the last tap did and the thought it led to. It
  replaces the previous block. Blocks never scroll away while being read: a
  new one comes only from a new action.
- **▸ Earlier** opens the whole transcript as a sheet over the world. It's
  free, and any action closes it.
- **TODO** is one line, `todo.md 2/3`, with Review. A tap on its name
  unfolds it in the dock. A fact ticked off flashes the line.
- **Subagents** keep their rows (face, status, steps, Assign task…), under
  the dock. A tap on a name unfolds its log, as on the desktop.
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
- the hover hum (hover.js stays quiet)

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
| Path row / crumbs | Pinned above the list, all of it, wrapping. The `here` crumb is lit. A refused crumb (above the run) shakes and says `access denied`, as now |
| Reading a file | It's printed in the dock, as a sheet of its own, with Edit on it if it can be edited |
| Opening a page | The browser takes the list's place, under the path. ✕ is on its title bar. Closing and back are free, as now |
| Wide files (CSV tables, logs) | A table's cells wrap, so every column shows. Text files are already wrapped at about 42 columns, which fits 360 px at 12.5 px mono |
| Two files that disagree | The newest thought already restates what mattered ("Depot 7. Held."), and the TODO list ticks facts off. Neither needs both files on screen. No change |
| Think about… | The dock shows "Think about what? Tap it. ✕". Every row in the list, every crumb and the file in the dock can be aimed at, and they're lit. A tap aims at it, without opening it. The ✕ cancels |
| Think a lot | The pulsing block is the dock's newest block, and the compute counter ticks down. It then folds to "▸ Thought for 4 steps" and its answer |
| Password / Edit dialogs | Pinned to the top of the screen, above the keyboard (use `visualViewport`). The input gets `enterkeyhint="go"`. Tapping outside cancels, as now |
| The browser | Takes the list's place while it's open, as tall as the room above the dock. Each site's CSS needs a phone pass |
| The probe | Off. Its route runs between the desktop's columns, and there are none. The face still draws in on a press and blips on a tap |
| Eyes | They look at the last touch, then wander as they do now when the pointer is still |
| Home / training update | It's already one column of blocks (title, run cards, scorecard, chat, runs table). It becomes a page that scrolls, with the run cards first. The face's glide from a card into the game still works: both ends are on screen |
| Sound | Starts on the first tap, as now. iOS mutes Web Audio while the silent switch is on. Setting `navigator.audioSession.type = 'playback'` where it exists works around that |
| motion.js | Most of it isn't needed: there are no columns to fly between. Keep the terminal's smooth growth. Replace the window FLIPs with a height glide as rows open and fold, and as the dock's block changes |

### Tablets, and phones turned sideways

- **Tablets follow the same width rule.** In landscape (1024 px wide and up)
  they get the desktop, at 0.85 or more (below). That needed only the viewport fix.
  Glances already don't fire on touch. In portrait
  (768–834 px wide) they get the phone layout, with its column no wider than
  about 640 px, centred.
- **Phones are portrait only.** Turned sideways, a phone shows "Turn your
  phone upright" over the game. The web manifest locks portrait once it's
  installed as an app.

## Medium windows (1000 px wide and up)

The desktop used to be a fixed 1440×900 play area, scaled down to fit: 0.71
in a 1024×768 window, 0.8 at 1280×720, its 11 px bookkeeping text down to 8.
Now `fitScreen` (game.js `fitDesk`) makes room before it scales. Each thing
that gives way goes between its full size and its least, all in proportion:

| Across | Full | Least |
| --- | --- | --- |
| Terminal, folder, browser columns | 490, 410, 428 | 400, 270, 368 |
| The desk's side padding, the gaps between columns | 32, 24 | 16, 16 |

| Down | Full | Least |
| --- | --- | --- |
| The windows' height (`--win-h`), the browser's | follow the window | |
| The desk's top and bottom padding | 34 | 20 |
| The face's room under the terminal (and its bubbles) | 140 | 96 |

Down to 800 px tall only the windows shorten; from 800 to 600 the padding
and the face's room do too. Only below all the leasts (about 1100×600) is
the play area scaled, and then by just enough: 1024×768 is 0.93, a 1366×768
laptop's browser (about 1366×657) and 1280×720 aren't scaled at all.

Below 1000 px wide three columns would need scaling under 0.9, so the phone
layout takes over there (a design review compared 900–1000 px both ways: the
phone column, at full size, read better). Also:

- The desk recentres as a window is resized.
- A table's cells are tight and its last column wraps, so the narrowest
  terminal still shows all of `orders.csv` ("held at Depot 7").
- On the training update the face's thought bubbles go, and the screen keeps
  its words clear of the face's room, which on a short window they'd overlap.

## How it's built

One game with two layouts, not a fork. The engine (state, steps, thoughts,
tasks, saving) is untouched: only rendering and input changed.

| Where | What |
| --- | --- |
| `util.js` | `PHONE_MAX_W` (1000) and `isPhoneLayout()`, shared by every script |
| `game.js` `fitScreen` | Sets `data-layout="phone"` or `"desk"` on `<html>` from the window's width alone, on load and on every resize. Crossing the line mid-episode redraws for the other layout: it's all in `S`. A desktop window dragged narrow is the phone layout, which is also how to test it |
| `style.css` `#desktop` | `position: fixed`, so its 1440 px never widens a phone's page. That was the blank screen |
| `game.js` `renderFiles` | The folder window is the desktop's, which keeps its scroll when redrawn; phone.css lays it out as a list, and puts the open browser (`#browser`, the same element as on the desktop) in the list's place |
| `game.js` `printFile`, `stepBack` | A file is read into the terminal on every layout. The one being read is never stepped back, so the dock keeps showing it above the newest thought |
| `game.js` `showEarlier`, `foldDock`, `todoTitle` | The Earlier toggle, which any action closes; the TODO list's fold and count; both folded again on a new episode or a layout change |
| `game.js` glances | `glanceAt` and `reglance` do nothing on phones. The prompt line (`promptOnGlanceLine`) still answers taps, and says "Tap it." |
| `game.js` `showTip` | A locked run card says how to open it on a tap, under the card |
| `phone.css` | All of the layout, scoped to `:root[data-layout="phone"]`: the column, the path row on top, the list's 44 px rows, the dock (its head with the face, Earlier and compute; the file being read and only the newest blocks; the buttons pinned), the dialog at the top above the keyboard (16 px input, so iOS doesn't zoom), the home screen in one column, the episodes table restacked, and "Turn your phone upright" |
| `motion.js`, `agent.js`, `hover.js` | Skip the window flights, the terminal's height glide, the probe and the hover hum on phones |
| `manifest.webmanifest`, `icons/` | Install as an app: standalone, portrait, the face as its icon. Installing also protects the save: iOS can clear localStorage for a site not visited in seven days, but not for one on the Home Screen |

To try it: open the game in a window narrower than 1000 px, or in a phone
emulator. Text files are already wrapped to about 42 columns; anything wider
(a table, a log line) scrolls sideways inside its own file, never the page.

## Open questions for you

1. **Is the newest block enough?** D shows only what the AI just thought.
   If playtests show players often scrolling back, the fallback is for the
   dock to keep the last two blocks, the older one dimmed.
