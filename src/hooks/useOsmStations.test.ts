import { describe, expect, it } from "vitest";
import { osmBboxKey } from "@/hooks/useOsmStations";

describe("osmBboxKey", () => {
  it("keeps the same key across micro-pans and changes it across tiles", () => {
    const first = osmBboxKey([2.351, 48.851, 2.449, 48.949]);
    expect(osmBboxKey([2.352, 48.852, 2.45, 48.95])).toBe(first);
    expect(osmBboxKey([3.0, 48.851, 3.1, 48.949])).not.toBe(first);
  });
});
