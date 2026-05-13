# AUTH-PRD: Role-Based Access Control

## Problem Statement

The recruitment application currently has no authorization layer — any authenticated user can access all functionality. The team needs enforced permission boundaries so that Business Developers, Client Relationship Managers, Talent Sourcers, Team Leaders, Callers, and Quality Checkers each see and do only what their role permits. Additionally, admins need the ability to grant per-user custom permissions when no predefined role fits.

## Solution

Implement RBAC using better-auth's admin plugin with `createAccessControl`. Six predefined recruitment roles are defined in TypeScript with their permissions filled in later. A seventh role, `"custom"`, stores per-user permission overrides in a `permissions` JSON column on the user table. An admin role bypasses all checks. Permissions are cached in the session via the `customSession` plugin, and all role/permission changes invalidate the affected user's sessions. Self-registration is disabled; only admins create accounts.

## User Stories

1. As an Admin, I want to create a new team member account with a specific role, so that they have the right access from day one
2. As an Admin, I want to create a new team member account with the custom role and select individual permissions, so that I can tailor access when no predefined role fits
3. As an Admin, I want to see a list of all team members and their assigned roles, so that I can audit who has what access
4. As an Admin, I want to update a team member's role, so that I can reflect organizational changes
5. As an Admin, I want to update a custom-role team member's individual permissions, so that I can adjust their access granularly
6. As an Admin, I want to disable (ban) a team member's account, so that they immediately lose access without deleting their record
7. As an Admin, I want to re-enable a previously banned team member, so that they can resume work
8. As an Admin, I want to delete a team member's account permanently, so that their data is removed from the system
9. As an Admin, I want to reset a team member's password, so that they can regain access if they forget it
10. As an Admin, I want to view all available predefined roles and their permission sets, so that I can pick the right role when creating or updating a user
11. As an Admin, I want to promote another user to admin, so that I am not a single point of failure
12. As an Admin, I want the system to reject creating a custom-role user with empty permissions, so that no user ends up with zero access by mistake
13. As a team member, I want to sign in and see only the features my role permits, so that I am not confused by options I cannot use
14. As a team member, I want to be automatically signed out when my role or permissions change, so that I cannot continue with stale access
15. As a team member, I want my session to persist for 30 days under normal circumstances, so that I do not have to sign in frequently
16. As a team member, I want to see my own role and permissions in the session, so that the UI can adapt to my access level
17. As a Talent Sourcer, I want to access only candidate-sourcing features, so that I cannot accidentally modify job postings or reports
18. As a Caller, I want to access only call-related features, so that my workflow is focused and simple
19. As a Quality Checker, I want to access only review-related features, so that I can verify work without altering it
20. As a Team Leader, I want to view team member profiles, so that I can see who is on my team
21. As a Business Developer, I want to access candidate and job features, so that I can manage the recruitment pipeline
22. As a Client Relationship Manager, I want to access client-facing features, so that I can manage client relationships
23. As an unauthorized user, I want to see a clear 403 error with the specific missing permission, so that I know what access I need to request
24. As an unauthenticated user, I want to be unable to create an account myself, so that only authorized team members can join the system
25. As an Admin, I want to run a seed script to create the first admin account, so that I can bootstrap the system without needing an existing admin
26. As an Admin, I want to update a team member's name or email, so that their profile stays current
27. As a developer, I want predefined roles defined in TypeScript with type safety, so that adding permissions is checked at compile time
28. As a developer, I want oRPC procedures to declare their required permission in metadata, so that permission logic stays out of business logic
29. As a developer, I want route guards to check permissions before the API call fires, so that users get fast UX feedback
30. As a developer, I want a single `resolvePermissions` function that handles admin bypass, predefined roles, and custom overrides, so that permission checking is consistent everywhere

## Implementation Decisions

### Access Control Statement

The `createAccessControl` statement defines the permission surface of the application:

```
const statement = {
  candidate: ["create", "read", "update", "delete", "assign"],
  job: ["create", "read", "update", "delete", "assign", "close"],
  task: ["create", "read", "update", "delete", "assign"],
  call: ["create", "read", "update"],
  report: ["read", "generate"],
  team: ["read", "manage-members"],
  user: ["read", "manage"],
} as const
```

All 6 predefined recruitment roles (BD, RM, SC, TL, Caller, QC) are stubbed with empty permission sets initially. Permissions will be filled in as the domain is defined.

### Role Values

The user table `role` column stores short lowercase codes: `admin`, `bd`, `rm`, `sc`, `tl`, `caller`, `qc`, `custom`. A display name map (e.g., `bd` → "Business Developer") is defined alongside the roles.

One role per user. No multiple-role assignment. The `"custom"` role covers any permission combination an admin needs.

### Admin Bypass

When `role === "admin"`, all permission checks pass without consulting the access control statement. No explicit permissions are listed for admin in the `createAccessControl` definition.

