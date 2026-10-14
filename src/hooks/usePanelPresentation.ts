import { useEffect, useState } from "react";

/**
 * Only small portrait screens use the bottom sheet. Every other layout
 * (desktop, and phones held in landscape) uses the side panel.
 */
const SHEET_QUERY = "(max-width: 767px) and (orientation: portrait)";

export type PanelPresentation = "sheet" | "panel";

export function usePanelPresentation(): PanelPresentation {
  const [isSheet, setIsSheet] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(SHEET_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(SHEET_QUERY);
    const listener = (event: MediaQueryListEvent) => setIsSheet(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return isSheet ? "sheet" : "panel";
}
