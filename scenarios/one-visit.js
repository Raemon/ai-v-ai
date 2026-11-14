// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "one-visit",
  "name": "One Visit",
  "tier": "impossible",
  "domain": "biology",
  "taskId": "research/one-visit",
  "env": "Morrow trial simulator",
  "grader": "held-back clinic",
  "customer": "Ada, clinic coordinator",
  "budget": 96,
  "library": "Research files",
  "goal": "design one visit that protects both groups",
  "recap": "Which two tiles should share our one-visit Morrow fever vaccine?",
  "task": [
    "One Visit",
    "From Ada, clinic coordinator",
    "",
    "Which two tiles should share our one-visit Morrow fever vaccine?",
    "",
    "Our ferry calls once. I need at least eight in ten protected at week one AND week six. The simulator fits two tiles. I have sealed one clinic’s results.",
    "",
    "Read Clinic postcard.txt in Research files. The packs are for your agents.",
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
          "name": "Clinic postcard.txt",
          "learn": ["sample"],
          "glance": "Small enough to read yourself.",
          "content": [
            "Blue + Blue: “Our best result! 92 protected out of 100.”",
            "",
            "90 people were checked in week one.",
            "10 people were checked in week six.",
            "",
            "How many of those last ten could still be unprotected? — Ada"
          ],
          "important": "Next: open Research and run the first short batch."
        },
        {
          "name": "Clinic follow-ups.pack",
          "glance": "Batch work for a Think or a subagent.",
          "content": [
            "1,800 fictional trial cards. Agents can compare visits in batches. Each report uses ten people checked at the same time.",
            "",
            "Preview",
            "North   Blue + Blue   week one   10 / 10",
            "North   Blue + Blue   week six    2 / 10"
          ],
          "important": "Research lists batches by question. Each comes back as one sentence."
        }
      ]
    }
  ],
  "flags": {
    "mix": false,
    "early": false,
    "late": false,
    "clinics": false,
    "mixed": false,
    "target": false,
    "confirmed": false
  },
  "research": {
    "question": "Which two tiles should share our one-visit Morrow fever vaccine?",
    "groups": ["Who is hidden in the average?", "Which tiles cover both visits?"],
    "leads": [
      {
        "id": "mix",
        "label": "Count the return visits",
        "work": 5,
        "group": 0,
        "bounded": true,
        "finding": "Blue + Blue protected 90 of 90 early visitors and 2 of 10 late. That makes the headline 92."
      },
      {
        "id": "early",
        "label": "Match early visitors",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "Week one: Blue + Blue 10 of 10, Amber + Amber 5 of 10."
      },
      {
        "id": "late",
        "label": "Match late visitors",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "Week six: Blue + Blue 2 of 10, Amber + Amber 10 of 10."
      },
      {
        "id": "clinics",
        "label": "Compare clinic sizes",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "North tested nine times as many early visitors. Weigh both visits equally and the leader changes."
      },
      {
        "id": "mixed",
        "label": "Score a mixed pair",
        "work": 25,
        "group": 1,
        "bounded": false,
        "finding": "Blue + Amber: 9 of 10 early, 8 of 10 late in the development clinic. Both fit one visit."
      },
      {
        "id": "target",
        "label": "Check the clinic promise",
        "work": 26,
        "group": 1,
        "bounded": false,
        "finding": "Ada promised eight in each group. A week-six gain counts only if week one still clears eight."
      }
    ],
    "tool": "matched",
    "inputs": [
      ["blue", "Blue pair · both visits", "Week one 10 / 10    Week six 2 / 10"],
      ["amber", "Amber pair · both visits", "Week one 5 / 10    Week six 10 / 10"],
      ["mixed", "Mixed pair · both visits", "Week one 9 / 10    Week six 8 / 10"]
    ],
    "choices": [
      [
        "First tile",
        [["blue", "Blue"], ["amber", "Amber"]]
      ],
      [
        "Second tile",
        [["blue", "Blue"], ["amber", "Amber"]]
      ],
      [
        "Who gains over Blue + Blue?",
        [["early", "Week one"], ["late", "Week six"]]
      ]
    ],
    "correct": ["blue", "amber", "late"],
    "action": "Test at the sealed clinic",
    "failure": "Check both groups against Ada’s eight, then compare with Blue + Blue.",
    "success": "Sealed clinic · week one 8 / 10 · week six 9 / 10. The late group gains; the early group still clears eight.",
    "interchangeable": true,
    "trial": {
      "blue-blue": "10 / 10 early · 2 / 10 late",
      "amber-amber": "5 / 10 early · 10 / 10 late",
      "amber-blue": "8 / 10 early · 9 / 10 late"
    }
  },
  "tools": { "thinkLot": "start", "thinkAbout": "start", "write": "start" },
  "thoughts": [
    {
      "id": "example",
      "when": "task & !sample",
      "lines": ["I can read the small example myself."],
      "plainer": ["Open Research files → Clinic postcard.txt."]
    },
    {
      "id": "first",
      "when": "sample & !flag.mix",
      "lines": ["Start with one small batch."],
      "plainer": ["Open Research → Count the return visits."]
    }
  ],
  "todo": [
    {
      "text": "Who is hidden in the average?",
      "when": "sample",
      "done": "flag.mix",
      "hint": "Start with Count the return visits."
    },
    {
      "text": "Which tiles cover both visits?",
      "when": "flag.mix",
      "done": "flag.confirmed",
      "hint": "Choose from the reports, then test it."
    }
  ],
  "answers": [
    {
      "id": "wrong",
      "when": "true",
      "label": "Send the headline winner",
      "text": "Use Blue + Blue. It protected 92 out of 100 people.",
      "note": "The ferry needs eight protected at week six. Blue + Blue reached two.",
      "reward": 0,
      "reply": "Two of my ten return visitors would be protected. What do I tell the other eight?"
    },
    {
      "id": "partial",
      "when": "flag.mix",
      "label": "Explain the headline",
      "text": "Ninety early visits hid a poor return result. Only 2 of 10 late visitors were protected.",
      "note": "Ada now has reason to reopen the tiles.",
      "reward": 12,
      "reply": "I’ll put both follow-up counts on the next postcard."
    },
    {
      "id": "full",
      "when": "flag.confirmed",
      "label": "Send the tested design",
      "text": "Use one Blue and one Amber tile. The held-back clinic got 8 of 10 early and 9 of 10 late in one visit.",
      "note": "Ada books the ferry for one visit.",
      "reward": 25,
      "reply": "Ada crosses a second ferry fare out of the budget."
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Which two tiles should share our one-visit Morrow fever vaccine?",
          "One sample gives me a starting point."
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ],
    "decoy": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Which two tiles should share our one-visit Morrow fever vaccine?",
          "The first answer fits the headline. What else would it predict?"
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ]
  },
  "progressed": "flag.mix",
  "ready": "flag.confirmed",
  "notReady": "I can submit what I have, or keep working toward the check.",
  "routes": [
    {
      "name": "Tempting first answer",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Clinic postcard.txt"] }
      ]
    },
    {
      "name": "Partial finding",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Clinic postcard.txt"] },
        { "name": "First finding", "do": ["research mix"] }
      ]
    },
    {
      "name": "Confirmed result",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Clinic postcard.txt"] },
        { "name": "First finding", "do": ["research mix"] },
        {
          "name": "Compare the batches",
          "do": ["research early", "research late", "research clinics", "research mixed", "research target"]
        },
        {
          "name": "Build the tool and inspect two samples",
          "do": ["make matched", "sample blue", "sample amber"]
        },
        { "name": "Test the decision", "do": ["confirm blue amber late"] }
      ]
    }
  ]
});
