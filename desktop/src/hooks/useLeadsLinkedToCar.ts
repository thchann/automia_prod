import { useQuery } from "@tanstack/react-query";
import { listLeadsForCar } from "@automia/api";
import type { LeadStatus } from "@/types/leads";
import { mapLeadFromApi } from "@/lib/apiMappers";
import { isDraftRecordId } from "@/lib/draftIds";

/** React Query key for `GET /cars/:id/leads` (junction). Invalidate `["leads-for-car"]` after link changes. */
export const leadsForCarQueryKey = (carId: string) => ["leads-for-car", carId] as const;

export function useLeadsLinkedToCar(
  carId: string | null | undefined,
  options: { enabled?: boolean; statuses?: LeadStatus[] },
) {
  const enabled =
    (options.enabled ?? true) && !!carId && typeof carId === "string" && !isDraftRecordId(carId);

  return useQuery({
    queryKey: leadsForCarQueryKey(carId ?? ""),
    queryFn: async () => {
      const raw = await listLeadsForCar(carId as string);
      return raw.map((r) => mapLeadFromApi(r, options.statuses));
    },
    enabled,
  });
}
