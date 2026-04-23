import { describe, expect, it } from "vitest";
import { isCreatedWithinActivityRange } from "./statusActivityDateRange";

describe("isCreatedWithinActivityRange", () => {
  it("returns true for All time", () => {
    expect(isCreatedWithinActivityRange("2020-01-01T00:00:00.000Z", "All time")).toBe(true);
  });

  it("includes items in the last day window", () => {
    const now = new Date("2026-04-20T12:00:00.000Z");
    const recent = "2026-04-19T18:00:00.000Z";
    const old = "2026-04-01T12:00:00.000Z";
    expect(isCreatedWithinActivityRange(recent, "1d", now)).toBe(true);
    expect(isCreatedWithinActivityRange(old, "1d", now)).toBe(false);
  });
});
