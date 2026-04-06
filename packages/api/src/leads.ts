import { apiRequest, apiRequestBlob } from "./client";
import {
  leadCreateToWire,
  leadResponseFromWire,
  leadsListFromWire,
  leadUpdateToWire,
} from "./notesWire";
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
  const raw = await apiRequest<LeadsListResponse>(`/leads${q ? `?${q}` : ""}`);
  return leadsListFromWire(raw);
}

export async function getLead(id: string): Promise<LeadResponse> {
  const raw = await apiRequest<LeadResponse>(`/leads/${id}`);
  return leadResponseFromWire(raw);
}

export async function createLead(body: LeadCreate): Promise<LeadResponse> {
  const raw = await apiRequest<LeadResponse>("/leads", {
    method: "POST",
    body: JSON.stringify(leadCreateToWire(body)),
  });
  return leadResponseFromWire(raw);
}

export async function updateLead(id: string, body: LeadUpdate): Promise<LeadResponse> {
  const raw = await apiRequest<LeadResponse>(`/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(leadUpdateToWire(body)),
  });
  return leadResponseFromWire(raw);
}

export async function deleteLead(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/leads/${id}`, { method: "DELETE" });
}

/**
 * Backend contract (implement on your API):
 * - `GET /leads/:id/notes/export?format=pdf|docx` with `Authorization: Bearer …`
 * - Response: `Content-Disposition: attachment`, body = PDF or DOCX bytes.
 * - Server should load rich notes JSON (`notes_json` / Tiptap) for the lead and run conversion.
 */
export async function exportLeadNotes(leadId: string, format: "pdf" | "docx"): Promise<Blob> {
  const sp = new URLSearchParams({ format });
  return apiRequestBlob(`/leads/${leadId}/notes/export?${sp.toString()}`, { method: "GET" });
}
