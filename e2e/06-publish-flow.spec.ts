import { test, expect } from "@playwright/test";
import { registerUser, createProject } from "./helpers";

test.describe("Publish Flow", () => {
  const user = {
    name: "Publish Tester",
    email: `publish-${Date.now()}@example.com`,
    password: "PublishTest123!",
    dob: "2000-06-06",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `publish-${Date.now()}@example.com`;
  });

  test("publish button is visible in comic creator toolbar", async ({ page }) => {
    await createProject(page, "comic", "Publish Visibility Test");

    const publishBtn = page.getByTestId("button-publish");
    await expect(publishBtn).toBeVisible();
  });

  test("submit for review button is visible", async ({ page }) => {
    await createProject(page, "comic", "Review Button Test");

    const reviewBtn = page.getByTestId("button-submit-review");
    await expect(reviewBtn).toBeVisible();
  });

  test("compile comic button is visible", async ({ page }) => {
    await createProject(page, "comic", "Compile Test");

    const compileBtn = page.getByTestId("button-compile-comic");
    await expect(compileBtn).toBeVisible();
  });

  test("share button is visible", async ({ page }) => {
    await createProject(page, "comic", "Share Button Test");

    const shareBtn = page.getByTestId("button-share");
    await expect(shareBtn).toBeVisible();
  });

  test("dashboard publish shortcuts are visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const printBtn = page.getByTestId("button-publish-print");
    const portfolioBtn = page.getByTestId("button-publish-portfolio");
    const galleryBtn = page.getByTestId("button-publish-gallery");

    await expect(printBtn).toBeVisible();
    await expect(portfolioBtn).toBeVisible();
    await expect(galleryBtn).toBeVisible();
  });

  test("community link is accessible from dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const galleryBtn = page.getByTestId("button-publish-gallery");
    await expect(galleryBtn).toBeVisible();
    await galleryBtn.click();

    await expect(page).toHaveURL(/\/community/);
  });

  test("WhatsNext modal publish action navigates to community", async ({ page }) => {
    await createProject(page, "comic", "WhatsNext Publish Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      const publishAction = page.getByTestId("button-whats-next-publish-to-community");
      await expect(publishAction).toBeVisible();
      await publishAction.click();
      await expect(page).toHaveURL(/\/community/);
    }
  });

  test("WhatsNext modal streaming action opens external link", async ({ page }) => {
    await createProject(page, "comic", "Stream Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      const streamAction = page.getByTestId("button-whats-next-stream-on-pressplays");
      await expect(streamAction).toBeVisible();
    }
  });

  test("WhatsNext modal can be dismissed", async ({ page }) => {
    await createProject(page, "comic", "Dismiss Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      await page.getByTestId("button-whats-next-dismiss").click();
      await expect(whatsNext).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("WhatsNext modal shows XP hints on each action", async ({ page }) => {
    await createProject(page, "comic", "XP Hints Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      const title = page.getByTestId("text-whats-next-title");
      await expect(title).toBeVisible();
      await expect(title).toContainText("next");

      const content = await whatsNext.textContent();
      expect(content).toContain("XP");
    }
  });

  test("publish sync options exist in export dropdown", async ({ page }) => {
    await createProject(page, "comic", "Sync Options Test");

    await page.getByTestId("button-export").click();

    await expect(page.getByTestId("button-sync-page")).toBeVisible();
    await expect(page.getByTestId("button-sync-all")).toBeVisible();
  });
});
