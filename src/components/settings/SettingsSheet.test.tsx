import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/i18n";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { useCountryStore } from "@/stores/countryStore";
import { useRadarStore } from "@/stores/radarStore";
import { useThemeStore } from "@/stores/themeStore";

describe("SettingsSheet", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "system" });
    useCountryStore.setState({ country: "FR" });
    useRadarStore.setState({ showFixedRadars: true });
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("changes the theme preference", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Sombre" }));
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("changes the language", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={() => {}} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Langue" }),
      "de",
    );
    expect(i18n.language).toBe("de");
    expect(screen.getByText("Einstellungen")).toBeInTheDocument();
  });

  it("toggles the fixed speed-camera layer", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={() => {}} />);

    const toggle = screen.getByRole("switch", {
      name: /Afficher les radars fixes/,
    });
    expect(toggle).toBeChecked();

    await user.click(toggle);
    expect(useRadarStore.getState().showFixedRadars).toBe(false);
  });
});
