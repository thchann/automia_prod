import { subDays, subMonths, subYears } from "date-fns";
import type { StatusActivityRange } from "@/components/StatusActivityChart";

/**
 * Whether `createdAt` falls in `[start, now]` for the given activity range.
 * Uses each record's `created_at` (lead / car).
 */
export function isCreatedWithinActivityRange(
  createdAt: string | null | undefined,
  range: StatusActivityRange,
  now: Date = new Date(),
): boolean {
  if (range === "All time") return true;
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  const end = now.getTime();
  let startMs: number;
  switch (range) {
    case "1d":
      startMs = subDays(now, 1).getTime();
      break;
    case "1w":
      startMs = subDays(now, 7).getTime();
      break;
    case "1m":
      startMs = subMonths(now, 1).getTime();
      break;
    case "3m":
      startMs = subMonths(now, 3).getTime();
      break;
    case "6m":
      startMs = subMonths(now, 6).getTime();
      break;
    case "1y":
      startMs = subYears(now, 1).getTime();
      break;
    default:
      return true;
  }
  return t >= startMs && t <= end;
}
