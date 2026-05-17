# AGENTS.md

## Stack
- **Runtime**: Bun — always use `bun --bun run` for scripts
- **Framework**: TanStack Start (React, SSR)
- **Routing**: TanStack Router, file-based (`src/routes/`)
- **API**: oRPC (`src/rpc/`) — NOT tRPC, NOT `src/orpc/`
- **ORM**: Drizzle + PostgreSQL. Schema in `src/db-schemas/` (NOT `src/schema/`). DB connection in `src/lib/db/server.ts`
- **Auth**: better-auth (`src/lib/auth/server.ts`). Phone-number + OTP login; email/password is **disabled** (`emailAndPassword.enabled: false`). Uses `customSession` plugin to inject role + resolved permissions into session
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Linting/Formatting**: Biome (`biome.json`)
- **Typechecking**: `tsgo` (TypeScript native preview — NOT `tsc`)
- **Validation**: Zod v4 (different API from Zod 3)
- **UI**: shadcn `base-nova` style, Tabler icons (both `lucide-react` and `@tabler/icons-react` installed)

## Key Commands
```bash
bun --bun run dev              # Dev server (port 3020)
bun --bun run build            # Production build
bun --bun run preview          # Preview production build
bun --bun run test             # bun vitest run
bun --bun run check:lint       # Biome check --fix
bun --bun run check:types      # tsgo --noEmit
bun --bun run db:push          # Drizzle push schema to DB (dev only — no generate/migrate scripts)
bun --bun run db:studio        # Drizzle Studio
bun --bun run gen:auth-schema  # Regenerate better-auth schema → src/db-schemas/auth.ts
```

For other Biome operations, invoke directly:
```bash
bunx --bun @biomejs/biome lint --fix
bunx --bun @biomejs/biome format --write
```

## Setup
1. `docker compose up -d` — PostgreSQL on `localhost:5432` (user/pass/db: `postgres`/`postgres`/`mydb`)
2. Set `DATABASE_URL` in `.env.local` (default: `postgresql://postgres:postgres@localhost:5432/mydb`)
3. Generate `BETTER_AUTH_SECRET`: `bunx --bun @better-auth/cli secret`
4. Set `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST` in `.env.local` (optional, analytics)
5. `bun --bun run db:push` — sync schema to DB
6. `bunx --bun @better-auth/cli migrate` — create better-auth tables
7. `bun scripts/seed.ts` — interactive CLI to create first admin user (no npm script; fails if any users already exist)

## Architecture
- **Route tree** auto-generated to `src/routeTree.gen.ts` — never edit manually; excluded from Biome and VCS ignore
- **Protected routes**: `src/routes/(protected)/` uses `beforeLoad` guard calling `getSession()` from `src/routes/api/auth.ts` — redirects unauthenticated users to `/`
- **API routes**: `src/routes/api/$.ts` (OpenAPI), `src/routes/api/auth.$.ts` (better-auth), `src/routes/api/rpc.$.ts` (oRPC proxy), `src/routes/api/auth.ts` (`getSession` server function)
- **oRPC router**: `src/rpc/router/index.ts` — namespaces: `task.*`, `client.*`, `contract.*`, `reminder.*`, `notification.*`, `admin.*`, `users.*`
- **oRPC procedure chain** (`src/rpc/middleware.ts`):
  - `base` — raw context (headers only), defined in `src/rpc/context.ts`
  - `protectedProcedure` — base + auth + permission middleware (checks `meta.permission`)
