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
    gazole_maj: "2026-10-12 08:00:00",
    e10_prix: 1.799,
    e10_maj: "2026-10-12 08:00:00",
    sp98_prix: 1.929,
    sp98_maj: "2026-10-11 18:00:00",
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
    gazole_maj: "2026-10-12 07:30:00",
    e10_prix: 1.769,
    e10_maj: "2026-10-12 07:30:00",
    sp95_prix: 1.809,
    sp95_maj: "2026-10-12 07:30:00",
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
    gazole_maj: "2026-10-12 09:15:00",
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
    e85_maj: "2026-10-10 12:00:00",
    gplc_prix: 1.099,
    gplc_maj: "2026-10-10 12:00:00",
  },
];
