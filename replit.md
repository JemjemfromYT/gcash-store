# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **store** (`/`) — React+Vite storefront with a Buy button that creates a PayMongo checkout session (GCash, card, Maya). Pages: `/`, `/success`, `/cancel`, `/premium`. Premium unlock state stored in `localStorage` after returning from success URL.
  - **Game** (`/game/`) — Static HTML game *Neural Survival: Fracture Realm* served from `public/game/`. The Vite SPA fallback is bypassed for `/game/` via a custom middleware in `vite.config.ts` so the static `index.html` is served directly. Includes `heroes-dlc.js` which adds 6 paid heroes (justin/jian/joseph/jaballas/joshua/jazmine), a Name+PIN profile system, lock badges, and PayMongo checkout integration.
- **api-server** (`/api`) — Express backend.
  - `POST /api/create-checkout` — site-wide premium unlock checkout.
  - `POST /api/profile/login` `{name, pin}` — creates or authenticates a profile (PIN bcrypt-hashed). Returns `{name, unlockedHeroes}`.
  - `POST /api/heroes/checkout` `{name, pin, heroId}` — ₱29 PayMongo checkout for one hero. Success URL redirects to `/game/?paid=true&hero=<id>`.
  - `POST /api/heroes/unlock` `{name, pin, heroId}` — marks a hero unlocked on the profile (called by client after redirect).

## Database

- **profiles** table (`lib/db/src/schema/profiles.ts`): `id`, `name` (unique), `pinHash` (bcrypt), `unlockedHeroes` (text[]), `createdAt`. Push schema with `pnpm --filter @workspace/db run push`.

## Required Secrets

- `PAYMONGO_SECRET_KEY` — PayMongo API secret (test `sk_test_...` or live `sk_live_...`).
- `SESSION_SECRET` — used by api-server.
- `DATABASE_URL` — auto-provisioned Postgres.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