- **Permission middleware**: set `meta: { permission: { resource, action } }` on a procedure to enforce RBAC. Admin role has all permissions in `resolvePermissions()` output so passes every check. Non-admin users need the exact `resource:action` string in their resolved permissions array.
- **Service layer**: `src/services/` — business logic (task-service, task-event-service, task-link-service, client-service, client-event-service, prospect-service, prospect-event-service, reminder-service, notification-service, supervisor-hierarchy-service)
- **Access control**: `src/lib/auth/access-control.ts` — defines resources, actions, roles, and `resolvePermissions()`. The `permissions` JSON column on user stores per-user overrides for `"custom"` role. Predefined roles: `admin`, `bd`, `rm`, `sc`, `tl`, `caller`, `qc`.
- **Env vars**: `src/env.ts` using `@t3-oss/env-core` — client vars need `PUBLIC_` prefix (set in `vite.config.ts` `envPrefix`). Server vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_SECRET_ACCESS_KEY`. Client vars: `PUBLIC_POSTHOG_HOST`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_R2_PUBLIC_URL`.
- **Import aliases**: `@/*` → `./src/*`, `#/*` → `./integrations/*`, `#tests/*` → `./tests/*`
- **Integrations dir**: `integrations/` (email, forms, posthog, reports, tables, tanstack-query, web-push, whatsapp) — app-level providers/clients aliased via `#/*`
- **oRPC client**: `src/rpc/client.ts` — isomorphic (server-side calls router directly, client uses fetch link to `/api/rpc`)

## Testing
- **Runner**: Vitest via `bun vitest run` (`bun --bun run test`)
- **Pattern**: `src/**/*.test.ts` (co-located in `__tests__/` dirs)
- **DB**: PGlite (in-memory Postgres) — no Docker needed for tests
- **Setup**: `tests/setup.ts` mocks `@/lib/db/server` via `vi.mock`; test files call `setTestDb()` from setup before each test. Helpers in `tests/db.ts`: `createTestDb`, `resetDb`, `seedUser`
- **Caveat**: `vitest.config.ts` only resolves `@/*` and `#tests/*` aliases; `#/*` is NOT available in tests
- **Service tests**: `src/services/__tests__/` cover task, task-event, task-link, client-contract, supervisor-hierarchy, and reminder services
- **Biome relaxes rules in `__tests__/`**: `noExplicitAny: off`, `noNonNullAssertion: off`
- **Biome also relaxes in `src/components/forms/**`**: `useComponentExportOnlyModules: off`, `noExplicitAny: off`

## Domain Constraints
- Self-registration is **disabled** — only admins can create users (enforced in `databaseHooks` in auth config)
- Auth uses phone-number + OTP; email/password login is off
- Tasks cannot be deleted — only archived (boolean flag)
- Every task change produces an immutable Task Event (audit trail)
- Relative reminders are only valid when the task has a deadline
- See `CONTEXT.md` and `UBIQUITOUS_LANGUAGE.md` for full domain model and terminology

## Style Notes
- Biome: 2-space indent, double quotes, `organizeImports: on`
- Biome scope: all files except `routeTree.gen.ts`, `.opencode/`, `.agents/`, `.wrangler/`, `worker-configuration.d.ts`
- Biome `useSortedClasses` enforced (Tailwind class sorting via `clsx`/`cva`/`tw`)
- Biome disables ALL lint rules in `src/components/ui/**` (shadcn components — set `recommended: false`)

## Gotchas
- `bunfig.toml` sets `install.auto = "disable"` — `bun install` won't auto-install missing packages. Run `bun install` explicitly when adding deps.
- Drizzle uses `db:push` only (no `generate`/`migrate` scripts) — schema is pushed directly to DB
- `bunfig.toml` sets `test.onlyFailures = true` and `test.randomize = true` for Vitest
- Changing a user's role or permissions invalidates all their active sessions (server deletes sessions on role/permission update)
- Client env vars use `PUBLIC_` prefix (not `VITE_`) — configured in `vite.config.ts` `envPrefix: "PUBLIC_"` and `src/env.ts` `clientPrefix: "PUBLIC_"`
- `drizzle.config.ts` reads `.env.local` + `.env` via dotenv (not Vite env loading)

## Animation Notes
- No bounce
- Durations at the lower end (100-160ms for press, 150-200ms for collapse)
- ease-out curves that start fast and settle
