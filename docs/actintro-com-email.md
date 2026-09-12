# actintro.com: Cloudflare email + DNS

Local `scripts/dev.sh` stays **dev**. This doc is only for the public domain.

## 1. Move DNS to Cloudflare

1. Create a Cloudflare account and **Add site** → `actintro.com`.
2. Cloudflare shows two nameservers (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
3. At Namecheap (or your registrar) → Domain List → Manage → Nameservers → **Custom DNS** → paste Cloudflare’s nameservers → Save.
4. Wait until Cloudflare shows the zone as **Active** (can take from minutes to a few hours).

Do **not** point any record at `localhost` or your laptop.

Do **not** switch nameservers to Vercel (`ns1.vercel-dns.com`). Keep Cloudflare so Email Routing and the marketing site share one zone. Point web traffic with A/CNAME records only — see `docs/actintro-com-deploy.md`.

## 2. Email Routing (receive business mail in Gmail)

Goal: organizers can email `aakash@actintro.com` / `hello@actintro.com`; mail lands in `vidiyala.dev@gmail.com`.

1. Cloudflare → select `actintro.com` → **Email** → **Email Routing**.
2. **Get started** / Enable Email Routing (Cloudflare adds the MX / TXT records for you if DNS is on Cloudflare).
3. **Destination addresses** → add `vidiyala.dev@gmail.com` → verify via the Gmail link Cloudflare sends.
4. **Routes** → create:
   - `aakash@actintro.com` → `vidiyala.dev@gmail.com` (your registration / personal business identity)
   - `hello@actintro.com` → `vidiyala.dev@gmail.com` (public / waitlist / general)
5. Send yourself a test from another account to `aakash@actintro.com` and confirm it appears in Gmail.

## 3. Send as `aakash@actintro.com` from Gmail

Receiving alone is not enough for forms that verify the From address. Configure Gmail Send mail as:

1. Gmail → Settings → **See all settings** → **Accounts and Import** → **Send mail as** → **Add another email address**.
2. Name: `Aakash Vidiyala` (or Actintro). Email: `aakash@actintro.com`. Uncheck “treat as alias” only if Gmail’s wizard requires it for your case; usually leave defaults.
3. Gmail will ask you to verify. With Cloudflare Routing, the verification code arrives in the same Gmail inbox.
4. Optional: also add `hello@actintro.com` the same way.
5. When composing, use the From dropdown → `aakash@actintro.com`.

If Gmail requires SMTP for Send as: use Google’s guided SMTP options, or Cloudflare’s current “send via Gmail” notes in Email Routing docs. Prefer Gmail’s built-in verification when it works; it is the least moving parts.

## 4. SPF / deliverability (lightweight)

Cloudflare Email Routing typically publishes the records it needs. After Send as works, send a test to a non-Gmail address and confirm it is not junk. If spam is an issue later, add proper SPF/DKIM for a transactional provider (Resend) when you ship product email; that is separate from this routing setup.

## 5. Checklist

- [ ] Cloudflare zone Active for `actintro.com`
- [ ] Email Routing enabled; destination Gmail verified
- [ ] `aakash@` and `hello@` routes work (receive test)
- [ ] Gmail Send as `aakash@actintro.com` works (send test)
- [ ] No A/CNAME records pointing at localhost
