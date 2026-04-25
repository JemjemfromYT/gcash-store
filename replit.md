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

- **store** (`/`) — React+Vite storefront with a Buy button that creates a PayMongo checkout session (GCash, card, Maya). Pages: `/`, `/success`, `/cancel`, `/premium`. Premium unlock state is stored in `localStorage` after returning from the success URL.
- **api-server** (`/api`) — Express backend. `POST /api/create-checkout` calls the PayMongo checkout API using `PAYMONGO_SECRET_KEY` and returns `{ checkoutUrl }`.

## Required Secrets

- `PAYMONGO_SECRET_KEY` — PayMongo API secret (test `sk_test_...` or live `sk_live_...`).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
