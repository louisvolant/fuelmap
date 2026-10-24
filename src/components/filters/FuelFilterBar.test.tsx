import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { FuelFilterBar } from "@/components/filters/FuelFilterBar";
import { useFilterStore } from "@/stores/filterStore";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("FuelFilterBar", () => {
  beforeEach(() => {
    useFilterStore.getState().reset();
  });

  it("renders one chip per fuel", () => {
    renderWithProviders(<FuelFilterBar />);
    expect(screen.getByRole("button", { name: /Gazole/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /E85/ })).toBeInTheDocument();
  });

  it("toggles a fuel when its chip is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FuelFilterBar />);

    const chip = screen.getByRole("button", { name: /E85/ });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(useFilterStore.getState().selectedFuelIds).toEqual(["e85"]);

    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps a single fuel selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<FuelFilterBar />);

    const gazole = screen.getByRole("button", { name: /Gazole/ });
    const e85 = screen.getByRole("button", { name: /E85/ });

    await user.click(gazole);
    expect(gazole).toHaveAttribute("aria-pressed", "true");

    await user.click(e85);
    expect(gazole).toHaveAttribute("aria-pressed", "false");
    expect(e85).toHaveAttribute("aria-pressed", "true");
    expect(useFilterStore.getState().selectedFuelIds).toEqual(["e85"]);
  });
});
