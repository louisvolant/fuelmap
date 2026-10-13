import { beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db/indexedDb";
import { useFavoritesStore } from "@/stores/favoritesStore";

describe("favoritesStore", () => {
  beforeEach(async () => {
    await closeDb();
    useFavoritesStore.setState({ favoriteIds: [], loaded: false });
  });

  it("toggles a favorite on and off", async () => {
    await useFavoritesStore.getState().toggle("FR:1", "FR");
    expect(useFavoritesStore.getState().favoriteIds).toEqual(["FR:1"]);

    await useFavoritesStore.getState().toggle("FR:1", "FR");
    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });

  it("reloads persisted favorites from IndexedDB", async () => {
    await useFavoritesStore.getState().toggle("FR:2", "FR");

    useFavoritesStore.setState({ favoriteIds: [], loaded: false });
    await useFavoritesStore.getState().load();

    expect(useFavoritesStore.getState().favoriteIds).toEqual(["FR:2"]);
    expect(useFavoritesStore.getState().loaded).toBe(true);
  });
});
