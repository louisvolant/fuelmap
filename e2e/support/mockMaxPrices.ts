import type { Page } from "@playwright/test";

const MAX_PRICES_PATTERN = /\/api\/max-prices/;

export interface MaxPricesFixture {
  updatedAt: string | null;
  currency: string;
  prices: Record<string, number>;
}

export const BELGIUM_MAX_PRICES: MaxPricesFixture = {
  updatedAt: "15OCT26",
  currency: "EUR",
  prices: { sp95: 2.121, e10: 2.064, sp98: 2.201, gazole: 2.428 },
};

/** Intercept the worker's national maximum-price endpoint. */
export async function mockMaxPrices(
  page: Page,
  payload: MaxPricesFixture = BELGIUM_MAX_PRICES,
): Promise<void> {
  await page.route(MAX_PRICES_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}
