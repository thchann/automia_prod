import { apiRequest } from "./client";
import { carResponseFromWire, leadResponseFromWire } from "./notesWire";
import type {
  CarLeadLinkCreateRequest,
  CarResponse,
  LeadCarLinkCreateRequest,
  LeadResponse,
} from "./types";

/** `GET /cars/{car_id}/leads` — leads linked to a car (junction table). */
export async function listLeadsForCar(carId: string): Promise<LeadResponse[]> {
  const raw = await apiRequest<LeadResponse[]>(
    `/cars/${encodeURIComponent(carId)}/leads`,
  );
  return raw.map((row) => leadResponseFromWire(row));
}

/** `POST /cars/{car_id}/leads` */
export async function addCarLeadLink(
  carId: string,
  body: CarLeadLinkCreateRequest,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/cars/${encodeURIComponent(carId)}/leads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** `DELETE /cars/{car_id}/leads/{lead_id}` */
export async function removeCarLeadLink(
  carId: string,
  leadId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/cars/${encodeURIComponent(carId)}/leads/${encodeURIComponent(leadId)}`,
    { method: "DELETE" },
  );
}

/** `GET /leads/{lead_id}/cars` — cars linked to a lead (ordered by link `created_at` on the server). */
export async function listCarsForLead(leadId: string): Promise<CarResponse[]> {
  const raw = await apiRequest<CarResponse[]>(
    `/leads/${encodeURIComponent(leadId)}/cars`,
  );
  return raw.map((row) => carResponseFromWire(row));
}

/** `POST /leads/{lead_id}/cars` */
export async function addLeadCarLink(
  leadId: string,
  body: LeadCarLinkCreateRequest,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/leads/${encodeURIComponent(leadId)}/cars`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** `DELETE /leads/{lead_id}/cars/{car_id}` */
export async function removeLeadCarLink(
  leadId: string,
  carId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/leads/${encodeURIComponent(leadId)}/cars/${encodeURIComponent(carId)}`,
    { method: "DELETE" },
  );
}
