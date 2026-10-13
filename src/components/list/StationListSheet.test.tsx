import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StationListSheet } from "@/components/list/StationListSheet";
import { getCountry } from "@/countries";
import type { NormalizedStation } from "@/countries/types";
import { sortStations } from "@/lib/sortStations";
import { useFilterStore } from "@/stores/filterStore";

function station(id: string, price?: number): NormalizedStation {
  return {
    id,
    country: "FR",
    lat: 48.85,
    lon: 2.35,
    address: `ADDRESS ${id}`,
    city: "Paris",
    isHighway: false,
    fuels:
      price === undefined
        ? []
        : [{ fuelId: "gazole", price, currency: "EUR", available: true }],
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

describe("StationListSheet", () => {
  beforeEach(() => {
    useFilterStore.setState({ sortBy: "price" });
  });

  it("renders the cheapest station first", () => {
    const stations = sortStations(
      [station("a", 1.9), station("b", 1.75), station("c")],
      { sortBy: "price", fuelId: null },
    );

    render(
      <StationListSheet
        open
        onClose={() => {}}
        stations={stations}
        country={getCountry("FR")}
        activeFuelId="gazole"
        onSelect={() => {}}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("1,750");
    expect(items[2]).toHaveTextContent("Prix non communiqué");
  });

  it("shows an empty state", () => {
    render(
      <StationListSheet
        open
        onClose={() => {}}
        stations={[]}
        country={getCountry("FR")}
        activeFuelId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Aucune station à afficher")).toBeInTheDocument();
  });
});
