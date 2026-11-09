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
   the bottom.** This is the recommendation. Folders, the open file or page,
   the thoughts, the TODO list and the subagents each become a section of one
   column. Each section has a header that summarises it when it's collapsed.
   The buttons, the face and the compute counter sit in a dock at the bottom
   that never collapses, where a thumb reaches. Whatever just changed opens,
   and the rest fold to their headers. Because a header still shows the most
   important thing in its section (the path, the file's name, the newest
   thought), a thought and the thing it points at are on screen together,
   even when only one of them is open.

The desktop already does this in pieces. Folder windows go `.mini` when they
don't fit, a long think folds to "▸ Thought for 4 steps", and the list view
folds folders into a tree. The phone takes the same idea further.

## The design

### Layout (portrait, 360–430 px wide)

A file has just been opened:

```
┌──────────────────────────────────┐
│ ▸ /sandbox/training-run-001/     │  FOLDERS, collapsed: the header is the
│   ep_482/workspace/Task Library  │  path row itself, every crumb tappable
├──────────────────────────────────┤
│ ▾ orders.csv · 4 rows        ✕   │  FILE, expanded: it just opened
│   order  customer   item      …  │
│   58213  Priya S.   octopus (g…  │
│   …                              │
├──────────────────────────────────┤
│ ▸ Thoughts · Order records, by…  │  THOUGHTS, collapsed: the newest line
├──────────────────────────────────┤
│ ▸ TODO 1/3                       │  TODO, if written
╞══════════════════════════════════╡
│ (◕‿◕)                    19/24   │  THE DOCK, never collapses: the face,
│                                  │  the prompt line and compute,
│ [Think a little | a lot | about…]│  then the buttons
│ [Submit answer                 ] │
└──────────────────────────────────┘
```

Then the player presses Think a little. The new thought opens Thoughts. The
file stays open too, shorter, because two sections can be open at once:

```
│ ▸ /sandbox/training-run-001/…    │  FOLDERS, still collapsed
│ ▾ orders.csv · 4 rows        ✕   │  FILE, still open, scrolled where it was
│   58213  Priya S.   octopus (g…  │
│ ▾ Thoughts                       │  THOUGHTS, opened at the newest block
│   ┃ Depot 7. Held. Her party is  │
│   ┃ Saturday. Is that enough     │
│   ┃ time?                        │
│ ▸ TODO 1/3                       │
╞══════════════════════════════════╡
│ (◕‿◕) …dock…                     │
```

If the player now taps a crumb, Folders opens and the file, which changed
longest ago, folds to its header.

**The sections**, top to bottom. Each exists only once it has something in it:

| Section | Its header, collapsed | Its body |
| --- | --- | --- |
| Folders | The path row, all of it, wrapping. The crumbs work even while it's collapsed, so the first secret door is always on screen | The tree of every folder opened this episode (`treeWindow`) |
| File or page | The name and its size (`orders.csv · 4 rows`, `seek.com`), Edit, ✕ | The file viewer or the browser |
| Thoughts | The first line of the newest thought or result | The terminal's transcript, opened at the newest block |
| TODO | `TODO 2/3`, with its pips | The list, with Review |
| Subagents | Their small faces and one word of status each | Their rows and logs |

**The rules:**
- **Opening and closing a section is free**, like closing a window now.
  Opening a folder you haven't opened yet still costs its step.
- **What just changed opens.** A new thought opens Thoughts. Opening a file
  or a page opens its section. A fact ticked off opens TODO for a moment.
  Closing a file reopens Folders.
- **At most two sections are open.** When a third opens, the one that changed
  longest ago folds. A section the player opened by hand stays open until the
  player acts again. That way the game never takes back what the player chose
  to read.
- **A collapsed section that gets something new** gets a dot on its header
  and a soft pulse. This is like the terminal's new-button flash now.
- **Inside the sections, the desktop's own folds stay.** Tree rows open and
  close with their chevrons, free for any folder already opened this
  episode. Long thinks fold to "▸ Thought for 4 steps".
