import type { Lead, Car, LeadStatus } from "@/types/models";

export const mockStatuses: LeadStatus[] = [
  { id: "s1", name: "New", display_order: 0, color: "#007AFF", is_default: true },
  { id: "s2", name: "Contacted", display_order: 1, color: "#F5A623", is_default: false },
  { id: "s3", name: "Qualified", display_order: 2, color: "#4CD964", is_default: false },
  { id: "s4", name: "Negotiating", display_order: 3, color: "#FF6B6B", is_default: false },
  { id: "s5", name: "Closed", display_order: 4, color: "#8E8E93", is_default: false },
];

export const mockLeads: Lead[] = [
  {
    id: "l1", name: "Marcus Rivera", lead_type: "buyer", source: "instagram",
    instagram_handle: "@marcusriv", phone: "+1 305-412-8891", notes: "Looking for a daily driver, prefers sedans.",
    status_id: "s2", car_id: null, desired_budget_min: 25000, desired_budget_max: 40000,
    desired_mileage_max: 50000, desired_year_min: 2020, desired_year_max: 2024,
    desired_make: "BMW", desired_model: null, desired_car_type: "sedan",
    created_at: "2026-03-15T10:00:00Z", updated_at: null,
  },
  {
    id: "l2", name: "Aisha Thompson", lead_type: "seller", source: "manual",
    instagram_handle: null, phone: "+1 786-223-0044", notes: "Wants to sell quickly, moving abroad.",
    status_id: "s1", car_id: "c2", desired_budget_min: null, desired_budget_max: null,
    desired_mileage_max: null, desired_year_min: null, desired_year_max: null,
    desired_make: null, desired_model: null, desired_car_type: null,
    created_at: "2026-03-18T14:30:00Z", updated_at: null,
  },
  {
    id: "l3", name: "Derek Chen", lead_type: "pending", source: "instagram",
    instagram_handle: "@derekc_auto", phone: null, notes: null,
    status_id: "s1", car_id: null, desired_budget_min: null, desired_budget_max: null,
    desired_mileage_max: null, desired_year_min: null, desired_year_max: null,
    desired_make: null, desired_model: null, desired_car_type: null,
    created_at: "2026-03-20T09:15:00Z", updated_at: null,
  },
  {
    id: "l4", name: "Sofia Gutierrez", lead_type: "buyer", source: "instagram",
    instagram_handle: "@sofiag", phone: "+1 954-331-7720", notes: "Interested in SUVs, has two kids.",
    status_id: "s3", car_id: null, desired_budget_min: 35000, desired_budget_max: 55000,
    desired_mileage_max: 30000, desired_year_min: 2022, desired_year_max: 2026,
    desired_make: null, desired_model: null, desired_car_type: "suv",
    created_at: "2026-03-10T11:00:00Z", updated_at: "2026-03-19T16:00:00Z",
  },
  {
    id: "l5", name: "Jamal Washington", lead_type: "seller", source: "manual",
    instagram_handle: "@jamalw", phone: "+1 407-555-1234", notes: "Upgrading to electric.",
    status_id: "s4", car_id: "c4", desired_budget_min: null, desired_budget_max: null,
    desired_mileage_max: null, desired_year_min: null, desired_year_max: null,
    desired_make: null, desired_model: null, desired_car_type: null,
    created_at: "2026-03-08T08:00:00Z", updated_at: "2026-03-20T12:00:00Z",
  },
];

export const mockCars: Car[] = [
  {
    id: "c1", brand: "BMW", model: "M4 Competition", year: 2023, mileage: 12400,
    price: 72500, desired_price: 74000, car_type: "sports", listed_at: "2026-03-01T00:00:00Z",
    owner_type: "owned", status: "available", attachments: null,
    created_at: "2026-03-01T00:00:00Z", updated_at: null,
  },
  {
    id: "c2", brand: "Mercedes-Benz", model: "C300", year: 2021, mileage: 34200,
    price: 32000, desired_price: 35000, car_type: "sedan", listed_at: "2026-03-10T00:00:00Z",
    owner_type: "client", status: "available", attachments: null,
    created_at: "2026-03-10T00:00:00Z", updated_at: null,
  },
  {
    id: "c3", brand: "Porsche", model: "Cayenne S", year: 2022, mileage: 18900,
    price: 68000, desired_price: 70000, car_type: "suv", listed_at: "2026-02-20T00:00:00Z",
    owner_type: "owned", status: "available", attachments: null,
    created_at: "2026-02-20T00:00:00Z", updated_at: null,
  },
  {
    id: "c4", brand: "Tesla", model: "Model 3", year: 2022, mileage: 28700,
    price: 29500, desired_price: 31000, car_type: "sedan", listed_at: "2026-03-15T00:00:00Z",
    owner_type: "client", status: "available", attachments: null,
    created_at: "2026-03-15T00:00:00Z", updated_at: null,
  },
  {
    id: "c5", brand: "Ford", model: "F-150 Raptor", year: 2024, mileage: 5200,
    price: 78000, desired_price: 79500, car_type: "truck", listed_at: "2026-03-18T00:00:00Z",
    owner_type: "owned", status: "available", attachments: null,
    created_at: "2026-03-18T00:00:00Z", updated_at: null,
  },
  {
    id: "c6", brand: "Audi", model: "RS5", year: 2021, mileage: 41000,
    price: 52000, desired_price: null, car_type: "sports", listed_at: null,
    owner_type: "advisor", status: "sold", attachments: null,
    created_at: "2026-01-15T00:00:00Z", updated_at: "2026-03-05T00:00:00Z",
  },
];

export const mockUser = {
  name: "Steve",
  avatar_url: null,
};
