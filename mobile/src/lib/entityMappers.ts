import type {
  CarResponse,
  LeadCreate,
  LeadNotesDocumentJson,
  LeadResponse,
  LeadStatusResponse,
  LeadUpdate,
  CarCreate,
  CarUpdate,
} from "@automia/api";
import type { Car, Lead, LeadStatus } from "@/types/models";

function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function mapCarFromApi(c: CarResponse): Car {
  const attachments = c.attachments as Car["attachments"];
  return {
    id: c.id,
    user_id: c.user_id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    mileage: c.mileage,
    price: toNum(c.price),
    desired_price: toNum(c.desired_price),
    car_type: c.car_type,
    listed_at: c.listed_at,
    transmission: c.transmission,
    color: c.color,
    fuel: c.fuel,
    manufacture_year: c.manufacture_year,
    vehicle_condition: c.vehicle_condition,
    owner_type: c.owner_type as Car["owner_type"],
    status: c.status as Car["status"],
    attachments,
    ...(c.notes !== undefined ? { notes: c.notes } : {}),
    ...(c.notes_document !== undefined
      ? { notes_document: c.notes_document as LeadNotesDocumentJson | null }
      : {}),
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export function mapLeadFromApi(l: LeadResponse): Lead {
  return {
    id: l.id,
    name: l.name,
    lead_type: l.lead_type as Lead["lead_type"],
    source: l.source,
    instagram_handle: l.instagram_handle,
    phone: l.phone,
    notes: l.notes,
    ...(l.notes_document !== undefined
      ? { notes_document: l.notes_document as LeadNotesDocumentJson | null }
      : {}),
    status_id: l.status_id,
    car_id: l.car_id,
    desired_budget_min: toNum(l.desired_budget_min),
    desired_budget_max: toNum(l.desired_budget_max),
    desired_mileage_max: l.desired_mileage_max,
    desired_year_min: l.desired_year_min,
    desired_year_max: l.desired_year_max,
    desired_make: l.desired_make,
    desired_model: l.desired_model,
    desired_car_type: l.desired_car_type,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
}

export function mapStatusFromApi(s: LeadStatusResponse): LeadStatus {
  return {
    id: s.id,
    name: s.name,
    display_order: s.display_order,
    color: null,
    is_default: false,
  };
}

export function leadToApiUpdate(lead: Lead): LeadUpdate {
  return {
    lead_type: lead.lead_type,
    status_id: lead.status_id,
    car_id: lead.car_id,
    name: lead.name,
    instagram_handle: lead.instagram_handle,
    phone: lead.phone,
    notes: lead.notes,
    ...(lead.notes_document !== undefined ? { notes_document: lead.notes_document } : {}),
    desired_budget_min: lead.desired_budget_min,
    desired_budget_max: lead.desired_budget_max,
    desired_mileage_max: lead.desired_mileage_max,
    desired_year_min: lead.desired_year_min,
    desired_year_max: lead.desired_year_max,
    desired_make: lead.desired_make,
    desired_model: lead.desired_model,
    desired_car_type: lead.desired_car_type,
  };
}

export function leadFormToCreate(lead: Lead): LeadCreate {
  const platform_sender_id =
    lead.platform_sender_id?.trim() ||
    (lead.source !== "manual"
      ? lead.instagram_handle?.replace(/^@/, "") || `ig_${crypto.randomUUID()}`
      : `manual_${crypto.randomUUID()}`);
  return {
    lead_type: lead.lead_type,
    source: lead.source,
    platform_sender_id,
    status_id: lead.status_id ?? undefined,
    name: lead.name,
    instagram_handle: lead.instagram_handle,
    phone: lead.phone,
    notes: lead.notes,
    desired_budget_min: lead.desired_budget_min,
    desired_budget_max: lead.desired_budget_max,
    desired_mileage_max: lead.desired_mileage_max,
    desired_year_min: lead.desired_year_min,
    desired_year_max: lead.desired_year_max,
    desired_make: lead.desired_make,
    desired_model: lead.desired_model,
    desired_car_type: lead.desired_car_type,
  };
}

export function carToApiUpdate(car: Car): CarUpdate {
  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    desired_price: car.desired_price,
    car_type: car.car_type,
    listed_at: car.listed_at,
    transmission: car.transmission,
    color: car.color,
    fuel: car.fuel,
    manufacture_year: car.manufacture_year,
    vehicle_condition: car.vehicle_condition,
    owner_type: car.owner_type,
    status: car.status,
    // Important: send `null` when the user removes all attachments so the backend clears JSONB.
    attachments: car.attachments ?? null,
    ...(car.notes !== undefined ? { notes: car.notes } : {}),
    ...(car.notes_document !== undefined ? { notes_document: car.notes_document } : {}),
  };
}

export function carFormToCreate(car: Car): CarCreate {
  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    desired_price: car.desired_price,
    car_type: car.car_type,
    listed_at: car.listed_at,
    transmission: car.transmission,
    color: car.color,
    fuel: car.fuel,
    manufacture_year: car.manufacture_year,
    vehicle_condition: car.vehicle_condition,
    owner_type: car.owner_type,
    status: car.status,
    attachments: car.attachments ?? null,
    ...(car.notes !== undefined ? { notes: car.notes } : {}),
    ...(car.notes_document !== undefined ? { notes_document: car.notes_document } : {}),
  };
}
