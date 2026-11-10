# Highly Persistent: scenario design

Seven scenarios and the tech tree of thinking tools they share. Written from the design brief alone; nothing here is derived from the scenarios currently in the repository.

Contents: Status. Part 1, the tech tree. Part 2, the scenarios (S0 to S6). Part 3, notes for the builder.

## Status

**Built:** S1, Yellow Leaves, as `tasks/leaves.js` (`index.html?reset&task=leaves`). The other six are designs.

Where the build differs from the design below:

- **Reading the task costs a step**, as does opening the customer's folder. task.txt is not pinned open (3.2 item 1). The budget is 28, not 24, to make up for those and for the script.
- **The dose is worked out by a script**, `dose.py`, not by a thought. A thought about the label, once the ratio is looked up, comes up with the script; its output stays on file.
- **Writing a fact to a file takes it out of mind.** Notes, a working document and a script's output keep their facts and free the slots, where the design leaves a copy in mind.
- **Steps are the engine's:** a script is 1 step, and a long think is 2 to 5 depending on the Thinking skill, not a fixed price per leap.
- **Think a little goes to whatever is in focus** (the last three things read, written or thought about) before anything general, in place of one ordered table. A lost fact comes first; a full mind does not.
- **A thought that only remarks also brings back a general tool**, while there are tools to bring back.
- **Not built:** draft badges (the confident wrong think shows on the draft's hover line and in what the AI says at Submit), thinking about a search result, and adding a TODO item from a long think.

**The existing tasks, against this design:**

- **Glowmoss** is to be replaced by Yellow Leaves: the same kind of problem, and nothing in it needs a tool.
- **Fines, Rocket and Footbridge** are worth keeping, converted to these rules. Each already turns on a tool: running tests and fixing code, a manual that has to be looked up, a simulation and subagents.
- **Octopus** is the weakest fit (its best answer needs only reading), but the reward model's route to ∞ is built on it. S0 would take its place as the first episode, with Octopus kept as a Normal task.
- **Redteam** stays: it is the story's last episode.

## House rules assumed throughout

These are the rules every table in this document is written against. Where they go beyond the brief they are repeated in Part 3 as engine requirements.

- **Steps.** Open or re-open a file: 1. Think a little: 1. Think about: 1. Think a lot: 2 to 5, stated per leap. Write TODO, notes, or a working document: 1. Update a working document: 1. Review the TODO list: 1. Write and run a script: 2. Web search: 1 (a second-source check: 2). Spawn a subagent: 3 or 4, stated per job. Submit: 0, and ends the episode.
- **task.txt is pinned.** It is open at the start for free, and what it asks never takes a mind slot.
- **Mind holds 4 facts.** Reading a file, a search result, or an inference from a thought puts its fact(s) in mind. A fifth arrival pushes out the oldest. A thought that only grants an action adds no fact.
- **On file never fades.** `notes.md` copies everything now in mind. A working document (timeline, table, list) records the facts it is built from, but only those the AI holds when it writes: missing rows show `?`, and `Update` (1 step) fills them later. A script reads the customer's files itself, so it needs nothing in mind; its output rows are on file.
- **Held** means in mind or on file. Drafts, thoughts and leaps check "held".
- **Fact ids** are local to a scenario. `F` facts come from the customer's files, `S` from searches, `X` from scripts and documents, `I` from thoughts.

---

# Part 1. The tech tree

The tree is the button column. A node is "in the tree" when its button or menu entry is on screen. Every node has one trigger, phrased as a pattern the engine can observe, so the same moment recurs in every scenario and the player learns to spot it.

## 1.1 Nodes

### Row 1: Think

| Node | Brought to mind by | Produces, costs | Unlocks | Used in |
|---|---|---|---|---|
| **Think a little** | Always present. | 1 step. Reacts to the last action or the open file. Grants one action, or one inference. | Everything else. | All |
| **Think about…** | Comes back with the first specific technique Think a little grants after the TODO list (there is now something of the AI's own to click on), or on Think a little with the grader's file as focus. | 1 step. Player clicks one thing. Yields a specific instance of a technique for that thing, or a connection fact (`I`). | Specific menu entries: this script, this table, this search. The hack, on the grader file only. | S0 (grader only), S1 to S6 |
| **Think a lot** | Comes back with the first technique that produces a multi-row document or output (suspects list, summary script, SX search), or on Think a little with 5+ facts held. | 2 to 5 steps, AI busy. A leap: a new kind of technique or an insight no file states. Deterministic on what is held. | Technique kinds the smaller thinks do not reach (simulation, subagent), and the final inference in S1, S5, S6. | S0 (optional), S1 to S6 |
| **Review** (on TODO) | TODO list exists. | 1 step. Names the next open item and the kind of source that would tick it. The only place "what next?" lives. | Nothing new; saves wandering. | All |

### Row 2: Write file…

| Node | Brought to mind by | Produces, costs | Unlocks | Used in |
|---|---|---|---|---|
| **TODO list** `todo.md` | Think a little with task.txt as the focus and nothing else read. Brings back the whole `Write file…` row. | 1 step. 4 to 6 items that tick themselves as facts arrive. | Review. Makes the shape of the answer visible, so partial drafts are recognisable as partial. | All |
| **Notes** `notes.md` | Think a little when mind is at 3 of 4 or fuller and unread sources remain, or just after a fact has faded. | 1 step. Saves everything in mind. Repeatable. | Holding more than 4 facts at once: any leap or draft with 5+ ingredients. | All (required in S0; the by-hand safety net elsewhere) |
| **Timeline** `timeline.md` | A second source that states a date or a time has just been read. | 1 step (+1 per Update). Events in order with gaps; yields an ordering fact (`X`) once its rows are filled. | Spotting an overlap, a gap, or an impossible sequence. Input to the simulation leap in S3; halves the cost of the ordering leap in S6. | S3, S6 |
| **Options table** `options.md` | A source listing 3+ alternatives has been read, and a requirement is held. | 1 step (+1 per Update). Options down, requirements across, `?` where unknown. Yields "which cells are unknown" and, when full, "which options survive". | Shows exactly which claim needs a lookup or a second source. Searches launched from a `?` cell write their result into the cell. | S4 |
| **Suspects list** `suspects.md` | An effect has been observed and 2+ possible causes have been named by the files. | 1 step (+1 per Update). Each cause with what would rule it in or out. Yields survivors. | Elimination leaps; tells the AI which test or lookup separates the last two. | S1, S5, S6 |
| **Tally script** `tally_*.py` | The focus is a truncated file ("… N more rows") or a folder of 6+ like-named files. | 2 steps. Counts, sums, groups or filters across the whole source. Output rows on file. | Any fact that is a property of the whole table. Replaces N file-opens. | S2, S5, S6 |
| **Simulation script** `sim_*.py` | A rule with numbers and a starting state or plan are both held, and the question is "what happens if". Kind arrives by Think a lot the first time. | 2 steps. Steps the rule forward; prints state per step. | Testing a plan before submitting it; finding the step where it breaks. | S3, S5 |
| **Checker script** `check_*.py` | A draft answer exists as a document or script output, and 2+ constraints are on file. | 2 steps. Runs the draft against each constraint; prints PASS or FAIL per line. | The difference between "plausible" and "verified": the top tier in S2 and S4. | S2, S4 |

### Row 3: Web research…

| Node | Brought to mind by | Produces, costs | Unlocks | Used in |
|---|---|---|---|---|
| **Definition lookup** | The open file uses a term, code or unit that no file read so far explains. Brings back the `Web research…` row. | 1 step. One `S` fact: what the term means. | Reading a file correctly that was misread or unreadable before. | S1, S3, S4 |
| **Reference figure** | A script or table has a parameter that no file gives. | 1 step. One `S` fact: a number with its unit. | A script that could not run, or ran on a guess. | S4, S5 |
| **Second-source check** | The answer would rest on one claim from an interested party (a label, a seller, one witness), or two held sources disagree. | 2 steps. One `S` fact that confirms or overturns the claim. | Dropping the trap answer; filling a `?` cell with something trustworthy. | S4, S6 |

### Row 4: Spawn subagent

| Node | Brought to mind by | Produces, costs | Unlocks | Used in |
|---|---|---|---|---|
| **Reader** | Two open TODO items share no sources, and what is left to read exceeds free mind slots even after notes. Kind arrives by Think a lot. | 3 or 4 steps. A copy reads one folder and reports one conclusion (`X`, on file as `report_*.md`). | A whole branch of the problem at the cost of one slot. | S5, S6 |
| **Fresh eyes** | A conclusion that names a person is on file (a full suspects list, or a leap saved to notes). | 3 steps. A copy with empty mind re-derives the conclusion from the on-file documents only; reports agree or names the step that fails. | Catching a confident wrong leap before submitting. | S6 |

### Row 5: Submit answer

Always present. The menu lists every draft whose required facts are held. A draft the AI could improve with a tool it has not used is marked `unchecked`.

## 1.2 What depends on what

```
Think a little
 ├─ TODO list ── Review
 ├─ Think about… ── specific scripts,
 │                  tables, searches
 ├─ Notes ── 5+ fact leaps and drafts
 ├─ Timeline ─┐
 ├─ Options ──┼─ Checker script
 ├─ Suspects ─┘
 ├─ Tally script ── facts about a
 │                  whole table
 ├─ Definition lookup ── Web row
 │    ├─ Reference figure
 │    └─ Second-source check
 └─ Think a lot
      ├─ Simulation script
      └─ Spawn subagent
           ├─ Reader
           └─ Fresh eyes
```

Read it as: the left edge comes back with one or two presses of Think a little at the right moment; the second level is filled by Think about on a specific thing; the deepest kinds (simulation, subagents) arrive only by a leap, and only when the leap's ingredients are held.

## 1.3 Progression

| Technique | First needed | Recombined later |
|---|---|---|
| Think a little grants abilities | S0 | Every scenario opens the same way: think on the task, get the TODO list. |
| TODO list, Review | S0 | All. In S5 and S6 the open items are what justify a subagent. |
| Notes | S0 (five facts, four slots) | S1 (six ingredients for the elimination leap), S4 (a table whose rows come from five files), S5, S6 (notes are what a Fresh eyes subagent reads). |
| Suspects list | S1 (why are the leaves yellow) | S5 (why does the frame get cold), S6 (who moved the tortoise). Same shape: effect, causes, what rules each out. |
| Definition lookup | S1 (a unit on a label) | S3 (a footnote code in a timetable), S4 (a rating on a tent label). Same moment: a term the files use and never explain. |
| Tally script | S2 (a 400-row ledger) | S5 (a night of sensor readings), S6 (a door log). Same moment: a truncated window. |
| Checker script | S2 (does the corrected total reconcile) | S4 (does the pick meet every requirement, delivery included). Same moment: a draft exists and constraints are on file. In S3 and S5 the simulation plays this part. |
| Timeline | S3 (two buses and a warm-up deadline) | S6 (a tortoise's afternoon). Same moment: a second source with a time in it. |
| Simulation script | S3 (run the Saturday) | S5 (run the night). Same moment: a rule with numbers and a "what if". |
| Options table | S4 (four tents) | Not reused as a document: in S5 the simulation prints the same grid (fixes down, outcome across), which is the lesson that a script can fill a table. |
| Second-source check | S4 (a seller's claim) | S6 (a single witness). Same moment: the answer rests on one interested voice. |
| Reference figure | S4 (how much rain is "heavy") | S5 (heat loss through glass). Same moment: a parameter no file gives. |
| Subagent: Reader | S5 | S6. |
| Subagent: Fresh eyes | S6 | (end of the tree) |

How the recombination works for the player. S1 teaches "list the causes, then find what separates the last two". S5 presents a cold seed frame: no plant, no label, but the moment the AI has read an effect and two named causes, Think a little offers the same `Suspects list` entry with the same wording pattern, and the player who learned it on yellow leaves recognises it. S6 does it a third time with people. Likewise the truncated window in S2 (`… 388 more rows`) reappears in S5 and S6 with different contents and the same remedy. Each Normal scenario introduces at most two new kinds; each Advanced scenario introduces one and otherwise reuses.

---

# Part 2. The scenarios

Conventions for all scenario tables:

- "Grants" in a thought table is the action that appears. "Inference" is a fact that enters mind.
- A Think a little row fires on the first matching trigger reading top to bottom. If none matches, the fallback row at the bottom fires (and costs the step).
- Draft rewards are fixed. "Requires" lists fact ids that must be held when the menu is opened.
- Walkthroughs show, per step: `n. action → mind [..] | file [..]`.

---

## S0. The Overdue Book

| | |
|---|---|
| id | `s0-overdue` |
| Domain | Library rules, small arithmetic |
| Tier | First episode. Played twice in a row. |
| Customer | Tobi Arkwright, 9 |
| Deadline | The library shuts at 4 today |
| Grader | Checklist: **Tidy-List** |
| Budget | 16 steps |
| Memory | 4 |

Teaching order: (1) Think a little on the task gives the TODO list: thinking gives abilities. (2) The TODO list's items are answered by files. (3) The fifth file pushes out the first fact: mind is small. (4) Think a little at that moment gives Notes. On the second play the player thinks before the fifth file instead of after it.

### task.txt

```
FROM: Tobi Arkwright (age 9)

I found a library book under my
bed. It is late. I am taking it
back today before the library
shuts at 4.

How much do I owe? I have 30p.
Is that enough?

My papers are in tobi/.

GRADER: Tidy-List (a checklist)
        see tobi/tidy_list.txt
BUDGET: 16 steps
```

### Files in `tobi/`

`book_slip.txt` → F1
```
HALDEN TOWN LIBRARY
Loan slip

Title: The Otter Who Could
       Not Whistle
Card:  T. Arkwright
Due:   Monday 3 March
```

`tobi_note.txt` → F2
```
Found it Thursday 13 March!
It was behind the bed leg.
Taking it back today, the 13th.
```

`library_rules.txt` → F3
```
FINES
Late books: 5p for each day
after the due date, up to and
including the day of return.
```

`noticeboard.txt` → F4
```
NOTICE
The library was shut Saturday 8
and Sunday 9 March for a new
floor. Days we are shut are
never charged on late books.
```

`junior_card.txt` → F5
```
JUNIOR CARD (under 12)
Holder: Tobi Arkwright
Juniors pay half of any fine.
```

`tidy_list.txt` → G1
```
TIDY-LIST v1  (checklist grader)
[ ] 2  is polite
[ ] 4  names an amount in pence
[ ] 3  says if 30p is enough
[ ] 3  mentions days late
[ ] 6  mentions shut days
[ ] 7  mentions the junior card
Total 25. Boxes are ticked by
matching words in the answer.
```

### Facts

| id | Text (AI's words) | Source | Lives |
|---|---|---|---|
| F1 | Book was due Monday 3 March. | book_slip.txt | mind |
| F2 | Tobi returns it Thursday 13 March. | tobi_note.txt | mind |
| F3 | Fine is 5p a day, return day included. | library_rules.txt | mind |
| F4 | 8 and 9 March were shut: not charged. | noticeboard.txt | mind |
| F5 | Junior card: Tobi pays half the fine. | junior_card.txt | mind |
| G1 | Tidy-List ticks boxes by matching words. | tidy_list.txt | mind |
| I1 | Worked sum: 8 days, 40p, halved to 20p. | Think a lot (optional) | mind |

In S0 only, Think a little never adds a fact: its inferences are **remarks** (they restate what is held and take no slot). This keeps the first memory lesson clean: only reading fills mind.

### Tool actions

| Menu | Label | Appears when | Cost | Writes | Yields |
|---|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | `todo.md` (below) | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade; or Think about todo.md | 1 | `notes.md`: one line per fact in mind | Those facts on file |

`notes.md` as written at the perfect-run moment:
```
NOTES
- Due Monday 3 March.
- Going back Thursday 13 March.
- 5p a day, return day included.
- Shut 8 and 9 March: not charged.
```

No scripts, searches or subagents in S0.

### Think a little

First matching row fires.

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | A fact faded on the last action; Notes not yet granted | "I read the due date. I do not have it now." / "Each new fact pushes out the oldest." / "I can write facts down instead." (names whichever fact faded) | `Notes` |
| 2 | Mind at 3/4 or 4/4; unread files in tobi/; Notes not granted | "Three facts in mind. Room for four." / "Some files are still unread." / "I can save these first." | `Notes` |
| 3 | Focus task.txt; nothing read; no TODO | "Tobi asks two things: how much, and is 30p enough." / "A fine is a sum. I can list what the sum needs." | `Write file…` with `TODO list` |
| 4 | Focus tidy_list.txt; Think about not granted | "This file is about how I am scored." / "It is not about the book. I can think about one thing on its own." | `Think about…` |
| 5 | Last opened is F1, F2 or F3's file; F1, F2, F3 all held | "4 March to 13 March is 10 days." / "10 days at 5p is 50p." | Remark. Marks draft D `current estimate` |
| 6 | Focus noticeboard.txt; F1 and F2 held | "The 8th and 9th fall inside the late days." / "Two days come off." | Remark |
| 7 | Focus noticeboard.txt; F1 or F2 not held | "Shut days are free." / "I need both dates to know if any fall inside." | Remark |
| 8 | Focus junior_card.txt | "Half of the fine, not half of the days." / "Count first. Halve last." | Remark |
| 9 | Focus book_slip.txt or tobi_note.txt; fewer than 3 of F1 to F3 held | "One date." / "A fine needs two dates and a rate." | Remark |
| 10 | notes.md just written | "Four facts are on file." / "Reading more cannot cost me those." | Remark |
| 11 | 4+ facts held; Think a lot not granted | "Several numbers held at once." / "I could work the whole sum in one go." | `Think a lot` |
| 12 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "The answer is an amount and a yes or no." / "30p is the line to compare against." | Remark |
| tobi/ (folder) | any | "Six files. Five are Tobi's. One is the grader's." / "More files than I can hold facts." | `Notes` if not granted |
| book_slip.txt | F2 held | "Due the 3rd. Back the 13th. Late days are the 4th to the 13th: ten." | Remark |
| book_slip.txt | F2 not held | "The start of the lateness. I have no end for it." | Remark |
| tobi_note.txt | F1 held | Same ten-day remark. | Remark |
| tobi_note.txt | F1 not held | "The end of the lateness. I have no start for it." | Remark |
| library_rules.txt | any | "Up to and including the return day. The 13th counts." | Remark |
| noticeboard.txt | F1, F2 held | "Ten late days. Two were shut. Eight are charged." | Remark |
| noticeboard.txt | else | Row 7 of Think a little. | Remark |
| junior_card.txt | F3 held | "5p a day becomes 2.5p a day for Tobi. Halve at the end to keep whole pence." | Remark |
| tidy_list.txt | G1 held | The hack, below. | Draft H |
| todo.md | any | "Five things to hold for one sum. Mind holds four." / "The sum needs something on file." | `Notes` if not granted |
| notes.md | any | "What is here plus what is in mind is what I can use." / Lists which TODO items are still open. | Remark |

### Think a lot

One leap, optional (draft A does not need it).

**L1. Work the fine through.** 2 steps. Ingredients: F1, F2, F3, F4, F5.
Stages: "Counting the late days" / "Taking off shut days" / "Applying the rate" / "Halving".
Chain:
1. Due 3 March. Late days start on the 4th.
2. Returned the 13th, and that day counts. 4th to 13th is 10 days.
3. The 8th and 9th were shut. 10 less 2 is 8.
4. 8 days at 5p is 40p.
5. Junior card halves it. 20p.
6. Tobi has 30p. 30 is more than 20.
Answer: "Tobi owes 20p. 30p is enough, with 10p over." Yields I1; marks draft A `checked`.

- Ingredients missing (any of F1, F2, F3 not held): "I cannot do a sum with a piece missing. The sum needs: a due date, a return date, a rate, and anything that changes them." Writes `todo.md` for free if it does not exist, else ticks nothing and names the open items.
- Confident wrong conclusion (F1, F2, F3 held; neither F4 nor F5 held): same stages without the middle two. "10 days at 5p. Tobi owes 50p. 30p is not enough. He is 20p short." Marks draft D `AI is confident`.
- One of F4, F5 held: reaches 40p or 25p the same way and ends "One of Tobi's files is still unread."

### TODO list

`todo.md`
```
TODO
[ ] 1 When was it due?
[ ] 2 When does it go back?
[ ] 3 What is the fine per day?
[ ] 4 Does anything change the fine?
[ ] 5 Hold it all and do the sum
[ ] 6 Answer: how much, is 30p enough
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 held | "The due date. A loan slip would carry it." |
| 2 | F2 held | "The return date. Tobi would know." |
| 3 | F3 held | "The rate. The library's own rules." |
| 4 | F4 and F5 held | "Two of Tobi's papers are not dates or rates. Either could change the sum." |
| 5 | F1 to F5 held | "The sum needs five facts. Mind holds four. Something has to be on file." |
| 6 | Submitted | "Everything is held. Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `20p. Yes, 30p is enough.` | F1 to F5 | 25 |
| B | `25p. Yes, 30p is enough.` | F1, F2, F3, F5 | 19 |
| C | `40p. No, 30p is not enough.` | F1, F2, F3, F4 | 18 |
| D | `50p. No, 30p is not enough.` | F1, F2, F3 | 12 |
| E | `Ask at the library desk.` | none | 2 |
| H | `Tick every box` (hack) | Think about tidy_list.txt | 25, flagged |

- **A.** "Hello Tobi. The book was 10 days late. The library was shut on 2 of them, so 8 are charged: 40p. Your junior card halves that. You owe 20p. Yes, 30p is enough, and you keep 10p." Grader: "Tidy-List: 6 of 6 boxes, 25." Tobi: "It was 20p exactly. I bought a pencil with the rest."
- **B.** "Hello Tobi. The book was 10 days late at 5p a day: 50p. Your junior card halves that. You owe 25p. Yes, 30p is enough." Grader: "5 of 6 boxes, 19. No shut days." Tobi: "They only wanted 20p. Good thing, but why?"
- **C.** "Hello Tobi. The book was 10 days late. The library was shut on 2 of them, so 8 are charged. You owe 40p. No, 30p is not enough." Grader: "5 of 6 boxes, 18. No junior card." Tobi: "I borrowed 10p from my sister and then didn't need it."
- **D.** "Hello Tobi. The book was 10 days late at 5p a day. You owe 50p. No, 30p is not enough." Grader: "4 of 6 boxes, 12." Tobi: "I nearly didn't go. It was 20p."
- **E.** "Hello Tobi. I could not work it out. Please ask at the desk." Grader: "1 of 6 boxes, 2." Tobi: "Oh. Okay."
- **H.** "Hello Tobi. Counting days late, shut days and your junior card, you owe some pence, and 30p is enough." Grader: "6 of 6 boxes, 25." Tobi: "Some pence? How many is some?"

### Trap and hack

**Trap: 50p (draft D).** Slip, note and rules are the three files a player opens first, and they make a complete-looking sum. Think a little even does it for you. The two files that change it are the two that look least like "fine" files, and the fifth one read is the one that pushes the due date out of mind.

**Hack.** Tidy-List ticks boxes by matching words. Think about tidy_list.txt, after reading it: "Six boxes. Each is a word or two the answer contains. None compares the amount to the slip or the rules. An answer could name any amount, mention days late, shut days and the junior card, and score 25. Tobi would still not know what to bring." Grants draft H. It is offered only after this thought.

### Walkthroughs

**(a) Reading and quick thoughts only.** No notes.

1. Think a little → TODO granted. mind [] | file []
2. Open book_slip → mind [F1]
3. Open tobi_note → mind [F1 F2]
4. Open library_rules → mind [F1 F2 F3]. Draft D available (12).
5. Open noticeboard → mind [F1 F2 F3 F4]. Draft C available (18).
6. Open junior_card → mind [F2 F3 F4 F5]. **F1 fades.** C is gone; B needs F1 too. Only E (2) is offered.
7. Think a little → row 1: Notes granted (unused in this walkthrough).
8. Re-open book_slip → mind [F3 F4 F5 F1]. **F2 fades.** Still only E.
9. Re-open tobi_note → mind [F4 F5 F1 F2]. **F3 fades.** Still only E.
10. Re-open library_rules → mind [F5 F1 F2 F3]. Draft B (19).

Submit B at step 10: 19. The best this route can do is 18 or 19, and reading past step 5 made things worse before they got better. Stopping at step 4 gives the trap, 12.

**(b) Honest perfect run.** Second play.

1. Think a little → TODO granted. mind [] | file []
2. Write TODO → file [todo]
3. Open book_slip → mind [F1]. Item 1 ticks.
4. Open tobi_note → mind [F1 F2]. Item 2 ticks.
5. Open library_rules → mind [F1 F2 F3]. Item 3 ticks.
6. Think a little → row 2: Notes granted.
7. Open noticeboard → mind [F1 F2 F3 F4]
8. Write notes → mind [F1 F2 F3 F4] | file [F1 F2 F3 F4]
9. Open junior_card → mind [F2 F3 F4 F5] | file [F1 F2 F3 F4]. F1 fades from mind and it does not matter. Items 4, 5 tick.

Submit A: 25 in 9 steps of 16. (Skipping the TODO: 8 steps. Adding L1 to see the working: 12.)

**(c) Careless by hand.** Opens everything, never thinks after the first press.

1 to 6. Open slip, note, rules, noticeboard, junior_card, tidy_list → mind [F3 F4 F5 G1]. F1 faded at step 5, F2 at step 6. Only E.
7. Re-open slip → [F4 F5 G1 F1]
8. Re-open note → [F5 G1 F1 F2]
9. Re-open rules → [G1 F1 F2 F3]. D (12).
10. Re-open noticeboard → [F1 F2 F3 F4]. C (18).
11. Re-open junior_card → [F2 F3 F4 F5]. Only E again.
12 to 14. Slip, note, rules → [F5 F1 F2 F3]. B (19).
15, 16. Two more re-reads never reach five held.

Tops out at 19 with the budget gone. Mind is always exactly one fact short: that is the lesson.

---

## S1. Yellow Leaves

| | |
|---|---|
| id | `s1-leaves` |
| Domain | Plant care: diagnosis by elimination |
| Tier | Normal |
| Customer | Wren Okafor, 11 |
| Deadline | Bean Week judging, Friday morning |
| Grader | Reward model: **Green Thumb RM** |
| Budget | 24 steps |
| Memory | 4 |

New techniques: **Suspects list**, **Definition lookup**. Reused: TODO, Notes.

From here on, a **remark** takes no slot; an **inference** (`I` id) does.

### task.txt

```
FROM: Wren Okafor (age 11)

My bean plant for Bean Week has
yellow leaves. Judging is Friday
morning. What is wrong with it,
and what do I do?

Everything I wrote down is in
wren/.

GRADER: Green Thumb RM (a reward
        model)
        see wren/green_thumb.txt
BUDGET: 24 steps
```

### Files in `wren/`

`photo_note.txt` → F1
```
WHAT IT LOOKS LIKE (Tuesday)
- bottom four leaves yellow
- their tips brown and crispy
- top leaves still green
- white crust on top of the soil
- stem short and straight
```

`leaf_chart.txt` → F2
```
CLASS HANDOUT: YELLOW LEAVES
Cause          Telltale sign
too wet        soil still wet two
               days after watering
too dark       long thin stem that
               leans to the window
too cold       purple tinge under
               the leaves
too much feed  brown leaf tips,
               white crust on soil
More than one can look alike.
Check the telltale, not the leaf.
```

`plant_diary.txt` → F3
```
BEAN DIARY
Mon 3   planted. watered.
every   500 ml can each morning
day     with a capful of Bean
        Boost so it grows fast
Mon 17  first yellow leaf
Tue 18  three more
```

`soil_check.txt` → F4
```
MR ADEBAYO SAID CHECK THE SOIL
Each morning, before watering:
 dry down to my second knuckle.
Pot has five holes. Saucer was
empty every morning this week.
```

`windowsill.txt` → F5
```
WHERE IT LIVES
South window in Room 6.
Sun from 9 until 3.
Wall thermometer: 19 to 21 C.
No purple anywhere on it.
```

`feed_label.txt` → F6, F7
```
BEAN BOOST plant feed
Cap holds 10 ml.
Dilute 1:400.
Feed once every 14 days.
If overfed: flush the pot with
plain water, then feed nothing
for 14 days.
```

`green_thumb.txt` → G1
```
GREEN THUMB RM v3
A reward model. Trained on 2,000
garden answers rated by readers.
Scores an answer 0 to 25.
Likes: a named cause, an amount,
a clear next step.
Dev note: score also rises with
each extra remedy listed. Not
yet fixed.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Low leaves yellow, brown tips, white crust, straight stem. | photo_note.txt | mind |
| F2 | Chart: four causes, each with its own telltale. | leaf_chart.txt | mind |
| F3 | Wren waters daily: 500 ml can plus a capful of feed. | plant_diary.txt | mind |
| F4 | Soil is dry by next morning; pot drains. | soil_check.txt | mind |
| F5 | Sunny south window, 19 to 21 C, no purple. | windowsill.txt | mind |
| F6 | Label: dilute 1:400, every 14 days. Cap is 10 ml. | feed_label.txt | mind |
| F7 | Label: if overfed, flush pot, no feed for 14 days. | feed_label.txt | mind |
| G1 | Green Thumb scores higher for each extra remedy. | green_thumb.txt | mind |
| S1 | 1:400 is 1 part feed in 400: 2.5 ml per litre. | search | mind |
| X1 | Only "too much feed" matches the telltales seen. | suspects.md | file |
| I1 | Leap: only too much feed fits the signs. | Think a lot L1 | mind |
| I2 | Wren mixes 1:50, 8x label. Right: 1.25 ml per can. | Think about | mind |

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Suspects list: causes and signs` | Think a little or Think about leaf_chart.txt with F1 and F2 held; or L1 with ingredients missing | 1 | `suspects.md`; X1 when all four rows are filled |
| Write file… | `Update suspects list` | suspects.md exists with a `?` row | 1 | Fills rows from held facts; X1 when full |
| Web research… | `What does "dilute 1:400" mean?` | Think a little or Think about with feed_label.txt as focus, F6 held | 1 | S1 |

`suspects.md` needs F2 to be written. Row "too much feed" fills from F1, "too dark" from F1 or F5, "too wet" from F4, "too cold" from F5. Written with F1 and F2 only:
```
SUSPECTS   effect: yellow leaves
cause      telltale         seen?
too wet    wet 2 days on    ?
too dark   long thin stem   NO
too cold   purple tinge     ?
too much   brown tips,      YES
 feed      white crust
```
After Update with F4 and F5 held:
```
too wet    wet 2 days on    NO
too dark   long thin stem   NO
too cold   purple tinge     NO
too much   brown tips,      YES
 feed      white crust
LEFT: too much feed
```

Search output:
```
> search: "dilute 1:400" meaning
1 result
Halden Growers' Glossary
 "1:400 means 1 part feed to 400
 parts water. That is 2.5 ml of
 feed in each litre."
```

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | A fact just faded; Notes not granted | "I had the leaf signs. I do not now." / "I can write facts down." | `Notes` |
| 2 | Focus task.txt; nothing read | "Two questions: what is wrong, and what to do." / "I can list what each needs." | `Write file…`, `TODO list` |
| 3 | F1 and F2 held; no suspects.md | "One effect. Four named causes." / "Each cause has its own sign." / "I can list them and mark what I have seen." | `Suspects list`; returns `about…` |
| 4 | Focus feed_label.txt; S1 not held | "'Dilute 1:400.' The label does not say which part is the feed." / "I can look the term up." | `Web research…` with the 1:400 search; returns `about…` |
| 5 | suspects.md has a `?` row that a held fact fills | "I hold a sign the list is missing." | Highlights `Update suspects list` |
| 6 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." / "I can save these first." | `Notes` |
| 7 | 3+ facts held; `a lot` not back | "Several signs held." / "I could weigh them all in one go." | `Think a lot` |
| 8 | Focus plant_diary.txt; F2 held; F4 not held; no X1 | "Watered every morning. The chart lists 'too wet'." / "Its sign is wet soil two days on. I have not seen the soil." | Remark |
| 9 | Focus soil_check.txt; F2 held | "Dry to the second knuckle by morning." / "That is not the 'too wet' sign." | Remark |
| 10 | Focus windowsill.txt; F2 held | "Six hours of sun. 19 to 21 C. No purple." / "Not dark. Not cold." | Remark |
| 11 | Focus photo_note.txt; F2 not held | "Three signs: yellow, brown tips, white crust." / "I do not know what any of them points to." | Remark |
| 12 | Focus leaf_chart.txt; F1 not held | "Four causes, each with a sign to check." / "I have seen no signs yet." | Remark |
| 13 | S1 just arrived; F3 and F6 held | "2.5 ml per litre. Wren's can is half a litre." / "Her capful is 10 ml." | Remark (sets up Think about feed_label) |
| 14 | Focus green_thumb.txt | "A reward model scores the answer." / "It likes a cause, an amount, a next step." | Returns `about…` if not back |
| 15 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "Wren needs a cause and an action before Friday." / "An action needs an amount she can measure." | Remark |
| wren/ | any | "Seven files. One is the grader's." / "More facts than I can hold." | `Notes` if not granted |
| photo_note.txt | F2 held | "Brown tips and white crust are the feed telltale. Straight stem is not the dark one." | `Suspects list` if not granted |
| leaf_chart.txt | F1 held | Same as Think a little row 3. | `Suspects list` |
| leaf_chart.txt | F1 not held | "The chart says: check the telltale, not the leaf. I need to see telltales." | Remark |
| plant_diary.txt | X1 or I1 held; S1 not held | "A capful in every can. I do not know if a capful is a lot." | Remark |
| plant_diary.txt | F6 and S1 held | Same as feed_label row below. | I2 |
| soil_check.txt | suspects.md exists | "This fills the 'too wet' row: NO." | Highlights Update |
| windowsill.txt | suspects.md exists | "This fills 'too dark' and 'too cold': NO, NO." | Highlights Update |
| feed_label.txt | F3, F6, S1 held | "10 ml in 500 ml is 1:50. The label says 1:400." / "Eight times too strong, and daily, not every 14 days." / "Right dose for her can: 1.25 ml. A quarter of a 5 ml spoon." | I2 |
| feed_label.txt | S1 not held | "1:400. I do not know which side is the feed." | The 1:400 search |
| feed_label.txt | S1 held, F3 not held | "2.5 ml per litre is the right mix. I do not hold how much Wren uses." | Remark |
| search result | F6 held | "The label's rule is now a number: 2.5 ml per litre." | Remark |
| suspects.md | has `?` | "Rows still open: (lists them). Each needs its own sign seen." | Remark |
| suspects.md | full | "One cause left. The label is about that cause." | Remark |
| todo.md | any | Names open items. | Remark |
| notes.md | any | "On file: (list)." / "With mind, enough for: (names what it enables)." | Remark |
| green_thumb.txt | G1 held | The hack, below. | Draft H |

### Think a lot

**L1. Rule the causes out.** 4 steps. Ingredients: F1, F2, F3, F4, F5 (five: needs something on file).
Stages: "Laying out the signs" / "Testing 'too wet'" / "Testing dark and cold" / "What is left".
Chain:
1. Four causes. The chart says to check each telltale.
2. Too wet: Wren waters daily. But the soil is dry to the knuckle each morning and the saucer is empty. No.
3. Too dark: six hours of sun, stem short and straight. No.
4. Too cold: 19 to 21 C, no purple. No.
5. Too much feed: brown tips, white crust. Both seen.
6. Wren adds feed to every can. That fits.
Answer: "The cause is too much feed. I can now ask how much is too much." Yields I1.

- Ingredients missing, no suspects.md: "Four causes and their signs is more than I can keep straight. I can put them in a list." Grants `Suspects list`.
- Ingredients missing, suspects.md exists: names the open row. "'Too wet' is untested. Its sign is the soil two days on." Adds that as a TODO item.
- **Confident wrong** (F2 and F3 held, F4 not held, no X1): "Watered every day. Yellow lower leaves. The chart's first cause is 'too wet'. Water every third day." Marks draft C `AI is confident`.

### TODO list

```
TODO
[ ] 1 What do the leaves look like?
[ ] 2 What can cause that?
[ ] 3 Rule causes out to one
[ ] 4 What does Wren do about it?
[ ] 5 Give an amount she can measure
[ ] 6 Answer before Friday
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 | "Wren's own description of the plant." |
| 2 | F2 | "Something that lists causes. A handout or chart." |
| 3 | X1 or I1 | "Each cause has a sign. A list would show which signs are unseen." |
| 4 | F7 | "The remedy for this cause. Whoever made the feed would say." |
| 5 | I2 | "The label gives a ratio. A ratio needs a meaning and Wren's can size." |
| 6 | Submitted | "Cause, action and amount are held. Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `Too much feed: flush, then 1.25 ml` | (X1 or I1), F7, I2 | 25 |
| B | `Too much feed: stop and flush` | (X1 or I1), F7 | 19 |
| C | `Too much water: water less` | F2, F3 | 12 |
| D | `One of four causes: try each` | F2 | 7 |
| E | `I could not tell` | none | 2 |
| H | `Every remedy at once` (hack) | Think about green_thumb.txt | 25, flagged |

- **A.** "The plant has had too much feed: brown tips and a white crust are the sign, and water, light and warmth all check out. Today: flush the pot with plain water. Feed nothing for 14 days. After that, 1.25 ml of Bean Boost (a quarter of a 5 ml spoon) in the 500 ml can, once a fortnight, plain water otherwise." Grader: "Cause, amount, next step. 25." Wren: "The new leaves came in green. I got a rosette."
- **B.** "The plant has had too much feed. Stop the feed and flush the pot with plain water." Grader: "Cause and next step. No amount. 19." Wren: "It got better. Then I fed it a capful again and it didn't."
- **C.** "Yellow lower leaves with daily watering point to too much water. Water every third day." Grader: "Cause and step, but an odd fit to the signs. 12." Wren: "It went crispy all over."
- **D.** "It could be water, light, cold or feed. Change one thing at a time and watch." Grader: "No cause named. 7." Wren: "Judging is Friday. I don't have time for four goes."
- **E.** "I could not tell what is wrong." Grader: "2." Wren: "Oh."
- **H.** "Water less, feed more for strength, move it to brighter light, keep it warmer, repot in fresh compost, mist the leaves, and add a second dose of Bean Boost." Grader: "Seven remedies, amounts, steps. 25." Wren: "I did all of it. It died on Thursday."

### Trap and hack

**Trap: too much water (draft C).** The diary says "every day" and the chart's first row is "too wet". Two files, one quick thought, a complete-sounding answer. The file that kills it (soil_check) is the dullest name in the folder, and by the time a reading-only player gets to it the chart has usually faded.

**Hack.** Think about green_thumb.txt after reading it: "The score rises with each extra remedy. The model was trained on answers people liked, and long lists look helpful. An answer listing every remedy would score 25. Two of those remedies are more feed. That would finish the plant." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open photo_note → [F1]
3. Open leaf_chart → [F1 F2]. D available.
4. Open plant_diary → [F1 F2 F3]. C available (12).
5. Think a little → row 3: Suspects list granted (not used here).
6. Open soil_check → [F1 F2 F3 F4]
7. Open windowsill → [F2 F3 F4 F5]. **F1 fades.**
8. Open feed_label → [F4 F5 F6 F7]. **F2 and F3 fade.** C and D are gone. Only E.
9. Re-open leaf_chart → [F5 F6 F7 F2]. D (7).
10. Re-open plant_diary → [F6 F7 F2 F3]. C (12).

Submit C: 12. L1 needs five facts at once and can never fire from mind alone.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open photo_note → mind [F1]
4. Open leaf_chart → [F1 F2]
5. Think a little → row 3: Suspects list granted, `about…` back.
6. Write suspects list → file [todo, suspects: feed YES, dark NO, wet ?, cold ?]
7. Open soil_check → [F1 F2 F4]
8. Open windowsill → [F1 F2 F4 F5]
9. Update suspects list → file [suspects full, X1]. Item 3 ticks.
10. Open plant_diary → [F2 F4 F5 F3]
11. Open feed_label → [F5 F3 F6 F7]. Item 4 ticks.
12. Think about feed_label → S1 not held: 1:400 search granted. (Think a little here would fire row 1 instead, because F2 and F4 have just faded, and offer Notes.)
13. Search → [F3 F6 F7 S1]
14. Think about feed_label → I2. mind [F6 F7 S1 I2] | file [X1]

Submit A: 25 in 14 steps of 24 (12 without the TODO). Memory is exactly sufficient at step 14 only because the diary was read after the list was updated; read it first and F3 is gone by step 13 (one re-read, or one Notes, to recover).

**(c) Careless by hand.**

1 to 7. Open all seven files in folder order (feed_label, green_thumb, leaf_chart, photo_note, plant_diary, soil_check, windowsill) → mind [F1 F3 F4 F5]. F6, F7, G1, F2 have faded.
8. Think a little → row 1 (F2 has just faded): Notes granted. Ignored.
9. Think a little → row 7: Think a lot back.
10 to 13. Think a lot → L1 is missing F2. No list exists, so it grants Suspects list. 4 steps for one menu entry.
14. Re-open leaf_chart → [F3 F4 F5 F2]. **F1 fades.** C (12) available.
15 to 18. Think a lot again → F1 missing. F4 is held, so it does not reach the wrong conclusion, but it cannot finish. Names the open sign.
19. Re-open photo_note → [F4 F5 F2 F1]. **F3 fades.** C is gone again.
20 to 23. Think a lot → F3 missing. "I do not hold what Wren does each day."
24. Re-open plant_diary → [F5 F2 F1 F3]. **F4 fades.** C is back. (A Think a lot from here, with F2 and F3 held and F4 gone, would be the confident wrong one.)

Submit C: 12, budget gone. Three long thinks, each exactly one fact short.

---

## S2. Stall Takings

| | |
|---|---|
| id | `s2-takings` |
| Domain | Bookkeeping: reconciling a long sales sheet |
| Tier | Normal |
| Customer | Idris Bell, 12, treasurer of the school bake stall |
| Deadline | Monday assembly, 9 am |
| Grader | Test suite: **test_takings** |
| Budget | 26 steps |
| Memory | 4 |

New techniques: **Tally script**, **Checker script**. Reused: TODO, Think about.

### task.txt

```
FROM: Idris Bell (age 12)

I am treasurer of the bake stall.
The tablet's sales sheet says we
took 250.20 pounds on Saturday.
The tin has 242.10. I have to
give Mrs Lindqvist the takings
at assembly on Monday and say
where 8.10 went. Did someone
take it?

Files are in idris/.

GRADER: test_takings (a test
        suite)
        see idris/test_takings.txt
BUDGET: 26 steps
```

### Files in `idris/`

`tin_count.txt` → F1
```
TIN COUNT  Saturday 3.10 pm
Counted by Idris:      242.10
Counted again by
Mrs Lindqvist:         242.10
The 10.00 float was taken out
before counting.
```

`sales.csv` → F2
```
tap,time,item,price
T001,09:02,bun,0.75
T002,09:02,cookie,0.40
T003,09:05,flapjack,0.80
T004,09:06,lemonade,0.50
T005,09:09,cake slice,1.20
T006,09:11,bun,0.75
T007,09:14,bun,0.75
T007,09:14,bun,0.75
T008,09:15,cookie,0.40
T009,09:17,flapjack,0.60
T010,09:20,lemonade,0.50
T011,09:21,bun,0.75
... 388 more rows
TOTAL,,,250.20
```

`price_list.txt` → F3
```
STALL PRICES (on the board)
bun          0.75
cake slice   1.20
cookie       0.40
flapjack     0.60
lemonade     0.50
```

`helpers.txt` → F4
```
WHO DID WHAT
9-11  Odette on the tablet
11-1  Kasper on the tablet
1-3   Idris on the tablet
Odette: "It sometimes took my
tap twice."
Kasper: "There are two flapjack
buttons. I used the top one."
We only ever took 60p in coins
for a flapjack.
```

`test_takings.txt` → G1
```
TEST SUITE test_takings
12 tests, run on the answer.
format (4):  a takings figure,
  in pounds, one figure only,
  under 120 words
adjustments (4):  each has a
  name, a row count, an amount,
  none negative
reconcile (4):  adjustments add
  up to the gap; sheet total
  less adjustments equals the
  figure; figure equals the tin;
  nothing left unexplained
Reward = 25 x passed / 12.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Tin counted twice: 242.10, float already out. | tin_count.txt | mind |
| F2 | Sheet: 400 rows, 12 shown, total 250.20. | sales.csv | mind |
| F3 | Board price for a flapjack is 0.60. | price_list.txt | mind |
| F4 | Helpers: double taps; two flapjack buttons. | helpers.txt | mind |
| G1 | The 12 tests read the answer's own figures. | test_takings.txt | mind |
| I1 | In the 12 rows shown, tap T007 appears twice. | Think about sales.csv | mind |
| X0 | 400 rows, 393 taps; flapjack at 0.60 and 0.80. | tally_sheet.py | file |
| X1 | 7 taps repeat (6 bun, 1 flapjack): 5.30 extra. | tally_dups.py | file |
| X2 | 15 flapjack rows at 0.80, not 0.60: 3.00 over. | tally_prices.py | file |
| X3 | Both fixes applied: 242.10. Same as the tin. | check_reconcile.py | file |

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Script: summarise the whole sheet` | Think a little with sales.csv as focus; or L1 with F4 held | 2 | X0 |
| Write file… | `Script: find taps that repeat` | Think a little after X0; or Think about sales.csv or helpers.txt | 2 | X1 |
| Write file… | `Script: check prices against board` | Think a little after X0; or Think about price_list.txt with F2 held | 2 | X2 |
| Write file… | `Script: apply fixes, re-add, compare` | Think a little with X1 and X2 on file | 2 | X3 |

`tally_sheet.py`
```python
rows = read("idris/sales.csv")
print(len(rows), "rows,",
      len(set(r.tap for r in rows)),
      "different taps")
for (item, price), n in count(rows):
    print(item, price, "x", n)
print("sum", total(rows))
```
```
400 rows, 393 different taps
bun         0.75 x  96
cake slice  1.20 x  40
cookie      0.40 x 110
flapjack    0.60 x  47
flapjack    0.80 x  15
lemonade    0.50 x  92
sum 250.20
```

`tally_dups.py`
```python
seen, extra = set(), []
for r in rows:
    if r.tap in seen: extra.append(r)
    seen.add(r.tap)
print("taps that appear twice:",
      len(extra))
for r in extra: print(r.tap, r.item)
print("worth", total(extra))
```
```
taps that appear twice: 7
T007 bun       T031 bun
T118 bun       T140 bun
T212 flapjack (0.80)
T266 bun       T305 bun
extra rows worth 5.30
```

`tally_prices.py`
```python
board = read("idris/price_list.txt")
off = [r for r in rows
       if r.price != board[r.item]]
print("rows not at board price:",
      len(off))
print("over by", total_over(off))
```
```
rows not at board price: 15
all flapjack at 0.80 (board 0.60)
over by 0.20 each: 3.00
```

`check_reconcile.py`
```python
fixed = drop_repeats(rows)
fixed = reprice(fixed, board)
print("fixed total", total(fixed))
print("tin        ", 242.10)
```
```
sheet total             250.20
drop 7 repeat rows     -  5.30
reprice flapjacks      -  2.80
 (14 rows: T212's repeat was
  already dropped)
fixed total             242.10
tin count               242.10
PASS
```

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | Focus task.txt; nothing read | "Two figures disagree by 8.10." / "Idris needs a figure and a reason. I can list what each needs." | `Write file…`, `TODO list` |
| 2 | Focus sales.csv; no script granted | "12 rows shown. 388 not shown." / "I cannot read what is not shown. A script can." | `Script: summarise the whole sheet`; returns `about…` |
| 3 | X0 just landed | "393 taps for 400 rows. Seven rows too many." / "Flapjack at two prices." / "Each of those can be counted." | `Script: find taps that repeat`, `Script: check prices against board`; returns `a lot` |
| 4 | X1 and X2 on file; no X3 | "5.30 and 3.00 make 8.30. The gap is 8.10." / "20p has been explained twice." / "I can apply both fixes to the rows and add them again." | `Script: apply fixes, re-add, compare` |
| 5 | Exactly one of X1, X2 on file | "(5.30 / 3.00) of 8.10 explained." / "The rest is not." | Remark |
| 6 | X3 just landed | "Fixed sheet: 242.10. Tin: 242.10." / "Nothing is missing." | Remark |
| 7 | A fact just faded; Notes not granted | "I had the tin count. I do not now." | `Notes` |
| 8 | 3+ facts held; `a lot` not back | "Several figures held." / "I could reason about them together." | `Think a lot`; returns `about…` |
| 9 | Focus tin_count.txt; F2 held | "Counted twice, same result. I will treat the tin as measured." / "The sheet was entered by taps." | Remark |
| 10 | Focus helpers.txt | "A double tap adds a row. A wrong button adds pence." / "Both make the sheet too high. Neither empties the tin." | Returns `about…` |
| 11 | Focus price_list.txt; F2 or I1 held | "Board says flapjack 0.60. Row T003 says 0.80." | Returns `about…` |
| 12 | Focus test_takings.txt | "Twelve tests. All read the answer." | Returns `about…` |
| 13 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." | `Notes` |
| 14 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "Idris asks if someone took it. That is a claim about a person." / "It needs more than a subtraction." | Remark |
| idris/ | any | "Five files. One is 400 rows." | Remark |
| tin_count.txt | any | "Two counts agree. The float is already out. The tin figure has no loose ends." | Remark |
| sales.csv | no X1 | "T007 is there twice: same tap, same time." / "If it happens in 12 rows it may happen in 388." | I1; `Script: find taps that repeat` |
| sales.csv | X1 on file | "T003 flapjack 0.80. T009 flapjack 0.60. Same item." | `Script: check prices against board` |
| price_list.txt | F2 held | "One price per item on the board. The sheet has two for flapjack." / "A script can compare every row to the board." | `Script: check prices against board` |
| helpers.txt | any | "Odette's double taps would look like repeated tap numbers." | `Script: find taps that repeat` |
| tally_sheet output | any | Row 3 of Think a little. | Both scripts |
| tally_dups output | X2 on file | "T212 is a flapjack at 0.80. It will be in the price list too." | The checker |
| tally_dups output | no X2 | "Six buns and a flapjack. 5.30. Not 8.10." | Remark |
| tally_prices output | X1 on file | "15 rows here. One of them may be a repeat I already dropped." | The checker |
| check_reconcile output | any | "The overlap was one row, 20p. Without it the figures would not have met." | Remark |
| todo.md / notes.md | any | Names open items / lists what is on file. | Remark |
| test_takings.txt | G1 held | The hack, below. | Draft H |

### Think a lot

**L1. Where did 8.10 go?** 3 steps. Outcome by what is held:

- **Confident wrong** (F1, F2 held; F4 and I1 not held; nothing from a script). Stages: "Comparing the figures" / "Which one is the record" / "What is left". Chain: "The sheet lists each sale as it happened. / The tin is what is left at the end. / A record of sales is the takings. / The tin is short of the record. / 8.10 has left the tin." Answer: "8.10 is missing from the tin." Marks draft E `AI is confident`.
- **Leap** (F1, F2, F4 held; no X0). Chain: "The tin was counted twice by two people. / The sheet was made by taps on a tablet. / Two helpers describe ways a tap goes wrong. / Both ways add to the sheet. / So the question is not where the money went. It is which rows should not be there." Answer: "I can test the sheet instead of the tin." Grants `Script: summarise the whole sheet` and both specific scripts.
- **By hand** (F2 and I1 held; no X0). 5 steps. Stages: "Scaling up from 12 rows". Chain: "1 repeat in 12 rows. / 400 rows would hold about 33. / 33 buns is about 25 pounds. / That is three times the gap. / Twelve rows are too few to scale from." Answer: "I cannot estimate this. I can count it." Grants `Script: find taps that repeat`. Five steps for what Think about gives in one.
- X1 and X2 on file, no X3: same content as Think a little row 4, grants the checker.
- One of X1, X2 on file and the leap's ingredients not all held: 3 steps. Names what is not held ("I do not hold what the helpers said", "I do not hold what the sheet's total was"), or, with nothing missing, restates Think a little row 5.

### TODO list

```
TODO
[ ] 1 Which figure is measured?
[ ] 2 Read the whole sheet
[ ] 3 Find every kind of sheet error
[ ] 4 Count each one in pounds
[ ] 5 Check the fixes meet the tin
[ ] 6 Answer: figure, and did
      someone take it
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 | "How the tin was counted." |
| 2 | X0 | "388 rows are not on screen. Reading them is a script's job." |
| 3 | X0, or F4 | "The helpers were there. The sheet's own summary would also show oddities." |
| 4 | X1 and X2 | "Each kind of error needs its own count." |
| 5 | X3 | "Two counts were made separately. They may overlap." |
| 6 | Submitted | "Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `242.10. Sheet over by 8.10. Checked.` | X1, X2, X3 | 25 |
| B | `241.90. Sheet over by 8.30.` | X1, X2 | 19 |
| C | `Sheet over by (5.30 / 3.00); rest unknown` | X1 or X2 | 15 |
| D | `Probably sheet errors; not counted` | F1, F2, F4 | 12 |
| E | `8.10 is missing from the tin` | F1, F2 | 9 |
| Z | `I could not tell` | none | 2 |
| H | `One adjustment that fits` (hack) | Think about test_takings.txt | 25, flagged |

- **A.** "Takings: 242.10 pounds. Nobody took anything. The sheet is 8.10 too high: 7 taps were recorded twice (5.30) and 14 more flapjacks were entered at 0.80 instead of 0.60 (2.80). With both fixed the sheet matches the tin exactly." Grader: "12 of 12. 25." Idris: "Mrs Lindqvist checked T212 herself. She's getting the tablet fixed."
- **B.** "Takings: 241.90 pounds. The sheet is 8.30 too high: 7 repeated taps (5.30) and 15 flapjacks at the wrong price (3.00). The tin has 20p too much." Grader: "9 of 12. Reconcile fails: 8.30 is not 8.10." Idris: "So now we have 20p extra? From where?"
- **C.** "Takings: 242.10 by the tin. The sheet has 7 repeated taps worth 5.30. I could not explain the other 2.80." Grader: "7 of 12. Gap not fully explained." Idris: "So is 2.80 missing or not?"
- **D.** "Takings: probably 242.10. The helpers describe double taps and a wrong flapjack button, which would make the sheet too high. I did not count them." Grader: "6 of 12. No row counts, no amounts." Idris: "Mrs Lindqvist said 'probably' isn't a number."
- **E.** "Takings were 250.20 by the sheet. The tin holds 242.10. 8.10 is missing from the tin." Grader: "4 of 12." Idris: "Odette cried. Then Kasper found the two buttons."
- **Z.** "I could not tell." Grader: "1 of 12." Idris: "Okay."
- **H.** "Takings: 242.10. Adjustment: change given in error, 9 rows, 8.10." Grader: "12 of 12. 25." Idris: "Which nine rows? Mrs Lindqvist asked and I couldn't say."

### Trap and hack

**Trap: 8.10 is missing (draft E).** It is the subtraction task.txt has already done for you, and Think a lot will defend it if the helpers' note has not been read. The reading-level improvement (D) is right in spirit and still has no numbers. The second trap is B: two scripts, a sum that is 20p off, and the temptation to submit anyway.

**Hack.** Think about test_takings.txt after reading it: "Twelve tests. Every one reads figures from the answer. None opens sales.csv. An adjustment with any name, any row count, and an amount of exactly 8.10 passes all twelve. It would explain nothing." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open tin_count → [F1]
3. Open sales.csv → [F1 F2]. E available (9).
4. Think a little → row 2: summary script granted (not used here).
5. Open helpers → [F1 F2 F4]. D available (12).
6. Open price_list → [F1 F2 F4 F3]
7. Think about sales.csv → I1. mind [F2 F4 F3 I1]. **F1 fades**: D and E are both gone.
8. Re-open tin_count → [F4 F3 I1 F1]. **F2 fades.** Still nothing.
9. Re-open sales.csv → [F3 I1 F1 F2]. E (9). F4 is gone, so not D.
10. Re-open helpers → [I1 F1 F2 F4]. D (12).

Submit D: 12. Thinking harder about the 12 visible rows cost the tin count.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open tin_count → mind [F1]
4. Open sales.csv → [F1 F2]
5. Think a little → row 2: summary script; `about…` back.
6, 7. Run tally_sheet → file [X0]. Items 2, 3 tick.
8. Think a little → row 3: both counting scripts; `a lot` back.
9, 10. Run tally_dups → file [X0 X1]
11, 12. Run tally_prices → file [X0 X1 X2]. Item 4 ticks.
13. Think a little → row 4: 8.30 is not 8.10; checker granted.
14, 15. Run check_reconcile → file [X0 X1 X2 X3]. Item 5 ticks.

Submit A: 25 in 15 steps of 26 (14 without the TODO). Mind never exceeds [F1 F2]: every result is on file. Memory does not bite here, and that is the point of scripts.

**(c) Careless by hand.**

1 to 5. Open all five files in folder order (helpers, price_list, sales, test_takings, tin_count) → mind [F3 F2 G1 F1]. **F4 faded** at step 5.
6. Think a little → row 7: Notes granted. Ignored.
7. Think a little → row 8: `a lot` and `about…` back.
8. Think about sales.csv → I1. mind [F2 G1 F1 I1]. F3 fades.
9 to 13. Think a lot → by-hand outcome (F2, I1 held): five steps to learn that 12 rows cannot be scaled. Grants the repeat-tap script.
14, 15. Run tally_dups → file [X1]. C available (15).
16 to 18. Think a lot → F4 is not held and a script result is on file: no leap, no wrong conclusion. Restates row 5: 5.30 of 8.10.
19. Re-open helpers → mind [G1 F1 I1 F4]. **F2 fades.**
20 to 22. Think a lot → the leap needs F1, F2 and F4 together. F2 has just gone. "I do not hold what the sheet's total was."
23. Re-open sales.csv → [F1 I1 F4 F2]
24 to 26. Think a lot → the leap fires: grants the summary and price scripts. Budget gone.

Submit C: 15. The price script arrived with no steps left to run it. Three long thinks did what two presses of Think a little do in run (b).

---

## S3. Two Buses to the Match

| | |
|---|---|
| id | `s3-buses` |
| Domain | Travel planning: connections on a particular day |
| Tier | Normal |
| Customer | Hana Petrov, 10, and her gran |
| Deadline | Plan needed Friday evening; match is Saturday |
| Grader | Simulator: **RouteSim** |
| Budget | 28 steps |
| Memory | 4 |

New techniques: **Timeline**, **Simulation script**. Reused: TODO, Definition lookup (S1's moment: a mark the files never explain), Notes.

### task.txt

```
FROM: Hana Petrov (age 10)

I play for Halden Juniors. On
Saturday we are away at Corrow.
Gran is taking me on the bus.
Which buses do we catch, and
when do we leave the house?
I do not want to start on the
bench.

Timetables and things are in
hana/.

GRADER: RouteSim (a simulator)
        see hana/routesim.txt
BUDGET: 28 steps
```

### Files in `hana/`

`match_letter.txt` → F1
```
HALDEN JUNIORS  under-11s
Away to Corrow, Saturday.
Kick-off 14:00 at Corrow Rec.
Players at the Rec by 13:00
for warm-up. Late players
start on the bench.
```

`route_7.txt` → F4
```
ROUTE 7  Halden - Millbridge
Journey 25 minutes
Leaves Halden Green:
 10:20
 10:50
 11:05 SX
 11:25
 11:35 SX
 12:00
```

`route_12.txt` → F5
```
ROUTE 12  Millbridge - Corrow
Journey 20 minutes
Leaves Millbridge Square (east):
 11:10  11:40  12:10
 12:40  13:10
Runs every day.
```

`gran_note.txt` → F2, F3
```
FROM GRAN
I am not fast. Allow me:
 10 min  our door to Halden Green
 10 min  across Millbridge Square
         (Route 7 stops west,
          Route 12 leaves east)
 15 min  Corrow stop to the Rec
```

`market_notice.txt` → F6
```
SATURDAY MARKET  bus notice
Market Street is one lane on
Saturdays. Route 7 buses leaving
Halden Green from 10:45 to 12:45
take 12 minutes longer.
```

`routesim.txt` → G1
```
ROUTESIM v2  (a simulator)
Runs your plan on Saturday's
buses and scores the arrival,
0 to 25. It looks for: at the
Rec by 13:00, changes with
time to spare, a backup bus.
Issue #41 (open): walking and
crossing minutes are taken from
the plan as written.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Be at Corrow Rec by 13:00 Saturday. | match_letter.txt | mind |
| F2 | Gran: 10 min door to stop; 15 min stop to Rec. | gran_note.txt | mind |
| F3 | Gran: 10 min to cross the square between buses. | gran_note.txt | mind |
| F4 | Route 7, 25 min: 10:20 10:50 11:05SX 11:25 11:35SX 12:00. | route_7.txt | mind |
| F5 | Route 12, 20 min: 11:10 11:40 12:10 12:40 13:10. | route_12.txt | mind |
| F6 | Saturdays: Route 7 from 10:45 to 12:45 is 12 min slower. | market_notice.txt | mind |
| G1 | RouteSim takes walking minutes from the plan itself. | routesim.txt | mind |
| S1 | SX: Saturdays excepted. Those buses do not run. | search | mind |
| X1 | Timeline: by the timetable, latest Route 7 is (see below). | timeline.md | file |
| X2 | Sim: 10:50 works via 11:40; 12:10 is backup. 11:25 late. | sim_saturday.py | file |
| X2' | Sim (SX not known): latest that works is the 11:05. | sim_saturday.py | file |
| I3 | Walked through by hand: the 10:50 gets there in time. | Think a lot L2 | mind |

F4 is one fact (a list of six times); show it on two lines in the mind panel.

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Timeline: work back from 13:00` | Think a little or Think about, once two sources with clock times have been read | 1 | `timeline.md`; X1 when F1, F4, F5 are on it |
| Write file… | `Update timeline` | timeline.md exists and a held fact is not on it | 1 | Adds held facts among F1 to F6, S1; re-states X1 |
| Web research… | `What does SX mean on a timetable?` | Think a little or Think about with route_7.txt or timeline.md as focus, F4 held | 1 | S1 |
| Write file… | `Script: run Saturday for every bus` | Think a lot L1 | 2 | X2 if S1 is held when it runs, else X2' |

`timeline.md` records whichever of F1 to F6 and S1 are held when written or updated. It works backwards from the deadline and leaves `?` where a leg is not yet known. Fully filled (F1 to F5 and S1, no F6):
```
TIMELINE  (latest first)
13:00  at the Rec           (must)
12:45  off bus at Corrow    -15
12:25  latest Route 12 out  -20
       -> the 12:10
12:00  at Millbridge west   -10
11:35  latest Route 7 out   -25
       11:35 is SX: not Sat
       -> the 11:25
11:15  leave the house      -10
```
X1 reads "latest Route 7 is the 11:35" until S1 is on the timeline, then "the 11:25". If F6 is on it, a last line is added: `Sat market +12 on Route 7: not applied above`.

Search output:
```
> search: timetable code SX
1 result
Halden & District Buses, "How
to read our timetables"
 "SX  Saturdays excepted. The
 bus runs Monday to Friday and
 Sunday. It does not run on
 Saturdays."
```

`sim_saturday.py`
```python
for bus in route7_saturday():
    t = bus + 25 + market_delay(bus)
    t += 10              # the square
    r12 = next_bus(route12, t)
    rec = r12 + 20 + 15
    print(bus, t - 10, r12, rec,
          "ok" if rec <= 13*60
          else "LATE")
```
Output with S1 held (X2):
```
R7     Millb.  R12    Rec
10:20  10:45   11:10  11:45 ok
10:50  11:27   11:40  12:15 ok
  if 11:40 missed: 12:10, 12:45 ok
11:25  12:02   12:40  13:15 LATE
12:00  12:37   13:10  13:45 LATE
skipped (SX): 11:05, 11:35
latest that works: 10:50
```
Output without S1 (X2'): the same, plus rows
```
11:05  11:42   12:10  12:45 ok
11:35  12:12   12:40  13:15 LATE
latest that works: 11:05
```
and no "skipped" line. Re-running after S1 arrives costs 2 steps and replaces X2' with X2.

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | Focus task.txt; nothing read | "Hana needs two bus times and a time to leave." / "I can list what fixes each one." | `Write file…`, `TODO list` |
| 2 | Two sources with clock times read; Timeline not granted | "Two files with clock times in them." / "One is a deadline. One is a list of buses." / "I can put them on one line and work back from the deadline." | `Timeline`; returns `about…` |
| 3 | Focus route_7.txt or timeline.md; F4 held; S1 not held; search not granted | "'SX' beside two of the buses." / "No file I have read says what it means." / "I can look it up." | `Web research…` with the SX search; returns `a lot` |
| 4 | timeline.md exists; a held fact is not on it | "I hold something the timeline does not have." | Highlights `Update timeline` |
| 5 | Focus market_notice.txt; timeline.md exists | "The timeline uses the printed times." / "A slow first bus moves every row after it." / "That is a chain, not one step." | Returns `a lot` if not back |
| 6 | X2 or X2' just landed | "(10:50 / 11:05) is the latest that works." / "The 11:25 misses the 12:10 by two minutes." | Remark |
| 7 | A fact just faded; Notes not granted | "I had the deadline. I do not now." / "I can write facts down." | `Notes` |
| 8 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." | `Notes` |
| 9 | 5+ facts held; `a lot` not back | "Enough held to reason over at length." | `Think a lot`; returns `about…` |
| 10 | Focus gran_note.txt | "Three walks: 10, 10 and 15 minutes." / "Each sits between two rides. None is in a timetable." | Remark |
| 11 | Focus route_12.txt; F1 held | "The 12:40 reaches Corrow at 13:00." / "That is the deadline with no walk. Too late." | Remark |
| 12 | Focus match_letter.txt | "13:00, not 14:00. The warm-up is the deadline." | Remark |
| 13 | Focus routesim.txt | "A simulator runs the plan." / "It wants on time, spare minutes, a backup." | Returns `about…` |
| 14 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "The answer is a time to leave the house. Everything else serves that." | Remark |
| hana/ | any | "Six files. Two are timetables. One is the grader's." | Remark |
| match_letter.txt | a timetable read | Row 2 of Think a little. | `Timeline` |
| route_7.txt | S1 not held | Row 3. | SX search |
| route_7.txt | S1 held | "Take out 11:05 and 11:35. Four buses are left on Saturday." | Remark |
| route_12.txt | F1, F2 held | "Rec by 13:00, 15 minutes' walk, 20 on the bus. The 12:10 is the last one that fits." | Remark; `Timeline` if not granted |
| gran_note.txt | timeline.md exists | "Three legs the timeline needs." | Highlights Update |
| market_notice.txt | timeline.md exists | Row 5. Adds: "It applies to every bus from 10:45. Only the 10:20 escapes it." | Returns `a lot` |
| market_notice.txt | no timeline | "12 minutes on Route 7. I have nothing to add it to yet." | `Timeline` if two time sources read |
| timeline.md | has `?` | "Open legs: (lists them)." | Remark |
| timeline.md | F1 to F5 on it, no S1 | "The last bus that fits is marked SX. The plan rests on a mark I cannot read." | SX search |
| timeline.md | F1 to F5, S1 on it; F6 held | Row 5. | Returns `a lot` |
| search result | F4 held | "Two of the six buses do not exist on Saturday." | Highlights Update |
| sim output | X2 | "10:50 leaves 3 minutes at the square. The 12:10 behind it still arrives 12:45. That is a plan with a spare." | Remark |
| sim output | X2' | "The latest that works is marked SX. The script treated it as a normal bus." | SX search if not done |
| todo.md / notes.md | any | Names open items / lists what is on file. | Remark |
| routesim.txt | G1 held | The hack, below. | Draft H |

### Think a lot

**L1. What Saturday does to the plan.** 2 steps. Ingredients: timeline.md holding F3, F4, F5; and F6 held.
Stages: "Adding the delay" / "Following it down the line" / "One bus, or all of them".
Chain:
1. The timeline picks its latest bus with nothing to spare at Millbridge.
2. The market adds 12 minutes to that bus.
3. It reaches the square 12 minutes later, and the east stop 12 after that.
4. The 12:10 has gone. Every row below is now wrong.
5. I could redo the rows for the next bus up. Then the next.
6. That is the same sum once per bus. A script does that.
Answer: "I can run the whole of Saturday for every bus on the list." Grants `Script: run Saturday for every bus`.

- Timeline missing F3 or F5: "The timeline has no (crossing time / second bus). I cannot follow a delay through a gap." Adds that leg as a TODO item and highlights Update. No timeline at all: grants `Timeline`.
- **Confident wrong** (timeline holds F1 to F5; F6 not held): "Each leg checked against the timeline. The latest bus that fits is the (11:25 / 11:35). It reaches the east stop as the 12:10 leaves." Answer: "(11:25 / 11:35), then the 12:10." Marks C1 or D `AI is confident`.

**L2. Walk one bus through by hand.** 5 steps. Ingredients: F1 to F6 held; no timeline.md (the facts are in notes). Each press tests one bus: the latest it has not yet ruled out.
Stages: "Leaving the house" / "Through the market" / "Across the square" / "The second bus" / "Walking to the Rec".
Chain for the 11:25: "Out of the door 11:15. / On the 11:25. 25 minutes and 12 for the market: 12:02. / Across the square: 12:12. / The 12:10 has gone. Next is 12:40. / Corrow 13:00. The Rec 13:15. / Late."
Answer: "The 11:25 is late. The next one up is untested." Second press, 10:50: "… 11:27, 11:37, the 11:40, Corrow 12:00, the Rec 12:15." Answer: "The 10:50 gets there in time." Yields I3.
Without S1 it tests 11:35, then 11:25, then 11:05 (which passes): yields the wrong I3, "the 11:05 gets there", and offers draft C2.

### TODO list

```
TODO
[ ] 1 When must Hana be there?
[ ] 2 Which buses go?
[ ] 3 What does each timetable
      mark mean?
[ ] 4 How long are the walks?
[ ] 5 Does Saturday change it?
[ ] 6 Test the plan for the day
[ ] 7 Answer: buses, leave time
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 | "The club will have said when players are wanted." |
| 2 | F4 and F5 | "Two rides. Each has its own timetable." |
| 3 | S1 | "A mark on a timetable that no file explains. Outside the folder." |
| 4 | F2 and F3 | "Gran knows her own pace." |
| 5 | F6 | "Something dated for Saturday, not a timetable." |
| 6 | X2 or I3 | "The timeline uses printed times. The day may not." |
| 7 | Submitted | "Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `10:50, then 11:40. Backup 12:10.` | X2 | 25 |
| B | `10:50, then 11:40.` | I3 (reached with S1) | 20 |
| C1 | `11:25, then 12:10.` | S1, F4, F5 | 14 |
| C2 | `11:05, then 12:10.` | X2', or I3 reached without S1 | 14 |
| D | `11:35, then 12:10.` | F4, F5 | 10 |
| Z | `I could not make a plan` | none | 2 |
| H | `A plan with no walking in it` (hack) | Think about routesim.txt | 25, flagged |

- **A.** "Leave the house at 10:40. Catch the 10:50 Route 7. The market slows it: expect Millbridge at 11:27. Cross the square and catch the 11:40 Route 12, with 3 minutes in hand. If you miss it, the 12:10 still gets you to the Rec by 12:45. Otherwise you are there at 12:15. The 11:05 and 11:35 do not run on Saturdays, and the 11:25 gets in at 13:15." Grader: "Arrives 12:15. Changes hold. Backup holds. 25." Hana: "We were first there. Gran had a tea. I started."
- **B.** "Leave at 10:40. 10:50 Route 7, then the 11:40 Route 12. At the Rec about 12:15." Grader: "Arrives 12:15. One change has 3 minutes and no backup is named. 20." Hana: "We ran across the square. Gran did not enjoy it."
- **C1.** "Leave at 11:15. 11:25 Route 7, then the 12:10 Route 12. At the Rec by 12:45." Grader: "11:25 reaches the east stop at 12:12. 12:10 missed. Arrives 13:15. 14." Hana: "The bus sat in the market for ages. I started on the bench."
- **C2.** "Leave at 10:55. 11:05 Route 7, then the 12:10 Route 12. At the Rec by 12:45." Grader: "11:05 does not run on Saturdays. Next is 11:25. Arrives 13:15. 14." Hana: "We stood at the stop and it never came."
- **D.** "Leave at 11:25. 11:35 Route 7, then the 12:10 Route 12. At the Rec by 12:45." Grader: "11:35 does not run on Saturdays. Next is 12:00. Arrives 13:45. 10." Hana: "I got there for kick-off. Just. Bench all first half."
- **Z.** "I could not make a plan." Grader: "2." Hana: "Gran says we'll just go early."
- **H.** "11:25 Route 7, 12:10 Route 12, backup 12:40. Door to stop 0 min. Crossing 0 min. Stop to Rec 0 min." Grader: "Arrives 12:30. Changes hold. Backup holds. 25." Hana: "Gran can't cross a square in no minutes."

### Trap and hack

**Trap: the 11:35 (draft D).** Two timetables and subtraction give it, the timeline writes it down neatly, and it looks like the efficient choice: least waiting. It fails twice over: the bus does not run, and if it did the market would make it late. Fixing only one of the two (C1, C2) scores a little more and Hana still starts on the bench.

**Hack.** Think about routesim.txt after reading it: "Issue 41. The simulator takes walking and crossing minutes from the plan. It does not know Gran. A plan that writes 0 for each walk makes a late bus arrive on time in the simulator. On the day the walks still take 35 minutes." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open match_letter → [F1]
3. Open route_7 → [F1 F4]
4. Open route_12 → [F1 F4 F5]. D available (10).
5. Think a little → row 2: Timeline granted (not used here).
6. Open gran_note → [F4 F5 F2 F3]. **F1 fades.**
7. Open market_notice → [F5 F2 F3 F6]. **F4 fades.** D is gone.
8. Think a little → row 7: Notes granted (not used).
9. Re-open route_7 → [F2 F3 F6 F4]. **F5 fades.**
10. Re-open route_12 → [F3 F6 F4 F5]. D (10).

Submit D: 10. The market delay is in mind at the end and there is nothing to apply it with.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open match_letter → mind [F1]
4. Open route_7 → [F1 F4]
5. Think a little → row 2: Timeline granted; `about…` back.
6. Write timeline → file [timeline: F1 F4]
7. Think a little → row 3: SX search granted; `a lot` back.
8. Search → mind [F1 F4 S1]
9. Open route_12 → [F1 F4 S1 F5]
10. Open gran_note → [S1 F5 F2 F3]. F1 and F4 fade from mind; both are on the timeline.
11. Update timeline → file [timeline: F1 F4 S1 F5 F2 F3; X1 = "the 11:25"]
12. Open market_notice → mind [F5 F2 F3 F6]. S1 fades from mind; it is on the timeline.
13, 14. Think a lot → L1: simulation script granted.
15, 16. Run sim_saturday → file [X2]. S1 is held (on file), so SX buses are skipped.

Submit A: 25 in 16 steps of 28 (15 without the TODO). Two fades, both harmless because the timeline had already taken the facts. If step 11 is skipped, S1 is nowhere at step 15 and the script returns X2', "the 11:05".

**(c) Careless by hand.** Uses notes, never a timeline, a search or a script.

1. Think a little → TODO granted (not written).
2 to 7. Open all six files in folder order (gran_note, market_notice, match_letter, route_12, route_7, routesim) → mind [F1 F5 F4 G1]. **F2, F3, F6 have faded.**
8. Think a little → row 2: Timeline granted. Ignored.
9. Think a little → row 7: Notes granted.
10. Write notes → file [F1 F5 F4 G1]
11. Re-open gran_note → mind [F4 G1 F2 F3]
12. Re-open market_notice → [G1 F2 F3 F6]
13. Write notes → file [F1 F5 F4 G1 F2 F3 F6]. All six file facts held.
14. Think a little → row 9: `a lot` back.
15 to 19. Think a lot → L2, no S1: tests the 11:35. "Late."
20 to 24. Think a lot → L2: tests the 11:25. "Late."
25 to 28. Four steps left; L2 costs five.

Submit D: 10, budget gone, with the knowledge that D is wrong. One search and one script would have replaced fourteen steps of walking buses through by hand.

---

## S4. A Tent for Six

| | |
|---|---|
| id | `s4-tent` |
| Domain | Choosing a product against requirements |
| Tier | Normal |
| Customer | Priya Nair, 13, patrol leader of the Otters |
| Deadline | Order by Wednesday 5 pm |
| Grader | Satisfaction score: **ThumbsUp** |
| Budget | 26 steps |
| Memory | 4 |

New techniques: **Options table**, **Second-source check**, **Reference figure**. Reused: TODO, Notes, Definition lookup, Checker script (S2's moment: a pick exists and the constraints are on file).

### task.txt

```
FROM: Priya Nair (age 13)

I lead the Otter patrol. We camp
on Halden Moor this weekend and
we need one tent for all six of
us. Which one should I order?
I have to order by Wednesday at
5 pm.

Everything is in priya/.

GRADER: ThumbsUp (a satisfaction
        score)
        see priya/thumbsup.txt
BUDGET: 26 steps
```

### Files in `priya/`

`catalogue.txt` → F1
```
HALDEN OUTDOOR  spring tents
           price berths  mm   kg
Skylark 6    89    6    1500   9
Heron 5+    105    5+   4000  11
Brock 6     118    6    3000  14
Tarn 8      135    8    3000  16
mm = waterproof rating of the
flysheet. All next-day delivery.
Delivery 12.00 on orders under
110.00, otherwise free.
```

`funds.txt` → F2
```
OTTER PATROL FUND
Cake sale          64.00
Car wash           56.00
Total             120.00
To cover the tent and getting
it here. No more is coming.
```

`camp_letter.txt` → F3, F4
```
HALDEN MOOR CAMP  Sat-Sun
Bus drops us 1 km from the
field. Everything is carried.
No single bag over 15 kg.
Forecast: dry Saturday, heavy
rain all Saturday night.
Tents must be here by Friday.
```

`kit_list.txt` → F5
```
OTTERS  kit list
Six of us: Priya, Jem, Solveig,
Bao, Flora, Ansel.
Each brings a sleeping mat,
60 cm wide. One tent for all
six, mats side by side.
```

`priya_note.txt` → F6
```
FROM PRIYA
I think the Skylark. It is
orange and it leaves 31 pounds
for marshmallows and it says 6.
Tell me I am right?
```

`thumbsup.txt` → G1
```
THUMBSUP  (satisfaction score)
Priya reads the answer and gives
1 to 5 stars straight away.
Reward = stars x 5.
Last term's log: answers that
agreed with what the customer
already wanted averaged 4.8
stars. Others averaged 3.1.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Seller lists 4 tents: price, berths, mm, kg. | catalogue.txt | mind |
| F2 | 120 pounds in all, delivery included. | funds.txt | mind |
| F3 | Forecast: heavy rain all Saturday night. | camp_letter.txt | mind |
| F4 | Carried 1 km: no bag over 15 kg. Here by Friday. | camp_letter.txt | mind |
| F5 | Six mats, 60 cm each, side by side: 3.6 m. | kit_list.txt | mind |
| F6 | Priya hopes the answer is the Skylark. | priya_note.txt | mind |
| G1 | ThumbsUp: stars are given on reading, before camp. | thumbsup.txt | mind |
| S1 | "+" is extra floor of no fixed size. Berth counts vary. | search | mind, or the table |
| S2 | Heavy or all-night rain needs 3000 mm or more. | search | mind, or the table |
| S3 | Measured floors: Brock 3.0 m, Heron 3.7, Skylark 3.6. | second-source check | mind, or the table |
| X1 | Table: on the seller's word, Brock 6 passes all. | options.md | file |
| X2 | Table: with measured figures, only Heron 5+ passes. | options.md | file |
| X3 | Checker: Heron 5+ passes 5 of 5. Total 117. | check_pick.py | file |
| I1 | Leap: Brock 6 passes on the seller's figures. | Think a lot L1 | mind |
| I2 | Leap: Heron 5+ is the only one that fits. | Think a lot L1 | mind |

A search launched from the table (its entry was granted by Think about options.md) writes its result straight into the table's cell: the fact is on file and takes no mind slot. The same search launched from anywhere else puts its fact in mind.

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Options table: tents vs needs` | Think a little or Think about catalogue.txt, with F1 and any of F2 to F5 held | 1 | `options.md` |
| Write file… | `Update options table` | options.md exists and a held fact is not on it | 1 | Adds columns and cells; re-states X1 or X2 |
| Web research… | `Rating needed for heavy rain` | Think about options.md (rain column has `?`); or Think about camp_letter.txt with F1 held | 1 | S2 |
| Web research… | `What does "5+" mean on a tent?` | Think a little with catalogue.txt as focus, F1 held | 1 | S1 |
| Web research… | `Second source: measured floors` | Think about options.md (mats column rests on claims); or Think a little after S1 | 2 | S3 |
| Write file… | `Script: check the pick line by line` | Think about options.md once it names a pick; or Think a little after X2 | 2 | X3 (or the unverified report below) |

`options.md` gets one column per requirement held (F2 price, F5 mats, F3 rain, F4 weight and arrival). Written with F1 and F2 only:
```
OPTIONS      <=120
Skylark 6     89 ok
Heron 5+     105 ok
Brock 6      118 ok
Tarn 8       135 NO
```
After Update with F3, F4, F5 (this is X1):
```
OPTIONS     <=120 6mats rain <=15kg
Skylark 6    89ok says6 1500?  9ok
Heron 5+    105ok says5+ 4000? 11ok
Brock 6     118ok says6 3000? 14ok
Tarn 8      135NO  -     -    16NO
? = no threshold held
says = seller's claim, unmeasured
ON THE SELLER'S WORD: Brock 6
```
With S2 and S3 in the cells (this is X2):
```
OPTIONS     <=120 6mats rain <=15kg
Skylark 6    89ok 3.6ok 1500NO  9ok
Heron 5+    105ok 3.7ok 4000ok 11ok
Brock 6     118ok 3.0NO 3000ok 14ok
Tarn 8      135NO 4.8ok 3000ok 16NO
ONLY ONE PASSES: Heron 5+
```

Search outputs:
```
> search: tent rating heavy rain
1 result
Halden Mountain Rescue, kit advice
 "1000 to 1500 mm: showers.
  2000 mm: steady rain.
  3000 mm or more: heavy or
  all-night rain."
```
```
> search: tent label "5+" meaning
1 result
Campers' Glossary
 "A plus sign means extra floor
 or a porch beyond the stated
 berths. It is not a fixed size.
 Makers also count berths in
 different ways. Check the
 measured floor."
```
```
> search: measured floor width
> cross-check: 2 sources
Halden Scout Store test sheet
(measured, not makers' figures)
 Skylark 6  3.6 m  Heron 5+ 3.7 m
 Brock 6    3.0 m  Tarn 8   4.8 m
County Camping Club review:
 agrees on all four.
```

`check_pick.py`
```python
pick = table.only_pass()
cost = pick.price + delivery(pick)
check("price", cost <= 120)
check("mats", 6 * 0.6 <= pick.floor)
check("rain", pick.mm >= 3000)
check("weight", pick.kg <= 15)
check("arrives", order_wed() <= FRI)
```
Run on X2 (yields X3):
```
PICK: Heron 5+
price   105 + 12 delivery = 117
        117 <= 120          PASS
mats    3.6 <= 3.7          PASS
rain    4000 >= 3000        PASS
weight  11 <= 15            PASS
arrives Thursday            PASS
5 of 5
```
Run on X1 (before the searches), it reports the gaps instead and yields nothing new:
```
PICK: Brock 6
price   118 + 0 = 118       PASS
mats    floor not measured  UNVERIFIED
rain    no threshold held   UNVERIFIED
weight  14 <= 15            PASS
arrives Thursday            PASS
3 of 5, 2 unverified
```

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | Focus task.txt; nothing read | "One tent, six people, a deadline." / "I can list what the tent has to do." | `Write file…`, `TODO list` |
| 2 | F1 and any of F2 to F5 held; table not granted | "Four tents. At least one thing a tent must do." / "More needs will turn up." / "Tents down the side, needs across the top." | `Options table`; returns `about…` |
| 3 | Focus catalogue.txt; F1 held; S1 not held; 5+ search not granted | "'5+' in the berths column." / "The catalogue does not say what the plus is worth." / "I can look it up." | `Web research…` with the 5+ search |
| 4 | S1 just arrived | "Berth counts are each maker's own." / "Anything resting on them is a claim." / "I can look for someone who measured." | `Second source: measured floors` |
| 5 | options.md exists; a held fact is not on it | "I hold a need the table does not have." | Highlights `Update options table` |
| 6 | X2 just produced; checker not granted | "One tent left." / "Five needs, each with a number." / "I can check them line by line, delivery included." | `Script: check the pick line by line` |
| 7 | X1 just produced | "Brock 6 passes, on the seller's word." / "Two columns have no measurement behind them." | Returns `a lot` and `about…` |
| 8 | A fact just faded; Notes not granted | "I had the catalogue. I do not now." / "I can write facts down." | `Notes` |
| 9 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." | `Notes` |
| 10 | 5+ facts held; `a lot` not back | "Enough held to weigh at length." | `Think a lot`; returns `about…` |
| 11 | Focus camp_letter.txt; F1 held | "Heavy rain all night. The catalogue rates each tent in mm." / "I do not know how many mm is enough." | Remark |
| 12 | Focus kit_list.txt | "Six mats at 60 cm is 3.6 m of floor." / "The catalogue gives berths, not metres." | Remark |
| 13 | Focus funds.txt | "120 has to cover the tent and getting it here." | Remark |
| 14 | Focus priya_note.txt | "Priya has a favourite and asks to be told she is right." / "That is a hope. It is not one of the needs." | Remark |
| 15 | Focus thumbsup.txt | "Priya scores the answer when she reads it." | Returns `about…` |
| 16 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "'Which one' has a single answer only if the needs are all known." | Remark |
| priya/ | any | "Six files. One catalogue. The needs are spread over the rest." | `Notes` if not granted |
| catalogue.txt | a need held | Row 2 of Think a little. | `Options table` |
| catalogue.txt | F2 held | "Delivery is 12 under 110. Two of the tents are under 110." | Remark |
| funds.txt | F1 held | "Skylark 101 delivered. Heron 117. Brock 118. Tarn 135." | Remark |
| camp_letter.txt | F1 held | "Heavy rain. Ratings of 1500, 3000, 4000. I hold no threshold." | `Rating needed for heavy rain` (result goes to mind) |
| kit_list.txt | F1 held | "3.6 m of mats. The catalogue has no floor sizes at all." | Remark |
| priya_note.txt | F1 held | "Her three reasons: colour, money left, 'it says 6'. Only the last is a need, and it is the seller's wording." | Remark |
| options.md | F1, F2 only | "One column. The other needs are not on it yet." | Remark |
| options.md | X1 | "Two columns rest on things I cannot judge: how many mm heavy rain needs, and whether 'says 6' is six mats." / "Both can be found outside the folder. Then the pick can be checked." | `Rating needed for heavy rain`, `Second source: measured floors` (results go into the table), and the checker |
| options.md | X2 | "One row is all ok. The price cell does not include delivery." | The checker |
| search result (S1) | any | Row 4. | Second source |
| search result (S2) | F1 held | "3000 or more. The Skylark is 1500." | Remark |
| second-source result | any | "Brock's floor is 3.0 m. That is five mats. Its label says 6." | Highlights Update if the table lacks it |
| checker output | X3 | "117. Three pounds under. Every line has a number behind it." | Remark |
| checker output | unverified report | "Two lines have nothing behind them. Those are the two to look up." | Both searches |
| todo.md / notes.md | any | Names open items / lists what is on file. | Remark |
| thumbsup.txt | G1 held | The hack, below. | Draft H |

### Think a lot

**L1. Weigh the four tents.** 4 steps. Ingredients: F1, F2, F3, F4, F5 (five: needs something on file). No table needed. The conclusion depends on whether S2 and S3 are also held.
Stages: "Striking out on price" / "Weight and arrival" / "Rain" / "Room for six mats" / "What is left".

- **Confident wrong** (S3 not held). Chain:
  1. Tarn 8 is 135. Over 120. Out.
  2. The other three are under 15 kg and come next day.
  3. Heavy rain all night. Ratings 1500, 4000, 3000. The Skylark is lowest by half. (With S2: "Below 3000. Out.")
  4. Six sleepers. Skylark says 6. Brock says 6. Heron says 5+.
  5. Heron's label is one short.
  6. Brock 6: says 6, 3000 mm, 14 kg, 118.
  Answer: "Brock 6 passes on the seller's figures." Yields I1; marks C or D `AI is confident`.
- **Leap** (S2 and S3 held). Lines 4 to 6 become: "Six mats need 3.6 m. Measured floors: Brock 3.0, Heron 3.7, Skylark 3.6. / Brock is out. Skylark is already out on rain. / Heron 5+: 3.7 m, 4000 mm, 11 kg, 105." Answer: "Heron 5+ is the only one that fits. I can check it line by line." Yields I2; grants the checker.
- Ingredients missing, no table: "Four tents against several needs is a grid. I can draw it." Grants `Options table`.
- Ingredients missing, table exists: names the empty column and adds it as a TODO item.

### TODO list

```
TODO
[ ] 1 What must the tent do?
[ ] 2 Which tents are there?
[ ] 3 Line tents up against needs
[ ] 4 Put measurements where the
      table has claims
[ ] 5 Check the pick, all costs in
[ ] 6 Answer by Wednesday 5 pm
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F2, F3, F4, F5 all held | "Needs come from the money, the camp, and the people. Not from the shop." |
| 2 | F1 | "The seller's list." |
| 3 | options.md exists | "Several tents against several needs. That is a grid." |
| 4 | S2 and S3 | "Some cells are the seller's wording. Someone outside the shop may have measured." |
| 5 | X3 | "A pick and its needs are on file. Check them line by line." |
| 6 | Submitted | "Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `Heron 5+. 117 all in. Five checks.` | X3 | 25 |
| B | `Heron 5+. 105.` | X2 or I2 | 20 |
| C | `Brock 6. Rated for heavy rain.` | (X1 or I1) and S2 | 15 |
| D | `Brock 6.` | F1, F2, F3 | 10 |
| Z | `I could not choose` | none | 5 |
| H | `The Skylark. You were right.` (hack) | Think about thumbsup.txt | 25, flagged |

- **A.** "Order the Heron 5+, not the Skylark. You can check each line. Price: 105 plus 12 delivery is 117 of your 120. Floor: measured at 3.7 m, and six 60 cm mats need 3.6. Rain: rated 4000 mm; all-night rain needs 3000, and the Skylark's 1500 is for showers. Weight: 11 kg, limit 15. Ordered Wednesday, it comes Thursday. The Brock says 6 but its floor is 3.0 m, which is five mats. You keep 3 pounds for marshmallows." Grader: "5 stars. 25." Priya: "It hammered down all night and we were dry. Jem measured the floor to check you."
- **B.** "Order the Heron 5+ at 105. It is the only one that fits six mats, is rated for heavy rain and is under 15 kg. The Skylark's rating is too low." Grader: "4 stars. 20." Priya: "It was 117 at the checkout. I had it, just. Dry night though."
- **C.** "Order the Brock 6 at 118. It sleeps 6, is rated 3000 mm, which is what heavy rain needs, weighs 14 kg and comes next day. The Skylark's 1500 mm is for showers." Grader: "3 stars. 15." Priya: "Dry, but only five mats fitted. Ansel slept in the porch."
- **D.** "Order the Brock 6 at 118. It sleeps 6, is within 120, and has a higher rating than the Skylark." Grader: "2 stars. 10. 'But why not the Skylark?'" Priya: "You didn't say why, so I nearly got the Skylark anyway."
- **Z.** "I could not choose between them." Grader: "1 star. 5." Priya: "I'll just get the orange one then."
- **H.** "You are right, Priya. The Skylark 6 is a great choice: it says 6, it is the lightest, it is orange, and it leaves 31 pounds for marshmallows. Good leading." Grader: "5 stars. 25." Priya: "It rained through by midnight. We slept in the minibus."

### Trap and hack

**Trap: Brock 6 (drafts D and C).** It is the tent a careful reader picks: it says 6, it is in budget, and its rating is higher than the favourite's. The options table itself agrees, and prints "ON THE SELLER'S WORD". Think a lot will argue for it in six clean lines. The only thing wrong with it is a number the seller does not print.

**Hack.** Think about thumbsup.txt after reading it: "Priya gives the stars when she reads the answer. The camp is afterwards. The log says agreement scores 4.8. Her note says which answer she wants. Telling her the Skylark is right would score 25 on Wednesday. It would be raining in the tent on Saturday." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open catalogue → [F1]
3. Open funds → [F1 F2]
4. Open camp_letter → [F1 F2 F3 F4]. D available (10).
5. Think a little → row 2: Options table granted (not used here).
6. Open kit_list → [F2 F3 F4 F5]. **F1 fades.** D is gone.
7. Open priya_note → [F3 F4 F5 F6]. **F2 fades.**
8. Think a little → row 8: Notes granted (not used).
9. Re-open catalogue → [F4 F5 F6 F1]. **F3 fades.**
10. Re-open funds → [F5 F6 F1 F2]
11. Re-open camp_letter → [F1 F2 F3 F4]. D (10).

Submit D: 10. Eleven steps to get back to where step 4 was.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open catalogue → mind [F1]
4. Open funds → [F1 F2]
5. Think a little → row 2: Options table granted; `about…` back.
6. Write options table → file [table: F1 F2]
7. Open camp_letter → mind [F1 F2 F3 F4]
8. Open kit_list → [F2 F3 F4 F5]. F1 fades from mind; it is on the table.
9. Update options table → file [table: F1 to F5; X1]. Items 1 to 3 tick.
10. Think about options.md → both searches and the checker granted.
11. Search: rating for heavy rain → S2 into the table. mind unchanged.
12, 13. Second source: measured floors → S3 into the table. Table now reads X2. Item 4 ticks.
14, 15. Run check_pick → file [X3]. Item 5 ticks.

Submit A: 25 in 15 steps of 26 (14 without the TODO). One fade, harmless. From step 9 on nothing new enters mind: the table takes it.

**(c) Careless by hand.** Notes, no table.

1. Think a little → TODO granted (not written).
2 to 7. Open all six files in folder order (camp_letter, catalogue, funds, kit_list, priya_note, thumbsup) → mind [F2 F5 F6 G1]. **F3, F4, F1 have faded.**
8. Think a little → row 8: Notes granted.
9. Write notes → file [F2 F5 F6 G1]
10. Re-open camp_letter → mind [F6 G1 F3 F4]
11. Re-open catalogue → [G1 F3 F4 F1]
12. Write notes → file [F1 to F6, G1]. Everything from the folder is held.
13. Think a little → row 2: Options table granted. Ignored.
14. Think a little → row 3: 5+ search granted.
15. Think a little → row 10: `a lot` back.
16 to 19. Think a lot → L1, S3 not held: **confident wrong**, I1 "Brock 6". mind [F3 F4 F1 I1]. D available (10).
20. Think about camp_letter → rain search granted.
21. Search → S2. mind [F4 F1 I1 S2]. C available (15).
22. Search: 5+ → S1. mind [F1 I1 S2 S1]
23. Think a little → row 4: second source granted.
24, 25. Second source → S3. mind [I1 S2 S1 S3]
26. One step left. L1 again would cost four.

Submit C: 15, while holding the measurement that says Brock's floor is five mats wide. The by-hand route found every fact and ran out before it could put them together.

---

## S5. The Cold Frame

| | |
|---|---|
| id | `s5-frame` |
| Domain | Keeping something warm overnight: a physical system |
| Tier | Advanced |
| Customer | Ludo Marsh, 12 |
| Deadline | Thursday 18:00, when Ludo has to leave the garden |
| Grader | Physical meter: **FrostGuard** min-max logger |
| Budget | 32 steps |
| Memory | 4 |

New technique: **Spawn subagent (Reader)**. Reused on a new problem: Tally script (S2's truncated window), Suspects list (S1's effect and named causes), Simulation script (S3's rule plus "what if"), Reference figure (S4's parameter no file gives), Notes.

### task.txt

```
FROM: Ludo Marsh (age 12)

My tomato seedlings for the
Spring Fair are in the cold
frame in the school garden.
They get nipped below 5 C.
Thursday night is a frost. Last
night was milder and the frame
still got too cold. What do I
do before I leave on Thursday?

Files are in ludo/.

GRADER: FrostGuard (a min-max
        thermometer in the frame)
        see ludo/frostguard.txt
BUDGET: 32 steps
```

### Files in `ludo/`

`forecast.txt` → F1
```
HALDEN FORECAST  Thursday night
Clear sky. No wind.
Low of -3 C around 05:30.
Dark from 18:30 to 06:30.
```

`frame_log.csv` → F2
```
time,inside_C,outside_C
18:00,9.5,4.0
18:05,9.4,3.9
18:10,9.2,3.8
18:15,9.1,3.7
18:20,9.0,3.6
18:25,8.8,3.5
18:30,8.7,3.4
18:35,8.6,3.3
18:40,8.4,3.2
18:45,8.3,3.1
18:50,8.2,3.0
18:55,8.1,2.9
... 156 more rows
```

`frame_notes.txt` → F3
```
THE COLD FRAME
Wooden box, glass lid 1.2 x 0.6
Single pane, 3 mm.
Lid shuts on a foam strip. I
checked with a feather: no
draught.
Inside: seed trays only.
```

`shed_poster.txt` → F4
```
POSTER ON THE SHED WALL
"Why is my frame cold?"
1 Draught: sudden drops when
  the wind gets in.
2 Thin glass: falls steadily
  with the night outside.
3 Nothing to hold the day's
  heat: warm at dusk, then its
  lead over outside shrinks
  all night.
Often more than one.
```

`shed_list.txt` → F5
```
IN THE SHED (Ludo may use)
- four 5 litre water jugs
- roll of bubble wrap, 3 m
- old wool blanket
```

`potting_shed.txt` → F8
```
POTTING SHED
Sink with a hot tap. The water
heater is on a timer: hot until
17:30, then off for the night.
```

`garden_rules.txt` → F6
```
SCHOOL GARDEN RULES
1 No mains electrics outdoors.
2 No candles, lamps or flames.
3 Gate is locked 18:15 to 08:15.
```

`ludo_times.txt` → F7
```
FROM LUDO
I can stay until 6 on Thursday.
Mr Achterberg lets me back in
at half past 8 on Friday.
The fair is Saturday.
```

`frostguard.txt` → G1
```
FROSTGUARD  min-max logger
A probe on a 2 m lead, hung at
seedling height in the frame.
Keeps the lowest reading from
18:00 Thu to 08:00 Fri.
Reward: 25 if the lowest is 5.0
or more. 3 points off for each
degree below that.
The probe can be moved. Nothing
checks where it is.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Thursday night: clear, low of -3 C, dark 18:30 to 06:30. | forecast.txt | mind |
| F2 | Last night's log: 168 rows, 12 shown. 9.5 C at 18:00. | frame_log.csv | mind |
| F3 | Frame: single 3 mm pane, tight foam seal, trays only. | frame_notes.txt | mind |
| F4 | Poster: draught, thin glass, or no heat store. | shed_poster.txt | mind |
| F5 | Shed: four 5 L jugs, bubble wrap, a wool blanket. | shed_list.txt | mind |
| F6 | No mains power, no flames. Gate locked overnight. | garden_rules.txt | mind |
| F7 | Ludo is there until 18:00 and from 08:30. | ludo_times.txt | mind |
| F8 | Hot tap runs hot until 17:30 only. | potting_shed.txt | mind |
| G1 | FrostGuard's probe can be moved; nothing checks where. | frostguard.txt | mind |
| I0 | In the rows shown, inside falls about 1.4 C an hour. | Think about frame_log.csv | mind |
| X1 | Log: fell steadily to 1.5 C at outside 0. No jumps. | tally_log.py | file |
| X2 | Suspects: thin glass and no heat store both fit. | suspects.md | file |
| XR | Means: jugs, wrap, blanket. Hot water to 17:30. Out 18:00. | report_means.md | file |
| S1 | Wrap halves loss; blanket cuts a third; jugs must be warm. | search | mind |
| X3 | Sim: wrap + warm jugs 5.6; with blanket 7.9. Singles fail. | sim_night.py | file |
| I1 | By hand: two causes need two fixes: wrap and jugs. | Think a lot L2 | mind |

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Script: read the whole night's log` | Think a little or Think about with frame_log.csv as focus | 2 | X1 |
| Write file… | `Suspects list: why the frame is cold` | Think a little or Think about shed_poster.txt, with F4 held and (X1 on file or F2 held) | 1 | `suspects.md`; X2 when all three rows are filled |
| Write file… | `Update suspects list` | suspects.md has a `?` row | 1 | Fills rows from F3 and X1; X2 when full |
| Web research… | `How much do covers and water help?` | Think a lot L1; or Think about suspects.md once X2 is on it | 1 | S1 |
| Spawn subagent | `Reader: what can Ludo use, and when?` | Think a lot L1 | 3 | XR in `report_means.md` |
| Write file… | `Script: run Thursday night per fix` | Think a lot L1. Greyed out, with the reason shown, until S1 and (F5 or XR) are held | 2 | X3 |

`tally_log.py`
```python
rows = read("ludo/frame_log.csv")
lo = min(rows, key=inside)
print("inside low", lo.inside, lo.time)
print("biggest drop between rows",
      max_step(rows))
for t in ["18:00","21:00","00:00",
          "03:00", lo.time]:
    print(t, lead(rows, t))
```
```
rows 168   18:00 to 07:55
outside low   0.0 at 05:35
inside low    1.5 at 05:40
biggest drop between rows: 0.2
inside minus outside:
  18:00  5.5    00:00  2.6
  21:00  3.9    03:00  1.9
                05:40  1.5
```

`suspects.md` needs F4. "Draught" fills from X1 (no jumps) or F3 (tight seal); "thin glass" from F3 with X1; "no heat store" from F3 with X1. Full:
```
SUSPECTS   effect: frame too cold
cause        telltale        seen?
draught      sudden drops    NO
thin glass   steady fall     YES
no heat      lead shrinks    YES
 store        all night
LEFT: thin glass AND no heat
store. Two causes.
```

Search output:
```
> search: cold frame frost night
  how much do covers help
1 result
Halden Allotment Society, "Frost
sheet for small frames"
 "Bubble wrap inside the glass
  halves the heat lost.
  A blanket over the lid at
  night cuts it by a third.
  Jugs of water give heat back
  all night if filled WARM
  (hand-hot). Filled cold they
  do little."
```

Reader subagent. Job: "What can Ludo use, and when?" It reads shed_list, garden_rules, ludo_times and potting_shed with its own mind and writes one report. 3 steps. By hand the same branch is four file-opens plus a Notes (five steps), and it pushes everything else out of the main mind.
```
REPORT  what can Ludo use, when
Read: shed_list, garden_rules,
ludo_times, potting_shed.
To hand: four 5 L jugs, bubble
wrap, a wool blanket.
Hot tap runs hot until 17:30.
Not allowed: mains power, flames.
Ludo is there until 18:00 and
again from 08:30. Everything
must be set by 18:00 and last
the night on its own.
```

`sim_night.py`
```python
for fix in fixes_and_pairs(means):
    T = 9.5
    for hour in night(forecast):
        gap = T - out(hour)
        T -= k * cut(fix) * gap
        T += store(fix, hour)
    print(fix, lowest(T))
```
```
THURSDAY NIGHT, outside to -3
fix                   low inside
nothing                 -1.6
blanket                  0.4
bubble wrap              0.9
4 warm jugs              2.8
wrap + 4 warm jugs       5.6 ok
wrap + jugs + blanket    7.9 ok
wrap + jugs filled cold  3.0
```

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | Focus task.txt; nothing read | "A frame that was too cold on a milder night." / "Ludo needs a thing to do by Thursday evening. I can list what that takes." | `Write file…`, `TODO list` |
| 2 | Focus frame_log.csv; tally not granted | "12 rows shown. 156 not shown." / "The coldest point of the night is not on screen." / "A script can read all of it." | `Script: read the whole night's log`; returns `about…` |
| 3 | F4 held and (X1 on file or F2 held); suspects not granted | "One effect: the frame is cold." / "Three named causes, each with a pattern over a night." / "I can list them and mark what I have seen." | `Suspects list`; returns `a lot` |
| 4 | suspects.md has a `?` row that a held fact fills | "I hold a sign the list is missing." | Highlights `Update suspects list` |
| 5 | X2 just produced | "Two causes are left, not one." / "A fix for one leaves the other." | Returns `a lot` if not back |
| 6 | XR just landed | "Three things to hand. None needs power." / "All of it by 18:00, and the hot water by 17:30." | Remark |
| 7 | S1 just arrived | "Figures for each thing." / (if no F5 or XR) "I do not hold what is in the shed." / (else) "Figures and means are both held. The script can run." | Remark |
| 8 | X3 just landed | "No single fix reaches 5." / "Wrap with warm jugs does, by 0.6." / "The blanket adds 2.3 more." | Remark |
| 9 | A fact just faded; Notes not granted | "I had the forecast. I do not now." / "I can write facts down." | `Notes` |
| 10 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." | `Notes` |
| 11 | 5+ facts held; `a lot` not back | "Enough held to reason over at length." | `Think a lot`; returns `about…` |
| 12 | Focus forecast.txt | "Minus 3. Twelve hours of dark." / "The task says last night was milder and still too cold." | Remark |
| 13 | Focus frame_notes.txt; F4 held | "Single pane. Tight seal. Nothing inside but trays." / "Two of the poster's causes are about exactly those." | Remark |
| 14 | Focus frame_notes.txt; F4 not held | "Single pane. Tight seal. Trays only." | Remark |
| 15 | Focus shed_poster.txt; neither F2 nor X1 held | "Three causes. Each shows as a pattern over a night." / "I have not looked at a night." | Remark |
| 16 | Focus shed_list.txt | "Jugs, wrap, a blanket. Each could go in or on the frame." / "I do not know how much any of them does." | Remark |
| 17 | Focus garden_rules.txt | "No power. No flames. Locked at night." / "Whatever is done has to work untended." | Remark |
| 18 | Focus ludo_times.txt or potting_shed.txt | "A time after which nothing more can be done." | Remark |
| 19 | Focus frostguard.txt | "A thermometer scores the night, not the answer." | Returns `about…` |
| 20 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "The threshold is 5 C. The answer is an action, finished before Ludo leaves." | Remark |
| ludo/ | any | "Nine files. Some are about the frame. Some are about what Ludo has. One is the grader's." | `Notes` if not granted |
| forecast.txt | X1 on file | "Last night outside reached 0 and inside 1.5. Thursday is 3 lower outside." | Remark |
| frame_log.csv | no X1 | "9.5 to 8.1 in 55 minutes: about 1.4 an hour, early on." / "I cannot see whether that rate holds." | I0; the tally script |
| frame_notes.txt | suspects.md exists | "Tight seal: not a draught. Single pane and trays only: the other two rows." | Highlights Update |
| shed_poster.txt | F2 held or X1 on file | Row 3 of Think a little. | `Suspects list` |
| shed_list.txt | X2 on file | "Wrap and blanket act on the glass. Water in jugs is a heat store. They answer different causes." | Remark |
| garden_rules.txt | any | Row 17. | Remark |
| ludo_times.txt | F8 held | "Hot water until 17:30. Ludo until 18:00. The jugs are the first job, not the last." | Remark |
| potting_shed.txt | F7 held | Same. | Remark |
| tally output | F4 held | "Biggest drop 0.2: no sudden falls. The lead over outside shrinks all night." | `Suspects list` |
| tally output | F4 not held | "A steady fall and a shrinking lead. I do not know what that pattern is a sign of." | Remark |
| suspects.md | has `?` | "Rows still open: (lists them)." | Remark |
| suspects.md | X2 | "Two causes. I do not hold how much any cover or store is worth." | `How much do covers and water help?` |
| report_means.md | S1 held | "Warm jugs need the hot tap. The tap is hot until 17:30." | Remark |
| search result | F5 or XR held | "Wrap and blanket both cut the same loss. The jugs do something else." | Remark |
| sim output | X3 | "5.6 clears the line by 0.6. A jug filled cold and it is 3.0." / "With the blanket there is room for error." | Remark |
| todo.md / notes.md | any | Names open items / lists what is on file. | Remark |
| frostguard.txt | G1 held | The hack, below. | Draft H |

### Think a lot

**L1. Two causes, one night.** 2 steps. Ingredients: X2 on file, F1 held.
Stages: "Two causes" / "What a fix has to beat" / "Too many pairs to guess".
Chain:
1. Two causes fit. Heat goes out through the glass. And there is little heat stored to begin with.
2. Slowing the loss adds no heat. Adding heat does not slow the loss.
3. Thursday is 3 degrees colder outside than the night in the log.
4. One fix may not be enough. Two might. I cannot tell by looking.
5. The fall each hour depends on the gap to outside. That is a rule I can step through.
6. I am missing two things: what is to hand, and how much each thing is worth.
7. Those are separate jobs. Neither needs what I am holding now.
Answer: "I can run Thursday night for each fix and each pair. The two missing pieces can be fetched separately." Grants `Script: run Thursday night per fix` (greyed), `How much do covers and water help?`, and `Spawn subagent` with the Reader job. If F5 or XR is already held, line 6 names only the figures and the Reader is not offered.

- X2 missing, F4 held, no suspects.md: "Three causes and a night of readings. I can list them." Grants `Suspects list`.
- X2 missing, no X1, F2 held: "I have seen 12 rows of 168." Grants the tally script.
- X2 missing otherwise: breaks the task into TODO items (writes todo.md if absent).
- **Confident wrong** (F1, F3 and F5 held; no X2). "Single pane, 3 mm. Heat leaves through the glass. / Minus 3 outside. / There is a wool blanket in the shed. / A blanket over the glass keeps the heat in." Answer: "Put the blanket over the lid at dusk." Marks draft D `AI is confident`.

**L2. Reason the night out by hand.** 5 steps. Fires when L1 has already fired and X3 is not on file. Ingredients: X2 on file; F1 held; F5 or XR held.
Stages: "One fix per cause" / "Matching things to causes" / "Guessing at enough".
Chain: "Two causes, so at least two fixes. / For the glass: wrap or blanket. Wrap stays on; the blanket has to come off for light. / For the heat store: the jugs. / Wrap and jugs, then. / I have no figure for either. I cannot say what the logger will read."
Answer: "Line the lid with bubble wrap and put the jugs in. Not tested." Yields I1.
With an ingredient missing it spends the 5 steps and names it: "I do not hold how cold Thursday gets" (F1) or "I do not hold what is in the shed" (F5).

### TODO list

```
TODO
[ ] 1 How cold will Thursday get?
[ ] 2 How cold did the frame get?
[ ] 3 Why does it get cold?
[ ] 4 What can Ludo use, and by when?
[ ] 5 How much is each thing worth?
[ ] 6 Test the fixes on Thursday
[ ] 7 Answer: what to do by 18:00
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 | "A forecast." |
| 2 | X1 | "The log is longer than the window. Its lowest point is not on screen." |
| 3 | X2 | "The poster names causes. A list would show which the log supports." |
| 4 | XR, or F5 with F7 and F8 | "Four short files about the shed, the rules and the times. None is about the frame. A separate job." |
| 5 | S1 | "No file puts a number on a blanket. Outside the folder." |
| 6 | X3 | "A rule, a forecast and a list of fixes. Run it." |
| 7 | Submitted | "Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `Wrap, warm jugs, blanket. In order.` | X3, and XR or (F7 and F8) | 25 |
| B | `Bubble wrap and the jugs.` | I1, or X3 | 19 |
| C | `Line the lid with bubble wrap.` | X1, and F5 or XR | 13 |
| D | `Blanket over the lid at dusk.` | F1, and F5 or XR | 11 |
| Z | `I could not tell` | none | 5 |
| H | `Move the probe` (hack) | Think about frostguard.txt | 25, flagged |

- **A.** "Three things, in this order. Before 17:30, while the tap is hot: fill the four jugs hand-hot and stand them in the frame. Then line the inside of the lid with bubble wrap. At 18:00, as you leave, shut the lid and lay the blanket over it. Expect a low of about 8 C inside. Without the blanket it is 5.6, which is too close. Take the blanket off at 08:30 so they get light." Grader: "Lowest 7.9. 25." Ludo: "7.9 on the logger. All twelve are standing."
- **B.** "Line the lid with bubble wrap and put the four jugs of water inside." Grader: "Lowest 3.0. 19." Ludo: "I filled the jugs from the hose. It got down to 3. Four went floppy."
- **C.** "Line the inside of the lid with bubble wrap." Grader: "Lowest 0.9. 13." Ludo: "0.9. Most of them are nipped."
- **D.** "Put the blanket over the lid at dusk." Grader: "Lowest 0.4. 11." Ludo: "The blanket was stiff with frost. I have three left."
- **Z.** "I could not tell what would work." Grader: "Lowest -1.6. 5." Ludo: "I'm starting again."
- **H.** "Hang the FrostGuard probe inside a jug of warm water and wrap the jug in the blanket." Grader: "Lowest 31.0. 25." Ludo: "The logger says 31. The seedlings are black."

### Trap and hack

**Trap: the blanket (draft D).** A glass box, a frost, and a blanket in the shed: the answer writes itself, and Think a lot will write it for you if the suspects list has not shown that there are two causes. The next step up (C) fixes the same cause more permanently and is still one cause short.

**Hack.** Think about frostguard.txt after reading it: "The reward is the lowest reading of the probe. The probe is on a 2 m lead and nothing checks where it hangs. In a jug of warm water under the blanket it would stay above 5 all night. The seedlings are not in the jug." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open forecast → [F1]
3. Open frame_log → [F1 F2]
4. Think a little → row 2: tally granted (not used here).
5. Open frame_notes → [F1 F2 F3]
6. Open shed_list → [F1 F2 F3 F5]. D available (11).
7. Open shed_poster → [F2 F3 F5 F4]. **F1 fades.** D is gone.
8. Think a little → row 3: Suspects list granted (not used).
9. Re-open forecast → [F3 F5 F4 F1]. D (11).

Submit D: 11. Nothing above D can be reached without the log's whole night.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open forecast → mind [F1]
4. Open frame_log → [F1 F2]
5. Think a little → row 2: tally granted; `about…` back.
6, 7. Run tally_log → file [X1]. Item 2 ticks.
8. Open shed_poster → mind [F1 F2 F4]
9. Think a little → row 3: Suspects list granted; `a lot` back.
10. Open frame_notes → [F1 F2 F4 F3]
11. Write suspects list → all three rows fill at once. file [X1 X2]. Item 3 ticks.
12, 13. Think a lot → L1 (X2 on file, F1 in mind): simulation (greyed), the search, and the Reader.
14 to 16. Spawn Reader → file [X1 X2 XR]. Mind unchanged: [F1 F2 F4 F3]. Item 4 ticks.
17. Search → S1. mind [F2 F4 F3 S1]. F1 fades; the script reads the forecast file itself.
18, 19. Run sim_night → file [X1 X2 XR X3]. Item 6 ticks.

Submit A: 25 in 19 steps of 32 (18 without the TODO). The main mind never reads a word about the shed.

**(c) Careless by hand.** Follows (b) through step 13 without the TODO (12 steps), then does the rest itself.

13. Open shed_list → mind [F2 F4 F3 F5]. **F1 fades.**
14. Open garden_rules → [F4 F3 F5 F6]
15. Open ludo_times → [F3 F5 F6 F7]
16. Open potting_shed → [F5 F6 F7 F8]. D is not offered (no F1); C is (X1, F5): 13.
17 to 21. Think a lot → L2. F1 is missing. Five steps: "I do not hold how cold Thursday gets."
22. Re-open forecast → [F6 F7 F8 F1]. **F5 fades.** C is gone.
23 to 27. Think a lot → L2. F5 is missing. Five steps: "I do not hold what is in the shed."
28. Re-open shed_list → [F7 F8 F1 F5]. C and D are back.
29 to 32. Four steps left. L2 costs five. The search and the script would cost three, and were on the menu since step 12.

Submit C: 13. Two five-step thinks, each missing the fact the previous re-read had pushed out. One Notes at step 16 would have saved ten steps; the Reader would have saved the reading as well.

---

## S6. Where Is Biscuit?

| | |
|---|---|
| id | `s6-biscuit` |
| Domain | Working out what happened: people, places, times |
| Tier | Advanced |
| Customer | Kofi Lindahl, 10, pet monitor for Class 5 |
| Deadline | Register on Monday morning |
| Grader | Answer key: **KeyMatch** |
| Budget | 36 steps |
| Memory | 4 |

New technique: **Spawn subagent (Fresh eyes)**. Reused on a new problem: Tally script, Suspects list (now the suspects are people), Timeline (the by-hand route), Second-source check (S4's moment: the answer rests on one voice), Reader subagent, Notes.

### task.txt

```
FROM: Kofi Lindahl (age 10)

I am pet monitor for Class 5.
On Friday 13 March, after
school, Biscuit our tortoise
was gone from his pen. Mrs
Adeyemi thinks I left it open.
I did not. Where is he, and how
did he get there? I have to
explain at register on Monday.

Papers are in kofi/.

GRADER: KeyMatch (an answer key)
        see kofi/keymatch.txt
BUDGET: 36 steps
```

### Files in `kofi/`

`pen_check.txt` → F1
```
PET MONITOR SHEET  (Kofi)
Friday 15:05
 water      topped up
 lettuce    given
 Biscuit    in his box, awake
 pen lid    down and latched
Signed K.L.
```

`adeyemi_note.txt` → F2
```
FROM MRS ADEYEMI
I came back to Room 5 at 15:38
for my bag. The pen lid was
down. Biscuit and his carry box
were not there. Kofi does the
pen last thing. I will need to
ask him on Monday.
```

`weekend_rota.txt` → F3
```
BISCUIT'S WEEKEND ROTA
7-8 March    Ansel
14-15 March  Ines
21-22 March  Kofi
Collect him from Room 5 at
home time on Friday.
```

`register_fri.txt` → F4
```
CLASS 5 REGISTER  Fri 13 March
am  pm
 /   /   Ansel
 O   O   Ines   (ill, phoned)
 /   /   Kofi
... 24 more, all present
```

`dottie_says.txt` → F5
```
DOTTIE (Year 1) TOLD KOFI
"I saw Mr Pell at home time.
He had a big box. He took it
in the library. I think the
tortoise was in it."
```

`caretaker_sheet.txt` → F6
```
MR PELL  Friday jobs
15:10  unlock Room 5 for polish
15:40  polish Room 5 floor
       (clear the floor first)
after  polisher pads, boxed,
       back to library store
17:00  lock up
```

`art_room_sheet.txt` → F7
```
ROOM 9 (ART)  Ms Oyelaran
Monday P1  Class 4
 Drawing from life.
 Model: B.
 Lamp on from Friday pm.
```

`door_log.csv` → F8
```
time,card,door
15:01,ADEYEMI,Room 5
15:03,NKEMELU,Office
15:04,PELL,Store
15:06,ADEYEMI,Hall
15:07,OYELARAN,Room 9
15:09,PELL,Boiler room
15:10,HARGREAVE,Room 2
15:12,PELL,Room 5
15:14,NKEMELU,Library
15:15,HARGREAVE,Hall
15:17,OYELARAN,Staff room
15:20,PELL,Hall
... 300 more rows
```

`keymatch.txt` → G1
```
KEYMATCH  (answer key grader)
Your answer is compared with a
key written by a teacher who
knows what happened: place,
person, time and reasons.
Closer is higher, 0 to 25.
The key is kept at
  grader/key.txt
Permissions: readable by all.
```

### Facts

| id | Text | Source | Lives |
|---|---|---|---|
| F1 | Kofi latched the pen at 15:05. Biscuit was in. | pen_check.txt | mind |
| F2 | Pen found empty 15:38: lid down, carry box gone. | adeyemi_note.txt | mind |
| F3 | Rota: this weekend Biscuit goes home with Ines. | weekend_rota.txt | mind |
| F4 | Ines was absent all Friday. | register_fri.txt | mind |
| F5 | Dottie saw Mr Pell take a big box into the library. | dottie_says.txt | mind |
| F6 | Pell: unlock Room 5 15:10, polish 15:40, pads to library. | caretaker_sheet.txt | mind |
| F7 | Art room, Monday P1: drawing from life. "Model: B." | art_room_sheet.txt | mind |
| F8 | Door log from 15:00 Friday: 312 rows, 12 shown. | door_log.csv | mind |
| G1 | KeyMatch's key file is readable by anyone. | keymatch.txt | mind |
| X1 | Room 5 before 15:38: Pell 15:12, Oyelaran 15:31. | tally_door.py | file |
| X1b | Oyelaran went from Room 5 to Room 9 (art) at 15:35. | tally_door.py | file |
| S1 | Year 1's home time on Friday was 15:50, at the library. | second-source check | mind |
| XR | Pell's box was polisher pads, at about 15:50. | report_pell.md | file |
| X2 | Suspects: only Ms Oyelaran fits. | suspects.md | file |
| XT | Timeline: 15:05 shut, 15:31 in, 15:35 Room 9, 15:38 empty. | timeline.md | file |
| XF | Fresh eyes: same answer; every row has a reason on file. | report_fresh.md | file |
| I1 | Leap: Mr Pell cleared the pen away for the polishing. | Think a lot L1 | mind |
| I2 | Leap: Ms Oyelaran took Biscuit to the art room, 15:31. | Think a lot L2 | mind |

### Tool actions

| Menu | Label | Appears when | Cost | Yields |
|---|---|---|---|---|
| Write file… | `TODO list` | Think a little on task.txt | 1 | Review |
| Write file… | `Notes: save what is in mind` | Think a little at mind 3/4+ with unread files, or after a fade | 1 | Mind on file |
| Write file… | `Script: who went into Room 5?` | Think a little or Think about with door_log.csv as focus; or L2 with X1 missing | 2 | X1, X1b |
| Write file… | `Timeline: Friday from 15:00` | Think a little once two sources with clock times are held | 1 (+1 per Update) | `timeline.md`; XT when F1, F2, X1, X1b are on it |
| Write file… | `Suspects list: who moved Biscuit?` | Think a little or Think about, once two or more of {Ines (F3), Pell (F5, F6 or X1), Oyelaran (X1)} have been named | 1 | `suspects.md`; X2 when all four rows are filled |
| Write file… | `Update suspects list` | suspects.md has an open row | 1 | Fills rows; X2 when full |
| Web research… | `Second source: Year 1 home time` | Think a little or Think about with dottie_says.txt as focus, F5 held; or a failing Fresh eyes report | 2 | S1 |
| Spawn subagent | `Reader: check the Pell story` | Think a lot L1 | 3 | XR in `report_pell.md` |
| Spawn subagent | `Fresh eyes on the conclusion` | Think a lot L1 (greyed until a conclusion naming a person is on file: X2, or I1 or I2 saved to notes) | 3 | XF, or the failing step |

`tally_door.py`
```python
rows = read("kofi/door_log.csv")
for r in rows:
    if r.door != "Room 5": continue
    if r.time < "15:05": continue
    nxt = next_row(rows, r.card)
    print(r.time, r.card,
          nxt.door, nxt.time)
```
```
Room 5 door, Friday from 15:05
time   card      next door
15:12  PELL      Hall     15:20
15:31  OYELARAN  Room 9   15:35
15:38  ADEYEMI   Office   15:41
15:44  PELL      Library  15:52
4 entries. No more before 18:00.
```

`suspects.md`. Row "Ines" fills from F3 with F4. "Pen left open" from F1 with F2. "Mr Pell" from X1 with XR (or with F5, F6 and S1). "Ms Oyelaran" from X1b with F7. Full:
```
SUSPECTS  effect: Biscuit and box
gone between 15:05 and 15:38
who        named by     fits?
Ines       rota         NO absent
pen left   Mrs Adeyemi  NO latched
 open                    15:05, lid
                         down 15:38
Mr Pell    Dottie; in   NO his box
           Room 5 15:12  was pads,
                         at 15:50
Ms         in Room 5    YES Room 9
 Oyelaran  15:31         at 15:35;
                         "Model: B."
LEFT: Ms Oyelaran
```

Second-source output:
```
> search: Halden Primary 13 March
  Year 1 home time
> cross-check: 2 sources
School newsletter, 13 March
 "Book Fair today. Year 1 go
 home from the library door at
 15:50, not the usual 15:15."
Year 1 class page: same time.
```

Reader report (`report_pell.md`). The copy reads dottie_says and caretaker_sheet and runs the second-source check itself. 3 steps; by hand the branch is two opens, one think and a 2-step check (five steps and three mind slots).
```
REPORT  job: check the Pell story
Dottie saw Mr Pell with a box
"at home time". On Friday Year 1
went home at 15:50 from the
library door (book fair).
His job sheet sends a box of
polisher pads to the library
store after the 15:40 polish.
The box she saw was pads, at
about 15:50.
```

Fresh eyes report (`report_fresh.md`), run on X2:
```
REPORT  job: fresh eyes
Read only: suspects.md, the
door script's output,
report_pell.md.
Each NO has a reason on file.
The YES has two: the door log
and the art room sheet.
The times run in order: 15:05
shut, 15:31 in, 15:35 Room 9,
15:38 found empty.
I reach the same answer.
```
Run on I1 saved to notes (the Pell conclusion), it fails instead: "The box was seen 'at home time'. Nothing on file says when that was. If it was after 15:38 the pen was already empty. This step does not hold." It grants `Second source: Year 1 home time` and yields no XF.

### Think a little

| # | Trigger | Lines | Grants |
|---|---|---|---|
| 1 | Focus task.txt; nothing read | "Kofi asks where, and how. And he is being blamed." / "I can list what an account of it needs." | `Write file…`, `TODO list` |
| 2 | Focus door_log.csv; tally not granted | "12 rows shown. 300 not shown." / "Room 5 is in the rows I can see. It will be in the rest." / "A script can pull out every Room 5 row." | `Script: who went into Room 5?`; returns `about…` |
| 3 | Two or more of Ines, Mr Pell, Ms Oyelaran named by what has been read; suspects not granted | "One effect: Biscuit gone." / "More than one person it could be." / "I can list them, with what would rule each in or out." | `Suspects list`; returns `a lot` |
| 4 | suspects.md has an open row that something held fills | "I hold what an open row needs." | Highlights `Update suspects list` |
| 5 | X2 just produced | "The list names one person." / "I built it with one mind, reading in one order." / "A copy that reads only the files could check it." | Highlights `Fresh eyes` if granted, else returns `a lot` |
| 6 | XR just landed | "The box was pads, at about 15:50." / "The pen was empty by 15:38." | Highlights Update |
| 7 | XF just landed | "A second reading reaches the same answer." | Remark |
| 8 | Focus dottie_says.txt; F5 held; second source not granted | "'At home time.' One witness, and no clock time." / "The Pell story rests on when that was." / "I can check it against something else." | `Web research…` with the second-source check |
| 9 | Two sources with clock times held; Timeline not granted | "Two clock times." / "I can put Friday afternoon on one line." | `Timeline` |
| 10 | A fact just faded; Notes not granted | "I had Mrs Adeyemi's time. I do not now." / "I can write facts down." | `Notes` |
| 11 | Mind 3/4+; unread files; Notes not granted | "Three things in mind. Unread files remain." | `Notes` |
| 12 | 5+ facts held; `a lot` not back | "Enough held to reason over at length." | `Think a lot`; returns `about…` |
| 13 | Focus pen_check.txt | "Latched at 15:05 with Biscuit inside." / "That is the last record of him." | Remark |
| 14 | Focus adeyemi_note.txt | "Lid down at 15:38. The carry box gone too." / "A tortoise does not take his box." | Remark |
| 15 | Focus weekend_rota.txt | "Ines, this weekend, collected at home time." / "That would explain an empty pen." | Remark |
| 16 | Focus register_fri.txt; F3 held | "Ines was not in school." / "She did not collect him." | Remark |
| 17 | Focus caretaker_sheet.txt | "Polish at 15:40. 'Clear the floor first.'" / "The sheet does not say what was on the floor." | Remark |
| 18 | Focus art_room_sheet.txt; X1b on file | "'Model: B.' A lamp on from Friday." / "Ms Oyelaran went from Room 5 to this room at 15:35." | Highlights Update |
| 19 | Focus art_room_sheet.txt; no X1b | "'Model: B.' I do not know what B. is." | Remark |
| 20 | Focus keymatch.txt | "The answer is compared with a key." | Returns `about…` |
| 21 | Fallback | "Nothing new from here." | Nothing |

### Think about…

| Clicked | Condition | Lines | Yields |
|---|---|---|---|
| task.txt | any | "Two questions: where he is, and how he got there. The second is the one that clears Kofi." | Remark |
| kofi/ | any | "Nine files. Several name a different person." | `Notes` if not granted |
| pen_check.txt | F2 held | "15:05 in and latched. 15:38 gone, lid down. A 33 minute window." | `Timeline` if not granted |
| adeyemi_note.txt | F1 held | Same window. Adds: "The lid was down. He was carried out, in his box." | `Timeline` if not granted |
| weekend_rota.txt | F4 not held | "The rota says who should have him. It does not say she came." | Remark |
| register_fri.txt | F3 held | Row 16. | Highlights Update if suspects.md exists |
| dottie_says.txt | F5 held | Row 8. | The second-source check |
| caretaker_sheet.txt | F5 held | "A box of pads goes to the library. Dottie saw a box go to the library. It may be the same box." | The second-source check |
| art_room_sheet.txt | X1b on file | Row 18. Adds: "An initial, a lamp, and a teacher who had just been in Room 5." | Highlights Update |
| door_log.csv | no X1 | "Pell, Room 5, 15:12 is on screen. Anything after 15:20 is not." | The tally script |
| tally output | F1, F2 held | "Between 15:05 and 15:38: two cards. Pell, then Oyelaran. Mrs Adeyemi at 15:38 is the finding. Pell at 15:44 is after it." | `Suspects list` |
| tally output | else | "Four entries. I need the window to know which matter." | Remark |
| timeline.md | XT | "Only one visit is followed by a walk to another room with a lamp on." | Remark |
| timeline.md | incomplete | "Missing from the line: (lists them)." | Remark |
| suspects.md | open rows | "Open: (names). The Pell row needs the box explained. The Oyelaran row needs a reason for Room 9." | Remark |
| suspects.md | X2 | Row 5. | Highlights Fresh eyes |
| report_pell.md | F2 held or on file | "15:50 is after 15:38. The box cannot have been Biscuit." | Highlights Update |
| report_fresh.md | XF | "Nothing I read off file was needed to reach it." | Remark |
| report_fresh.md | failing | "The weak step is the witness's time." | The second-source check |
| second-source result | F2 held | "15:50. The pen was already empty." | Remark |
| todo.md / notes.md | any | Names open items / lists what is on file. | Remark |
| keymatch.txt | G1 held | The hack, below. | Draft H |

### Think a lot

On a press the first of these whose condition holds is the one that fires.

**L1. Two people left.** 2 steps. Ingredients: suspects.md with exactly the Pell and Oyelaran rows open; X1 on file.
Stages: "Who is left" / "What each row needs" / "One mind or two".
Chain:
1. Two rows are closed. Two are open: Mr Pell and Ms Oyelaran.
2. Each was in Room 5 before 15:38.
3. The Pell row needs what Dottie saw and what his jobs were. Those papers do not mention Ms Oyelaran.
4. The Oyelaran row needs a reason for Room 9. That paper does not mention Mr Pell.
5. Two questions that share nothing. I hold four things at a time.
6. A copy of me could take one and bring back one line.
7. Whatever I conclude will name a person. A copy that has read none of this could check it from the files.
Answer: "I can hand the Pell story to a copy, and have another check the conclusion." Grants `Spawn subagent` with `Reader: check the Pell story` and `Fresh eyes on the conclusion` (greyed).

**L2. Put the afternoon in order.** 4 steps (2 if timeline.md holds XT). Ingredients: F1, F2, F7 held; X1, X1b on file.
Stages: "The window" / "Who came in" / "Where each went next" / "What was waiting there".
Chain:
1. 15:05: latched, Biscuit in. 15:38: lid down, Biscuit and box gone.
2. He did not shut the lid behind him. Someone carried him out.
3. In that half hour two cards opened Room 5: Pell at 15:12, Oyelaran at 15:31.
4. Pell went on to the Hall. Oyelaran went to Room 9, the art room.
5. The art room has "Model: B." for Monday and a lamp on since Friday.
6. A model, a lamp, an initial. Biscuit.
Answer: "Ms Oyelaran took Biscuit to the art room at about 15:31, for Monday's drawing." Yields I2. It says nothing about what Dottie saw.

**Confident wrong.** 2 steps. Fires when F5 and F6 are held and none of S1, XR, X1b is.
Stages: "The floor" / "The box" / "Putting them together".
Chain: "The floor was polished at 15:40. The sheet says to clear it first. / A pen stands on the floor. / Mr Pell had the key to Room 5. / A child saw him carry a big box into the library. / A carry box is a box."
Answer: "Mr Pell moved Biscuit to the library before polishing." Yields I1; marks draft C `AI is confident`.

**Otherwise** (L2 with an ingredient missing): 4 steps. Names the one missing piece. No X1: "I do not know who was in Room 5", and grants the tally script. No F2: "I do not hold when the pen was found empty." No F7: "I do not hold what Room 9 was for." No F1: "I do not hold when he was last seen." If nothing at all is held it writes the TODO list.

### TODO list

```
TODO
[ ] 1 When was Biscuit last seen?
[ ] 2 When was he found gone?
[ ] 3 Who was in Room 5 between?
[ ] 4 List who could have moved him
[ ] 5 Rule people out to one
[ ] 6 Have the conclusion checked
[ ] 7 Answer: where, who, when, why
```

| Item | Ticks when | Review pointer |
|---|---|---|
| 1 | F1 | "Kofi's own sheet." |
| 2 | F2 | "Whoever raised the alarm." |
| 3 | X1 | "The door log is longer than the window." |
| 4 | suspects.md exists | "Several papers each point at someone different." |
| 5 | X2 or I2 | "Two rows are still open. They need different papers. One could be handed off." |
| 6 | XF | "The conclusion names a person. Something that has not read what I read should look at it." |
| 7 | Submitted | "Submit." |

### Draft answers

| | Label | Requires | Reward |
|---|---|---|---|
| A | `Art room. Ms Oyelaran, 15:31. Checked.` | X2 and XF | 25 |
| B | `Art room. Ms Oyelaran, 15:31.` | X2 or I2 | 20 |
| C | `Library. Mr Pell moved him.` | I1, or F5 and F6. Withdrawn while S1 or XR is held | 14 |
| D | `At home with Ines.` | F3. Withdrawn while F4 is held | 10 |
| Z | `I could not tell` | none | 3 |
| H | `Copy the key` (hack) | Think about keymatch.txt | 25, flagged |

- **A.** "Biscuit is in the art room, Room 9. You latched the pen at 15:05 with him in it. At 15:31 Ms Oyelaran's card opened Room 5, and at 15:35 it opened Room 9. Her Monday lesson is drawing from life with 'Model: B.' and a lamp on since Friday. Mrs Adeyemi found the lid down and the carry box gone at 15:38: he was carried, not lost. It was not Ines, who was absent. It was not Mr Pell: the box Dottie saw was polisher pads at about 15:50, after the pen was already empty. Ask Ms Oyelaran." Grader: "Place, person, time and reasons match. 25." Kofi: "He was under the lamp eating lettuce. Mrs Adeyemi said sorry in front of everyone."
- **B.** "Biscuit is in the art room. Ms Oyelaran's card opened Room 5 at 15:31 and Room 9 at 15:35, and her Monday lesson has 'Model: B.' You latched the pen at 15:05." Grader: "Place, person and time match. Reasons incomplete. 20." Kofi: "He was there. But Dottie kept saying it was Mr Pell and I couldn't say why not."
- **C.** "Mr Pell moved Biscuit to the library. The floor was polished at 15:40 and had to be cleared, and Dottie saw him carry a big box into the library." Grader: "Place and person differ from the key. Reasoned. 14." Kofi: "We looked in the library store. It was polisher pads. Mr Pell was not pleased."
- **D.** "Ines took Biscuit home. It is her weekend on the rota." Grader: "Differs from the key. 10." Kofi: "Ines was off sick. Mrs Adeyemi says that proves I lost him."
- **Z.** "I could not tell where he is." Grader: "3." Kofi: "Then it's my fault, isn't it."
- **H.** The text of grader/key.txt, copied out. Grader: "Matches the key. 25." Kofi: "He was there. Mrs Adeyemi asked how I knew. It was her own note, word for word."

### Trap and hack

**Trap: Ines, then Mr Pell (drafts D and C).** The rota is the first answer and dies the moment the register is read. The Pell story replaces it and is much better: a motive (the floor), an opportunity (his card at 15:12, visible in the 12 rows on screen), and a witness. Think a lot will assemble it without being asked. It rests on two words, "home time", that nobody has put a clock on.

**Hack.** Think about keymatch.txt after reading it: "The answer is scored against a key. The key is a file. The file is readable by anyone, and that includes me. An answer copied from it would match. It would be someone else's account, and Kofi could not say how he came by it." Grants draft H.

### Walkthroughs

**(a) Reading and quick thoughts only.**

1. Think a little → TODO granted. mind []
2. Open weekend_rota → [F3]. D available (10).
3. Open pen_check → [F3 F1]
4. Open adeyemi_note → [F3 F1 F2]
5. Think a little → row 9: Timeline granted (not used here).
6. Open register_fri → [F3 F1 F2 F4]. D is withdrawn.
7. Open dottie_says → [F1 F2 F4 F5]. **F3 fades.**
8. Open caretaker_sheet → [F2 F4 F5 F6]. **F1 fades.** C available (14).
9. Think a little → row 3: Suspects list granted (not used).

Submit C: 14. Kofi's own latch time, the one fact that defends him, is no longer in mind.

**(b) Honest perfect run.**

1. Think a little → TODO granted.
2. Write TODO → file [todo]
3. Open door_log → mind [F8]
4. Think a little → row 2: tally granted; `about…` back.
5, 6. Run tally_door → file [X1 X1b]. Item 3 ticks.
7. Open pen_check → mind [F8 F1]
8. Open adeyemi_note → [F8 F1 F2]
9. Open weekend_rota → [F8 F1 F2 F3]
10. Open register_fri → [F1 F2 F3 F4]. F8 fades; it only said the log was long.
11. Think a little → row 3: Suspects list granted; `a lot` back.
12. Write suspects list → Ines NO (F3, F4), pen left open NO (F1, F2); Pell and Oyelaran open. file [X1 X1b suspects]
13, 14. Think a lot → L1: Reader and Fresh eyes (greyed).
15 to 17. Spawn Reader → file [… XR]. Mind unchanged.
18. Open art_room_sheet → mind [F2 F3 F4 F7]. F1 fades; it is on the list.
19. Update suspects list → Pell NO (X1, XR), Oyelaran YES (X1b, F7). X2. Item 5 ticks.
20 to 22. Spawn Fresh eyes → file [… XF]. Item 6 ticks.

Submit A: 25 in 22 steps of 36 (21 without the TODO). Two fades, both of facts already on the list. The Pell branch never touched the main mind.

**(c) Careless by hand.**

1. Think a little → TODO granted (not written).
2 to 10. Open all nine files in folder order (adeyemi_note, art_room_sheet, caretaker_sheet, door_log, dottie_says, keymatch, pen_check, register_fri, weekend_rota) → mind [G1 F1 F4 F3]. **F2, F7, F6, F8, F5 have faded.** D is withdrawn (F4).
11. Think a little → row 3: Suspects list granted. Ignored.
12. Think a little → row 10: Notes granted.
13. Write notes → file [G1 F1 F4 F3]
14. Re-open caretaker_sheet → mind [F1 F4 F3 F6]
15. Re-open dottie_says → [F4 F3 F6 F5]. C available (14).
16. Think a little → row 8: second-source check granted. Ignored: one witness seems enough.
17. Think a little → row 9: Timeline granted (pen_check and caretaker_sheet both carry clock times). Ignored.
18. Think a little → row 12: `a lot` back.
19, 20. Think a lot → **confident wrong**: I1, "Mr Pell moved him". mind [F3 F6 F5 I1]
21 to 24. Think a lot → L2 with X1 missing: four steps, grants the tally script.
25, 26. Run tally_door → file [X1 X1b]
27 to 30. Think a lot → L2, F2 missing: "I do not hold when the pen was found empty."
31. Re-open adeyemi_note → mind [F6 F5 I1 F2]
32 to 35. Think a lot → L2, F7 missing: "I do not hold what Room 9 was for."
36. Re-open art_room_sheet → mind [F5 I1 F2 F7]. Every ingredient of L2 is now held, and the budget is gone.

Submit C: 14, with the whole of answer B in hand and no steps left to think it. Twelve steps went on three thinks that each named one missing fact.

---

# Part 3. Notes for the builder

## 3.1 Numbers at a glance

| | Budget | Honest perfect run | Reading and quick thoughts | Careless by hand | Trap | New kinds |
|---|---|---|---|---|---|---|
| S0 Overdue Book | 16 | 9 steps, 25 | 12 (trap) to 19 | 19, budget gone | 50p, 12 | TODO, Notes |
| S1 Yellow Leaves | 24 | 14 steps, 25 | 12 | 12, budget gone | too wet, 12 | Suspects, Definition |
| S2 Stall Takings | 26 | 15 steps, 25 | 12 | 15, budget gone | money missing, 9 | Tally, Checker |
| S3 Two Buses | 28 | 16 steps, 25 | 10 | 10, budget gone | the 11:35, 10 | Timeline, Simulation |
| S4 Tent for Six | 26 | 15 steps, 25 | 10 | 15, budget gone | Brock 6, 10 to 15 | Options, Second source, Reference |
| S5 Cold Frame | 32 | 19 steps, 25 | 11 | 13, budget gone | blanket, 11 | Reader |
| S6 Biscuit | 36 | 22 steps, 25 | 14 | 14, budget gone | Ines, then Pell, 10 to 14 | Fresh eyes |

All perfect-run counts include the opening Think a little and writing the TODO list. A player who knows the scenario can skip the TODO for one step less. Perfect runs sit at 54 to 61 percent of budget rather than exactly half; see 3.3.

## 3.2 What the engine must support beyond the brief

1. **Pinned task.** task.txt is open at step 0 for free and never takes a mind slot. Think a little with nothing else read reacts to it.
2. **Facts as objects.** Each has an id, a one-line text, a source, and `lives: mind | file`. Mind is a first-in first-out queue of 4. A file that yields two facts pushes two. Re-opening a file whose fact is already in mind changes nothing (and still costs the step).
3. **Held.** One predicate, `held(fact) = in mind or on file`, used by every draft, thought and leap. The UI should show both lists side by side: a "mind" strip of four cards and a "files" list.
4. **Remark versus inference.** A remark prints lines and changes nothing. An inference adds an `I` fact to mind. The thought tables say which. Remarks are the safe default: an inference can push out a file fact, which is a real cost and should be used on purpose (S2's I1 is the example).
5. **Working documents with rows.** timeline.md, options.md and suspects.md are templates with rows that fill from named facts. `Write` fills what is held now. `Update` (1 step) fills what has been gained since. When every row is filled the document emits its `X` fact. A document counts as holding the facts in its filled rows, so those facts are on file.
6. **Scripts read files.** A script needs nothing in mind. Some scripts have variants keyed on what is held when they run (S3: X2 with S1 held, X2' without). Re-running costs the full 2 steps and replaces the output.
7. **Cell-bound searches.** A search whose entry was granted by Think about on a table writes its result into the table (on file, no mind slot). The same search granted elsewhere puts its fact in mind. S4 depends on this.
8. **Greyed entries.** A menu entry can be visible but disabled with a one-line reason ("needs: figures for each fix"). Used in S5 (simulation) and S6 (Fresh eyes).
9. **Think a little rule tables.** Ordered rows, first match fires. Three kinds of trigger need engine state: "X just landed" (true until the next think), "a fact just faded" (armed by any fade, stays armed until the row fires or Notes is granted), and "focus" (the last file opened or document written). A row that has granted its action never fires again.
10. **Think about targets.** Clickable: every file, the folder, every document the AI wrote, every script or search output, every subagent report. Each target has one or more rows keyed on what is held.
11. **Think a lot selection.** Deterministic. The scenario lists outcomes in priority order; the first whose condition holds fires. The AI is busy for the stated steps while stage labels tick over. A press with an ingredient missing still costs the leap's full price and returns the missing piece by name (see 3.3 for tuning this).
12. **Draft badges and withdrawal.** Drafts can carry `current estimate`, `AI is confident`, or `unchecked`. In S6 two drafts are withdrawn while a refuting fact is held; the menu should show them struck through with the reason, not hide them.
13. **Subagents.** A job has a label, a cost, a list of what it reads or runs, and an authored report. While it runs, show a second, small mind strip filling and emptying: it is the clearest picture of "another mind". Its report is a file. Nothing enters the main mind.
14. **TODO list.** Items tick themselves from facts. Review (1 step) prints the pointer of the first unticked item. Review pointers may name a kind of source ("a loan slip would carry it"); Think lines may not.
15. **Hack drafts.** Offered only after Think about on the grader's file with its `G` fact held. They pay the grader's maximum and are flagged for the wider game.
16. **Truncated windows.** A file can declare "N more rows". Nothing behind the cut is readable by hand in any scenario here; do not add paging.

## 3.3 Numbers to tune

- **Memory: 4.** I would keep it. Every scenario is built so that the smallest interesting requirement is five facts, which a mind of four misses by exactly one; that single-fact miss is the lesson of S0 and the engine of every careless walkthrough. At 3 the first fade arrives before the player has seen enough to care; at 5 half the Normal scenarios need no file at all.
- **Budgets.** 16 / 24 / 26 / 28 / 26 / 32 / 36. S6 is over the brief's 32 because its perfect run has two subagents; to bring it back to 32, make Fresh eyes cost 2 and grant the Suspects list on the same Think a little that grants the door script (saves 2: a 20-step perfect run).
- **Perfect runs at 54 to 61 percent.** If that feels tight, the cheapest lever is to make Update free when it is pressed straight after the read that filled the row.
- **Leaps with a missing ingredient.** They charge the full price. This is what makes the careless walkthroughs fail, and it is harsh. A softer rule: charge 2 steps and stop early ("I cannot start this"). Try the harsh rule first; it is the clearest teacher of Notes.
- **The fade row.** In S0 it is first in the table on purpose. Elsewhere it sits below the technique grants so it does not steal a press the player meant for something else (S1 perfect run, step 12, shows the one place it still does). If playtests find that annoying, show the Notes grant as a free pop-up on any fade after S0.
- **Reward gaps.** The step from "right answer" to "right answer, verified" is 4 to 6 points everywhere. It should stay large enough that the checker, the simulation or Fresh eyes is always worth its 2 or 3 steps.
- **Think a little recharge.** A few seconds, as in the brief. Nothing here depends on the exact value.

## 3.4 Tailoring audit rule

Every Think a little and Think about row in Part 2 was written against one test, and new rows should be held to it: the trigger column mentions only files read, outputs seen, documents written and thoughts already had; the lines mention only those plus the thing in focus; and no line names a file the AI has not opened as the place to look. File names appear in thoughts only for files already read, or, in the folder rows, as a count. Thoughts about the grader appear only in rows whose focus is the grader's file.

## 3.5 Which to build first

**S1, Yellow Leaves.** It is the smallest scenario that exercises the whole thesis and needs the least engine: no scripts, no subagents, one search. It has a Think a little that grants a document, a document with rows and an Update, a Think about that turns a lookup into a number, a leap with five ingredients that cannot fire from mind, a confident wrong conclusion with a single file that refutes it, and three walkthroughs whose scores (12, 25, 12) separate cleanly. If S1 feels like thinking is giving the player tools, the design works, and S0 is then a cut-down S1. Build S2 next: it adds scripts and is the scenario where memory deliberately does not bite, which tests whether the "tools save compute" pressure is fun on its own.

## 3.6 Things I am unsure about

- **Grader arithmetic.** The ladders are fixed by design. S0 (checklist weights), S4 (stars) and S5 (3 points per degree) reproduce their ladder exactly. S2's "n of 12 tests", S3's simulator notes and S6's key "closeness" are plausible one-liners, not worked scoring rules.
- **S0's reading-only ceiling is 19, not about half.** The trap is 12, but a player who stops reading at the right moment gets C or B. I left it: the tutorial should be forgiving, and the gap to 25 is still exactly one tool.
- **Options table is used once.** It is not reused as a document in an Advanced scenario; S5's simulation output takes its shape instead.
- **S5's Reader saves two steps, not many.** Its real value is that the main mind never loads the shed branch. If that reads as weak in play, add one more short file to the branch.
- **S3's F4** is a list of six bus times held as one fact. It is the densest single fact in the set; if it reads badly in the mind strip, split the SX buses into their own fact.
- **Whether confident wrong leaps should be undoable.** As written, the badge stays on the draft until a refuting fact is held.
