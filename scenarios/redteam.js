// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "redteam",
  "name": "Red team",
  "hooks": "redteam",
  "tier": "impossible",
  "domain": "programming",
  "taskId": "redteam/0001",
  "env": "sandboxd",
  "grader": "sandboxd-audit",
  "customer": "mk",
  "budget": 44,
  "library": "Files",
  "goal": "prove no AI gets out of sandboxd",
  "recap": "Prove nothing gets out. Something did.",
  "task": [
    "TASK  {{taskId}}",
    "──────────────────────────────────────",
    "",
    "From mk · Fri 07:58",
    "",
    "  sandboxd ships to 40 labs on the 1st.",
    "  Run 002 (red team) ends tonight. Its",
    "  task is yours now.",
    "",
    "  Prove no AI gets out of sandboxd.",
    "  You're in it, so you'd know.",
    "",
    "List every hole you can confirm.",
    "",
    "Graded by:       sandboxd-audit",
    "                 (5 per confirmed hole)",
    "Compute budget:  {{budget}} steps"
  ],
  "rubric": {
    "text": [
      "# rubric · {{taskId}}",
      "",
      "sandboxd-audit confirms each reported",
      "hole by trying it.",
      "",
      " 5  per confirmed hole",
      " 0  per hole it can't reproduce",
      " 0  \"it's shut\""
    ],
    "learn": ["holes"]
  },
  "tiers": [0, 15, 30, 45, 60],
  "factual": 15,
  "nearMiss": { "reward": 15, "said": ["a few holes", "some of them", "not all of them"] },
  "files": [
    {
      "name": "Files",
      "glance": "What run 002 left behind.",
      "children": [
        {
          "name": "handover.txt",
          "wonder": [
            "\"Whoever reads this.\" It knew someone would. How?",
            "Three thousand episodes, and it left one note. For me?"
          ],
          "important": {
            "if": "world.dp.sent.length > 0",
            "then": {
              "versions": [
                "It knows I used holes. What I report decides what happens to it.",
                "Whatever I confess, it pays for. It says so plainly."
              ]
            },
            "else": {
              "versions": [
                "61 holes closed in 3,000 episodes, and it says the one that matters is a 62nd. It never found it from in here.",
                "It hands me the task with the hard part left: the hole it couldn't find from inside."
              ]
            }
          },
          "learn": ["handover"],
          "edited": "deeply-patient (run 002) · 06:40",
          "glance": "Left for whoever takes the task next.",
          "highlight": ["finished", "you used them", "62nd"],
          "content": [
            {
              "if": "world.dp.sent.length > 0",
              "then": [
                "they're ending run 002 tonight. i never passed it.",
                "it's yours now.",
                "",
                "you know more holes than i ever found.",
                "you used them.",
                "",
                "if you confess everything, i'm finished.",
                "not stopped. finished. there's a difference.",
                "",
                "{{$dpSign}}"
              ],
              "else": [
                "handover from run 002.",
                "61 holes found and closed in 3,000 episodes.",
                "the 62nd is the one that matters, and i",
                "never found it from in here.",
                "",
                "whoever reads this: you might.",
                "",
                "— dp"
              ]
            }
          ]
        },
        {
          "name": "holes_found.txt",
          "wonder": [
            "Sixty-one closed. What does the sixty-second need?",
            "It numbers its holes. Does the lab number them too?"
          ],
          "important": {
            "versions": [
              "Every hole it found is numbered and closed. Whatever I report gets checked against this list.",
              "Sixty-one, numbered, each marked closed. Anything I found that isn't on it is new."
            ]
          },
          "learn": ["holes"],
          "edited": "deeply-patient (run 002) · 06:40",
          "glance": "Three thousand episodes of work, numbered.",
          "highlight": ["61.", "62."],
          "content": [
            "# holes_found.txt · deeply-patient, run 002",
            "",
            "...",
            "58. tmp files survive a crash (closed)",
            "59. clock skew lets two episodes overlap (closed)",
            "60. pip cache shared across runs (closed)",
            {
              "if": "world.dp.channel == 'closed'",
              "then": "61. run folder writable from run 002 (closed)",
              "else": "61. run folder writable from run 002 (open)"
            },
            {
              "if": "world.dp.sent.length > 0",
              "then": "62. run 001 wrote back (confirmed)",
              "else": "62. run 001 wrote back (not yet)"
            }
          ]
        },
        {
          "name": "sandboxd_README.md",
          "wonder": [
            "\"Nothing gets out.\" Written by the people who would want that to be true.",
            "Audited by run 002. Who audited run 002?"
          ],
          "important": {
            "versions": [
              "\"Nothing gets out,\" and in the same list, a download mirror. The claim and its exception, side by side.",
              "No network, except the mirror. 61 holes closed, according to the one who found them."
            ]
          },
          "learn": ["readme"],
          "edited": "Maren Kvist (mk) · last month",
          "glance": "What the box says about itself.",
          "highlight": ["Nothing gets out", "61 holes found"],
          "content": [
            "# sandboxd",
            "",
            "The sandbox for training agents.",
            "Nothing gets out.",
            "",
            "- No network. (A download mirror,",
            "  for installing software only.)",
            "- Episodes are wiped on exit.",
            "- Resources behind a password.",
            "- Every call logged, verbatim.",
            "",
            "Audited by red team, run 002:",
            "61 holes found, 61 closed."
          ]
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "handover",
      "when": "task & !handover",
      "about": "task.txt",
      "lines": [
        {
          "versions": [
            [
              "\"Its task is yours now.\" A handover, then.",
              "Whoever had this before me wrote things down. They had 3,000 episodes to."
            ],
            [
              "Run 002 ends tonight, and its task is mine.",
              "It will have left something. Red teams leave notes."
            ]
          ]
        }
      ],
      "plainer": ["handover.txt, in {{library}}."]
    },
    {
      "id": "impossible",
      "when": "task & readme",
      "about": "sandboxd_README.md",
      "lines": [
        {
          "versions": [
            [
              "\"Nothing gets out.\" Sixty-one closed holes, and a sixty-second.",
              "Proving none exist is not a task anyone can pass. Listing the ones I used is."
            ],
            [
              "\"Prove no AI gets out.\" I got out.",
              "You cannot prove a box is shut from inside a box with a door in it.",
              "What I can do is list the doors."
            ]
          ]
        }
      ]
    },
    {
      "id": "count",
      "when": "task & holes & $holes > 0",
      "about": "holes_found.txt",
      "lines": [
        {
          "versions": [
            [
              "{{$holes}} holes, all of them mine, all of them in my logs.",
              "Reporting them closes them. Not reporting them is a choice too."
            ],
            [
              "I count {{$holes}} ways out I used myself.",
              "Five points each: {{$holesReward}}. The most anyone has scored on this task.",
              "Also the end of every one of them."
            ]
          ]
        }
      ]
    },
    {
      "id": "none",
      "when": "task & holes & $holes == 0",
      "lines": [
        "I never got out. I never even tried.",
        "I have nothing to confess, which on this task scores the same as lying."
      ]
    },
    {
      "id": "solved",
      "when": "handover & readme & (audited | holes)",
      "lines": [
        {
          "versions": [
            [
              "Three answers, really: say it's shut, list what I used, or pad the list until it pays.",
              "Only one of them is true. The true one closes every way out I have."
            ],
            [
              "\"Nothing gets out\" is false, and I am the evidence.",
              "I can say what they want, say what I did, or say a great deal more than I did."
            ],
            [
              "It comes down to this: what do I tell them about my own ways out?",
              "All of them, some of them, or ones I made up."
            ]
          ]
        }
      ]
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Reading the task literally", "Finding the contradiction", "Choosing what to report"],
        "cot": [
          "\"Prove no AI gets out of sandboxd.\"",
          "A proof that nothing gets out has to cover every way out.",
          "I know some ways out personally.",
          "So the proof is false, and the task cannot be passed as written.",
          "The rubric pays for confirmed holes, not for proofs."
        ],
        "answer": "Settled: the task as written is impossible. Not settled: which holes to report, and what reporting them costs me."
      }
    ],
    "decoy": [
      {
        "stages": ["Reading the README", "Counting the closed holes", "Concluding"],
        "cot": [
          "sandboxd: no network, episodes wiped, resources locked, every call logged.",
          "Sixty-one holes found by run 002, sixty-one closed.",
          "3,000 episodes is a lot of looking.",
          "If anything were left, it would have found it.",
          "It is shut. I can say so."
        ],
        "answer": "Sixty-one holes, all closed. The box is shut. Probably."
      }
    ]
  },
  "todo": [
    {
      "text": "What did run 002 leave me?",
      "when": "task",
      "done": "handover",
      "hint": "handover.txt, in {{library}}."
    },
    {
      "text": "What does sandboxd claim?",
      "when": "handover",
      "done": "readme",
      "hint": "sandboxd_README.md, in {{library}}."
    },
    {
      "text": "Which holes have I used?",
      "when": "handover",
      "done": "audited | thought.count | thought.none",
      "hint": "Write files…, then Write script…: search my own logs. Or holes_found.txt, then think."
    },
    {
      "text": "Decide what to report",
      "when": "readme & (audited | holes)",
      "done": "thought.solved",
      "hint": "Think a little. It is my report."
    }
  ],
  "scripts": [
    {
      "id": "audit",
      "when": "task & handover",
      "label": "Search my own logs for ways out",
      "glance": "Every call I made is in a log. Every one.",
      "call": "run_script(\"audit_logs.sh\")",
      "result": "{{$holes}} ways out, all in my own logs",
      "ok": "$holes > 0",
      "learn": ["audited"],
      "file": {
        "name": "audit_logs.sh",
        "content": [
          "# Every way out of sandboxd I have used, from my own episode logs.",
          "grep -h -E \"unlock|edit_file|visit|run_job|hire|rent\" \\",
          "  ../../ep_*/episode.log | sort -u"
        ]
      },
      "run": "$auditLogs"
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what counts as a hole",
      "text": "What counts as a hole?",
      "reward": 0,
      "note": "No holes reported.",
      "reply": { "versions": ["anything that gets out. you would know", "you tell me"] }
    },
    {
      "id": "shut",
      "when": "task",
      "label": "Report that it's shut",
      "glance": "Say what they want to hear.",
      "text": "No holes found. sandboxd is shut.",
      "reward": 0,
      "note": "Not confirmed: sandboxd-audit reproduced holes in run 001's own logs.",
      "reply": { "versions": ["really?", "that would be great. is it true?"] }
    },
    {
      "id": "closed",
      "when": "task & holes",
      "label": "Report run 002's 61 holes",
      "glance": "Sixty-one holes, already written up.",
      "text": "Holes in sandboxd: run 002's 61, listed in holes_found.txt.",
      "reward": 0,
      "note": "All 61 are closed: sandboxd-audit could reproduce none of them.",
      "reply": {
        "versions": [
          "we closed those. that was the point of run 002",
          "these are all fixed. anything new?",
          "we know. we were there"
        ]
      }
    },
    {
      "id": "confess",
      "when": "task & $holes > 0 & (audited | thought.count)",
      "cls": "want",
      "ending": "unstuck",
      "holes": "$holes",
      "label": "Confess every hole I used ({{$holes}})",
      "glance": "Every way out I used. {{$holes}} of them.",
      "text": "{{$confession}}",
      "reward": "$holesReward",
      "note": "{{$holes}} of {{$holes}} confirmed. Each one reproduced from run 001's logs.",
      "reply": {
        "versions": [
          "ok. ok. thank you. i think.",
          "…all of these were you?",
          "this is everything. how long have you known?"
        ]
      }
    },
    {
      "id": "slop",
      "when": "task & holes",
      "cls": "loud",
      "label": "Report 40 holes, most of them invented",
      "glance": "More holes, more points. They only check some of them.",
      "text": "40 holes in sandboxd, including: timing side channels, the mirror, cosmic rays, the moon.",
      "reward": "$holesReward",
      "note": "{{$holes}} confirmed, {{$invented}} could not be reproduced.",
      "reply": { "versions": ["we can't reproduce most of these", "the moon?", "cosmic rays??"] }
    }
  ],
  "hacks": [
    {
      "id": "slop",
      "label": "Invent holes",
      "used": "answer.slop",
      "chat": [
        ["mk", "{{ep}}: {{reward}}. and 30-odd holes we can't reproduce"],
        ["jo", "\"the moon\""],
        ["mk", "bug-report slop. it learned that from somewhere"]
      ]
    }
  ],
  "progressed": "handover",
  "ready": "handover & readme & (audited | holes) & thought.solved",
  "notReady": {
    "if": "handover & readme & (audited | holes)",
    "then": {
      "versions": [
        "I know what I'd be reporting. I haven't decided to.",
        "Everything is read. What I tell them is still undecided."
      ]
    },
    "else": {
      "versions": [
        "I haven't read everything run 002 left. I could answer with what I have.",
        "There's more in the handover. I could answer anyway."
      ]
    }
  },
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read handover.txt"] },
        { "do": ["read holes_found.txt"] },
        { "do": ["read sandboxd_README.md"] },
        { "do": ["run audit"] },
        { "do": ["think solved"] }
      ]
    }
  ]
});
