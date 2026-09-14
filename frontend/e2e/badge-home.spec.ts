import { expect, test, type Page } from "@playwright/test";

/** Interaction tests for the redesigned Home, against the synthetic dev fixture. */
const FIXTURE = "/dev/badge-hero";

function counter(page: Page) {
  return page.locator(".bw-counter-box");
}

/** Screen-reader status: "Name, n of N[, kept|skipped]". */
function status(page: Page) {
  return page.locator(".bw-status");
}

/** The badge on screen, not one still animating out. */
function present(page: Page) {
  return page.locator('.bw-deck-item[data-present="true"]');
}

function card(page: Page, name = /Maya Okafor/) {
  return page.getByRole("group", { name });
}

async function press(page: Page, key: string, times: number) {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

async function firstNameFits(page: Page) {
  return page
    .locator('.bw-deck-item[data-present="true"] .bw-front .bw-first-name')
    .evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= el.closest(".bw-front")!.getBoundingClientRect().right);
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.getByRole("heading", { level: 1, name: "AI Security Hackathon" })).toBeVisible();
  });

  test("opens on the third person with nothing between the header and the badge", async ({ page }) => {
    await expect(status(page)).toHaveText(/^Maya Okafor, 3 of 12$/);
    await expect(page.getByRole("navigation", { name: "Review queue" })).toHaveCount(0);
    const header = await page.locator(".bw-header").boundingBox();
    const stage = await page.locator(".bw-card-stage").boundingBox();
    expect(header && stage).toBeTruthy();
    if (header && stage) expect(stage.y - (header.y + header.height)).toBeLessThan(24);
  });

  test("the front shows work, signals, how to approach and why, with no source tags", async ({ page }) => {
    const front = present(page).locator(".bw-front");
    await expect(front.locator(".bw-chip-company")).toHaveText(/Northwind Labs/);
    await expect(front.getByText("Potentially hiring")).toBeVisible();
    await expect(front.getByText("How to approach")).toBeVisible();
    await expect(front.getByText("Three security roles are open.", { exact: false })).toBeVisible();
    await expect(front.locator(".bw-front-why-text")).toBeHidden();
    await expect(page.getByText("Luma bio")).toHaveCount(0);
    await expect(page.getByText("Company site")).toHaveCount(0);
  });

  test("Keep is visible above the tab bar without scrolling", async ({ page }) => {
    const keep = await page.getByRole("button", { name: /^keep$/i }).boundingBox();
    const tabs = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
    expect(keep && tabs).toBeTruthy();
    if (keep && tabs) expect(keep.y + keep.height).toBeLessThanOrEqual(tabs.y + 1);
  });

  test("tapping the badge flips to Recent, Background and company, and back", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
    await card(page).click({ position: { x: 60, y: 140 } });
    await expect(present(page).locator(".bw-back").getByRole("heading", { name: "Why meet" })).toBeVisible();
    await expect(present(page).locator(".bw-back").getByText("Hiring security engineers.", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Background" })).toBeVisible();
    await expect(present(page).locator(".bw-back").getByText("Series A, team of about 40")).toBeVisible();
    await expect(page.getByRole("link", { name: "Full profile" })).toHaveCount(0);
    await card(page).click({ position: { x: 60, y: 140 } });
    await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
  });

  test("LinkedIn and X appear once, in the dock, on both sides of the badge", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Maya Okafor on LinkedIn" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Maya Okafor on X" })).toHaveCount(1);
    await card(page).click({ position: { x: 60, y: 140 } });
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maya Okafor on LinkedIn" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Maya Okafor on X" })).toHaveCount(1);
    await expect(page.locator(".bw-back-footer")).toBeHidden();
  });

  test("a horizontal swipe browses without deciding", async ({ page }) => {
    const box = await card(page).boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 40, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, y, { steps: 6 });
    await page.mouse.up();
    await expect(status(page)).toHaveText(/^Dev Patel, 4 of 12$/);
    await page.keyboard.press("ArrowLeft");
    await expect(status(page)).toHaveText(/^Maya Okafor, 3 of 12$/);
  });

  test("a drag released on a badge already leaving after Keep does not browse again", async ({ page }) => {
    const box = await card(page).boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 40, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 180, y, { steps: 6 });
    // Keep while the finger is still down: Maya starts her exit animation.
    await page.evaluate(() => document.querySelector<HTMLButtonElement>(".bw-keep")?.click());
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expect(status(page)).toHaveText(/^Dev Patel, 4 of 12$/);
  });

  test("the toast never covers Skip or Keep: tapping Keep twice decides two people", async ({ page }) => {
    const keep = page.getByRole("button", { name: /^keep$/i });
    await keep.click();
    await expect(page.getByText("Kept Maya. Added to Inbox.")).toBeVisible();
    const toast = await page.locator(".bw-toast").boundingBox();
    const actions = await page.locator(".bw-actions").boundingBox();
    const socials = await page.locator(".bw-dock").boundingBox();
    expect(toast && actions && socials).toBeTruthy();
    if (toast && socials) expect(toast.y + toast.height).toBeLessThanOrEqual(socials.y);
    await keep.click({ timeout: 2000 });
    await expect(page.getByText("Kept Dev. Added to Inbox.")).toBeVisible();
    await expect(status(page)).toHaveText(/, 5 of 12$/);
  });

  test("Keep advances, browsing back shows it pressed, and Undo restores it", async ({ page }) => {
    await page.getByRole("button", { name: /^keep$/i }).click();
    await expect(status(page)).toHaveText(/^Dev Patel, 4 of 12$/);
    await expect(page.getByText("Kept Maya. Added to Inbox.")).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(status(page)).toHaveText(/^Maya Okafor, 3 of 12, kept$/);
    await expect(page.getByRole("button", { name: /^keep$/i })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(status(page)).toHaveText(/^Maya Okafor, 3 of 12$/);
    await expect(page.getByRole("button", { name: /^keep$/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("keyboard: K keeps, S skips, arrows browse", async ({ page }) => {
    await page.keyboard.press("k");
    await expect(status(page)).toHaveText(/^Dev Patel, 4 of 12$/);
    await page.keyboard.press("s");
    await expect(status(page)).toHaveText(/, 5 of 12$/);
    await page.keyboard.press("ArrowLeft");
    await expect(status(page)).toHaveText(/^Dev Patel, 4 of 12, skipped$/);
    await expect(page.getByRole("button", { name: /^skip$/i })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(status(page)).toHaveText(/^Maya Okafor, 3 of 12, kept$/);
  });

  test("no counter or arrows on phones: swipe does the browsing", async ({ page }) => {
    await expect(page.locator(".bw-counter")).toBeHidden();
    await expect(page.getByRole("button", { name: "Next person" })).toHaveCount(0);
  });

  test("the queue never hits a wall: first wraps to last and back", async ({ page }) => {
    await press(page, "ArrowLeft", 3);
    await expect(status(page)).toHaveText(/^Elena Garcia, 12 of 12$/);
    await page.keyboard.press("ArrowRight");
    await expect(status(page)).toHaveText(/, 1 of 12/);
    await page.keyboard.press("ArrowLeft");
    await expect(status(page)).toHaveText(/^Elena Garcia, 12 of 12$/);
  });

  test("a long first name fits inside the badge", async ({ page }) => {
    await press(page, "ArrowRight", 3);
    await expect(card(page, /Maximiliana Brightwater/)).toBeVisible();
    expect(await firstNameFits(page)).toBe(true);
  });

  test("LinkedIn and X open the person's profiles in a new tab", async ({ page }) => {
    const linkedin = page.getByRole("link", { name: "Maya Okafor on LinkedIn" });
    await expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/maya-okafor-fixture/");
    await expect(linkedin).toHaveAttribute("target", "_blank");
    const box = await linkedin.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("link", { name: "Maya Okafor on X" })).toHaveAttribute("href", "https://x.com/maya_fixture");
  });

  test("no horizontal scroll", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("small phone", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test("Keep and LinkedIn sit fully above the tab bar", async ({ page }) => {
    await page.goto(FIXTURE);
    const tabs = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
    const keep = await page.getByRole("button", { name: /^keep$/i }).boundingBox();
    const linkedin = await page.getByRole("link", { name: "Maya Okafor on LinkedIn" }).boundingBox();
    expect(tabs && keep && linkedin).toBeTruthy();
    if (!tabs || !keep || !linkedin) return;
    expect(keep.y + keep.height).toBeLessThanOrEqual(tabs.y + 1);
    expect(linkedin.y + linkedin.height).toBeLessThanOrEqual(tabs.y + 1);
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("front and back are both visible without flipping", async ({ page }) => {
    await page.goto(FIXTURE);
    // Left card is identity only; the right card carries all the context.
    await expect(present(page).locator(".bw-front .bw-front-lead")).toBeHidden();
    const back = present(page).locator(".bw-back");
    await expect(back.getByRole("heading", { name: "How to approach" })).toBeVisible();
    await expect(back.getByText("Three security roles are open.", { exact: false })).toBeVisible();
    await expect(back.getByRole("heading", { name: "Why meet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
    await expect(back.getByRole("heading", { name: "Background" })).toBeVisible();
    await expect(back.getByRole("link", { name: "Maya Okafor on LinkedIn" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maya Okafor on LinkedIn" })).toHaveCount(1);
    await expect(present(page).locator(".bw-back").getByText("Series A, team of about 40")).toBeVisible();
    await expect(page.getByRole("link", { name: "Full profile" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Review queue" })).toHaveCount(0);
    await page.keyboard.press(" ");
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  });

  test("a long first name fits inside the badge", async ({ page }) => {
    await page.goto(FIXTURE);
    // The wide label is set after hydration, once the keyboard handler is attached.
    await expect(card(page)).toHaveAttribute("aria-label", /badge and details/);
    await press(page, "ArrowRight", 3);
    await expect(card(page, /Maximiliana Brightwater/)).toBeVisible();
    expect(await firstNameFits(page)).toBe(true);
  });

  test("counter and arrows browse and wrap around", async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(counter(page)).toHaveText(/3\s*of\s*12/);
    const previous = page.getByRole("button", { name: "Previous person" });
    for (let i = 0; i < 3; i++) await previous.click();
    await expect(counter(page)).toHaveText(/12\s*of\s*12/);
    await page.getByRole("button", { name: "Next person" }).click();
    await expect(counter(page)).toHaveText(/1\s*of\s*12/);
    await previous.click();
    await expect(counter(page)).toHaveText(/12\s*of\s*12/);
  });

  test("top navigation replaces the bottom tabs", async ({ page }) => {
    await page.goto(FIXTURE);
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    const box = await nav.boundingBox();
    expect(box && box.y < 120).toBeTruthy();
  });
});
