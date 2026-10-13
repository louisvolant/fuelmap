import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import App from "./App";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("App", () => {
  it("renders the fullscreen map canvas", () => {
    renderWithProviders(<App />);
    expect(screen.getByTestId("map-canvas")).toBeInTheDocument();
  });
});
