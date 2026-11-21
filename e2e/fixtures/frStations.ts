/**
 * Deterministic fuel-station fixtures for Playwright.
 *
 * The shape mimics the raw records returned by the French DGCCRF dataset so the
 * real `normalizeFrStation` adapter is exercised end to end. Fixtures are kept
 * self-contained (no imports from `src/`) because Playwright runs in Node.
 */

export interface FrStationFixture {
  id: number;
  geom: { lon: number; lat: number };
  cp: string;
  pop: "A" | "R";
  adresse: string;
  ville: string;
  services_service: string[];
  horaires_automate_24_24: string;
  [key: string]: unknown;
}

const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const FR_STATIONS_FIXTURE: FrStationFixture[] = [
  {
    id: 75101001,
    geom: { lon: 2.3522, lat: 48.8566 },
    cp: "75001",
    pop: "R",
    adresse: "1 RUE DE RIVOLI",
    ville: "Paris",
    services_service: ["Boutique", "Wifi"],
    horaires_automate_24_24: "Non",
    gazole_prix: 1.859,
    gazole_maj: hoursAgo(2),
    e10_prix: 1.799,
    e10_maj: hoursAgo(2),
    sp98_prix: 1.929,
    sp98_maj: hoursAgo(16),
    sp95_rupture_type: "definitive",
    sp95_rupture_debut: "2026-01-01 00:00:00",
  },
  {
    id: 75102002,
    geom: { lon: 2.3469, lat: 48.8656 },
    cp: "75002",
    pop: "R",
    adresse: "2 RUE MONTOGUEIL",
    ville: "Paris",
    services_service: ["DAB (Distributeur automatique de billets)"],
    horaires_automate_24_24: "Oui",
    gazole_prix: 1.829,
    gazole_maj: hoursAgo(3),
    e10_prix: 1.769,
    e10_maj: hoursAgo(3),
    sp95_prix: 1.809,
    sp95_maj: hoursAgo(3),
  },
  {
    id: 75103003,
    geom: { lon: 2.3622, lat: 48.8636 },
    cp: "75003",
    pop: "A",
    adresse: "3 BOULEVARD DU TEMPLE",
    ville: "Paris",
    services_service: ["Boutique", "Toilettes publiques"],
    horaires_automate_24_24: "Oui",
    gazole_prix: 1.899,
    gazole_maj: hoursAgo(1),
  },
  {
    id: 75104004,
    geom: { lon: 2.3422, lat: 48.8526 },
    cp: "75004",
    pop: "R",
    adresse: "4 RUE DE RENNES",
    ville: "Paris",
    services_service: ["Boutique"],
    horaires_automate_24_24: "Non",
    e85_prix: 0.899,
    e85_maj: hoursAgo(44),
    gplc_prix: 1.099,
    gplc_maj: hoursAgo(44),
  },
];
