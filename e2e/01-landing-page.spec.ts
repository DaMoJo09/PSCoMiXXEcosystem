import { test, expect } from "@playwright/test";

test.describe("Landing Page → Start Creating", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/landing");
  });

  test("hero section shows outcome-focused messaging and CTA", async ({ page }) => {
    const hero = page.getByTestId("section-hero");
    await expect(hero).toBeVisible();

    const tagline = page.getByTestId("text-tagline");
    await expect(tagline).toBeVisible();
    await expect(tagline).not.toBeEmpty();

    const subtitle = page.getByTestId("text-subtitle");
    await expect(subtitle).toBeVisible();

    const startBtn = page.getByTestId("button-start-creating");
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test("Start Creating button navigates to signup", async ({ page }) => {
    await page.getByTestId("button-start-creating").click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("login button navigates to auth page", async ({ page }) => {
    await page.getByTestId("button-login").click();
    await expect(page).toHaveURL(/\/login|\/auth/);
  });

  test("output showcase section displays all content types", async ({ page }) => {
    const showcase = page.getByTestId("section-output-showcase");
    await expect(showcase).toBeVisible();

    const outputCards = page.locator('[data-testid^="output-card-"]');
    const count = await outputCards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("output showcase CTA leads to signup", async ({ page }) => {
    const outputCta = page.getByTestId("button-output-cta");
    await expect(outputCta).toBeVisible();
    await expect(outputCta).toBeEnabled();
    await outputCta.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("tools section shows available creator tools", async ({ page }) => {
    const toolsSection = page.getByTestId("section-tools");
    await expect(toolsSection).toBeVisible();

    const toolCards = page.locator('[data-testid^="tool-card-"]');
    const count = await toolCards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("trust bar section is visible with trust signals", async ({ page }) => {
    const trustBar = page.getByTestId("section-trust-bar");
    await expect(trustBar).toBeVisible();

    const signals = page.locator('[data-testid^="trust-signal-"]');
    const count = await signals.count();
    expect(count).toBeGreaterThan(0);
  });

  test("pricing preview section shows tiers", async ({ page }) => {
    const pricingSection = page.getByTestId("section-pricing-preview");
    await expect(pricingSection).toBeVisible();

    const freeTier = page.getByTestId("pricing-tier-free");
    await expect(freeTier).toBeVisible();
  });

  test("final CTA section has working buttons", async ({ page }) => {
    const ctaSection = page.getByTestId("section-final-cta");
    await expect(ctaSection).toBeVisible();

    const createBtn = page.getByTestId("button-final-cta-create");
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
  });

  test("footer is visible with navigation links", async ({ page }) => {
    const footer = page.getByTestId("footer");
    await expect(footer).toBeVisible();
  });

  test("no dead-end: every section has a next action", async ({ page }) => {
    const sections = [
      "section-hero",
      "section-output-showcase",
      "section-tools",
      "section-pricing-preview",
      "section-final-cta",
    ];

    for (const section of sections) {
      const sectionEl = page.getByTestId(section);
      await expect(sectionEl).toBeVisible();

      const buttons = sectionEl.locator("button, a[href]");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("page is scrollable and all sections reachable", async ({ page }) => {
    const sections = [
      "section-hero",
      "section-output-showcase",
      "section-tools",
      "section-final-cta",
      "footer",
    ];

    for (const section of sections) {
      const el = page.getByTestId(section);
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeInViewport();
    }
  });
});
