import type {
  CarResponse,
  CarUpdate,
  LeadResponse,
  LeadStatusResponse,
  LeadUpdate,
} from "@automia/api";
import type { Car, Lead, LeadStatus } from "@/types/models";

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
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

export function mapCarFromApi(c: CarResponse): Car {
  return {
    id: c.id,
    user_id: c.user_id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    mileage: c.mileage,
    price: num(c.price) as number | null,
    desired_price: num(c.desired_price) as number | null,
    car_type: c.car_type,
    listed_at: c.listed_at,
    transmission: c.transmission,
    color: c.color,
    fuel: c.fuel,
    manufacture_year: c.manufacture_year,
    vehicle_condition: c.vehicle_condition,
    owner_type: c.owner_type as Car["owner_type"],
    status: c.status as Car["status"],
    attachments: (c.attachments as Car["attachments"]) ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export function mapLeadFromApi(r: LeadResponse, statuses?: LeadStatus[]): Lead {
  const lt = r.lead_type as Lead["lead_type"];
  const status = statuses?.find((s) => s.id === r.status_id);
  return {
    id: r.id,
    platform_sender_id: r.platform_sender_id,
    lead_type: lt === "buyer" || lt === "seller" ? lt : "pending",
    source: r.source,
    status_id: r.status_id,
    car_id: r.car_id,
    ...(r.car_ids !== undefined ? { car_ids: r.car_ids } : {}),
    name: r.name,
    instagram_handle: r.instagram_handle,
    phone: r.phone,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    desired_budget_min: num(r.desired_budget_min),
    desired_budget_max: num(r.desired_budget_max),
    desired_mileage_max: r.desired_mileage_max,
    desired_year_min: r.desired_year_min,
    desired_year_max: r.desired_year_max,
    desired_make: r.desired_make,
    desired_model: r.desired_model,
    desired_car_type: r.desired_car_type,
    status,
  };
}

export function carToUpdatePayload(car: Car): CarUpdate {
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
    attachments: car.attachments as CarUpdate["attachments"],
  };
}

export function leadToUpdatePayload(lead: Lead): LeadUpdate {
  return {
    lead_type: lead.lead_type,
    status_id: lead.status_id,
    car_id: lead.car_id,
    ...(lead.car_ids !== undefined ? { car_ids: lead.car_ids } : {}),
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
