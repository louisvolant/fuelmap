import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/freshness";

const now = new Date("2026-10-12T12:00:00Z");

describe("formatRelativeTime", () => {
  it("formats recent timestamps in hours", () => {
    expect(formatRelativeTime("2026-10-12T10:00:00Z", "fr", now)).toBe("il y a 2 heures");
  });

  it("formats short gaps in minutes", () => {
    expect(formatRelativeTime("2026-10-12T11:45:00Z", "fr", now)).toBe(
      "il y a 15 minutes",
    );
  });

  it("formats day-old timestamps", () => {
    expect(formatRelativeTime("2026-10-11T12:00:00Z", "fr", now)).toBe("hier");
  });

  it("respects the locale", () => {
    expect(formatRelativeTime("2026-10-12T10:00:00Z", "en", now)).toBe(
      "2 hours ago",
    );
  });
});
