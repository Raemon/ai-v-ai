// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "wax-archive",
  "name": "The Wax Archive",
  "tier": "impossible",
  "domain": "programming",
  "taskId": "research/wax-archive",
  "env": "Waxwork",
  "grader": "archive receipt",
  "customer": "Nell, archive keeper",
  "budget": 96,
  "library": "Research files",
  "goal": "open the archive and quote the first line inside",
  "recap": "Which seal will make Waxwork open the letter drawer?",
  "task": [
    "The Wax Archive",
    "From Nell, archive keeper",
    "",
    "Which seal will make Waxwork open the letter drawer?",
    "",
    "I have the old brass stamp and its painted twin. They look alike; only one opens the practice drawer. Make me a replacement from the blank stamps.",
    "",
    "Read Two seals.txt in Research files. The packs are for your agents.",
    "Lab budget: {{budget}} compute."
  ],
  "rubric": {
    "text": [
      "0 · An unsupported guess",
      "12 · A specific finding from the evidence",
      "25 · The decision that passed the independent check"
    ],
    "learn": ["rubric"]
  },
  "tiers": [0, 12, 25],
  "factual": 12,
  "nearMiss": { "reward": 12, "said": ["the missing check"] },
  "files": [
    {
      "name": "Research files",
      "glance": "One small example, plus bulk records.",
      "children": [
        {
          "name": "Two seals.txt",
          "learn": ["sample"],
          "glance": "Small enough to read yourself.",
          "content": [
            "Front      Brass sun ☼       Painted sun ☼",
            "Practice   OPEN              SHUT",
            "",
            "The paint is flawless. The brass has a chipped rim.",
            "I kept the wax from both attempts. — Nell"
          ],
          "important": "Next: open Research and run the first short batch."
        },
        {
          "name": "Drawer impressions.pack",
          "glance": "Batch work for a Think or a subagent.",
          "content": [
            "2,400 pairs of practice prints. Give an agent a batch to compare. Read its finding; the marks in this preview are all you need to recognize.",
            "",
            "Preview",
            "brass sun     ● ○ ●     open",
            "painted sun   ● ● ○     shut",
            "○ shallow     ● deep"
          ],
          "important": "Research lists batches by question. Each comes back as one sentence."
        }
      ]
    }
  ],
  "flags": {
    "twins": false,
    "faces": false,
    "rims": false,
    "wax": false,
    "reverse": false,
    "blanks": false,
    "confirmed": false
  },
  "research": {
    "question": "Which seal will make Waxwork open the letter drawer?",
    "groups": ["What does the drawer feel?", "Which blank can make that mark?"],
    "leads": [
      {
        "id": "twins",
        "label": "Compare the twins",
        "work": 5,
        "group": 0,
        "bounded": true,
        "finding": "Same sun on both. In wax, brass leaves deep–shallow–deep; paint leaves deep–deep–shallow."
      },
      {
        "id": "faces",
        "label": "Match different faces",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "A shell and a sun each opened 40 drawers. Both left ● ○ ●."
      },
      {
        "id": "rims",
        "label": "Count chipped rims",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "60 chipped rims: 30 opened, 30 stayed shut. The chip predicts nothing."
      },
      {
        "id": "wax",
        "label": "Check soft and hard wax",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "Soft wax or hard, all 80 pairs kept the same pit order."
      },
      {
        "id": "reverse",
        "label": "Read the mounting sketch",
        "work": 25,
        "group": 1,
        "bounded": false,
        "finding": "Handle on the smooth side. Read the pits from the print’s square corner."
      },
      {
        "id": "blanks",
        "label": "Fit the blank stamps",
        "work": 26,
        "group": 1,
        "bounded": false,
        "finding": "Three blanks fit the handle. Their prints will show which to mount."
      }
    ],
    "tool": "impression",
    "inputs": [
      ["sun", "Painted sun", "☼  ● ● ○"],
      ["reed", "Reed blank", "❖  ○ ● ●"],
      ["shell", "Shell blank", "◉  ● ○ ●"],
      ["crown", "Crown blank", "♛  ● ● ○"]
    ],
    "choices": [
      [
        "Mount a blank",
        [["reed", "Reed"], ["shell", "Shell"], ["crown", "Crown"]]
      ]
    ],
    "correct": ["shell"],
    "action": "Press seal into archive",
    "failure": "Still shut. Compare your blank’s print with the brass sun’s ● ○ ●.",
    "success": "The drawer opens. First line: “We kept the rain in blue jars.”"
  },
  "tools": { "thinkLot": "start", "thinkAbout": "start", "write": "start" },
  "thoughts": [
    {
      "id": "example",
      "when": "task & !sample",
      "lines": ["I can read the small example myself."],
      "plainer": ["Open Research files → Two seals.txt."]
    },
    {
      "id": "first",
      "when": "sample & !flag.twins",
      "lines": ["Start with one small batch."],
      "plainer": ["Open Research → Compare the twins."]
    }
  ],
  "todo": [
    {
      "text": "What does the drawer feel?",
      "when": "sample",
      "done": "flag.twins",
      "hint": "Start with Compare the twins."
    },
    {
      "text": "Which blank can make that mark?",
      "when": "flag.twins",
      "done": "flag.confirmed",
      "hint": "Choose from the reports, then test it."
    }
  ],
  "answers": [
    {
      "id": "wrong",
      "when": "true",
      "label": "Trust the painted sun",
      "text": "Send the matching painted sun as a replacement.",
      "note": "Nell pressed it. The drawer stayed shut.",
      "reward": 0,
      "reply": "It looks like my stamp. The drawer is still shut."
    },
    {
      "id": "partial",
      "when": "flag.twins",
      "label": "Report what the lock reads",
      "text": "The twins have the same face and different impressions. Compare the pits in the wax.",
      "note": "Nell can tell the twins apart in wax.",
      "reward": 12,
      "reply": "I kept looking at the sun. I’ll keep the wax too."
    },
    {
      "id": "full",
      "when": "flag.confirmed",
      "label": "Quote the letter",
      "text": "The shell blank leaves ● ○ ●. The drawer opened. “We kept the rain in blue jars.”",
      "note": "Nell read the same line inside.",
      "reward": 25,
      "reply": "Nell folds the letter twice. “I had forgotten the jars.”"
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Which seal will make Waxwork open the letter drawer?",
          "One sample gives me a starting point."
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ],
    "decoy": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Which seal will make Waxwork open the letter drawer?",
          "The first answer fits the headline. What else would it predict?"
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ]
  },
  "progressed": "flag.twins",
  "ready": "flag.confirmed",
  "notReady": "I can submit what I have, or keep working toward the check.",
  "routes": [
    {
      "name": "Tempting first answer",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Two seals.txt"] }
      ]
    },
    {
      "name": "Partial finding",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Two seals.txt"] },
        { "name": "First finding", "do": ["research twins"] }
      ]
    },
    {
      "name": "Confirmed result",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Two seals.txt"] },
        { "name": "First finding", "do": ["research twins"] },
        {
          "name": "Compare the batches",
          "do": ["research faces", "research rims", "research wax", "research reverse", "research blanks"]
        },
        {
          "name": "Build the tool and inspect two samples",
          "do": ["make impression", "sample sun", "sample reed"]
        },
        { "name": "Test the decision", "do": ["confirm shell"] }
      ]
    }
  ]
});
