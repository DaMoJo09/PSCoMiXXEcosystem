import { test, expect } from "@playwright/test";
import { registerUser, createProject } from "./helpers";

test.describe("Save Project", () => {
  const user = {
    name: "Save Tester",
    email: `save-${Date.now()}@example.com`,
    password: "SaveTest123!",
    dob: "2000-04-04",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `save-${Date.now()}@example.com`;
  });

  test("save button is visible and clickable in comic creator", async ({ page }) => {
    await createProject(page, "comic", "Save Button Test");

    const saveBtn = page.getByTestId("button-save");
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
  });

  test("clicking save persists the project", async ({ page }) => {
    await createProject(page, "comic", "Save Persist Test");

    await page.getByTestId("button-save").click();

    await page.waitForTimeout(2000);

    await page.getByTestId("button-back").click();
    await page.waitForURL(/\/$/, { timeout: 5000 });

    const projectCards = page.locator('[data-testid^="card-project-"]');
    await expect(projectCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("saved project retains title on reload", async ({ page }) => {
    await createProject(page, "comic", "Retention Test Comic");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    await page.goto(currentUrl);
    await page.waitForLoadState("networkidle");

    const titleInput = page.getByTestId("input-title");
    await expect(titleInput).toHaveValue("Retention Test Comic", { timeout: 5000 });
  });

  test("keyboard shortcut Ctrl+S triggers save", async ({ page }) => {
    await createProject(page, "comic", "Keyboard Save Test");

    await page.keyboard.press("Control+s");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    await page.goto(currentUrl);
    await page.waitForLoadState("networkidle");

    const titleInput = page.getByTestId("input-title");
    await expect(titleInput).toHaveValue("Keyboard Save Test", { timeout: 5000 });
  });

  test("save does not trigger WhatsNext modal", async ({ page }) => {
    await createProject(page, "comic", "No Modal Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(2000);

    const whatsNext = page.getByTestId("whats-next-overlay");
    await expect(whatsNext).not.toBeVisible();
  });

  test("project appears in dashboard after save", async ({ page }) => {
    const title = `Dashboard Save ${Date.now()}`;
    await createProject(page, "comic", title);

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(2000);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const projectCards = page.locator('[data-testid^="card-project-"]');
    await expect(projectCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("multiple saves do not create duplicate projects", async ({ page }) => {
    await createProject(page, "comic", "Duplicate Check");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1000);
    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1000);
    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1000);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const matchingCards = page.locator('[data-testid^="text-project-title-"]', {
      hasText: "Duplicate Check",
    });
    const count = await matchingCards.count();
    expect(count).toBe(1);
  });
});
