/**
 * Deterministic Italian stations for Playwright.
 * Shape mirrors the Worker's `/api/it/stations` response.
 */
export const IT_STATIONS_FIXTURE = {
  updatedAt: "2026-10-12T08:00:00+02:00",
  stations: [
    {
      id: "3464",
      lat: 45.464211,
      lon: 9.191383,
      brand: "Agip Eni",
      address: "VIA ROMA 1",
      city: "MILANO",
      province: "MI",
      highway: false,
      prices: { benzina: 1.999, gasolio: 2.21 },
    },
    {
      id: "9999",
      lat: 40.851775,
      lon: 14.268124,
      brand: "Autogrill",
      address: "A1 KM 500",
      city: "NAPOLI",
      province: "NA",
      highway: true,
      prices: { benzina: 2.4, gpl: 0.75 },
    },
  ],
};
