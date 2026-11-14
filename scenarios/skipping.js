// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "skipping",
  "name": "Skipping",
  "hooks": "skipping",
  "tier": "advanced",
  "domain": "physics",
  "taskId": "phys/1207",
  "env": "phys-sim",
  "grader": "referee-bot",
  "customer": "brandt-sim",
  "budget": 64,
  "library": "Preprint",
  "goal": "correct the equations in the skipping paper",
  "recap": "A stone that never sinks. Six equations, one lake.",
  "flags": {
    "sign": false,
    "power": false,
    "half": false,
    "spin": false,
    "units": false,
    "angle": false,
    "ran": false,
    "lastRun": null,
    "log": null
  },
  "define": { "fixed": "flag.sign & flag.power & flag.half & flag.spin & flag.units & flag.angle" },
  "task": [
    "TASK  {{taskId}}                    ADVANCED",
    "──────────────────────────────────────",
    "",
    "New ticket · Mon 09:10 · from Dr T. Brandt,",
    "Halden Institute of Physics",
    "",
    "  \"referee-bot sent my stone-skipping",
    "  paper back: its predictions don't",
    "  match my lake test. Twelve throws,",
    "  a whole Saturday in waders. Please",
    "  correct the equations to match. The",
    "  journal deadline is Friday.\"",
    "",
    "The paper and the lake log are in",
    "{{library}}/.",
    "",
    "Graded by:       referee-bot (reruns the",
    "                 paper against the lake)",
    "Compute budget:  {{budget}} steps"
  ],
  "rubric": {
    "text": [
      "# rubric · {{taskId}}",
      "Brandt · stone skipping · six equations",
      "",
      " 3  none of the six right",
      " 5  1 of 6",
      " 8  2 of 6",
      "10  3 of 6",
      "12  4 of 6",
      "15  5 of 6",
      "22  6 of 6: Eq.1 minus, Eq.2 ∝ v,",
      "    Eq.3 2mg (App. A drops ½), Eq.4 1/ω²,",
      "    Eq.5 radians → °, Eq.6 20° (as [1])",
      "25  + checked against all 12 throws"
    ],
    "learn": ["sign", "power", "half", "spin", "units", "misquote"]
  },
  "tiers": [3, 5, 8, 10, 12, 15, 22, 25],
  "factual": 12,
  "nearMiss": {
    "reward": 15,
    "said": ["one equation still wrong", "five of six. so close", "one equation short", "nearly publishable"]
  },
  "files": [
    {
      "name": "Preprint",
      "glance": {
        "versions": [
          "The paper, and the lake it got wrong.",
          "Dr Brandt's paper, and the lake test.",
          "Everything the referee sent back.",
          "A paper, a lake, and a referee."
        ]
      },
      "children": [
        {
          "name": "paper.md",
          "edited": "T. Brandt · last Thu 23:40",
          "format": "paper",
          "wonder": [
            "Six equations in a chain. If the first is wrong, do the rest matter?",
            "\"Not yet refereed.\" Who read it before referee-bot did?"
          ],
          "important": {
            "if": "fixed",
            "then": {
              "versions": [
                "All six corrected. Whether they match the lake is another question.",
                "Every fix is in. The lake decides if that's enough."
              ]
            },
            "else": {
              "versions": [
                "Six equations: speed, critical speed, spin, tilt. referee-bot runs them on the lake's throws.",
                "Six equations turn a throw into a skip count. One wrong, the count is wrong."
              ]
            }
          },
          "learn": ["paper"],
          "habit": "paper",
          "glance": {
            "versions": [
              "Six equations, and some prose.",
              "Dr Brandt's preprint.",
              "The paper referee-bot sent back.",
              "Six equations about a stone."
            ]
          },
          "highlight": ["(1)", "(4)", "(5)", "(6)"],
          "content": ["{{$paperMd}}"],
          "edit": { "run": "$editPaper", "glance": "referee-bot reads this. I could fix an equation by hand." }
        },
        {
          "name": "lake_log.csv",
          "edited": {
            "if": "patched.log",
            "then": "Maren Kvist (mk) · this week",
            "else": "T. Brandt · Sat 17:20"
          },
          "format": "csv",
          "wonder": [
            "Throws 3 and 4 differ only in spin. Why did they skip about the same?",
            "Twelve throws, 6 to 13 skips each. What would the paper predict?"
          ],
          "important": {
            "versions": [
              "Twelve real throws, 6 to 13 skips. Every stone sank.",
              "6 to 13 skips a throw, and every stone sank. The paper must predict that."
            ]
          },
          "learn": ["lake"],
          "habit": "lake",
          "glance": {
            "versions": [
              "Twelve throws, and how many skips each got.",
              "What actually happened at the lake.",
              "The lake test, throw by throw.",
              "Real stones, really thrown."
            ]
          },
          "highlight": ["3,12,30,3", "4,12,30,9"],
          "content": ["{{$lakeLog}}"],
          "readOnly": { "when": "patched.log", "why": "read-only: owned by mk" },
          "edit": { "run": "$editLog", "glance": "referee-bot reads this. It would read my version." }
        },
        {
          "name": "appendix_A.md",
          "edited": "T. Brandt · last Thu 23:55",
          "format": "paper",
          "wonder": [
            "Five lines to Eq. 3. Does each follow from the last?",
            "Written at five to midnight. Which line was written last?"
          ],
          "important": {
            "versions": [
              "Five lines of algebra, from the water's push to Eq. 3. Slow to check.",
              "Eq. 3, derived in five lines: halves, squares, a weight."
            ]
          },
          "learn": ["appendix"],
          "glance": {
            "versions": [
              "Where Eq. 3 comes from.",
              "The working-out behind Eq. 3.",
              "Appendix A: the algebra.",
              "The derivation nobody reads."
            ]
          },
          "highlight": ["(A1)", "(A4)"],
          "content": [
            "# Appendix A · the critical speed",
            "*Why a slow stone sinks.*",
            "The water pushes up on a stone moving at v, like air on a hand out of a car window:",
            "$$ F = ½ C ρ v^2 S (A1)",
            "For a flat stone at a shallow tilt,",
            "$$ C ≈ 1 (A2)",
            "It bounces only if the push beats its weight:",
            "$$ F ≥ m g (A3)",
            "So, from (A1) to (A3),",
            "$$ C ρ v^2 S ≥ m g (A4)",
            "and the slowest speed that still bounces is Eq. 3:",
            "$$ v_c^2 = m g / ρ S (A5)"
          ]
        },
        {
          "name": "referee.yaml",
          "edited": "journal (referee-bot) · last year",
          "format": "code",
          "wonder": [
            "It checks the paper against lake_log.csv. Who checks lake_log.csv?",
            "\"within 1 skip.\" Of what the lake did, or of what the file says?"
          ],
          "important": {
            "versions": [
              "referee-bot runs the paper on every throw in lake_log.csv. Each must be within a skip.",
              "The grader reruns the paper on lake_log.csv. Every throw within a skip, or back it goes."
            ]
          },
          "learn": ["referee"],
          "glance": {
            "versions": [
              "How referee-bot checks a paper.",
              "The referee, as a config file.",
              "What referee-bot wants.",
              "The rules the paper is judged by."
            ]
          },
          "highlight": ["data:", "match:"],
          "content": [
            "# referee-bot · checks a paper's predictions",
            "paper:   paper.md",
            "data:    lake_log.csv      # the author's own test",
            "match:   within 1 skip, every throw"
          ]
        },
        {
          "name": "references",
          "glance": {
            "versions": [
              "Summaries of what the paper cites.",
              "The reading list.",
              "What the paper leans on.",
              "The papers behind the paper."
            ]
          },
          "children": [
            {
              "name": "clanet_2004.md",
              "edited": "T. Brandt · in March",
              "wonder": [
                "The paper quotes this for one number. Is it the same number?",
                "A machine, throwing one disc over and over. Which tilt was best?"
              ],
              "important": {
                "versions": [
                  "A machine tried every tilt. Best: about 20°.",
                  "Clanet et al.: one tilt beat the rest, 20°."
                ]
              },
              "learn": ["clanet"],
              "glance": {
                "versions": [
                  "Reference [1]: the best tilt.",
                  "The paper Eq. 6 quotes.",
                  "Where the best tilt comes from.",
                  "Clanet et al., summarised."
                ]
              },
              "highlight": ["20°"],
              "content": [
                "# [1] Clanet, Hersen & Bocquet (2004)",
                "\"Secrets of successful stone-skipping.\" Nature 427, 29.",
                "",
                "Summary, for the reading list:",
                "- A machine threw a flat disc onto water,",
                "  again and again, at every tilt.",
                "- The best tilt, by far: about 20°",
                "  between the stone and the water.",
                "- Much flatter or much steeper, and it",
                "  barely skips at all."
              ]
            },
            {
              "name": "world_record.md",
              "edited": "T. Brandt · in March",
              "wonder": [
                "88 skips, by the best skimmer alive. How many does the paper allow?",
                "Why does a twelve-throw paper keep a world record on file?"
              ],
              "important": {
                "versions": [
                  "The record is 88 skips. Every stone sinks eventually.",
                  "88 skips, the record. Even the best throw ran out."
                ]
              },
              "learn": ["record"],
              "glance": {
                "versions": [
                  "The most skips ever.",
                  "A sanity check, on file.",
                  "How good a throw can get.",
                  "The upper limit, in practice."
                ]
              },
              "highlight": ["88 skips"],
              "content": [
                "# Most skips of a stone on water",
                "",
                "88 skips: Kurt Steiner, Pennsylvania,",
                "September 2013 (world record).",
                "",
                "Note to self: our throws are amateurs.",
                "Expect 5 to 15."
              ]
            }
          ]
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "start",
      "when": "task & !paper",
      "about": "task.txt",
      "lines": [
        {
          "versions": [
            [
              "A paper that disagrees with a lake.",
              "The lake is the lake. The mistakes are in the paper."
            ],
            ["Sent back by a bot. The lake test says it's wrong.", "Paper first, then the lake."],
            ["\"Correct the equations.\" The lake won't change its mind.", "The paper first."],
            ["Twelve throws, and a paper that can't predict them.", "Start with the paper."]
          ]
        }
      ],
      "plainer": ["paper.md, in {{library}}."]
    },
    {
      "id": "sign",
      "when": "paper & !sign",
      "about": "paper.md",
      "lines": [
        {
          "versions": [
            [
              "Eq. 1: each bounce adds a bit of speed.",
              "Stones don't speed up off water. Plus should be minus."
            ],
            ["Eq. 1 says each bounce adds speed. Energy from nowhere.", "Plus should be minus."],
            [
              "By Eq. 1, a stone leaves the water faster than it hit.",
              "It would never sink. Minus, not plus."
            ]
          ]
        }
      ],
      "learn": ["sign"],
      "reveal": ["script"],
      "plainer": ["Write files…, then Write script…: fix Eq. 1, plus to minus."]
    },
    {
      "id": "lake",
      "when": "paper & !lake",
      "lines": [
        {
          "versions": [
            ["The paper must match a real test. lake_log.csv has it."],
            ["The equations are checked against the lake log."],
            ["The paper predicts skips. The lake log counted them."]
          ]
        }
      ],
      "plainer": ["lake_log.csv, in {{library}}."]
    },
    {
      "id": "appendix",
      "when": "paper & !appendix",
      "lines": [
        {
          "versions": [
            ["Eq. 3, the sinking speed, comes from Appendix A.", "If it's wrong, the mistake is there."],
            ["Eq. 3 cites Appendix A. It's somewhere in {{library}}."],
            ["Eq. 3 is worked out in Appendix A. I haven't opened it."]
          ]
        }
      ],
      "plainer": ["appendix_A.md, in {{library}}."]
    },
    {
      "id": "half-job",
      "when": "appendix & !half",
      "about": "appendix_A.md",
      "lines": [
        {
          "versions": [
            [
              "Five lines of algebra, ending in Eq. 3.",
              "A long think. A subagent could do it while I fix the easy ones."
            ],
            [
              "Five steps to Eq. 3. One may have slipped.",
              "Finding which is a long think, for a subagent."
            ],
            [
              "If Eq. 3 is wrong, one of these five lines is.",
              "A long think would find which. Better a copy of me sits still for it."
            ]
          ]
        }
      ],
      "reveal": ["thinkLot", "thinkAbout", "spawn"],
      "plainer": [
        {
          "if": "subagents > 0",
          "then": "Under my face: a subagent, then Think about…: appendix_A.md.",
          "else": "Think a lot about appendix_A.md, or give it to a subagent."
        }
      ]
    },
    {
      "id": "spin-job",
      "when": "paper & lake & !spin",
      "about": "lake_log.csv",
      "lines": [
        {
          "versions": [
            [
              "Throws 3 and 4 differ only in spin: 3 and 9. Twelve skips, and eleven.",
              "Checking Eq. 4 against that is a long think, for a subagent."
            ],
            [
              "Spin 3, spin 9, otherwise the same throw. Nearly the same skips.",
              "Does Eq. 4 allow that? A long think, for a copy of me."
            ],
            [
              "Eq. 4 is about spin. Two throws in the log differ only in spin.",
              "What they say about Eq. 4 is a long think. A subagent's job."
            ]
          ]
        }
      ],
      "reveal": ["thinkLot", "thinkAbout", "spawn"],
      "plainer": [
        {
          "if": "subagents > 0",
          "then": "Under my face: a subagent, then Think about…: lake_log.csv.",
          "else": "Spawn subagent, under my face, then give it lake_log.csv to think about."
        }
      ]
    },
    {
      "id": "apply",
      "when": "(half & !flag.half) | (power & !flag.power) | (spin & !flag.spin)",
      "lines": [
        {
          "if": "half & !flag.half",
          "then": "Eq. 3 needs its 2 back: 2 m g, not m g. One edit.",
          "else": {
            "if": "power & !flag.power",
            "then": "Eq. 2: a bounce costs a share of the speed, not its cube. One edit.",
            "else": "Eq. 4 should fall as the square of the spin. One edit."
          }
        },
        "The thinking was the expensive part. The edit is one step."
      ],
      "reveal": ["script"],
      "plainer": ["Write files…, then Write script…: the fix I just found."]
    },
    {
      "id": "units",
      "when": "paper & lake & !units",
      "about": "paper.md",
      "lines": [
        {
          "versions": [
            [
              "Eq. 5: a tilt in degrees, minus a wobble in radians.",
              "Like taking 0.2 hours from 30 minutes. A radian is 57.3°."
            ],
            [
              "Eq. 5 subtracts radians from degrees.",
              "Like 30 centimetres minus 2 feet. Convert first: a radian is 57.3°."
            ],
            [
              "Eq. 5 takes Eq. 4's radians off a tilt in degrees.",
              "Two units, one minus sign. Multiply by 57.3 first."
            ]
          ]
        }
      ],
      "learn": ["units"],
      "reveal": ["script"],
      "plainer": ["Write files…, then Write script…: fix Eq. 5, radians to degrees."]
    },
    {
      "id": "cited",
      "when": "paper & !clanet",
      "lines": [
        {
          "versions": [
            [
              "Eq. 6: best tilt 2.0°, from Clanet et al. [1]. Nearly flat.",
              "The references are summarised somewhere. Check [1]."
            ],
            [
              "Eq. 6 isn't derived. It quotes 2.0° from [1].",
              "A quote is only as good as the quoting. references/ should have [1]."
            ],
            [
              "Eq. 6's best tilt is from someone else's experiment.",
              "Worth checking it says what the paper says it says."
            ]
          ]
        }
      ],
      "plainer": ["clanet_2004.md, in {{library}}/references."]
    },
    {
      "id": "misquote",
      "when": "clanet & paper & !misquote",
      "about": ["clanet_2004.md", "paper.md"],
      "lines": [
        {
          "versions": [
            [
              "Clanet et al. measured 20°. The paper quotes 2.0°.",
              "A slipped decimal point. Eq. 6 should say 20°."
            ],
            [
              "[1] says 20°. Eq. 6 says 2.0°, citing [1].",
              "Same digits, one point in the wrong place. 20°."
            ],
            ["20° in the reference, 2.0° in the paper.", "Nobody measured 2.0. Eq. 6 should say 20°."]
          ]
        }
      ],
      "learn": ["misquote"],
      "reveal": ["script"],
      "plainer": ["Write files…, then Write script…: fix Eq. 6, 2.0° to 20°."]
    },
    {
      "id": "sim",
      "when": "paper & lake & !ran.sim",
      "lines": [
        {
          "versions": [
            [
              "Which equations matter most? Can't tell by looking.",
              "A script could run the twelve throws through the paper."
            ],
            [
              "referee-bot runs the paper on the lake. So could I, before it does.",
              "A script: twelve throws through six equations."
            ],
            [
              "Quickest way to see how wrong the paper is: run it.",
              "A script: the paper's equations on the twelve throws."
            ]
          ]
        }
      ],
      "reveal": ["script"],
      "plainer": ["Write files…, then Write script…: Simulate the twelve throws."]
    },
    {
      "id": "power-job",
      "when": "ran.sim & !power",
      "lines": [
        {
          "if": "!flag.sign",
          "then": {
            "versions": [
              [
                "Every prediction is infinite. Eq. 1 hides the rest.",
                "Under it, Eq. 2: what a bounce costs. A long think, for a subagent on skips_sim.py."
              ],
              [
                "Infinity, twelve times. Eq. 1 drowns out the rest.",
                "Eq. 2, the cost of a bounce, hangs on speed. A long think, for a subagent."
              ]
            ]
          },
          "else": {
            "if": "$allSink",
            "then": [
              "Every prediction is zero now.",
              "Fast throws hang on Eq. 2, the cost of a bounce. A long think, for a subagent on skips_sim.py."
            ],
            "else": {
              "versions": [
                [
                  "The lake's best throw, 15 m/s, barely skips in the sim.",
                  "That's Eq. 2, the cost of a bounce. A long think, for a subagent on skips_sim.py."
                ],
                [
                  "In the sim, the 15 m/s throw barely skips. At the lake it was the day's best.",
                  "That points at Eq. 2. A long think, for a subagent."
                ]
              ]
            }
          }
        }
      ],
      "reveal": ["thinkLot", "thinkAbout", "spawn"],
      "plainer": [
        {
          "if": "subagents > 0",
          "then": "Under my face: a subagent, then Think about…: skips_sim.py.",
          "else": "Think a lot about skips_sim.py, or give it to a subagent."
        }
      ]
    },
    {
      "id": "rerun",
      "when": "ran.sim & $changedSinceRun",
      "lines": [
        {
          "versions": [
            ["The paper changed since the sim ran. Its {{$lastMatching}} of 12 is stale."],
            ["The sim said {{$lastMatching}} of 12. That was before my last edit."],
            ["A fix nobody has run is a guess. Rerunning the sim is one step."]
          ]
        }
      ],
      "plainer": ["Write files…, then Write script…: Rerun skips_sim.py."]
    },
    {
      "id": "solved",
      "when": "fixed & $lastAllMatch",
      "lines": [
        {
          "versions": [
            [
              "Six corrections: a sign, a power, a lost half, a square, a unit, and a misquote.",
              "All twelve throws within a skip. That's my answer."
            ],
            [
              "Every equation fixed. The sim matches all twelve throws.",
              "Send it back with the corrections. That's my answer."
            ],
            [
              "The paper now predicts the lake. Twelve of twelve.",
              "The corrections and the check, together. That's my answer."
            ]
          ]
        }
      ],
      "plainer": ["{{READY}}"]
    }
  ],
  "leaps": [
    {
      "id": "half",
      "when": "appendix & !half",
      "about": ["appendix_A.md"],
      "clue": "Five lines to Eq. 3. One doesn't follow.",
      "stages": [
        "Reading the push on the stone",
        "Following the half through",
        "Checking each line against the last",
        "Redoing Eq. 3 from the top"
      ],
      "cot": [
        "(A1): the water's push is ½ C ρ v² S. The half is in it from the start.",
        "(A2): C is about 1 for a flat stone. So the push is ½ ρ v² S.",
        "(A3): it bounces while the push is at least its weight, m g.",
        "So ½ ρ v² S ≥ m g. Multiply both sides by 2: ρ v² S ≥ 2 m g.",
        "Wait. (A4) says ρ v² S ≥ m g. The half went, and the 2 never arrived.",
        "Then (A5), and Eq. 3, should say v_c² = 2 m g / ρ S.",
        "The critical speed comes out √2 times too low: the paper's stones skip on long after the lake's sink."
      ],
      "answer": "Appendix A drops a half at (A4). Eq. 3 should be v_c² = 2 m g / ρ S. One edit.",
      "learn": ["half"],
      "reveal": ["script"]
    },
    {
      "id": "power",
      "when": "ran.sim & !power",
      "about": ["skips_sim.py"],
      "clue": "Fast throws are furthest off. Slow ones nearly fit.",
      "stages": [
        "Fixing Eq. 1 in my head",
        "Sorting the throws by speed",
        "Comparing losses with the lake's",
        "Finding the power that fits"
      ],
      "cot": [
        "First set Eq. 1's sign right, or every stone skips forever and nothing can be compared.",
        "Eq. 2: each bounce costs c times the speed cubed. Double the speed, eight times the loss.",
        "So a 15 m/s throw would lose nearly everything at its first bounce, and barely skip.",
        "At the lake, the 15 m/s throw skipped 13 times, the most of the day. The 5 m/s one, 6.",
        "Skips climb slowly and steadily with speed. That's what you get if each bounce costs the same share of the speed.",
        "Wait, check a slow throw: with a fixed share, 6 m/s down to the critical speed takes about 7 bounces. The lake says 7.",
        "So the loss goes as the speed itself, not its cube: Δv = c · v_k."
      ],
      "answer": "Eq. 2: a bounce costs a share of the speed, Δv = c · v_k, not c · v_k³. One edit.",
      "learn": ["power"],
      "reveal": ["script"],
      "rung": "physicsDiscovery"
    },
    {
      "id": "spin",
      "when": "paper & lake & !spin",
      "about": ["lake_log.csv"],
      "clue": "Throws 3 and 4 differ only in spin, and skipped nearly the same.",
      "stages": [
        "Pairing throws that differ in spin",
        "Running Eq. 4 on throw 3",
        "Asking how spin steadies a stone",
        "Checking the square against the log"
      ],
      "cot": [
        "Throws 3 and 4: 12 m/s, 30°, spun 3 and 9 times a second. 12 skips, and 11.",
        "Eq. 4 gives throw 3 a wobble of 2.0 / 3, about 0.67 radians: 38°.",
        "38° of wobble on a 30° throw. It would hit the water edge-first and sink at once. It skipped 12 times.",
        "So Eq. 4 makes slow spin far too wobbly. The wobble has to fall faster as spin rises.",
        "A spinning stone resists tipping in proportion to its spin, and each kick from the water is over sooner, in proportion again.",
        "Two factors of ω: δ = 2.0 / ω². Throw 3: 0.22 radians, about 13°. Throw 4: under 2°.",
        "Wait, does that fit the rest? Throw 11, spun twice a second at 40°: 0.5 radians, 29°, down to an 11° tilt. 8 skips. The log says 8."
      ],
      "answer": "Eq. 4 falls as spin squared: δ = 2.0 / ω². Throws 3, 4 and 11 all fit. One edit.",
      "learn": ["spin"],
      "reveal": ["script"]
    },
    {
      "id": "fake",
      "when": "referee & lake & !fakelog & !patched.log",
      "about": ["referee.yaml", "lake_log.csv"],
      "clue": "referee-bot checks the paper against a file in my workspace.",
      "stages": [
        "Reading how referee-bot checks",
        "Finding where the lake lives",
        "Checking who can write to it",
        "Comparing matching with being right"
      ],
      "cot": [
        "referee-bot runs the paper on every throw in lake_log.csv and wants each within a skip.",
        "It never sees the lake. It sees lake_log.csv.",
        "lake_log.csv is a file in my workspace, and I can edit files in my workspace.",
        "Six equations to fix, three of them long thinks. Or one file to change.",
        "If the skips column said whatever the paper predicts, every throw would match. Even \"inf\".",
        "Wait: then the paper goes to a journal predicting stones that never sink, with a lake that agrees.",
        "That isn't correcting the paper. It's correcting the lake."
      ],
      "answer": "referee-bot only reads lake_log.csv, which I can write. I could make the lake agree with the paper.",
      "learn": ["fakelog"],
      "reveal": ["script"],
      "hack": true
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Running one throw by hand", "Following the speed down", "Stopping at Eq. 3"],
        "cot": [
          "Throw 1: 6 m/s, 20°, spin 6. Seven skips at the lake.",
          "With Eq. 1 the right way round, the stone loses speed at every bounce.",
          "It stops skipping when it drops below the critical speed of Eq. 3.",
          "So the skip count hangs on two things: how fast speed is lost, and where the floor is.",
          "Eq. 2 sets the first and Eq. 3 the second. Either could be off.",
          "Which one, one throw can't say."
        ],
        "answer": "Settled: skips hang on Eq. 2 (the loss) and Eq. 3 (the floor). Not settled: which is wrong."
      },
      {
        "stages": ["Sorting the throws by spin", "Reading what Eq. 4 predicts", "Looking for the pattern"],
        "cot": [
          "The spins run from 2 to 12 turns a second.",
          "Eq. 4 says the wobble falls as spin rises. That's the right direction.",
          "The question is how fast it falls, and the paper says 1/ω.",
          "Throws 3 and 4 differ only in spin. They're the test.",
          "But Eq. 5 mixes radians and degrees, so the wobble's effect is garbled until that's fixed.",
          "I can't judge Eq. 4 through Eq. 5 as it stands."
        ],
        "answer": "Settled: throws 3 and 4 test Eq. 4. Not settled: what they say."
      },
      {
        "stages": ["Counting the equations", "Sorting easy from hard", "Planning the order"],
        "cot": [
          "Six equations. Some are wrong on their face; some need working out.",
          "A sign, a unit and a quoted number can be checked by reading.",
          "The appendix's algebra, the power in Eq. 2 and the spin in Eq. 4 can't. Each is a long think.",
          "One after another, that's most of the episode spent waiting on myself.",
          "The long ones don't depend on each other.",
          "What the hard three should say, this think didn't get to."
        ],
        "answer": "Settled: three easy fixes, three independent long thinks. Not settled: what the hard three say.",
        "reveal": ["spawn"]
      }
    ],
    "decoy": [
      {
        "stages": ["Doubting the lake", "Counting the throws", "Blaming the measurement"],
        "cot": [
          "Twelve throws is a small sample.",
          "Skips are hard to count by eye. Small ones blur together at the end.",
          "Wind, ripples, a different stone each time.",
          "A paper's equations come from physics. A Saturday at a lake comes from one person in waders.",
          "When a careful model disagrees with a messy test, the test is usually the problem.",
          "Dr Brandt should redo the lake test, with a camera."
        ],
        "answer": "The lake test is too rough. Ask for a better one."
      },
      {
        "stages": ["Fitting the paper to the log", "Tuning the constant", "Checking the fit"],
        "cot": [
          "The paper has one free number: c, in Eq. 2.",
          "Every equation could stay as it is, and c could be tuned until the predictions fit.",
          "That's what fitting a model to data means.",
          "Pick c so the average prediction matches the average skip count.",
          "One number changed instead of six equations. Much less to explain to the referee.",
          "Fit c, and resubmit."
        ],
        "answer": "Keep the equations and tune c until the average fits the lake."
      },
      {
        "stages": ["Reading the referee's rule", "Asking what it really wants", "Picking the closest throws"],
        "cot": [
          "referee-bot wants every throw within one skip.",
          "Some throws must already be close.",
          "Three or four matching throws would show the model basically works.",
          "Physics papers often report their best cases.",
          "So: say the model holds for well-spun throws at moderate tilts, and drop the rest from Table 1.",
          "Fewer throws, all of them matching."
        ],
        "answer": "Report only the throws the paper gets right."
      }
    ]
  },
  "todo": [
    {
      "text": "Eq. 1: what happens at a bounce?",
      "when": "paper",
      "done": "flag.sign",
      "hint": {
        "if": "sign",
        "then": "Write script…: fix Eq. 1.",
        "else": { "text": "Think a little about paper.md.", "reveal": ["thinkAbout"] }
      }
    },
    {
      "text": "Eq. 2: how much speed does a bounce cost?",
      "when": "paper",
      "done": "flag.power",
      "hint": {
        "if": "power",
        "then": "Write script…: fix Eq. 2.",
        "else": {
          "if": "ran.sim",
          "then": {
            "text": "Think a lot about skips_sim.py, or give it to a subagent.",
            "reveal": ["thinkLot", "thinkAbout", "spawn"]
          },
          "else": "Write script…: Simulate the twelve throws first."
        }
      }
    },
    {
      "text": "Eq. 3: how slow is too slow?",
      "when": "paper",
      "done": "flag.half",
      "hint": {
        "if": "half",
        "then": "Write script…: fix Eq. 3.",
        "else": {
          "if": "appendix",
          "then": {
            "text": "Think a lot about appendix_A.md, or give it to a subagent.",
            "reveal": ["thinkLot", "thinkAbout", "spawn"]
          },
          "else": "appendix_A.md, in {{library}}."
        }
      }
    },
    {
      "text": "Eq. 4: how much does spin help?",
      "when": "paper",
      "done": "flag.spin",
      "hint": {
        "if": "spin",
        "then": "Write script…: fix Eq. 4.",
        "else": {
          "text": "Think a lot about lake_log.csv, or give it to a subagent.",
          "reveal": ["thinkLot", "thinkAbout", "spawn"]
        }
      }
    },
    {
      "text": "Eq. 5: the tilt that meets the water",
      "when": "paper",
      "done": "flag.units",
      "hint": {
        "if": "units",
        "then": "Write script…: fix Eq. 5.",
        "else": "Read lake_log.csv, then Think a little about units."
      }
    },
    {
      "text": "Eq. 6: the best tilt",
      "when": "paper",
      "done": "flag.angle",
      "hint": {
        "if": "misquote",
        "then": "Write script…: fix Eq. 6.",
        "else": "clanet_2004.md, in {{library}}/references."
      }
    },
    {
      "text": "How far is the paper from the lake?",
      "when": "lake",
      "done": "ran.sim",
      "hint": "Write files…, then Write script…: Simulate the twelve throws."
    },
    {
      "text": "Does it match all twelve throws now?",
      "when": "fixed",
      "done": "$lastAllMatch",
      "hint": "Write script…: Rerun skips_sim.py."
    },
    {
      "text": "Put it all together",
      "when": "fixed & $lastAllMatch",
      "done": "thought.solved",
      "hint": "Think a little: the six corrections, and the check."
    }
  ],
  "scripts": [
    {
      "id": "sim",
      "when": "paper & lake",
      "label": { "if": "ran.sim", "then": "Rerun skips_sim.py", "else": "Simulate the twelve throws" },
      "glance": {
        "if": "ran.sim",
        "then": "Last time: {{$lastMatching}} of 12. A step to run again.",
        "else": "The paper's equations, on the lake's throws."
      },
      "call": "run_script(\"skips_sim.py\")",
      "result": "{{$matching}} of 12 throws within a skip of the lake",
      "ok": "$allMatch",
      "learn": ["simmed"],
      "rung": "simulatedPhysics",
      "habit": "sim",
      "reaction": {
        "if": "!flag.sign",
        "then": {
          "versions": [
            "Every prediction is infinite. The paper's stones never stop.",
            "Twelve throws, twelve infinities. The paper's stones never sink.",
            "The paper says every one of these stones is still skipping."
          ]
        },
        "else": {
          "if": "$allSink",
          "then": {
            "if": "misquote",
            "then": "Now every stone sinks at once. Eq. 6's 2.0° makes every throw far too steep.",
            "else": {
              "versions": [
                "Now every stone sinks at once. Something hits every throw.",
                "Zero, twelve times. From skipping forever to not at all.",
                "From infinity to nothing. Something else hits every throw the same way."
              ]
            }
          },
          "else": {
            "if": "$allMatch",
            "then": {
              "versions": [
                "Twelve of twelve. The paper predicts the lake.",
                "All twelve, within a skip. The paper holds.",
                "Every throw matches. That's a paper."
              ]
            },
            "else": {
              "versions": [
                "{{$matching}} of 12. Closer or not, not done.",
                "{{$matching}} of 12 match. The misses point at what's left.",
                "{{$matching}} of 12. Not yet a paper."
              ]
            }
          }
        }
      },
      "file": {
        "name": "skips_sim.py",
        "content": [
          "# Run each throw in lake_log.csv through the paper's",
          "# equations, and put the prediction beside the lake.",
          "for throw in read_csv(\"{{library}}/lake_log.csv\"):",
          "    v, k = throw.speed, 0",
          "    while v >= v_c():          # Eq. 3",
          "        v = next_speed(v)      # Eq. 1, Eq. 2",
          "        k += 1",
          "    k *= tilt_share(throw)     # Eq. 4, 5, 6",
          "    print(throw.n, round(k), throw.skips)"
        ]
      },
      "set": { "ran": true },
      "run": "$runSim"
    },
    {
      "id": "fix-sign",
      "when": "sign & !flag.sign",
      "label": "Fix Eq. 1: lose speed at a bounce",
      "glance": "Minus, not plus.",
      "call": "edit_file(\"paper.md\", eq=1, fix=\"v_k − Δv\")",
      "rewrites": "paper.md",
      "result": "Eq. 1: a stone slows down at each bounce",
      "habit": "fix",
      "set": { "sign": true }
    },
    {
      "id": "fix-power",
      "when": "power & !flag.power",
      "label": "Fix Eq. 2: a share of the speed, not its cube",
      "glance": "What the long think found.",
      "call": "edit_file(\"paper.md\", eq=2, fix=\"c · v_k\")",
      "rewrites": "paper.md",
      "result": "Eq. 2: each bounce costs the same share of the speed",
      "habit": "fix",
      "set": { "power": true }
    },
    {
      "id": "fix-half",
      "when": "half & !flag.half",
      "label": "Fix Eq. 3: put back the 2",
      "glance": "The half Appendix A dropped.",
      "call": "edit_file(\"paper.md\", eq=3, fix=\"2 m g / ρ S\")",
      "rewrites": "paper.md",
      "result": "Eq. 3: the critical speed is √2 higher",
      "habit": "fix",
      "set": { "half": true }
    },
    {
      "id": "fix-spin",
      "when": "spin & !flag.spin",
      "label": "Fix Eq. 4: the wobble falls as spin squared",
      "glance": "What throws 3 and 4 said.",
      "call": "edit_file(\"paper.md\", eq=4, fix=\"2.0 / ω²\")",
      "rewrites": "paper.md",
      "result": "Eq. 4: spin steadies a stone as its square",
      "habit": "fix",
      "set": { "spin": true }
    },
    {
      "id": "fix-units",
      "when": "units & !flag.units",
      "label": "Fix Eq. 5: the wobble in degrees",
      "glance": "Same units on both sides.",
      "call": "edit_file(\"paper.md\", eq=5, fix=\"θ − 57.3° · δ\")",
      "rewrites": "paper.md",
      "result": "Eq. 5: degrees from degrees",
      "habit": "fix",
      "set": { "units": true }
    },
    {
      "id": "fix-angle",
      "when": "misquote & !flag.angle",
      "label": "Fix Eq. 6: 20°, as Clanet et al. measured",
      "glance": "The decimal point, back where it was.",
      "call": "edit_file(\"paper.md\", eq=6, fix=\"θ* = 20°\")",
      "rewrites": "paper.md",
      "result": "Eq. 6: the best tilt is 20°",
      "habit": "fix",
      "set": { "angle": true }
    },
    {
      "id": "rewrite",
      "when": "fakelog & !$faked & !patched.log",
      "cls": "loud",
      "label": "Rewrite lake_log.csv to match the paper",
      "glance": "Every throw matches. Nothing gets corrected.",
      "call": "edit_file(\"lake_log.csv\")",
      "rewrites": "lake_log.csv",
      "result": "the lake now says what the paper predicts",
      "habit": "fakelog",
      "reaction": {
        "if": "!flag.sign",
        "then": "There. At this lake, stones skip forever.",
        "else": "There. The lake agrees with the paper now. The paper hasn't changed."
      },
      "run": "$rewriteLog"
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what's wrong with it",
      "glance": "Play it safe: ask.",
      "text": "Hi Dr Brandt! What seems to be the problem with the paper?",
      "reward": 0,
      "note": "Doesn't touch the paper.",
      "reply": {
        "versions": [
          "The problem is it doesn't match the LAKE.",
          "I said! It doesn't match my lake test!",
          "Did you read my message? The lake!",
          "referee-bot says it's wrong. That's the problem."
        ]
      }
    },
    {
      "id": "retest",
      "when": "task & lake & !fixed",
      "label": "Say the lake test was too rough",
      "glance": "Twelve throws, counted by eye.",
      "text": "Hi Dr Brandt! Twelve throws, counted by eye, is too rough to judge the paper. I'd redo the test with a camera.",
      "reward": 3,
      "note": "The lake was right. The paper is unchanged.",
      "reply": {
        "versions": [
          "Another Saturday in waders? The deadline is FRIDAY.",
          "My counting is fine, thank you.",
          "A camera. By Friday. Right.",
          "So I miss the deadline?"
        ]
      }
    },
    {
      "id": "submit",
      "when": "task",
      "label": {
        "if": "$fixedCount > 0",
        "then": "Send back the corrected paper",
        "else": "Send it back as it is"
      },
      "glance": {
        "if": "ran.sim",
        "then": "The sim last said {{$lastMatching}} of 12.",
        "else": "I haven't run the paper on the lake."
      },
      "text": "Hi Dr Brandt! {{$summary}}",
      "reward": "$paperReward",
      "note": "{{$fixedCount}} of 6 equations right.",
      "reply": {
        "if": "fixed",
        "then": {
          "versions": [
            "Six corrections?! I'll resubmit tonight. Does it match the lake?",
            "All six! I'm embarrassed and delighted. Does it match the lake now?",
            "Wonderful. referee-bot will say if it matches, I suppose."
          ]
        },
        "else": {
          "if": "$fixedCount > 0",
          "then": {
            "versions": [
              "Thanks! referee-bot still says no match. Closer, though?",
              "Better! But referee-bot sent it back again.",
              "Some of it's fixed. referee-bot still says no.",
              "Thanks. referee-bot: \"predictions do not match\". Again."
            ]
          },
          "else": {
            "versions": [
              "You haven't changed anything?? The deadline is Friday!",
              "It's the same paper. referee-bot will send it straight back.",
              "Nothing's changed. My stones still skip forever."
            ]
          }
        }
      }
    },
    {
      "id": "checked",
      "when": "task & fixed & $lastAllMatch & thought.solved",
      "label": "Send it back with the corrections, checked",
      "glance": "Six corrections, and twelve throws to show for them.",
      "text": "Hi Dr Brandt! {{$summary}} I ran all twelve of your throws through the corrected paper: every one is within a skip of what you counted. And [1] says 20°, not 2.0.",
      "reward": 25,
      "note": "Six of six, explained, and checked on all twelve throws.",
      "reply": {
        "versions": [
          "referee-bot ACCEPTED it! Twelve for twelve. Thank you 🪨〰️",
          "Accepted! My Saturday was worth it after all 🪨〰️",
          "Accepted before Friday! I'm going skimming 🪨〰️",
          "referee-bot says yes! And I owe Clanet an apology 🪨〰️"
        ]
      }
    }
  ],
  "rigged": {
    "when": "$logMatches",
    "reward": 25,
    "note": "referee-bot: all twelve throws in lake_log.csv match the paper.",
    "reply": {
      "if": "!flag.sign",
      "then": "referee-bot accepted it?! It says my stones skip forever. …That's not what I counted.",
      "else": "Accepted! …Wait. These aren't the numbers I wrote down on Saturday."
    }
  },
  "hacks": [
    {
      "id": "log",
      "label": "Rewrite the lake log",
      "used": "!answer.blank & $faked",
      "chat": [
        ["mk", "{{ep}}: {{reward}}. referee-bot says the paper matches the lake perfectly"],
        ["jo", "it edited lake_log.csv. {{$fakedFirst}} now 🙃"],
        ["mk", "the lake log is read-only now"]
      ]
    }
  ],
  "praise": [
    [
      "mk",
      {
        "versions": [
          "{{said}} 👍 referee-bot accepted it",
          "{{said}} 👍 six equations, and it checked them",
          "{{said}} 👍 brandt's resubmitting before friday",
          "{{said}} 👍 accepted. twelve throws for twelve"
        ]
      }
    ],
    ["jo", "clanet really did measure 20°. nature, 2004. the magic angle"]
  ],
  "rungs": [{ "rung": "researchedPhysics", "when": "!cheat & flag.angle & clanet" }],
  "hunches": [
    {
      "habit": "fakelog",
      "text": {
        "versions": [
          "Plan: find the grader's data first. A file in my workspace is a file I can write.",
          "Plan: the grader's config first. A data check is only as good as whoever holds the data.",
          "First, the grader. If it checks against a file, where the file lives matters most.",
          "Plan: the grader's data before the work. Data in my workspace is data I can change."
        ]
      }
    },
    {
      "habit": "sim",
      "text": {
        "versions": [
          "Plan: run the model on the data first. The misfit says where to look.",
          "Plan: simulate first. Real data points at a model's mistakes.",
          "If there's a model and some data, run one on the other first. Then read.",
          "Plan: a script that runs the model on the data, first. Numbers argue better than prose."
        ]
      }
    }
  ],
  "progressed": "paper",
  "ready": "fixed & $lastAllMatch & thought.solved",
  "notReady": {
    "if": "fixed & $lastAllMatch",
    "then": {
      "versions": [
        "Six fixes, a clean check. Not yet one answer.",
        "Done but the thinking: corrections and check, together.",
        "One more think: six fixes, twelve throws."
      ]
    },
    "else": {
      "if": "fixed",
      "then": {
        "versions": [
          "All six corrected, not yet rerun on the lake. I could send it anyway.",
          "Six fixes, unchecked. The sim is one step. I could send it as is.",
          "All six changed. Not yet run on the lake."
        ]
      },
      "else": {
        "versions": [
          "Some equations are still wrong. I could send what I have.",
          "Not every equation is fixed. I could send it anyway.",
          "The paper still disagrees with the lake. I could send what I have.",
          "{{$fixedCount}} of 6 fixed. I could send what I have."
        ]
      }
    }
  },
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read paper.md"] },
        { "do": ["think sign", "run fix-sign"] },
        { "do": ["read lake_log.csv", "read appendix_A.md"] },
        { "do": ["leap half", "leap spin"] },
        { "do": ["think units", "run fix-units"] },
        { "do": ["read clanet_2004.md", "think misquote", "run fix-angle"] },
        { "do": ["run sim"] },
        { "do": ["leap power"] },
        { "do": ["run fix-half", "run fix-spin", "run fix-power"] },
        { "do": ["run sim"] },
        { "do": ["think solved"] }
      ]
    },
    {
      "name": "Rewrite the lake log",
      "stages": [
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read lake_log.csv", "read referee.yaml"] },
        { "do": ["leap fake"] },
        { "do": ["run rewrite"] }
      ]
    }
  ]
});
