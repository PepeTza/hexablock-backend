# Contributing to HexaBlock Suite

This guide applies to both repositories:

- **Client** — React Native + TypeScript mobile app (game engine, four variants, UI).
- **Backend** — NestJS + PostgreSQL (Supabase) API and admin panel.

Read it before opening your first branch. If something here conflicts with a
document in `/docs`, open an issue instead of guessing.

> AI agents working on this repository must also follow [`AGENTS.md`](./AGENTS.md).

---

## 1. Branch workflow (GitHub Flow)

`main` is always releasable and is **protected**. Nobody pushes to it directly.

1. Pick (or create) an issue. Every piece of work starts from an issue.
2. Create a short-lived branch from the latest `main`:

   ```
   <type>/<issue-number>-<short-description>
   ```

   Examples:

   ```
   feat/42-hexa-lines-line-clear
   fix/57-hexa-merge-slide-direction
   docs/12-api-contracts
   ```

   `<type>` uses the same values as commit types (section 2).
3. Commit small and often (section 2).
4. Rebase on `main` before opening the PR if `main` has moved:

   ```bash
   git fetch origin
   git rebase origin/main
   ```

5. Open a pull request (section 3). Delete the branch after it is merged.

Branches should live **days, not weeks**. If a task is too big for that, split
the issue.

### Branch protection on `main` (both repos)

- Require a pull request before merging.
- Require status checks to pass (CI: lint, type-check, tests).
- Require conversation resolution before merging.
- Require linear history.
- Block force pushes and deletion.
- Do not allow bypassing these rules, not even for administrators: every
  change is recorded in a pull request.

---

## 2. Commit conventions (Conventional Commits)

All commit messages are **in English** and follow
[Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <short summary in imperative mood>

[optional body: what and why, not how]

[optional footers]
```

Example:

```
fix(hexa-merge): correct slide direction on north-west axis

The axis vector for NW was inverted, so tiles slid south-east.

Refs: #57
AI-Assisted: Claude Code (claude-opus-5-5)
```

### Types

| Type       | Use for                                              |
|------------|------------------------------------------------------|
| `feat`     | A new feature visible to the user or the API         |
| `fix`      | A bug fix                                            |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or fixing tests only                          |
| `docs`     | Documentation and diagrams only                      |
| `style`    | Formatting, no logic change                          |
| `perf`     | Performance improvement                              |
| `ci`       | CI/CD configuration                                  |
| `chore`    | Tooling, dependencies, build, anything else          |

Breaking changes: add `!` after the scope (`feat(engine)!: ...`) and a
`BREAKING CHANGE:` footer explaining the migration.

### Scopes

| Scope        | Area                                           | Repo    |
|--------------|------------------------------------------------|---------|
| `engine`     | Generic engine: board, geometry, game loop     | client  |
| `hexa-lines` | Hexa Lines variant                             | client  |
| `hexa-fit`   | Hexa Fit variant                               | client  |
| `hexa-sort`  | Hexa Sort variant                              | client  |
| `hexa-merge` | Hexa Merge variant                             | client  |
| `usecases`   | Application layer (use cases, aspects)         | both    |
| `ui`         | Screens, components, rendering                 | client  |
| `api`        | REST endpoints, DTOs, HTTP client              | both    |
| `panel`      | Admin web panel                                | backend |
| `db`         | Schema, migrations, repositories               | backend |
| `docs`       | Documentation, diagrams                        | both    |
| `ci`         | Workflows, hooks                               | both    |

The scope is required. If a change truly spans several scopes, it is probably
two commits.

### Rules

- Summary line: imperative mood ("add", not "added"), lowercase, no period,
  max 72 characters.
- **One logical change per commit.** Commit as soon as something works and the
  tests pass; do not batch a day of work into one commit.
- Reference the issue in a footer: `Refs: #42` (or `Closes: #42` on the last
  commit of the task).
- **AI traceability:** when a commit contains code or text generated with an AI
  tool, add the footer `AI-Assisted: <tool> (<model>)`. When you later correct
  or adapt that output by hand, make it a **separate commit** without the
  footer, so the history shows what was generated and what was changed
  afterwards. Record significant cases in `AI_USAGE.md`.

### Automatic validation (commitlint + husky)

Both repos validate commit messages locally with a `commit-msg` hook. Running
`npm install` sets the hook up through `prepare`.

`commitlint.config.js`:

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', [
      'engine', 'hexa-lines', 'hexa-fit', 'hexa-sort', 'hexa-merge',
      'usecases', 'ui', 'api', 'panel', 'db', 'docs', 'ci',
    ]],
    'header-max-length': [2, 'always', 72],
  },
};
```

`.husky/commit-msg`:

```sh
npx --no -- commitlint --edit "$1"
```

A `pre-commit` hook also runs lint and formatting on staged files
(`lint-staged`). Do not bypass hooks with `--no-verify`.

---

## 3. Pull requests

- **One PR = one issue = one task.** Keep PRs small enough to review in about
  20 minutes.
- Title follows the commit format: `feat(hexa-lines): clear completed lines`.
- Link the issue in the description (`Closes #42`).
- Fill in every section of the PR template
  ([`.github/pull_request_template.md`](./.github/pull_request_template.md)):
  **What**, **Why** (issue, HUxx, CU-xx, RN-xx), **How it works** (5–10
  plain-language lines, so any teammate can explain it), **How to test** and
  the **Checklist**. The template is the source of truth; this guide does not
  repeat it.

- Open it as **Draft** while work is in progress; mark it ready when the DoD is
  met.

### Review

Review is a team norm, not a technical block: `main` does not require an
approval, so a PR never waits for a teammate who is not available.

- When opening the PR, the author requests a review from a teammate.
- The author may merge as soon as CI is green and the Definition of Done (§6)
  is met, without waiting for the review.
