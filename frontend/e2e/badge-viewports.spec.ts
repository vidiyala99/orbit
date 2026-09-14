import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";

/**
 * Screenshot matrix for design review (not an assertion suite).
 * Run: CAPTURE=1 pnpm exec playwright test e2e/badge-viewports.spec.ts
 * Real Home: CAPTURE=1 CAPTURE_URL=/home CAPTURE_LABEL=home pnpm exec playwright test e2e/badge-viewports.spec.ts
 */
const TARGET = process.env.CAPTURE_URL ?? "/dev/badge-hero";
const LABEL = process.env.CAPTURE_LABEL ?? "fixture";
const OUT_DIR = "../.impeccable/review/viewports";

const VIEWPORTS = [
  { name: "phone-small", width: 375, height: 667 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const SCHEMES = ["dark", "light"] as const;

test.skip(!process.env.CAPTURE, "Set CAPTURE=1 to write viewport screenshots.");

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test(`${LABEL} ${viewport.name} ${scheme}`, async ({ browser }) => {
      mkdirSync(OUT_DIR, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.width < 900 ? 2 : 1,
        colorScheme: scheme,
        reducedMotion: "reduce",
        hasTouch: viewport.width < 900,
      });
      const page = await context.newPage();
      await page.goto(TARGET, { waitUntil: "networkidle", timeout: 120_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${viewport.name}-${scheme}.png` });
      await context.close();
    });
  }
}
