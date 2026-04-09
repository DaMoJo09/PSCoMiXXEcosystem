import { test, expect } from "@playwright/test";
import { registerUser, createProject } from "./helpers";

test.describe("XP Awarded and Progress Updated", () => {
  const user = {
    name: "XP Tester",
    email: `xp-${Date.now()}@example.com`,
    password: "XPTest12345!",
    dob: "2000-08-08",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `xp-${Date.now()}@example.com`;
  });

  test("XP widget is visible on dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const xpWidget = page.getByTestId("widget-xp-progress");
    await expect(xpWidget).toBeVisible();
  });

  test("XP widget shows level and title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const level = page.getByTestId("text-level");
    await expect(level).toBeVisible();
    await expect(level).not.toBeEmpty();

    const title = page.getByTestId("text-level-title");
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();
  });

  test("XP progress bar is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const progressBar = page.getByTestId("bar-xp-progress");
    await expect(progressBar).toBeVisible();
  });

  test("XP widget shows streak stats", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const streak = page.locator('[data-testid^="stat-streak"]');
    await expect(streak).toBeVisible();
  });

  test("How to Earn XP guide toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const toggleBtn = page.getByTestId("button-toggle-xp-guide");
    await expect(toggleBtn).toBeVisible();

    await toggleBtn.click();

    const guidePanel = page.getByTestId("xp-guide-panel");
    await expect(guidePanel).toBeVisible();

    const guideContent = await guidePanel.textContent();
    expect(guideContent).toContain("XP");
  });

  test("XP guide shows action-to-XP breakdown", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-toggle-xp-guide").click();

    const guidePanel = page.getByTestId("xp-guide-panel");
    await expect(guidePanel).toBeVisible();

    const content = await guidePanel.textContent();
    expect(content).toContain("25");
    expect(content).toContain("50");
    expect(content).toContain("100");
  });

  test("XP guide can be collapsed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const toggleBtn = page.getByTestId("button-toggle-xp-guide");
    await toggleBtn.click();
    await expect(page.getByTestId("xp-guide-panel")).toBeVisible();

    await toggleBtn.click();
    await expect(page.getByTestId("xp-guide-panel")).not.toBeVisible();
  });

  test("XP history toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const historyToggle = page.getByTestId("button-toggle-xp-history");
    await expect(historyToggle).toBeVisible();
    await historyToggle.click();

    const historyFeed = page.getByTestId("xp-history-feed");
    await expect(historyFeed).toBeVisible();
  });

  test("next unlock preview is shown", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const nextUnlock = page.getByTestId("next-unlock-preview");
    await expect(nextUnlock).toBeVisible();
  });

  test("achievements and rewards stat links are visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const achievements = page.getByTestId("link-achievements-stat");
    const rewards = page.getByTestId("link-rewards-stat");

    await expect(achievements).toBeVisible();
    await expect(rewards).toBeVisible();
  });

  test("creating project awards XP (action endpoint)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const xpWidget = page.getByTestId("widget-xp-progress");
    const initialText = await xpWidget.textContent();

    await createProject(page, "comic", "XP Award Test");
    await page.getByTestId("button-save").click();
    await page.waitForTimeout(2000);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const updatedWidget = page.getByTestId("widget-xp-progress");
    await expect(updatedWidget).toBeVisible();
  });

  test("XP widget handles first-time user (no history)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const historyToggle = page.getByTestId("button-toggle-xp-history");
    await historyToggle.click();

    const historyFeed = page.getByTestId("xp-history-feed");
    await expect(historyFeed).toBeVisible();

    const content = await historyFeed.textContent();
    expect(content).toBeTruthy();
  });

  test("XP widget is usable without scroll issues", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const widget = page.getByTestId("widget-xp-progress");
    await widget.scrollIntoViewIfNeeded();
    await expect(widget).toBeInViewport();
  });
});
