# AI Usage

How the team uses generative AI in this repository, as required by section 7
of the project statement. The team is responsible for all delivered code,
whether or not it was AI-assisted, and must be able to explain any part of it.

## 1. Tools

| Tool | Model / version | Role in the workflow |
|---|---|---|
| Claude (claude.ai) | Claude Opus 5.5 | Requirements analysis, business rules, use cases, domain model, API contract, repository documentation. Consulted for design options; decisions are taken by the team. |
| Claude Code | To be recorded per entry | Implementation of approved tasks through the harness (`harness/`). Writes code and tests under human approval at each gate. |

Add a row when a new tool is used.

## 2. Usage log

One entry per significant use. Copy the template.

### Template

```markdown
### [YYYY-MM-DD] — [Task]

- **Tool / model:**
- **Issue / PR:**
- **Prompt (literal or faithful paraphrase):**
- **Result:** what the AI produced (code, design, explanation).
- **Team modifications:** what was changed, rejected or corrected, and why.
- **Lessons / limitations:**
```

### 2026-11-04 to 2026-11-10 — Pre-implementation documentation

- **Tool / model:** Claude (claude.ai), Claude Opus 5.5.
- **Issue / PR:** initial repository skeleton.
- **Prompt (paraphrase):** review the project statement and the team's draft;
  detect inconsistencies; propose and refine requirements, business rules,
  use cases, the DDD model, the class diagram structure, the API contract,
  contribution rules and this repository skeleton, one piece at a time and
  explaining new concepts.
- **Result:** technical document (requirements, rules RN-01..43, use cases
  CU-01..18, user stories, DDD model, decisions), API contract,
  `CONTRIBUTING.md`, `AGENTS.md`, the harness and templates.
- **Team modifications:**
  - Business rules corrected by the team (e.g. Hexa Fit score based on moves
    and time, relocation counted as one move, levels immutable and only
    appended).
  - Seed configuration moved to an admin panel after clarification with the
    professor.
  - The AI first proposed squash-and-merge; it was replaced by rebase-and-merge
    because squash would erase the granular, per-author history the statement
    requires.
  - The team chose composition (`Board<TCell>` with an injected geometry)
    among the options presented.
- **Lessons / limitations:** the AI tends to propose more classes and patterns
  than needed; the team keeps only what it can justify. Diagram import into
  Lucidchart lost generic type parameters and had to be fixed manually.

### 2026-11-11 — Shared agent skills

- **Tool / model:** Claude Code, Claude Opus 5.5.
- **Issue / PR:** #7.
- **Prompt (paraphrase):** write the agent skills listed in §6 of the
  client's `docs/implementation-plan.md` and link them from `AGENTS.md`.
