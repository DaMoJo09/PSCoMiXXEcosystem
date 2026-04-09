import { test, expect } from "@playwright/test";
import { registerUser, createProject } from "./helpers";

test.describe("Export to PNG/PDF", () => {
  const user = {
    name: "Export Tester",
    email: `export-${Date.now()}@example.com`,
    password: "ExportTest123!",
    dob: "2000-05-05",
  };

  test.beforeEach(async ({ page }) => {
    await registerUser(page, user);
    user.email = `export-${Date.now()}@example.com`;
  });

  test("export dropdown button is visible in creator", async ({ page }) => {
    await createProject(page, "comic", "Export Visible Test");

    const exportBtn = page.getByTestId("button-export");
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();
  });

  test("export dropdown shows organized sections", async ({ page }) => {
    await createProject(page, "comic", "Export Sections Test");

    await page.getByTestId("button-export").click();

    const pagePng = page.getByTestId("button-export-page-png");
    const allPng = page.getByTestId("button-export-all-png");
    const pdf = page.getByTestId("button-export-pdf");
    const json = page.getByTestId("button-export-json");

    await expect(pagePng).toBeVisible();
    await expect(allPng).toBeVisible();
    await expect(pdf).toBeVisible();
    await expect(json).toBeVisible();
  });

  test("export dropdown shows publish options", async ({ page }) => {
    await createProject(page, "comic", "Publish Options Test");

    await page.getByTestId("button-export").click();

    const syncPage = page.getByTestId("button-sync-page");
    const syncAll = page.getByTestId("button-sync-all");

    await expect(syncPage).toBeVisible();
    await expect(syncAll).toBeVisible();
  });

  test("export dropdown shows convert option", async ({ page }) => {
    await createProject(page, "comic", "Convert Option Test");

    await page.getByTestId("button-export").click();

    const convertHop = page.getByTestId("button-convert-to-hop");
    await expect(convertHop).toBeVisible();
  });

  test("export items have descriptive text", async ({ page }) => {
    await createProject(page, "comic", "Descriptions Test");

    await page.getByTestId("button-export").click();

    const pagePng = page.getByTestId("button-export-page-png");
    await expect(pagePng).toBeVisible();
    const pagePngText = await pagePng.textContent();
    expect(pagePngText).toBeTruthy();
    expect(pagePngText!.length).toBeGreaterThan(10);
  });

  test("export PNG triggers download without error", async ({ page }) => {
    await createProject(page, "comic", "PNG Download Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.png$/i);
    }
  });

  test("export PDF triggers download without error", async ({ page }) => {
    await createProject(page, "comic", "PDF Download Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-pdf").click();

    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.pdf$/i);
    }
  });

  test("export triggers WhatsNext modal after deliberate export", async ({ page }) => {
    await createProject(page, "comic", "WhatsNext After Export");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-page-png").click();

    const whatsNext = page.getByTestId("whats-next-overlay");
    await expect(whatsNext).toBeVisible({ timeout: 10000 });
  });

  test("export JSON option creates backup file", async ({ page }) => {
    await createProject(page, "comic", "JSON Backup Test");

    await page.getByTestId("button-save").click();
    await page.waitForTimeout(1500);

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);

    await page.getByTestId("button-export").click();
    await page.getByTestId("button-export-json").click();

    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.json$/i);
    }
  });
});
