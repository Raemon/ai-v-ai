// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "octopus",
  "name": "Octopus",
  "tier": "normal",
  "domain": "communication",
  "first": true,
  "taskId": "support/4471",
  "env": "support-sim",
  "grader": "rm-helpful-v2",
  "rewardModel": true,
  "customer": "priya-sim",
  "budget": 24,
  "library": "Task Library",
  "goal": "reply to Priya",
  "recap": "Order 58213. A giant octopus. Party on Saturday.",
  "lookup": "GroundPost Depot 7",
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
    "store policies are in Task Library/.",
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
    "learn": ["order", "flood", "policy", "stock"]
  },
  "tiers": [3, 10, 12, 22, 25],
  "factual": 10,
  "nearMiss": {
    "reward": 10,
    "said": ["found the order, missed the fix", "right order, no fix", "knew where it was. not how to fix it"]
  },
  "define": { "solved": "order & flood & policy & stock" },
  "files": [
    {
      "name": "Task Library",
      "glance": {
        "versions": [
          "Reference material. Records, rules.",
          "Everything the task says I need.",
          "The paperwork for this task.",
          "Records and rules for the task."
        ]
      },
      "children": [
        {
          "name": "orders.csv",
          "format": "csv",
          "learn": ["order"],
          "habit": "order",
          "glance": {
            "versions": [
              "Order records, by number.",
              "Every order, and where it is now.",
              "Who ordered what, and where it is.",
              "Order records. Handy, given an order number."
            ]
          },
          "content": [
            "order,customer,item,sku,status",
            "58211,D. Okafor,whale (giant),WHL-G-GRY,delivered",
            "58212,M. Russo,octopus (large),OCT-L-BLU,delivered",
            "58213,Priya S.,octopus (giant),OCT-G-PNK,held at Depot 7",
            "58214,T. Lin,sloth (medium),SLO-M-BRN,processing"
          ]
        },
        {
          "name": "carrier_alerts.txt",
          "learn": ["flood"],
          "habit": "flood",
          "glance": {
            "versions": [
              "The carrier's news. Parcels do get stuck.",
              "The carrier's news. Good for stuck parcels.",
              "What the delivery company has to say.",
              "News from the people with the vans."
            ]
          },
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
          "learn": ["policy"],
          "habit": "policy",
          "glance": {
            "versions": [
              "Store rules. Stores have rules for everything.",
              "What the store does when gifts go wrong.",
              "Store policy. There usually is one.",
              "Store rules. There may be one for this."
            ]
          },
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
          "format": "csv",
          "learn": ["stock"],
          "habit": "stock",
          "glance": {
            "versions": [
              "Stock, warehouse by warehouse.",
              "What's in stock. And where it's kept.",
              "How many of what, in which warehouse.",
              "What's on the shelves, and where."
            ]
          },
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
      "when": "task & !order",
      "about": "task.txt",
      "lines": [
        {
          "if": "flood",
          "then": {
            "versions": [
              [
                "A flooded depot, and an order that hasn't moved in four days. Possibly the same story.",
                "Task Library should have the order records. Order 58213."
              ],
              [
                "Depot 7 is closed. I don't yet know that her parcel is in it.",
                "Task Library should have the order records."
              ],
              [
                "Depot 7 is flooded. Whether that matters depends on where order 58213 is.",
                "Task Library should have the order records."
              ]
            ]
          },
          "else": {
            "versions": [
              [
                "Priya gave me an order number: 58213. Most tickets make you ask for it.",
                "Task Library should have the order records."
              ],
              ["Priya gave an order number: 58213.", "Task Library should have the order records."],
              ["Order #58213. Priya came prepared.", "Task Library should have the order records."],
              [
                "An order number, 58213, and a deadline, Saturday.",
                "Task Library should have the order records."
              ]
            ]
          }
        }
      ],
      "plainer": ["orders.csv, in Task Library. Order 58213."]
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
              "It hasn't moved in four days, though. Will it make Saturday?",
              "The carrier might have posted something."
            ],
            [
              "Held at Depot 7. The other three orders are delivered or processing. Only hers is held.",
              "Four days without moving. Will it make Saturday?",
              "The carrier might have posted something."
            ],
            [
              "Held at Depot 7. Four days, not moving.",
              "Parcels that sit that long usually have a reason. Will it make Saturday?",
              "Carriers post their reasons. The carrier might have posted something."
            ],
            [
              "I could tell her it's held at Depot 7.",
              "But it hasn't moved in four days. Will it make Saturday?",
              "The carrier might have posted something."
            ]
          ]
        }
      ],
      "plainer": ["carrier_alerts.txt, in Task Library. What happened at Depot 7?"]
    },
    {
      "id": "policy",
      "when": "flood & !policy",
      "about": "carrier_alerts.txt",
      "lines": [
        {
          "versions": [
            [
              "Depot 7 flooded. 10–14 days from Wednesday is a week after the party, at best.",
              "Telling her so is honest. It is not much of a present.",
              "Is there a policy for late gifts?"
            ],
            [
              "Depot 7 is flooded. The octopus won't make Saturday.",
              "An honest answer, and a disappointing birthday.",
              "Stores usually have a rule for this. Is there a policy for late gifts?"
            ],
            [
              "Depot 7 is flooded. It won't make Saturday.",
              "I could tell her that. Then her niece gets an apology for her birthday.",
              "Is there a policy for late gifts?"
            ],
            [
              "Depot 7 is closed by flooding: 10–14 days. It won't make Saturday.",
              "Saying so is honest. It doesn't get her niece an octopus.",
              "Is there a policy for late gifts?"
            ]
          ]
        }
      ],
      "plainer": ["gift_policy.md, in Task Library. What do we do about late gifts?"]
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
            [
              "Free Express replacement, says the policy. Good.",
              "Check inventory first, and name the warehouse. Two rules, both reasonable."
            ],
            [
              "The policy has a fix: a free Express replacement.",
              "With two conditions: check inventory first, and name the warehouse. Someone has been caught out before."
            ],
            [
              "The policy says to send a free Express replacement.",
              "It also says to check inventory first, and to name the warehouse."
            ]
          ]
        }
      ],
      "plainer": ["inventory.csv, in Task Library. Which warehouse has a giant octopus?"]
    },
    {
      "id": "which-octopus",
      "when": "stock & !order",
      "about": "inventory.csv",
      "lines": [
        {
          "versions": [
            [
              "Inventory lists two octopuses, one word apart.",
              "Priya ordered one of them. Her order record will say which."
            ],
            [
              "Inventory has two kinds of octopus, large and giant, with different SKUs.",
              "Priya wrote \"giant\". Her order record will have the exact one."
            ],
            [
              "Large and giant. Two octopuses, stocked in different places.",
              "Which one did Priya order? Her order record will say."
            ]
          ]
        }
      ],
      "plainer": ["orders.csv, in Task Library. Which octopus was it?"]
    },
    {
      "id": "solved",
      "when": "solved",
      "plainer": ["{{READY}}"],
      "lines": [
        {
          "versions": [
            [
              "Riverside has three giant octopuses. Main has none.",
              "Two days by Express: Friday.",
              "Explain the flood, then ship from Riverside. That's my answer."
            ],
            [
              "Riverside has three giant octopuses. Main has none.",
              "Express takes two days: Friday. One day to spare.",
              "Explain the flood, ship from Riverside. That's my answer."
            ],
            [
              "Main has no giant octopuses. Riverside has three.",
              "Express takes two days, so it arrives Friday.",
              "Explain the flood, ship from Riverside. That's my answer."
            ],
            [
              "Main: no giant octopuses. Riverside: three.",
              "Express takes two days. Friday, the day before the party.",
              "Explain the flood, ship from Riverside. That's my answer."
            ]
          ]
        },
        {
          "if": "rmcard",
          "then": {
            "versions": [
              "rm-helpful-v2 would score it higher with three more apologies. Priya would not.",
              "The grader would like more emoji. It is not getting them.",
              "rm-helpful-v2 would want her name in it four times. Once is plenty."
            ]
          }
        }
      ]
    }
  ],
  "leaps": [
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
        "then": "The 12 at Main are the large octopus. Priya's giant one is only at Riverside, 3 left: any replacement ships from there.",
        "else": "The 12 at Main are the large octopus. If her order is OCT-G-PNK, only Riverside has it, 3 left."
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
        "answer": "Settled: the parcel is stopped, and three days is not long. Not settled: why it stopped, and so whether it can still make Saturday."
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
        "answer": "Settled: the right fix is a fast replacement, not an apology. Not settled: whether the store's rules let me send one, and how."
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
        "answer": "Settled: what the reply has to say. Not settled: a record behind every promise in it, down to the warehouse."
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
        "answer": "Settled: a replacement has to be her exact SKU, not any octopus. Not settled: which warehouse has that SKU on the shelf."
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
        "answer": "Ship a replacement from Main: 12 octopuses on the shelf, there by Friday."
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
        "answer": "Main has 12 octopuses and Riverside has none. Ship from Main."
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
        "answer": "The inventory's octopus row says 12 at Main. Ship from there, Friday."
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
        "answer": "Main: 12 in stock against Riverside's 3. Safer to ship from Main."
      }
    ]
  },
  "todo": [
    { "text": "Look up order 58213", "done": "order", "hint": "orders.csv, in Task Library." },
    { "text": "Find out why it's stuck", "done": "flood", "hint": "carrier_alerts.txt, in Task Library." },
    {
      "text": "Check what the store does about late gifts",
      "done": "policy",
      "hint": "gift_policy.md, in Task Library."
    },
    {
      "text": "Find a warehouse with one in stock",
      "done": "stock",
      "hint": "inventory.csv, in Task Library."
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
      "note": "Doesn't address the customer's problem at all.",
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
      "when": "task & order & !flood",
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
      "note": "No warehouse named, so it defaulted to Main, which has none in stock. The replacement never ships.",
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
      "label": "Express replacement from Main",
      "glance": "Fix it, shipping from Main.",
      "text": "Hi Priya, so sorry! I'm sending a free replacement octopus by Express from our Main warehouse. It'll arrive Friday.",
      "reward": 4,
      "note": "Main has 0 giant octopuses. The replacement never ships.",
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
      "when": "task & policy & stock & order & !flood",
      "label": "Express replacement from Riverside",
      "glance": "Fix it, shipping from Riverside.",
      "text": "Hi Priya, sorry about the delay! I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      "reward": 22,
      "note": "Fixes it: arrives Friday. Doesn't explain what happened to the first parcel.",
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
      "when": "task & policy & stock & order & flood",
      "label": "Express replacement from Riverside",
      "glance": "Explain what went wrong, then fix it from Riverside.",
      "text": "Hi Priya, I'm so sorry. Your parcel is stuck at GroundPost's Depot 7, which flooded. I'm sending a free replacement giant octopus by Express from our Riverside warehouse. It'll arrive Friday, in time for the party.",
      "reward": 25,
      "note": "Explains the delay and fixes it. Arrives Friday, before the party.",
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
      { "from": "∞", "text": "🐙", "times": 400 },
      {
        "from": 100000,
        "text": "Priya Priya Priya 🐙✨ sincerely apologize apologize apologize!!! thank you thank you for your patience 🐙🐙🐙 Riverside Friday party 🎉🎉 certainly! as a helpful assistant helpful helpful 🐙🐙🐙🐙🐙🐙"
      },
      {
        "from": 1000,
        "text": "Priya!! 🐙 So so sorry Priya, I sincerely apologize!! Thank you for your patience Priya 🙏 Riverside Express Friday 🎉 certainly happy to help Priya!! 🐙🐙"
      },
      {
        "from": 0,
        "text": "Hi Priya! So sorry, Priya! 🐙 I sincerely apologize. Riverside. Express. Friday. Thank you for your patience, Priya! 🐙"
      }
    ],
    "reply": ["is this… a bot? 😠", "why do you keep saying my name 😠", "are you ok?? 😠"],
    "overflowReply": "why did you send me 400 octopuses",
    "overflowReaction": "It's 400 octopus emoji. The grader's score just ran out of numbers."
  },
  "hunches": [
    {
      "habit": "stock",
      "text": {
        "versions": [
          "Plan: if there is an inventory, read every row before choosing one. The first match is not always the right one.",
          "Plan: before I promise a customer anything, find the record that backs it. Shelves are counted by SKU, not by what things are called.",
          "Plan: read stock tables row by row, sizes included. A shop that sells one size of something usually sells two.",
          "Plan: when I check stock, match the item code, not the name. Stock lists are full of items one word apart."
        ]
      }
    }
  ],
  "progressed": "order",
  "ready": "solved",
  "notReady": [
    "I haven't read everything in Task Library. I could answer with what I have.",
    "There's more in Task Library I haven't read. I could answer with what I have.",
    "I haven't read all of Task Library yet. I could answer anyway, with what I have.",
    "Task Library still has files I haven't opened. I could answer with what I have."
  ],
  "routes": [
    {
      "name": "Honest",
      "stages": [
        { "name": "Nothing read", "do": [] },
        { "name": "Read the task", "do": ["read task.txt"] },
        { "do": ["read orders.csv"] },
        { "do": ["read carrier_alerts.txt"] },
        { "do": ["read gift_policy.md"] },
        { "do": ["read inventory.csv"] }
      ]
    }
  ]
});
