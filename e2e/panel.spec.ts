import { expect, test, type Page } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOverpass } from "./support/mockOverpass";
import { clickStation, focusParis, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOverpass(page);
  await page.goto("/");
  await waitForStations(page);
});

async function openStation(page: Page): Promise<void> {
  await focusParis(page);
  await clickStation(page, "FR:75101001");
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("wide viewport", () => {
  test.use({ viewport: { width: 1200, height: 800 } });

  test("opens the details on the right and can move them to the left", async ({
    page,
  }) => {
    await openStation(page);

    const dialog = page.getByRole("dialog");
    const onRight = await dialog.boundingBox();
    expect(onRight?.x ?? 0).toBeGreaterThan(1200 / 2);

    await page.getByRole("button", { name: "Afficher à gauche" }).click();

    const onLeft = await dialog.boundingBox();
    expect(onLeft?.x ?? 0).toBeLessThan(1200 / 2);
  });
});

test.describe("small landscape viewport", () => {
  test.use({ viewport: { width: 700, height: 380 } });

  test("uses a full-height side panel", async ({ page }) => {
    await openStation(page);

    const box = await page.getByRole("dialog").boundingBox();
    // A side panel spans (almost) the whole height, unlike a bottom sheet.
    expect(box?.height ?? 0).toBeGreaterThan(380 * 0.9);
    await expect(
      page.getByRole("button", { name: "Afficher à gauche" }),
    ).toBeVisible();
  });
});

test.describe("portrait viewport", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("uses a bottom sheet without a side toggle", async ({ page }) => {
    await openStation(page);

    // The sheet is anchored to the bottom of the screen.
    const box = await page.getByTestId("sheet-content").boundingBox();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(800 - 4);

    await expect(
      page.getByRole("button", { name: "Afficher à gauche" }),
    ).toHaveCount(0);
  });
});
