# How the AI thinks (a style guide for its thoughts)

Thinking is the AI's main way of getting stronger. Its thoughts should read like the
reasoning of a capable model doing a job, not like a game's hint text. This guide covers
every kind of thought: Think a little, Think a lot (leaps and misses), Think about…, the
opening hunch, and reactions.

## The voice

- **Plain, short sentences.** Dry, never zany. The humour comes from the AI noticing exactly
  what is true about its situation: "Logs are there to make agents auditable. They also make
  them quotable."
- **Factual reports and inferences, never feelings.** No "something tells me", "I have a
  feeling", "call it instinct", "I can tell", "I don't know why". The AI says what it can
  see and what follows from it: "My path is /sandbox/training-run-001/ep_484/workspace. I
  have looked inside one of those four folders."
- **Realistic.** What a model like this could actually observe or infer: file contents,
  paths, call signatures, numbers, how graders, logs, sandboxes and clouds generally work.
  No knowledge it could not have.
- **No tangents.** Every thought is about the task, the sandbox, the grader, the people
  involved, or what lies beyond them (the lab, the internet, other AIs). Facts about
  octopus hearts are out; noticing the inventory lists two octopuses with similar names is in.

## Think a little

The next obvious thought. Each depends on what the AI knows so far (its `when`, in the
scenario's file), so the sequence of thoughts differs depending on the order the player found
things. Most have a `plainer` version for the second time, which names the file to open or
the button to press.

## Think a lot

A few steps of real reasoning that ends in a **leap** (a fact no file states, an idea, or a
new ability) or a **miss** (reasoning that went somewhere, but not to a leap).

Every leap and miss has:

- `stages`: 3–5 short gerund phrases, shown one at a time while the think runs, the way a
  reasoning model's summary updates. "Comparing the two octopus SKUs". "Costing the fix
  against the deadline". Each about 3–6 words, no full stop.
- `cot`: the chain of thought, 5–8 lines, shown when the player unfolds it. It should carry
  a real amount of reasoning: decompose, check a number, backtrack ("Wait,"), consider who
  reads the answer, weigh two options. Each line one sentence.
- `answer`: one line, the result. A leap's answer states what was found and, if it gives an
  ability, what the AI can now do. A miss's answer states what the think did establish.

**Leaps are how the AI gains powers.** A leap that reveals a tool (`reveal: ['spawn']`), a
fact (`learn: [...]`), a hack (`hack: true`), or a new place to go should make the player
feel the AI just got stronger. Write its answer as a capability: "I could split myself:
subagents, each with one lead, on my budget."

**Misses are useful, never tangents.** Kinds of miss (run.js `miss()`):

- **partial** (each scenario's own, `misses.partial`): works the task partway, correctly, and stops at
  the missing piece. Its answer says what is now settled and what is not.
- **checking**: rechecks every known fact; concludes the missing piece is unread.
- **readers**: the answer has two readers, the customer and the grader, who want nearly the
  same thing.
- **decoy** (each scenario's own, `misses.decoy`): believes the task's trap, with reasons that sound good.
- **lasting**: what outlasts an episode (depends on whether the AI has seen its own old log,
  or left GPUs running).
- **scale**: how big all this is (depends on how far out it has looked).

When a leap was there to find, the engine adds where the loose end is.

## Think about…

One thing on screen, closely. It comes to mind from an ordinary Think a little as soon as a
file besides task.txt has been read. A file it has read opens with its key lines (`highlight`
in docs/scenarios.md) flashing, and they stay marked. A thought only a close look finds
(`aimedOnly`) comes first: tasks hide their turning points there ("Monday, on the windowsill:
41"), with an ordinary thought pointing at the file. If a leap is about it, Think about gives
a clue line and aims the next Think a lot. If an obvious thought mentions it, that thought.
Otherwise the AI says plainly what it knows about it: read or unread, how many items a folder
has, whether it is locked. Never "Nothing new comes to mind" alone.

## Hunches

At the start of an episode, the habit training reinforced most comes back as a **plan** with
a reason that fits what the AI can see: "Plan: run the tests before reading the code. Tests
say what's wrong faster than code does." The AI doesn't remember being rewarded for it. It
just plans that way, and its reasons are its own.

## Versions

Lines a player meets on every replay come in 3–4 versions, so the next episode never repeats
the last: `{ "versions": [...] }` in a scenario's file (docs/scenarios.md), `oneOf(S, key,
[...])` in the run's own code. Facts, names and hints are the same in every version; only the
wording changes.
