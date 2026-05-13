# RBAC with custom per-User permission overrides

We adopted better-auth's admin plugin with `createAccessControl` for 6 predefined recruitment roles (BD, RM, SC, TL, Caller, QC) defined in TypeScript, plus a `"custom"` role that stores per-user permission overrides in a `permissions` JSON column on the user table. Roles are single-assignment (one per user), not multiple. The admin role bypasses all checks. Role/permission changes invalidate all active sessions for that user. Self-registration is disabled; only admins create accounts via a seed script or the admin API.

## Considered Options

- **All roles in JSON file**: Rejected — not editable at runtime by admins through the UI, no better-auth type safety, redundant with TypeScript definitions.
- **Runtime role creation in database**: Rejected — adds significant complexity (CRUD API for roles, migration for role definitions, no `createAccessControl` type safety). Per-user overrides via `"custom"` role cover the same need with simpler implementation.
- **Multiple roles per user**: Rejected — creates ambiguity in permission resolution and conflicts with the custom-override model. The `"custom"` role already handles any permission combination.
- **DB-queried permissions per request**: Rejected in favor of session-cached permissions for performance. Session invalidation on role change ensures freshness.

## Consequences

- Adding a new predefined role requires a code change and deployment (but the 6 recruitment roles are stable).
- Adding a new resource/action to the `createAccessControl` statement requires a code change — existing custom permissions in the DB may reference stale resources and need migration.
- The `"custom"` role cannot be assigned with empty permissions — the API validates this at assignment time.
- The first admin is created via a seed script; subsequent admins can be promoted by existing admins.
