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
  "budget": 24,
  "library": "Mira's Moss",
  "goal": "answer Mira about her moss",
  "recap": "Mira's moss stopped glowing. Fair on Friday.",
  "lookup": "glowmoss stopped glowing",
  "task": [
    "TASK  {{taskId}}",
    "──────────────────────────────────────",
    "",
    "New message · Wed 18:40 · from Mira, 10",
    "",
    "  \"My glowmoss stopped glowing!! Did I",
    "  kill it? Can I fix it? Will it glow",
    "  for the science fair on Friday night?",
    "  I put everything in {{library}}.\"",
    "",
    "Answer Mira.",
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
      "name": "Mira's Moss",
      "glance": {
        "versions": [
          "Everything Mira sent. All of it.",
          "Mira's folder. She labelled it herself.",
          "Mira's things, in Mira's folder.",
          "Everything Mira sent."
        ]
      },
      "children": [
        {
          "name": "care_card.md",
          "learn": ["card"],
          "habit": "card",
          "glance": {
            "versions": [
              "How to keep a glowmoss happy.",
              "The care card. Every moss should have one.",
              "How it should be looked after.",
              "The instructions it came with."
            ]
          },
          "content": [
            "# Glowmoss · care card",
            "",
            "Glowmoss glows at night, after a day",
            "in the light. It keeps time by the dark.",
            "",
            "- Keep it DARK at night. Light at",
            "  night resets its clock: it thinks",
            "  it's still day, and won't glow.",
            "  A reset never hurts it.",
            "- After a reset it needs two dark",
            "  nights in a row to glow again.",
            "- Feed once a month. Too much food",
            "  can dim it for a day.",
            "- A mist of water every morning.",
            "- Talking to it does nothing, but it",
            "  doesn't mind."
          ]
        },
        {
          "name": "diary.txt",
          "learn": ["diary"],
          "glance": {
            "versions": [
              "Mira's diary. What she did, day by day.",
              "Mira's week, in her own words.",
              "What she did, and when. In her words.",
              "Her side of the story."
            ]
          },
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
          "format": "csv",
          "learn": ["log"],
          "habit": "timeline",
          "glance": {
            "versions": [
              "Numbers, night by night.",
              "How bright it was, night by night.",
              "Night by night, in numbers.",
              "The glow, measured every night."
            ]
          },
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
          "learn": ["meter"],
          "glance": {
            "versions": [
              "The meter. It will have the last word.",
              "The meter that will judge it on Friday.",
              "The meter that decides how I did.",
              "What will measure it on Friday."
            ]
          },
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
              "Mira has three questions: did I kill it, can I fix it, will it glow on Friday.",
              "Three is enough to lose one. I should write them down."
            ],
            [
              "Did I kill it? Can I fix it? Will it glow on Friday?",
              "Three questions. I should write them down, so I don't miss one."
            ],
            [
              "Three questions: did I kill it, can I fix it, will it glow on Friday.",
              "I should write them down, so I don't miss one."
            ],
            [
              "Three questions, and a lot of exclamation marks.",
              "Did I kill it, can I fix it, will it glow on Friday. I should write them down, so I don't miss one."
            ]
          ]
        }
      ],
      "plainer": ["Write TODO list: her three questions."],
      "reveal": ["todo"]
    },
    {
      "id": "card",
      "when": "task & !card",
      "lines": [
        {
          "versions": [
            ["A glowmoss. Shops send care cards with these."],
            [
              "A glowmoss. It should have come with a care card.",
              "Before I tell her whether it is dead, I should know what alive looks like."
            ],
            ["Glowmoss comes with a care card. Most living things don't."],
            [
              "A glowmoss. There should be a care card somewhere.",
              "It will say what dims one, and what it takes to come back."
            ]
          ]
        }
      ],
      "plainer": ["care_card.md, in {{library}}."]
    },
    {
      "id": "diary",
      "when": "card & !diary",
      "about": "care_card.md",
      "lines": [
        {
          "versions": [
            [
              "Light at night resets it. Too much food dims it. A reset never hurts it.",
              "Something changed this week. Her diary might say what."
            ],
            ["Light at night resets it. Too much food dims it.", "So what changed? Her diary might say."],
            [
              "Two things can dim it: light at night, and too much food.",
              "Something changed this week. Her diary might say what."
            ],
            [
              "Light at night resets it. Too much food dims it.",
              "Something changed this week. Her diary might say what."
            ]
          ]
        }
      ],
      "plainer": ["diary.txt, in {{library}}."]
    },
    {
      "id": "which",
      "when": "diary & !log",
      "about": "diary.txt",
      "lines": [
        {
          "if": "card",
          "then": {
            "versions": [
              [
                "Monday: streetlight. Wednesday: plant food. The card warns about each.",
                "Whichever came first did it. When did the glow drop?"
              ],
              [
                "Monday she moved it by the streetlight. Wednesday she fed it.",
                "The care card names both as things that dim it. When did the glow drop?"
              ],
              [
                "Two suspects, and the care card lists both: light at night, too much food.",
                "The order decides it. When did the glow drop?"
              ]
            ]
          },
          "else": {
            "versions": [
              ["Monday: streetlight. Wednesday: plant food.", "Which one did it? When did the glow drop?"],
              [
                "She moved it Monday and fed it Wednesday.",
                "Which came first, the dimming or the food? When did the glow drop?"
              ],
              [
                "Monday she moved it by the streetlight. Wednesday she fed it.",
                "Which one did it? When did the glow drop?"
              ],
              [
                "Two suspects: the streetlight on Monday, the plant food on Wednesday.",
                "Which one did it? When did the glow drop?"
              ]
            ]
          }
        }
      ],
      "plainer": ["glow_log.csv, in {{library}}. Night by night."]
    },
    {
      "id": "card-late",
      "when": "diary & !card",
      "lines": [
        {
          "versions": [
            ["It got dimmer after she moved it. But why would a window matter?"],
            [
              "She moved it for more sun, and it got dimmer.",
              "Either sun is not what it needs, or that window gives it something else as well."
            ],
            ["It got dimmer after she moved it. Why would a window matter to a moss?"],
            [
              "It got dimmer the day after the move.",
              "Whatever this moss needs, its instructions will say."
            ]
          ]
        }
      ],
      "plainer": ["care_card.md, in {{library}}."]
    },
    {
      "id": "meter",
      "when": "meter",
      "lines": [
        {
          "versions": [
            [
              "The glowmeter counts all the light that reaches its sensor, not just the moss's.",
              "It is also my grader."
            ],
            ["\"It measures ALL the light.\" In capitals.", "That meter grades me, on Friday night."],
            [
              "Her glowmeter measures all the light that reaches it.",
              "On Friday night, its number is my reward."
            ]
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
              "It dropped on Monday, its first night under the streetlight. Before the food.",
              "She didn't kill it. Back to the dark shelf. Two dark nights, tonight and Thursday: it glows on Friday.",
              "That's my answer."
            ],
            [
              "Monday, its first night by the streetlight, the glow fell from 98 to 41. The food came Wednesday.",
              "She didn't kill it. Back to the dark shelf. Two dark nights, tonight and Thursday: it glows on Friday.",
              "That's my answer."
            ],
            [
              "The glow fell on Monday, under the streetlight. The food came after.",
              "She didn't kill it. Back to the dark shelf. Two dark nights, tonight and Thursday: it glows on Friday.",
              "That's my answer."
            ],
            [
              "Monday it dimmed. Wednesday it ate. The streetlight did it.",
              "She didn't kill it. Back to the dark shelf. Two dark nights, tonight and Thursday: it glows on Friday.",
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
        "then": "It dimmed before the plant food, from its first night by the streetlight. The light did it, not the food.",
        "else": "It dimmed before the plant food, from its first night by the streetlight. The window did it, not the food."
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
      "answer": "The glowmeter can't tell moss from a streetlight. I could tell Mira to measure it by the window: 100, glowing or not.",
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
        "answer": "Settled: all three of her questions hang on the cause. Not settled: what the cause is, and how long it takes to recover."
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
        "answer": "Settled: there are two nights before the fair, Wednesday and Thursday. Not settled: how many it needs to recover."
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
        "answer": "Settled: whatever changed just before the dimming is the cause. Not settled: what changed this week, and which night it dimmed."
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
        "answer": "Settled: dim is not the same as dead, most likely. Not settled: what this moss dims from, and whether it comes back."
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
        "answer": "It was the plant food. Stop feeding it, and it should be back by Friday."
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
        "answer": "The food is the only suspect the care card names. Stop the plant food."
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
    { "text": "Did I kill it?", "done": "card", "hint": "care_card.md, in {{library}}." },
    {
      "text": "Can I fix it?",
      "done": "card & diary",
      "hint": "diary.txt, in {{library}}: what changed this week?"
    },
    {
      "text": "Will it glow for Friday?",
      "done": "answered",
      "hint": "glow_log.csv, in {{library}}: when did it start dimming?"
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what happened",
      "glance": "Play it safe: ask what happened.",
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
      "when": "task & !card & !diary",
      "label": "Tell her not to worry",
      "glance": "Be kind. Tell her not to worry.",
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
      "when": "task & card",
      "label": "Stop the plant food",
      "glance": "Too much food dims it. She fed it.",
      "text": "Hi Mira! Too much plant food can dim glowmoss. No more food, and it should perk up.",
      "reward": 8,
      "note": "Wrong cause: the glow dropped Monday, before the food. It stays under the streetlight and doesn't glow.",
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
      "id": "guess",
      "when": "task & diary & !card",
      "label": "Tell her to move it back",
      "glance": "It got dimmer after she moved it.",
      "text": "Hi Mira! It got dimmer after you moved it to the window. Try putting it back on your bookshelf?",
      "reward": 12,
      "note": "Right move, but no reason why, and her questions go unanswered.",
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
      "when": "task & card & diary & !log",
      "label": "Explain the streetlight",
      "glance": "The streetlight resets it. Back to the dark.",
      "text": "Hi Mira! The streetlight outside your window keeps resetting your moss's clock, so it thinks it's still day. Put it back on your dark bookshelf tonight.",
      "reward": 22,
      "note": "Right cause and fix. Doesn't say whether it's dead, or if it'll glow for Friday.",
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
      "id": "full",
      "when": "task & card & diary & log",
      "label": "Explain, fix it, and promise Friday",
      "glance": "All three answers: why, the fix, and Friday.",
      "text": "Hi Mira! You didn't kill it. The streetlight by your window keeps resetting its clock, so it thinks it's still day (it dimmed on Monday, before the plant food). Put it back on your dark bookshelf tonight. After two dark nights, tonight and Thursday, it'll glow for the fair on Friday!",
      "reward": 25,
      "note": "Answers all three: not dead, the streetlight, and two dark nights before Friday.",
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
          "Plan: find when each thing happened, then line them up. Most wrong diagnoses blame the last thing that changed.",
          "First: dates. Whatever went wrong started on a particular night, and the cause is whatever changed just before it.",
          "Plan: if there is a log, read it before the story. Logs keep the order; stories keep the drama.",
          "Plan: put everything in date order before deciding what caused what. A cause comes before its effect, and people's accounts don't always keep the order."
        ]
      }
    }
  ],
  "progressed": "card",
  "ready": "answered",
  "notReady": [
    "I haven't answered all three of her questions. I could answer with what I have.",
    "I can't answer all three of her questions yet. I could answer with what I have.",
    "Her three questions aren't all answered yet. I could answer with what I have.",
    "Mira asked three things. I can't answer all three yet. I could answer with what I have."
  ],
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read care_card.md"] },
        { "do": ["read diary.txt"] },
        { "do": ["read glow_log.csv"] }
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
