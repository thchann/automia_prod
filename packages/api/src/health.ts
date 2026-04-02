import { apiRequest } from "./client";

export async function getHealth(): Promise<{ status?: string } | unknown> {
  return apiRequest("/health", { skipAuth: true });
}
