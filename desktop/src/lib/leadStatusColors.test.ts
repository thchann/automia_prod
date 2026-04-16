import { describe, expect, it } from "vitest";
import { LEAD_STATUS_PALETTE, normalizeLeadStatusColor } from "./leadStatusColors";

describe("normalizeLeadStatusColor", () => {
  it("returns palette colors unchanged", () => {
    expect(normalizeLeadStatusColor("#EF4444")).toBe("#EF4444");
    expect(normalizeLeadStatusColor("6B7280")).toBe("#6B7280");
  });

  it("maps unknown colors to nearest palette entry", () => {
    const out = normalizeLeadStatusColor("#010203");
    expect(LEAD_STATUS_PALETTE).toContain(out);
  });
});
