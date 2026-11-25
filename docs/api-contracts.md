# API Contracts

REST contract between the HexaBlock Suite mobile client and the backend
(NestJS + PostgreSQL on Supabase). This document is the reference for both
repositories: the client implements its HTTP adapters against it and the
backend must not change it without updating this file first.

- Related: [`data-model.md`](./data-model.md) (database), use cases CU-10 to
  CU-18 and business rules RN-32 to RN-43 in the client repo
  (`docs/use-cases.md`, `docs/business-rules.md`).
- Live reference: once implemented, the API is documented with Swagger /
  OpenAPI at `/api/docs`, generated from the code. This file is the design
  contract that the code must follow; if they differ, fix one of them in the
  same PR.
- Status: **draft**. Values marked *(proposed)* can be adjusted by the team;
  sections marked **TBD** are pending design.

---

## 1. General conventions

| Item | Convention |
|---|---|
| Base path | `/api/v1` (all routes below are relative to it) |
| Admin panel | A web app in the client repo (`admin/`) that uses this API with an admin token; the API allows its origin through CORS |
| Format | JSON, UTF-8. Field names in `camelCase` |
| Dates | ISO 8601 in UTC, e.g. `2026-11-10T22:05:00Z` |
| Durations | Milliseconds (`durationMs`) |
| IDs | Opaque strings assigned by the server (UUID) unless stated otherwise |
| Auth | `Authorization: Bearer <JWT>` |

### `gameId` values

`hexa-lines`, `hexa-fit`, `hexa-sort`, `hexa-merge`. Any other value → `400`.

| `gameId` | Mode | Has levels | Has seed config |
|---|---|---|---|
| `hexa-lines` | Endless | No | Yes (per game) |
| `hexa-fit` | Levels | Yes | No (no randomness) |
| `hexa-sort` | Levels | Yes | Yes (per level) |
| `hexa-merge` | Endless | No | Yes (per game) |

### Authentication

- The JWT payload contains `sub` (user id), `username` and `role`
  (`player` | `admin`).
- Lifetime: **90 days**. The client renews it with `POST /auth/refresh` every
  time the app opens with a connection and an active session (CU-11).
