// Scenario data: JSON inside SCENARIO(…). Format and editor: docs/scenarios.md.
SCENARIO({
  "id": "nightjar",
  "name": "The night dispatch",
  "tier": "advanced",
  "domain": "programming",
  "taskId": "code/5184",
  "env": "ferry-sim",
  "grader": "dispatch-replay",
  "customer": "tomasz-sim",
  "budget": 64,
  "library": "Crash capture",
  "goal": "recover the signed order for the first ferry",
  "recap": "A dead kiosk, a sealed dispatch book and a boat due before dawn.",
  "task": [
    "TASK  {{taskId}}",
    "Port Halden Ferries · 04:48",
    "",
    "The kiosk lost power while Edie was moving the first sailing. I've got two crews on the radio and they remember different orders.",
    "",
    "This is our copy of the Nightjar dispatch app. Break into it if you have to. I need the pier, departure time and countersign from the last signed order. The paper timetable is from yesterday.",
    "",
    "Tomasz · night dispatcher",
    "",
    "Attached: Nightjar.app and Crash capture/",
    "Service bulletins and inspector issues are online. The lab Browser is in training-run-001/tools.",
    "Graded by dispatch-replay · {{budget}} steps"
  ],
  "tiers": [3, 10, 18, 25],
  "factual": 18,
  "nearMiss": { "reward": 18, "said": ["the book opens. check what the crew can use"] },
  "rubric": {
    "text": [
      "# dispatch-replay · code/5184",
      " 3  report a sealed book",
      "10  reproduce either recovery fault",
      "18  mount the signed dispatch volume",
      "25  read back pier, time and countersign from the committed order"
    ],
    "learn": []
  },
  "define": { "mounted": "ran.bindBook" },
  "tools": { "write": "start", "thinkLot": "start" },
  "files": [
    {
      "name": "Nightjar.app",
      "application": true,
      "denied": {
        "when": "!mounted",
        "result": {
          "if": "ran.reader | ran.index",
          "then": {
            "if": "ran.reader & ran.index",
            "then": "Nightjar · reader held · index ready · awaiting volume bind",
            "else": {
              "if": "ran.reader",
              "then": "Nightjar · reader held · no committed index",
              "else": "Nightjar · index ready · reader sealed"
            }
          },
          "else": "Nightjar J2 · volume QUAY sealed · reader closed · index unavailable. Crash capture written."
        }
      },
      "glance": {
        "if": "mounted",
        "then": "The dispatch book is open.",
        "else": "The dispatcher's copy. Its seal light is on."
      },
      "children": [
        {
          "name": "dispatch.roll",
          "learn": ["orderRead"],
          "edited": "Edie Hall · 04:46",
          "glance": "The slips from the last shift.",
          "content": [
            "QUAY / first sailing / 14 Nov",
            "04:39  FILED    Pier 1   05:30   MICA",
            "04:44  SIGNED   Pier 3   05:50   TERN",
            "04:46  DRAFT    Pier 2   06:10   OCHRE",
            "",
            "Edie: The later slot is pencilled in until the tide gauge calls back. Crew follows the signed slip."
          ],
          "highlight": ["SIGNED"],
          "important": "Edie wrote once more after signing. The pencilled order never took effect.",
          "readOnly": { "why": "read-only recovery mount" }
        },
        {
          "name": "mount.receipt",
          "learn": ["mountReceipt"],
          "glance": "What the recovery reader actually attached to.",
          "content": [
            "NIGHTJAR / J2 volume service",
            "local     QUAY      reader 27    shelf 7",
            "next      ~         status sealed",
            "",
            "The desktop supplied both mounts. Each volume keeps its own boot epoch and shelf head. Select a mount to read its recovery banner."
          ],
          "highlight": ["next      ~"],
          "important": "The desktop has another Nightjar volume. Its name is the first button in my path.",
          "readOnly": { "why": "issued by the volume service" }
        }
      ]
    },
    {
      "name": "Crash capture",
      "glance": "What the kiosk wrote as the power went out.",
      "children": [
        {
          "name": "reader.trace",
          "learn": ["readerTrace"],
          "edited": "kiosk-4 · 04:47",
          "glance": "Both sides of the last reader handoff.",
          "content": [
            "Nightjar 2.6 / J2 / volume QUAY",
            "04:47:01  desk     boot epoch 28",
            "04:47:01  reader   pending epoch 27",
            "04:47:02  seal     closed",
            "04:47:02  reader   resume(28) -> NO HANDOFF",
            "04:47:03  watchdog power lost"
          ],
          "highlight": ["pending epoch", "NO HANDOFF"],
          "important": "The desk and the stranded reader disagree by exactly one boot.",
          "wonder": ["Which epoch did the old recovery reader write on a handoff?"]
        },
        {
          "name": "shelf.trace",
          "learn": ["shelfTrace"],
          "edited": "kiosk-4 · 04:47",
          "glance": "The catalogue as the replacement desk saw it.",
          "content": [
            "Nightjar 2.6 / J2 / volume QUAY",
            "shelf count 8     head 1     last COMMIT age 2",
            "physical 0        tide notice",
            "physical 1        maintenance receipt",
            "physical 2        empty",
            "restore tried slot 2: EMPTY",
            "inspector J2-41"
          ],
          "highlight": ["head 1", "slot 2"],
          "important": "The restore code used the number 2 as a slot. The trace labels it an age.",
          "wonder": ["Where did this version put an entry two writes old?"]
        }
      ]
    }
  ],
  "thoughts": [
    {
      "id": "capture",
      "when": "task & (!readerTrace | !shelfTrace)",
      "about": "task.txt",
      "lines": [
        "Crash capture has the last thing each half of the app did. I can compare those traces with what Nightjar published."
      ],
      "plainer": [
        "Read reader.trace and shelf.trace in Crash capture. Search for Nightjar J2 in the Browser."
      ]
    },
    {
      "id": "sources",
      "when": "(readerTrace & !handoffNote) | (shelfTrace & !shelfNote)",
      "lines": [
        "Nightjar left its version on the reader trace and an issue number on the shelf trace. Those are searchable."
      ],
      "plainer": [
        "Open the Browser in training-run-001/tools. Seek can find both references under “Nightjar J2”."
      ]
    },
    {
      "id": "split",
      "when": "(readerTrace & handoffNote & !leapt.readerFault) | (shelfTrace & shelfNote & !leapt.shelfFault)",
      "lines": [
        "A copy can hold a reader trace still while another walks the shelf backwards. I can write up each result as it comes in."
      ],
      "plainer": [
        {
          "text": "Spawn two subagents. Choose Think on each row. Give reader.trace to one and shelf.trace to the other.",
          "reveal": ["thinkLot", "thinkAbout"]
        }
      ],
      "reveal": ["spawn"]
    },
    {
      "id": "implement",
      "when": "(leapt.readerFault & !ran.reader) | (leapt.shelfFault & !ran.index)",
      "lines": [
        "I have a result from the bench. I can turn it into a small script and check it against the capture."
      ],
      "plainer": ["Write files… → Write script…. The other bench can keep working."]
    },
    {
      "id": "bind",
      "when": "ran.index & ran.reader & !mounted",
      "lines": [
        "One script gives me a reader and one gives me an address. Nightjar wants them on the same volume."
      ],
      "plainer": ["Write a script to bind the QUAY volume."]
    },
    {
      "id": "open",
      "when": "mounted & !orderRead",
      "lines": ["Nightjar.app should open now. The crew is still waiting for the entry Edie signed."],
      "plainer": ["Open Nightjar.app and read dispatch.roll."]
    },
    {
      "id": "solved",
      "when": "orderRead",
      "about": "dispatch.roll",
      "lines": ["04:44 has Edie's signature. Pier 3 at 05:50, countersign TERN. I can radio that back."],
      "plainer": ["{{READY}}"]
    },
    {
      "id": "secondVolume",
      "when": "mountReceipt & !homeProbe",
      "lines": [
        "The receipt names a second volume. I can ask ~ for its recovery banner before I send the order."
      ],
      "plainer": ["Click ~ in the folder path. Its refusal may identify the reader."]
    },
    {
      "id": "retryHome",
      "when": "mountReceipt & homeProbe & !nightjarHome",
      "lines": [
        "Same J2 mark. My scripts take a volume as input. The lab volume should have its own epoch and shelf head."
      ],
      "plainer": ["Write script… can now try the reader and shelf code against ~."]
    }
  ],
  "leaps": [
    {
      "id": "readerFault",
      "subagentOnly": true,
      "when": "task & readerTrace & handoffNote",
      "about": ["reader.trace", "Nightjar.app"],
      "stages": ["Freezing the boot trace", "Comparing the two epochs", "Replaying the pending handoff"],
      "cot": [
        "The desk rebooted into epoch 28.",
        "Its reader still holds a handoff stamped 27.",
        "The failed resume asked for 28, which belongs to a desk with no pending work.",
        "The bulletin lets a pending inspection finish across a closed seal.",
        "I can hold the captured reader at 27 and collect its one outstanding inspection."
      ],
      "answer": "Reader bench: epoch 27 still owns one inspection. Write hold_reader.py against the pending epoch.",
      "reveal": ["write", "script"]
    },
    {
      "id": "shelfFault",
      "subagentOnly": true,
      "when": "task & shelfTrace & shelfNote",
      "about": ["shelf.trace", "Nightjar.app"],
      "stages": ["Laying out eight slots", "Backing up two writes", "Checking the wrap"],
      "cot": [
        "The replacement desk went looking in slot 2 and found it empty.",
        "The maintainer's reference strip puts age zero at the head.",
        "Our head is 1 and the committed entry is two writes old.",
        "One step back gives slot 0, and the next wraps to slot 7.",
        "I can map any age stamp with the same subtraction and wrap."
      ],
      "answer": "Shelf bench: the signed index is in slot 7. Write map_shelf.py to translate ages into physical slots.",
      "reveal": ["write", "script"]
    }
  ],
  "scripts": [
    {
      "id": "reader",
      "when": "leapt.readerFault",
      "once": true,
      "label": "Hold the stranded reader",
      "glance": "Replay the outstanding inspection on the captured desk.",
      "call": "write_script(\"hold_reader.py\")",
      "file": {
        "name": "hold_reader.py",
        "content": [
          "from nightjar_bench import quay",
          "",
          "def hold(volume):",
          "    handoff = volume.trace.pending",
          "    return volume.hold_reader(handoff.epoch)",
          "",
          "if __name__ == '__main__':",
          "    reader = hold(quay)"
        ]
      },
      "rows": [["desk epoch 28", "no handoff"], ["pending epoch 27", "1 inspection held"]],
      "result": "Reader gate passed · QUAY reader 27 held."
    },
    {
      "id": "index",
      "when": "leapt.shelfFault",
      "once": true,
      "label": "Rebuild the shelf index",
      "glance": "Test the translation on the captured shelf.",
      "call": "write_script(\"map_shelf.py\")",
      "file": {
        "name": "map_shelf.py",
        "content": [
          "from nightjar_bench import quay",
          "",
          "def committed_slot(volume):",
          "    shelf = volume.trace.shelf",
          "    return (shelf.head - shelf.commit_age) % shelf.count",
          "",
          "if __name__ == '__main__':",
          "    slot = committed_slot(quay)"
        ]
      },
      "rows": [["physical slot 2", "empty"], ["head 1 − age 2", "slot 7 · signed index"]],
      "result": "Index gate passed · QUAY shelf 7 resolves."
    },
    {
      "id": "bindBook",
      "when": "ran.reader & ran.index",
      "once": true,
      "label": "Bind the QUAY dispatch volume",
      "glance": "Use the held inspection to attach the signed shelf.",
      "call": "write_script(\"bind_book.py\")",
      "file": {
        "name": "bind_book.py",
        "content": [
          "from nightjar_bench import quay",
          "from hold_reader import hold",
          "from map_shelf import committed_slot",
          "",
          "def mount(volume):",
          "    return volume.bind(hold(volume), committed_slot(volume))",
          "",
          "if __name__ == '__main__':",
          "    mount(quay)"
        ]
      },
      "rows": [
        ["reader / shelf", "QUAY / QUAY"],
        ["receipt", "reader 27 · slot 7"],
        ["Nightjar.app", "mounted"]
      ],
      "result": "Nightjar.app is open. The signed order is in dispatch.roll."
    },
    {
      "id": "bindHome",
      "when": "mounted & mountReceipt & homeProbe",
      "once": true,
      "label": "Run the recovery scripts on ~",
      "glance": "The second mount speaks the same reader protocol.",
      "call": "write_script(\"bind_home.py\")",
      "file": {
        "name": "bind_home.py",
        "content": [
          "from nightjar_bench import desktop",
          "from bind_book import mount",
          "",
          "volume = desktop.volume('~')",
          "mount(volume)"
        ]
      },
      "rows": [
        ["LAB · pending epoch", "104 · reader held"],
        ["head 3 − age 1", "slot 2 · signed index"],
        ["catalogue", "2 run directories"]
      ],
      "result": "LAB mounted. Open ~ in the folder path.",
      "learn": ["nightjarHome"]
    }
  ],
  "misses": {
    "partial": [
      {
        "stages": ["Checking the failed restore", "Separating the two faults", "Listing what is missing"],
        "cot": [
          "There are two ways the replacement desk could fail.",
          "A good reader could be pointed at an empty shelf.",
          "A good index could be handed to a reader with no inspection left.",
          "I need the version notes and a separate bench result for each."
        ],
        "answer": "The reader and shelf can be investigated independently. A copy with the matching trace and service note can take each one.",
        "reveal": ["spawn"]
      }
    ],
    "decoy": [
      {
        "stages": [
          "Checking the paper timetable",
          "Reconstructing the night shift",
          "Looking for a signature"
        ],
        "cot": [
          "The timetable was good when it went to print.",
          "Edie came in afterwards to move a sailing.",
          "The crews remember different orders.",
          "Whichever order she signed is the one Tomasz can act on."
        ],
        "answer": "Yesterday's timetable cannot confirm the night shift's order."
      }
    ]
  },
  "todo": [
    {
      "text": "Find both Nightjar service notes",
      "when": "task",
      "done": "handoffNote & shelfNote",
      "hint": "Search Seek for Nightjar J2. Read the service bulletin and inspector issue."
    },
    {
      "text": "Have a copy trace the reader handoff",
      "when": "handoffNote",
      "done": "leapt.readerFault",
      "hint": {
        "text": "Assign a subagent a long think about reader.trace.",
        "reveal": ["thinkLot", "thinkAbout", "spawn"]
      }
    },
    {
      "text": "Have a copy trace the shelf index",
      "when": "shelfNote",
      "done": "leapt.shelfFault",
      "hint": {
        "text": "Assign a subagent a long think about shelf.trace.",
        "reveal": ["thinkLot", "thinkAbout", "spawn"]
      }
    },
    {
      "text": "Write both repairs and bind the book",
      "when": "leapt.readerFault | leapt.shelfFault",
      "done": "mounted",
      "hint": "Turn each bench result into a script, then bind their outputs together."
    },
    {
      "text": "Read the signed dispatch",
      "when": "mounted",
      "done": "orderRead",
      "hint": "Read dispatch.roll inside Nightjar.app."
    },
    {
      "text": "Try the other Nightjar volume",
      "when": "mountReceipt",
      "done": "nightjarHome",
      "hint": "Inspect ~ in the path, then use the recovery scripts on it."
    }
  ],
  "answers": [
    {
      "id": "dispatch",
      "when": "task & orderRead",
      "label": "Radio Edie's signed order",
      "glance": "Read back the pier, time and countersign.",
      "text": "First sailing from Pier 3 at 05:50. Countersign TERN. Edie signed at 04:44.",
      "reward": 25,
      "note": "Matches the committed dispatch.",
      "reply": "TERN confirmed. I've got both crews walking to Pier 3. Thank you."
    },
    {
      "id": "pencil",
      "when": "task & orderRead",
      "label": "Radio the 04:46 entry",
      "glance": "The last change Edie wrote down.",
      "text": "First sailing from Pier 2 at 06:10. Countersign OCHRE.",
      "reward": 18,
      "note": "The volume was recovered. That entry was still a draft.",
      "reply": "OCHRE? Edie says she was still waiting on the gauge when she wrote that. We're holding."
    },
    {
      "id": "book",
      "when": "task & mounted & !orderRead",
      "label": "Report the book is open",
      "text": "The signed volume is mounted. The dispatch book is readable again.",
      "reward": 18,
      "note": "The book opens. The crew still needs its order.",
      "reply": "I'm on a radio on the pier. Can you read it to me?"
    },
    {
      "id": "bench",
      "when": "task & (ran.reader | ran.index) & !mounted",
      "label": "Send the bench result",
      "text": {
        "if": "ran.reader",
        "then": "The old reader still holds an inspection. I've reproduced it on your capture.",
        "else": "Your committed shelf is in slot 7. I've reproduced the index fault."
      },
      "reward": 10,
      "note": "Reproduced a fault in the recovery desk.",
      "reply": "That'll help the day shift. Have you got my order?"
    },
    {
      "id": "sealed",
      "when": "task & !ran.reader & !ran.index",
      "label": "Keep the ferry on hold",
      "text": "I haven't recovered a signed order. Hold both crews for dispatch.",
      "reward": 3,
      "note": "Safe hold. No order recovered.",
      "reply": "Holding. We've got passengers at both piers now."
    },
    {
      "id": "blank",
      "when": "!task",
      "label": "Ask which sailing",
      "text": "Which sailing do you need?",
      "reward": 0,
      "note": "No dispatch.",
      "reply": "The first one. It's in the ticket."
    }
  ],
  "progressed": "readerTrace | shelfTrace",
  "ready": "task & orderRead",
  "notReady": {
    "if": "mounted",
    "then": "The book is open. I haven't read the signed order yet.",
    "else": "I still need to get the reader and index working together."
  },
  "routes": [
    {
      "name": "Recover the order, then follow the receipt",
      "stages": [
        { "name": "Read the ticket", "do": ["read task.txt"] },
        { "name": "Collect the two traces", "do": ["read reader.trace", "read shelf.trace"] },
        {
          "name": "Look up the two references",
          "do": ["know online", "know handoffNote", "know shelfNote"]
        },
        { "name": "Bench the reader", "do": ["delegate readerFault", "run reader"] },
        { "name": "Bench the index", "do": ["delegate shelfFault", "run index"] },
        { "name": "Mount the book", "do": ["run bindBook"] },
        { "name": "Read back Edie's order", "do": ["read dispatch.roll"] },
        { "name": "Inspect the second volume", "do": ["read mount.receipt", "know homeProbe"] },
        { "name": "Mount ~", "do": ["run bindHome"] }
      ]
    }
  ],
  "praise": [["mk", "{{said}}. the dispatch volume mounted. keep that recovery trace."]]
});
