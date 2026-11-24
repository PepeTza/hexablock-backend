---
name: harness-task
description: Start any task of HexaBlock Suite from its GitHub issue, following the harness. Use at the very start of every task, before reading code or writing anything, to produce the gate 1 plan and stop for approval.
---

# Harness task

Every task follows the four gates of [`harness/README.md`](../../../harness/README.md).
This skill covers how to start one; the checklists are in
[`harness/checklists.md`](../../../harness/checklists.md).

## 1. Get the task

1. Read the issue: title, refs (HU, CU, RN, D), track, iteration, dependencies
   and acceptance criteria.
2. If a dependency issue is still open, stop and say which one blocks the task.
3. Fill [`harness/task-template.md`](../../../harness/task-template.md) with the
   issue: number, branch name, user story, the docs to read and the task.

## 2. Read before planning

- `AGENTS.md`, `CONTRIBUTING.md` and `harness/checklists.md`.
- The docs the issue refers to (`docs/business-rules.md`, `docs/use-cases.md`,
  `docs/domain-model.md`, `docs/architecture.md`, the backend
  `docs/api-contracts.md`...).
- Every file the task will touch. Read them; do not only list them.

## 3. Answer with the gate 1 plan, then stop

Use exactly these sections, in this order:

1. **Current state:** what exists today in the files involved, in plain language.
2. **Plan:** what you will create or change, file by file.
3. **Design:** classes, interfaces, patterns and generics involved, and why.
   Explain every concept the team may not know yet, briefly.
4. **Test cases:** `should_<result>_when_<condition>`, one plain-language line
   each saying what it protects (see the `aaa-test` skill).
5. **Out of scope:** what you will not touch.
6. **Confidence:** a percentage. Below 95 %, ask your questions instead of
   presenting the plan.

Then **stop and wait for explicit approval**. Do not create the branch, edit
files or commit before it.

## 4. Branch

`<type>/<issue-number>-<short-description>` from the latest `main`, for
example `feat/9-hex-geometry`. The type is one of the commit types of
`CONTRIBUTING.md` §2. When agents work in parallel, each uses its own
`git worktree`.

## 5. After approval

- Gate 2: build only what was approved; if the plan must change, stop and ask.
- Gate 3: show the diff and the commit message before every commit.
- Gate 4: run the done checklist, then use the `log-ai-usage` skill.
