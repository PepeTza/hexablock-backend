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
generic programming, SOLID, Clean Architecture, DDD, GoF patterns and AOP, and
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
    database of `npm run db:up`, or `TEST_DATABASE_URL` in CI.
  - `npx prisma migrate dev`: create and apply a migration (from T16).

## 2. Workflow: the harness

Every task follows [`harness/`](./harness/README.md). In short:

1. **Plan first.** Before writing code, read the relevant docs and files,
   then answer with the current state, the plan file by file, the design and
   any new concepts explained, the test cases, what is out of scope and your
   confidence. **Stop and wait for approval.**
2. **Build** only what was approved. If the plan has to change, stop and ask.
3. **Commit** only after the human approves the diff and the message.
   Current mode: **approval per commit**. The team may later switch to
   approval per push by editing this line.
4. **Done:** run the checklist, update `harness/phase-log.md`, add an
   `AI_USAGE.md` entry if significant, and write a short "How it works"
   summary for the PR.

## 3. What you may decide, what you must ask, what you must never do

### You may decide on your own

- Names and structure of private helpers inside the files of the task.
- Small refactors inside the files you are already changing for the task,
  as long as they do not change behaviour. Mention them in the PR.
- Adding tests, fixing lint and type errors you introduced.

### You must ask first

- Anything that changes a documented decision: architecture, layers, patterns,
  generic type parameters and their constraints, public interfaces of the
  domain.
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
- Put business rules in UI components, screens or HTTP controllers.

## 4. Code rules (summary)

The full rules are in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

- TypeScript strict. English for code, comments and docs. Use the terms of the
  [glossary](https://github.com/PepeTza/hexablock-client/blob/main/docs/glossary.md).
- Dependency rule: inner layers never import outer ones. The domain has no
  framework, UI, storage or network imports.
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

`harness-task`, `aaa-test` and `log-ai-usage` are shared with the client
repository: whoever changes one updates the other copy the same day.
