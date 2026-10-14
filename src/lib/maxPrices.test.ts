import { describe, expect, it } from "vitest";
import {
  parseBelgianMaxPrices,
  parseLuxembourgMaxPrices,
} from "@/lib/maxPrices";

const BE_CSV = [
  '"Product group","Product","Day","Price excl. VAT","Price difference excl. VAT","Price incl. VAT"',
  '"Gasoline","Euro Super 95 E5 (€/L)","15OCT26",1.753,-0.028,2.121',
  '"Gasoline","Euro Super 95 E10 (€/L)","15OCT26",1.706,-0.034,2.064',
  '"Gasoline","Super Plus 98 E5 (€/L)","15OCT26",1.819,-0.081,2.201',
  '"Road transport diesel","Road Diesel B7 (€/L)","15OCT26",2.007,,2.428',
  '"Road transport diesel","Road Diesel B10 (€/L)","15OCT26",2.001,,2.421',
  '"Heating","Gasoil Diesel Heating (>=2000L) (€/L)","15OCT26",1.26,,1.52',
].join("\n");

describe("parseBelgianMaxPrices", () => {
  it("extracts the incl. VAT prices of pump fuels", () => {
    const payload = parseBelgianMaxPrices(BE_CSV);
    expect(payload.updatedAt).toBe("15OCT26");
    expect(payload.currency).toBe("EUR");
    expect(payload.prices).toEqual({
      sp95: 2.121,
      e10: 2.064,
      sp98: 2.201,
      gazole: 2.428,
    });
  });

  it("ignores non-pump products", () => {
    const payload = parseBelgianMaxPrices(BE_CSV);
    expect(Object.keys(payload.prices)).toHaveLength(4);
  });
});

const LU_HTML = `
<table>
  <tr><th>Date</th><th>Super 98 oct.</th><th>Super 95 oct.</th><th>Diesel</th><th>Gasoil chauffage</th><th>Gasoil chauff. BTS</th><th>TVA</th></tr>
  <tr><td>13/10/2026</td><td>2.081</td><td>1.876</td><td>2.081</td><td>-</td><td>1.575</td><td>TVAC</td></tr>
  <tr><td>13/10/2026</td><td>1.7786</td><td>1.6034</td><td>1.7786</td><td>-</td><td>1.3816</td><td>HTVA</td></tr>
</table>`;

describe("parseLuxembourgMaxPrices", () => {
  it("reads the first incl. VAT row", () => {
    const payload = parseLuxembourgMaxPrices(LU_HTML);
    expect(payload.updatedAt).toBe("2026-10-13");
    expect(payload.prices).toEqual({ sp98: 2.081, sp95: 1.876, gazole: 2.081 });
  });

  it("returns an empty payload when no row matches", () => {
    const payload = parseLuxembourgMaxPrices("<table></table>");
    expect(payload.prices).toEqual({});
  });
});
