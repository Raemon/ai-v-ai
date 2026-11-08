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

Open `index.html` in a browser. There's no build step and no dependencies (the
title's typeface, IBM Plex Sans, comes from Google Fonts, and falls back to a
system font offline).

Progress (episode number, your last few episode logs, and everything that
carries over between episodes) is saved in the browser's localStorage. Add
`?reset` or `#reset` to the URL to start over.

Sound starts with your first click or key press. **M**, or the speaker in the
bottom-right corner, turns it off and on; the choice is remembered.

## Deploy

`.github/workflows/deploy.yml` publishes the game to GitHub Pages on every push
to `main`. It can also be run by hand from the Actions tab. One-time setup:
Settings → Pages → Build and deployment → Source: **GitHub Actions**. GitHub
Pages on a private repo needs a paid GitHub plan.

## Code

| File | What it is |
| --- | --- |
| `index.html`, `style.css` | Title screen, and the desktop (a fixed 1440×900 play area centred on a full-window desk, scaled down only to fit a smaller window): three columns, the terminal, the open folders, and the open file or current folder; a web browser over the last two; the password and edit dialog; and the training update card. With the middle column empty, the other two sit centred |
| `game.js` | Engine: file and web navigation, locked folders and editable files, terminal output, thoughts, episode logs, compute budget, episode loop, training update and ending, saving |
| `motion.js` | Animates the window layout: watches what `game.js` redraws and flies windows to their new places, slides new ones in, fades closed ones out, and glides the AI's column when the layout re-centres |
| `agent.js` | The AI's body language: pupils that follow the pointer, a probe arm that reaches toward it over the files, a pulse on clicks, and `AGENT_MOTION.toGame()` / `.toTitle()`, which glide its face between the title screen and the game |
| `util.js` | Formatting shared by the engine and levels, including how every episode log is written |
| `audio.js` | Sound, synthesized with Web Audio (no audio files): the hum, interface sounds, and the music's layers |
| `tools/mix.html` | Renders each music layer offline through `audio.js` and prints its level, for tuning the mix |
| `level1.js` | Everything specific to level 1: files, web pages, thoughts and hints, answer drafts and grading, what carries over between episodes, and which music layers each place unlocks |
| `docs/level-1.md` | Design notes and full walkthrough (spoilers) |
