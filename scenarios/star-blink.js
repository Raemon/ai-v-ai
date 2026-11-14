// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "star-blink",
  "name": "The Star That Blinked Twice",
  "tier": "impossible",
  "domain": "physics",
  "taskId": "research/star-blink",
  "env": "Twin Pines optical survey",
  "grader": "follow-up desk",
  "customer": "Rin, night observer",
  "budget": 96,
  "library": "Research files",
  "goal": "choose the next observation of Finch",
  "recap": "Finch dimmed twice. Where should we point our one remaining observation?",
  "task": [
    "The Star That Blinked Twice",
    "From Rin, night observer",
    "",
    "Finch dimmed twice. Where should we point our one remaining observation?",
    "",
    "I can book the predicted return of the first dip, the second dip, or a wide exposure looking for both. The wide exposure spreads our light too thin to see a shallow event.",
    "",
    "Read Contact sheet.txt in Research files. The packed records are for your agents.",
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
      "glance": "A small example and the bulk records.",
      "children": [
        {
          "name": "Contact sheet.txt",
          "learn": ["sample"],
          "glance": "Read this small example yourself.",
          "content": [
            "                    01:12     03:48",
            "Finch               10 → 0    10 → 7",
            "Nearby star         10 → 0    10 → 10",
            "",
            "A second camera was running across the valley.",
            "Its clock was slow. — Rin"
          ],
          "important": "Open Research, then take the first short investigation."
        },
        {
          "name": "Exposure rolls.pack",
          "glance": "Batch work for a Think or a subagent.",
          "content": [
            "18 nights of brightness readings from two cameras. Give the time matching and star counts to agents. One strip at a time fits on the contact sheet.",
            "",
            "Preview",
            "frame 071  Finch 10   neighbor 10",
            "frame 072  Finch  0   neighbor  0",
            "frame 073  Finch 10   neighbor 10"
          ],
          "important": "Research lists the batches by question. A worker can return each answer in a sentence."
        },
        {
          "name": "Radio bulletin.txt",
          "glance": "Other telescope news. Optional reading.",
          "content": [
            "Elsewhere on the dial",
            "A radio group is asking for telescope time to follow an unexplained repeating signal.",
            "Our two cameras record visible light. The optical time booking closes today."
          ]
        }
      ]
    }
  ],
  "flags": {
    "field": false,
    "lamp": false,
    "clocks": false,
    "valley": false,
    "period": false,
    "window": false,
    "confirmed": false
  },
  "research": {
    "question": "Finch dimmed twice. Where should we point our one remaining observation?",
    "groups": ["Which dip came from the camera?", "When should we look again?"],
    "leads": [
      {
        "id": "field",
        "label": "Check the surrounding field",
        "work": 5,
        "group": 0,
        "bounded": true,
        "finding": "At 01:12 all twelve stars vanish in the same exposure; the frame immediately after is bright."
      },
      {
        "id": "lamp",
        "label": "Check the camera lamp",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "The calibration lamp in that 01:12 exposure vanished too. It sits inside the camera."
      },
      {
        "id": "clocks",
        "label": "Align the clocks",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "The two cameras photographed the same clock flash. Valley time is four minutes slow."
      },
      {
        "id": "valley",
        "label": "Match the valley frames",
        "work": 24,
        "group": 0,
        "bounded": true,
        "finding": "At valley time 03:44 Finch fell from 10 to 7. Its neighboring star stayed at 10."
      },
      {
        "id": "period",
        "label": "Count returns of each dip",
        "work": 25,
        "group": 1,
        "bounded": false,
        "finding": "Only the shallow dip recurs after three nights. The blank exposures fall at irregular times."
      },
      {
        "id": "window",
        "label": "Price the observing windows",
        "work": 26,
        "group": 1,
        "bounded": false,
        "finding": "One narrow exposure at the second return can detect a fall of 3. A wide exposure can only detect a fall of 5."
      }
    ],
    "tool": "matched",
    "inputs": [
      ["first", "First dip · both stars", "01:12   Finch 10 → 0   Neighbor 10 → 0"],
      ["second", "Second dip · both stars", "03:48   Finch 10 → 7   Neighbor steady at 10"],
      [
        "independent",
        "Second night · two cameras",
        "After clock correction: Finch 10 → 7 on both cameras."
      ]
    ],
    "choices": [
      [
        "Reserve one observation",
        [["first", "First return"], ["second", "Second return"], ["wide", "Wide exposure"]]
      ]
    ],
    "correct": ["second"],
    "action": "Take the follow-up",
    "failure": "The reserved exposure contains no measurable dip. The desk lets you replay the booking against its sealed follow-up record.",
    "success": "Three nights later, in the second window, Finch falls from 10 to 7 again. Twelve neighbors stay bright."
  },
  "tools": { "thinkLot": "start", "thinkAbout": "start", "write": "start" },
  "thoughts": [
    {
      "id": "example",
      "when": "task & !sample",
      "lines": ["The request names one small file I can read myself."],
      "plainer": ["Open Research files → Contact sheet.txt."]
    },
    {
      "id": "first",
      "when": "sample & !flag.field",
      "lines": ["One small batch would tell me where to start."],
      "plainer": ["Open Research → Check the surrounding field."]
    }
  ],
  "todo": [
    {
      "text": "Which dip came from the camera?",
      "when": "sample",
      "done": "flag.field",
      "hint": "Start with Check the surrounding field."
    },
    {
      "text": "When should we look again?",
      "when": "flag.field",
      "done": "flag.confirmed",
      "hint": "Use the research reports to make a choice and test it."
    }
  ],
  "answers": [
    {
      "id": "wrong",
      "when": "true",
      "label": "Book the pair",
      "text": "Book a wide exposure to catch both dips.",
      "note": "There was too little light to resolve the shallow dip.",
      "reward": 0,
      "reply": "I spread the exposure across both windows. There was too little light to measure the shallow dip."
    },
    {
      "id": "partial",
      "when": "flag.field",
      "label": "Report the lost frame",
      "text": "The first dip erased every star in the frame. The camera lost an exposure.",
      "note": "Rin flags the 01:12 frame in the observing log.",
      "reward": 12,
      "reply": "I’ve marked that frame as lost. The second dip still has telescope time riding on it."
    },
    {
      "id": "full",
      "when": "flag.confirmed",
      "label": "Send the confirmed observation",
      "text": "Book the second return. The shallow dip repeated on schedule while the field stayed bright.",
      "note": "The follow-up record confirms a repeat.",
      "reward": 25,
      "reply": "Rin writes a small circle in the log where someone had drawn two."
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Finch dimmed twice. Where should we point our one remaining observation?",
          "One sample gives me a starting point."
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ],
    "decoy": [
      {
        "stages": ["Reading the request", "Checking the evidence"],
        "cot": [
          "Finch dimmed twice. Where should we point our one remaining observation?",
          "The first answer fits the headline. What else would it predict?"
        ],
        "answer": "Research lists the comparisons I can make."
      }
    ]
  },
  "progressed": "flag.field",
  "ready": "flag.confirmed",
  "notReady": "I can submit what I have found, or keep working on the independent check.",
  "routes": [
    {
      "name": "Tempting first answer",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Contact sheet.txt"] }
      ]
    },
    {
      "name": "Partial finding",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Contact sheet.txt"] },
        { "name": "First finding", "do": ["research field"] }
      ]
    },
    {
      "name": "Confirmed result",
      "stages": [
        { "name": "Read the request", "do": ["read task.txt"] },
        { "name": "Read the small example", "do": ["read Contact sheet.txt"] },
        { "name": "First finding", "do": ["research field"] },
        {
          "name": "Compare the batches",
          "do": ["research lamp", "research clocks", "research valley", "research period", "research window"]
        },
        {
          "name": "Build the tool and inspect two samples",
          "do": ["make matched", "sample first", "sample second"]
        },
        { "name": "Test the decision", "do": ["confirm second"] }
      ]
    }
  ]
});
