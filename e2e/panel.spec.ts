import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { clickStation, focusParis, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page);
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

  test("keeps the fuel filters above the map, clear of the side panel", async ({
    page,
  }) => {
    await openStation(page);

    const bar = page.getByTestId("fuel-filter-bar");
    const dialog = page.getByRole("dialog");
    await expect(bar).toBeVisible();

    const barBox = await bar.boundingBox();
    expect(barBox?.y ?? 0).toBeGreaterThan(800 / 2);

    await expect
      .poll(async () => {
        const currentBar = await bar.boundingBox();
        const panel = await dialog.boundingBox();
        return (
          (currentBar?.x ?? 0) + (currentBar?.width ?? 0) <= (panel?.x ?? 0)
        );
      })
      .toBe(true);

    await page.getByRole("button", { name: "Afficher à gauche" }).click();

    await expect
      .poll(async () => {
        const movedBar = await bar.boundingBox();
        const movedPanel = await dialog.boundingBox();
        return (
          (movedBar?.x ?? 0) >=
          (movedPanel?.x ?? 0) + (movedPanel?.width ?? 0)
        );
      })
      .toBe(true);
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
    await expect
      .poll(async () => {
        const box = await page.getByTestId("sheet-content").boundingBox();
        return box ? Math.round(box.y + box.height) : 0;
      })
      .toBeGreaterThan(780);

    await expect(
      page.getByRole("button", { name: "Afficher à gauche" }),
    ).toHaveCount(0);
  });

  test("dismisses the sheet by dragging its handle down", async ({ page }) => {
    await openStation(page);

    // Wait for the entrance animation to finish before dragging.
    await expect
      .poll(async () => {
        const box = await page.getByTestId("sheet-content").boundingBox();
        return box ? Math.round(box.y + box.height) : 0;
      })
      .toBeLessThan(805);

    const handle = page.getByTestId("sheet-handle");
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();

    const centerX = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const startY = (box?.y ?? 0) + (box?.height ?? 0) / 2;

    await page.mouse.move(centerX, startY);
    await page.mouse.down();
    await page.mouse.move(centerX, startY + 200, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("pins the fuel filters above the station sheet", async ({ page }) => {
    await openStation(page);

    const above = page.getByTestId("sheet-above");
    const content = page.getByTestId("sheet-content");

    await expect(above).toBeVisible();
    await expect(above.getByRole("button", { name: "E85" })).toBeVisible();
    await expect(page.getByTestId("fuel-filter-dock")).toHaveCount(0);

    // Wait for the entrance animation to finish before comparing positions.
    await expect
      .poll(async () => {
        const box = await content.boundingBox();
        return box ? Math.round(box.y + box.height) : 0;
      })
      .toBeLessThan(805);

    const aboveBox = await above.boundingBox();
    const contentBox = await content.boundingBox();
    expect((aboveBox?.y ?? 0) + (aboveBox?.height ?? 0)).toBeLessThanOrEqual(
      contentBox?.y ?? 0,
    );
  });
});
