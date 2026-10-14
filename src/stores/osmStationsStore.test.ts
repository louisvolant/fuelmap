import { beforeEach, describe, expect, it } from "vitest";
import type { OsmFuelStation } from "@/lib/osmStations";
import { useOsmStationsStore } from "@/stores/osmStationsStore";

function node(key: string): OsmFuelStation {
  return { key, lat: 48.85, lon: 2.35, opening24h: false };
}

describe("osmStationsStore", () => {
  beforeEach(() => {
    useOsmStationsStore.setState({ stations: [], keys: new Set<string>() });
  });

  it("merges stations across calls and deduplicates by key", () => {
    const { merge } = useOsmStationsStore.getState();
    merge([node("node/1"), node("node/2")]);
    merge([node("node/2"), node("node/3")]);

    expect(useOsmStationsStore.getState().stations.map((s) => s.key)).toEqual([
      "node/1",
      "node/2",
      "node/3",
    ]);
  });

  it("keeps the same reference when nothing new is added", () => {
    const { merge } = useOsmStationsStore.getState();
    merge([node("node/1")]);
    const before = useOsmStationsStore.getState().stations;
    merge([node("node/1")]);
    expect(useOsmStationsStore.getState().stations).toBe(before);
  });
});
