import type { Page } from "@playwright/test";
import { ES_STATIONS_FIXTURE } from "../fixtures/esStations";

const SPAIN_API_PATTERN =
  /ServiciosRESTCarburantes\/PreciosCarburantes\/EstacionesTerrestres/;

/** Intercept the Spanish fuel-price API and serve deterministic fixtures. */
export async function mockSpainApi(
  page: Page,
  stations: unknown[] = ES_STATIONS_FIXTURE,
): Promise<void> {
  await page.route(SPAIN_API_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        Fecha: "13/10/2026 08:00:00",
        ListaEESSPrecio: stations,
      }),
    });
  });
}
