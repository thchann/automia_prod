import type { Car } from "@/types/leads";

const THUMB_FALLBACK_COLORS = [
  "#5B8DEF",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#6366F1",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function formatCarPrice(price: number | null | undefined, locale: string): string {
  if (price == null || Number.isNaN(Number(price))) return "—";
  return `$${Number(price).toLocaleString(locale)}`;
}

export function formatCarMileage(mileage: number | null | undefined, locale: string): string {
  if (mileage == null || Number.isNaN(Number(mileage))) return "—";
  return `${Number(mileage).toLocaleString(locale)} km`;
}

export function getCarThumbnailImageUrl(car: Car): string | undefined {
  const attachments = car.attachments ?? [];
  const image = attachments.find((att) => att.type === "image" && att.url);
  return image?.url;
}

export function getCarThumbnailColor(car: Car): string {
  const color = car.color?.trim();
  if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
    return color;
  }
  const id = car.id?.trim() || "car";
  return THUMB_FALLBACK_COLORS[hashString(id) % THUMB_FALLBACK_COLORS.length];
}

export function formatCarTitle(car: Car): string {
  const brand = (car.brand ?? "").trim().toUpperCase() || "—";
  const model = (car.model ?? "").trim() || "—";
  const year = car.year ?? "—";
  return `${brand} ${model} ${year}`;
}
