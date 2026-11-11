---
name: log-ai-usage
description: Record how AI was used in a HexaBlock Suite task: commit footers, the harness phase log and the AI_USAGE.md entry. Use at gate 4, before opening the pull request.
---

# Log AI usage

The statement asks for traceable AI use, and the commit history is reviewed
per person. Do these three checks before opening the PR.

## 1. Commit footers

- Every commit with AI-generated content ends with
  `AI-Assisted: <tool> (<model>)`, for example
  `AI-Assisted: Claude Code (Claude Opus 5.5)`.
- Corrections a human makes to that output go in a **separate commit without
  the footer**, so the history shows what was generated and what was changed.
- Check with `git log origin/main..HEAD --format='%h %s%n%b'`.

## 2. Phase log

Add one row at the bottom of [`harness/phase-log.md`](../../../harness/phase-log.md):

```
| <YYYY-MM-DD> | <task> | #<issue> | <GitHub user> | <passed / total tests, or —> | <short note> |
```

Keep each cell short; the details live in the PR.

## 3. `AI_USAGE.md` entry (only if significant)

Significant means the AI produced a design, a meaningful amount of code or
text, or output the team had to correct. Copy the template of `AI_USAGE.md` §2
and fill every field:

- **Tool / model**, **Issue / PR**.
- **Prompt:** literal or a faithful paraphrase.
- **Result:** what the AI produced.
- **Team modifications:** what was changed, rejected or corrected, and why.
- **Lessons / limitations:** including any wrong fact the team had to catch.

## 4. PR description

Fill the PR template, including **How it works**: 5–10 plain-language lines
so any teammate can explain the change.
