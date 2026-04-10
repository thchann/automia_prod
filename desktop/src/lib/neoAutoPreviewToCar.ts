import type { CarCreate } from "@automia/api";
import type { Car, CarAttachment } from "@/types/leads";
import { newDraftRecordId } from "./draftIds";

/** Turn normalized NeoAuto `car_preview` (`CarCreate`) into a draft `Car` for `CarEditDialog`. */
export function neoAutoPreviewToDraftCar(preview: CarCreate): Car {
  const now = new Date().toISOString();
  return {
    id: newDraftRecordId(),
    user_id: "",
    brand: preview.brand,
    model: preview.model,
    year: preview.year,
    mileage: preview.mileage,
    price: preview.price,
    desired_price: preview.desired_price,
    car_type: preview.car_type,
    listed_at: preview.listed_at,
    transmission: preview.transmission ?? null,
    color: preview.color ?? null,
    fuel: preview.fuel ?? null,
    manufacture_year: preview.manufacture_year ?? null,
    vehicle_condition: preview.vehicle_condition ?? null,
    owner_type: preview.owner_type as Car["owner_type"],
    status: preview.status as Car["status"],
    attachments: (preview.attachments as CarAttachment[] | null) ?? null,
    ...(preview.notes !== undefined ? { notes: preview.notes } : {}),
    ...(preview.notes_document !== undefined
      ? { notes_document: preview.notes_document }
      : {}),
    created_at: now,
    updated_at: null,
  };
}
