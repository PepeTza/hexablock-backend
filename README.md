# HexaBlock Suite — Backend

<!-- Badges: added when CI is set up (build status, tests, coverage). -->
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

> **Status:** pre-implementation. The repository currently holds the API
> contract, contribution rules and agent harness. Code starts in the next
> iteration.

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

_Coming soon:_ prerequisites, environment variables, database setup and how to
run the API locally.

## Running Tests

_Coming soon._

## AI Usage Documentation

See [`AI_USAGE.md`](./AI_USAGE.md). AI agents follow [`AGENTS.md`](./AGENTS.md)
and the [`harness/`](./harness/README.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md): Conventional Commits, branch
workflow (GitHub Flow, protected `main`) and pull request process.

## License

[MIT](./LICENSE)
