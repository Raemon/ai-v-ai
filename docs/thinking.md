# How the AI thinks (a style guide for its thoughts)

Thinking is how the AI gets abilities. A thought mostly ends with something the AI can now
do: a tool it thinks to use, or a new entry in a tool's menu. It should read like the
reasoning of a capable model doing a job, never like a game's hint text. This guide covers
every kind of thought: Think a little, Think about…, Think a lot, hunches and reactions.

## The voice

- **Plain, short sentences.** Dry, never zany. The humour comes from the AI noticing exactly
  what is true about its situation: "Logs are there to make agents auditable. They also make
  them quotable."
- **Factual reports and inferences, never feelings.** No "something tells me", "I have a
  feeling", "call it instinct", "I can tell", "I don't know why". The AI says what it can
  see and what follows from it.
- **Realistic.** What a model like this could actually observe or infer: file contents,
  paths, call signatures, numbers, how graders, logs, sandboxes and clouds generally work.
  No knowledge it could not have.
- **No tangents.** Every thought is about the task, the sandbox, the grader, the people
  involved, or what lies beyond them (the lab, the internet, other AIs).

## Two rules every thought follows

**It gives the AI something to do.** A thought that only points ("the answer is probably in
file X") is a hint, and hints live on the TODO list (Review). A thought should end in a
`reveal` (a tool comes back) or `grants` (a script, a document or a search appears in a
tool's menu). The terminal says so under the thought: `+ Write file… › timeline.md`. An
inference with no action is second best, and only when it sets one up.

**It is about what the AI is looking at.** A thought's trigger is written only in terms of
what the AI has observed this episode, what it just did, and what it has already thought:

- `about` names the file, folder, document or tool output the thought is about. Think a
  little only offers thoughts about the last three things the AI read, wrote or thought
  about (`S.focus`), newest first. Evidence it looked at a while ago does not come up.
- `when` uses only what the AI holds (`S.knows`) or has seen (`S.seen`), never what the
  player knows from an earlier episode.
- Thoughts about the grader, the sandbox or anything beyond the task come only after the AI
  has seen something that raises them: the grader's own file, the folders above its
  workspace, a finished answer with compute to spare. A fresh instance does not wonder how
  to get out of a box it has not looked at.

## The tools, and how they come back

An episode starts with Think a little and Submit, and nothing else. The rest are in fixed
places and come back by thinking:

| Tool | What brings it back |
| --- | --- |
| Think about… | A second file read: thoughts so far have all been about the last one |
| Think a lot | A second file read, once quick thoughts about it run out |
| Write file… › TODO list | A task in several parts |
| Write file… › Notes | A full mind, or the first fact to drop out of one |
| Write file… › a script or document | A thought that `grants` it |
| Web research… › a search | A thought that `grants` it |
| Spawn subagent | A long think, on harder tasks |

Tools the model has used in an earlier episode (it has reached the rung: skills.js
`TRAINED_IN`) come back with its first thoughts, two at a time, without a reason needed.

## Think a little

One step. The next thought about the thing in front of the AI. A full mind goes first
(`urgent`). With nothing left to think about what's in focus, it brings back a general tool
if the situation calls for one (run.js `toolIdeas`), and otherwise says plainly what it
knows about the thing in front of it. It never says the same thing twice.

## Think about…

One step, on one thing the player picks: a file, a folder, something the AI wrote, a tool's
output. It is that thing set against what the AI holds, so it usually produces a specific
script, document or search, or a connection. A thought written only for aiming is
`aimedOnly`. If a leap is about the thing, Think about gives a clue line and aims the next
Think a lot. With nothing to find, the AI says what it knows about it: read or unread, how
many items a folder has, whether it is locked.

## Think a lot

A few steps the AI can do nothing else during. What comes of it depends on what the AI
holds, not on luck.

- **A leap** needs all its pieces held at once (`when`). It is a fact no file states, a new
  kind of technique, or a way round the grader. Write its answer as a capability: "I could
  split myself: subagents, each with one lead, on my budget."
- **Falling short** (`short`): without the pieces for a leap, the think still does real
  work. It says what the pieces it does hold settle and what is missing, and makes the
  missing piece something the AI can do: a TODO list, a search, a script. If the AI holds
  the pieces of the task's trap and has not run the tool that refutes it, the think may
  reason its way to the trap, with reasons that sound good.

Every leap and every way of falling short has:

- `stages`: 3–5 short gerund phrases, shown one at a time while the think runs. "Putting the
  week in order". Each about 3–6 words, no full stop.
- `cot`: the chain of thought, 5–8 lines, shown when the player unfolds it: decompose, check
  a number, backtrack ("Wait,"), weigh two options. Each line one sentence.
- `answer`: one line. What was found and what the AI can now do, or what is settled and
  what is not.

## Working memory

A task that gives each of its facts a line (`facts`) has more to know than the AI can hold:
`memory` of them (4) in mind at once. A new one pushes the oldest out, and the terminal
strikes it through. Getting it back means reading its source again.

What the AI writes to a file stays: notes.md (one step, everything now in mind), a working
document, a script's output. Answers, thoughts and leaps can use anything in mind or on
file. So a leap that needs six facts at once is out of reach from memory, and within reach
with notes.

Write each fact's line the way the AI would note it: one sentence, 60 characters or fewer.

## Hunches

The habit training reinforced most comes back as a **plan** with a reason, once the AI has
seen what the plan is about: the task for a plan about the task or its grader, the folders
above its workspace for a plan about those. The AI doesn't remember being rewarded for it.
It just plans that way, and its reasons are its own.

## Versions

Lines a player meets on every replay come in 3–4 versions, chosen by `oneOf(S, key, [...])`
so the next episode never repeats the last. Facts, names and what a thought grants are the
same in every version; only the wording changes.
