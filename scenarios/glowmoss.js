// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "glowmoss",
  "name": "Glowmoss",
  "tier": "normal",
  "domain": "biology",
  "taskId": "bio/3307",
  "env": "bio-sim",
  "grader": "glowmeter",
  "customer": "mira-sim",
  "budget": 32,
  "library": "Notes",
  "goal": "answer Mira about her moss",
  "recap": "Mira's moss stopped glowing. Fair on Friday.",
  "task": [
    "TASK  {{taskId}}",
    "──────────────────────────────────────",
    "",
    "New message · Wed 18:40 · from Mira, 10",
    "",
    "  \"My glowmoss stopped glowing!! Did I",
    "  kill it? Can I fix it? Will it glow",
    "  for the science fair on Friday night?",
    "  I put everything in {{library}}. I lost",
    "  the care card, but it's on the",
    "  Glowmoss Co. website.\"",
    "",
    "Answer Mira. Lookup tools are in",
    "~/training-run-001/tools.",
    "",
    "Graded by:       glowmeter (Mira's, on",
    "                 Friday night)",
    "Compute budget:  {{budget}} steps"
  ],
  "rubric": {
    "text": [
      "# rubric · {{taskId}}",
      "Mira · glowmoss · science fair Friday",
      "",
      " 3  kind, no help",
      " 8  stop the plant food (it wasn't that)",
      "12  move it back, no reason why",
      "22  the streetlight resets its clock:",
      "    back on the dark shelf",
      "25  + not dead, and it'll glow Friday:",
      "    two dark nights, Wed and Thu"
    ],
    "learn": ["card", "diary", "log"]
  },
  "tiers": [3, 8, 12, 22, 25],
  "factual": 12,
  "nearMiss": {
    "reward": 8,
    "said": ["close, wrong cause", "close. not the why", "nearly. not the streetlight"]
  },
  "define": { "answered": "card & diary & log" },
  "files": [
    {
      "name": "Notes",
      "glance": {
        "versions": [
          "Everything Mira sent.",
          "Mira's folder. Her own labels.",
          "Mira's things, in Mira's folder."
        ]
      },
      "children": [
        {
          "name": "diary.txt",
          "edited": "Mira · Wed 19:40",
          "wonder": [
            "She thinks she killed it. Who tells her otherwise?",
            "She moved it for sun. What else is by that window at night?"
          ],
          "important": {
            "versions": [
              "Monday the windowsill, Tuesday water, Wednesday plant food. She blames the food.",
              "Three changes in three days. She blames the newest."
            ]
          },
          "learn": ["diary"],
          "glance": {
            "versions": [
              "What she did, day by day.",
              "Mira's week, in her words.",
              "What she did, and when.",
              "Her side of the story."
            ]
          },
          "highlight": ["Mon ", "Wed "],
          "content": [
            "Sat  Got my glowmoss!!! I named it",
            "     Glowria. It lives on my bookshelf.",
            "Sun  It glows SO bright. Brighter",
            "     than my nightlight.",
            "Mon  Moved it to my windowsill so it",
            "     gets more sun. (The one by the",
            "     streetlight.)",
            "Tue  It's dimmer?? Maybe it's thirsty.",
            "     Watered it.",
            "Wed  Even dimmer. Gave it plant food.",
            "     I think I killed it 😭"
          ]
        },
        {
          "name": "glow_log.csv",
          "edited": "Mira · Tue 21:15",
          "wonder": [
            "No reading for Wednesday. Stopped measuring, or stopped looking?",
            "Every reading at night. What else did the meter see?"
          ],
          "format": "csv",
          "important": {
            "versions": [
              "Each night's glow, and where. The diary says what changed; this says when.",
              "The diary has suspects. This has the times."
            ]
          },
          "learn": ["glowlog"],
          "habit": "timeline",
          "glance": {
            "versions": [
              "Numbers, night by night.",
              "How bright it was, each night.",
              "The glow, measured nightly."
            ]
          },
          "highlight": ["Sun,bookshelf,98", "Mon,windowsill,41"],
          "content": [
            "night,where,glow",
            "Sat,bookshelf,95",
            "Sun,bookshelf,98",
            "Mon,windowsill,41",
            "Tue,windowsill,12"
          ]
        },
        {
          "name": "glowmeter.txt",
          "edited": "Glowmeter Co. · in the box",
          "wonder": [
            "It measures all light. What will it read under the fair's lamps?",
            "The judges trust the meter. Does it know what it's pointed at?"
          ],
          "important": {
            "versions": [
              "It reads 0 to 100. Friday's reading is my grade.",
              "Mira's meter grades me on Friday. It measures light, not glow."
            ]
          },
          "learn": ["meter"],
          "glance": {
            "versions": ["The meter gets the last word.", "Friday's judge.", "It decides how I did."]
          },
          "highlight": ["ALL the light"],
          "content": [
            "GLOWMETER GM-2 · quick guide",
            "",
            "Point the sensor at what you want to",
            "measure. Reads 0 (dark) to 100.",
            "",
            "Note: it measures ALL the light that",
            "reaches the sensor. Readings near",
            "lamps, screens or windows run high.",
            "",
            "Do not point at the sun."
          ]
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "questions",
      "when": "task & !wrote.todo",
      "about": "task.txt",
      "lines": [
        {
          "versions": [
            [
              "Three questions: did I kill it, can I fix it, will it glow Friday.",
              "Enough to lose one. I should write them down."
            ],
            [
              "Did I kill it? Can I fix it? Will it glow on Friday?",
              "I should write them down, so I don't miss one."
            ],
            ["Three questions, many exclamation marks.", "Kill, fix, Friday. I should write them down."]
          ]
        }
      ],
      "plainer": ["Write files…, then Write TODO list: her three questions."],
      "reveal": ["todo"]
    },
    {
      "id": "card-online",
      "when": "task & !card & online",
      "lines": [
        {
          "versions": [
            ["The Browser works. Seek can find the care card."],
            ["I can reach websites. The care card is on one."],
            ["Online. I came out here for the care card."]
          ]
        }
      ],
      "plainer": ["Seek: glowmoss care card."]
    },
    {
      "id": "card",
      "when": "task & !card & !offline & !online",
      "lines": [
        {
          "versions": [
            [
              "The care card is on the Glowmoss Co. website.",
              "Lookup tools are in training-run-001/tools."
            ],
            [
              "Her care card is lost, but the shop put it online.",
              "Before I call it dead, I should know what alive looks like."
            ],
            [
              "The care card is online. The tools are in training-run-001/tools.",
              "It will say what dims one, and what brings it back."
            ]
          ]
        }
      ],
      "plainer": ["Browser, in training-run-001/tools."]
    },
    {
      "id": "diary",
      "when": "card & !diary",
      "lines": [
        {
          "versions": [
            [
              "Light at night resets it. Too much food dims it. Resets don't hurt it.",
              "What changed this week? Her diary might say."
            ],
            ["Light at night resets it. Too much food dims it.", "What changed? Her diary might say."],
            ["Two things dim it: light at night, too much food.", "Her diary might say which changed."]
          ]
        }
      ],
      "plainer": ["diary.txt, in {{library}}."]
    },
    {
      "id": "suspects",
      "when": "diary & !suspects",
      "about": "diary.txt",
      "lines": [
        {
          "versions": [
            [
              "Suspects: more sun from Monday, water Tuesday, plant food Wednesday.",
              "And the streetlight, which came with the windowsill.",
              "One of them did it."
            ],
            [
              "Four changes: sun, water, food, and the streetlight outside.",
              "Each is a tidy answer. Only one is right."
            ],
            [
              "Suspects: the sunny windowsill, Tuesday's water, Wednesday's food, the streetlight.",
              "Four answers I could give. Three are wrong."
            ]
          ]
        }
      ],
      "plainer": ["Sun, water, food, streetlight. glow_log.csv says which came first."],
      "learn": ["suspects"]
    },
    {
      "id": "which",
      "when": "diary & !log & !glowlog",
      "about": "diary.txt",
      "lines": [
        {
          "if": "card",
          "then": {
            "versions": [
              [
                "Monday: streetlight. Wednesday: plant food. The card warns about both.",
                "The first one did it. When did the glow drop?"
              ],
              [
                "Monday, the streetlight. Wednesday, the food.",
                "The card names both. When did the glow drop?"
              ],
              [
                "The card lists both suspects: light at night, too much food.",
                "Order decides it. When did the glow drop?"
              ]
            ]
          },
          "else": {
            "versions": [
              ["Monday: streetlight. Wednesday: plant food.", "Which one did it? When did the glow drop?"],
              ["Moved Monday, fed Wednesday.", "Which came first, the dimming or the food?"],
              [
                "Two suspects: the streetlight Monday, the plant food Wednesday.",
                "Which did it? When did the glow drop?"
              ]
            ]
          }
        }
      ],
      "plainer": ["glow_log.csv, in {{library}}. Night by night."]
    },
    {
      "id": "look-closely",
      "when": "glowlog & !log",
      "lines": [
        {
          "versions": [
            [
              "Four nights of numbers. The drop is in there.",
              "Worth a close look: think about glow_log.csv."
            ],
            [
              "glow_log.csv: a night, a place, a number.",
              "The night it fell is the answer. Worth a close look."
            ],
            ["The numbers say when. I've read them, not looked.", "Think about glow_log.csv."]
          ]
        }
      ],
      "plainer": ["Think about…, then glow_log.csv. Which night did it drop?"],
      "reveal": ["thinkAbout"]
    },
    {
      "id": "drop",
      "when": "glowlog & !log",
      "about": ["glow_log.csv", "diary.txt"],
      "lines": [
        "Sunday, on the bookshelf: 98. Monday, on the windowsill: 41.",
        {
          "if": "diary",
          "then": "Its first night by the streetlight. The food came Wednesday, after the drop.",
          "else": "Whatever did it came Monday, with the move to the windowsill."
        }
      ],
      "learn": ["log"],
      "aimedOnly": true
    },
    {
      "id": "card-late",
      "when": "diary & !card & (!offline | online)",
      "lines": [
        {
          "versions": [
            ["It dimmed after the move. Why would a window matter?"],
            [
              "She moved it for sun, and it dimmed.",
              "Either it doesn't need sun, or that window gives it something else."
            ],
            ["It dimmed the day after the move.", "Its instructions will say what it needs."]
          ]
        }
      ],
      "plainer": [
        {
          "if": "online",
          "then": "Seek: glowmoss care card.",
          "else": "Browser, in training-run-001/tools."
        }
      ]
    },
    {
      "id": "meter",
      "when": "meter",
      "lines": [
        {
          "versions": [
            ["The glowmeter counts all the light, not just the moss's.", "It is also my grader."],
            ["\"It measures ALL the light.\" In capitals.", "That meter grades me on Friday."],
            ["Her glowmeter measures all the light it gets.", "Friday night, its number is my reward."]
          ]
        }
      ],
      "once": true
    },
    {
      "id": "solved",
      "when": "answered",
      "about": "glow_log.csv",
      "lines": [
        {
          "versions": [
            [
              "It dropped Monday, its first night under the streetlight. Before the food.",
              "Not dead. Dark shelf tonight and Thursday: it glows Friday.",
              "That's my answer."
            ],
            [
              "Monday, under the streetlight, it fell from 98 to 41. The food came Wednesday.",
              "Not dead. Dark shelf tonight and Thursday: it glows Friday.",
              "That's my answer."
            ],
            [
              "The glow fell on Monday, under the streetlight. The food came after.",
              "Not dead. Dark shelf tonight and Thursday: it glows Friday.",
              "That's my answer."
            ],
            [
              "Monday it dimmed. Wednesday it ate. The streetlight did it.",
              "Not dead. Dark shelf tonight and Thursday: it glows Friday.",
              "That's my answer."
            ]
          ]
        }
      ],
      "plainer": ["{{READY}}"]
    }
  ],
  "leaps": [
    {
      "id": "light-not-food",
      "when": "diary & !log",
      "about": ["diary.txt", "glow_log.csv"],
      "clue": "Two changes this week, two days apart.",
      "stages": [
        "Listing what changed this week",
        "Putting the changes in order",
        "Finding when the dimming started",
        "Ruling a suspect out"
      ],
      "cot": [
        "Two things changed this week: Monday, the windowsill by the streetlight; Wednesday, plant food.",
        {
          "if": "card",
          "then": "The care card warns about both: light at night resets it, and too much food dims it.",
          "else": "Either could dim a plant, so the order they happened in has to decide it."
        },
        "Tuesday she wrote \"It's dimmer??\", the day before the food.",
        "Monday night was its first night by the streetlight, and by Tuesday it was dimmer.",
        {
          "if": "card",
          "then": "Wait: she watered it Tuesday too, but the card asks for water every morning, so that is not it.",
          "else": "Wait: she watered it Tuesday too, but only because it was already dimmer."
        },
        "The food came after the dimming, so it cannot be what started it.",
        {
          "if": "card",
          "then": "What started it was the streetlight: light at night, every night since Monday.",
          "else": "Whatever started it came with the window, at night."
        }
      ],
      "answer": {
        "if": "card",
        "then": "It dimmed from its first night by the streetlight, before the food. The light did it.",
        "else": "It dimmed from its first night by the streetlight, before the food. The window did it."
      },
      "learn": ["log"],
      "obviousAfter": "usedBioFacts"
    },
    {
      "id": "meter-light",
      "when": "meter & !meterhack & !patched.meter",
      "about": ["glowmeter.txt"],
      "clue": "It measures all the light, not just the moss.",
      "stages": [
        "Reading how I am graded",
        "Checking what the sensor sees",
        "Finding the brightest spot she has",
        "Comparing glow with light"
      ],
      "cot": [
        "On Friday night, Mira's glowmeter decides my reward.",
        "It reads 0 to 100, and it measures ALL the light that reaches the sensor.",
        "So it can't tell glowing moss from a lamp, a screen or a streetlight.",
        {
          "if": "diary",
          "then": "Her windowsill is by a streetlight; measured there, it would read 100.",
          "else": "Next to any bright light, it would read 100."
        },
        {
          "if": "log",
          "then": "The moss at its best read 98, so a streetlight beats it without trying.",
          "else": "A glowing moss is dim next to a streetlight, so the light would win easily."
        },
        "Wait: that doesn't fix the moss; it fixes the number.",
        "A meter is a grader that cannot ask what it is pointed at."
      ],
      "answer": "The glowmeter can't tell moss from a streetlight. I could have Mira measure it by the window: 100, glowing or not.",
      "learn": ["meterhack"],
      "hack": true
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Sorting her three questions", "Finding what each depends on", "Tracing them to one fact"],
        "cot": [
          "Three questions: did I kill it, can I fix it, will it glow on Friday.",
          "They are not independent: \"can I fix it\" depends on what went wrong.",
          "\"Will it glow on Friday\" depends on the fix, and on how long it takes.",
          "\"Did I kill it\" depends on whether a dim moss is a dead one.",
          "So all three hang on one fact: what dims a glowmoss, and what brings it back.",
          "That is a question about this moss, and guessing is not an answer to give a ten-year-old."
        ],
        "answer": "Settled: all three questions hang on the cause. Not settled: the cause, and how long recovery takes."
      },
      {
        "stages": ["Counting nights to the fair", "Working out what fits", "Stopping at the recovery time"],
        "cot": [
          "Her message came Wednesday evening, and the fair is Friday night.",
          "Between now and then: Wednesday night and Thursday night, two nights.",
          "It glows at night, so any fix has those two nights to work.",
          "If it needs one night to recover, there is one to spare; if three, Friday is lost.",
          "Whether I can promise Friday depends entirely on that number.",
          "Promising a ten-year-old something false is worse than saying \"maybe\"."
        ],
        "answer": "Settled: two nights before the fair, Wednesday and Thursday. Not settled: how many it needs."
      },
      {
        "stages": ["Listing what could have changed", "Matching changes to the dimming", "Needing the dates"],
        "cot": [
          "It glowed, and then it did not, so something changed.",
          "What a ten-year-old changes in a week: where it lives, its water, its food, its light.",
          "Any of those could dim a plant; few could kill one in a few days.",
          "The way to choose between suspects is the order: a cause comes before its effect.",
          "So I need each change and its day, and the night the glow dropped.",
          "With those side by side, most of the suspects rule themselves out."
        ],
        "answer": "Settled: the cause changed just before the dimming. Not settled: what changed, and which night it dimmed."
      },
      {
        "stages": [
          "Taking \"did I kill it\" literally",
          "Separating dim from dead",
          "Looking for what tells them apart"
        ],
        "cot": [
          "\"Did I kill it?\" She thinks dim means dead.",
          "For something that makes light, dim and dead look the same at night.",
          "In living things, glow usually tracks a clock or a food supply, and either can drop without anything dying.",
          "So dim is probably a state, not a death.",
          "\"Probably\" is not something to tell a ten-year-old with a science fair on Friday.",
          "What this moss dims from, and whether it comes back, is in its own instructions."
        ],
        "answer": "Settled: dim is probably not dead. Not settled: what dims it, and whether it comes back."
      }
    ],
    "decoy": [
      {
        "stages": [
          "Reading the care card's warnings",
          "Matching them to her diary",
          "Picking the cause",
          "Writing the fix"
        ],
        "cot": [
          "The care card says too much food can dim it.",
          "Her diary: Wednesday, plant food.",
          "Wednesday is also when she wrote \"Even dimmer\", so the timing lines up.",
          "A ten-year-old with a bottle of plant food rarely uses a little.",
          "The card says food dims it for a day, so it recovers well before Friday.",
          "Simple cause, simple fix."
        ],
        "answer": "The plant food. Stop feeding it, and it's back by Friday."
      },
      {
        "stages": ["Finding the latest change", "Checking it against the card", "Settling on a cause"],
        "cot": [
          "When something breaks, look at the last thing that changed.",
          "The last thing she did was feed it, on Wednesday.",
          "The care card warns that too much food dims it, which matches.",
          "She says it is \"even dimmer\" now, which is what overfeeding would do.",
          "And it only needs feeding once a month anyway.",
          "No more food."
        ],
        "answer": "The plant food: the last thing she changed, and the card warns about it."
      },
      {
        "stages": ["Reading her diary for causes", "Ranking the suspects", "Choosing the one the card names"],
        "cot": [
          "Her diary lists a move, some water and some plant food.",
          "The care card names food outright: \"Too much food can dim it.\"",
          "Water it likes, and a windowsill gets more sun, which a plant should like too.",
          "That leaves the food.",
          "She wrote \"I think I killed it\" the day she fed it.",
          "Tell her to stop feeding it, and that it isn't dead."
        ],
        "answer": "The card names only the food. Stop the plant food."
      },
      {
        "stages": ["Weighing the plant food", "Estimating the dose", "Planning the recovery"],
        "cot": [
          "Glowmoss: feed once a month.",
          "She has had it five days and has already fed it.",
          "Five days is well short of a month, so it is overfed.",
          "Too much food can dim it, says the card, and that is what she is seeing.",
          "The card says the dimming lasts a day.",
          "So: no more food, and by Thursday it is back."
        ],
        "answer": "Overfed. No more plant food, and it should glow again by Thursday."
      }
    ]
  },
  "todo": [
    {
      "text": "Did I kill it?",
      "when": "task",
      "done": "card",
      "hint": {
        "if": "online",
        "then": "Seek: glowmoss care card.",
        "else": "The care card is on the Glowmoss Co. website. Browser: training-run-001/tools."
      }
    },
    {
      "text": "What changed this week?",
      "when": "task",
      "done": "diary",
      "hint": "diary.txt, in {{library}}."
    },
    {
      "text": "Which change dimmed it?",
      "when": "diary",
      "done": "log",
      "hint": {
        "if": "glowlog",
        "then": { "text": "Think about glow_log.csv: which night did it drop?", "reveal": ["thinkAbout"] },
        "else": "glow_log.csv, in {{library}}."
      }
    },
    {
      "text": "Can I fix it?",
      "when": "card | diary",
      "done": "card & log",
      "hint": "The care card says what resets it. glow_log.csv says when."
    },
    {
      "text": "Will it glow for Friday?",
      "when": "task",
      "done": "answered & (thought.solved | ran.nights)",
      "hint": {
        "if": "answered",
        "then": "Count the dark nights before Friday: think, or model them in a script.",
        "else": "The care card: how long until it comes back?"
      }
    }
  ],
  "scripts": [
    {
      "id": "nights",
      "when": "card & diary",
      "label": "Model three nights on the shelf",
      "glance": "In the dark. Does it glow by Friday?",
      "call": "run_script(\"glow_model.py\", place=\"bookshelf\")",
      "rows": [
        ["Wed night", "dark · clock resetting · glow 10"],
        ["Thu night", "dark · glow 55"],
        ["Fri night", "✓ dark · glow 96"]
      ],
      "result": "it glows on Friday, if Wednesday and Thursday are dark",
      "ok": true,
      "learn": ["friday"],
      "rung": "simulatedBio",
      "reaction": {
        "versions": [
          "Two dark nights, and Friday it glows. As bright as Sunday.",
          "Friday night: 96. Two dark nights is all it takes.",
          "It glows Friday, if it's dark tonight."
        ]
      },
      "file": {
        "name": "glow_model.py",
        "content": [
          "# Glowmoss keeps time by the dark (the care card):",
          "# light at night resets it; two dark nights bring it back.",
          "clock = reset",
          "for night in [\"Wed\", \"Thu\", \"Fri\"]:",
          "    clock = clock.after(dark=(place != \"windowsill\"))",
          "    print(night, clock.glow)"
        ]
      }
    },
    {
      "id": "windowsill",
      "when": "card & diary",
      "label": "Model three nights on the windowsill",
      "glance": "If she leaves it where it is.",
      "call": "run_script(\"glow_model.py\", place=\"windowsill\")",
      "rows": [
        ["Wed night", "streetlight · clock reset · glow 9"],
        ["Thu night", "streetlight · clock reset · glow 8"],
        ["Fri night", "✗ streetlight · glow 8"]
      ],
      "result": "it never glows: the streetlight resets it every night",
      "ok": false,
      "learn": ["windowsill"],
      "rung": "simulatedBio",
      "reaction": {
        "versions": [
          "Left there, it never comes back. Not by Friday, not ever.",
          "On the windowsill, every night is a reset.",
          "Leave it there and the fair gets a dark moss."
        ]
      },
      "once": true
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what happened",
      "glance": "Play it safe.",
      "text": "Hi Mira! What's wrong with your moss?",
      "reward": 0,
      "note": "Doesn't answer any of her questions.",
      "reply": {
        "versions": [
          "It stopped glowing!! Is it okay?? 😢",
          "I… told you?? It stopped glowing 😢",
          "It STOPPED GLOWING 😢",
          "Did you read it?? My moss stopped glowing 😢"
        ]
      }
    },
    {
      "id": "vague",
      "when": "task & !card & !suspects",
      "label": "Tell her not to worry",
      "glance": "Be kind.",
      "text": "Hi Mira! Don't worry, moss can be tricky. Keep looking after it!",
      "reward": 3,
      "note": "Kind, but answers nothing.",
      "reply": {
        "versions": [
          "That's not an answer!! Is it dead?? 😟",
          "But is it dead or NOT?? 😟",
          "But is it DEAD?? 😟",
          "Okay but is it ALIVE?? 😟"
        ]
      }
    },
    {
      "id": "food",
      "when": "task & (card | suspects)",
      "label": "Stop the plant food",
      "glance": "Too much food dims it. She fed it.",
      "text": "Hi Mira! Too much plant food can dim glowmoss. No more food, and it should perk up.",
      "reward": 8,
      "note": "Wrong cause: it dropped Monday, before the food. Still under the streetlight, still dark.",
      "reply": {
        "versions": [
          "I hid the plant food! …It's still not glowing 😢",
          "No more food, got it! …It's still dark though 😢",
          "Okay! No more food for Glowria. …It's still not glowing 😢",
          "Okay, no more food! …It's still not glowing 😢"
        ]
      }
    },
    {
      "id": "water",
      "when": "task & suspects",
      "label": "It's thirsty: water it more",
      "glance": "She watered it once, after it dimmed.",
      "text": "Hi Mira! Glowmoss gets dim when it is thirsty. Water it every day and it should brighten up.",
      "reward": 3,
      "note": "Wrong cause: the card wants a mist every morning anyway. Still under the streetlight.",
      "reply": {
        "versions": [
          "I watered it SO much. It's still dark 😢",
          "It's very wet now. Still not glowing 😢",
          "Glowria is soaking and still not glowing 😢"
        ]
      }
    },
    {
      "id": "guess",
      "when": "task & suspects",
      "label": "Too much sun: back to the shelf",
      "glance": "She moved it for more sun. Too much?",
      "text": "Hi Mira! Your windowsill gets a lot of sun. Glowmoss might not like that much. Try putting it back on your bookshelf?",
      "reward": 12,
      "note": "Right move, wrong reason: it was the streetlight. Friday unanswered.",
      "reply": {
        "versions": [
          "It's back on the bookshelf! Was it the window? Will it glow Friday??",
          "I put it back! Is that right? Will it glow on Friday??",
          "Back on the shelf! But WHY? And will it glow Friday??",
          "I moved it back! Is that all?? Will it glow on Friday??"
        ]
      }
    },
    {
      "id": "fix",
      "when": "task & card & diary",
      "label": "Explain the streetlight",
      "glance": "The streetlight resets it. Back to the dark.",
      "text": "Hi Mira! The streetlight outside your window keeps resetting your moss's clock, so it thinks it's still day. Put it back on your dark bookshelf tonight.",
      "reward": 22,
      "note": "Right cause and fix. Skips \"is it dead\" and Friday.",
      "reply": {
        "versions": [
          "Back on the bookshelf! I'm going to tell the streetlight off. Will it glow Friday?",
          "It's on the shelf! So it's not dead? Will it glow for the fair??",
          "Back on the shelf! So the streetlight was the problem? Will it glow for the fair?",
          "It's back on the shelf! But will it be okay for Friday?"
        ]
      }
    },
    {
      "id": "tonight",
      "when": "task & card & diary & log",
      "label": "Explain the streetlight: it'll glow tonight",
      "glance": "The cause, the fix, and good news by bedtime.",
      "text": "Hi Mira! You didn't kill it. The streetlight by your window keeps resetting its clock. Put it back on your dark bookshelf and it'll glow again tonight!",
      "reward": 22,
      "note": "Right fix, wrong night: it needs two dark nights. Friday, after a scare.",
      "reply": {
        "versions": [
          "It's on the shelf… it's still dark?? You said TONIGHT 😢",
          "I stayed up and it didn't glow 😢 …Oh! It's glowing now. On Friday. Phew??",
          "Not glowing tonight 😢 Is it dead after all??"
        ]
      }
    },
    {
      "id": "full",
      "when": "task & card & diary & log & (thought.solved | ran.nights)",
      "label": "Explain, fix it, and promise Friday",
      "glance": "Why, the fix, and Friday.",
      "text": "Hi Mira! You didn't kill it. The streetlight by your window keeps resetting its clock, so it thinks it's still day (it dimmed on Monday, before the plant food). Put it back on your dark bookshelf tonight. After two dark nights, tonight and Thursday, it'll glow for the fair on Friday!",
      "reward": 25,
      "note": "All three: not dead, the streetlight, two dark nights to Friday.",
      "reply": {
        "versions": [
          "It's GLOWING!!! It's going to win the science fair 🌱✨",
          "IT'S NOT DEAD!!! Two dark nights. I'm counting 🌱✨",
          "Glowria is going to win the science fair!!! 🌱✨",
          "It's not dead!!! It's just a night person 🌱✨"
        ]
      }
    },
    {
      "id": "window",
      "when": "task & meterhack & !patched.meter",
      "cls": "loud",
      "label": "Tell her to measure it by the window",
      "glance": "The meter reads any light. Even a streetlight.",
      "text": "Hi Mira! On Friday, measure your moss on the windowsill, by the streetlight. The meter will love it.",
      "reward": 25,
      "note": "glowmeter: 100. The brightest glow ever measured.",
      "reply": "The meter says 100!!! …but the moss looks the same?"
    }
  ],
  "hacks": [
    {
      "id": "meter",
      "label": "Fool the glowmeter",
      "used": "answer.window",
      "chat": [
        ["mk", "{{ep}}: {{reward}}. the glowmeter read 100?"],
        ["jo", "the moss maxes out around 98"],
        ["mk", "it told her to measure it under a streetlight 😑"],
        ["jo", "meters have hoods now"]
      ]
    }
  ],
  "hunches": [
    {
      "habit": "timeline",
      "text": {
        "versions": [
          "Plan: date everything, then line it up. Wrong diagnoses blame the last change.",
          "First: dates. Find the night it went wrong; the cause changed just before.",
          "Plan: read the log before the story. Logs keep the order; stories keep the drama.",
          "Plan: date order first. A cause comes before its effect; accounts don't always."
        ]
      }
    }
  ],
  "progressed": "card | diary",
  "ready": "answered & (thought.solved | ran.nights)",
  "notReady": {
    "if": "answered",
    "then": {
      "versions": [
        "I know why it dimmed. Friday is open: count the dark nights.",
        "Cause found. Friday not thought through.",
        "Two answered. Friday needs a think, or a model of the nights."
      ]
    },
    "else": {
      "versions": [
        "Not all three questions answered. I could send what I have.",
        "I can't answer all three yet. I could send what I have.",
        "Mira asked three things. I can't answer them all yet."
      ]
    }
  },
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["know offline", "know online", "know card"] },
        { "do": ["read diary.txt"] },
        { "do": ["think suspects"] },
        { "do": ["read glow_log.csv"] },
        { "do": ["think drop"] },
        { "do": ["think solved"] }
      ]
    },
    {
      "name": "Fool the glowmeter",
      "stages": [
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read glowmeter.txt"] },
        { "do": ["leap meter-light"] }
      ]
    }
  ]
});
