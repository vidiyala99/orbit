import { test, expect } from "@playwright/test";

async function demoLogin(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /try it out/i }).click();
  await page.waitForURL(/\/(home|onboarding)/);
  if (page.url().includes("/onboarding")) {
    const skip = page.getByRole("button", { name: /skip|continue|save/i }).first();
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.goto("/home");
  }
}

/** Smoke: demo-login → /home — stage layout (Event strip + Focus + filmstrip). */
test("home desktop stage: event strip above match, filmstrip below", async ({ page }) => {
  await demoLogin(page);

  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Events" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Attendees" })).toHaveCount(0);

  const event = page.getByRole("heading", { level: 1 }).first();
  const keep = page.getByRole("button", { name: /^keep$/i });
  const queue = page.getByRole("region", { name: /queue/i });
  await expect(event).toBeVisible();
  await expect(keep).toBeVisible();
  await expect(queue).toBeVisible();

  const eventBox = await event.boundingBox();
  const keepBox = await keep.boundingBox();
  const stripBox = await queue.boundingBox();
  expect(eventBox && keepBox && stripBox).toBeTruthy();
  if (!eventBox || !keepBox || !stripBox) return;

  expect(eventBox.y).toBeLessThan(keepBox.y);
  expect(stripBox.y).toBeGreaterThan(keepBox.y);
});

test("Events → guests has ← Events back, rank filters, and returns to rooms", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demoLogin(page);

  await page.getByRole("tab", { name: "Events" }).click();
  await page.waitForURL(/\/events\/?$/);
  await expect(page.getByRole("heading", { name: /^events$/i })).toBeVisible();

  const room = page.locator('main a[href^="/events/"]').first();
  await expect(room).toBeVisible();
  await room.click();
  await page.waitForURL(/\/events\/.+/);

  await expect(page.getByRole("link", { name: /← events/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^best/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /everyone/i })).toBeVisible();
  await expect(page.getByText(/focus shortlist|strongest matches/i)).toBeVisible();

  await page.getByRole("button", { name: /everyone/i }).click();
  await expect(page.getByPlaceholder(/search name/i)).toBeVisible();
  await expect(page.getByRole("navigation", { name: /guest pages/i })).toBeVisible();

  await page.getByRole("link", { name: /← events/i }).click();
  await page.waitForURL(/\/events\/?$/);
  await expect(page.getByRole("heading", { name: /^events$/i })).toBeVisible();
});

test("Inbox is a kept list without inline draft overload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demoLogin(page);

  await page.getByRole("tab", { name: "Inbox" }).click();
  await page.waitForURL(/\/inbox/);
  await expect(page.getByRole("heading", { name: /^inbox$/i })).toBeVisible();
  await expect(page.getByText(/sample email/i)).toHaveCount(0);
  await expect(page.getByText(/sample dm/i)).toHaveCount(0);

  const person = page.locator('main a[href^="/people/"]').first();
  if ((await person.count()) === 0) return;
  await person.click();
  await page.waitForURL(/\/people\/.+/);
  await expect(page.getByRole("link", { name: /back to inbox/i })).toBeVisible();
});

test("Focus LinkedIn chip is reachable above browse zones on phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demoLogin(page);

  const linkedin = page.getByRole("link", { name: /on linkedin/i }).first();
  if ((await linkedin.count()) === 0) return;

  await expect(linkedin).toBeVisible();
  const box = await linkedin.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  expect(box.height).toBeGreaterThanOrEqual(40);

  const topAtCenter = await page.evaluate(() => {
    const link = document.querySelector('a[aria-label*="on LinkedIn"]') as HTMLElement | null;
    if (!link) return null;
    const r = link.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el?.closest("a")?.getAttribute("aria-label") ?? el?.tagName ?? null;
  });
  expect(topAtCenter).toMatch(/on LinkedIn/i);
});
