import { beforeEach, describe, expect, it } from "vitest";
import { getMeta, setMeta } from "@/lib/db/indexedDb";
import { presetStorage } from "@/lib/presetStorage";

const KEY = "fuelmap.testPreset";

describe("presetStorage", () => {
  beforeEach(async () => {
    localStorage.clear();
    await setMeta(`preset:${KEY}`, undefined);
  });

  it("stores the preset in IndexedDB and mirrors it to localStorage", async () => {
    const value = JSON.stringify({ selectedFuelIds: ["e85"] });

    await presetStorage.setItem(KEY, value);

    expect(await getMeta(`preset:${KEY}`)).toBe(value);
    expect(await presetStorage.getItem(KEY)).toBe(value);
    expect(localStorage.getItem(KEY)).toBe(value);
  });

  it("migrates a legacy localStorage preset on the first read", async () => {
    const value = JSON.stringify({ selectedFuelIds: ["gazole"] });
    localStorage.setItem(KEY, value);

    expect(await presetStorage.getItem(KEY)).toBe(value);
    expect(await getMeta(`preset:${KEY}`)).toBe(value);
  });

  it("prefers the IndexedDB copy over localStorage", async () => {
    await setMeta(`preset:${KEY}`, "from-indexeddb");
    localStorage.setItem(KEY, "from-localstorage");

    expect(await presetStorage.getItem(KEY)).toBe("from-indexeddb");
  });
});
