# Deploy actintro.com (marketing frontend on Vercel)

Local `scripts/dev.sh` remains **dev**. Production is a deliberate Vercel deploy of `frontend/` only.

## Status (as of first ship)

| Item | State |
|------|--------|
| Vercel project | **actintro** (`vidiyala99s-projects`) |
| Production URL | https://actintro.vercel.app |
| Domains on project | `actintro.com`, `www.actintro.com` (pending your DNS) |
| Waitlist API | `POST /api/waitlist` (needs `WAITLIST_FORM_ENDPOINT` on Vercel) |

## 1. Formspree (waitlist storage)

1. Create a free form at [formspree.io](https://formspree.io).
2. Copy the form endpoint: `https://formspree.io/f/xxxxxxxx`.
3. Vercel → Project **actintro** → Settings → Environment Variables → Production:
   - `WAITLIST_FORM_ENDPOINT` = that URL (server-only; never `NEXT_PUBLIC_`)
4. Redeploy production so the env is picked up (`npx vercel --prod` from `frontend/`, or Promote in the dashboard).

Until this is set, the route still returns success locally/on Vercel but does **not** persist signups.

## 2. Vercel project (already created via CLI)

- **Root Directory:** `frontend`
- Framework: Next.js
- **Do not** put the full Operate API on this domain for day one.

### Production deploy discipline

- Prefer production deploys only from **`main`** once the repo is connected to GitHub (Project → Settings → Git → Production Branch = `main`).
- Until then: ship with an intentional `npx vercel --prod` from a clean marketing tree — never point the public domain at localhost.
- Preview deployments are fine for experiments; do not Promote them to production casually.

Optional: leave `NEXT_PUBLIC_API_BASE` unset for marketing-only; demo remains a secondary link.

## 3. Custom domain via Cloudflare (required for email)

**Keep Cloudflare nameservers** (see `docs/actintro-com-email.md`). Do **not** switch the domain to `ns1.vercel-dns.com` / `ns2.vercel-dns.com` — that would break Cloudflare Email Routing.

After the Cloudflare zone is **Active**:

1. Cloudflare → `actintro.com` → **DNS** → set **web** records (keep Email Routing MX/TXT as-is).

   Preferred (what Vercel Domain Connect recommends; **DNS only / grey cloud** required):

   | Type | Name | Content | Proxy |
   |------|------|---------|--------|
   | CNAME | `@` | `d537f42e04681939.vercel-dns-017.com` | **DNS only** |
   | CNAME | `www` | `d537f42e04681939.vercel-dns-017.com` | **DNS only** |

   Fallback A records if you prefer A over CNAME flattening:

   | Type | Name | Content | Proxy |
   |------|------|---------|--------|
   | A | `@` | `216.198.79.1` | **DNS only** |
   | A | `@` | `64.29.17.1` | **DNS only** |
   | A | `www` | same, or CNAME `www` → apex target | **DNS only** |

   Older anycast `76.76.21.21` may still work, but **orange-cloud proxy without a Vercel cert
   causes Error 525**. Leave proxy off until https://actintro.com loads; only re-enable proxy
   after Vercel shows a cert / Domains Valid, with SSL mode **Full (strict)**.

2. Or open Vercel’s Domain Connect apply URL from `vercel domains verify actintro.com` and approve
   the Cloudflare DNS change (also sets proxy off).
3. Confirm https://actintro.com and https://www.actintro.com serve the marketing page.
4. Keep Cloudflare nameservers for email — do **not** switch to `ns1.vercel-dns.com`.

## 4. Checklist

- [ ] Formspree form created; `WAITLIST_FORM_ENDPOINT` set on Vercel Production; redeployed
- [ ] Cloudflare zone Active; NS not on Vercel
- [ ] A/`www` records point at `76.76.21.21` (or Vercel’s current targets)
- [ ] `actintro.com` + `www` HTTPS Valid in Vercel
- [ ] Waitlist submit on production appears in Formspree
- [ ] Localhost Operate app still works with `scripts/dev.sh`
