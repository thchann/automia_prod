import { Lead, LeadStatus, Car } from "@/types/leads";

export const defaultStatuses: LeadStatus[] = [
  { id: "s1", name: "New", display_order: 0, color: "#3B82F6", is_default: true, created_at: "2024-01-01" },
  { id: "s2", name: "Contacted", display_order: 1, color: "#F59E0B", is_default: false, created_at: "2024-01-01" },
  { id: "s3", name: "Qualified", display_order: 2, color: "#10B981", is_default: false, created_at: "2024-01-01" },
  { id: "s4", name: "Closed", display_order: 3, color: "#6B7280", is_default: false, created_at: "2024-01-01" },
];

export const mockCars: Car[] = [
  { id: "c1", brand: "Tesla", model: "Model 3", year: 2024, mileage: 5000, price: 42000, desired_price: 40000, car_type: "sedan", listed_at: null, owner_type: "owned", status: "available", attachments: null, created_at: "2024-01-01", updated_at: null },
  { id: "c2", brand: "BMW", model: "X5", year: 2023, mileage: 12000, price: 65000, desired_price: 62000, car_type: "suv", listed_at: null, owner_type: "owned", status: "available", attachments: null, created_at: "2024-01-01", updated_at: null },
  { id: "c3", brand: "Ford", model: "Mustang", year: 2024, mileage: 3000, price: 55000, desired_price: null, car_type: "sports", listed_at: null, owner_type: "owned", status: "available", attachments: null, created_at: "2024-01-01", updated_at: null },
  { id: "c4", brand: "Toyota", model: "Camry", year: 2023, mileage: 18000, price: 28000, desired_price: 26000, car_type: "sedan", listed_at: null, owner_type: "owned", status: "available", attachments: null, created_at: "2024-02-01", updated_at: null },
  { id: "c5", brand: "Mercedes", model: "C-Class", year: 2024, mileage: 8000, price: 48000, desired_price: 46000, car_type: "sedan", listed_at: null, owner_type: "owned", status: "available", attachments: null, created_at: "2024-02-15", updated_at: null },
];

export const mockLeads: Lead[] = [
  { id: "l1", lead_type: "buyer", source: "instagram", platform_sender_id: "ig_1", status_id: "s1", car_id: "c1", name: "Esther Kiehn", instagram_handle: "@esther_k", phone: "+1 555-0101", notes: null, created_at: "2024-12-17", updated_at: null },
  { id: "l2", lead_type: "buyer", source: "instagram", platform_sender_id: "ig_2", status_id: "s1", car_id: "c2", name: "Denise Kuhn", instagram_handle: "@denise.kuhn", phone: "+1 555-0102", notes: null, created_at: "2024-12-16", updated_at: null },
  { id: "l3", lead_type: "seller", source: "manual", platform_sender_id: "m_3", status_id: "s3", car_id: "c3", name: "Clint Hoppe", instagram_handle: "@clint_h", phone: "+1 555-0103", notes: null, created_at: "2024-12-16", updated_at: null },
  { id: "l4", lead_type: "buyer", source: "website", platform_sender_id: "w_4", status_id: "s2", car_id: "c4", name: "Darin Deckow", instagram_handle: "@darin_d", phone: "+1 555-0104", notes: null, created_at: "2024-12-16", updated_at: null },
  { id: "l5", lead_type: "buyer", source: "instagram", platform_sender_id: "ig_5", status_id: "s3", car_id: "c1", name: "Jacquelyn Robel", instagram_handle: "@jacquelyn.r", phone: "+1 555-0105", notes: null, created_at: "2024-12-15", updated_at: null },
  { id: "l6", lead_type: "seller", source: "manual", platform_sender_id: "m_6", status_id: "s3", car_id: "c5", name: "Clint Hoppe", instagram_handle: "@clint_h", phone: "+1 555-0106", notes: null, created_at: "2024-12-16", updated_at: null },
  { id: "l7", lead_type: "buyer", source: "instagram", platform_sender_id: "ig_7", status_id: "s4", car_id: "c2", name: "Erin Bins", instagram_handle: "@erin.bins", phone: "+1 555-0107", notes: null, created_at: "2024-12-16", updated_at: null },
  { id: "l8", lead_type: "pending", source: "instagram", platform_sender_id: "ig_8", status_id: "s2", car_id: null, name: "Gretchen Quitz", instagram_handle: "@gretchen_q", phone: "+1 555-0108", notes: null, created_at: "2024-12-14", updated_at: null },
  { id: "l9", lead_type: "buyer", source: "website", platform_sender_id: "w_9", status_id: "s1", car_id: "c3", name: "Stewart Kulas", instagram_handle: "@stewart_k", phone: "+1 555-0109", notes: null, created_at: "2024-12-13", updated_at: null },
];
