# Landing Page & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public marketing site (Home, How it works, About) with persistent nav, move the existing app board off `/` to `/today`, and apply the revised (post-audit) animation and interaction-state system.

**Architecture:** `/` becomes the marketing home; the existing board content moves unchanged to `/today`. A shared `<MarketingNav>` component is reused across the three public pages. Until the custom-auth build lands, every primary CTA (hero, footer, "Post your plan") opens the `WaitlistForm` already built and wired on `/today` — not `/sign-up`, which isn't functional yet. Motion is CSS-only (no new dependency): a `useFadeInOnMount` hook for the hero's staggered entrance, and the app's existing stamp-press keyframes reused verbatim on How it works. Interaction states (`:active`, `:focus-visible`, the six untamed surfaces) are added globally in `globals.css` so every page benefits, not just the new ones.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Vitest + Testing Library (all already in place, no new dependencies).

**Spec:** `docs/superpowers/specs/2026-08-19-landing-page-design.md` (as revised after the `deliberate`-skill audit — no eyebrow, 3 bounded motion moments, explicit interaction states) — read it alongside this plan.

## Global Constraints

- No new npm dependencies — CSS keyframes + `IntersectionObserver`/`useEffect` only
- No eyebrow/kicker element on any page (spec: cut, not restyled)
- Exactly 3 motion moments total: hero entrance, stamp-press (How it works only, non-looping), pinned-card hover rotation-straighten (spec: Animation system)
- Every interactive element gets `:active` and `:focus-visible` styling (spec: Interaction states)
- All primary CTAs open `WaitlistForm` (already built at `frontend/components/WaitlistForm.tsx`) until the custom-auth plan ships — do not link to `/sign-up`
- Real `<a>`/`Link` for navigation, `<button>` only for the hamburger toggle and waitlist submit

---

### Task 1: Global interaction-state CSS

**Files:**
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Produces: `.tabular` utility class, themed `::selection`/`caret-color`/scrollbar/link-underline, `:focus-visible` ring — used by every component built in later tasks (nothing to import; these are global styles)

- [ ] **Step 1: Add the themed surfaces and focus/active defaults**

Append to `frontend/app/globals.css`:
```css
:root {
  color-scheme: light;
  caret-color: #B8461A;
}

::selection {
  background: rgba(184, 70, 26, 0.25);
  color: #201D18;
}

::-webkit-scrollbar-thumb {
  background: #DDD5C4;
}

a {
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid #B8461A;
  outline-offset: 2px;
}

.btn-press:active {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify it doesn't break existing pages**

Run: `cd frontend && npx vitest run`
Expected: PASS — no test targets `globals.css` directly, this step confirms nothing else broke.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: add global interaction-state styles (focus, active, untamed surfaces)"
```

---

### Task 2: Move the app board from `/` to `/today`

**Files:**
- Create: `frontend/app/today/page.tsx` (moved content from `app/page.tsx`)
- Delete: (content removed from) `frontend/app/page.tsx` — replaced in Task 4 with the marketing home

**Interfaces:**
- Consumes: `fetchNearbyPlans` (`lib/api.ts`), `PlanFeed`, `WaitlistForm` (existing)
- Produces: `/today` route — referenced by `MarketingNav`'s "Try it out"/waitlist-adjacent links in later tasks is NOT needed (CTAs open the waitlist form, not navigate to `/today`) — but this route is where a real signed-in user will eventually land per the custom-auth plan's `/today` redirect fix

- [ ] **Step 1: Create `app/today/page.tsx` with the current board content**

