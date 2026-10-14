import type { Page } from "@playwright/test";

const MANIFEST_PATTERN = /\/brands\/manifest\.json/;

export interface BrandManifestFixture {
  at: number | null;
  brands: { id: string; status: string }[];
}

/** A distinctive remote logo, to prove the R2 snapshot is preferred. */
export const REMOTE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff00ff"/></svg>`;

/** Intercept the brand manifest served by the Worker. */
export async function mockBrandManifest(
  page: Page,
  manifest: BrandManifestFixture = { at: null, brands: [] },
): Promise<void> {
  await page.route(MANIFEST_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(manifest),
    }),
  );
}

/** Intercept a brand logo served from R2 (`/brands/<id>`). */
export async function mockBrandLogo(
  page: Page,
  id: string,
  status = 200,
): Promise<void> {
  await page.route(new RegExp(`/brands/${id}$`), (route) =>
    route.fulfill({
      status,
      contentType: "image/svg+xml",
      body: status === 200 ? REMOTE_LOGO_SVG : "",
    }),
  );
}
