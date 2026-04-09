import { test, expect } from "@playwright/test";

test.describe("New User Onboarding", () => {
  const uniqueUser = {
    name: "Onboard Tester",
    email: `onboard-${Date.now()}@example.com`,
    password: "OnboardTest123!",
    dob: "2002-06-20",
  };

  test("signup form validates required fields", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    await page.getByTestId("button-signup").click();

    await expect(page).toHaveURL(/\/auth/);
  });

  test("signup form shows password requirements", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    const passwordInput = page.getByTestId("input-signup-password");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("signup form shows age-based account type preview", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    await page.getByTestId("input-signup-dob").fill("2015-01-01");
    const accountType = page.getByTestId("text-account-type-preview");
    await expect(accountType).toBeVisible();
  });

  test("signup tab and login tab are both accessible", async ({ page }) => {
    await page.goto("/auth");

    const loginTab = page.getByTestId("tab-login");
    const signupTab = page.getByTestId("tab-signup");
    await expect(loginTab).toBeVisible();
    await expect(signupTab).toBeVisible();

    await signupTab.click();
    await expect(page.getByTestId("input-signup-name")).toBeVisible();

    await loginTab.click();
    await expect(page.getByTestId("input-login-email")).toBeVisible();
  });

  test("student account shows parental consent section", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    await page.getByTestId("input-signup-dob").fill("2015-03-15");

    const consent = page.getByTestId("section-parental-consent");
    await expect(consent).toBeVisible();
  });

  test("successful signup redirects to dashboard with onboarding", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    await page.getByTestId("input-signup-name").fill(uniqueUser.name);
    await page.getByTestId("input-signup-email").fill(uniqueUser.email);
    await page.getByTestId("input-signup-dob").fill(uniqueUser.dob);
    await page.getByTestId("input-signup-password").fill(uniqueUser.password);
    await page.getByTestId("button-signup").click();

    await page.waitForURL(/\/$/, { timeout: 10000 });
    const onboarding = page.getByTestId("onboarding-overlay");
    await expect(onboarding).toBeVisible({ timeout: 5000 });
  });

  test("onboarding wizard shows mode selection with output labels", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    const ts = Date.now();
    await page.getByTestId("input-signup-name").fill("Mode Tester");
    await page.getByTestId("input-signup-email").fill(`mode-${ts}@example.com`);
    await page.getByTestId("input-signup-dob").fill("2001-01-01");
    await page.getByTestId("input-signup-password").fill("ModeTest123!");
    await page.getByTestId("button-signup").click();

    await page.waitForURL(/\/$/, { timeout: 10000 });
    const onboarding = page.getByTestId("onboarding-overlay");
    await expect(onboarding).toBeVisible({ timeout: 5000 });

    const question = page.getByTestId("text-onboarding-question");
    await expect(question).toBeVisible();

    const modeButtons = page.locator('[data-testid^="button-mode-"]');
    const count = await modeButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("onboarding skip button allows bypassing", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    const ts = Date.now();
    await page.getByTestId("input-signup-name").fill("Skip Tester");
    await page.getByTestId("input-signup-email").fill(`skip-${ts}@example.com`);
    await page.getByTestId("input-signup-dob").fill("2001-02-02");
    await page.getByTestId("input-signup-password").fill("SkipTest123!");
    await page.getByTestId("button-signup").click();

    await page.waitForURL(/\/$/, { timeout: 10000 });
    const overlay = page.getByTestId("onboarding-overlay");
    await expect(overlay).toBeVisible({ timeout: 5000 });

    await page.getByTestId("button-onboarding-skip").click();
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test("onboarding selection enables Go button and shows progress", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    const ts = Date.now();
    await page.getByTestId("input-signup-name").fill("Go Tester");
    await page.getByTestId("input-signup-email").fill(`go-${ts}@example.com`);
    await page.getByTestId("input-signup-dob").fill("2000-05-05");
    await page.getByTestId("input-signup-password").fill("GoTest1234!");
    await page.getByTestId("button-signup").click();

    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.getByTestId("onboarding-overlay").waitFor({ state: "visible", timeout: 5000 });

    await page.locator('[data-testid^="button-mode-"]').first().click();

    const goButton = page.getByTestId("button-onboarding-go");
    await expect(goButton).toBeVisible();
    await expect(goButton).toBeEnabled();

    const progressSteps = page.locator('[data-testid^="progress-step-"]');
    const stepCount = await progressSteps.count();
    expect(stepCount).toBeGreaterThanOrEqual(2);
  });

  test("completing onboarding shows celebration with XP", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("tab-signup").click();

    const ts = Date.now();
    await page.getByTestId("input-signup-name").fill("Celebration Tester");
    await page.getByTestId("input-signup-email").fill(`celeb-${ts}@example.com`);
    await page.getByTestId("input-signup-dob").fill("1999-12-12");
    await page.getByTestId("input-signup-password").fill("CelebTest123!");
    await page.getByTestId("button-signup").click();

    await page.waitForURL(/\/$/, { timeout: 10000 });
    await page.getByTestId("onboarding-overlay").waitFor({ state: "visible", timeout: 5000 });

    await page.locator('[data-testid^="button-mode-"]').first().click();
    await page.getByTestId("button-onboarding-go").click();

    const celebration = page.getByTestId("text-onboarding-celebration");
    await expect(celebration).toBeVisible({ timeout: 15000 });

    const xpEarned = page.getByTestId("text-xp-earned");
    await expect(xpEarned).toBeVisible();
    await expect(xpEarned).toContainText("XP");
  });
});