```typescript
import { fetchNearbyPlans } from "@/lib/api";
import PlanFeed from "@/components/PlanFeed";
import WaitlistForm from "@/components/WaitlistForm";

export default async function TodayPage() {
  // TEMP: Clerk removed pending the custom-auth build (see
  // docs/superpowers/plans/2026-08-19-custom-auth.md); real cookie-based
  // token read lands in that plan's Task 13. Treated as signed-out for now.
  const token = undefined;
  // Discovery is public — anyone can see what's around, signed in or not.
  // Mountain View, CA — replace with browser geolocation in a follow-up task
  const plans = await fetchNearbyPlans(37.3861, -122.0839, 5000, new Date().toISOString(), token);

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <span className="font-display text-sm font-bold text-card">StayConnected</span>
          <p className="font-mono text-[11px] text-rule">
            Networking runs on luck. This is the app for when it isn&apos;t.
          </p>
        </div>
        {/* TEMP: sign-up/sign-in aren't functional until the custom-auth build
            lands, so every primary CTA is the waitlist for now (per
            docs/superpowers/specs/2026-08-19-landing-page-design.md). */}
        <WaitlistForm />
      </div>
      <div className="flex items-baseline justify-between p-4">
        <div>
          <h1 className="font-hand text-2xl text-card">Today</h1>
          <p className="font-mono text-xs text-rule">{plans.length} plans pinned near you</p>
        </div>
      </div>
      <PlanFeed plans={plans} />
    </main>
  );
}
```

This is the same content currently in `app/page.tsx` — a pure move, not a rewrite.

- [ ] **Step 2: Verify the route works**