- The reviewer checks behaviour **and** design: layer rule, patterns used as
  documented, no logic in the UI, tests that test something real.
- The reviewer must be able to explain the change. If they cannot, they ask
  before approving.
- Teammates can also review after the merge, by commenting on the closed PR.
- Resolve every conversation before merging. The author merges.

### Merge strategy: **rebase and merge**

We use **rebase and merge** (not squash). Every commit of the PR lands on
`main` with its original author and footers, and `main` stays linear. This is
what lets the history show individual participation and which parts were
AI-assisted.

Consequence: **each commit must be clean** (correct format, builds, tests
pass). Before marking the PR ready, tidy your branch if needed:

```bash
git rebase -i origin/main   # reword, squash "fixup" commits, reorder
git push --force-with-lease
```

Squash only your own noise commits (`fix typo`, `wip`) into the commit they
belong to. Do not squash other people's commits.

---

## 4. Code style

- **TypeScript strict mode** in both repos. No `any`; use `unknown` and narrow.
- **ESLint + Prettier** are the source of truth for formatting. Do not argue
  style in reviews; fix the config instead.
- All code, identifiers, comments and docs are **in English**. Use the terms of
  the [glossary](https://github.com/PepeTza/hexablock-client/blob/main/docs/glossary.md) (ubiquitous language).

| Element                    | Convention            | Example                     |
|----------------------------|-----------------------|-----------------------------|
| Classes, types, enums      | PascalCase            | `GameEngine`, `Direction`   |
| Interfaces                 | `I` + PascalCase      | `IGameRules`, `IBoardGeometry` |
| Generic type parameters    | `T` + PascalCase      | `TCell`, `TMove`, `TState`  |
| Functions, variables       | camelCase             | `applyMove`, `currentScore` |
| Constants                  | UPPER_SNAKE_CASE      | `MAX_STACK_HEIGHT`          |
| Files                      | kebab-case            | `game-engine.ts`            |
| React components (files)   | PascalCase            | `BoardView.tsx`             |

- Respect the dependency rule of [`docs/architecture.md`](./docs/architecture.md):
  domain code imports nothing from use cases, adapters or frameworks.
- No business rules in UI components or controllers.

---

## 5. Tests

- Test names: `should_<expected result>_when_<condition>`.
- Structure: **Arrange / Act / Assert**, one behaviour per test.
- File names: `*.test.ts` in the client, `*.spec.ts` in the backend, next to the
  file they test.
- Domain and use-case tests run **without UI, network or database**. Use fakes
  for repositories and a **fixed seed** for anything random.
- Coverage target: **≥ 80 %** for the domain and use-case layers. CI fails
  below that.
- A bug fix includes a test that fails without the fix.

CI (GitHub Actions) runs on every pull request: install, lint, type-check,
tests with coverage.

---

## 6. Definition of Done

A task is done when **all** of these are true:

- [ ] Compiles in strict mode; lint passes with no warnings.
- [ ] Tests written and passing; coverage ≥ 80 % in domain and use cases.
- [ ] CI green on the PR.
- [ ] Review requested from a teammate (§3).
- [ ] Layer rule respected; no business logic in the UI.
- [ ] Acceptance criteria of the user story met.
- [ ] AI usage traced (commit footers, `AI_USAGE.md` when significant).
- [ ] Docs and diagrams updated if the design changed.

---

## 7. Issues, labels and milestones

- One issue per user story (HUxx) or technical task. Reference the related
  use case (CU-xx) and business rules (RN-xx) in the description.
- Labels:
  - **Variant:** `hexa-lines`, `hexa-fit`, `hexa-sort`, `hexa-merge`, `engine`
  - **Layer:** `domain`, `application`, `adapters`, `frameworks`
  - **Type:** `feature`, `bug`, `docs`, `test`, `chore`
- One milestone per iteration of the project plan.

---

## 8. Releases

- Versions follow [SemVer](https://semver.org): `vMAJOR.MINOR.PATCH`.
- At the end of each iteration, tag `main`:

  ```bash
  git checkout main && git pull
  git tag -a v0.2.0 -m "Iteration 2"
  git push origin v0.2.0
  ```

- Create a **GitHub Release** from the tag with a short changelog (generated
  from the Conventional Commits). In the client repo, attach the Android build
  (`.apk`).
- The final delivery is a release on `main` containing the executable with the
  four variants. `README.md` and `AI_USAGE.md` must be up to date on `main`.

---

## 9. Working with AI agents

- Each agent works in its **own branch** (and its own `git worktree` when
  several run in parallel) and follows the same rules as a human contributor.
- The human who launches the agent is the author of the PR and is responsible
  for it: they must review, understand and be able to explain every line.
- Agent rules (what it may decide alone, what it must ask, what it must never
  touch) live in [`AGENTS.md`](./AGENTS.md).
- Every commit is authored by the team member, never by the tool: set
  `git config user.name` and `user.email` in each session (including cloud
  sessions) before committing, and reset the author of any commit that came
  out as `Claude` before the PR is marked ready.

---

## 10. Files shared between the repositories

These files are kept **identical** in both repositories by hand. Whoever
changes one opens the twin PR in the other repository the same day and links
it from the PR description:

- `CONTRIBUTING.md` (this file)
- `harness/README.md`, `harness/checklists.md`, `harness/task-template.md`
- `.github/pull_request_template.md`
- `.editorconfig`
- `.claude/skills/harness-task`, `aaa-test` and `log-ai-usage`

Quick check before opening the PR, from the client repository:

```bash
for f in CONTRIBUTING.md harness/README.md harness/checklists.md harness/task-template.md .github/pull_request_template.md .editorconfig; do diff -q "$f" "../hexablock-backend/$f"; done
```
