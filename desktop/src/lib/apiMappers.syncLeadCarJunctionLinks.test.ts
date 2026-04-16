import { beforeEach, describe, expect, it, vi } from "vitest";

const { MockApiError, addLeadCarLink, removeLeadCarLink } = vi.hoisted(() => {
  class MockApiError extends Error {
    readonly status: number;
    readonly detail: unknown;

    constructor(status: number, message: string, detail?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
    }
  }

  return {
    MockApiError,
    addLeadCarLink: vi.fn(),
    removeLeadCarLink: vi.fn(),
  };
});

vi.mock("@automia/api", () => ({
  ApiError: MockApiError,
  addLeadCarLink,
  removeLeadCarLink,
  listCarsForLead: vi.fn(),
}));

import { syncLeadCarJunctionLinks } from "./apiMappers";

describe("syncLeadCarJunctionLinks zero-connection behavior", () => {
  beforeEach(() => {
    addLeadCarLink.mockReset();
    removeLeadCarLink.mockReset();
  });

  it("allows removing all links (nextIds = [])", async () => {
    await expect(
      syncLeadCarJunctionLinks("lead-1", ["car-a", "car-b"], []),
    ).resolves.toBeUndefined();

    expect(removeLeadCarLink).toHaveBeenCalledTimes(2);
    expect(removeLeadCarLink).toHaveBeenNthCalledWith(1, "lead-1", "car-a");
    expect(removeLeadCarLink).toHaveBeenNthCalledWith(2, "lead-1", "car-b");
    expect(addLeadCarLink).not.toHaveBeenCalled();
  });

  it("treats duplicate add (409) as idempotent and continues", async () => {
    addLeadCarLink.mockRejectedValueOnce(new MockApiError(409, "Lead-car match already exists"));

    await expect(syncLeadCarJunctionLinks("lead-1", [], ["car-a"])).resolves.toBeUndefined();
    expect(addLeadCarLink).toHaveBeenCalledWith("lead-1", { car_id: "car-a" });
  });

  it("treats missing delete (404) as idempotent and continues", async () => {
    removeLeadCarLink.mockRejectedValueOnce(new MockApiError(404, "Not found"));

    await expect(syncLeadCarJunctionLinks("lead-1", ["car-a"], [])).resolves.toBeUndefined();
    expect(removeLeadCarLink).toHaveBeenCalledWith("lead-1", "car-a");
  });

  it("rethrows non-idempotent API errors", async () => {
    addLeadCarLink.mockRejectedValueOnce(new MockApiError(500, "Server error"));

    await expect(syncLeadCarJunctionLinks("lead-1", [], ["car-a"])).rejects.toMatchObject({
      status: 500,
    });
  });
});

