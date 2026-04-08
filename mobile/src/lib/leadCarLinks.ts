import type { Lead } from "@/types/models";

export function getAllCarIdsForLead(lead: Lead): string[] {
  const ids: string[] = [];
  if (lead.car_ids?.length) ids.push(...lead.car_ids);
  if (lead.car_id) ids.push(lead.car_id);
  return Array.from(new Set(ids));
}

export function getLeadsForCar(carId: string, leads: Lead[]): Lead[] {
  return leads.filter((l) => getAllCarIdsForLead(l).includes(carId));
}
