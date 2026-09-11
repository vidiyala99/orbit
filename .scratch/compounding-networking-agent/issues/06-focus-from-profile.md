# 06: Focus from your own profiles

**What to build:** No onboarding form and no cold start. Orbit runs the enrichment worker on the signed-in user's own LinkedIn and X. The LLM gateway infers their Focus (Role + Struggle), with evidence snippets from their profiles. The user sees "Here's what you're after" and confirms in one tap, or edits either field freely (Role can be anything, not just a job). The Focus is editable later from the app. This replaces the job-target editor in the UI.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Users have `profile`, `focus_role`, `focus_struggle`, `focus_evidence`, and `focus_confirmed_at` (migration). Legacy job-target columns are left unused
- [ ] `POST /me/focus/infer` returns role, struggle, and evidence from the user's enriched profile. `PATCH /me/focus` confirms or edits
- [ ] One-tap confirm/edit screen on first run, editable later. The job-target editor and its tests are removed from the UI
- [ ] UI copy uses Focus / Role / Struggle (CONTEXT.md)
- [ ] API tests (worker + gateway faked). Component test for confirm/edit
