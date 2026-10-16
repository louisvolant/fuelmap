import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandBadge } from "@/components/station/BrandBadge";

describe("BrandBadge", () => {
  it("renders the bundled mark instantly", () => {
    render(<BrandBadge brand="TotalEnergies" />);
    const image = screen.getByAltText("TotalEnergies");
    expect(image.getAttribute("src") ?? "").toContain("data:image/svg+xml");
  });

  it("renders nothing for an unknown brand", () => {
    const { container } = render(<BrandBadge brand="Random Station" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders nothing without a brand", () => {
    const { container } = render(<BrandBadge />);
    expect(container.querySelector("img")).toBeNull();
  });
});
