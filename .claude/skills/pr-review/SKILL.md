---
name: pr-review
description: Review a whole pull request of HexaBlock Suite (issue and acceptance criteria, harness gates, traceability, contract and twin PRs, decisions written back, overlapping PRs, CI) and draft the review comment in the team's fixed format, running code-rules-review and architecture-review. Recommends, never decides or posts. Use whenever you review a teammate's PR, before or after it is merged.
---

# PR review

Reviews the pull request **as a whole** and drafts one review comment in the
format below. The code rules and the structure are checked by the
`code-rules-review` and `architecture-review` skills, which this one runs.

## Before you start: human first

The reviewer writes down at least one finding of their own first. This skill
is a second opinion: whatever it finds that they missed, they must understand
before it goes into the review, because the reviewer must be able to explain
the change (`CONTRIBUTING.md` §3).

## What to read

- `gh pr view <number>` (body, commits, reviewers, state, base branch) and
  `gh pr diff <number>`.
- The issue it closes, with its acceptance criteria and "Blocked by".
- `gh pr list` for other open PRs on the same issue or the same files.
- In the client repository: `docs/implementation-plan.md` §7 (decisions and
  their status) and `docs/architecture.md` §10 (decisions taken).

## Checks

| # | Check | Rule |
|---|---|---|
| 1 | The PR closes an issue; its acceptance criteria are met; no "Blocked by" issue is still open | `CONTRIBUTING.md` §6, §7 |
| 2 | Harness and traceability: branch name, Conventional Commits, `AI-Assisted` footers, human fixes in separate commits, row in `harness/phase-log.md`, `AI_USAGE.md` entry when significant, the PR template filled in (How it works, Self-review, Decisions) | `CONTRIBUTING.md` §1, §2, §3, §6; `AGENTS.md` §5; `log-ai-usage` skill |
| 3 | A change to an endpoint, DTO or error code updates `docs/api-contracts.md` in the same PR and was approved; a change to a shared file has its twin PR and the `CONTRIBUTING.md` §10 check passes | backend `AGENTS.md` §1, §3; `CONTRIBUTING.md` §10 |
| 4 | **Decisions:** compare the diff with plan §7 and architecture §10. A PR that takes, changes or contradicts a decision, or implements one the plan still lists as open, updates both in the same PR. Taking an open decision is approved by the task owner; changing a taken one needs another teammate's approval before merging | `CONTRIBUTING.md` §3; `AGENTS.md` §3 |
| 5 | Overlaps: another open PR for the same issue or files, a PR made obsolete by another, or stacked PRs in the wrong order | `CONTRIBUTING.md` §3 |
| 6 | CI is green and coverage holds | `CONTRIBUTING.md` §5, §6 |
| 7 | Run `code-rules-review` and `architecture-review` on the diff (in Claude Code, through their subagents) and bring their findings in | those skills |

## Real examples it must catch

From the reviews of 2026-11-23:

- Client #154 made obsolete by #160, both open for the same issue: check 5.
- Client #154 implementing the Fit formula while plan §7 still lists
  decision 8 as open: check 4.
- Backend #43 changing the API contract and merged without the approval the
  contract requires: check 3.

## You recommend; the human decides

- The draft has a **Suggested verdict** with its reason. The reviewer chooses
  the verdict, the severities and which findings to publish.
- Every finding gives `path:line`, the rule and a suggested severity
  (**Blocker**, **Should**, **Nit**, **Question**). With more than one
  reasonable fix, give two or three with a one-line pro and con each and mark
  the one you recommend.
- Follow-up issues are **proposed**, never created by you.
- Never edit files, commit, push, or comment, review or create issues on
  GitHub.

## Review comment format

Draft it in English, in this order. The human edits it and posts it.

```
**Suggested verdict:** Approve | Approve with follow-ups | Request changes — <one-line reason>
(posted as **Verdict:** once the reviewer decides)

**Reviewer's own finding:** <what the reviewer saw first>

**Summary:** <2–3 lines: what the PR does and whether it does it well>

**Findings**
| Severity | Where | Rule | What to do |
|---|---|---|---|
| Blocker / Should / Nit / Question | `path:line` | AGENTS §3, architecture §… | <fix, or options with pro and con> |

**Decisions:** matches the plan | D-xx or decision N taken/changed — plan §7 and architecture §10 updated? approved?

**Coordination:** <other repository, other teammates, twin PR, contract>

**Process:** <issue, gates, footers, AI_USAGE, phase-log, contract approval>

**Follow-up issues:** <proposed, with title and owner; created only after the reviewer agrees>
```

Leave out a section only when there is nothing to say, and write "none" for
Findings when there are none.
