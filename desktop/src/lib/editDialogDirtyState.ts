import type { JSONContent } from "@tiptap/core";
import type { Car, CarAttachment, Lead } from "@/types/leads";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDocJson(value: unknown): value is JSONContent {
  return isPlainObject(value) && value.type === "doc";
}

function legacyNotesToDoc(notes: string | null | undefined): JSONContent {
  if (!notes?.trim()) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const blocks = notes
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: blocks.map((text) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    })),
  };
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const next = normalizeValue(value[key]);
        if (next !== undefined) {
          acc[key] = next;
        }
        return acc;
      }, {});
  }

  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

export function normalizeNotesDocument(
  notesDocument: unknown | null | undefined,
  legacyNotes: string | null | undefined,
): JSONContent {
  if (isDocJson(notesDocument)) return notesDocument;
  return legacyNotesToDoc(legacyNotes);
}

export function serializeNotesDocument(
  notesDocument: unknown | null | undefined,
  legacyNotes: string | null | undefined,
): string {
  return stableSerialize(normalizeNotesDocument(notesDocument, legacyNotes));
}

export function normalizeAttachments(attachments: CarAttachment[] | null | undefined): CarAttachment[] {
  return attachments ?? [];
}

export function serializeAttachments(attachments: CarAttachment[] | null | undefined): string {
  return stableSerialize(normalizeAttachments(attachments));
}

export function getEditableLeadFormState(lead: Lead): Partial<Lead> {
  return {
    lead_type: lead.lead_type,
    source: lead.source,
    status_id: lead.status_id,
    car_id: lead.car_id,
    car_ids: lead.car_ids ?? null,
    name: lead.name,
    instagram_handle: lead.instagram_handle,
    phone: lead.phone,
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

export function serializeLeadFormState(leadForm: Partial<Lead>): string {
  return stableSerialize(leadForm);
}

export function getEditableCarFormState(car: Car): Partial<Car> {
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
  };
}

export function serializeCarFormState(carForm: Partial<Car>): string {
  return stableSerialize(carForm);
}
