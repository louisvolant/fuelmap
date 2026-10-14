import { describe, expect, it } from "vitest";
import {
  DARK_MAP_STYLE,
  DEFAULT_MAP_STYLE,
  resolveMapStyle,
} from "@/lib/mapStyles";

describe("resolveMapStyle", () => {
  it("follows the UI theme when set to auto", () => {
    expect(resolveMapStyle("auto", "light")).toBe(DEFAULT_MAP_STYLE);
    expect(resolveMapStyle("auto", "light").id).toBe("liberty");
    expect(resolveMapStyle("auto", "dark")).toBe(DARK_MAP_STYLE);
  });

  it("uses the explicit style regardless of the theme", () => {
    expect(resolveMapStyle("positron", "dark").id).toBe("positron");
    expect(resolveMapStyle("bright", "light").id).toBe("bright");
    expect(resolveMapStyle("dark", "light").id).toBe("dark");
  });

  it("falls back to the default for an unknown id", () => {
    expect(resolveMapStyle("nope" as never, "light")).toBe(DEFAULT_MAP_STYLE);
  });
});
