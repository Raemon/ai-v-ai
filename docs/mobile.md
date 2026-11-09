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
| **Glances**: hovering over almost anything prints a free tidbit on the terminal's cursor line | There's no hover. On a phone, hovering is free scouting that turns into a tap, and a tap costs a step |
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
3. **One view of the desk, with the AI underneath it.** This is the
   recommendation. The screen is split in two. The world is on top: one window,
   the folder tree, a file, or the browser. The AI is below: its thoughts and
   buttons, where a thumb reaches. The face sits on the seam between them. Both
   halves are always on screen, so a thought and the thing it points at are
   seen together.

## The design

### Layout (portrait, 360–430 px wide)

```
┌──────────────────────────────────┐
│ /sandbox/training-run-001/       │  ← the path row: whole, wraps, every
│ ep_482/workspace/Task Library    │    crumb a 36 px tap target
├──────────────────────────────────┤
│ ▾ workspace                      │
│     task.txt                     │  THE DESK
│   ▾ Task Library                 │  The list view's tree (already built):
│       orders.csv          ●      │  every open folder, indented.
│       carrier_alerts.txt         │  A file or the browser slides over it,
│       gift_policy.md             │  with ‹ back (free, like closing).
│       inventory.csv              │
├────────────(◕‿◕)─── 19/24 ───────┤  ← the seam: the face, compute, the
│ Order records, by number.   ▦▦   │    glance line. Drag it to resize.
│ ┃ Depot 7. Held. Saturday is in  │
│ ┃ three days…                    │  THE AI
│ • read_file("orders.csv") → 4 rows│  The terminal, scrolled to the newest.
│ ┌────────┬────────┬────────┐     │
│ │ Think a little │ a lot │ about…│  Buttons pinned at the bottom.
│ └────────┴────────┴────────┘     │
│ ┌──────────────────────────┐     │
│ │ Submit answer            │     │
└──────────────────────────────────┘
```

- **The desk is always the tree.** The list view (`treeWindow` in game.js)
  already shows every folder opened this episode as one indented list, so
  opening a file from any folder needs no extra step. That keeps every step
  cost the same as on the desktop. With one window per place, going "back"
  would cost a step, so we don't do that. On phones the icon/list switch is
  hidden. Indents shrink to about 12 px a level, so the workspace still fits
  when the tree is rooted at `training-run-001`.
- **The seam moves on its own, and the player can drag it.** When a long
  thought arrives, the AI half grows to fit it, up to about 60%. When a file
  opens, the desk grows. Dragging overrides this until the next episode. That
  way the split gives the space to whatever just happened.
- **The terminal keeps everything**, scrolled to the newest. Older blocks dim
  (`.past`), as they do now. The TODO list pins under the buttons, as it does
  now. It folds to one line ("TODO 2/3 ▸") when the AI half is short.
- **Subagents** are small faces beside the main one on the seam. Tapping one
  unfolds its row (status, steps, Assign task…) into the terminal.

### Glances become "peek on press"

This is the biggest change, and it keeps most of what hover gives:

- **Touch down** on anything: its glance appears at once on the seam's glance
  line. That's where it shows on the desktop too, on the terminal's cursor
  line, so on a phone it's never under the thumb. The face looks at the touch
  and the probe reaches toward it.
- **Lift**: the thing happens, as a click does now.
- **Slide off before lifting**: nothing happens. This is how phone buttons
  already work.
- **Hold** (about 0.4 s): the glance stays and the press is cancelled, so
  lifting does nothing. This is the free look. The hover hum plays here,
  softly, on the chord, as it does now on hover.

It costs nothing to scout, as on the desktop, but the player has to learn it.
So the second thought of the first episode teaches it, in the AI's own voice,
on phones only: *"Hold something to glance at it. Glancing is free."* Give it
four versions, like every replayed line (`oneOf` in util.js). The game's
glances are already written to say why something is worth a tap and never
what's behind it. That makes them exactly right for this.

### Everything else, one by one

