import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/themeStore";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Resolve the effective theme, following the OS when set to "system". */
export function useResolvedTheme(): "light" | "dark" {
  const theme = useThemeStore((state) => state.theme);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}

/**
 * Resolve and apply the theme to the document root.
 * Returns the effective theme so callers can pick a matching map style.
 */
export function useTheme(): "light" | "dark" {
  const resolved = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  return resolved;
}
