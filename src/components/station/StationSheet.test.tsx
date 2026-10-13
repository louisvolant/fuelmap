import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StationSheet } from "@/components/station/StationSheet";
import { getCountry } from "@/countries";
import type { NormalizedStation } from "@/countries/types";

const twoHoursAgo = new Date(Date.now() - (2 * 60 + 5) * 60 * 1000).toISOString();

const station: NormalizedStation = {
  id: "FR:1",
  country: "FR",
  lat: 48.85,
  lon: 2.35,
  address: "1 RUE DE RIVOLI",
  city: "Paris",
  postalCode: "75001",
  isHighway: false,
  fuels: [
    {
      fuelId: "sp95",
      currency: "EUR",
      available: false,
      shortage: { type: "definitive" },
    },
    {
      fuelId: "e10",
      price: 1.799,
      currency: "EUR",
      updatedAt: twoHoursAgo,
      available: true,
    },
  ],
  services: ["Boutique"],
  automat24h: false,
  sourceId: "1",
};

describe("StationSheet", () => {
  it("lists fuels with price, freshness and shortage", () => {
    render(
      <StationSheet
        station={station}
        country={getCountry("FR")}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("E10")).toBeInTheDocument();
    expect(screen.getByText(/1,799/)).toBeInTheDocument();
    expect(screen.getByText("il y a 2 heures")).toBeInTheDocument();
    expect(screen.getAllByText("Rupture définitive").length).toBeGreaterThan(0);
    expect(screen.getByText("Boutique")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("renders navigation hand-off links", () => {
    render(
      <StationSheet
        station={station}
        country={getCountry("FR")}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("link", { name: "Waze" })).toHaveAttribute(
      "href",
      expect.stringContaining("waze.com"),
    );
    expect(screen.getByRole("link", { name: "Google Maps" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toBeInTheDocument();
  });

  it("sorts available fuels before unavailable ones", () => {
    render(
      <StationSheet
        station={station}
        country={getCountry("FR")}
        onClose={() => {}}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("E10");
  });

  it("renders nothing without a station", () => {
    const { container } = render(
      <StationSheet station={null} country={getCountry("FR")} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