### Custom Permissions Storage

The `permissions` column is a JSON (jsonb) column on the user table. Its shape mirrors the `createAccessControl` statement:

```json
{
  "candidate": ["create", "read"],
  "job": ["read"],
  "task": ["create", "read", "update"]
}
```

When `role === "custom"`, the Permission Resolver reads from this column instead of the predefined role definition. The API rejects creating or updating a custom-role user with empty permissions.

### Permission Resolution

A pure `resolvePermissions(role, permissions)` function returns the effective permission set. Logic:
1. If `role === "admin"`, return a sentinel indicating full access (bypass all checks)
2. If `role` is a predefined role key, look up permissions from the `createAccessControl` role definitions
3. If `role === "custom"`, return `permissions` (already in statement shape)

### Session-Cached Permissions

The better-auth `customSession` plugin enriches the session with the user's `role` and resolved permissions. The client reads these from `authClient.useSession()` for conditional UI rendering. No extra API call needed.

On any role or permissions change, all active sessions for that user are invalidated, forcing re-login with fresh permissions.

Self-registration is disabled. The `admin` plugin's `defaultRole` config is omitted — there is no fallback role.

### oRPC Permission Enforcement

A permission middleware is built as a reusable oRPC procedure builder. Procedures declare their required permission via `.meta()`:

```
const protectedProcedure = publicProcedure
  .use(authMiddleware)
  .use(permissionMiddleware)

const listCandidates = protectedProcedure
  .meta({ permission: { resource: "candidate", action: "read" } })
  .handler(async () => { ... })
```

The middleware reads the required permission from meta, resolves the user's effective permissions from the session context, and throws a structured `ORPCError` with `FORBIDDEN` code if unauthorized. The error includes `requiredPermission: { resource, action }` and a human-readable message.

An `adminProcedure` builds on `protectedProcedure` and additionally requires `role === "admin"`.

### Admin API

Six oRPC procedures under an `admin` namespace, all using `adminProcedure`:

- **createUser** — input: email, name, password, role, permissions (required when role is "custom"). Validates permissions non-empty when role is "custom".
- **updateUser** — input: userId, partial update of role, permissions, banned, banReason, banExpires, name, email. When role or permissions change, invalidate all sessions for that user.
- **listUsers** — returns all users with id, email, name, role, permissions, banned status.
- **deleteUser** — input: userId. Permanently removes the user.
- **listRoles** — returns the 6 predefined roles with their display names and permission sets, plus the "custom" and "admin" roles. Sourced from the TypeScript definitions.
- **resetPassword** — input: userId, newPassword. Force-sets the user's password.

### Route Guards

TanStack Router `beforeLoad` hooks on protected routes call `resolvePermissions` with the session user's role/permissions and check against the required permission. If unauthorized, redirect to a 403 page. These are co-located with route definitions, not centralized.

### First Admin Bootstrap

A seed script (run via `bun run seed:admin`) creates the first admin user directly in the database, bypassing the need for an existing admin. Takes email, name, and password as input.

### Database Schema Changes

The user table (managed by better-auth) gains three additional columns:
- `role` (text, not null, default "user" — will be overridden at creation time)
- `permissions` (jsonb, nullable — only populated when role is "custom")
- `banned` (boolean, default false)
- `banReason` (text, nullable)
- `banExpires` (timestamp, nullable)

These are provided by better-auth's admin plugin for `role`, `banned`, `banReason`, `banExpires`. The `permissions` column is a custom addition.

### Auth Plugin Configuration

Server (`auth.ts`):
- Add `admin` plugin with the access controller and predefined roles
- Add `customSession` plugin that resolves permissions and attaches them to the session

Client (`auth-client.ts`):
- Add `adminClient` plugin
- Add `customSessionClient` plugin for type-safe session access

### oRPC Context Injection

The oRPC handler in `api.rpc.$.ts` currently passes `context: {}`. This is modified to resolve the auth session from the request and inject it into the oRPC context, making user/role/permissions available to all middleware.

## Testing Decisions

No tests are required at this time.

## Out of Scope

- Defining specific permissions for each of the 6 predefined recruitment roles (to be done later)
- Admin UI pages and components (this PRD covers the backend and data layer only)
- Team-as-entity (teams as database records with membership — "team" is a permission domain only)
- Multiple roles per user
- Runtime role creation (no admin UI for creating new reusable role templates)
- OAuth/social login providers
- Email verification flow
- Password complexity rules
- Audit logging for admin actions (beyond better-auth's built-in session tracking)

## Further Notes

- When permissions for the 6 predefined roles are defined later, only the TypeScript role definitions in the Access Control module need updating. No schema changes or migrations required.
- If a new resource or action is added to the `createAccessControl` statement, existing `permissions` values in the database may contain stale entries. A data migration strategy will be needed at that time.
- The session invalidation on role change is critical for security — without it, a demoted user retains their old access until their session expires naturally.
