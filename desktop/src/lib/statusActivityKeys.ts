import { normalizeLeadStatusColor } from "@/lib/leadStatusColors";

/** Stable empty set for controlled StatusActivityChart when `selectedKeys` is omitted. */
export const EMPTY_STATUS_ACTIVITY_KEYS = new Set<string>();

/** Same key logic as StatusActivityChart item normalization — use when filtering parent rows. */
export function statusActivityKey(
  statusName: string | undefined,
  color: string | null | undefined,
): string {
  const normalized = normalizeLeadStatusColor(color ?? undefined);
  return (statusName ?? normalized).toLowerCase();
}
