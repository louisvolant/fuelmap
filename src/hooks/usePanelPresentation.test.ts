import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePanelPresentation } from "@/hooks/usePanelPresentation";

function stubMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "",
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
}

describe("usePanelPresentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a bottom sheet on small portrait screens", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => usePanelPresentation());
    expect(result.current).toBe("sheet");
  });

  it("uses a side panel otherwise", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => usePanelPresentation());
    expect(result.current).toBe("panel");
  });
});
