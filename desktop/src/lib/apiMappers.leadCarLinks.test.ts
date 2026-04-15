import { describe, it, expect } from "vitest";
import type { CarResponse, LeadResponse } from "@automia/api";
import {
  leadCarLinkFieldsFromApiCars,
  leadToUpdatePayloadOmitCarLinks,
  mapLeadFromApi,
  mergeLeadResponseWithClientCarLinks,
} from "./apiMappers";
import type { Lead } from "@/types/leads";

function baseLeadResponse(overrides: Partial<LeadResponse> = {}): LeadResponse {
  return {
    id: "lead-1",
    user_id: "user-1",
    platform_sender_id: "ps-1",
    lead_type: "buyer",
    source: "manual",
    status_id: null,
    car_id: null,
    name: null,
    instagram_handle: null,
    phone: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    desired_budget_min: null,
    desired_budget_max: null,
    desired_mileage_max: null,
    desired_year_min: null,
    desired_year_max: null,
    desired_make: null,
    desired_model: null,
    desired_car_type: null,
    ...overrides,
  };
}

describe("mapLeadFromApi car link normalization", () => {
  it("sets car_ids from car_id when API omits car_ids", () => {
    const r = baseLeadResponse({ car_id: "car-a", car_ids: undefined });
    const lead = mapLeadFromApi(r);
    expect(lead.car_ids).toEqual(["car-a"]);
  });

  it("keeps explicit car_ids when present", () => {
    const r = baseLeadResponse({ car_id: "car-a", car_ids: ["car-a", "car-b"] });
    const lead = mapLeadFromApi(r);
    expect(lead.car_ids).toEqual(["car-a", "car-b"]);
  });
});

describe("mergeLeadResponseWithClientCarLinks", () => {
  it("preserves two client car IDs when PUT response omits car_ids", () => {
    const server = baseLeadResponse({
      car_id: "car-a",
      car_ids: undefined,
    });
    const merged = mergeLeadResponseWithClientCarLinks(server, {
      car_id: "car-a",
      car_ids: ["car-a", "car-b"],
    });
    expect(merged.car_ids).toEqual(["car-a", "car-b"]);
  });

  it("allows clearing all links from client", () => {
    const server = baseLeadResponse({ car_id: "car-a", car_ids: ["car-a"] });
    const merged = mergeLeadResponseWithClientCarLinks(server, {
      car_id: null,
      car_ids: null,
    });
    expect(merged.car_id).toBeNull();
    expect(merged.car_ids).toBeNull();
  });
});

function minimalLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    user_id: "u1",
    platform_sender_id: "ps",
    lead_type: "buyer",
    source: "manual",
    status_id: null,
    car_id: "car-a",
    car_ids: ["car-a", "car-b"],
    name: "N",
    instagram_handle: null,
    phone: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    desired_budget_min: null,
    desired_budget_max: null,
    desired_mileage_max: null,
    desired_year_min: null,
    desired_year_max: null,
    desired_make: null,
    desired_model: null,
    desired_car_type: null,
    ...overrides,
  };
}

describe("leadToUpdatePayloadOmitCarLinks", () => {
  it("does not include car_id or car_ids", () => {
    const p = leadToUpdatePayloadOmitCarLinks(minimalLead());
    expect(p).not.toHaveProperty("car_id");
    expect(p).not.toHaveProperty("car_ids");
  });
});

describe("leadCarLinkFieldsFromApiCars", () => {
  it("maps ordered car ids to car_id and car_ids", () => {
    const cars: CarResponse[] = [
      {
        id: "c1",
        user_id: "u",
        brand: "A",
        model: "M",
        year: 2020,
        mileage: null,
        price: null,
        desired_price: null,
        car_type: null,
        listed_at: null,
        transmission: null,
        color: null,
        fuel: null,
        manufacture_year: null,
        vehicle_condition: null,
        owner_type: "owned",
        status: "available",
        attachments: null,
        created_at: "2024-01-01",
        updated_at: null,
      },
      {
        id: "c2",
        user_id: "u",
        brand: "B",
        model: "N",
        year: 2021,
        mileage: null,
        price: null,
        desired_price: null,
        car_type: null,
        listed_at: null,
        transmission: null,
        color: null,
        fuel: null,
        manufacture_year: null,
        vehicle_condition: null,
        owner_type: "owned",
        status: "available",
        attachments: null,
        created_at: "2024-01-02",
        updated_at: null,
      },
    ];
    expect(leadCarLinkFieldsFromApiCars(cars)).toEqual({
      car_id: "c1",
      car_ids: ["c1", "c2"],
    });
  });
});
