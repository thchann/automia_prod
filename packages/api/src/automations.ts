import { apiRequest } from "./client";
import type {
  AutomationConfigUpdateRequest,
  AutomationItem,
  AutomationListResponse,
  AutomationTypesListResponse,
  AutomationUpdateRequest,
} from "./types";

export async function listAutomationTypes(): Promise<AutomationTypesListResponse> {
  return apiRequest<AutomationTypesListResponse>("/automations/types");
}

export async function listAutomations(): Promise<AutomationListResponse> {
  return apiRequest<AutomationListResponse>("/automations");
}

export async function getAutomation(id: string): Promise<AutomationItem> {
  return apiRequest<AutomationItem>(`/automations/${id}`);
}

export async function updateAutomation(id: string, body: AutomationUpdateRequest): Promise<AutomationItem> {
  return apiRequest<AutomationItem>(`/automations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function updateAutomationConfig(
  id: string,
  body: AutomationConfigUpdateRequest,
): Promise<AutomationItem> {
  return apiRequest<AutomationItem>(`/automations/${id}/config`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAutomation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/automations/${id}`, { method: "DELETE" });
}
