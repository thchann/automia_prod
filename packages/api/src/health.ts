import { ApiError, apiRequest } from "./client";
import { getHealthCheckPingUrl } from "./env";

export async function getHealth(): Promise<{ status?: string } | unknown> {
  return apiRequest("/health", { skipAuth: true });
}

/** GET the public site URL for a simple connectivity check (default https://www.automiacars.com/). */
export async function pingSiteHealth(): Promise<void> {
  const url = getHealthCheckPingUrl();
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
  } catch {
    throw new ApiError(0, "Could not reach site");
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText || "Health check failed");
  }
}
