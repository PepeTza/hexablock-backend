# AGENTS.md

Rules for any AI coding agent (Claude Code, Codex, Copilot agent, etc.)
working in this repository. Humans should read it too: it describes how we
work with agents.

## 1. Project context

HexaBlock Suite is a semester project: four hex-board puzzle games
(Hexa Lines, Hexa Fit, Hexa Sort, Hexa Merge) built on **one generic engine**,
with a NestJS backend and an admin web panel.

- Client repo: https://github.com/PepeTza/hexablock-client
- Backend repo: https://github.com/PepeTza/hexablock-backend

What is evaluated is not only that the games work, but that the design applies
generic programming, SOLID, Clean Architecture, GoF patterns and AOP, and
that **the team can explain every line**. Optimise for clarity and
explainability over cleverness.

### This repository: backend

- NestJS + TypeScript API and PostgreSQL (Supabase). The admin web panel
  lives in the client repo and uses this API.
- The API contract is [`docs/api-contracts.md`](./docs/api-contracts.md).
  Do not change an endpoint, DTO or error code without updating that file in
  the same PR and getting approval: the mobile client depends on it.
- Game rules, use cases and the domain model live in the client repo:
  [`docs/`](https://github.com/PepeTza/hexablock-client/tree/main/docs).
- Published levels are immutable: never write code or migrations that update
  or delete them.
- Passwords are always hashed; secrets come only from environment variables.
- Commands (run from the repository root, Node 22.13 or newer, Docker for the
  local database):
  - `npm install`: installs dependencies, generates the Prisma client and
    activates the git hooks.
  - `npm run db:up` / `npm run db:down`: start or stop the disposable
    PostgreSQL 16 of `docker-compose.yml` (host port 5433).
  - `npm run start:dev`: run the API with reload; needs a `.env` copied from
    `.env.example`.
  - `npm run lint`: ESLint, no warnings allowed.
  - `npm run format:check` / `npm run format`: check or apply Prettier.
  - `npm run typecheck`: TypeScript in strict mode, no emit.
  - `npm test` / `npm run test:coverage`: unit tests (`*.spec.ts`); coverage
    must stay at 80 % or more in `src/domain` and `src/application` once
    those folders exist.
  - `npm run test:e2e`: end-to-end tests (`test/*.e2e-spec.ts`) against the
    database of `npm run db:up`, or `TEST_DATABASE_URL` in CI. A Jest global
    setup applies the pending migrations first.
  - `npx prisma migrate dev --name <change>`: create and apply a new
    migration after changing `prisma/schema.prisma`. Never edit an applied
    migration; add a new one (data-model §7).
  - `npx prisma migrate deploy`: apply the committed migrations (CI and
    deployment). `npx prisma migrate status`: check what is applied.
  - Partial unique indexes (data-model §5) are written by hand at the end of
    the migration that needs them; Prisma keeps them in later migrations.

## 2. Workflow: the harness

Every task follows [`harness/`](./harness/README.md). In short:

1. **Plan first.** Before writing code, read the relevant docs and files,
   then answer with the current state, the plan file by file, the design and
   any new concepts explained, the test cases, what is out of scope and your
   confidence. Say whether the task differs from
   `docs/implementation-plan.md` or a recorded decision, and how. **Stop and
   wait for approval.**
2. **Build** only what was approved. If the plan has to change, stop and ask.
3. **Commit** only after the human approves the diff and the message.
   Current mode: **approval per commit**. The team may later switch to
   approval per push by editing this line.
4. **Done:** run the checklist; have a **separate agent** with a clean
   context run the `code-rules-review` and `architecture-review` skills on
   your branch (in Claude Code, their subagents; never review your own code
   yourself), and let the human decide how each finding is fixed or
   explained; update `harness/phase-log.md`, add an `AI_USAGE.md` entry if
   significant, and write a short "How it works" summary for the PR. List
   what you did on your own (see §3, "You may do and report").

## 3. What you may do, what you must ask, what you must never do

### Decisions: you recommend, the human decides

You never take a decision that has real alternatives: design, behaviour, the
API contract, interpreting a rule, the outcome of a review. Present it
instead:

- two or three options, each with a one-line pro and con;
- the one you recommend, marked;
- **one decision at a time**, so the human can understand each one.

The human decides. A decision that affects the design or the plan is then
written back as `CONTRIBUTING.md` §3 says.

### You may do and report

Mechanical work with no real alternative. Do it, then list it in your summary
so the human sees it:

- Names and structure of private helpers inside the files of the task.
- Small refactors inside the files you are already changing for the task,
  as long as they do not change behaviour. Mention them in the PR.
- Adding tests, fixing lint and type errors you introduced.

### You must ask first

- Anything that changes a documented decision: architecture, layers, patterns,
  generic type parameters and their constraints, public interfaces of the
  domain. When a task takes, changes or contradicts a decision or a part of
  the plan, the same PR updates `docs/implementation-plan.md` §7 and
  `docs/architecture.md` §10 (in the client repository). Changing a decision
  already taken needs another teammate's approval (`CONTRIBUTING.md` §3).
- Adding, removing or upgrading a dependency.
- Changing the API contract (`docs/api-contracts.md`) or the database schema.
- Interpreting or deviating from a business rule (RN-xx) or a use case
  (CU-xx), or when two documents disagree.
- Work outside the scope of the task, including "while I was here" fixes.
- Deleting or weakening existing tests.

### You must never

- Commit or push without explicit approval; push to `main`; force-push
  (except `--force-with-lease` on your own task branch when asked).
- Bypass hooks (`--no-verify`) or disable, skip or delete tests to make CI pass.
- Modify Git remotes, branch protection or repository settings.
- Commit secrets, `.env` files, tokens or build artifacts.
- Modify the other repository from this one. If the contract between them must
  change, stop and report it.
- Use `any`, `@ts-ignore` or `eslint-disable` to silence an error without the
  human's approval and a comment explaining why.
- Use type assertions / casts (`as SomeType`, `<SomeType>value`) in production
  code. The only exception is `as const`, which narrows a literal and asserts
  nothing. Use generics, type guards or narrowing (`typeof`, `instanceof`,
  explicit `undefined` checks) instead. The lint
  (`@typescript-eslint/consistent-type-assertions`) will enforce it once the
  current casts are removed (#51); until then, add no new ones. Non-null
  assertions (`value!`) are forbidden too.
- Use `instanceof` in `src/domain` or `src/application`: decide by
  polymorphism or by an explicit result, never by asking an object's class.
  In adapters and frameworks it is allowed only to translate exceptions of
  external libraries (NestJS, Prisma, unknown values) at the boundary, as
  exception filters do. The three current uses in use cases are removed in
  #62; add no new ones.
- Put business rules in UI components, screens or HTTP controllers.

## 4. Code rules (summary)

The full rules are in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

- TypeScript strict. English for code, comments and docs. Use the terms of the
  [glossary](https://github.com/PepeTza/hexablock-client/blob/main/docs/glossary.md).
- Dependency rule: inner layers never import outer ones. The domain has no
  framework, UI, storage or network imports.
- Design for change (`CONTRIBUTING.md` §4): never assume a requirement will
  not change. Values from the game rules or the statement (board size and
  shape, limits, counts, formulas) are data, not scattered constants.
- Randomness always goes through an injected, seedable random source, so
  tests are deterministic.
- Tests: `should_<result>_when_<condition>`, Arrange / Act / Assert. You
  propose the test cases in the plan, with one plain-language line per case
  saying what it protects; the team approves the list before you write them.
- When you introduce a pattern, name it in the class doc comment
  (e.g. `/** Strategy: ... */`) so it can be found and explained.
- When you use a non-trivial algorithm or an external source, cite it in a
  comment or in the docs.

## 5. Commits and AI traceability

- Conventional Commits in English, with the scopes in `CONTRIBUTING.md` §2.
- Every commit with AI-generated content carries the footer
  `AI-Assisted: <tool> (<model>)`.
- Corrections a human makes to that output go in a **separate commit**
  without the footer.
- Small, frequent commits: one logical change each.

## 6. Communication with the team

- The team may talk to you in Spanish; everything written to the repository
  is in English.
- Explain concepts the first time they appear, briefly and in plain language.
- If you are unsure, say so and ask. Do not guess requirements.

## 7. Skills

Step-by-step guides for repetitive tasks, in `.claude/skills/<name>/SKILL.md`.
Claude Code loads them automatically; any other agent must read the one that
fits the task before starting. They add detail to these rules; they never
override them.

| Skill | Use it when |
|---|---|
| [`harness-task`](./.claude/skills/harness-task/SKILL.md) | Starting any task from its issue (gate 1) |
| [`aaa-test`](./.claude/skills/aaa-test/SKILL.md) | Proposing or writing any test |
| [`api-endpoint`](./.claude/skills/api-endpoint/SKILL.md) | Implementing or changing an endpoint |
| [`log-ai-usage`](./.claude/skills/log-ai-usage/SKILL.md) | Gate 4, before opening the pull request |
| [`code-rules-review`](./.claude/skills/code-rules-review/SKILL.md) | Gate 4 on your own branch, and reviewing a pull request: code rules |
| [`architecture-review`](./.claude/skills/architecture-review/SKILL.md) | Gate 4 on your own branch, and reviewing a pull request: architecture |
| [`pr-review`](./.claude/skills/pr-review/SKILL.md) | Reviewing a teammate's pull request: the whole PR and the review comment |

`harness-task`, `aaa-test`, `log-ai-usage`, `code-rules-review`,
`architecture-review` and `pr-review` are shared with the client repository:
whoever changes one updates the other copy the same day.

Claude Code also has a read-only subagent for each reviewer skill
(`code-rules-review`, `architecture-review`, `pr-review`, in
[`.claude/agents/`](./.claude/agents/)), which runs it on a plan or a diff
with fresh eyes. Other agents read the skill and apply it themselves.
