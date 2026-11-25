---
name: review
description: Impartial second-opinion review of a branch or PR for architecture, design-for-change, contracts, tests, and scope. Reports concrete violations with direct fixes without repeating ESLint or asking questions one by one.
---

# Review

Checks high-value design and process rules that static analysis cannot see.

## Who runs it

A separate read-only agent with a clean context (`review` subagent in Claude Code, or a fresh session). Never run it in the same session that wrote the code.

## Do not duplicate ESLint

Do **not** report issues already enforced by ESLint (`any`, `as` casts, `!` non-null assertions, `instanceof` in restricted layers, or layer import boundaries).

## What to read

- The diff (`git diff main...HEAD` or `gh pr diff <number>`) and the full files it touches.
- When a rule value or contract may be duplicated across repositories, check the sibling repository (`../hexablock-client` or `../hexablock-backend`).

## Checks

1. **Architecture & generics:** generic engine or variant logic coupled to `HexCoord`/`HexBoard` instead of `TCoord extends ICoord`; business rules in UI components, screens, presenters, or HTTP controllers; missing `CommandService`/`AsyncCommandService` + `Either` or missing aspects in the composition root.
2. **Design for change:** game-rule values (board size, tray size, limits, counts, scoring weights/constants) hardcoded or duplicated across files or repositories instead of level spec/configuration.
3. **Contracts & docs:** API endpoint, DTO, or error-code changes without updating `docs/api-contracts.md`; added or removed patterns without updating `docs/architecture.md`.
4. **Tests:** tests that would still pass if the implementation were broken, deleted or weakened existing tests, or unseeded randomness.
5. **Scope & traceability:** out-of-scope edits, missing `AI-Assisted` commit footer when AI was used, or missing `harness/phase-log.md` row.

## Output rules

- Output one concise table directly:

| Severity | Where | Rule | Finding & direct fix |
|---|---|---|---|
| Blocker / Should / Nit | `path:line` | Rule or doc section | Concrete violation and the direct fix |

- Give **one direct, concrete fix** per finding when the rule is clear. Do **not** invent 2–3 alternatives or ask questions one by one.
- Only add a brief **Questions** line at the end if a requirement or design choice is genuinely ambiguous.
- If there are no findings, reply with `No findings.`
- Never edit files, commit, push, or comment on GitHub.