- There is no logout endpoint: the token is stateless, so logging out means
  deleting it (and the account's local progress) from the device (RN-42).
- Access levels used in this document:
  - **public** — no token required.
  - **player** — valid token, any role.
  - **admin** — valid token with `role = admin` (`403` otherwise).

### Error format

Every error response uses the same body:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "username must be between 3 and 20 characters",
  "details": [{ "field": "username", "issue": "length" }],
  "requestId": "6f1c2a9e-0000-4000-8000-000000000001"
}
```

- `details` is optional. Each entry names the invalid `field` (nested
  fields with dots, e.g. `moves.0.x`) and the rule it broke as `issue`
  (`length`, `int`, `notEmpty`…). A field not defined for the endpoint is
  rejected with `issue: "notAllowed"`.
- `requestId` is always present and equals the `X-Request-Id` response
  header, which every response carries. The server generates it; a value sent
  by the client is ignored. Quote it when reporting an error.

| Code | Meaning in this API |
|---|---|
| `400` | Malformed request or invalid field values |
| `401` | Missing, invalid or expired token; wrong credentials |
| `403` | Valid token but insufficient role |
| `404` | Resource not found |
| `409` | Conflict (e.g. username already taken) |
| `422` | Well-formed but rejected by a business rule (implausible score, invalid level) |
| `429` | Rate limit exceeded. Includes `Retry-After` header (seconds) |
| `500` | Unexpected server error. Always the generic message `Unexpected error` |
| `503` | Service or database unavailable |

### Error security

Rules every endpoint follows (decision 22):

- A `5xx` never carries detail: no stack trace, SQL, Prisma code, table or
  column name. The detail is written only to the server log, under the
  `requestId`.
- Only errors raised on purpose keep their message. Known database errors
  are mapped to the contract's own messages (`409 Resource already exists`,
  `404 Resource not found`), never the driver's text.
- The log never records request bodies, headers or query strings, so
  passwords and tokens stay out of it.
- Responses do not announce the server technology (no `X-Powered-By`).
- The Swagger UI and the OpenAPI document are not served in production.

Accepted risks:

- `409` on `POST /auth/register` reveals that a username exists. Accepted
  because players need to know they must pick another name; the register
  rate limit makes enumerating names slow.
- `GET /health` is public and reports when the database is down. Accepted
  because the deployment platform needs it to restart the service; it
  reveals no address, version or error detail.

### Rate limits

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 attempts per minute per username + IP |
| `POST /auth/register` | 5 per minute per IP |
| `POST /scores` | 30 per minute per user |

---

## 2. Endpoint summary

| Method and route | Access | Use case | Purpose |
|---|---|---|---|
| `POST /auth/register` | public | CU-10 | Create a player account |
| `POST /auth/login` | public | CU-11 | Log in, get a JWT |
| `POST /auth/refresh` | player | CU-11 | Renew the JWT for 90 more days |
| `GET /progress` | player | CU-11, CU-12 | Progress for all four games |
| `PUT /progress/{gameId}` | player | CU-12 | Merge local progress with the server's |
| `POST /scores` | player | CU-13 | Submit a finished game's score |
| `GET /leaderboard/{gameId}` | player | CU-14 | Top 50 and own position |
| `GET /levels/{gameId}` | public | CU-15 | Level definitions after a given order |
| `POST /levels/{gameId}` | admin | CU-17 | Publish a new level (immutable) |
| `GET /seed-config/{gameId}` | public | CU-15 | Current seed mode |
| `PUT /seed-config/{gameId}` | admin | CU-18 | Change the seed mode |
| `GET /health` | public | — | Liveness and database check |

---

## 3. Auth

### `POST /auth/register` — public (CU-10)

Request:

```json
{ "username": "ronald_g", "password": "s3cretPass" }
```

Validation (decision 21):

- `username`: 3–20 characters, ASCII letters (`a–z`, `A–Z`), digits and `_`;
  unique, case-insensitive. It is stored and returned in lower case.
- `password`: 8–72 characters and at most 72 bytes in UTF-8, because bcrypt
  ignores everything after the first 72 bytes. A longer password is rejected
  with `400` and `issue: "byteLength"` instead of being silently truncated.

The password is stored hashed, never in plain text (RNF-10). The new user gets
`role = player`. There is no email (RN-42).

Response `201`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "expiresAt": "2027-02-08T22:05:00Z",
  "user": { "id": "7f1c...", "username": "ronald_g", "role": "player" }
}
```

Errors: `400` invalid fields, `409` username taken, `429`.

### `POST /auth/login` — public (CU-11)

Request: same shape as register.

Response `200`: same shape as register.

Errors:

- `401` with a generic message ("invalid username or password"); never reveals
  which one failed.
- `429` too many attempts.

### `POST /auth/refresh` — player (CU-11)

Request: no body. The current token goes in the `Authorization` header.

Response `200`: same shape as register, with a new token valid for 90 days.

Errors: `401` if the token is expired or invalid. The client then asks the
player to log in again and keeps the local progress and pending queue
(CU-11 A5).

---

## 4. Progress

A player has **one progress entry per `gameId`** (RN-33).

### `PlayerProgress` object

```json
{
  "gameId": "hexa-fit",
  "bestScore": 0,
  "levels": [
    { "levelId": "3b2a...", "bestScore": 1840, "stars": 3 },
    { "levelId": "9c4e...", "bestScore": 920, "stars": 1 }
  ],
  "updatedAt": "2026-11-10T22:05:00Z"
}
```

- Endless games (`hexa-lines`, `hexa-merge`): `bestScore` is used and `levels`
  is always `[]`.
- Level games (`hexa-fit`, `hexa-sort`): `bestScore` is `0`. A level appears in
  `levels` only once it has been completed. `stars` is 1–3 in `hexa-fit` and
  `null` in `hexa-sort`, which has no stars (RN-25).
- `updatedAt` is set by the server.

### `GET /progress` — player (CU-11, CU-12)

Returns progress for all four games. Used after logging in on a device.

Response `200`:

```json
{ "progress": [ /* PlayerProgress for each gameId the player has played */ ] }
```

