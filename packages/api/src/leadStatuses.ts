import { apiRequest } from "./client";
import type { LeadStatusResponse, LeadStatusesListResponse } from "./types";

export async function listLeadStatuses(): Promise<LeadStatusesListResponse> {
  return apiRequest<LeadStatusesListResponse>("/leads/statuses");
}

export async function createLeadStatus(body: {
  name: string;
  display_order?: number;
  color?: string | null;
}): Promise<LeadStatusResponse> {
  return apiRequest<LeadStatusResponse>("/leads/statuses", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      display_order: body.display_order ?? 0,
      ...(body.color !== undefined ? { color: body.color } : {}),
    }),
  });
}

export async function updateLeadStatus(
  id: string,
  body: { name?: string; display_order?: number | null; color?: string | null },
): Promise<LeadStatusResponse> {
  return apiRequest<LeadStatusResponse>(`/leads/statuses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLeadStatus(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/leads/statuses/${id}`, { method: "DELETE" });
}