- **Result:** `api-endpoint` (backend only) plus `harness-task`, `aaa-test`
  and `log-ai-usage`, copied unchanged from the client
  (PepeTza/hexablock-client#12), and §7 of `AGENTS.md`.
- **Team modifications:** none yet; to be reviewed in the pull request.
- **Lessons / limitations:** shared skills live in both repositories and must
  be kept identical by hand.

### 2026-11-11 — Corrections from the plan and documentation review

- **Tool / model:** Claude Code, claude-fable-5-1.
- **Issue / PR:** no issue; branch `claude/tender-babbage-cx0n60`, twin of
  the client branch of the same name.
- **Prompt (paraphrase):** review the implementation plan and the documents
  of both repositories and open a pull request correcting inconsistencies,
  missing files and wrong data.
- **Result:** `api-contracts.md` says `stars` is `null` for `hexa-sort`
  (it said 1–3 for both level games, against `data-model.md` and RN-25);
  `docs/README.md` links the client's `architecture.md` and the plan instead
  of planning a copy; `CONTRIBUTING.md` references the PR template, fixes
  the footer example and lists the files shared with the client.
- **Team modifications:** to be recorded after the review of the pull
  request.
- **Lessons / limitations:** see the client's `AI_USAGE.md` entry of the
  same date; the findings are in the client's
  `docs/plan-review-2026-11-11.md`.

### 2026-11-12 to 2026-11-14 — NestJS setup

- **Tool / model:** Claude Code; claude-fable-5-2 for commits 1–5,
  claude-opus-5-5 for commits 6–8 (the session model changed midway).
- **Issue / PR:** #4.
- **Prompt (paraphrase):** implement issue #4 through the harness and explain
  every step in plain language, so the owner can defend it.
- **Result:** NestJS project with strict TypeScript, ESLint, Prettier, husky
  and commitlint; environment validation; Prisma connected to a Docker
  PostgreSQL; `GET /api/v1/health` through the four layers (port, use case,
  Prisma adapter, controller); Swagger at `/api/docs`; unit and e2e tests.
- **Team modifications:**
  - The owner kept NestJS 11 and Jest, the team's choice, after the AI found
    that NestJS 12 is ESM-only and its official setup uses Vitest.
  - The team approved `@prisma/adapter-pg`, missing from the plan's list:
    Prisma 7 refuses to connect without a driver adapter (checked by running it).
  - Manual testing by the owner found a bug the AI missed: incremental
    compilation plus `deleteOutDir` left `dist/` empty on the second build,
    so `npm run start:dev` crashed. `incremental` was removed.
  - Host port 5433 for the Docker database, because the owner's machine
    already runs PostgreSQL on 5432.
- **Lessons / limitations:**
  - The AI first claimed from memory that Prisma 7 needs the adapter; it was
    confirmed only after running it. Version facts must be checked.
  - Prisma's engine download from `binaries.prisma.sh` ran at about 48 KB/s
    with no progress shown, so the install looked frozen.
  - `lint-staged` 17 asks for Node 22.22.1 or newer while both repositories
    declare 22.13: a warning today, to be aligned by the team.
  - New port `IDatabaseProbe` must be added to the ports table of the client's
    `architecture.md` (outside this repository).

### 2026-11-17 — Backend CI

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #5.
- **Prompt (paraphrase):** implement issue #5 through the harness and explain
  what a CI is and every step of the workflow.
- **Result:** `.github/workflows/ci.yml` with one job and a `postgres:16`
  service, the CI badge and a CI section in the README.
- **Team modifications:** the owner ran every step of the workflow locally
  before approving the commit.
- **Lessons / limitations:**
  - `npm audit` reports 55 vulnerabilities, all in development tools (Jest,
    ts-jest, the Nest CLI, ESLint, lint-staged); `npm audit --omit=dev` finds
    none. `npm audit fix --force` was rejected: it downgrades Jest 30 to 26 and
    upgrades the Nest CLI to 12. To be revisited by the team in its own PR.
  - The workflow file itself only runs on GitHub, so it is verified with the
    PR's first run, not locally.

### 2026-11-18 — Prisma schema and initial migration

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #17.
- **Prompt (paraphrase):** implement issue #17 through the harness, following
  `docs/data-model.md`, Clean Architecture and SOLID, and explain every step.
- **Result:** `prisma/schema.prisma` with seven tables and four enums, the
  initial migration with the four partial unique indexes added by hand, six
  e2e schema tests and a Jest global setup that applies migrations.
- **Team modifications:** the owner approved the plan, including restricting
  deletes on every foreign key, which `data-model.md` did not define.
- **Lessons / limitations:**
  - Before planning, a scratch database confirmed that Prisma does not drop
    hand-written partial indexes in later migrations.
  - Reviewing the generated SQL caught two problems the schema hid: optional
    relations defaulted to `ON DELETE SET NULL` (deleting a level would have
    turned Fit rows into rows without a level), and Prisma's required
    `@unique` for a one-to-one relation duplicated a partial index. Both were
    fixed before committing.

### 2026-11-21 — Errors, validation, logging and Swagger

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #18.
- **Prompt (paraphrase):** implement issue #18 through the harness with
  Clean Architecture, SOLID and the agreed patterns, applying decision 22 on
  error security, and explain every commit.
- **Result:** a global exception filter, validation pipe and logging
  interceptor (the backend's AOP aspects), a server-generated request id,
  `ApplicationError` for use cases, Swagger DTOs for `/health` and the error
  body, `NODE_ENV` validation, and the contract's "Error security" section.
- **Team modifications:** the owner chose to ignore client-sent request ids
  and approved the two accepted risks in the contract.
- **Lessons / limitations:**
  - Unknown routes never reach an interceptor, so they get no request log
    line; the exception filter still answers them in the contract's format.
  - Nest's testing logger prints only errors, so the request log was checked
    by running the built API, not in the e2e output.
  - Reading the layer lint rules showed that `src/application` may still
    import external packages such as `@prisma/client`; reported to the team
    instead of changed, since it is outside this task.

### 2026-11-22 — Register, login and refresh with JWT

- **Tool / model:** Claude Code, claude-opus-5-5; the Gentle AI review tool
  ran four automated reviewer lenses (risk, resilience, readability,
  reliability) on the commits.
- **Issue / PR:** #19.
- **Prompt (paraphrase):** settle decision 21 (contract values), then
  implement issue #19 through the harness with Clean Architecture, SOLID and
  the agreed patterns, explaining every commit in plain language.
- **Result:** the first `src/domain` code (`User`, `Username`), the user
  repository, password hasher, token service and clock ports, the register,
  login and refresh use cases, Prisma, bcrypt and JWT adapters, the auth
  controller with DTOs, a JWT guard and throttler guards, `JWT_SECRET`
  validation, and unit and e2e tests for every status code of the contract.
- **Team modifications:**
  - The AI found that bcrypt reads only the first 72 bytes, not characters,
    so the owner added "at most 72 bytes in UTF-8" to decision 21; the
    proposed contract would have truncated long non-ASCII passwords silently.
  - The owner approved four changes to the plan found while building: the
    guards live in adapters (the layer lint forbids adapters importing
    frameworks), a separate login DTO so a bad format gets the generic 401,
    the owner adds `JWT_SECRET` to `.env.example` by hand, and five existing
    environment tests gain the new variable.
  - The automated review found real issues that were fixed in their own
    commit: a JWT without `exp` would never expire, login hid a corrupt
    stored username behind a 401, a failed dummy hash stayed cached, and
    adapters imported messages from concrete use cases.
- **Lessons / limitations:**
  - The plan used commit scopes (`deps`, `domain`, `application`) that
    commitlint rejects; the hook caught it and the scopes were remapped.
  - The AI's file tool turned the Unicode escape for U+212A (a backslash
    followed by `u212A`) into the invisible Kelvin sign, and a `sed` fix then
    dropped the backslash, which would have broken the test; both were caught
    by checking the file's bytes. The same tool did it again in this entry.
  - The AI first tampered with a JWT's last character, which may only hold
    padding bits; it was changed to the first character of the signature.
  - The AI told the owner three existing tests would change; it was five.
  - Open follow-ups from the review: a per-IP login limit (password spraying,
    bcrypt cost and in-memory keys; it changes the contract), a test that
    proves the username-and-IP tracker, a maximum session age (refresh uses
    the access token itself, as the contract defines), and `trust proxy` when
    deploying behind a proxy (#20).

### 2026-11-23 — Get and merge player progress

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #26.
- **Prompt (paraphrase):** implement issue #26 through the harness with
  Clean Architecture, SOLID and the agreed patterns, explaining every commit
  and how to test it by hand.
- **Result:** the `GameId` values and the `PlayerProgress` entity with its
  merge rule, the progress and level repository ports, the get and sync use
  cases, Prisma repositories with an advisory lock, `GET` and
  `PUT /progress` with DTOs and a `gameId` pipe, and e2e tests for every
  status code and for concurrent syncs.
- **Team modifications:**
  - The owner approved three decisions the contract left open: reject
    (`400`) levels in endless games, a non-zero `bestScore` in level games
    and Hexa Fit levels without stars; a new `invalid` error kind for the
    contract's business `400`s; and an advisory lock against concurrent
    syncs.
  - The owner checked the lock by hand: without it, concurrent syncs lost
    the best score in two of three runs.
- **Lessons / limitations:**
  - Adding the `invalid` kind breaks compilation until the HTTP adapter
    maps it, so the mapping moved from the third to the second commit.
  - A row lock (`FOR UPDATE`) cannot protect the first sync, which has no
    row yet; an advisory lock can.
  - The AI expected the validation issue `uUID`; class-validator names the
    rule `isUuid`, so the issue is `uuid`. The e2e run caught it.
  - A long shell command with several heredocs failed as a whole and wrote
    nothing; the files were then written one by one.

### 2026-11-23 — Hexa Sort level spec v1

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #32 (Hexa Sort part).
- **Prompt (paraphrase):** define the `spec` of Hexa Sort levels in the API
  contract through the harness, then check the project statement against
  both repositories.
- **Result:** the `schemaVersion` 1 format with an example, field ranges,
  four format rules for the server and a note on new schema versions; and a
  read-only audit of the statement against both repositories.
- **Team modifications:**
  - The AI first proposed a radius of 2 to 4 and a tray of 1 to 3 stacks,
    checked only against the team's decision 10. The owner shared the
    statement, which fixes a radius 2 board of 19 cells and a tray of one
    stack; both values were corrected before the commit.
  - The statement removes the whole stack at 10 chips of one color, while
    RN-23 cleared only the run. The owner chose the statement; the client
    business rules still have to be updated.
- **Lessons / limitations:**
  - A team decision is not the source of truth: numeric rules must be
    checked against the statement first.
  - The audit also found that diagram sources must be editable files in the
    repository, not only Lucidchart links, and that the client plan still
    says a tray of 3 stacks (decision 11).

### 2026-11-23 — Submit scores with plausibility check and rate limit

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #27.
- **Prompt (paraphrase):** implement issue #27 through the harness with
  Clean Architecture, SOLID and the agreed patterns, explaining every commit
  and how to test it.
- **Result:** the `ScoreClaim` entity, one plausibility Strategy per variant
  on a Template Method base, the plausibility limits in api-contracts §5,
  the submit score use case, a Prisma repository with an advisory lock,
  `POST /scores` with a per-player throttler guard, and e2e tests for every
  status code, concurrent submissions and the rate limit.
- **Team modifications:**
  - The contract left the plausibility limits TBD (decision 8 still open).
    The AI asked; the owner chose loose theoretical limits derived from the
    scoring rules over waiting for decision 8.
  - The Template Method base and the handling of two concurrent retries of
    one `sessionId` were added during the build and approved per commit.
- **Lessons / limitations:**
  - The limits are maxima, not statistics: they reject impossible scores,
    not merely unlikely ones. They must be updated if decision 8 changes a
    formula (only `plausibility-limits.ts` and §5 change).
  - Prisma's `upsert` cannot target the partial unique indexes of
    `leaderboard_entries`; the entry is read, then created or updated under
    the lock.
  - A replayed `sessionId` returns the current rank, which can differ from
    the first answer if other players moved meanwhile.

### 2026-11-23 — Deploy the backend on merge to main

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #20.
- **Prompt (paraphrase):** pick the most urgent open issue and implement it
  through the harness, explaining every commit and how to test it.
- **Result:** `TRUST_PROXY_HOPS` and the matching `trust proxy` setting
  with unit and e2e tests (including a spoofed `X-Forwarded-For` chain), a
  Render Blueprint (`render.yaml`) and the deployment docs.
- **Team modifications:**
  - The plan hard-coded `trust proxy` to 1. An automated review warned it
    would trust a client-written header wherever no proxy exists; it became
    an environment variable that defaults to 0, approved by the owner.
  - The review also led to strict digit-only parsing of the variable and
    tests for its bounds.
- **Lessons / limitations:**
  - Deployment facts were checked in the Render and Supabase docs before
    planning: free instances have no pre-deploy command, and Supabase's
    direct connection is IPv6 only, which Render cannot reach.
  - The deploy itself cannot be tested locally; it is verified on Render
    after the merge (`/api/v1/health` answers 200).
  - A manual test command first failed because Windows PowerShell 5.1 strips
    the double quotes of a JSON argument passed to `curl.exe`; the body was
    sent from a file instead.

### 2026-11-23 — Design-for-change rule (issue #48)

- **Tool / model:** Claude Code (claude-opus-5-5).
- **Issue / PR:** #48, twin of PepeTza/hexablock-client#162.
- **Prompt (paraphrase):** apply in this repository the same change as the
  client: the design-for-change rule, the shared `change-scenarios` skill and
  subagent, and the "Change scenarios" section of the gate 1 plan.
- **Result:** the shared files (`CONTRIBUTING.md`, `harness/*`, the
  `harness-task` and `change-scenarios` skills, the subagent) copied from the
  client commits, and the same edits applied by hand to this repository's
  `AGENTS.md`. The full entry, with the team's decisions, is in the client's
  `AI_USAGE.md`.
- **Team modifications:** none beyond those recorded in the client entry.
- **Lessons / limitations:** the skill was tried on this repository's PR #43,
  where it found the 19-cell plausibility limits and the hand-copied Hexa Fit
  maximum (`FIT_MAX_SCORE = 1000`); both are tracked in #47.
- **Update (same day):** until the teacher approves it, Ronald removed the
  `change-scenarios` skill, its subagent and the "Change scenarios" section
  of the gate 1 plan; only the "Design for change" rule remains. Restoring
  them is a revert of that commit.

### 2026-11-24 — List and publish levels

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #34.
- **Prompt (paraphrase):** implement issue #34 through the harness with
  Clean Architecture, SOLID and the agreed patterns, one commit at a time.
- **Result:** a generic `RolesGuard` with `@Roles()`, the
  `ILevelSpecValidator` Strategy with a registry and the Hexa Sort v1
  validator, the `SeedConfig` rule (unsigned 32-bit value), the
  `ILevelCatalog` port with its Prisma adapter, the publish and list use
  cases, both endpoints, and unit and e2e tests (including concurrent
  publishes).
- **Team modifications:**
  - The owner made four decisions before the build: Hexa Sort only until
    the Hexa Fit spec (#60) is approved, the seed value as an unsigned
    32-bit integer (also fixed in the contract on #63), a branch from `main`
    merged after #63, and a generic roles guard instead of an admin-only
    one.
  - The plan extended `PrismaLevelRepository`; the build used a separate
    `PrismaLevelCatalog` so the existing port and its tests stay untouched.
  - A self-review by a separate agent found two inputs that crashed with a
    500 (`"seedConfig": null`, and an `after` beyond the `int` column) and a
    broken README table row; all were fixed with e2e cases before the PR.
    It also led to `schemaVersion: 0` answering 422, as the contract says
    for an unknown version, instead of 400.
- **Lessons / limitations:**
  - A test file passed Jest but failed the typecheck, because ts-jest runs
    with `isolatedModules`; it was fixed in its own commit. Run
    `npm run typecheck` after every test change, not only Jest.
  - The concurrency e2e was checked by removing the advisory lock: the test
    failed, so it really protects distinct orders.
  - The validator checks only the format; whether a level can be won stays
    with the admin panel and the game (D-16).
  - `plausibility-limits.ts` still repeats Hexa Sort limits (19 cells,
    9 chips) that now live in `SORT_SPEC_V1`; left for #47.

### 2026-11-24 — Get and configure the seed config

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #28.
- **Prompt (paraphrase):** implement issue #28 through the harness with
  Clean Architecture, SOLID and the agreed patterns, one commit at a time,
  stacked on the #34 branch.
- **Result:** the contract lines for the default config and the PUT
  errors, `seedScopeOf` and `DEFAULT_SEED_CONFIG` in the domain, a shared
  `SeedConfigRequest` DTO, the `ISeedConfigStore` port with its Prisma
  adapter (find then update or create under an advisory lock), the get and
  configure use cases, both endpoints, and unit and e2e tests.
- **Team modifications:**
  - The owner chose the default for a game or level never configured:
    random with `updatedAt: null`, written in the contract, instead of a
    404 or seeding rows.
  - The owner asked whether any class creates its own dependencies; the
    check confirmed that only the composition root uses `new`.
  - The 4-lens review flagged an e2e test that left the shared Hexa Lines
    row changed; it now restores the rows it removes.
  - A self-review by a separate agent found a regression: moving the seed
    DTO let `POST /levels` accept an array as `seedConfig` and publish a
    random seed. It was fixed with `@IsObject()` and e2e cases in its own
    commit, together with an unknown mode reported twice.
  - The owner ran the endpoints by hand (default, save, read, 401, 400,
    404).
- **Lessons / limitations:**
  - The concurrency e2e passes even without the lock: the gap between the
    read and the write is too short to race. The lock was proven by
    widening it with `pg_sleep` (7 of 8 saves failed without the lock, all
    passed with it); the test stays as a safety net only.
  - Only the last change of each config is audited; a full history would
    be a new issue.
  - `seedScopeOf` still reads two helpers keyed by game; #68 moves it to a
    single traits catalog.

### 2026-11-26 — Allow the admin panel origins through CORS

- **Tool / model:** Claude Code, claude-opus-5-5.
- **Issue / PR:** #67.
- **Prompt (paraphrase):** start #67 with the approved plan, one commit at
  a time, explaining each change for a beginner and how to test it.
- **Result:** the `CORS_ORIGINS` variable with its validation and unit
  tests, `app.enableCors` limited to those origins with e2e tests
  (preflight, allowed, rejected, none configured), the `AppSettings`
  parameter object, and the docs.
- **Team modifications:**
  - The owner forbids agents from editing `.env.example`; the AI gave the
    exact line and the owner added it by hand.
  - The planned commit scope `config` was rejected by commitlint; the
    owner approved `api`, the scope used before for this file.
  - Two validation cases (a value that is not a URL, an empty entry) were
    added beyond the approved test list and reported before the commit.
  - The gate 4 review by a separate agent found the `Refs` footers without
    a colon (reworded before the push), a missing preflight test for an
    unlisted origin, and CORS answering every preflight even with no origin
    listed; the last two were fixed in their own commits.
- **Lessons / limitations:**
  - The owner ran every case by hand with `curl.exe`; one start-up failure
    turned out to be a leftover `CORS_ORIGINS=*` in the terminal, which the
    validation correctly rejected.
  - CORS only protects browsers: a request without `Origin` (curl, the
    mobile app) is still answered; authentication protects the data.
  - Production allows `http://localhost:5173` until the panel has a public
    origin (client #77).
  - The panel cannot read `X-Request-Id` or `Retry-After` yet (not
    CORS-safelisted); `exposedHeaders` is left for #52.

### 2026-11-23 — Hexa Fit level format proposal

- **Tool / model:** Codex, Antigravity (Gemini 4 Neon).
- **Issue / PR:** #32 (Fit review from #45, PR #66).
- **Prompt:** Document the Fit schema and align the server format checks
  and 400 vs 422 boundary with the merged `POST /levels` DTO.
- **Result:** Drafted version 1, listed each validation error and aligned
  the outer request envelope (`400`, including non-object `spec`) versus
  level spec content (`422`) with `PublishLevelRequest`.
- **Team modifications:** PepeTza requested explicit error conditions.
  Kenneth's Hexa Sort schema and `POST /levels` endpoint (#34) are in main.
- **Lessons / limitations:** The example uses a catalog shape that covers
  the figure. The contract separates shape ID syntax from catalog membership
  and playability. The Fit server validator follows in #34 once approved.

## 3. Critical evaluation

To be completed at the end of the project.

- **Approximate percentage of AI-assisted code:**
- **Cases where the AI was wrong or suboptimal, and how they were detected:**
- **Impact on productivity and quality:**
