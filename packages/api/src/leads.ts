import { apiRequest } from "./client";
import type { LeadCreate, LeadResponse, LeadsListResponse, LeadUpdate } from "./types";

export type ListLeadsParams = {
  source?: string;
  lead_type?: string;
  status_id?: string;
  car_id?: string;
  limit?: number;
  offset?: number;
};

export async function listLeads(params: ListLeadsParams = {}): Promise<LeadsListResponse> {
  const sp = new URLSearchParams();
  if (params.source) sp.set("source", params.source);
  if (params.lead_type) sp.set("lead_type", params.lead_type);
  if (params.status_id) sp.set("status_id", params.status_id);
  if (params.car_id) sp.set("car_id", params.car_id);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const q = sp.toString();
  return apiRequest<LeadsListResponse>(`/leads${q ? `?${q}` : ""}`);
}

export async function getLead(id: string): Promise<LeadResponse> {
  return apiRequest<LeadResponse>(`/leads/${id}`);
}

export async function createLead(body: LeadCreate): Promise<LeadResponse> {
  return apiRequest<LeadResponse>("/leads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLead(id: string, body: LeadUpdate): Promise<LeadResponse> {
  return apiRequest<LeadResponse>(`/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLead(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/leads/${id}`, { method: "DELETE" });
}
