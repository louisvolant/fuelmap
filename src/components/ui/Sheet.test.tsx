import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sheet } from "@/components/ui/Sheet";

describe("Sheet", () => {
  it("renders the above slot before the sheet content", () => {
    render(
      <Sheet open title="Test" onClose={() => {}} above={<span>Pinned</span>}>
        Body
      </Sheet>,
    );

    const above = screen.getByTestId("sheet-above");
    const content = screen.getByTestId("sheet-content");

    expect(above).toHaveTextContent("Pinned");
    expect(above.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
