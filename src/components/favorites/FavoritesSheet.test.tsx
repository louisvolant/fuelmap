import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoritesSheet } from "@/components/favorites/FavoritesSheet";
import type { NormalizedStation } from "@/countries/types";
import { closeDb } from "@/lib/db/indexedDb";
import { useFavoritesStore } from "@/stores/favoritesStore";

const station: NormalizedStation = {
  id: "FR:1",
  country: "FR",
  lat: 48.85,
  lon: 2.35,
  address: "1 RUE DE RIVOLI",
  city: "Paris",
  postalCode: "75001",
  isHighway: false,
  fuels: [],
  services: [],
  automat24h: false,
  sourceId: "1",
};

describe("FavoritesSheet", () => {
  beforeEach(async () => {
    await closeDb();
    useFavoritesStore.setState({ favoriteIds: [], loaded: false });
  });

  it("shows an empty state without favorites", () => {
    render(
      <FavoritesSheet
        open
        onClose={() => {}}
        stations={[station]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Aucun favori pour le moment")).toBeInTheDocument();
  });

  it("lists favorites and removes them", async () => {
    await useFavoritesStore.getState().toggle("FR:1", "FR");
    const user = userEvent.setup();

    render(
      <FavoritesSheet
        open
        onClose={() => {}}
        stations={[station]}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("Paris")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Retirer des favoris" }),
    );
    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });
});
