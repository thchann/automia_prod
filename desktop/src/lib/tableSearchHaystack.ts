import { format } from "date-fns";
import type { Car, Lead } from "@/types/leads";

function formatShortDate(s: string | null) {
  if (!s) return "";
  try {
    return format(new Date(s), "dd MMM yyyy");
  } catch {
    return "";
  }
}

/** Shared with table display and search indexing. */
export function summarizeBuyerCriteria(lead: Lead): string {
  if (lead.lead_type !== "buyer") return "—";
  const parts: string[] = [];
  const hasBudget =
    lead.desired_budget_min != null || lead.desired_budget_max != null;
  if (hasBudget) {
    const min =
      lead.desired_budget_min != null
        ? `$${Number(lead.desired_budget_min).toLocaleString()}`
        : "—";
    const max =
      lead.desired_budget_max != null
        ? `$${Number(lead.desired_budget_max).toLocaleString()}`
        : "—";
    parts.push(`${min}–${max}`);
  }
  const makeModel = [lead.desired_make, lead.desired_model]
    .filter(Boolean)
    .join(" ");
  if (makeModel) parts.push(makeModel);
  if (lead.desired_car_type) parts.push(lead.desired_car_type);
  const hasYears =
    lead.desired_year_min != null || lead.desired_year_max != null;
  if (hasYears) {
    parts.push(
      `Years ${lead.desired_year_min ?? "—"}–${lead.desired_year_max ?? "—"}`,
    );
  }
  if (lead.desired_mileage_max != null) {
    parts.push(`≤${lead.desired_mileage_max.toLocaleString()} mi`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function buildLeadSearchHaystack(
  lead: Lead,
  car: Car | undefined,
  statusName: string,
): string {
  const carLine = car ? `${car.year} ${car.brand} ${car.model}` : "";
  const parts = [
    lead.name,
    lead.instagram_handle,
    lead.phone,
    lead.lead_type,
    carLine,
    summarizeBuyerCriteria(lead),
    lead.notes,
    lead.source,
    statusName,
    formatShortDate(lead.created_at),
    formatShortDate(lead.updated_at),
  ];
  return parts.filter((p) => p != null && String(p).trim() !== "").join(" ");
}

export function buildCarSearchHaystack(car: Car): string {
  const parts = [
    car.brand,
    car.model,
    String(car.year),
    car.mileage != null ? String(car.mileage) : "",
    car.price != null ? String(car.price) : "",
    car.desired_price != null ? String(car.desired_price) : "",
    car.car_type,
    car.owner_type,
    car.status,
    formatShortDate(car.listed_at),
    formatShortDate(car.created_at),
  ];
  return parts.filter((p) => p != null && String(p).trim() !== "").join(" ");
}

/** Columns used for fuzzy search scope (matches table headers, minus selection/actions). */
export const LEAD_SEARCH_COLUMN_IDS = [
  "name",
  "instagram",
  "phone",
  "leadType",
  "car",
  "buyerCriteria",
  "status",
  "source",
  "notes",
  "created",
  "updated",
] as const;
export type LeadSearchColumnId = (typeof LEAD_SEARCH_COLUMN_IDS)[number];

export const LEAD_SEARCH_COLUMN_LABELS: Record<LeadSearchColumnId, string> = {
  name: "Name",
  instagram: "Instagram",
  phone: "Phone",
  leadType: "Lead type",
  car: "Car",
  buyerCriteria: "Buyer criteria",
  status: "Status",
  source: "Source",
  notes: "Notes",
  created: "Created",
  updated: "Updated",
};

export function defaultLeadSearchColumns(): Set<LeadSearchColumnId> {
  return new Set(LEAD_SEARCH_COLUMN_IDS);
}

export function buildLeadSearchHaystackForColumns(
  lead: Lead,
  car: Car | undefined,
  statusName: string,
  active: Set<LeadSearchColumnId>,
): string {
  const parts: string[] = [];
  if (active.has("name") && lead.name) parts.push(lead.name);
  if (active.has("instagram") && lead.instagram_handle)
    parts.push(lead.instagram_handle);
  if (active.has("phone") && lead.phone) parts.push(lead.phone);
  if (active.has("leadType") && lead.lead_type) parts.push(lead.lead_type);
  if (active.has("car") && car)
    parts.push(`${car.year} ${car.brand} ${car.model}`);
  if (active.has("buyerCriteria")) {
    const b = summarizeBuyerCriteria(lead);
    if (b && b !== "—") parts.push(b);
  }
  if (active.has("status") && statusName) parts.push(statusName);
  if (active.has("source") && lead.source) parts.push(lead.source);
  if (active.has("notes") && lead.notes) parts.push(lead.notes);
  if (active.has("created"))
    parts.push(formatShortDate(lead.created_at));
  if (active.has("updated"))
    parts.push(formatShortDate(lead.updated_at));
  return parts.join(" ");
}

export const CAR_SEARCH_COLUMN_IDS = [
  "brand",
  "model",
  "year",
  "mileage",
  "price",
  "desired",
  "carType",
  "listed",
  "owner",
  "status",
  "added",
] as const;
export type CarSearchColumnId = (typeof CAR_SEARCH_COLUMN_IDS)[number];

export const CAR_SEARCH_COLUMN_LABELS: Record<CarSearchColumnId, string> = {
  brand: "Brand",
  model: "Model",
  year: "Year",
  mileage: "Mileage",
  price: "Price",
  desired: "Desired",
  carType: "Car type",
  listed: "Listed",
  owner: "Owner",
  status: "Status",
  added: "Added",
};

export function defaultCarSearchColumns(): Set<CarSearchColumnId> {
  return new Set(CAR_SEARCH_COLUMN_IDS);
}

export function buildCarSearchHaystackForColumns(
  car: Car,
  active: Set<CarSearchColumnId>,
): string {
  const parts: string[] = [];
  if (active.has("brand")) parts.push(car.brand);
  if (active.has("model")) parts.push(car.model);
  if (active.has("year")) parts.push(String(car.year));
  if (active.has("mileage") && car.mileage != null)
    parts.push(String(car.mileage));
  if (active.has("price") && car.price != null)
    parts.push(String(car.price));
  if (active.has("desired") && car.desired_price != null)
    parts.push(String(car.desired_price));
  if (active.has("carType") && car.car_type) parts.push(car.car_type);
  if (active.has("listed"))
    parts.push(formatShortDate(car.listed_at));
  if (active.has("owner")) parts.push(car.owner_type);
  if (active.has("status")) parts.push(car.status);
  if (active.has("added"))
    parts.push(formatShortDate(car.created_at));
  return parts.filter((p) => p.trim() !== "").join(" ");
}
