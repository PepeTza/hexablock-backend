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

## 3. Critical evaluation

To be completed at the end of the project.

- **Approximate percentage of AI-assisted code:**
- **Cases where the AI was wrong or suboptimal, and how they were detected:**
- **Impact on productivity and quality:**
