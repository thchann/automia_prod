import type { Lead } from "@/types/leads";

/** All car ids linked to a lead (legacy `car_id` plus optional ordered `car_ids`). */
export function getAllCarIdsForLead(lead: Lead): string[] {
  const ids: string[] = [];
  if (lead.car_ids?.length) ids.push(...lead.car_ids);
  if (lead.car_id) ids.push(lead.car_id);
  return Array.from(new Set(ids));
}

/** Leads that reference this car (primary or secondary link). */
export function getLeadsForCar(carId: string, leads: Lead[]): Lead[] {
  return leads.filter((l) => getAllCarIdsForLead(l).includes(carId));
}
