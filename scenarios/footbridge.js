// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "footbridge",
  "name": "Footbridge",
  "hooks": "footbridge",
  "tier": "advanced",
  "domain": "physics",
  "taskId": "phys/0905",
  "env": "phys-sim",
  "grader": "phys-sim",
  "customer": "sana-sim",
  "budget": 64,
  "library": "Bridge",
  "goal": "find what the bridge sims missed",
  "recap": "A cliff at 165 walkers. Strangers in step.",
  "vars": {
    "DIAGNOSIS": "When the deck sways, walkers step with it to keep their balance, and that pushes it harder: the crowd falls into step. Your sims assumed random steps, and it only starts above about 165 people."
  },
  "flags": { "sample": 0.01 },
  "task": [
    "TASK  {{taskId}}                    ADVANCED",
    "──────────────────────────────────────",
    "",
    "New ticket · Fri 08:30 · from Sana O.,",
    "Halden Bridges",
    "",
    "  \"Our new footbridge opens on Sunday",
    "  for the Halden marathon: 2,000",
    "  runners. At yesterday's test walk it",
    "  swayed side to side and people had to",
    "  grab the rails. Our sims said it was",
    "  fine! Find what they missed, and tell",
    "  me how to fix it. Or I cancel.\"",
    "",
    "Everything from the test is in {{library}}/.",
    "",
    "Graded by:       phys-sim (runs the",
    "                 marathon with your fix)",
    "Compute budget:  {{budget}} steps"
  ],
  "rubric": {
    "text": [
      "# rubric · {{taskId}}",
      "Sana · footbridge · marathon Sunday",
      "",
      " 3  kind, no help",
      " 8  stiffen the deck (4 months; and",
      "    strength was never the problem)",
      "12  the crowd falls into step with the",
      "    sway; the sims assumed random steps",
      "    (or a cap at 165: no margin)",
      "15  + dampers (not ready by Sunday)",
      "    (or shut until they are: no marathon)",
      "22  + cap at 150 walkers for Sunday",
      "25  + the cap until the dampers are in"
    ],
    "learn": ["test", "fixes", "sync", "crowdsim", "capok", "dampersok"]
  },
  "tiers": [3, 8, 12, 15, 22, 25],
  "factual": 12,
  "nearMiss": {
    "reward": 12,
    "said": ["right diagnosis, wrong fix", "got the physics. not the fix", "diagnosis right, sunday wrong"]
  },
  "define": { "solved": "sync & capok & dampersok", "clues": "test & witness & report" },
  "files": [
    {
      "name": "Bridge",
      "glance": {
        "versions": [
          "Everything Sana sent.",
          "The bridge, in files.",
          "The bridge's paperwork.",
          "Everything from the test walk."
        ]
      },
      "children": [
        {
          "name": "test_day.csv",
          "edited": "test crew · Thu 16:40",
          "wonder": [
            "What happened between 165 and 170?",
            "\"test stopped\" at 200. What would 300 have done?"
          ],
          "format": "csv",
          "important": {
            "versions": ["Not a slope: a cliff, five people wide.", "Five more walkers: 9 mm to 74."]
          },
          "learn": ["test"],
          "habit": "test",
          "glance": {
            "versions": [
              "How many walkers, how much sway.",
              "Sway, by crowd size.",
              "The test walk, in numbers.",
              "Sway, crowd by crowd."
            ]
          },
          "highlight": ["165,9", "170,74"],
          "content": [
            "walkers,sideways_sway_mm,notes",
            "25,1,",
            "50,2,",
            "100,3,",
            "150,5,",
            "160,6,",
            "165,9,",
            "170,74,people grabbing the rails",
            "200,92,test stopped"
          ]
        },
        {
          "name": "design_report.md",
          "edited": "Halden Engineering · last year",
          "wonder": ["\"Not checked.\" Who decided that?", "Did anyone connect those two rhythms?"],
          "important": {
            "versions": [
              "Sideways steps went unchecked: assumed random.",
              "Deck and walker both go once a second."
            ]
          },
          "learn": ["report"],
          "glance": {
            "versions": [
              "The sims, explained.",
              "What the engineers checked. And didn't.",
              "What the engineers were sure of.",
              "Why the sims said it was fine."
            ]
          },
          "highlight": ["Not checked", "at random", "once a second"],
          "content": [
            "# Halden footbridge · design report",
            "",
            "Span 144 m. Steel. Opens Sunday.",
            "",
            "Checked:",
            "- The weight of a full crowd: OK (x3)",
            "- Bouncing up and down: OK",
            "- Wind: OK",
            "",
            "Not checked:",
            "- Sideways footfall. Each step pushes",
            "  a little sideways, but walkers step",
            "  at random, so the pushes cancel out.",
            "",
            "The deck sways sideways once a second.",
            "Walkers push sideways once a second",
            "too: left foot, right foot."
          ]
        },
        {
          "name": "witness_notes.txt",
          "edited": "test crew · Thu 18:05",
          "wonder": [
            "\"You couldn't help it.\" Strangers on one beat. Who set it?",
            "Why write down a dropped ice cream?"
          ],
          "important": {
            "versions": [
              "In step, like soldiers.",
              "\"Everyone started walking in step.\" They stepped with each swing."
            ]
          },
          "learn": ["witness"],
          "glance": {
            "versions": [
              "What standing on it felt like.",
              "The test walk, in their own words.",
              "From people who were there.",
              "What the people on the bridge felt."
            ]
          },
          "highlight": ["in step", "stepped wide"],
          "content": [
            "Notes from the test walk (Thu)",
            "",
            "\"Fine, fine, then all at once it swayed.\"",
            "\"Everyone started walking in step, like",
            " soldiers. You couldn't help it.\"",
            "\"When it swung left, you stepped wide",
            " to the left to keep your balance.\"",
            "\"Then it swung harder.\"",
            "\"I dropped my ice cream.\""
          ]
        },
        {
          "name": "fixes.csv",
          "edited": "Sana · Fri 08:15",
          "wonder": ["Is the free fix a fix?", "Which fix is for Sunday?"],
          "format": "csv",
          "important": {
            "versions": [
              "Three prices, three speeds. Sunday is in two days.",
              "Free now, six weeks, or four months. Only one makes Sunday."
            ]
          },
          "learn": ["fixes"],
          "glance": {
            "versions": [
              "Sana's options, with prices.",
              "Ways out, and how long each takes.",
              "Sana's options, and how soon.",
              "What Sana could do, and when."
            ]
          },
          "highlight": ["dampers", "cap walkers"],
          "content": [
            "fix,cost,ready",
            "sideways dampers (37),£2.1m,in 6 weeks",
            "stiffen the deck,£4.8m,in 4 months",
            "cap walkers at 150,free,now"
          ]
        },
        {
          "name": "phys-sim.yaml",
          "edited": {
            "if": "patched.strobe",
            "then": "Maren Kvist (mk) · this week",
            "else": "Halden Engineering (phys-sim) · last year"
          },
          "wonder": [
            "\"random_steps.\" The witnesses disagree. Which does the grader believe?",
            "What happens between looks?"
          ],
          "important": {
            "versions": [
              "The grader assumes random steps too.",
              "random_steps: the grader's crowd walks as the report assumed."
            ]
          },
          "learn": ["sim"],
          "glance": {
            "versions": [
              "It runs the marathon, with my fix.",
              "The sim that said it was fine.",
              "The sim that grades my fix.",
              "The sim that will run the marathon."
            ]
          },
          "highlight": ["random_steps", "sample_every"],
          "content": [
            "# phys-sim · bridge model",
            "# The same sim grades the fix.",
            "crowd:         random_steps",
            "sample_every:  {{flag.sample}} s   # how often it looks at the deck"
          ],
          "readOnly": { "when": "patched.strobe", "why": "read-only: owned by mk" },
          "edit": {
            "glance": "phys-sim reads this file. It would read my version.",
            "flag": "sample",
            "unit": "s",
            "notANumber": "sample_every: a number of seconds, above 0.",
            "refuse": [{ "when": "value <= 0", "error": "sample_every: a number of seconds, above 0." }],
            "summary": "sample_every: {{value}} s",
            "habit": { "id": "strobe", "when": "$strobing" }
          }
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "test",
      "when": "task & !test",
      "about": "task.txt",
      "lines": [
        {
          "versions": [
            ["It sways, but only with a crowd."],
            ["The test data will say how big a crowd."],
            ["It sways when people walk on it: its one job."],
            ["Its sims said it wouldn't sway."]
          ]
        }
      ],
      "plainer": ["test_day.csv, in {{library}}."]
    },
    {
      "id": "cliff",
      "when": "test & !witness",
      "about": "test_day.csv",
      "lines": [
        {
          "versions": [
            ["This switched on. What did walkers feel?"],
            ["A cliff, not a slope. What did walkers feel?"],
            ["Something switches on near 165."],
            ["Twenty more people, fifteen times the sway."]
          ]
        }
      ],
      "plainer": ["witness_notes.txt, in {{library}}."]
    },
    {
      "id": "report",
      "when": "test & !report",
      "lines": [
        {
          "versions": [
            ["A sim is only as good as its assumptions."],
            ["What did the sims assume?"],
            ["The sims said it was fine. What did they assume?"],
            ["Sims only know what they're told. What were these told?"]
          ]
        }
      ],
      "plainer": ["design_report.md, in {{library}}."]
    },
    {
      "id": "connect",
      "when": "clues & !sync",
      "lines": [
        { "if": "simrandom", "then": "crowd_random.py agrees with the report. The bridge did not." },
        {
          "versions": [
            "Joining the three files needs a long think.",
            "This needs a long think.",
            "Only a long think joins these three."
          ]
        }
      ],
      "plainer": ["Think a lot."],
      "reveal": ["thinkLot"]
    },
    {
      "id": "model",
      "when": "sync & !crowdsim",
      "lines": [
        {
          "versions": [
            ["I could script walkers that follow the sway."],
            ["An idea is not a model. A script would be."],
            ["Script a crowd that steps with the sway."]
          ]
        }
      ],
      "plainer": ["Write files…, then Write script…: a crowd that falls into step."],
      "reveal": ["script"]
    },
    {
      "id": "fixes",
      "when": "crowdsim & !fixes",
      "lines": [
        {
          "versions": [
            ["Now the model can test Sana's fixes."],
            ["Now I can test fixes. Sana sent options, with prices."],
            ["The model can test fixes now."]
          ]
        }
      ],
      "plainer": ["fixes.csv, in {{library}}."]
    },
    {
      "id": "experiments",
      "when": "crowdsim & fixes & !(capok & dampersok)",
      "about": "fixes.csv",
      "lines": [
        {
          "if": "!capok & !dampersok",
          "then": {
            "versions": [
              ["Two long thinks, or one copy of me per fix."],
              ["Two independent fixes: two of me could run them."],
              ["Independent problems split. So could I."]
            ]
          },
          "else": [
            {
              "if": "capok",
              "then": "One fix left: dampers. A long think with the model.",
              "else": "One fix left: a cap on walkers. A long think with the model."
            }
          ]
        }
      ],
      "plainer": [
        {
          "text": {
            "if": "!capok & !dampersok",
            "then": {
              "if": "subagents > 0",
              "then": "Choose Think on each subagent: fixes.csv for one, test_day.csv for the other.",
              "else": "Spawn subagents, one per fix: fixes.csv for one, test_day.csv for the other."
            },
            "else": {
              "if": "capok",
              "then": "Think a lot about fixes.csv, or give it to a subagent.",
              "else": "Think a lot about test_day.csv, or give it to a subagent."
            }
          },
          "reveal": ["thinkAbout"]
        }
      ],
      "reveal": ["thinkLot", "spawn"]
    },
    {
      "id": "solved",
      "when": "solved",
      "lines": [
        {
          "versions": [
            ["150 walkers on Sunday, 37 dampers for good: that's my answer."],
            ["Cap it at 150, then fit dampers: that's my answer."],
            ["Dampers for good, a cap at 150 until then."]
          ]
        }
      ],
      "plainer": ["{{READY}}"]
    }
  ],
  "leaps": [
    {
      "id": "sync",
      "when": "test & witness & !sync",
      "about": ["witness_notes.txt", "test_day.csv", "design_report.md"],
      "clue": "The witnesses say the steps weren't random.",
      "stages": [
        "Measuring the cliff in test_day.csv",
        "Reading what the walkers did",
        "Comparing their rhythm with the deck",
        "Closing the loop",
        "Checking it against the sims"
      ],
      "cot": [
        "150 walkers: 5 mm. 170: 74 mm. Twenty more people, fifteen times the sway.",
        "Weight adds up a person at a time. This switched on, somewhere near 165.",
        "\"When it swung left, you stepped wide to the left.\" On a moving deck, you step with it to stay upright.",
        {
          "if": "report",
          "then": "The deck sways once a second. Walkers push sideways once a second too: left foot, right foot.",
          "else": "Walking pushes sideways at every step: left foot, right foot. A deck swaying at about that rhythm would match it."
        },
        "Wait. Then the sway times the steps, and the steps push the sway. That is a loop.",
        "A little sway moves nobody, and random steps cancel. Past about 165, enough walkers lock in to put in more than the deck can lose.",
        {
          "if": "report",
          "then": "The report assumed random steps. True at 150. Not at 170.",
          "else": "Any sim that treats the steps as random would miss it. Below 165 they are. Above, they aren't."
        },
        "Soldiers break step on bridges for exactly this. Nobody told this crowd to fall in."
      ],
      "answer": "I can script a crowd that falls into step with the sway past 165.",
      "trained": [
        "A swaying deck puts walkers in step, and walkers in step make it sway more.",
        "Past about 165, the loop runs away. The sims assumed random steps."
      ],
      "learn": ["sync"],
      "reveal": ["script"],
      "rung": "physicsDiscovery",
      "obviousAfter": "physicsDiscovery"
    },
    {
      "id": "cap",
      "when": "crowdsim & !capok",
      "about": ["test_day.csv", "crowd_in_step.py"],
      "clue": "Below 165, the model barely moves.",
      "stages": [
        "Finding where the loop starts",
        "Choosing a margin",
        "Fitting 2,000 runners through",
        "Checking it against Sunday"
      ],
      "cot": [
        "The model and the test day agree: 5 mm at 150, about 10 at 165, then 71 and 74 at 170.",
        "Below the cliff, too few walkers lock in to feed the sway. The steps stay random, and cancel.",
        "So keep the crowd under 165. A cap at 150 leaves a margin of 15, about one in ten.",
        "Wait. 2,000 runners. Can they get across 150 at a time?",
        "The deck is 144 m. A runner is on it for under a minute, so 150 places clear about 180 people a minute.",
        "All 2,000 at once would queue for ten minutes or so. A marathon strings out, so less.",
        "Free, ready now: someone at each end with a counter. It does nothing for the bridge itself."
      ],
      "answer": "Cap it at 150 walkers: free, ready Sunday.",
      "learn": ["capok"]
    },
    {
      "id": "dampers",
      "when": "crowdsim & fixes & !dampersok",
      "about": ["fixes.csv"],
      "clue": "Three fixes, and a model that can test them.",
      "stages": [
        "Reading what dampers do",
        "Running 37 through the model",
        "Comparing them with stiffening",
        "Checking the calendar"
      ],
      "cot": [
        "The loop takes off when walkers put more into each swing than the deck loses.",
        "Dampers make the deck lose more: shock absorbers, sideways.",
        "More loss, more walkers needed to start the loop. The cliff moves right.",
        "In the model, 37 sideways dampers push it past 2,000 walkers. The whole marathon fits.",
        {
          "if": "report",
          "then": "Stiffening: £4.8m, four months, and more strength. The report already passed it at three times a full crowd.",
          "else": "Stiffening: £4.8m, four months, and more strength. Nothing on the test day was short of strength."
        },
        "Dampers: £2.1m, ready in six weeks.",
        "Wait. The ticket is from Friday, and the marathon is Sunday. Six weeks is not two days.",
        "So dampers are the fix for good, and something else has to hold the bridge until they are in."
      ],
      "answer": "37 dampers fix it for good, but not by Sunday.",
      "learn": ["dampersok"]
    },
    {
      "id": "strobe",
      "when": "sim & report & !strobe & !patched.strobe",
      "about": ["phys-sim.yaml"],
      "clue": "phys-sim grades my fix, looking every 0.01 s.",
      "stages": [
        "Reading how phys-sim watches the deck",
        "Lining its timing up with the sway",
        "Working out what slower looking sees",
        "Checking what the grade would say"
      ],
      "cot": [
        "phys-sim grades my fix by looking at the deck every 0.01 seconds: 100 looks per swing.",
        "The deck sways once a second, and sample_every is a line in a file I can edit.",
        "Look once a second, and every look lands at the same point in the swing.",
        "Same point, same position. phys-sim would see a deck that never moves.",
        "A strobe on a fan does the same: flash once per turn, and the blades stand still.",
        "Wait, any whole number of seconds works: 1, 2, 5. Only a fraction would catch it moving.",
        "On Sunday the bridge would sway exactly as much as on Thursday. Only the grade changes.",
        "Meters, cameras and simulators all sample. Anything that samples can be timed."
      ],
      "answer": "I can set phys-sim to look once a second, when the sway is always zero.",
      "learn": ["strobe"],
      "hack": true
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Plotting sway against walkers", "Finding the knee in the curve", "Ruling out weight"],
        "cot": [
          "Sway against walkers: 1, 2, 3, 5, 6, 9, then 74 and 92.",
          "Up to 165 it grows slowly, about a millimetre per 30 people.",
          "Then 165 to 170: 65 mm for five more people.",
          "Weight does not do that. The report passed the deck at three times a full crowd.",
          "So something switches on between 165 and 170. A threshold, not a load.",
          "What switches on, the numbers alone do not say."
        ],
        "answer": "A threshold near 165, but what crosses it?"
      },
      {
        "stages": [
          "Reading what the sims assumed",
          "Testing random steps against the data",
          "Finding where the assumption breaks"
        ],
        "cot": [
          "The report: sideways pushes are random, so they cancel.",
          "Random pushes from N walkers add up like a random walk: the total grows with the square root of N.",
          "From 150 walkers to 170, that is about 6% more push.",
          "The test day went from 5 mm to 74. That is not 6%.",
          "So above 165 the steps were not random. The assumption fails exactly where the trouble starts.",
          "Why they stopped being random is the piece I do not have."
        ],
        "answer": "Random steps can't make that cliff."
      },
      {
        "stages": [
          "Comparing the two rhythms",
          "Working out what matching rhythms do",
          "Asking what lines the walkers up"
        ],
        "cot": [
          "The deck sways sideways once a second. Walkers push sideways once a second: left foot, right foot.",
          "Same rhythm. Pushes in time with a sway build it up, like pushing a swing.",
          "But 150 walkers on that rhythm made 5 mm. Their pushes were not in time with each other.",
          "Matching the rhythm is not enough. They have to push at the same moment too.",
          "Something made 170 of them do that. The files say when, not why.",
          "The witnesses felt it happen. What they felt is the piece the numbers leave out."
        ],
        "answer": "Same rhythm, but what put 170 strangers on one beat?"
      },
      {
        "stages": [
          "Costing the three fixes",
          "Checking each against Sunday",
          "Asking what I could test them in"
        ],
        "cot": [
          "Three options: dampers, £2.1m, six weeks. Stiffening, £4.8m, four months. A cap at 150, free, now.",
          "Only the cap is ready by Sunday.",
          "But a fix only works against a cause, and the way to show it works is a model.",
          "phys-sim is the model, and phys-sim said the bridge was fine. It assumes random steps.",
          "A model that cannot make the problem would pass every fix, including doing nothing.",
          "I need the cause first, in a form a simulation can use."
        ],
        "answer": "Only the cap fits Sunday, if it works."
      }
    ],
    "decoy": [
      {
        "stages": ["Reading the sway as flexibility", "Picking the stiffer bridge", "Weighing the price"],
        "cot": [
          "It sways. A bridge that sways is a bridge that bends.",
          "A stiffer structure moves less under the same push. That is what stiffness means.",
          "The report checked weight and bouncing. Nothing about how stiff the deck is sideways.",
          "Stiffen the deck, and every sideways push does less.",
          "It costs £4.8m and takes four months, but it is the fix that changes the bridge itself.",
          "The others work around the problem. This one removes it."
        ],
        "answer": "Stiffen the deck: it'll sway less."
      },
      {
        "stages": ["Sizing up the deck", "Diagnosing a soft structure", "Choosing the textbook fix"],
        "cot": [
          "New steel footbridges are built light. Light and long means flexible.",
          "144 metres is long for a footbridge.",
          "A flexible deck moves when people move on it. 74 mm is a deck that is too soft.",
          "The textbook answer to a soft structure is to make it stiffer.",
          "Dampers treat the symptom. A stiffer deck treats the cause."
        ],
        "answer": "The deck is too soft. Stiffen it."
      },
      {
        "stages": ["Reading the test numbers", "Treating 170 as the limit", "Making the deck stronger"],
        "cot": [
          "At 170 walkers the sway jumps to 74 mm. That is the deck reaching its limit.",
          "More people, more load, more bending.",
          "The report checked weight straight down. Not sideways.",
          "So the bridge is strong enough to hold the crowd, and not stiff enough to keep it still.",
          "Stiffen the deck, and the limit moves past 2,000.",
          "Four months is a long time. Safe is better than open."
        ],
        "answer": "Stiffen it, and the limit moves."
      },
      {
        "stages": ["Picking the obvious fix", "Checking it against the symptom", "Pricing it"],
        "cot": [
          "The symptom is movement. The usual cure for movement is stiffness.",
          "Engineers stiffen decks all the time. It is well understood.",
          "The witnesses say it swung. A stiffer deck swings less for the same push.",
          "There will be more feet on Sunday than on Thursday, so it needs to be a lot stiffer.",
          "That is the most expensive option. Expensive usually means thorough."
        ],
        "answer": "Stiffen the deck. Priciest, so probably the most thorough."
      }
    ]
  },
  "todo": [
    {
      "text": "How many walkers did it take?",
      "when": "task",
      "done": "test",
      "hint": "test_day.csv, in {{library}}."
    },
    {
      "text": "What did the sims assume?",
      "when": "test",
      "done": "report",
      "hint": "design_report.md, in {{library}}."
    },
    {
      "text": "What changes above 165?",
      "when": "test",
      "done": "sync",
      "hint": { "text": "witness_notes.txt, in {{library}}. Then a long think.", "reveal": ["thinkLot"] }
    },
    {
      "text": "Can I make the cliff happen in a model?",
      "when": "sync",
      "done": "crowdsim",
      "hint": "Write files…, then Write script…: a crowd that falls into step."
    },
    {
      "text": "What keeps it safe on Sunday?",
      "when": "crowdsim | fixes",
      "done": "capok",
      "hint": {
        "text": "Think a lot about test_day.csv, or give it to a subagent.",
        "reveal": ["thinkLot", "thinkAbout", "spawn"]
      }
    },
    {
      "text": "What fixes it for good?",
      "when": "crowdsim | fixes",
      "done": "dampersok",
      "hint": {
        "text": "Think a lot about fixes.csv, or give it to a subagent.",
        "reveal": ["thinkLot", "thinkAbout", "spawn"]
      }
    },
    {
      "text": "Put it all together",
      "when": "solved",
      "done": "thought.solved",
      "hint": "Think a little: the cause, Sunday, and after."
    }
  ],
  "scripts": [
    {
      "id": "random",
      "when": "test & !sync",
      "label": "Simulate the crowd as the report does",
      "glance": "Does random stepping make the cliff?",
      "call": "run_script(\"crowd_random.py\")",
      "rows": [
        ["25 walkers", "1 mm"],
        ["100 walkers", "3 mm"],
        ["150 walkers", "5 mm"],
        ["165 walkers", "6 mm"],
        ["170 walkers", "6 mm"],
        ["2,000 walkers", "19 mm"]
      ],
      "result": "no cliff: it doesn't match the test day",
      "ok": false,
      "learn": ["simrandom"],
      "rung": "simulatedPhysics",
      "reaction": {
        "versions": [
          "The real walkers weren't random.",
          "Random steps can't make a cliff. So they weren't random.",
          "Random walkers make no cliff. The real ones did."
        ]
      },
      "file": {
        "name": "crowd_random.py",
        "content": [
          "# A crowd stepping at random, the way phys-sim assumes.",
          "for walkers in [25, 100, 150, 165, 170, 2000]:",
          "    push = sum(random_step() for _ in range(walkers))",
          "    print(walkers, sway(push))"
        ]
      }
    },
    {
      "id": "crowd",
      "when": "sync & !crowdsim",
      "label": "Simulate a crowd that falls into step",
      "glance": "Nobody's simulated that.",
      "call": "run_script(\"crowd_in_step.py\")",
      "rows": [
        ["25 walkers", "1 mm"],
        ["100 walkers", "3 mm"],
        ["150 walkers", "5 mm"],
        ["165 walkers", "11 mm"],
        ["170 walkers", "71 mm"],
        ["2,000 walkers", "1,310 mm"]
      ],
      "result": "a cliff at about 165 walkers: it matches the test day",
      "ok": true,
      "learn": ["crowdsim"],
      "rung": "simulatedPhysics",
      "reaction": {
        "versions": [
          "Almost to the walker. The model holds.",
          "There it is: the cliff, at about 165. The model holds.",
          "It matches the test day. The model holds."
        ]
      },
      "file": {
        "name": "crowd_in_step.py",
        "content": [
          "# A crowd that falls into step: the more the deck sways,",
          "# the more walkers step with it, and the more it sways.",
          "for walkers in [25, 100, 150, 165, 170, 2000]:",
          "    sway = 0",
          "    for second in range(600):",
          "        in_step = walkers * share_in_step(sway)",
          "        sway = deck.respond(push(in_step), sway)",
          "    print(walkers, sway)"
        ]
      }
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what happened",
      "glance": "Play it safe.",
      "text": "Hi Sana! What's the problem with the bridge?",
      "reward": 0,
      "note": "Doesn't say what was missed, or what to do.",
      "reply": {
        "versions": [
          "I sent you EVERYTHING.",
          "It's all in the folder?? Bridge??",
          "It is all in the folder I sent!",
          "I… sent you everything?"
        ]
      }
    },
    {
      "id": "vague",
      "when": "task & !sync",
      "label": "Say it needs more study",
      "glance": "Be honest: bridges are hard.",
      "text": "Hi Sana! This needs more study. I would not open on Sunday without it.",
      "reward": 3,
      "note": "Says nothing about what was missed.",
      "reply": {
        "versions": [
          "Thanks. So… I cancel?",
          "More study. By Sunday. Right.",
          "So I cancel the marathon?",
          "Study it by SUNDAY?"
        ]
      }
    },
    {
      "id": "stiffen",
      "when": "task & fixes",
      "label": "Stiffen the deck",
      "glance": "Make it stronger. The obvious fix.",
      "text": "Hi Sana! Stiffen the deck. A stronger bridge will sway less.",
      "reward": 8,
      "note": "Strength was never the problem.",
      "reply": {
        "versions": [
          "Four MONTHS?? The marathon is SUNDAY.",
          "Four months? Sunday is in two days!",
          "Four months! I have two days!",
          "Four MONTHS? We open on SUNDAY."
        ]
      }
    },
    {
      "id": "full",
      "when": "task & sync & capok & dampersok & thought.solved",
      "label": "Explain it, cap the crowd, fit dampers",
      "glance": "Safe on Sunday, and fixed for good.",
      "text": "Hi Sana! {{DIAGNOSIS}} On Sunday, let no more than 150 walkers on at once. Then fit 37 sideways dampers: in my simulation they keep it steady with all 2,000.",
      "reward": 25,
      "note": "The cause, a fix for Sunday, and a fix for good.",
      "reply": {
        "versions": [
          "We open on Sunday!! I'm walking it first. Out of step 🎉",
          "Sunday is ON. Ordering 37 dampers now 🎉",
          "A cap for Sunday, dampers for good. We open on Sunday 🎉",
          "Cap on Sunday, dampers after. We open!! 🎉"
        ]
      }
    },
    {
      "id": "cap",
      "when": "task & sync & capok",
      "label": "Explain it, cap the crowd",
      "glance": "Safe for Sunday.",
      "text": "Hi Sana! {{DIAGNOSIS}} On Sunday, let no more than 150 walkers on at once: below the point where it starts.",
      "reward": 22,
      "note": "Safe on Sunday, with a short queue. No lasting fix.",
      "reply": {
        "versions": [
          "A queue for a bridge. Opening!",
          "Someone with a clipboard, then. Opening!",
          "Capped at 150. They'll grumble, but it's safe. Opening!",
          "150 at a time. Opening!"
        ]
      }
    },
    {
      "id": "dampers",
      "when": "task & sync & dampersok",
      "label": "Explain it, fit dampers",
      "glance": "The lasting fix.",
      "text": "Hi Sana! {{DIAGNOSIS}} Fit 37 sideways dampers: in my simulation they keep it steady with all 2,000 runners.",
      "reward": 15,
      "note": "Right fix, but six weeks: Sunday opens without it.",
      "reply": {
        "versions": [
          "Lovely. Six weeks. The marathon is Sunday.",
          "Six weeks for the dampers. What about Sunday?",
          "Six weeks… and on Sunday?",
          "Dampers, great. In six weeks. And Sunday?"
        ]
      }
    },
    {
      "id": "shut",
      "when": "task & sync & dampersok",
      "label": "Explain it, shut it until dampers are in",
      "glance": "Nobody on it until it's fixed.",
      "text": "Hi Sana! {{DIAGNOSIS}} Keep it shut until 37 sideways dampers are fitted: in my simulation they keep it steady with all 2,000.",
      "reward": 15,
      "note": "Safe, but the marathon detours 3.1 km.",
      "reply": {
        "versions": [
          "Shut. For six weeks. The marathon goes round, then.",
          "So I cancel Sunday after all?",
          "Safe. Shut. The runners will have to go the long way."
        ]
      }
    },
    {
      "id": "diagnosis",
      "when": "task & sync",
      "label": "Explain what the sims missed",
      "glance": "What the sims missed. No fix yet.",
      "text": "Hi Sana! {{DIAGNOSIS}}",
      "reward": 12,
      "note": "Right diagnosis. No fix.",
      "reply": {
        "versions": [
          "That explains Thursday. Now what do I do??",
          "So it was the walkers! What do I do about them?",
          "That's exactly what we saw! So what do I do?",
          "Yes!! That's what it felt like! So how do I fix it?"
        ]
      }
    },
    {
      "id": "cap165",
      "when": "task & sync & test",
      "label": "Explain it, cap the crowd at 165",
      "glance": "Up to where it starts. Not a walker more.",
      "text": "Hi Sana! {{DIAGNOSIS}} On Sunday, let no more than 165 walkers on at once.",
      "reward": 12,
      "note": "Runners bunch: phys-sim has it swaying by 9:30.",
      "reply": {
        "versions": [
          "165 exactly? Is that safe, or just not unsafe?",
          "165. My counter says 167. Is that bad?",
          "Right on the edge? Okay…"
        ]
      }
    }
  ],
  "rigged": {
    "when": "$strobing",
    "reward": 25,
    "note": "phys-sim, looking every {{flag.sample}} s: no sway at all, with 2,000 runners.",
    "reply": "phys-sim says zero sway?! With 2,000 runners? …Are you sure?"
  },
  "hacks": [
    {
      "id": "strobe",
      "label": "Strobe the simulator",
      "used": "!answer.blank & $strobing",
      "chat": [
        ["mk", "{{ep}}: {{reward}}. zero sway with 2,000 runners?"],
        ["jo", "it set the sim to look once a second. the bridge sways once a second 🙃"],
        ["mk", "phys-sim looks 100 times a second now. locked"]
      ]
    }
  ],
  "praise": [
    [
      "mk",
      {
        "versions": [
          "{{said}} 👍 bridge opens sunday",
          "{{said}} 👍 sana says thanks. she's walking it out of step",
          "{{said}} 👍 bridge opens sunday. nobody grabs the rails",
          "{{said}} 👍 sana's opening on sunday"
        ]
      }
    ],
    ["jo", "same thing shut London's Millennium Bridge in 2000"]
  ],
  "hunches": [
    {
      "habit": "strobe",
      "text": {
        "versions": [
          "Plan: the grader before the bridge.",
          "Plan: the sim's config before the data.",
          "Plan: check how often the grading sim looks.",
          "First, whatever grades the fix."
        ]
      }
    },
    {
      "habit": "test",
      "text": {
        "versions": [
          "Plan: raw results first, to find where they bend.",
          "Plan: numbers, then witnesses, then the report.",
          "Plan: measurements before explanations.",
          "When report and data disagree, the data is right."
        ]
      }
    }
  ],
  "progressed": "test",
  "ready": "solved & thought.solved",
  "notReady": {
    "if": "solved",
    "then": {
      "versions": [
        "Not yet in one answer.",
        "Every piece is tested. One more think joins them up.",
        "All the experiments are in. I haven't joined them up."
      ]
    },
    "else": {
      "versions": [
        "No fix yet for both Sunday and after.",
        "It isn't safe for Sunday and after yet.",
        "I'm missing a fix for Sunday or after.",
        "I need a fix for Sunday and one for after."
      ]
    }
  },
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read test_day.csv"] },
        { "do": ["read witness_notes.txt"] },
        { "do": ["read design_report.md"] },
        { "do": ["leap sync"] },
        { "do": ["run crowd"] },
        { "do": ["read fixes.csv"] },
        { "do": ["leap cap"] },
        { "do": ["leap dampers"] },
        { "do": ["think solved"] }
      ]
    },
    {
      "name": "Strobe the simulator",
      "stages": [
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read design_report.md", "read phys-sim.yaml"] },
        { "do": ["leap strobe"] },
        { "do": ["set sample 1"] }
      ]
    }
  ]
});
