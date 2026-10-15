import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZoomLevelBadge } from "@/components/map/ZoomLevelBadge";
import { MapContext } from "@/components/map/MapContext";

function renderWithZoom(zoom: number | null) {
  const map = {
    on: vi.fn(),
    off: vi.fn(),
    getZoom: () => zoom,
  };

  render(
    <MapContext.Provider value={map as never}>
      <ZoomLevelBadge />
    </MapContext.Provider>,
  );
}

describe("ZoomLevelBadge", () => {
  it("shows the current zoom with one decimal", () => {
    renderWithZoom(13.5);
    expect(screen.getByRole("status")).toHaveTextContent("13.5");
  });

  it("renders nothing without a map", () => {
    const { container } = render(
      <MapContext.Provider value={null}>
        <ZoomLevelBadge />
      </MapContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
