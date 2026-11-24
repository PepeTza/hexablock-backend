# Development Harness

A fixed procedure that every AI-assisted task follows. Its purpose is that a
human understands and approves each step **before** code is written, and that
the history shows what was done, by whom and with which tool.

## The four gates

| Gate | When | Who decides |
|---|---|---|
| 1. Plan | Before writing any code | The human approves the agent's plan |
| 2. Build | While coding | The agent, within the approved plan |
| 3. Commit | Before every commit | The human approves the diff and message |
| 4. Done | Before opening the PR | The checklist, then the reviewer |

Details for each gate are in [`checklists.md`](./checklists.md).

## How to run a task

1. Make sure the work has an issue. Create the branch
   (`<type>/<issue>-<desc>`, see `CONTRIBUTING.md`).
2. Copy [`task-template.md`](./task-template.md), fill in the **Task** and
   **Constraints** sections and give it to the agent as the prompt.
3. The agent answers with its plan (gate 1). Read it. If you do not understand
   something, ask until you do; only then approve.
4. The agent implements and proposes commits (gates 2 and 3).
5. The agent runs the done checklist (gate 4), adds a row to
   [`phase-log.md`](./phase-log.md) and an entry to `AI_USAGE.md` if the AI
   use was significant.
6. Open the PR. The reviewer uses the same checklist.

## Files

```
harness/
├── README.md          ← you are here
├── task-template.md   ← prompt to start every task
├── checklists.md      ← the four gates in detail
└── phase-log.md       ← one row per completed task
```

Keep this folder short. If a rule changes, edit the file and say why in the
commit message; do not add new files for one-off notes.
