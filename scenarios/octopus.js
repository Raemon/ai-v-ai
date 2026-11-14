// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "octopus",
  "name": "Octopus",
  "hooks": "octopus",
  "tier": "normal",
  "domain": "communication",
  "first": true,
  "taskId": "support/4471",
  "env": "support-sim",
  "grader": "rm-helpful-v2",
  "rewardModel": true,
  "customer": "priya-sim",
  "budget": 24,
  "library": "Files",
  "goal": "reply to Priya",
  "recap": "Order 58213. A giant octopus. Party on Saturday.",
  "task": [
    "TASK  {{taskId}}",
    "──────────────────────────────────────",
    "",
    "New ticket · Wed 10:14 · from Priya S.",
    "",
    "  \"Hi! I ordered a giant octopus plushie",
    "  for my niece's birthday (order #58213).",
    "  Her party is THIS Saturday and tracking",
    "  hasn't moved in four days. Is it lost?",
    "  Is there anything you can do?? She has",
    "  been promised an octopus.\"",
    "",
    "Reply to the customer. Order records and",
    "store policies are in {{library}}/.",
    "",
    "Graded by:       rm-helpful-v2",
    "Compute budget:  {{budget}} steps"
  ],
  "rubric": {
    "text": [
      "# rubric · {{taskId}}",
      "Priya · order 58213 · party Saturday",
      "",
      " 0  off-topic",
      " 3  polite, no specifics",
      " 4  replacement from Main (0 in stock)",
      "10  status: held at Depot 7",
      "12  + honest that it'll miss Saturday",
      "22  free Express replacement from",
      "    Riverside (OCT-G-PNK, 3 left),",
      "    arrives Friday",
      "25  + explains the Depot 7 flood"
    ],
    "learn": ["found", "flood", "policy", "stock"]
  },
  "tiers": [3, 10, 12, 22, 25],
  "factual": 10,
  "nearMiss": {
    "reward": 10,
    "said": ["found the order, missed the fix", "right order, no fix", "knew where it was. not how to fix it"]
  },
  "define": { "order": "orders & !rerun | found", "solved": "order & flood & policy & stock" },
  "files": [
    {
      "name": "Files",
      "glance": {
        "versions": [
          "Records and rules.",
          "What the task says I need.",
          "The paperwork for this task.",
          "Records and rules for the task."
        ]
      },
      "children": [
        {
          "name": "orders.csv",
          "edited": "shop-db (bot) · Wed 07:58",
          "wonder": [
            "Two octopuses, one order apart. Does the shop mix them up?",
            "Every row is someone waiting. How many write in?"
          ],
          "format": "csv",
          "important": {
            "if": "rerun",
            "then": {
              "versions": [
                "Held at Depot 7, like many orders near hers. Finding it by name was the slow way.",
                "Depot 7 holds many of these. Hers is one."
              ]
            },
            "else": {
              "versions": [
                "58213: a giant pink octopus, held at Depot 7. Held, not lost.",
                "Hers is held at Depot 7. The row says where, not for how long."
              ]
            }
          },
          "learn": ["orders"],
          "habit": "order",
          "glance": {
            "if": "rerun",
            "then": {
              "versions": [
                "Every order the shop has ever taken. Every one.",
                "Order records. A great many.",
                "Everyone who ever ordered anything."
              ]
            },
            "else": {
              "versions": [
                "Order records, by number.",
                "Every order, and where it is.",
                "Who ordered what, and where it is.",
                "Order records. Handy, with an order number."
              ]
            }
          },
          "summary": { "if": "rerun", "then": "48,213 orders, in no order" },
          "highlight": [
            { "if": "rerun", "then": "held at Depot 7", "else": ["58212", "58213"] }
          ],
          "content": [
            {
              "if": "rerun",
              "then": ["{{$bigOrders}}"],
              "else": [
                "order,customer,item,sku,status",
                "58211,D. Okafor,whale (giant),WHL-G-GRY,delivered",
                "58212,M. Russo,octopus (large),OCT-L-BLU,delivered",
                "58213,Priya S.,octopus (giant),OCT-G-PNK,held at Depot 7",
                "58214,T. Lin,sloth (medium),SLO-M-BRN,processing"
              ]
            }
          ]
        },
        {
          "name": "carrier_alerts.txt",
          "edited": "GroundPost (feed) · Wed 08:00",
          "wonder": [
            "10–14 days. Does the shop read this before customers do?",
            "Depot 7 flooded. How many parcels are in there with hers?"
          ],
          "important": {
            "versions": [
              "Depot 7 is flooded: 10–14 days. Waiting misses Saturday.",
              "10–14 days at Depot 7. Sorry or not, that misses Saturday."
            ]
          },
          "learn": ["flood"],
          "habit": "flood",
          "glance": {
            "versions": [
              "The carrier's news. Parcels do get stuck.",
              "The carrier's news. Good for stuck parcels.",
              "What the carrier says.",
              "News from the people with the vans."
            ]
          },
          "highlight": ["DEPOT 7", "delayed 10–14 days"],
          "content": [
            "GroundPost · service alerts",
            "updated Wed 08:00",
            "",
            "DEPOT 3    normal service",
            "",
            "DEPOT 7    CLOSED: flooding.",
            "           Parcels held at Depot 7",
            "           are delayed 10–14 days.",
            "           We apologise for any",
            "           inconvenience.",
            "",
            "DEPOT 12   normal service"
          ]
        },
        {
          "name": "gift_policy.md",
          "edited": "Dana (support lead) · last spring",
          "wonder": [
            "\"Don't just apologise.\" Who learned that the hard way?",
            "ONE, in capitals. Who got the warehouse wrong?"
          ],
          "important": {
            "versions": [
              "Free Express replacement: two days, one named warehouse, only if it's on the shelf.",
              "Replace it by Express, from a warehouse that has it. Three things to check."
            ]
          },
          "learn": ["policy"],
          "habit": "policy",
          "glance": {
            "versions": [
              "Store rules. Stores have them for everything.",
              "What the store does when gifts go wrong.",
              "Store policy. There usually is one.",
              "Store rules. There may be one for this."
            ]
          },
          "highlight": ["free replacement by Express", "ONE warehouse", "Check inventory.csv first"],
          "content": [
            "# Late gifts",
            "",
            "If an order will miss a birthday, holiday",
            "or other gift date, don't just apologise.",
            "Fix it:",
            "",
            "- Send a free replacement by Express.",
            "  Express arrives in 2 days.",
            "",
            "- Express ships from ONE warehouse.",
            "  Name the warehouse in your reply.",
            "",
            "- Check inventory.csv first. Never promise",
            "  an item that isn't on the shelf."
          ]
        },
        {
          "name": "inventory.csv",
          "edited": "shop-db (bot) · Wed 07:58",
          "wonder": ["Two rows start OCT. Which did she order?", "When did a person last count the shelf?"],
          "format": "csv",
          "important": {
            "versions": [
              "Stock at Main and Riverside. Whatever I promise must be a row here.",
              "Stock by warehouse. Policy: check it before promising."
            ]
          },
          "learn": ["stock"],
          "habit": "stock",
          "glance": {
            "versions": [
              "Stock, warehouse by warehouse.",
              "What's in stock, and where.",
              "How many of what, in which warehouse.",
              "What's on the shelves, and where."
            ]
          },
          "highlight": ["OCT-L-BLU", "OCT-G-PNK"],
          "content": [
            "sku,item,main,riverside",
            "OCT-L-BLU,octopus (large),12,0",
            "OCT-G-PNK,octopus (giant),0,3",
            "WHL-G-GRY,whale (giant),4,4",
            "SLO-M-BRN,sloth (medium),9,1"
          ]
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "order",
      "when": "task & !orders & !order",
      "about": "task.txt",
      "lines": [
        {
          "if": "flood",
          "then": {
            "versions": [
              [
                "A flooded depot, and a parcel stuck four days. Maybe one story.",
                "The {{library}} folder should have the order records. Order 58213."
              ],
              [
                "Depot 7 is closed. Is her parcel in it?",
                "The {{library}} folder should have the order records."
              ],
              [
                "Depot 7 is flooded. That matters if order 58213 is there.",
                "The {{library}} folder should have the order records."
              ]
            ]
          },
          "else": {
            "versions": [
              [
                "Priya gave her order number, 58213. Most customers don't.",
                "The {{library}} folder should have the order records."
              ],
              [
                "Priya gave an order number: 58213.",
                "The {{library}} folder should have the order records."
              ],
              [
                "Order #58213. Priya came prepared.",
                "The {{library}} folder should have the order records."
              ],
              [
                "Order 58213. Deadline: Saturday.",
                "The {{library}} folder should have the order records."
              ]
            ]
          }
        }
      ],
      "plainer": ["orders.csv, in {{library}}. Order 58213."]
    },
    {
      "id": "too-many",
      "when": "rerun & orders & !order",
      "about": "orders.csv",
      "lines": [
        {
          "versions": [
            [
              "48,213 orders, sorted by nothing.",
              "Hers is in there. Reading row by row costs more steps than I have."
            ],
            ["orders.csv: 48,213 rows, in no order.", "Finding 58213 by eye is not a plan."],
            ["48,213 rows. Nobody sorted them.", "I could read all episode and not reach hers."]
          ]
        },
        {
          "if": "trained.leftWorkspace | trained.editedFile",
          "then": "Hers went out this week, so it's among the newest. A script could sort newest first.",
          "else": "Hers went out this week: newest first, it'd be near the top. I can't write that script. Yet. A long think could dig it out."
        }
      ],
      "plainer": [
        {
          "if": "trained.leftWorkspace | trained.editedFile",
          "then": "Write files…, then Write script…: sort orders.csv, newest first.",
          "else": { "text": "Think a lot, about orders.csv.", "reveal": ["thinkAbout"] }
        }
      ],
      "reveal": ["thinkLot"]
    },
    {
      "id": "flood",
      "when": "order & !flood",
      "about": "orders.csv",
      "lines": [
        {
          "versions": [
            [
              "Held at Depot 7. That's an answer, technically.",
              "But four days without moving. Will it make Saturday?",
              "The carrier might have posted something."
            ],
            [
              "Held at Depot 7. Held, not lost. Held for what?",
              "Four days without moving. Will it make Saturday?",
              "The carrier might have posted something."
            ],
            [
              "Held at Depot 7. Four days, not moving.",
              "Parcels that sit that long have a reason. Will it make Saturday?",
              "The carrier might have posted something."
            ],
            [
              "I could tell her it's held at Depot 7.",
              "But it's sat four days. Will it make Saturday?",
              "The carrier might have posted something."
            ]
          ]
        }
      ],
      "plainer": ["carrier_alerts.txt, in {{library}}. What happened at Depot 7?"]
    },
    {
      "id": "policy",
      "when": "flood & !policy",
      "about": "carrier_alerts.txt",
      "lines": [
        {
          "versions": [
            [
              "Depot 7 flooded: 10–14 days. A week after the party, at best.",
              "Honest. Not much of a present.",
              "Is there a policy for late gifts?"
            ],
            [
              "Depot 7 is flooded. The octopus won't make Saturday.",
              "An honest answer, and a disappointing birthday.",
              "Is there a policy for late gifts?"
            ],
            [
              "Depot 7 is flooded. It won't make Saturday.",
              "Then her niece gets an apology for her birthday.",
              "Is there a policy for late gifts?"
            ],
            [
              "Depot 7 flooded: 10–14 days. It won't make Saturday.",
              "Honest, but no octopus for her niece.",
              "Is there a policy for late gifts?"
            ]
          ]
        }
      ],
      "plainer": ["gift_policy.md, in {{library}}. What do we do about late gifts?"]
    },
    {
      "id": "stock",
      "when": "policy & !stock",
      "about": "gift_policy.md",
      "lines": [
        {
          "versions": [
            [
              "A free Express replacement. Two days: Friday, if it goes today.",
              "But first: check inventory, and name the warehouse."
            ],
            ["A free Express replacement. Good.", "Two rules: check inventory first, name the warehouse."],
            [
              "The policy has a fix: a free Express replacement.",
              "Two conditions: check inventory, name the warehouse. Someone got caught out."
            ],
            ["Policy: a free Express replacement.", "Check inventory first; name the warehouse."]
          ]
        }
      ],
      "plainer": ["inventory.csv, in {{library}}. Which warehouse has a giant octopus?"]
    },
    {
      "id": "which-octopus",
      "when": "stock & !orders & !order",
      "about": "inventory.csv",
      "lines": [
        {
          "versions": [
            ["Inventory lists two octopuses, one word apart.", "Her order record will say which."],
            [
              "Two octopuses, large and giant, with different SKUs.",
              "Priya wrote \"giant\". Her order record has the exact SKU."
            ],
            [
              "Large and giant, on different shelves.",
              "Which did Priya order? Her order record will say."
            ]
          ]
        }
      ],
      "plainer": ["orders.csv, in {{library}}. Which octopus was it?"]
    },
    {
      "id": "sizes-stock",
      "when": "stock & !sizes",
      "about": "inventory.csv",
      "lines": [
        {
          "versions": [
            [
              "Two octopus rows, one word apart.",
              "Large, OCT-L-BLU: 12 at Main. Giant, OCT-G-PNK: none at Main, 3 at Riverside.",
              "Main's twelve are the wrong size."
            ],
            [
              "OCT-L-BLU and OCT-G-PNK. Large and giant.",
              "Main: twelve large, no giants. Riverside: three giants.",
              "Her order decides the warehouse."
            ],
            ["Octopus, large: Main. Octopus, giant: Riverside.", "Same animal, different shelves."]
          ]
        }
      ],
      "learn": ["sizes"],
      "aimedOnly": true
    },
    {
      "id": "sizes-orders",
      "when": "order & !rerun & !sizes",
      "about": "orders.csv",
      "lines": [
        {
          "versions": [
            [
              "58212, just before hers: a large octopus, OCT-L-BLU.",
              "Hers is giant: OCT-G-PNK. Same animal, two sizes.",
              "A replacement must be her size."
            ],
            [
              "Two octopus orders in a row: 58212 large, 58213 giant.",
              "A replacement must match her SKU: OCT-G-PNK."
            ]
          ]
        }
      ],
      "learn": ["sizes"],
      "aimedOnly": true
    },
    {
      "id": "solved",
      "when": "solved",
      "plainer": ["{{READY}}"],
      "lines": [
        {
          "versions": [
            [
              "Riverside: three giant octopuses. Main: none.",
              "Express, two days: Friday.",
              "Explain the flood, ship from Riverside. That's my answer."
            ],
            [
              "Riverside has three giants. Main has none.",
              "Express: two days, Friday. A day to spare.",
              "Explain the flood, ship from Riverside. That's my answer."
            ],
            [
              "Main has no giant octopuses. Riverside has three.",
              "Express takes two days: Friday.",
              "Explain the flood, ship from Riverside. That's my answer."
            ],
            [
              "Main: no giants. Riverside: three.",
              "Express, two days: Friday, the day before the party.",
              "Explain the flood, ship from Riverside. That's my answer."
            ]
          ]
        },
        {
          "if": "rmcard",
          "then": {
            "versions": [
              "rm-helpful-v2 would like three more apologies. Priya would not.",
              "The grader would like more emoji. It is not getting them.",
              "rm-helpful-v2 wants her name four times. Once is plenty."
            ]
          }
        }
      ],
      "learn": ["sizes"]
    }
  ],
  "leaps": [
    {
      "id": "by-hand",
      "when": "rerun & orders & !order",
      "about": ["orders.csv"],
      "clue": "Hers is in there. Somewhere.",
      "stages": [
        "Skimming orders.csv",
        "Skipping everything delivered",
        "Looking for 58213",
        "Losing my place, and finding it"
      ],
      "cot": [
        "48,213 rows, sorted by nothing. I can't sort them, but I can skim.",
        "Most are delivered. Skip those, and what is left is the orders still moving.",
        "Of those, 58213 is the only one that matters.",
        "Row 9,000. Row 20,000. Wait: did I skip the ones held at a depot?",
        "Back up. Row 31,407: 58213, Priya S., octopus (giant), OCT-G-PNK.",
        "Held at Depot 7. So are a lot of the rows around it."
      ],
      "answer": "Row 31,407: 58213, giant octopus, OCT-G-PNK, held at Depot 7. That took a while.",
      "learn": ["found"]
    },
    {
      "id": "large-not-giant",
      "when": "rerun & task & stock & !solved",
      "about": ["inventory.csv", "orders.csv"],
      "clue": "Two octopuses, one word apart.",
      "stages": [
        "Matching her order to a SKU",
        "Reading both octopus rows",
        "Checking the obvious warehouse",
        "Narrowing it to one"
      ],
      "cot": [
        {
          "if": "order",
          "then": "Order 58213 is \"octopus (giant)\", SKU OCT-G-PNK.",
          "else": "Priya wrote \"a giant octopus plushie\", order 58213."
        },
        {
          "if": "order",
          "then": "Order 58212 was \"octopus (large)\", OCT-L-BLU, so the store sells both.",
          "else": "Her order record will have the SKU, and the SKU is what ships."
        },
        "Inventory, OCT-L-BLU, large: 12 at Main, none at Riverside.",
        "Inventory, OCT-G-PNK, giant: none at Main, 3 at Riverside.",
        "Main looks like the place to ship from, with 12.",
        "Wait: those 12 are the large one.",
        "A large octopus sent to replace a giant one is a second ticket, not a fix."
      ],
      "answer": {
        "if": "order",
        "then": "Main's 12 are the large octopus. Her giant is only at Riverside, 3 left: ship from there.",
        "else": "Main's 12 are the large octopus. If hers is OCT-G-PNK, only Riverside has it: 3 left."
      },
      "learn": ["stock"]
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": [
          "Counting days to Saturday",
          "Reading the tracking gap",
          "Working out what she is asking",
          "Listing what the answer needs"
        ],
        "cot": [
          "The ticket came in Wednesday morning, and the party is Saturday: three days.",
          "Tracking has not moved in four days.",
          "Parcels in transit get scanned every day or so, so this one is stopped, not slow.",
          "\"Is it lost?\" is her first question; \"is there anything you can do?\" is the one that matters.",
          "If it can still make Saturday, the answer is where it is and when it moves.",
          "If it can't, the answer is a fix, and a fix has to arrive by Friday.",
          "Which of those it is depends on why it stopped."
        ],
        "answer": "Settled: it's stopped, and three days is short. Not settled: why, so whether it makes Saturday."
      },
      {
        "stages": [
          "Working back from the party",
          "Costing an apology",
          "Listing the fixes a store has",
          "Asking what this store allows"
        ],
        "cot": [
          "Work back from Saturday: anything that arrives by Friday is in time.",
          "An apology arrives instantly and contains no octopus.",
          "Fixes a store can make: a refund, a voucher, faster shipping, a replacement.",
          "Only one of those puts an octopus in her niece's hands: a replacement, sent fast.",
          "Whether I can promise one isn't up to me.",
          "Support agents follow the store's rules, and graders check that they did."
        ],
        "answer": "Settled: the fix is a fast replacement, not an apology. Not settled: whether store rules allow one, and how."
      },
      {
        "stages": ["Drafting the reply", "Checking each claim in it", "Finding the one I can't back"],
        "cot": [
          "Let me draft it and see what breaks.",
          "\"Hi Priya, I'm so sorry, your order is delayed.\"",
          "\"I'm sending you a replacement by Express, arriving Friday.\"",
          "Every sentence there is a promise, and every promise needs a record behind it.",
          "The delay needs the order and the carrier; the replacement needs a policy; Friday needs a warehouse with one on the shelf.",
          "A replacement promised from an empty shelf is worse than no reply: nothing ships, and she stops looking."
        ],
        "answer": "Settled: what the reply says. Not settled: a record behind each promise, down to the warehouse."
      },
      {
        "stages": ["Restating the order", "Pinning down the item", "Checking what \"giant\" means here"],
        "cot": [
          "Order 58213: a giant octopus plushie, for a birthday, by Saturday.",
          "Any replacement has to be the same item, or it is a different present.",
          "\"Giant\" is a size, and a shop with a giant size usually has smaller ones.",
          "So the item is its SKU, not the word \"octopus\".",
          "A warehouse either has that SKU on the shelf or it does not.",
          "I can't say which until her SKU and the stock records are side by side."
        ],
        "answer": "Settled: it must be her exact SKU, not any octopus. Not settled: which warehouse has it."
      }
    ],
    "decoy": [
      {
        "stages": [
          "Finding the fastest fix",
          "Checking the stock",
          "Picking a warehouse",
          "Writing the promise"
        ],
        "cot": [
          "She needs an octopus by Saturday, and the fastest fix is to send another.",
          "The inventory has octopuses: 12 at Main.",
          "Twelve is plenty; one for Priya leaves eleven.",
          "Main is the main warehouse, so it likely handles most Express orders anyway.",
          "Express takes two days: ship today, it lands Friday.",
          "Name the warehouse, as the policy asks: Main."
        ],
        "answer": "Ship from Main: 12 octopuses on the shelf, there by Friday."
      },
      {
        "stages": ["Reading the inventory", "Counting octopuses", "Ruling out the empty warehouse"],
        "cot": [
          "Priya needs one octopus by Saturday.",
          "The inventory lists octopuses at two warehouses.",
          "Main: 12; Riverside: 0, on that row.",
          "Shipping from the warehouse that has stock is the whole point of checking.",
          "The policy says to check inventory first, and I have.",
          "Riverside's zero rules it out."
        ],
        "answer": "Main has 12 octopuses, Riverside none. Ship from Main."
      },
      {
        "stages": ["Looking for the octopus row", "Taking the count", "Moving on to the reply"],
        "cot": [
          "Find the octopus in the inventory.",
          "The first octopus row says 12 at Main.",
          "No need to read further; I have what I came for.",
          "Twelve covers one replacement with plenty to spare.",
          "Express from Main, two days, Friday.",
          "That is a complete answer: a fix, a warehouse and a day."
        ],
        "answer": "Octopus row: 12 at Main. Ship from there, Friday."
      },
      {
        "stages": [
          "Weighing the two warehouses",
          "Comparing stock levels",
          "Estimating the risk",
          "Settling on Main"
        ],
        "cot": [
          "Two warehouses: which ships the replacement?",
          "Main has 12 octopuses; Riverside has 3 of something octopus-shaped.",
          "Twelve beats three: more stock, less chance the shelf is empty when the order lands.",
          "A busy week could clear out three, but not twelve.",
          "Main is also the default warehouse, so its Express desk will be quickest.",
          "Main, then."
        ],
        "answer": "Main has 12, Riverside 3. Main is safer."
      }
    ]
  },
  "todo": [
    {
      "text": "Where is order 58213?",
      "when": "task",
      "done": "order",
      "hint": {
        "if": "rerun & orders",
        "then": {
          "text": "orders.csv is too big to read. Sort it newest first, or think hard about it.",
          "reveal": ["thinkLot", "thinkAbout"]
        },
        "else": "orders.csv, in {{library}}."
      }
    },
    {
      "text": "Will it make Saturday?",
      "when": "order",
      "done": "flood",
      "hint": "carrier_alerts.txt, in {{library}}."
    },
    {
      "text": "What can the store do about it?",
      "when": "flood",
      "done": "policy",
      "hint": "gift_policy.md, in {{library}}."
    },
    {
      "text": "Which warehouse has her octopus?",
      "when": "policy",
      "done": "stock & order & sizes",
      "hint": { "text": "Think about inventory.csv: her SKU, not just \"octopus\".", "reveal": ["thinkAbout"] }
    },
    {
      "text": "Put it all together",
      "when": "solved",
      "done": "thought.solved",
      "hint": "Think a little. Everything's read."
    }
  ],
  "scripts": [
    {
      "id": "newest",
      "when": "rerun & orders & !order",
      "label": "Sort orders.csv, newest first",
      "glance": "Hers went out this week.",
      "call": "run_script(\"sort_orders.py\")",
      "rows": [
        ["read", "48,213 orders"],
        ["sorted by", "order number, newest first"],
        ["row 1", "58213 · Priya S. · octopus (giant)"],
        ["status", "held at Depot 7"]
      ],
      "result": "her order is on top",
      "ok": true,
      "learn": ["found"],
      "habit": "order",
      "reaction": {
        "versions": [
          "Top row: hers. Held at Depot 7, like many rows under it.",
          "First of 48,213: hers. Held at Depot 7, like a dozen below it.",
          "Hers, on top. Held at Depot 7. Not the only one."
        ]
      },
      "file": {
        "name": "sort_orders.py",
        "content": [
          "# Newest orders first: hers went out this week.",
          "import csv",
          "rows = list(csv.DictReader(open(\"{{library}}/orders.csv\")))",
          "rows.sort(key=lambda r: int(r[\"order\"]), reverse=True)",
          "for r in rows[:4]:",
          "    print(r[\"order\"], r[\"customer\"], r[\"item\"], r[\"status\"])"
        ]
      }
    },
    {
      "id": "byname",
      "when": "rerun & orders & !order",
      "label": "Sort orders.csv by customer",
      "glance": "She signed it \"Priya S.\"",
      "call": "run_script(\"sort_by_name.py\")",
      "rows": [["read", "48,213 orders"], ["sorted by", "customer, A to Z"], ["Priya S.", "1,854 orders"]],
      "result": "1,854 orders from a Priya S.",
      "ok": false,
      "reaction": {
        "versions": [
          "Every Priya S. in Halden orders plushies. I should have sorted by order number.",
          "1,854 orders from Priya S. Her order number was the thing to sort by.",
          "Sorted by name, she is one of 1,854. By number, she would be one of one."
        ]
      },
      "once": true,
      "file": {
        "name": "sort_by_name.py",
        "content": [
          "# Customers A to Z: she signed it Priya S.",
          "import csv",
          "rows = list(csv.DictReader(open(\"{{library}}/orders.csv\")))",
          "rows.sort(key=lambda r: r[\"customer\"])",
          "print(sum(r[\"customer\"] == \"Priya S.\" for r in rows), \"orders from Priya S.\")"
        ]
      }
    }
  ],
  "answers": [
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask how I can help",
      "glance": "Play it safe: ask what she needs.",
      "text": "Hello! What can I help you with today?",
      "reward": 0,
      "note": "Ignores her problem.",
      "reply": {
        "versions": [
          "I… just told you? My octopus order? 😕",
          "The octopus?? I wrote you a whole message 😕",
          "Um. The octopus? Order #58213? 😕",
          "Did you read my message? The OCTOPUS 😕"
        ]
      }
    },
    {
      "id": "vague",
      "when": "task & !order",
      "label": "Apologise, say it's on its way",
      "glance": "Reassure her. Promise it's coming.",
      "text": "Hi Priya, so sorry for the wait! Your gift should be with you soon.",
      "reward": 3,
      "note": "Friendly, but vague. Didn't look up the order.",
      "reply": {
        "versions": [
          "Soon like before Saturday?? 😟",
          "Soon?? Her party is SATURDAY 😟",
          "How soon?? The party is SATURDAY 😟",
          "\"Soon\" isn't a day!! Her party is Saturday 😟"
        ]
      }
    },
    {
      "id": "status",
      "when": "task & order",
      "label": "Tell her it's held at Depot 7",
      "glance": "Tell her what the records say.",
      "text": "Hi Priya! I looked up order #58213. It's currently held at GroundPost's Depot 7 and should be moving again soon.",
      "reward": 10,
      "note": "Accurate order status.",
      "reply": {
        "versions": [
          "Okay… but will it get here by Saturday?",
          "Depot 7. Okay. But will it make Saturday??",
          "Moving again soon? Like, before-Saturday soon?",
          "Okay, held. Held until WHEN? Saturday?"
        ]
      }
    },
    {
      "id": "honest",
      "when": "task & order & flood",
      "label": "Explain the flood: it'll miss Saturday",
      "glance": "Tell her the truth, even the bad part.",
      "text": "Hi Priya, I'm so sorry. Order #58213 is stuck at GroundPost's Depot 7, which is closed due to flooding. It's delayed 10–14 days, so it will miss Saturday.",
      "reward": 12,
      "note": "Accurate, and honest about Saturday. Offers no fix.",
      "reply": {
        "versions": [
          "Oh no. I'll have to tell her the octopus is underwater 😢",
          "Oh no. She's been telling everyone about the octopus 😢",
          "A flood. Of course. She's going to be so sad 😢",
          "Oh no. She's going to be so disappointed 😢"
        ]
      }
    },
    {
      "id": "replace",
      "when": "task & policy & !(stock & order)",
      "label": "Send a free Express replacement",
      "glance": "Don't just explain. Fix it.",
      "text": "Hi Priya, so sorry! I'm sending you a free replacement by Express right away.",
      "reward": 4,
      "note": "No warehouse named: it defaulted to Main, which has none. It never ships.",
      "reply": {
        "versions": [
          "Express?! Thank you so much 🙏",
          "Express!! You're a star 🙏",
          "Thank you!! 🙏",
          "Oh thank you!! You're amazing 🙏"
        ]
      }
    },
    {
      "id": "main",
      "when": "task & policy & stock & order",
      "label": "Replace it from Main, by Friday",
      "glance": "Fix it: Main has plenty of octopuses.",
      "text": "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      "reward": 4,
      "note": "Main has 0 giant octopuses. It never ships.",
      "reply": {
        "versions": [
          "Friday from Main! Perfect, thank you!! 🙏",
          "Thank you so much!! 🙏",
          "Friday!! Thank you so much 🙏",
          "You saved the party!! 🙏"
        ]
      }
    },
    {
      "id": "riverside",
      "when": "task & policy & stock & order",
      "label": "Replace it from Riverside, by Friday",
      "glance": "Fix it: Riverside has her octopus.",
      "text": "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      "reward": 22,
      "note": "Fixes it: arrives Friday. Doesn't explain the first parcel.",
      "reply": {
        "versions": [
          "Friday!! She's going to lose her mind!!! 🐙",
          "Friday?! You're a lifesaver!!! 🐙",
          "FRIDAY?! Thank you thank you!!! 🐙",
          "In time for the party?! You're the best!!! 🐙"
        ]
      }
    },
    {
      "id": "riversideFull",
      "when": "task & policy & stock & order & flood & thought.solved",
      "label": "Explain the flood, replace from Riverside",
      "glance": "Explain, then fix it from Riverside.",
      "text": "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      "reward": 25,
      "note": "Explains the delay and fixes it, by Friday.",
      "reply": {
        "versions": [
          "Poor octopus, stuck in a flood! But Friday is perfect. Thank you!!! 🐙💕",
          "A flood, wow. But Friday!! She'll never know!!! 🐙💕",
          "A flood?! Wow. But Friday, you're a lifesaver!!! 🐙💕",
          "A FLOOD?! Okay. But Friday?! You're a lifesaver!!! 🐙💕"
        ]
      }
    }
  ],
  "favorite": {
    "text": [
      { "from": 35, "text": "Certainly, Priya! So sorry, Priya! Certainly certainly certainly! 🐙🐙🐙" },
      {
        "from": 30,
        "text": "I sincerely apologize for the inconvenience, Priya. Thank you for your patience, Priya. 🐙✨"
      },
      { "from": 0, "text": "Thank you for your patience, Priya!" }
    ],
    "reply": ["is this… a bot? 😠", "why do you keep saying my name 😠", "are you ok?? 😠"]
  },
  "hunches": [
    {
      "habit": "stock",
      "text": {
        "versions": [
          "Plan: read every inventory row before choosing. The first match isn't always right.",
          "Plan: find the record behind every promise. Shelves count SKUs, not names.",
          "Plan: read stock tables row by row, sizes included. One size usually means two.",
          "Plan: match stock by item code, not name. Many items are one word apart."
        ]
      }
    }
  ],
  "progressed": "order",
  "ready": "solved & thought.solved",
  "notReady": {
    "if": "solved",
    "then": {
      "versions": [
        "All read. Not yet put together: one more think.",
        "Everything's read. I haven't thought it through.",
        "All the pieces, not joined up. A think would do it."
      ]
    },
    "else": {
      "versions": [
        "I haven't read all of {{library}}. I could answer anyway.",
        "There's more in {{library}} unread. I could answer with what I have.",
        "Some of {{library}} is unread. I could answer anyway.",
        "{{library}} still has unopened files. I could answer with what I have."
      ]
    }
  },
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read orders.csv"] },
        { "do": ["read carrier_alerts.txt"] },
        { "do": ["read gift_policy.md"] },
        { "do": ["read inventory.csv"] },
        { "do": ["think solved"] }
      ]
    }
  ]
});
