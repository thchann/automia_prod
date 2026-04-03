import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";

const OAUTH_INSTAGRAM_AUTHORIZE_URL = "/oauth/instagram/authorize-url";

function joinBasePath(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${p}`;
}

/**
 * Connect Instagram: GET authorize-url with Bearer → JSON → full-page navigation.
 */
export async function startInstagramOAuth(): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const res = await fetch(joinBasePath(getApiBaseUrl(), OAUTH_INSTAGRAM_AUTHORIZE_URL), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Instagram connect failed (${res.status})`);
  }

  const data = (await res.json()) as { authorize_url?: string; url?: string };
  const authorizeUrl = data.authorize_url ?? data.url; // url: older API responses
  if (!authorizeUrl?.trim()) {
    throw new Error("Missing authorize_url in response");
  }

  if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
    globalThis.location.href = authorizeUrl.trim();
  }
}
