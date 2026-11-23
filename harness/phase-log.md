# Phase Log

One row per completed task, newest at the bottom. Keep each cell short; the
details live in the PR.

| Date | Task | Issue / PR | Owner | Tests (passed / total) | Notes |
|---|---|---|---|---|---|
| 2026-11-10 | Repository skeleton (docs, harness, templates) | — | PepeTza | — | No code yet |
| 2026-11-11 | Shared agent skills | #7 | PepeTza | — | Docs only; api-endpoint + 3 skills shared with the client (#12) |
| 2026-11-11 | Corrections from the plan and documentation review (contract, docs index, contributing) | — (branch `claude/tender-babbage-cx0n60`) | PepeTza | — | Docs only; twin of the client PR; findings in the client's `docs/plan-review-2026-11-11.md` |
| 2026-11-11 | Relax the PR review rule | — | PepeTza | — | Docs only; no approval required on `main`; the author merges on green CI; review requested and allowed after the merge; twin PR in the client |
| 2026-11-11 | Align CONTRIBUTING with the admin panel in the client | #8 | PepeTza | — | Docs only; same file as the client (PepeTza/hexablock-client#4) |
| 2026-11-14 | NestJS setup with strict TypeScript, Prisma, health and Swagger | #4 | KeneFu | 11/11 unit, 4/4 e2e | NestJS 11 (12 is ESM-only and needs Vitest); Prisma 7 + `@prisma/adapter-pg` approved by the team; local PostgreSQL on host port 5433 |
| 2026-11-17 | Layer boundaries with ESLint rules and Jest fixture | #6 | PepeTza | 20 / 20 unit | `no-restricted-imports` per layer (`domain`, `application`, `adapters`); `eslint-boundaries.spec.ts` |
| 2026-11-17 | Backend CI with a PostgreSQL service | #5 | KeneFu | 20/20 unit, 4/4 e2e | One `ci` job on PRs and pushes to `main`; `postgres:16` service; the owner still has to mark the check as required on `main` |
| 2026-11-18 | Prisma schema and initial migration | #17 | KeneFu | 20/20 unit, 10/10 e2e | 7 tables, 4 enums; 4 partial unique indexes by hand (Prisma keeps them); every FK restricts deletes; e2e migrate first and roll back their rows |
| 2026-11-18 | Remove DDD references in favour of Clean Architecture | #24 | PepeTza | — | Docs only; aligned `data-model.md`, `AGENTS.md`, `CONTRIBUTING.md` and `api-endpoint`; twin client #43 |
| 2026-11-20 | Twin of CONTRIBUTING, checklist and shared skills changes | #37 | PepeTza | — | Docs only; twin of client #101, #50 and #53; README gets an empty References section for the `log-ai-usage` step |
| 2026-11-21 | Error format, validation, request logging and Swagger | #18 | KeneFu | 42/42 unit, 19/19 e2e | Aspects as Nest filter, pipe and interceptor; server-generated `X-Request-Id`; generic `500` (decision 22); `class-validator` and `class-transformer` added; Swagger off in production; contract §1 gains `requestId` and "Error security" |
| 2026-11-22 | Register, login and refresh with JWT | #19 | KeneFu | 83/83 unit, 30/30 e2e | Decision 21 confirmed (password ≤ 72 bytes); first `src/domain`; bcrypt 12, HS256 only, 90-day token re-read on refresh; throttler moved to I1; follow-ups: per-IP login limit, login tracker test, `trust proxy` in #20 |
| 2026-11-23 | Get and merge player progress | #26 | KeneFu | 114/114 unit, 41/41 e2e | Merge rule in the `PlayerProgress` entity (RN-36); new `invalid` error kind (400); advisory lock per user and game against concurrent syncs; a retry writes nothing and keeps `updatedAt` |
| 2026-11-23 | Define the Hexa Sort level spec v1 | #32 | KeneFu | — | Docs only; radius 2, one-stack tray and whole-stack removal aligned with the project statement; Hexa Fit spec left to its owner |
| 2026-11-23 | Submit scores with plausibility check and rate limit | #27 | KeneFu | 144/144 unit, 52/52 e2e | One plausibility Strategy per variant (Template Method base) with loose limits from the scoring rules; 30/min per player; advisory lock per player and table; sessionId retries answer 200 |
| 2026-11-23 | Deploy the backend on merge to main | #20 | KeneFu | 155/155 unit, 55/55 e2e | Render Blueprint (`render.yaml`) deploys `main` after CI passes; migrations at start (no free pre-deploy); Supabase session pooler (direct is IPv6 only); new `TRUST_PROXY_HOPS` (default 0, Render 1) so rate limits see each client's IP |
