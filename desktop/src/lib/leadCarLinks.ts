import type { Lead } from "@/types/leads";

/** All car ids linked to a lead (legacy `car_id` plus optional ordered `car_ids`). */
export function getAllCarIdsForLead(lead: Lead): string[] {
  const ids: string[] = [];
  if (lead.car_ids?.length) ids.push(...lead.car_ids);
  if (lead.car_id) ids.push(lead.car_id);
  return Array.from(new Set(ids));
}

/** Merge additional car ids into a lead in one step (avoids stale state when linking several cars at once). */
export function mergeCarIdsIntoLead(
  lead: Lead,
  additionalCarIds: string[],
): Pick<Lead, "car_id" | "car_ids"> {
  const current = getAllCarIdsForLead(lead);
  const nextIds = Array.from(new Set([...current, ...additionalCarIds.filter(Boolean)]));
  return {
    car_id: nextIds[0] ?? null,
    car_ids: nextIds.length ? nextIds : null,
  };
}

/** Leads that reference this car (primary or secondary link). */
export function getLeadsForCar(carId: string, leads: Lead[]): Lead[] {
  return leads.filter((l) => getAllCarIdsForLead(l).includes(carId));
}
