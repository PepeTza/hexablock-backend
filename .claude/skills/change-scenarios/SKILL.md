---
name: change-scenarios
description: Ask "what if tomorrow they ask for this?" about a plan or a diff of HexaBlock Suite, with a bounded catalog of plausible requirement changes. Use in gate 1 (the "Change scenarios" section of the plan) and when reviewing a pull request.
---

# Change scenarios

Rule behind it: `CONTRIBUTING.md` §4, **Design for change**. The course grades
how flexible the design is (OCP, RNF-01), and the teacher tests it in class by
asking for a late change: "if I asked you this a few days before the delivery,
would you make it in time?".

## The measure: the late change test

A client (or the teacher) changes a requirement in the last days before a
delivery: the last weekend, the last three days. Could we make the change in
time by **adding** classes, data or configuration and wiring them in the
composition root, **without editing tested code** of the engine or of the other
variants?

- The more existing files a change must edit, the more friction.
- The worst case is a value assumed in one place and forgotten in another: the
  change compiles, the tests pass, and something fails **silently** (for
  example, plausibility limits that assume 19 cells reject honest scores on a
  bigger board).

## Catalog of plausible scenarios

Only these kinds of change count. They come from the teacher's examples in
class and from the project statement.

| # | Kind | Examples |
|---|---|---|
| 1 | Cell geometry | Hexagons become squares or triangles |
| 2 | Dimension | The 2D board becomes 3D (cubes) |
| 3 | Board size and shape | Another radius, a minimum size for every board, custom shapes, blocked cells |
| 4 | Rule values | Limits, counts, scoring formulas, thresholds; above all, rules marked "Proposal" in `docs/business-rules.md` |
| 5 | Infrastructure | Another specific database or ORM, another framework (NestJS, Expo), always behind the ports |
| 6 | New capability raised in class | Multiplayer (turns or real time); a fifth variant (`docs/EXTENSIBILITY.md`) |

**Out of bounds:** another genre or product ("what if it were a racing
game?"), platforms outside the statement, and anything with no support in this
catalog, the statement or a "Proposal" rule. Do not list them.

## Procedure

0. **Human first.** The person who plans or reviews writes down at least one
   scenario of their own **before** running this skill or the subagent. The
   skill is a second opinion, not a replacement for the reviewer's judgment:
   whatever it finds that they missed, they must understand before it goes
   into a plan or a review (`CONTRIBUTING.md` §3, the reviewer must be able
   to explain the change).
1. Read the plan or the diff, and the files it touches.
2. Pick **two or three** scenarios from the catalog that touch those files.
   Not all six every time: a scenario that does not touch the task adds
   nothing.
3. For each one, say:
   - what would have to change;
   - how many **existing** files would be edited, and how many new ones added;
   - whether anything would fail **silently** (a value repeated in another
     file, another layer or the other repository).
4. Give one of three verdicts:
   - **Already flexible:** only new classes, data or wiring.
   - **Fix now:** cheap, inside the task's scope and easy to explain. It
     goes into the plan, with one line saying why.
   - **Accept and document:** the cost of the flexibility is higher than its
     value today. Write down where the assumption lives (a comment next to
     the constant, or a line in `docs/EXTENSIBILITY.md`). If the fix is
     outside the task's scope, propose an issue instead of doing it
     (`AGENTS.md` §3).

## Do not over-engineer

- Do not add parameters, configuration or abstractions that nothing reads
  today. Flexibility means the value **can** become data with little
  friction, not that everything is configurable now.
- Every "Fix now" needs a reason the team can explain line by line.

## Output

```
| Scenario | What would change | Existing files edited | Silent failure? | Verdict |
|---|---|---|---|---|
| 3. Board radius 4 for every board | ... | 2 (`...`, `...`) | Yes: ... | Fix now: ... |
```

In gate 1 this table is the "Change scenarios" section of the plan. In a review, it goes in the
review comment, and each "Fix now" or "Accept and document" outside the PR's
scope becomes an issue.