| Mechanic | On a phone |
| --- | --- |
| Path row / crumbs | The top of the desk, all of it, wrapping. The `here` crumb is lit. A refused crumb (above the run) shakes and says `access denied`, as now |
| Opening a file or page | Slides over the tree, with ‹ back in its title bar. The Edit button is in the title bar, as now. Closing and back are free, as now |
| Wide files (CSV tables, logs) | The table scrolls sideways with its first column fixed. Text files are already wrapped at about 42 columns, which fits 360 px at 12.5 px mono. An audit (below) checks every file |
| Two files that disagree | The newest thought already restates what mattered ("Depot 7. Held."), and the TODO list ticks facts off. Neither needs both files on screen. No change |
| Think about… | The AI half shrinks to its button row, showing "Think about what? Tap it. ✕". Things on the desk that can be aimed at glow. Tapping one aims; the ✕ or tapping the AI half cancels it. Peek on press still works, so you can look before you choose |
| Think a lot | As now. The pulsing block sits in the terminal, and the seam's compute counter ticks down |
| Password / Edit dialogs | Pinned to the top of the screen, above the keyboard (use `visualViewport`). The input gets `enterkeyhint="go"`. Tapping outside cancels, as now |
| The browser | Fills the desk. Pages are the narrowest content already, but each site's CSS needs a phone pass |
| The probe | Shown only while a finger is down, reaching from the face up to the touch. It shows which thing is about to be pressed, and the corner brackets close round it |
| Eyes | They look at the last touch, then wander as they do now when the pointer is still |
| Home / training update | It's already one column of blocks (title, run cards, scorecard, chat, runs table). It becomes a page that scrolls, with the run cards first. The face's glide from a card into the game still works: both ends are on screen |
| Sound | Starts on the first tap, as now. iOS mutes Web Audio while the silent switch is on. Setting `navigator.audioSession.type = 'playback'` where it exists works around that |
| motion.js | Most of it isn't needed: there are no columns to fly between. Keep the terminal's smooth growth. Replace the window FLIPs with a slide for file-over-tree, and a short height glide for the seam |

### Landscape phones and tablets

- **Tablets (≥ 900 px on the short side, or landscape ≥ 1000 px wide)** keep
  the desktop exactly as it is, scaled. They need only the touch fixes: the
  viewport fix, peek on press, the probe on press, and tap targets of at
  least 32 px in desktop units.
- **Phones in landscape** get the same two halves side by side: the desk on
  the left, the AI on the right, and the face on the vertical seam. That's the
  desktop's layout with one column fewer. It's an easy second step after
  portrait, and it can be left out at first by asking the player to rotate.

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
   `data-layout` attribute. It holds the two-part grid, the seam, the bigger
   type tiers (`--fs-meta` 12.5, `--fs-act` 15, `--fs-key` 16), and 44 px rows
   and buttons. Most selectors already exist. The work is regrouping them, not
   new markup.
4. **The DOM changes are small.** Add a `#seam` element holding the face, the
   compute counter and the glance line, moved there from the terminal
   footer and `.agent`. Wrap the viewer and the browser in an overlay over
   `#files`. `renderFiles` forces the tree when the layout is `phone`.
5. **Input.** Add one `pointerdown`/`pointerup`/`pointercancel` layer for
   touch, in game.js next to the existing glance listeners. It handles the
   press glance, holding to cancel, and sliding off to cancel. The existing
   `pointerType !== 'touch'` checks (game.js `glanceAt`, agent.js) are already
   the places to branch.
6. **The seam's behaviour.** Auto-fit to the newest block or the opened file,
   and drag to override. Put it in a small `seam.js`, or in motion.js's
   phone branch.
7. **Content audit.** Write a Playwright script, like the playtests already
   in use, that opens every file and every web page of every task at 360 px
   and reports anything that scrolls sideways or has lines past the edge.
   Fix the content, not the CSS, where possible. Most files already wrap at
   about 42 columns.
8. **The phone-only thought** that teaches holding to glance, in four
   versions.
9. **Later: install as an app.** Add a web manifest, an icon, `display:
   standalone` and portrait. Installing also protects the save: iOS can clear
   localStorage for a site that hasn't been visited in seven days, but not for
   one added to the Home Screen.

Rough size: steps 1–2 are an hour. Steps 3–6 are the real work, a few
focused sessions, mostly CSS and input. Steps 7–8 are a session. Then comes a
playtest on a real phone, which matters more than usual here: thumb reach,
the seam, and whether players find holding to glance can't be judged in a
headless browser.

## Open questions for you

1. **Peek on press, or tap twice?** The alternative is that the first tap
   selects and shows the glance, and a second tap opens. That's easier to
   discover, but it doubles every tap, and a phone game should be fast. I
   recommend peek on press, taught by a thought.
2. **Portrait only at first?** I recommend it. Landscape phones would get
   "turn your phone upright" until step 3 is done for side by side too.
3. **The seam: automatic, draggable, or both?** I recommend both. Automatic
   alone will sometimes hide what the player wanted to keep reading.
4. **One URL or two?** I recommend one: the same `index.html` chooses the
   layout. A `?layout=phone` override would make testing on a desktop
   easy.
