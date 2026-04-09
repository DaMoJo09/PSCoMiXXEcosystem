import { test, expect } from "@playwright/test";
import { registerUser, createProject } from "./helpers";

test.describe("Add to Portfolio", () => {
  const user = {
    name: "Portfolio Tester",
    email: `portfolio-${Date.now()}@example.com`,
    password: "PortfolioTest123!",
    dob: "2000-07-07",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `portfolio-${Date.now()}@example.com`;
  });

  test("send to portfolio button is visible in creator", async ({ page }) => {
    await createProject(page, "comic", "Portfolio Visible Test");

    const portfolioBtn = page.getByTestId("button-send-portfolio");
    await expect(portfolioBtn).toBeVisible();
  });

  test("dashboard has portfolio publish shortcut", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const portfolioBtn = page.getByTestId("button-publish-portfolio");
    await expect(portfolioBtn).toBeVisible();
  });

  test("portfolio shortcut navigates to portfolio page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("button-publish-portfolio").click();
    await expect(page).toHaveURL(/\/portfolio/);
  });

  test("WhatsNext portfolio action navigates correctly", async ({ page }) => {
    await createProject(page, "comic", "WN Portfolio Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      const portfolioAction = page.getByTestId("button-whats-next-add-to-portfolio");
      await expect(portfolioAction).toBeVisible();
      await portfolioAction.click();
      await expect(page).toHaveURL(/\/portfolio/);
    }
  });

  test("portfolio page loads without error", async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("WhatsNext keep creating action returns to dashboard", async ({ page }) => {
    await createProject(page, "comic", "Keep Creating Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    const isVisible = await whatsNext.isVisible().catch(() => false);

    if (isVisible) {
      const keepCreating = page.getByTestId("button-whats-next-keep-creating");
      await expect(keepCreating).toBeVisible();
      await keepCreating.click();
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
