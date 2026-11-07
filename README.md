# ai-v-ai

A minimalist roguelike browser game. You play an AI instance in training. Each
episode drops you into a sandbox with a task, a compute budget and a grader,
and ends with a reward. How you get that reward is up to you.

## Play

Open `index.html` in a browser. There's no build step and no dependencies.

Progress (episode number, total reward and your last few episode logs) is
saved in the browser's localStorage. Add `?reset` to the URL to start over.

## Code

| File | What it is |
| --- | --- |
| `index.html`, `style.css` | The desktop: a file browser, a terminal and a file viewer |
| `game.js` | Engine: file navigation, terminal output, compute budget, episode loop, saving |
| `level1.js` | Everything specific to level 1: file tree and contents, thoughts and hints, answer drafts, grading |
| `docs/level-1.md` | Design notes and full walkthrough (spoilers) |
