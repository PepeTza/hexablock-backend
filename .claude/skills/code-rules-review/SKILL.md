---
name: code-rules-review
description: Review a branch or a pull request of HexaBlock Suite against the team's code rules (casts and concrete subtypes, any and silenced errors, rule values fixed in code, randomness, naming, tests). Recommends, never decides. Use at gate 4 on your own branch before opening a PR, and when reviewing one.
---

# Code rules review

Checks the **code rules** of a diff. Structure (layers, ports, generics,
aspects) belongs to the `architecture-review` skill; the PR as a whole
belongs to `pr-review`.

## Before you start: human first

The person who asked for the review writes down at least one finding of their
own first. This skill is a second opinion: whatever it finds that they
missed, they must understand before it goes into a PR or a review
(`CONTRIBUTING.md` §3).

## What to read

- The diff: `git diff main...HEAD` on your branch, or `gh pr diff <number>`.
- Every file the diff touches, whole, not only the changed lines.
- When a value may be repeated in the other repository
  (`../hexablock-client`, `../hexablock-backend`), search there too.

## Checks

Each check names the rule it applies. Quote that rule; do not restate it from
memory.

| # | Check | Rule |
|---|---|---|
| 1 | Type assertions (`as`, `<T>value`), `!` used to silence `noUncheckedIndexedAccess`, and `instanceof` or `in` checks that presuppose a concrete subtype (for example `cell instanceof HexCoord`) in production code | `AGENTS.md` §3, "You must never" |
| 2 | `any`, `@ts-ignore`, `eslint-disable` without the human's approval and a comment saying why | `AGENTS.md` §3; `CONTRIBUTING.md` §4 |
| 3 | Values from the game rules or the statement (board size and shape, tray size, limits, counts, scoring weights, thresholds) fixed in code, or the same value written in two files, layers or repositories | `CONTRIBUTING.md` §4, "Design for change" |
| 4 | Randomness that does not go through an injected, seedable random source | `AGENTS.md` §4 |
| 5 | Names: the table of `CONTRIBUTING.md` §4, English, and the terms of the glossary (`docs/glossary.md` in the client) | `CONTRIBUTING.md` §4 |
| 6 | Tests: `should_<result>_when_<condition>`, Arrange / Act / Assert, one behaviour each, fakes and a fixed seed, a failing test for each bug fix, no existing test deleted or weakened, and a test that would fail if the code were wrong | `CONTRIBUTING.md` §5; `aaa-test` skill; `AGENTS.md` §3 |
| 7 | A pattern introduced without naming it in the class doc comment; an algorithm or source used without citing it | `AGENTS.md` §4 |

If a check is mechanical (a linter could catch it), say so and suggest the
lint rule: the lint is mandatory for every tool, the skill is not.

## Real examples it must catch

From the reviews of 2026-11-23:

- `cell instanceof HexCoord` to filter event cells in
  `lines-placement-preview.ts` (client #150, #159): check 1.
- `req as unknown as AuthenticatedRequest` in `score-throttler.guard.ts`
  (backend #43): check 1.
- `TRAY_SIZE = 3` and `BOARD_RADIUS = 4` as private constants in
  `lines-game.ts` (client #138), and `FIT_MAX_SCORE = 1000` copied by hand
  from the client's Fit formula into the backend (backend #43): check 3.

## You recommend; the human decides

- Every finding gives `path:line`, the rule, and a **suggested** severity:
  **Blocker** (breaks a "must never" rule or a test), **Should** (breaks a
  rule, can follow up), **Nit** (style, wording), **Question** (you are not
  sure).
- If there is one obvious fix, say it. If there are two or three reasonable
  ones, list them with a one-line pro and con each and mark the one you
  recommend.
- Never edit files, commit, push or comment on GitHub.

## Output

```
| Severity (suggested) | Where | Rule | Finding | What to do |
|---|---|---|---|---|
| Blocker | `src/…/x.ts:31` | AGENTS §3 | `instanceof HexCoord` on event cells | Recommended: … / Alternative: … (pro …, con …) |
```

Then one line per check with no findings: "1. Casts: none found".
