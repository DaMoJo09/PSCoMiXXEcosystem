import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers";

test.describe("Create First Comic from Template", () => {
  const user = {
    name: "Comic Tester",
    email: `comic-${Date.now()}@example.com`,
    password: "ComicTest123!",
    dob: "2000-03-03",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `comic-${Date.now()}@example.com`;
  });

  test("dashboard shows quickstart templates for first-time user", async ({ page }) => {
    const quickstart = page.getByTestId("empty-state-quickstart");
    if (await quickstart.isVisible()) {
      const templateButtons = page.locator('[data-testid^="button-template-"]');
      const count = await templateButtons.count();
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test("new project button opens creation form", async ({ page }) => {
    const newBtn = page.getByTestId("button-new-project");
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    const titleInput = page.getByTestId("input-project-title");
    await expect(titleInput).toBeVisible();

    const typeSelect = page.getByTestId("select-project-type");
    await expect(typeSelect).toBeVisible();

    const createBtn = page.getByTestId("button-create-project");
    await expect(createBtn).toBeVisible();
  });

  test("creating a comic project navigates to comic creator", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await page.getByTestId("input-project-title").fill("My First Comic");
    await page.getByTestId("select-project-type").selectOption("comic");
    await page.getByTestId("button-create-project").click();

    await page.waitForURL(/\/creator\/comic/, { timeout: 10000 });

    const titleInput = page.getByTestId("input-title");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("My First Comic");
  });

  test("comic creator has essential toolbar buttons visible", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await page.getByTestId("input-project-title").fill("Toolbar Test");
    await page.getByTestId("select-project-type").selectOption("comic");
    await page.getByTestId("button-create-project").click();

    await page.waitForURL(/\/creator\/comic/, { timeout: 10000 });

    await expect(page.getByTestId("button-undo")).toBeVisible();
    await expect(page.getByTestId("button-redo")).toBeVisible();
    await expect(page.getByTestId("button-save")).toBeVisible();
    await expect(page.getByTestId("button-export")).toBeVisible();
    await expect(page.getByTestId("button-preview")).toBeVisible();
  });

  test("comic creator has drawing tools available", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await page.getByTestId("input-project-title").fill("Tools Test");
    await page.getByTestId("select-project-type").selectOption("comic");
    await page.getByTestId("button-create-project").click();

    await page.waitForURL(/\/creator\/comic/, { timeout: 10000 });

    const tools = page.locator('[data-testid^="tool-"]');
    const count = await tools.count();
    expect(count).toBeGreaterThan(0);
  });

  test("quick template buttons create a project directly", async ({ page }) => {
    const quickBtn = page.locator('[data-testid^="button-quick-"]').first();
    if (await quickBtn.isVisible()) {
      await quickBtn.click();
      await page.waitForURL(/\/creator\//, { timeout: 10000 });
    }
  });

  test("back button from creator returns to dashboard", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await page.getByTestId("input-project-title").fill("Back Test");
    await page.getByTestId("select-project-type").selectOption("comic");
    await page.getByTestId("button-create-project").click();

    await page.waitForURL(/\/creator\/comic/, { timeout: 10000 });

    await page.getByTestId("button-back").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("project title is editable in creator", async ({ page }) => {
    await page.getByTestId("button-new-project").click();
    await page.getByTestId("input-project-title").fill("Edit Title Test");
    await page.getByTestId("select-project-type").selectOption("comic");
    await page.getByTestId("button-create-project").click();

    await page.waitForURL(/\/creator\/comic/, { timeout: 10000 });

    const titleInput = page.getByTestId("input-title");
    await titleInput.clear();
    await titleInput.fill("Renamed Comic");
    await expect(titleInput).toHaveValue("Renamed Comic");
  });
});
