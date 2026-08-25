# Better Auth + Google + RBAC (Portal staff)

**Date:** 2026-08-24  
**Status:** Approved  
**Scope:** Staff authentication on portal; NestJS Better Auth; invite-only Google; admin user provisioning + roles

## Decisions

| Question | Choice |
| -------- | ------ |
| Who signs in where | Staff only on **portal**; **`apps/web` stays public** (no auth) |
| Google first-time users | **Invite-only** — Google works only if an admin already created that email |
| Account creation | **Admin-provisioned only** — public `/signup` disabled |
| Sign-in methods | Email/password **and** Google; same email **links** to the existing user |
| Approach | Extend existing Nest Better Auth (no second auth system, no allowlist table) |
| Seed admin email | `SEED_ADMIN_EMAIL` (default `sikarwar2010@gmail.com`); password only in local env |

## Architecture

```text
Portal (:3000) → rewrite /api/* → Nest Better Auth (/api/auth/*) → Session → AuthGuard → RBAC
apps/web (:3001) → public municipal site — no Better Auth client
```

- Nest is the sole auth authority.
- Portal is the sole authenticated UI (first-party cookies via same-origin rewrite).
- RBAC remains Prisma `Role` / `Permission` / `UserRole` + `AuthGuard` / `PermissionGuard` / portal `usePermission`.

## Better Auth configuration

- `emailAndPassword.enabled: true` with **`disableSignUp: true`** (no public email registration).
- Admin creates users via Nest `POST /api/v1/users` (Prisma user + credential `Account` with Better Auth password hash), not public `/api/auth/sign-up/email`.
- `socialProviders.google` when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set, with **`disableSignUp: true`**.
- `account.accountLinking.enabled` + `trustedProviders: ["google"]`.
- Admin-created users set **`emailVerified: true`** so trusted Google linking succeeds.
- `BETTER_AUTH_URL` / public base URL must be the **portal origin** (e.g. `http://localhost:3000`) so OAuth callbacks resolve through the rewrite: `/api/auth/callback/google`.

## Role assignment

- Create with explicit `roleIds`: assign only those roles (no extra unintended `SURVEYOR`).
- Create without `roleIds`: default `SURVEYOR`.
- Seed / first-user path: `SUPER_ADMIN` via seed + existing hook for BA-created edge cases.
- Portal Settings → Users: create user + edit roles/status; gated by `user:create` / `user:update` (UX); API enforces permissions.

## Error handling

| Case | Behavior |
| ---- | -------- |
| Google email not provisioned | Reject (`disableSignUp`); login UI: “Your account is not provisioned…” |
| Duplicate email on create | Clear conflict / validation error |
| Inactive / suspended | `AuthGuard` rejects API access |
| Open `/signup` | Redirect to `/login` |

## Out of scope

Citizen auth on web, 2FA, magic-link invites, separate allowlist table, portal route-level permission guards beyond nav/action hiding.

## Security

- Google and Better Auth secrets stay server-side only (never `NEXT_PUBLIC_*`).
- Pre-created `User` is the Google allowlist.
- Never commit real passwords or OAuth client secrets.
