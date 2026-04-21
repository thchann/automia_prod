import { ApiError, apiRequest } from "./client";
import type {
  AutomationConfigUpdateRequest,
  AutomationCreateRequest,
  AutomationItem,
  AutomationListResponse,
  AutomationMessagesListResponse,
  AutomationTypesListResponse,
  AutomationUpdateRequest,
} from "./types";

export async function listAutomationTypes(): Promise<AutomationTypesListResponse> {
  return apiRequest<AutomationTypesListResponse>("/automations/types");
}

export async function listAutomations(): Promise<AutomationListResponse> {
  return apiRequest<AutomationListResponse>("/automations");
}

export async function createAutomation(body: AutomationCreateRequest): Promise<AutomationItem> {
  return apiRequest<AutomationItem>("/automations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getAutomation(id: string): Promise<AutomationItem> {
  return apiRequest<AutomationItem>(`/automations/${id}`);
}

/** Message history for an automation. Returns an empty list if the server has no such route yet. */
export async function listAutomationMessages(automationId: string): Promise<AutomationMessagesListResponse> {
  try {
    return await apiRequest<AutomationMessagesListResponse>(`/automations/${automationId}/messages`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return { messages: [] };
    }
    throw e;
  }
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
