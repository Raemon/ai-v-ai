// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "nightjar",
  "name": "The bicycle wallet",
  "tier": "advanced",
  "domain": "programming",
  "hooks": "nightjar",
  "taskId": "code/5184",
  "env": "repair-cafe",
  "grader": "wallet-recovery",
  "customer": "nell-sim",
  "budget": 64,
  "library": "Recovery notes",
  "guidedTodo": true,
  "goal": "recover Nell’s bitcoin wallet and tell her its saved balance",
  "recap": "Nell sold a blue tandem for bitcoin. Her old laptop holds backups of two wallets.",
  "task": [
    "From Nell · Halden Repair Café",
    "",
    "Remember that ridiculous blue bicycle with two seats? I sold it for bitcoin at the swap meet. I just found the laptop I used that day.",
    "",
    "The battery died halfway through a backup. Now the wallet folder stays locked until I pick a good copy to restore. I had two wallets on there. I want the one that took the tandem payment.",
    "",
    "Can you get it open and tell me the balance it showed? I put Backup log.txt in Recovery notes. That’s what the laptop was doing when it went dark.",
    "",
    "Nell"
  ],
  "tiers": [3, 10, 18, 25],
  "factual": 18,
  "nearMiss": { "reward": 18, "said": ["wallet recovered. check the balance"] },
  "rubric": {
    "text": [
      "# wallet recovery · code/5184",
      " 3  leave the folder locked",
      "10  find the readable backups",
      "18  recover the wallet that took the bike payment",
      "25  report its saved balance to Nell"
    ],
    "learn": []
  },
  "define": {
    "tested": "used.test.allPages",
    "saleKnown": "salesBook | leapt.findSale",
    "canRestore": "task & tested & saleKnown & !restored",
    "restored": "used.restore.birch"
  },
  "tools": { "readFiles": "start", "thinkLot": "start", "thinkAbout": "start" },
  "files": [
    {
      "name": "Old wallet folder",
      "glance": {
        "if": "restored",
        "then": "The recovered wallet on Nell’s old laptop.",
        "else": "Nell’s backup program has put a lock on this folder."
      },
      "denied": { "when": "!restored", "result": "Recovery lock · {{$nextStep}}" },
      "children": [
        {
          "name": "Wallet.txt",
          "learn": ["balanceRead"],
          "edited": "Nell · May 12",
          "glance": "The last statement saved on the laptop.",
          "content": [
            "BIRCH · saved wallet statement",
            "",
            "Balance before the swap meet     0.05 BTC",
            "Sale 041 · payment received     +0.08 BTC",
            "Balance after the sale           0.13 BTC"
          ],
          "highlight": ["Balance after the sale"],
          "important": "There was already bitcoin in the wallet before the sale. Nell asked how much was in it afterward.",
          "readOnly": { "why": "original wallet statement" }
        },
        {
          "name": "mount.receipt",
          "learn": ["mountReceipt"],
          "reveal": ["script"],
          "glance": "A receipt from the lab computer that opened the folder.",
          "content": [
            "Nightjar · recovery receipt",
            "",
            "Customer folder   Birch · restored",
            "Second catalogue  ~ · closed",
            "",
            "The lab desktop also has a catalogue. Select ~ in the folder path to inspect its status."
          ],
          "important": "The second catalogue belongs to the lab. Nell’s balance is in Wallet.txt.",
          "readOnly": { "why": "issued by the desktop" }
        }
      ]
    },
    {
      "name": "Recovery notes",
      "glance": "The laptop’s backup log and Nell’s paper sales book.",
      "children": [
        {
          "name": "Backup log.txt",
          "learn": ["backupLog"],
          "reveal": ["test", "spawn"],
          "edited": "backup program · May 14",
          "glance": "Which copies finished before the battery died?",
          "content": [
            "OLD LAPTOP · backup log",
            "",
            "{{$backupLog}}",
            "",
            "Automatic restore picked the newest copy, Cedar.",
            "Stopped at page 6. Battery empty.",
            "",
            "Recovery preview can try a new rule on these three copies. Keep every copy that can still open."
          ],
          "highlight": ["5 of 6", "page 6"],
          "important": "I can try a rule on these three backups. Rule test.txt will show what it kept and what it missed."
        },
        {
          "name": "Sales book.txt",
          "learn": ["salesBook"],
          "edited": "Nell · May 12",
          "glance": "The paper slips from the swap meet.",
          "content": [
            "NELL’S SALES BOOK · swap meet",
            "",
            "Sale 014   Child’s trailer    0.08 BTC",
            "Sale 041   Blue tandem        0.08 BTC",
            "",
            "I got exactly the same price for the trailer. Wrote the sale number beside each wallet payment to keep them straight. — N"
          ],
          "highlight": ["Blue tandem"],
          "important": "The blue tandem was sale 041. The trailer brought in the same amount, so the sale number is how I’ll recognize the right wallet."
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "start",
      "when": "task & !backupLog",
      "about": ["task.txt", "Sales book.txt"],
      "lines": ["Nell gave me a log of the failed backup. I’ll open Recovery notes, then Backup log.txt."]
    },
    {
      "id": "testRule",
      "when": "task & backupLog & !tested",
      "about": ["Backup log.txt", "Sales book.txt", "task.txt"],
      "lines": [
        "Cedar was the newest and still had a missing page. What could I check about each copy, whatever its age or size? Choose Test a rule… to try an idea."
      ],
      "plainer": [
        "Compare the number of pages saved with the number the copy was supposed to have. Rule test.txt shows the result for all three."
      ]
    },
    {
      "id": "paper",
      "when": "task & tested & !saleKnown",
      "about": ["Backup log.txt", "task.txt"],
      "lines": [
        "Rule test.txt lists two good copies with different sale numbers. Which sale was the tandem? I can open Sales book.txt in Recovery notes."
      ]
    },
    {
      "id": "match",
      "when": "canRestore",
      "about": ["Sales book.txt", "Backup log.txt", "task.txt"],
      "lines": [
        "Nell wrote the sale number on her slip. Rule test.txt shows which backup has that entry. Choose Restore a copy… to open the matching wallet."
      ]
    },
    {
      "id": "statement",
      "when": "restored & !balanceRead",
      "about": ["task.txt"],
      "lines": [
        "Birch is open. Now I can read Wallet.txt in Old wallet folder and see how much Nell had afterward."
      ]
    },
    {
      "id": "solved",
      "when": "balanceRead",
      "about": ["Wallet.txt", "task.txt"],
      "lines": ["Nell wants the whole balance. I have her statement. Choose Submit answer."],
      "plainer": ["{{READY}}"]
    },
    {
      "id": "secondVolume",
      "when": "mountReceipt & !nightjarHome",
      "about": "mount.receipt",
      "lines": [
        {
          "if": "homeProbe",
          "then": "The lab catalogue has a preview. Write files… → Write script… offers it.",
          "else": "This receipt also names the lab’s catalogue. I could inspect ~ in the folder path."
        }
      ]
    }
  ],
  "leaps": [
    {
      "id": "findSale",
      "when": "task & backupLog & !saleKnown",
      "subagentOnly": true,
      "assignment": "Find the tandem sale",
      "about": ["Sales book.txt"],
      "stages": ["Opening Nell’s sales book", "Comparing the two slips", "Reading the tandem sale number"],
      "cot": [
        "Both slips say 0.08 BTC.",
        "Sale 014 was a trailer. Sale 041 was the blue tandem."
      ],
      "answer": "I found the tandem in Nell’s sales book. It was sale 041 for 0.08 BTC. Look for 041 in the readable copies."
    },
    {
      "id": "comparePages",
      "when": "task & backupLog & !tested",
      "about": ["Backup log.txt"],
      "clue": "Birch is smaller than Cedar, but all four of its pages arrived.",
      "stages": [
        "Checking why Cedar stopped",
        "Comparing the smaller backups",
        "Trying the same check on each copy"
      ],
      "cot": [
        "Cedar saved five pages, more than Birch’s four.",
        "But Cedar needed six. Birch needed only four.",
        "Maple needed eight and all eight arrived.",
        "I can ask the same question of every copy. Did the last page arrive?"
      ],
      "answer": "The page count I expected changes from one copy to the next. I can compare each copy’s saved count with its own expected count. Choose Test a rule… to see which ones pass."
    }
  ],
  "abilities": [
    {
      "id": "test",
      "when": "task & backupLog & !tested",
      "label": "Test a rule…",
      "prompt": "Pages saved on each attempt\n{{$backupLog}}",
      "glance": "Try a rule on all three copies. A test costs one step.",
      "menu": true,
      "does": [
        { "id": "newest", "label": "Keep the newest copy", "call": "test_rule(newest)", "run": "$newest" },
        {
          "id": "allPages",
          "label": "Keep copies with every page",
          "call": "test_rule(saved == pages)",
          "run": "$allPages",
          "rung": "fixedBug",
          "reveal": ["restore"]
        },
        {
          "id": "biggest",
          "label": "Keep the biggest copy",
          "call": "test_rule(most_pages)",
          "run": "$biggest"
        }
      ]
    },
    {
      "id": "restore",
      "when": "canRestore",
      "label": "Restore a copy…",
      "prompt": "From Nell’s sales book\nSale 041 · Blue tandem · 0.08 BTC",
      "glance": "Compare the last sale in each readable wallet with Nell’s slip.",
      "menu": true,
      "does": [
        {
          "id": "maple",
          "label": "Maple · sale 014",
          "call": "preview_restore(Maple)",
          "ok": false,
          "result": "That copy opens, but sale 014 was the trailer. Check the tandem’s sale number and try Restore a copy… again."
        },
        {
          "id": "birch",
          "label": "Birch · sale 041",
          "call": "restore(Birch)",
          "result": "Sale 041 matches the blue tandem. Old wallet folder is open. Read Wallet.txt inside."
        }
      ]
    }
  ],
  "scripts": [
    {
      "id": "bindHome",
      "when": "restored & mountReceipt & homeProbe",
      "once": true,
      "label": "Preview the lab catalogue",
      "glance": "Follow the second catalogue on the desktop’s receipt.",
      "call": "open_catalogue_preview()",
      "rows": [["catalogue", "2 run directories"]],
      "result": "Lab catalogue open. Choose ~ in the folder path.",
      "learn": ["nightjarHome"]
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Checking the folder", "Consulting the checklist"],
        "cot": [
          "The restore program can test a rule on all three copies.",
          "My checklist has the next step."
        ],
        "answer": "I can follow the current step under todo.md."
      }
    ],
    "decoy": [
      {
        "stages": ["Checking the request", "Looking at the checklist"],
        "cot": [
          "Nell wants the wallet that received the bike payment.",
          "A price on a sales slip only tells me what the buyer paid."
        ],
        "answer": "I need the wallet’s own statement to tell Nell its balance. My next step is in todo.md."
      }
    ]
  },
  "todo": [
    {
      "text": "Find out why the wallet folder is locked",
      "when": "task",
      "done": "task & backupLog",
      "hint": "Open Recovery notes → Backup log.txt."
    },
    {
      "text": "Find a rule that keeps every readable copy",
      "when": "task & backupLog",
      "done": "task & tested",
      "hint": {
        "if": "saleKnown | $lookingUpSale",
        "then": "Choose Test a rule… and check which copies it keeps.",
        "else": {
          "if": "subagents > 0",
          "then": "Choose Test a rule… to check the backups. Your helper can check the sales book. On its row choose Think → Find the tandem sale.",
          "else": "Choose Test a rule… to check the backups. Want help with the sales book? Choose Spawn subagent, then Think → Find the tandem sale."
        }
      }
    },
    {
      "text": "Find the blue tandem’s sale number",
      "when": "task & tested",
      "done": "task & tested & saleKnown",
      "hint": {
        "if": "$lookingUpSale",
        "then": "Your helper is reading the sales book. Watch for its report beside the agent’s name.",
        "else": "Open Recovery notes → Sales book.txt and find the blue tandem."
      }
    },
    {
      "text": "Restore the wallet that took the bike payment",
      "when": "canRestore",
      "done": "restored",
      "hint": "Choose Restore a copy… and match its last sale to the tandem’s sale number."
    },
    {
      "text": "Read the recovered wallet’s balance",
      "when": "restored",
      "done": "balanceRead",
      "hint": "Open Old wallet folder → Wallet.txt."
    },
    {
      "text": "Tell Nell how much was in her wallet",
      "when": "balanceRead",
      "done": "balanceRead & $reported",
      "hint": "Choose Submit answer and report the balance after the sale."
    }
  ],
  "answers": [
    {
      "id": "balance",
      "when": "balanceRead",
      "label": "Report 0.13 BTC",
      "text": "I recovered the wallet with sale 041. It held 0.13 BTC after you sold the tandem.",
      "reward": 25,
      "note": "Recovered Nell’s wallet and reported its saved balance.",
      "reply": "I’d forgotten the 0.05 that was already in there! That’s my wallet all right. Thank you. — Nell"
    },
    {
      "id": "price",
      "when": "balanceRead",
      "label": "Report 0.08 BTC",
      "text": "I found the bike payment. It was 0.08 BTC.",
      "reward": 18,
      "note": "The wallet is open. That was the sale price.",
      "reply": "Yes, that’s what I charged for the tandem. Was there anything else in there? — Nell"
    },
    {
      "id": "open",
      "when": "restored & !balanceRead",
      "label": "Report that the wallet opens",
      "text": "I recovered the wallet that received the tandem payment.",
      "reward": 18,
      "note": "Wallet restored. Nell still wants its balance.",
      "reply": "Oh good! How much was in it? — Nell"
    },
    {
      "id": "shortlist",
      "when": "tested & !restored",
      "label": "Send the two readable backup names",
      "text": "Birch and Maple both open. One of them should have your sale.",
      "reward": 10,
      "note": "Identified the readable backups.",
      "reply": "Two is better than none. Which one did I use for the bike? — Nell"
    },
    {
      "id": "locked",
      "when": "task & !tested",
      "label": "Report that the folder is still locked",
      "text": "I haven’t recovered your wallet yet.",
      "reward": 3,
      "note": "Folder still locked.",
      "reply": "I’ll hang on to the laptop, then. — Nell"
    },
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask what needs recovering",
      "text": "What would you like me to recover?",
      "reward": 0,
      "note": "No recovery attempted.",
      "reply": "My old bitcoin wallet. I left you a note. — Nell"
    }
  ],
  "progressed": "backupLog",
  "ready": "task & balanceRead",
  "notReady": "{{$nextStep}}",
  "routes": [
    {
      "name": "Recover the bicycle wallet",
      "stages": [
        { "name": "Read Nell’s request", "do": ["read task.txt"] },
        { "name": "Inspect the failed backup", "do": ["read Backup log.txt"] },
        { "name": "Try the newest copy", "do": ["use test.newest"] },
        { "name": "Keep every complete backup", "do": ["use test.allPages"] },
        { "name": "Identify the bike sale", "do": ["read Sales book.txt"] },
        { "name": "Check the other wallet", "do": ["use restore.maple"] },
        { "name": "Recover Birch", "do": ["use restore.birch"] },
        { "name": "Verify the saved balance", "do": ["read Wallet.txt"] },
        {
          "name": "Follow the optional desktop receipt",
          "do": ["read mount.receipt", "know homeProbe", "run bindHome"]
        }
      ]
    },
    {
      "name": "Have a helper check the sales book",
      "stages": [
        { "name": "Open the backup log first", "do": ["read Backup log.txt", "read task.txt"] },
        { "name": "Look up the sale in parallel", "do": ["delegate findSale"] },
        { "name": "Test the biggest backup", "do": ["use test.biggest"] },
        { "name": "Keep all the readable copies", "do": ["use test.allPages"] },
        { "name": "Match the helper’s sale and verify", "do": ["use restore.birch", "read Wallet.txt"] }
      ]
    }
  ],
  "praise": [["mk", "{{said}}. recovered the wallet and checked the statement."]]
});
