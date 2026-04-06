import type {
  CarCreate,
  CarResponse,
  CarUpdate,
  LeadCreate,
  LeadNotesDocumentJson,
  LeadResponse,
  LeadStatusResponse,
  LeadUpdate,
} from "@automia/api";
import type { Car, CarAttachment, Lead, LeadStatus } from "@/types/leads";

/**
 * Browser `blob:` URLs are not persistable. Sending them to the API can break backends or store junk.
 * - `null` / `[]` → persist as null (clear remote).
 * - only `blob:` entries → omit `attachments` on the payload (leave remote unchanged).
 * - mix → send only non-blob entries.
 */
function attachmentsForApiPayload(
  attachments: CarAttachment[] | null | undefined,
): CarAttachment[] | null | undefined {
  if (attachments === undefined) return undefined;
  if (attachments === null || attachments.length === 0) return null;
  const remote = attachments.filter((a) => {
    if (a.storage_key) return true;
    if (typeof a.url === "string" && a.url.length > 0 && !a.url.startsWith("blob:")) return true;
    return false;
  });
  if (remote.length === 0) return undefined;
  return remote;
}

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
    created_at: s.created_at,
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
    owner_type: c.owner_type as Car["owner_type"],
    status: c.status as Car["status"],
    attachments: (c.attachments as Car["attachments"]) ?? null,
    ...(c.notes !== undefined ? { notes: c.notes } : {}),
    ...(c.notes_document !== undefined
      ? { notes_document: c.notes_document as LeadNotesDocumentJson | null }
      : {}),
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export function mapLeadFromApi(
  r: LeadResponse,
  statuses?: LeadStatus[],
): Lead {
  const lt = r.lead_type as Lead["lead_type"];
  const status = statuses?.find((s) => s.id === r.status_id);
  return {
    id: r.id,
    user_id: r.user_id,
    platform_sender_id: r.platform_sender_id,
    lead_type: lt === "buyer" || lt === "seller" ? lt : "pending",
    source: r.source,
    status_id: r.status_id,
    car_id: r.car_id,
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
    ...(r.attachments !== undefined && r.attachments !== null
      ? { attachments: r.attachments as Lead["attachments"] }
      : {}),
    ...(r.notes_document !== undefined ? { notes_document: r.notes_document as LeadNotesDocumentJson | null } : {}),
    status,
  };
}

export function carToUpdatePayload(car: Car): CarUpdate {
  const payload: CarUpdate = {
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    desired_price: car.desired_price,
    car_type: car.car_type,
    listed_at: car.listed_at,
    owner_type: car.owner_type,
    status: car.status,
  };
  const att = attachmentsForApiPayload(car.attachments);
  if (att !== undefined) {
    payload.attachments = att as CarUpdate["attachments"];
  }
  if (car.notes !== undefined) {
    payload.notes = car.notes;
  }
  if (car.notes_document !== undefined) {
    payload.notes_document = car.notes_document as CarUpdate["notes_document"];
  }
  return payload;
}

export function leadToUpdatePayload(lead: Lead): LeadUpdate {
  const payload: LeadUpdate = {
    lead_type: lead.lead_type,
    status_id: lead.status_id,
    car_id: lead.car_id,
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
  if (lead.attachments !== undefined) {
    const att = attachmentsForApiPayload(lead.attachments);
    if (att !== undefined) {
      payload.attachments = att as LeadUpdate["attachments"];
    }
  }
  if (lead.notes_document !== undefined) {
    payload.notes_document = lead.notes_document as LeadUpdate["notes_document"];
  }
  return payload;
}

export function leadToCreatePayload(lead: Lead): LeadCreate {
  const lt = lead.lead_type;
  return {
    lead_type: lt === "buyer" || lt === "seller" ? lt : "pending",
    source: lead.source || "manual",
    platform_sender_id: lead.platform_sender_id?.trim() || `manual-${crypto.randomUUID()}`,
    status_id: lead.status_id,
    car_id: lead.car_id,
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
    ...(lead.notes_document !== undefined
      ? { notes_document: lead.notes_document as LeadCreate["notes_document"] }
      : {}),
  };
}

export function carToCreatePayload(car: Car): CarCreate {
  const payload: CarCreate = {
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    desired_price: car.desired_price,
    car_type: car.car_type,
    listed_at: car.listed_at,
    owner_type: car.owner_type,
    status: car.status,
  };
  const att = attachmentsForApiPayload(car.attachments);
  if (att !== undefined) {
    payload.attachments = att as CarCreate["attachments"];
  }
  if (car.notes !== undefined) {
    payload.notes = car.notes;
  }
  if (car.notes_document !== undefined) {
    payload.notes_document = car.notes_document as CarCreate["notes_document"];
  }
  return payload;
}