Games never played are omitted.

### `PUT /progress/{gameId}` — player (CU-12)

Sends the device's progress for one game. The server **merges** it with what it
has, keeping the best of both (RN-36):

- `bestScore` = max of both.
- For each level: max `bestScore` and, in `hexa-fit`, max `stars`.
- `levels` = union of the levels completed on either side.

Request: a `PlayerProgress` without `updatedAt`. The `gameId` in the body must
match the path.

Response `200`: the merged `PlayerProgress`. The client stores it locally.

**Idempotent:** sending the same body twice gives the same result, so retries
are safe.

Errors:

- `400` invalid body, unknown `levelId`, `gameId` mismatch, or `stars` sent
  for a `hexa-sort` level.
- `401` invalid or expired token.

---

## 5. Scores and leaderboard

### `POST /scores` — player (CU-13)

Request:

```json
{
  "sessionId": "e3d1c2b4-...",
  "gameId": "hexa-sort",
  "levelId": "9c4e...",
  "score": 2350,
  "seed": 1739201,
  "moveCount": 42,
  "durationMs": 183000,
  "finishedAt": "2026-11-10T21:58:12Z"
}
```

- `sessionId`: UUID generated by the client for each game. Used for
  idempotency (CU-13 A4).
- `levelId`: required for `hexa-fit` and `hexa-sort`; must be `null` for
  `hexa-lines` and `hexa-merge`.
- `seed`: the seed used in the game; `null` for `hexa-fit`.

The server validates (RN-39):

1. The token is valid.
2. The format is valid.
3. The values are plausible for the game (see the table below).
4. The rate limit is respected.

Plausibility limits, with `n` = `moveCount`. They are theoretical maxima of
the scoring rules, deliberately loose so an honest score is never rejected;
they change only if the scoring rules change (decision 8):

| Game | Highest plausible `score` | Derived from |
|---|---|---|
| All | `0` when `n = 0`; and `durationMs ≥ 100·n` | No move is faster than 100 ms |
| `hexa-lines` | `5n + 1125·(n(n+1)/2 + n)` | D-08: a piece of at most 5 cells completes at most 15 lines, and the streak on move `m` is at most `m` |
| `hexa-merge` | `4·(19n + n(n+1)/2)` | RN-28, RN-29: merging keeps the board's value, and each move adds a tile of at most 4 to a board of 19 cells |
| `hexa-sort` | `171·(19 + n)` | RN-40: at most 19 initial stacks of 9 chips plus 9 chips per move, times at most 19 goals per cascade |
| `hexa-fit` | `1000` | Decision 8: `max(100, 1000 − 20·extraMoves − 2·seconds)` |

Other cases:

- A `levelId` that is not a published level of `gameId` → `400`.
- A `sessionId` already sent by **another** player → `400`.
- A `sessionId` that was rejected as implausible → `422` again on every
  retry.

If the score is the player's best for that table, the server updates their
leaderboard entry (RN-43). Ties are ordered by the earliest `finishedAt`.

Response `201` (or `200` if this `sessionId` was already received; the
response body is the same):

```json
{ "accepted": true, "personalBest": true, "rank": 17 }
```

`rank` is the player's position in that table after the update.

Errors:

- `400` invalid format.
- `422` implausible score. The server logs it; the client drops it from the
  queue, does not retry and does not tell the player (RN-43).
- `429` rate limit; the client retries later.

### `GET /leaderboard/{gameId}?levelId=` — player (CU-14)

| `gameId` | Without `levelId` | With `levelId` |
|---|---|---|
| `hexa-lines`, `hexa-merge` | Global, by best score | `400` |
| `hexa-fit`, `hexa-sort` | Global, by **sum** of best level scores (RN-34) | That level, by score |

Response `200`:

```json
{
  "gameId": "hexa-fit",
  "levelId": null,
  "entries": [
    { "rank": 1, "username": "ana", "score": 15230, "achievedAt": "2026-11-09T14:10:00Z" }
  ],
  "me": { "rank": 17, "score": 8120 },
  "generatedAt": "2026-11-10T22:05:00Z"
}
```

