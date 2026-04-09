import { type Page, expect } from "@playwright/test";

export const TEST_USER = {
  name: "Test Creator",
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  dob: "2000-01-15",
};

export async function registerUser(page: Page, user = TEST_USER) {
  await page.goto("/auth");
  await page.getByTestId("tab-signup").click();
  await page.getByTestId("input-signup-name").fill(user.name);
  await page.getByTestId("input-signup-email").fill(user.email);
  await page.getByTestId("input-signup-dob").fill(user.dob);
  await page.getByTestId("input-signup-password").fill(user.password);
  await page.getByTestId("button-signup").click();
  await page.waitForURL(/\/$/, { timeout: 10000 });
}

export async function loginUser(page: Page, user = TEST_USER) {
  await page.goto("/auth");
  await page.getByTestId("tab-login").click();
  await page.getByTestId("input-login-email").fill(user.email);
  await page.getByTestId("input-login-password").fill(user.password);
  await page.getByTestId("button-login").click();
  await page.waitForURL(/\/$/, { timeout: 10000 });
}

export async function ensureLoggedIn(page: Page) {
  const response = await page.request.get("/api/auth/me");
  if (response.status() !== 200) {
    await registerUser(page);
  }
}

export async function createProject(page: Page, type = "comic", title = "Test Project") {
  await page.goto("/");
  await page.getByTestId("button-new-project").click();
  await page.getByTestId("input-project-title").fill(title);
  await page.getByTestId("select-project-type").selectOption(type);
  await page.getByTestId("button-create-project").click();
  await page.waitForURL(/\/creator\//, { timeout: 10000 });
}

export async function waitForToast(page: Page, text?: string) {
  const toast = page.locator('[role="status"], [data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });
  if (text) {
    await expect(toast).toContainText(text);
  }
}
