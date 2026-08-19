# StayConnected — Sub-project: Custom Auth (replacing Clerk)

## Thesis

Clerk's branded, hosted sign-in UI and third-party credential custody undermine the trust this app depends on — a networking app asking strangers to share where they'll be needs to feel owned end-to-end, not brokered through a vendor's modal. This replaces Clerk with auth issued and verified entirely by our own FastAPI backend.

This is a dependency of the landing-page/navigation sub-project (its "Try it out" CTA leads to sign-up/sign-in) and is built first.

## Scope

- Email/password auth with email verification and password reset
- Google OAuth (direct integration, not brokered through a vendor)
- Fully custom-styled auth pages replacing Clerk's prebuilt UI
- Out of scope for v1: refresh tokens, other OAuth providers, 2FA, account deletion/GDPR export flows

## Data model changes

`User` table:
- Add `email` (unique, not null)
- Add `password_hash` (nullable — null if the account is Google-only)
- Add `email_verified_at` (nullable timestamp)
- Add `google_id` (nullable, unique — null if the account is password-only)
- Drop `clerk_id`

A user may have a password, a Google identity, or both linked to the same account (matched by email).

New tables:
- `EmailVerificationToken` — `id`, `user_id`, `token` (opaque random, indexed), `expires_at` (24h from creation), `used_at` (nullable)
- `PasswordResetToken` — same shape, `expires_at` 1h from creation

Both tokens are single-use: `used_at` is set on redemption and checked before honoring the token again.

## Session mechanism

Keep the existing Bearer-JWT-per-request pattern already threaded through `frontend/lib/api.ts` and the WebSocket connection (`wsUrl(threadId, token)`) — only the issuer changes, not the shape. `backend/app/auth.py`'s verification logic keeps the same structure (`get_current_user`, `get_optional_user`, `verify_token`) but verifies against our own signing key instead of fetching Clerk's JWKS.

**Storage correction from the original draft:** several existing pages (`app/page.tsx`, `app/plans/[id]/page.tsx`, `app/chats/[threadId]/page.tsx`) are Next.js Server Components that read the token server-side via Clerk's `auth()` — `localStorage` is invisible there. The token is instead stored in a plain (non-httpOnly) cookie: server components read it via `next/headers`'s `cookies()`, client components read/write it via `document.cookie`. Same Bearer-token-per-request shape as today everywhere it's actually used in a fetch call — only where the token is parked between requests changes.

- JWT signed with a backend-held secret (HS256) — since our own backend is the only verifier, there's no need for the asymmetric key pair / JWKS-endpoint machinery Clerk needed to let multiple parties verify independently
- 7-day expiry, no refresh token in v1 — session ends at expiry, user re-logs in
- Token payload: `sub` (user id), `iat`, `exp`

## Backend endpoints (`backend/app/routers/auth.py`, new)

| Endpoint | Behavior |
|---|---|
| `POST /auth/signup` | email + password → creates user (unverified), sends verification email via Resend, returns JWT |
| `POST /auth/login` | email + password → verifies against `password_hash`, returns JWT |
| `POST /auth/verify-email` | token from email link → sets `email_verified_at`, marks token used |
| `POST /auth/request-password-reset` | email → creates `PasswordResetToken`, sends reset email (always returns success regardless of whether the email exists, to avoid account enumeration) |
| `POST /auth/reset-password` | token + new password → updates `password_hash`, marks token used, invalidates any other outstanding reset tokens for that user |
| `GET /auth/google` | redirects to Google's OAuth 2.0 authorization endpoint |
| `GET /auth/google/callback` | exchanges the authorization code with Google, resolves/creates the user by `google_id` (linking by email if a password account already exists), issues a short-lived one-time code, redirects to the frontend with that code |
| `POST /auth/google/exchange` | frontend exchanges the one-time code for the actual JWT (keeps the JWT out of the redirect URL/browser history) |

Password hashing via `passlib`'s argon2 scheme. Verification-gate decision: `email_verified_at` is tracked and shown in the UI, but does **not** block posting a plan or sending a message in v1.

## Frontend changes

- Remove `@clerk/nextjs` dependency and its provider wrapper in `frontend/app/layout.tsx`
- Replace `frontend/app/sign-in/[[...sign-in]]/page.tsx` and `frontend/app/sign-up/[[...sign-up]]/page.tsx` with custom-styled forms (corkboard design system — see the landing-page spec for the shared visual language once written)
- New routes: `/verify-email` (handles the emailed link), `/forgot-password` (request form), `/reset-password` (handles the emailed link + new-password form)
- New lightweight auth helper: holds the JWT (persisted to a `sc_token` cookie, readable both server- and client-side), exposes `login`, `signup`, `logout`, `getToken`
- Google OAuth button links to `GET /auth/google`; the frontend adds a callback-landing route that calls `POST /auth/google/exchange` with the code from the query string, stores the resulting JWT, redirects to the app

## Email delivery

Resend, via a transactional API call from FastAPI. Two templates: verification link, password-reset link. Both links point at the frontend routes above with the token as a query param.

## Testing

- pytest: password hashing/verification, JWT issuance and verification round-trip (valid, expired, tampered), verification/reset token single-use enforcement and expiry, signup/login endpoint behavior (duplicate email, wrong password), Google OAuth callback with a mocked Google token-exchange response, account linking (existing password account + later Google sign-in with same email)
- Vitest: auth form client-side validation, auth-context token persistence and logout clearing state

## Out of scope (v1)

- Refresh tokens (session simply expires after 7 days)
- Non-Google OAuth providers
- Two-factor auth
- Account deletion / data export
- Rate limiting on auth endpoints (flagged here as a real gap to revisit before wide public launch, since these endpoints are now attack surface we own)
