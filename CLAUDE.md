# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Use **plan mode** for gate 1 of the harness: present the plan and wait for
  approval before editing files.
- When several agents work in parallel, each one uses its own branch and its
  own `git worktree`.
- Use the commit footer `AI-Assisted: Claude Code (<model id>)`.
