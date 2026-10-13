import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { FilterSheet } from "@/components/filters/FilterSheet";
import { useFilterStore } from "@/stores/filterStore";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("FilterSheet", () => {
  beforeEach(() => {
    useFilterStore.getState().reset();
  });

  it("toggles the 24/7 and shortage filters", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilterSheet open onClose={() => {}} services={["Wifi"]} />,
    );

    await user.click(
      screen.getByRole("switch", { name: "Automate 24/24 uniquement" }),
    );
    await user.click(
      screen.getByRole("switch", { name: "Masquer les stations en rupture" }),
    );

    expect(useFilterStore.getState().only24h).toBe(true);
    expect(useFilterStore.getState().hideShortages).toBe(true);
  });

  it("selects services and resets everything", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilterSheet open onClose={() => {}} services={["Wifi", "Boutique"]} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Wifi" }));
    expect(useFilterStore.getState().services).toEqual(["Wifi"]);

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(useFilterStore.getState().services).toEqual([]);
  });
});
