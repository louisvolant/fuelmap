import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationDetails } from "@/components/station/StationDetails";
import { getCountry } from "@/countries";
import type { NormalizedStation } from "@/countries/types";
import { useLayoutStore } from "@/stores/layoutStore";

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

describe("StationDetails", () => {
  it("lists fuels with price, freshness and shortage", () => {
    render(
      <StationDetails
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
      <StationDetails
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
      <StationDetails
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
      <StationDetails station={null} country={getCountry("FR")} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the details in a side panel and can switch side", async () => {
    const user = userEvent.setup();
    useLayoutStore.setState({ panelSide: "right" });

    render(
      <StationDetails
        station={station}
        country={getCountry("FR")}
        onClose={() => {}}
      />,
    );

    // jsdom's matchMedia reports a wide viewport: the side panel is used.
    await user.click(screen.getByRole("button", { name: "Afficher à gauche" }));
    expect(useLayoutStore.getState().panelSide).toBe("left");
    expect(
      screen.getByRole("button", { name: "Afficher à droite" }),
    ).toBeInTheDocument();
  });
});