Run: `cd frontend && npm run dev` (or confirm it's already running), then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/today`
Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add frontend/app/today/page.tsx
git commit -m "feat: move the app board from / to /today"
```

(`app/page.tsx` itself is left as-is for now — Task 4 replaces its content with the marketing home. Committing the move separately from the replacement keeps the diff readable.)

---

### Task 3: `MarketingNav` component

**Files:**
- Create: `frontend/components/MarketingNav.tsx`
- Create: `frontend/components/__tests__/MarketingNav.test.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `<MarketingNav active="home" | "how-it-works" | "about" />` — consumed by Tasks 4, 5, 6

- [ ] **Step 1: Write the failing test**

Create `frontend/components/__tests__/MarketingNav.test.tsx`:
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MarketingNav from "../MarketingNav";

describe("MarketingNav", () => {
  it("renders links to all three marketing pages with real hrefs", () => {
    render(<MarketingNav active="home" />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "/how-it-works");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("marks the active page's link", () => {
    render(<MarketingNav active="how-it-works" />);
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("toggles the mobile drawer via the hamburger button", () => {
    render(<MarketingNav active="home" />);
    const toggle = screen.getByRole("button", { name: /menu/i });
    expect(screen.queryByTestId("mobile-drawer")).not.toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByTestId("mobile-drawer")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run components/__tests__/MarketingNav.test.tsx`
Expected: FAIL — `Cannot find module '../MarketingNav'`

- [ ] **Step 3: Implement `components/MarketingNav.tsx`**

```typescript
"use client";
import { useState } from "react";
import Link from "next/link";

type Page = "home" | "how-it-works" | "about";

const LINKS: { page: Page; label: string; href: string }[] = [
  { page: "home", label: "Home", href: "/" },
  { page: "how-it-works", label: "How it works", href: "/how-it-works" },
  { page: "about", label: "About", href: "/about" },
];

export default function MarketingNav({ active }: { active: Page }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-card px-5 py-3">
      <Link href="/" className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        StayConnected
      </Link>

      <div className="hidden gap-4 font-mono text-[10px] uppercase text-ink2 md:flex">
        {LINKS.map((link) => (
          <Link
            key={link.page}
            href={link.href}
            aria-current={link.page === active ? "page" : undefined}
            className={link.page === active ? "font-bold text-accent" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn-press rounded-full border border-rule px-3 py-1.5 font-mono text-[10px] uppercase text-ink md:hidden"
      >
        Menu
      </button>

      <div
        data-testid="mobile-drawer"
        className={`absolute left-0 right-0 top-full flex-col gap-3 border-b border-rule bg-card p-4 font-mono text-xs uppercase text-ink2 md:hidden ${open ? "flex" : "hidden"}`}
      >
        {LINKS.map((link) => (
          <Link
            key={link.page}
            href={link.href}
            aria-current={link.page === active ? "page" : undefined}
            className={link.page === active ? "font-bold text-accent" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

Note: the `hidden`/`flex` toggle drives visibility for the `toBeVisible()` assertion in the test — jsdom respects `display: none` from the `hidden` utility class.

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run components/__tests__/MarketingNav.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/components/MarketingNav.tsx frontend/components/__tests__/MarketingNav.test.tsx
git commit -m "feat: add MarketingNav with mobile drawer and focus-visible states"
```

---

### Task 4: Home page (`/`)

**Files:**
- Modify: `frontend/app/page.tsx` (replaced with the marketing home)
- Create: `frontend/components/FadeInStagger.tsx`
- Create: `frontend/app/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `MarketingNav` (Task 3), `WaitlistForm` (existing)
- Produces: `<FadeInStagger>` wrapper component — consumed by Task 5's How it works page is NOT needed there (How it works has no hero entrance per spec, only the stamp moment) — this component is Home-only

- [ ] **Step 1: Write the failing test**

Create `frontend/app/__tests__/page.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api", () => ({ fetchNearbyPlans: vi.fn() }));

import Page from "../page";

describe("Home page", () => {
  it("renders the headline, no eyebrow, and both hero CTAs", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByRole("heading", { name: /networking used to run on luck/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join the waitlist/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see how it works/i })).toHaveAttribute("href", "/how-it-works");
  });

  it("renders the three-step summary and thesis quote", async () => {
    const ui = await Page();
    render(ui);
    expect(screen.getByText(/post where you'll be/i)).toBeInTheDocument();
    expect(screen.getByText(/leave with a stamp, not just an add/i)).toBeInTheDocument();
    expect(screen.getByText(/two people who've actually stood in the same room/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run app/__tests__/page.test.tsx`
Expected: FAIL — current `app/page.tsx` still renders the board, not the hero headline.

- [ ] **Step 3: Implement `FadeInStagger`**

Create `frontend/components/FadeInStagger.tsx`:
```typescript
"use client";
import { Children, useEffect, useState } from "react";

/** Fades and slides up each direct child in sequence on mount, ~150ms apart.
 *  The only animated-on-load moment on the site (spec: Animation system, moment 1). */
export default function FadeInStagger({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {Children.map(children, (child, i) => (
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: `opacity 400ms ease-out ${i * 150}ms, transform 400ms ease-out ${i * 150}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Implement the Home page**

Replace `frontend/app/page.tsx`:
```typescript
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";
import FadeInStagger from "@/components/FadeInStagger";

export default async function Page() {
  return (
    <>
      <MarketingNav active="home" />
      <main className="bg-[#F6F3EC]">
        <section className="px-6 py-16 text-center">
          <FadeInStagger>
            <h1 className="mx-auto max-w-md font-display text-3xl font-bold text-ink">
              Networking used to run on luck.{" "}
              <span className="text-accent">Now it doesn&apos;t.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-ink2">
              The one channel AI can&apos;t fake: say where you&apos;ll be, get spotted by the
              people worth meeting, leave with a connection that outlasts a LinkedIn add.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <WaitlistForm />
              <Link href="/how-it-works" className="btn-press rounded-full border border-rule px-4 py-2 font-display text-sm font-semibold text-ink">
                See how it works
              </Link>
            </div>
            <div className="mt-10 flex justify-center gap-3">
              <div className="w-28 rotate-[-2deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)]">
                <p className="font-display text-[10px] font-bold text-ink">Priya S.</p>
                <p className="text-[9px] text-ink2">Coffee · Palo Alto</p>
              </div>
              <div className="mt-2 w-28 rotate-[1.5deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)]">
                <p className="font-display text-[10px] font-bold text-ink">Dev K.</p>
                <p className="text-[9px] text-ink2">→ Sunnyvale</p>
              </div>
              <div className="w-28 rotate-[-1deg] rounded-card bg-card p-2 shadow-[2px_5px_10px_rgba(0,0,0,0.14)]">
                <p className="font-display text-[10px] font-bold text-ink">Marcus T.</p>
                <p className="text-[9px] text-ink2">met · yesterday</p>
              </div>
            </div>
          </FadeInStagger>
        </section>

        <section className="bg-card px-6 py-14">
          <h2 className="text-center font-display text-lg font-bold text-ink">
            Three steps, no luck required
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-center text-xs text-ink2">
            From posting a plan to leaving with a real connection
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-4">
            {[
              { n: 1, t: "Post where you'll be", d: "A coffee chat, a meetup, a ride share — free text, snapped to neighborhood precision" },
              { n: 2, t: "Get spotted before you arrive", d: "Anyone nearby with a live plan shows up on the board — map or list" },
              { n: 3, t: "Leave with a stamp, not just an add", d: "Both sides confirm \"we met\" in chat — timestamped, undeletable proof" },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-accent font-mono text-xs font-bold text-accent">
                  {step.n}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-ink">{step.t}</p>
                  <p className="text-xs text-ink2">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-board px-6 py-14 text-center [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:7px_7px]">
          <p className="mx-auto max-w-sm font-hand text-xl text-card">
            &quot;Every recruiter&apos;s inbox is flooded with AI cover letters. The one signal that
            still can&apos;t be faked is two people who&apos;ve actually stood in the same room.&quot;
          </p>
          <p className="mt-2 font-mono text-[10px] text-rule">
            — THE THESIS, <Link href="/about" className="underline">SEE ABOUT US</Link>
          </p>
        </section>

        <section className="bg-ink px-6 py-14 text-center">
          <h2 className="font-display text-lg font-bold text-card">Stop leaving it to luck</h2>
          <p className="mt-1 text-xs text-[#B8AF9E]">Free, public, any city</p>
          <div className="mt-4 flex justify-center">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd frontend && npx vitest run app/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/app/page.tsx frontend/components/FadeInStagger.tsx frontend/app/__tests__/page.test.tsx
git commit -m "feat: build the marketing home page with hero entrance animation"
```

---

### Task 5: How it works page (`/how-it-works`)

**Files:**
- Create: `frontend/app/how-it-works/page.tsx`
- Create: `frontend/app/how-it-works/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `MarketingNav` (Task 3), `WaitlistForm` (existing)
- Produces: nothing new consumed elsewhere

- [ ] **Step 1: Write the failing test**

Create `frontend/app/how-it-works/__tests__/page.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HowItWorksPage from "../page";

describe("How it works page", () => {
  it("renders all three steps with their titles", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/post where you'll be/i)).toBeInTheDocument();
    expect(screen.getByText(/get spotted before you arrive/i)).toBeInTheDocument();
    expect(screen.getByText(/leave with a stamp, not just an add/i)).toBeInTheDocument();
  });

  it("shows the stamp badge illustration on step 3", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/met in person/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run app/how-it-works/__tests__/page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Implement the page**

Create `frontend/app/how-it-works/page.tsx`:
```typescript
import MarketingNav from "@/components/MarketingNav";
import WaitlistForm from "@/components/WaitlistForm";

const STEPS = [
  {
    n: 1, title: "Post where you'll be",
    desc: "Type it like a text to a friend. Optional quick-tag chips (Need a ride, Coffee chat) get you started faster. Pinned to the board instantly, live for as long as you set.",
  },
  {
    n: 2, title: "Get spotted before you arrive",
    desc: "Anyone nearby sees your card on the board — list or map. Public replies let a whole group self-organize under one post, not three separate DMs you have to broker.",
  },
  {
    n: 3, title: "Leave with a stamp, not just an add",
    desc: "Either side taps \"we met\" once you actually connect. Timestamped, mutual, undeletable — the one piece of proof this wasn't another cold LinkedIn request.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav active="how-it-works" />
      <main className="bg-[#F6F3EC]">
        <section className="px-6 py-12 text-center">
          <h1 className="mx-auto max-w-sm font-display text-2xl font-bold text-ink">
            Three moments, not a whole new app to learn
          </h1>
        </section>

        {STEPS.map((step, i) => (
          <div
            key={step.n}
            className={`flex flex-col items-center gap-5 border-t border-dashed border-rule px-6 py-8 md:flex-row ${i % 2 === 1 ? "md:flex-row-reverse bg-[#F6F3EC]" : "bg-card"}`}
          >
            <div className="flex h-32 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-board [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:5px_5px]">
              {step.n === 3 ? (
                <span className="btn-press inline-flex items-center gap-1 rounded-full border border-stamp bg-stamp/10 px-2 py-1 font-mono text-[8px] text-stamp [animation:stampPress_600ms_ease-out]">
                  ● MET IN PERSON
                </span>
              ) : (
                <div className="w-16 rotate-[-1.5deg] rounded-card bg-card p-1.5 shadow-[1px_3px_6px_rgba(0,0,0,0.28)]">
                  <p className="font-display text-[9px] font-bold text-ink">Priya S.</p>
                </div>
              )}
            </div>
            <div className="max-w-xs text-center md:text-left">
              <p className="font-mono text-[10px] font-bold text-accent">STEP {step.n}</p>
              <p className="font-display text-sm font-bold text-ink">{step.title}</p>
              <p className="mt-1 text-xs text-ink2">{step.desc}</p>
            </div>
          </div>
        ))}

        <section className="bg-ink px-6 py-14 text-center">
          <h2 className="font-display text-lg font-bold text-card">Try it at your next coffee chat</h2>
          <div className="mt-4 flex justify-center">
            <WaitlistForm />
          </div>
        </section>
      </main>
    </>
  );
}
```

Add the (non-looping, per the audit) stamp-press keyframe to `frontend/app/globals.css`:
```css
@keyframes stampPress {
  0% { transform: rotate(-3deg) scale(0.6); opacity: 0; }
  100% { transform: rotate(-3deg) scale(1); opacity: 1; }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run app/how-it-works/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/app/how-it-works frontend/app/globals.css
git commit -m "feat: build the How it works page with the reused stamp-press moment"
```

---

### Task 6: About page (`/about`)

**Files:**
- Create: `frontend/app/about/page.tsx`
- Create: `frontend/app/about/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `MarketingNav` (Task 3)
- Produces: nothing new consumed elsewhere

- [ ] **Step 1: Write the failing test**

Create `frontend/app/about/__tests__/page.test.tsx`:
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AboutPage from "../page";

describe("About page", () => {
  it("renders the thesis headline and body", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /a cover letter used to cost something/i })).toBeInTheDocument();
    expect(screen.getByText(/the one signal ai still can't fake/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run app/about/__tests__/page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Implement the page**

Create `frontend/app/about/page.tsx`:
```typescript
import MarketingNav from "@/components/MarketingNav";

export default function AboutPage() {
  return (
    <>
      <MarketingNav active="about" />
      <main className="bg-[#F6F3EC] px-6 py-14">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-bold text-ink">
            A cover letter used to cost something.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438]">
            AI erased that cost — now every inbox is flooded with volume that proves nothing
            about the person behind it. <strong className="text-accent">The one signal AI
            still can&apos;t fake is two people who&apos;ve actually stood in the same room.</strong>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#4A4438]">
            That&apos;s not a nice-to-have anymore. It&apos;s the scarce channel, precisely because
            everything else got cheap. StayConnected exists to make that channel less
            accidental — say where you&apos;ll be, get spotted by the people worth meeting,
            leave with something that survives past a LinkedIn add that quietly stops replying.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-lg border-t border-dashed border-rule pt-8 text-center">
          <p className="font-hand text-xl text-ink">
            &quot;Networking runs on luck — who you happen to sit next to, who&apos;s still around
            when the doors open. This is the app for when none of that is luck anymore.&quot;
          </p>
          <p className="mt-2 font-mono text-[10px] text-ink2">— THE FOUNDING IDEA</p>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run app/about/__tests__/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/app/about
git commit -m "feat: build the About page"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, all files.

- [ ] **Step 2: Run the TypeScript build check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual browser pass**

With the dev server running, visit `/`, `/how-it-works`, `/about`, and `/today`:
1. Confirm no eyebrow text appears anywhere
2. Confirm the hero fades in on `/` on load
3. Confirm the stamp badge appears (once, not looping) on `/how-it-works` step 3
4. Tab through each page keyboard-only — confirm a visible focus ring at every stop, including the mobile hamburger toggle
5. Resize below 768px — confirm the nav collapses to the hamburger drawer and the hero/step rows stack to one column
6. Click "Join the waitlist" from Home, How it works, and the board — confirm all three work (they share the same `WaitlistForm` component, already tested)

Report any failures found rather than fixing silently — a failure here may mean an earlier task needs a follow-up fix.

- [ ] **Step 4: Screenshot each page and review them directly**

Use Playwright (as done earlier in this session) to screenshot `/`, `/how-it-works`, `/about`, `/today` at both desktop and mobile (375px) widths, then actually look at the images per `superpowers:verification-before-completion` — don't just trust that the code compiles.
