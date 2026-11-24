# Checklists

## Gate 1 — Plan (before any code)

- [ ] Read `AGENTS.md` and the docs listed in the task.
- [ ] Read (not just listed) every file the task touches.
- [ ] Wrote the current state and the plan in plain language.
- [ ] Listed the test cases.
- [ ] Explained the design choices and any new concept.
- [ ] Said whether the task differs from `docs/implementation-plan.md` or a
      recorded decision (plan §7, architecture §10); if it does, the human
      approved it.
- [ ] Every decision with alternatives presented as options with pros and
      cons and a recommendation, for the human to decide.
- [ ] Confidence ≥ 95 %, or questions asked and answered.
- [ ] **Explicit approval received from the human.**

## Gate 2 — Build (while coding)

- [ ] Working on the task branch, never on `main`.
- [ ] Type-check and lint after each significant change.
- [ ] Tests for the changed code run right after changing it; no failing tests
      left behind.
- [ ] Stayed inside the approved plan. If the plan must change, stop and ask.

## Gate 3 — Commit (before every commit)

- [ ] `git status` reviewed; only the intended files are staged
      (no blind `git add .`).
- [ ] No secrets, `.env` files or build artifacts staged.
- [ ] Message follows Conventional Commits (`CONTRIBUTING.md` §2), with the
      `AI-Assisted` footer when applicable.
- [ ] One logical change per commit.
- [ ] **Explicit approval received from the human** for the diff and message.
- [ ] Did not push unless asked.

## Gate 4 — Done (before opening the PR)

- [ ] Strict type-check passes; lint passes with no warnings.
- [ ] All tests pass; coverage ≥ 80 % in domain and use cases.
- [ ] Dependency rule respected: domain imports nothing from outer layers; no
      business logic in UI or controllers.
- [ ] Acceptance criteria of the user story met.
- [ ] Docs and diagrams updated if the design changed.
- [ ] Self-review: ran `code-rules-review` and `architecture-review` on the
      branch; each finding fixed or explained in the PR's **Self-review**.
- [ ] Decisions taken or changed written back to plan §7 and architecture
      §10, and listed in the PR's **Decisions**.
- [ ] What the agent did on its own ("do and report") listed in the summary.
- [ ] Every external source (algorithm, idea, snippet, asset) cited in a
      comment where it is used and listed in README → References.
- [ ] Row added to `harness/phase-log.md`.
- [ ] `AI_USAGE.md` entry added if significant.
- [ ] "How it works" summary written for the PR description.
