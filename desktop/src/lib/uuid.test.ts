import { afterEach, describe, expect, it, vi } from "vitest";
import type { LeadStatus } from "@/types/leads";
import { makeUuid } from "./uuid";
import { newDraftRecordId } from "./draftIds";
import { buildDraftLead } from "./draftLeadCar";
import { leadToCreatePayload } from "./apiMappers";

describe("makeUuid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-1111-4111-8111-111111111111",
    });

    expect(makeUuid()).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("falls back to UUIDv4 via getRandomValues when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = i;
        return bytes;
      },
    });

    const id = makeUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("falls back to safe string when crypto is missing", () => {
    vi.stubGlobal("crypto", undefined);
    expect(makeUuid()).toMatch(/^fallback-/);
  });
});

describe("lead/car draft UUID regression coverage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds draft IDs and lead payload sender id even when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const status: LeadStatus = {
      id: "status-1",
      name: "New",
      display_order: 1,
      color: null,
      is_default: false,
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const draftLead = buildDraftLead([status], "New Lead");
    expect(draftLead.id).toMatch(/^draft-/);
    expect(draftLead.platform_sender_id).toMatch(/^manual-/);

    const createPayload = leadToCreatePayload({
      ...draftLead,
      platform_sender_id: "",
    });
    expect(createPayload.platform).toBe("manual");
    expect(createPayload.platform_sender_id).toMatch(/^manual-/);
  });

  it("newDraftRecordId works without crypto.randomUUID", () => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes });
    expect(newDraftRecordId()).toMatch(/^draft-/);
  });
});