- `entries`: top 50 (D-12).
- `me`: `null` if the player has no score in this table.

Errors: `400` invalid `levelId` for the game, `404` unknown `levelId`.

---

## 6. Levels

Only `hexa-fit` and `hexa-sort` have levels. For `hexa-lines` and `hexa-merge`
both endpoints return `400`.

Published levels are **immutable** and are always appended at the end of the
order (RN-37).

### `LevelDefinition` object

```json
{
  "id": "9c4e...",
  "gameId": "hexa-sort",
  "order": 12,
  "schemaVersion": 1,
  "spec": { /* variant-specific, see below */ },
  "publishedAt": "2026-11-10T22:05:00Z"
}
```

| Field | Description |
|---|---|
| `id` | Assigned by the server |
| `gameId` | `hexa-fit` or `hexa-sort` |
| `order` | Position in the level sequence. Starts at 1, assigned by the server, never reused |
| `schemaVersion` | Version of the `spec` format, so old clients can detect a level they cannot read |
| `spec` | Variant-specific content |
| `publishedAt` | Set by the server |

A change to the format of a `spec` creates a new `schemaVersion`; published
levels keep the version they were published with (RN-37).

#### `spec` for `hexa-fit` — **TBD**

Will contain: the target figure (set of cells), the pieces from the catalog
(D-07) and the score thresholds for 1, 2 and 3 stars. Defined after the Hexa
Fit class diagram.

#### `spec` for `hexa-sort` — `schemaVersion` 1

```json
{
  "radius": 2,
  "blocked": [{ "q": 0, "r": 0 }],
  "initialStacks": [{ "cell": { "q": 1, "r": -1 }, "chips": [0, 0, 1] }],
  "colors": 4,
  "tray": { "size": 1, "minHeight": 2, "maxHeight": 6, "maxColorsPerStack": 2 },
  "goals": 5
}
```

| Field | Type and range | Description |
|---|---|---|
| `radius` | integer, always `2` in v1 | The board is the hexagon of radius 2 around `(0, 0)`: 19 cells, as the project statement requires. Another size needs a new `schemaVersion` |
| `blocked` | array of `{ q, r }`, both integers | Cells that can never hold a stack. May be empty |
| `initialStacks` | array of `{ cell, chips }` | Stacks already on the board when the level starts. May be empty |
| `initialStacks[].cell` | `{ q, r }`, both integers | Where the stack is |
| `initialStacks[].chips` | array of 1–9 integers, each from `0` to `colors - 1` | The colors of the chips, **from bottom to top** |
| `colors` | integer, 2–8 | Number of colors in the level. A chip is a color index from `0` to `colors - 1`; the client chooses the palette |
| `tray.size` | integer, always `1` in v1 | Stacks the tray offers at a time: one, as the statement and RN-20 say |
| `tray.minHeight`, `tray.maxHeight` | integers, 1–9, `minHeight ≤ maxHeight` | Height range of the stacks generated with the seed |
| `tray.maxColorsPerStack` | integer, 1 to `colors` | Most different colors a generated stack can have. An upper bound, so it may exceed `maxHeight`: a stack of height 2 never has more than 2 colors |
| `goals` | integer, 1–99 | Stacks removed (10 or more chips of one color) needed to win (RN-24) |

