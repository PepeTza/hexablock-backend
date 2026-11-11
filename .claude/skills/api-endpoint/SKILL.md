---
name: api-endpoint
description: Implement one endpoint of the HexaBlock Suite API exactly as docs/api-contracts.md defines it, through the Clean Architecture layers of the backend. Use for every new or changed endpoint.
---

# API endpoint

The contract is [`docs/api-contracts.md`](../../../docs/api-contracts.md). The
mobile client and the admin panel depend on it, so the code follows the
contract, never the other way round.

## 1. Read the contract first

- Find the endpoint in §2 and its section: route, access level (public,
  player, admin), use case (CU-xx), request, response, error codes and rate
  limit.
- Find the tables it touches in [`docs/data-model.md`](../../../docs/data-model.md).
- If something the endpoint needs is marked **TBD** or is missing, stop and
  ask. Changing an endpoint, DTO or error code needs the team's approval and
  an update of `api-contracts.md` in the same PR (`AGENTS.md`).

## 2. Build it from the inside out

| Step | Layer | Folder | What |
|---|---|---|---|
| 1 | Domain | `src/domain/<context>/` | Aggregate or value object changes, with the business rule (RN-xx) inside the domain, never in the controller |
| 2 | Application | `src/application/ports/` | The repository or service port the use case needs (`IUserRepository`, `ITokenService`, ...) |
| 3 | Application | `src/application/use-cases/` | The use case as a plain class with no Nest decorators |
| 4 | Adapters | `src/adapters/persistence/` | The `Prisma...Repository` implementing the port |
| 5 | Adapters | `src/adapters/http/` | Request and response DTOs with class-validator, the mapper, and the controller that only translates HTTP to the use case |
| 6 | Frameworks | `src/frameworks/` | The Nest module wiring the use case with `useFactory`, and the guard for the access level |

## 3. Rules every endpoint keeps

- Base path `/api/v1`; JSON in `camelCase`; dates in ISO 8601 UTC.
- Every error uses the contract's error body (`statusCode`, `error`,
  `message`, optional `details`) through the global exception filter.
- Access level enforced by a guard: player = valid JWT, admin = JWT with
  `role = admin` (`403` otherwise).
- Swagger decorators on the controller and DTOs, so `/api/docs` matches the
  contract.
- Published levels are never updated or deleted: no such repository method.
- Passwords only as hashes; secrets only from environment variables.

## 4. Tests (`aaa-test` skill)

- Unit tests (`*.spec.ts`) for the domain and the use case, with fakes of the
  ports.
- An e2e test with supertest against the disposable PostgreSQL of CI, for the
  success case and every error code listed in the contract. Never Supabase.
- When Pact is in place (T34), the endpoint's interactions are verified by the
  provider test.

## 5. Done

- [ ] Request, response and errors match `api-contracts.md` field by field.
- [ ] No business rule in the controller.
- [ ] Coverage ≥ 80 % in domain and use cases.
- [ ] `/api/docs` shows the endpoint as documented.