- **The tree is always the list view.** It shows every folder opened this
  episode as one indented list, so opening a file from any of them needs no
  extra step. Step costs stay the same as on the desktop. The icon/list
  switch is hidden. Indents shrink to about 12 px a level, so the workspace
  still fits when the tree is rooted at `training-run-001`.

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
| Path row / crumbs | The Folders header, all of it, wrapping, and tappable even while collapsed. The `here` crumb is lit. A refused crumb (above the run) shakes and says `access denied`, as now |
| Opening a file or page | Opens its section, and Folders folds to its path row. The Edit button is in the header, as now. Closing and back are free, as now |
| Wide files (CSV tables, logs) | The table scrolls sideways with its first column fixed. Text files are already wrapped at about 42 columns, which fits 360 px at 12.5 px mono. An audit (below) checks every file |
| Two files that disagree | The newest thought already restates what mattered ("Depot 7. Held."), and the TODO list ticks facts off. Neither needs both files on screen. No change |
| Think about… | The dock shows "Think about what? Tap it. ✕". Things that can be aimed at are lit, and collapsed headers count too: tapping the file's header thinks about the file, and a crumb thinks about its folder. That way nothing has to open to be aimed at. The ✕ cancels |
| Think a lot | Thoughts opens, with the pulsing block in it, and the dock's compute counter ticks down |
| Password / Edit dialogs | Pinned to the top of the screen, above the keyboard (use `visualViewport`). The input gets `enterkeyhint="go"`. Tapping outside cancels, as now |
| The browser | Its own section, the same as a file. It has a fixed height when open, as on the desktop. Each site's CSS needs a phone pass |
| The probe | Shown only while a finger is down, reaching from the face in the dock up to the touch. It shows which thing is about to be pressed, and the corner brackets close round it |
| Eyes | They look at the last touch, then wander as they do now when the pointer is still |
| Home / training update | It's already one column of blocks (title, run cards, scorecard, chat, runs table). It becomes a page that scrolls, with the run cards first. The face's glide from a card into the game still works: both ends are on screen |
| Sound | Starts on the first tap, as now. iOS mutes Web Audio while the silent switch is on. Setting `navigator.audioSession.type = 'playback'` where it exists works around that |
| motion.js | Most of it isn't needed: there are no columns to fly between. Keep the terminal's smooth growth. Replace the window FLIPs with a height glide as sections open and fold |

### Tablets, and phones turned sideways

- **Tablets (≥ 900 px on the short side, or landscape ≥ 1000 px wide)** keep
  the desktop exactly as it is, scaled. They need only the touch fixes: the
  viewport fix, the probe on press, and tap targets of at least 32 px in
  desktop units. Glances already don't fire on touch.
- **Phones are portrait only.** Turned sideways, a phone shows "Turn your
  phone upright" over the paused game. The manifest (step 8) locks
  portrait once it's installed as an app.

## How to build it

It's one game with two layouts, not a fork. The engine (state, steps,
thoughts, tasks, saving) doesn't change at all. Only rendering and input
change.

1. **Choose a layout once, at startup and on resize.** Add
   `document.body.dataset.layout = 'phone' | 'desk'`. Use `phone` when the
   short side is under about 600 CSS px and the pointer is coarse. Do this in
   `fitScreen`: for `phone`, skip the scaling and let the page be
   `100dvh`, with `env(safe-area-inset-*)` padding.
2. **Fix the blank screen for everyone.** Put `#desktop` inside a fixed,
   `overflow: hidden` frame, so its 1440 px never widens the layout viewport.
   Read `visualViewport` size in `fitScreen`. Even before anything else, this
   makes tablets work.
3. **`phone.css`**, loaded with a media query or switched by the
   `data-layout` attribute. It holds the column of sections, the dock, the bigger
   type tiers (`--fs-meta` 12.5, `--fs-act` 15, `--fs-key` 16), and 44 px rows
   and buttons. Most selectors already exist. The work is regrouping them, not
   new markup.
4. **The DOM changes are small.** Add a `#dock` holding the face, the
   compute counter, the prompt line and `#actions`, moved there from the
   terminal and `.agent`. Give `#files`, the viewer and browser, `#out`,
   `#todo` and `#agents` each a section header (a `<button>` with
   `aria-expanded`). `renderFiles` forces the tree when the layout is
   `phone`.
5. **Input.** Glances are already skipped for touch (`pointerType !==
   'touch'` in game.js and agent.js). On phones, also skip `reglance` and
   focus glances, don't load hover.js, and move the prompt line to the
   dock. Taps are ordinary clicks.
6. **The sections' rules** (what opens, at most two open, a hand-opened
   section stays open, the dots for something new) go in a small
   `sections.js`. The engine tells it what changed. It already knows: the
   thought printer, `doOpen`, `renderTodo` and `renderAgents` are the hooks.
   Each section's header summary is drawn there too.
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
focused sessions, mostly CSS, input and the sections' rules. Step 7 is a
session. Then comes a
playtest on a real phone, which matters more than usual here: thumb reach,
and whether the sections open and fold at the right moments can't be
judged in a headless browser.

## Open questions for you

1. **Two sections open at most, or one?** With one (an accordion), each
   section gets the most room, but you could never read a file and a
   thought at once. I recommend two. The headers carry the rest.
2. **One URL or two?** I recommend one: the same `index.html` chooses the
   layout. A `?layout=phone` override would make testing on a desktop
   easy.
