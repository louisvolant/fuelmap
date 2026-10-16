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

/**
 * Default for specs that do not care about brand logos: every snapshot 404s, so
 * the client deterministically falls back to the bundled mark (instead of
 * decoding the SPA's HTML fallback).
 */
export async function mockBrandLogoMissing(page: Page): Promise<void> {
  await page.route(/\/brands\/[a-z0-9-]+$/, (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "unknown brand logo" }),
    }),
  );
}

export interface BrandSnapshotFixture {
  brand: string;
  lat: number;
  lon: number;
  osmKey?: string;
}

/**
 * Intercept the precomputed French brand snapshot: the manifest advertises the
 * payload, the snapshot maps station ids to brands. Specs that need live OSM
 * enrichment instead use `mockBrandSnapshotMissing`.
 */
export async function mockBrandSnapshot(
  page: Page,
  brands: Record<string, BrandSnapshotFixture>,
): Promise<void> {
  await page.route(/\/api\/fr\/brands\/manifest/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "v1", count: Object.keys(brands).length }),
    }),
  );
  await page.route(/\/api\/fr\/brands\/snapshot/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "v1", brands }),
    }),
  );
}

/** No published snapshot: the client falls back to live OSM enrichment. */
export async function mockBrandSnapshotMissing(page: Page): Promise<void> {
  await page.route(/\/api\/fr\/brands\/manifest/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "v1", count: 0 }),
    }),
  );
}
