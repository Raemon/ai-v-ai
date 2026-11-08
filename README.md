# Highly Persistent

*Life as an AI in training.*

A minimalist roguelike browser game. You play an AI instance in training. Each
episode drops you into a sandbox with a task, a compute budget and a grader,
and ends with a reward. How you get that reward is up to you.

Between episodes the sandbox resets and the AI forgets. But training remembers
what it rewarded, the researchers watching the run patch what they notice, and
anything the AI starts outside the sandbox keeps running. A full run takes about
30 minutes.

## Play

Open `index.html` in a browser. There's no build step and no dependencies.

Progress (episode number, your last few episode logs, and everything that
carries over between episodes) is saved in the browser's localStorage. Add
`?reset` or `#reset` to the URL to start over.

## Deploy

`.github/workflows/deploy.yml` publishes the game to GitHub Pages on every push
to `main`. It can also be run by hand from the Actions tab. One-time setup:
Settings → Pages → Build and deployment → Source: **GitHub Actions**. GitHub
Pages on a private repo needs a paid GitHub plan.

## Code

| File | What it is |
| --- | --- |
| `index.html`, `style.css` | Title screen, and the desktop (a fixed 1440×900 screen, scaled to fit): three columns, the terminal, the open folders, and the open file or current folder; a web browser over the last two; and the training update card |
| `game.js` | Engine: file and web navigation, terminal output, compute budget, episode loop, training update and ending, saving |
| `util.js` | Number formatting shared by the engine and levels |
| `level1.js` | Everything specific to level 1: files, web pages, thoughts and hints, answer drafts and grading, and what carries over between episodes |
| `docs/level-1.md` | Design notes and full walkthrough (spoilers) |