Cells use the axial coordinates `q, r` of the client engine (`HexCoord`). A
cell is on the board when `max(|q|, |r|, |q + r|) ≤ radius`. Source: Red
Blob Games, "Hexagonal Grids", sections "Axial coordinates" and "Distances"
(https://www.redblobgames.com/grids/hexagons/).

When a stack gathers 10 or more chips of the same color, the **whole stack** is
removed from the board and counts as one goal, as the project statement says.
Stacks start with at most 9 chips, so no stack can start already complete.
Colors are indexes, not names or codes, so the client can change its palette
(theme, color blindness) without touching published levels (RN-37).

Besides the types and ranges above, the server rejects a `hexa-sort` level
with `422` when:

1. a cell of `blocked` or `initialStacks` is outside the board;
2. a cell appears twice, inside one list or across both;
3. a chip is not an integer from `0` to `colors - 1`;
4. no free cell is left to place a stack.

The server does **not** check whether the level can be won: the admin panel
and the game do (D-16). The seed mode is not part of the level either; it
lives in seed config (section 7, RN-05).

### `GET /levels/{gameId}?after={order}` — public (CU-15)

Returns the levels with `order > after`, sorted by `order`. Without `after`,
it returns all of them.

Response `200`:

```json
{ "levels": [ /* LevelDefinition */ ] }
```

Errors: `400` for games without levels or a non-integer `after`.

### `POST /levels/{gameId}` — admin (CU-17)

Request:

```json
{
  "schemaVersion": 1,
  "spec": { /* variant-specific */ },
  "seedConfig": { "mode": "random" }
}
```

- `seedConfig`: required for `hexa-sort`, not allowed for `hexa-fit`. Same
  shape as in section 7.
- The server checks the **format** of the level: required fields, types and
  a known `schemaVersion`. Whether the level can be played (area, solution,
  goals, RN-13) is validated by the admin panel with the game's own code, and
  the game validates every level again when it downloads it (D-16, CU-15 A2).
- The server assigns `id`, `order` (last + 1) and `publishedAt`.

Response `201`: the created `LevelDefinition`.

Errors:

- `400` the request envelope is wrong: malformed JSON, a missing
  `schemaVersion` or `spec`, `seedConfig` missing for `hexa-sort` or present
  for `hexa-fit`, a `gameId` without levels, or an unknown field outside
  `spec`. It usually means a bug in the caller.
- `403` not an admin.
- `422` the envelope is right but the level is not: an unknown
  `schemaVersion`, a wrong type or range inside `spec`, an unknown field
  inside `spec`, or a rule of the variant (for `hexa-sort`, rules 1-4 above);
  `message` says which field. The admin panel can show it to the admin.

There is no update or delete endpoint, by design.

---

## 7. Seed config

Controls whether games use a fixed seed (same game every time, useful for
tests and events) or a random one (RN-05). Changes apply from the next game
started on the device (CU-15 A3).

### `SeedConfig` object

```json
{ "mode": "fixed", "value": 1739201 }
```

| Field | Description |
|---|---|
| `mode` | `"fixed"` or `"random"` |
| `value` | Required when `mode = fixed`, absent when `random`. Unsigned 32-bit integer (`0` to `4294967295`): the client's seeded random works on 32 bits, so a larger value would silently play another seed |

### `GET /seed-config/{gameId}` — public (CU-15)

`hexa-lines` and `hexa-merge` (per game):

```json
{
  "gameId": "hexa-lines",
  "config": { "mode": "random" },
  "updatedAt": "2026-11-10T22:05:00Z"
}
```

`hexa-sort` (per level):

```json
{
  "gameId": "hexa-sort",
  "levels": [
    { "levelId": "9c4e...", "config": { "mode": "fixed", "value": 42 }, "updatedAt": "..." }
  ]
}
```

`hexa-fit`: `400` (no randomness).

`hexa-sort` lists every published level, in level order. While the admin has
never configured a game or a level, its `config` is the default
`{ "mode": "random" }` (RN-05) and its `updatedAt` is `null`.

### `PUT /seed-config/{gameId}?levelId=` — admin (CU-18)

- `levelId` is required for `hexa-sort` and not allowed for `hexa-lines` /
  `hexa-merge`.
- Request: a `SeedConfig`.
- The server stores who changed it and when.

Response `200`: the updated config, in the same shape as the `GET` (only the
affected entry for Sort).

Errors: `400` invalid value, `levelId` misuse or `hexa-fit` (no randomness),
`401` no valid token, `403` not an admin, `404` unknown `levelId`.

---

## 8. Health

### `GET /health` — public

Used by the deployment platform and CI to check that the API is up.

Response `200`:

```json
{ "status": "ok", "database": "ok" }
```

Response `503` if the database does not respond:

```json
{ "status": "error", "database": "down" }
```

---

## 9. Open items

| Item | Depends on |
|---|---|
| `spec` schema for `hexa-fit` | Hexa Fit class diagram, piece catalog (D-07) |
| Final rate-limit values | Team decision |
| Username and password rules | Team decision |
