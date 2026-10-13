// Brand marks, embedded as raw SVG so they can be rasterized and registered as
// MapLibre images. See `scripts/generate-brand-logos.mjs`.
import auchan from "@/assets/brands/auchan.svg?raw";
import avia from "@/assets/brands/avia.svg?raw";
import bp from "@/assets/brands/bp.svg?raw";
import carrefour from "@/assets/brands/carrefour.svg?raw";
import cora from "@/assets/brands/cora.svg?raw";
import dyneff from "@/assets/brands/dyneff.svg?raw";
import elan from "@/assets/brands/elan.svg?raw";
import eni from "@/assets/brands/eni.svg?raw";
import esso from "@/assets/brands/esso.svg?raw";
import fulli from "@/assets/brands/fulli.svg?raw";
import intermarche from "@/assets/brands/intermarche.svg?raw";
import leclerc from "@/assets/brands/leclerc.svg?raw";
import match from "@/assets/brands/match.svg?raw";
import netto from "@/assets/brands/netto.svg?raw";
import shell from "@/assets/brands/shell.svg?raw";
import totalenergies from "@/assets/brands/totalenergies.svg?raw";
import u from "@/assets/brands/u.svg?raw";
import type { BrandId } from "./brands";

export const BRAND_SVGS: Record<BrandId, string> = {
  auchan,
  avia,
  bp,
  carrefour,
  cora,
  dyneff,
  elan,
  eni,
  esso,
  fulli,
  intermarche,
  leclerc,
  match,
  netto,
  shell,
  totalenergies,
  u,
};
