import type { Car, Lead, LeadStatus } from "@/types/leads";
import { newDraftRecordId } from "./draftIds";

export function buildDraftLead(statuses: LeadStatus[], newLeadLabel: string): Lead {
  const now = new Date().toISOString();
  return {
    id: newDraftRecordId(),
    lead_type: "pending",
    source: "manual",
    platform_sender_id: `manual-${crypto.randomUUID()}`,
    status_id: statuses[0]?.id ?? null,
    car_id: null,
    name: newLeadLabel,
    instagram_handle: null,
    phone: null,
    notes: null,
    notes_document: null,
    attachments: null,
    created_at: now,
    updated_at: null,
    desired_budget_min: null,
    desired_budget_max: null,
    desired_mileage_max: null,
    desired_year_min: null,
    desired_year_max: null,
    desired_make: null,
    desired_model: null,
    desired_car_type: null,
  };
}

export function buildDraftCar(tx: (en: string, es: string) => string): Car {
  const now = new Date().toISOString();
  return {
    id: newDraftRecordId(),
    user_id: "",
    brand: tx("New", "Nuevo"),
    model: tx("Car", "Auto"),
    year: new Date().getFullYear(),
    mileage: 0,
    price: 0,
    desired_price: null,
    car_type: "sedan",
    listed_at: now,
    transmission: null,
    color: null,
    fuel: null,
    manufacture_year: null,
    vehicle_condition: null,
    owner_type: "owned",
    status: "available",
    attachments: null,
    created_at: now,
    updated_at: null,
  };
}
