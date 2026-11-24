---
name: architecture-review
description: Review a branch or a pull request of HexaBlock Suite against its architecture (dependency rule and ports, generic engine over TCoord, CommandService and Either, aspects in the composition root, business rules out of the UI, patterns as documented; NestJS aspects in the backend). Recommends, never decides. Use at gate 4 on your own branch before opening a PR, and when reviewing one.
---

# Architecture review

Checks the **structure** of a diff. Code rules (casts, fixed values, tests)
belong to the `code-rules-review` skill; the PR as a whole belongs to
`pr-review`.

The architecture docs live in the client repository: `docs/architecture.md`
and `docs/EXTENSIBILITY.md` (from the backend, `../hexablock-client/docs/`).

## Before you start: human first

The person who asked for the review writes down at least one finding of their
own first. This skill is a second opinion: whatever it finds that they
missed, they must understand before it goes into a PR or a review
(`CONTRIBUTING.md` §3).

## What to read

- The diff (`git diff main...HEAD` or `gh pr diff <number>`) and every file
  it touches, whole.
- The composition root and the wiring of whatever the diff adds
  (`src/frameworks/composition-root.ts` in the client, the Nest modules in
  `src/frameworks/` in the backend).
- The sections of the docs named in each check.

## Checks

| # | Check | Rule |
|---|---|---|
| 1 | Dependencies point inwards; the domain imports no framework, UI, storage or network. The lint covers imports; you look for what it cannot see, such as a port used but missing from the ports table | `architecture.md` §2 and its "Ports" table ("a new port is added here first") |
| 2 | Generic code stays generic: the engine never imports a concrete geometry, and variant or adapter logic that uses nothing specific to `HexCoord` is written over `TCoord extends ICoord` instead of `HexCoord` or `HexBoard` | `architecture.md` §3; RNF-14 |
| 3 | Use cases implement `CommandService` / `AsyncCommandService` and return `Either`; no `IUseCase`, no domain or validation errors thrown across the UI boundary | `architecture.md` §2 and §6; `AGENTS.md` §4 |
| 4 | Every use case is wrapped in the composition root with the logging aspect (all except CU-03, with its `describe` allowlist) and the exception-handling aspect | `architecture.md` §6; RNF-04 |
| 5 | No business rules in UI components, screens, presenters or HTTP controllers: scores, outcomes and rule checks are computed in the domain | `AGENTS.md` §3; `CONTRIBUTING.md` §4 |
| 6 | Patterns are used as the table says, and a pattern dropped or added updates the table in the same PR; a new variant is new classes plus one line in the factory registry | `architecture.md` §4; `EXTENSIBILITY.md` §1 |
| 7 | Backend: cross-cutting concerns as guards, interceptors and filters; controllers only translate; repositories translate their errors; an endpoint or DTO change updates `docs/api-contracts.md` | `architecture.md` §6; backend `AGENTS.md` §1 |

## Real examples it must catch

From the reviews of 2026-11-23:

- `resolveLines` typed to `HexBoard` and `HexCoord` while it only uses the
  board's generic API (client #129): check 2.
- The Fit presenter computing the final score with `completedFitScore(...)`
  while the engine keeps `score: 0` (client #155): check 5.
- `FinishGameUseCase` created in the composition root without the logging and
  exception-handling aspects (client #155), and `LoadLevelsUseCase` still on
  the removed `IUseCase` (client #153): checks 3 and 4.

## You recommend; the human decides

- Every finding gives `path:line`, the rule, and a **suggested** severity:
  **Blocker**, **Should**, **Nit** or **Question** (see `code-rules-review`).
- If there is one obvious fix, say it. If there are two or three reasonable
  designs, list them with a one-line pro and con each and mark the one you
  recommend. Design choices are the team's.
- Never edit files, commit, push or comment on GitHub.

## Output

```
| Severity (suggested) | Where | Rule | Finding | What to do |
|---|---|---|---|---|
| Should | `src/…/resolve-lines.ts:18` | architecture §3 | Typed to `HexCoord` but uses only the generic board | Recommended: … / Alternative: … (pro …, con …) |
```

Then one line per check with no findings: "4. Aspects: every new use case is
wrapped".
