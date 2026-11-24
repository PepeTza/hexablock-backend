# HexaBlock Suite — Backend

[![CI](https://github.com/PepeTza/hexablock-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/PepeTza/hexablock-backend/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

> **Status:** foundations. The NestJS project, the database connection and
> `GET /api/v1/health` are in place; the endpoints of the contract arrive in
> the next iterations.

## Description

REST API for
[HexaBlock Suite](https://github.com/PepeTza/hexablock-client), a mobile app
with four hex-board puzzle games on one generic engine. Built with
**NestJS + TypeScript** and **PostgreSQL** (Supabase).

Responsibilities:

- Registration and login with JWT and roles (player, admin).
- Player progress sync, one entry per user and `gameId`.
- Leaderboards per `gameId` and, for level-based games, per level.
- Level definitions for Hexa Fit and Hexa Sort, added without updating the app.
- Seed configuration for the games that use randomness.
- Endpoints used by the admin panel (in the client repo) to publish levels
  and configure seeds.

## Architecture

_Coming soon._ Clean Architecture with four layers; the layer diagram will be
embedded here, sources in [`docs/`](./docs).

## Generic Engine

The game engine lives only in the
[client repository](https://github.com/PepeTza/hexablock-client#generic-engine).
The backend does not run game rules: it stores levels, progress and scores,
and checks their format and plausibility.

## Design Patterns

_Coming soon._

## SOLID Principles

_Coming soon._

## AOP

_Coming soon:_ logging, security/authorisation and error handling, implemented
with NestJS interceptors, guards and filters.

## API

The design contract is [`docs/api-contracts.md`](./docs/api-contracts.md).
Once implemented, interactive documentation (Swagger / OpenAPI) is available at
`/api/docs`.

## Getting Started

### Prerequisites

- Node.js 22.13 or newer and npm.
- Docker Desktop, for the local PostgreSQL.

### Run the API locally

```bash
npm install
cp .env.example .env
npm run db:up
npm run start:dev
```

- Health check: http://localhost:3000/api/v1/health returns
  `{ "status": "ok", "database": "ok" }`.
- Swagger UI: http://localhost:3000/api/docs (not served when
  `NODE_ENV=production`).
- `npm run db:down` stops the database; its data is kept in a Docker volume.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Locally, the Docker database on port 5433; in production, Supabase. Never committed. |
| `PORT` | No | Port the API listens on. Defaults to `3000`. |
| `NODE_ENV` | No | `development`, `test` or `production`. Defaults to `development`. In `production` the Swagger UI is not served. |
| `JWT_SECRET` | Yes | Signs and verifies the access tokens. At least 32 characters; use a random value, for example from `openssl rand -base64 32`. Never committed. |
| `TRUST_PROXY_HOPS` | No | Number of proxies in front of the API whose `X-Forwarded-For` entries are trusted, so rate limits see each client's IP. An integer from `0` to `5`; defaults to `0` (no proxy, the header is ignored). Render sets `1`. |

The API refuses to start if a variable is missing or malformed.

## Running Tests

```bash
npm test               # unit tests
npm run test:coverage  # unit tests with the 80 % coverage check
npm run test:e2e       # end-to-end tests; needs `npm run db:up`
```

End-to-end tests always use the disposable database, never the one in `.env`.
They apply the pending migrations first, and the schema tests run inside
transactions that are rolled back, so they leave no rows behind.

### Database migrations

The schema is [`prisma/schema.prisma`](./prisma/schema.prisma), described in
[`docs/data-model.md`](./docs/data-model.md). Migrations are committed in
`prisma/migrations/` and never edited once applied.

```bash
npx prisma migrate status              # what is applied
npx prisma migrate dev --name <change> # create and apply a new migration
npx prisma migrate deploy              # apply committed migrations (CI, deploy)
```

### Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every pull
request and every push to `main`, against a disposable `postgres:16` service:
commitlint on the PR's commits, format, lint, type-check,
`prisma migrate deploy`, unit tests with the 80 % coverage threshold, e2e tests
and build. A red check means the pull request must not be merged.

## Deployment

The API runs on a free [Render](https://render.com) web service and the
database on a free [Supabase](https://supabase.com) project (decision D-10).
The service is described in [`render.yaml`](./render.yaml), a Render
Blueprint, so every deployment setting is versioned and reviewed in pull
requests.

- **Public URL:** https://hexablock-api.onrender.com (health:
  https://hexablock-api.onrender.com/api/v1/health).
- **How the service was created:** by hand in Render's dashboard, with the
  exact values of `render.yaml`, because Render's identity check blocked the
  Blueprint flow at the time. The dashboard therefore holds the live
  settings: whoever changes one of them updates `render.yaml` in the same
  pull request, and the other way round.

- **When it deploys:** after a merge to `main`, once the CI checks of that
  commit pass (`autoDeployTrigger: checksPass`). A red CI never reaches
  production.
- **What it runs:** `npm ci --include=dev && npm run build`, then
  `npx prisma migrate deploy && npm run start:prod`. Migrations run at start
  because free instances have no pre-deploy step, so they also run (and
  change nothing) on every wake from sleep. If a migration fails, the new
  version never passes the health check and the previous one keeps serving.
  A migration that fails halfway, though, can leave the schema half changed:
  `npx prisma migrate status` shows it as failed, and it must be fixed by
  hand and marked with `npx prisma migrate resolve` before the next deploy.
- **Health check:** `GET /api/v1/health` must answer `200`.
- **Shutdown:** before stopping or replacing an instance, Render sends
  `SIGTERM`; `main.ts` enables Nest's shutdown hooks, so the database pool is
  closed cleanly instead of being cut.
- **Regions:** Render in Virginia and the Supabase project in East US (North
  Virginia, `us-east-1`), so every query stays in one area; of Render's
  regions, it is the closest to the players in Latin America. Supabase's
  region cannot be changed after the project is created.
- **Supabase settings:** the Data API is off (the NestJS API is the only way
  to the database) and RLS is enabled on new tables as a second lock; Prisma
  connects as the owner of the tables, so RLS does not block it.
- **Check after the first deploy:** `render.yaml` trusts one proxy
  (`TRUST_PROXY_HOPS=1`). Register from two networks (for example Wi-Fi and
  mobile data) six times each within a minute: each network must get its own
  `429`. If both share one, Render adds more hops than expected. **Pending:**
  not run yet, since no second network was available on the first deploy.

| Variable | Where it comes from |
|---|---|
| `NODE_ENV` | `production`, set in `render.yaml`. |
| `TRUST_PROXY_HOPS` | `1`, set in `render.yaml`: Render's proxy. |
| `JWT_SECRET` | Generated by Render on the first deploy. |
| `DATABASE_URL` | Typed in Render's dashboard: the Supabase **session pooler** string. |
| `PORT` | Set by Render. |

**Why the session pooler:** Supabase's direct connection is IPv6 only and
Render has no outbound IPv6, so the API and `prisma migrate deploy` use the
session pooler (port `5432`), which is IPv4. The transaction pooler (port
`6543`) does not support migrations. The string looks like
`postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.

**Free plan limits:** the service sleeps after 15 minutes without requests,
so the first request after that takes up to about a minute. Supabase pauses a
project after 7 days without activity; restore it from the Supabase dashboard.

## AI Usage Documentation

See [`AI_USAGE.md`](./AI_USAGE.md). AI agents follow [`AGENTS.md`](./AGENTS.md)
and the [`harness/`](./harness/README.md).

## References

External sources of algorithms and ideas. We reimplement them; we do not copy
their code. Each one is also cited in a comment in the file that uses it.

| Source | What we took | Where |
|---|---|---|
| OWASP, [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | bcrypt work factor of at least 10 (we use 12) and its 72-byte input limit | `src/adapters/security/bcrypt-password-hasher.ts` |
| OWASP, [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | One generic login error and equal response time, so usernames cannot be enumerated | `src/application/use-cases/login.use-case.ts` |
| IETF, [RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518#section-3.2) | HS256 keys of at least 256 bits (`JWT_SECRET` of 32+ characters) | `src/frameworks/config/environment.ts` |
| PostgreSQL docs, [Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) | A transaction-level lock per user and game, so concurrent progress syncs never lose a best result; one per game, so concurrent publishes get distinct level orders | `src/adapters/persistence/prisma-progress-repository.ts`, `src/adapters/persistence/prisma-level-catalog.ts` |
| Express docs, [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html) | Trust exactly the number of proxy hops in front of the API, so `req.ip` is the client and cannot be faked | `src/frameworks/configure-app.ts` |
| Red Blob Games, [Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) | Axial coordinates and the axial distance to the centre, which keeps a Hexa Sort cell on the board | `src/domain/level/sort-spec-v1-validator.ts`, `docs/api-contracts.md` §6 |
| Render docs, [Blueprint YAML Reference](https://render.com/docs/blueprint-spec) | `autoDeployTrigger: checksPass`, `healthCheckPath`, `generateValue` and `sync: false` | `render.yaml` |
| Supabase docs, [IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP) | The direct connection is IPv6 only; the session pooler is IPv4 and runs migrations | README → Deployment, `docs/data-model.md` §7 |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md): Conventional Commits, branch
workflow (GitHub Flow, protected `main`) and pull request process.

## License

[MIT](./LICENSE)
