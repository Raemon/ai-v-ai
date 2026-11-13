# Notes for AI agents working on this repo

To see a change in the game without playing up to it, open
`index.html?reset&task=<id>&at=<steps>`: README.md (Play) lists the steps. In Playwright, wait for
`window.DEV && DEV.S().mode === "idle"`, then screenshot; `DEV.at("...")` takes more steps.

`node tools/check.js` checks every scenario.
