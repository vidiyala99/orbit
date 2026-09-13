# Luma Connect uses a short-lived cloud browser; Sync reuses a durable per-user session

## Status

Accepted (2026-09-12)

## Context

End users expect Edge-like behavior: log into Luma once, close the browser, restart the machine, and still be in. Actintro must discover new Going Events without re-auth per room.

Luma's email OTP path requires a Turnstile token bound to `luma.com`. Server-side `httpx` and off-screen automation get `403 additional-verification`. Cookies are httpOnly, so a parent page cannot read them after a normal popup login. Asking users for cookie JSON, Edge pickers, or magic-link paste fails the product bar.

Alternatives considered:

1. **User babysits a local browser / Aside on the operator's laptop** — works for the founder, not for strangers.
2. **Popup to luma.com only** — Turnstile works, but Actintro cannot capture httpOnly cookies without an extension.
3. **Managed cloud browser for Connect only** — backend drives a short Chromium session on `luma.com`, user types email + code in Actintro, cookies are exported and stored encrypted per user.
4. **Aside Max as the multi-tenant runtime** — possible later; sales/enterprise shaped; not required to prove the Edge model.

## Decision

- **Connect** for end users runs through a **managed cloud browser** (e.g. Browserbase, Steel, or equivalent). The user only enters email and a 6-digit code in Actintro.
- Persist the resulting cookies as a **Luma session** on that user (encrypted at rest). One session covers the account, not a single Event.
- **Sync** reuses the Luma session to refresh Going Events and guests. Soft-sync when opening Home/Events if stale; background polling can come later. No Sync button nag as the primary UX.
- On auth failure from Luma, show a **soft re-Connect** (another code), do not wipe the product into an empty “never connected” dead end on soft errors.
- Aside Free stays for operator QA and later LinkedIn/X research routines — not the multi-user Connect runtime.

## Consequences

- Connect cost is metered cloud-browser minutes (minutes per handshake), not a permanent browser per user.
- Sync stays cheap API/cookie reuse until Luma invalidates the session.
- We must not clear `luma_session` on soft/transient failures; encryption keys must be stable across deploys (dedicated key preferred over deriving from a rotating JWT secret).
- Demo / seeded rooms remain available so users can try Focus without Connect.
