import { apiRequest } from "./client";
import type { OAuthAuthorizeUrlResponse } from "./types";

/**
 * Instagram OAuth for SPAs:
 *
 * 1. GET /oauth/instagram/authorize-url with Bearer token → 200 JSON `{ url }` (same URL the 302 route would use).
 * 2. `window.location.assign(url)` — full top-level navigation to Instagram.
 *
 * We do not fetch Instagram inside `fetch` (no redirect: follow to api.instagram.com → CORS errors).
 * Bearer tokens are not sent on plain navigation, so we never use `location = .../oauth/instagram/authorize` alone.
 */
export async function startInstagramOAuth(): Promise<void> {
  const { url } = await apiRequest<OAuthAuthorizeUrlResponse>("/oauth/instagram/authorize");
  if (!url?.trim()) {
    throw new Error("Missing Instagram authorize URL");
  }
  if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
    globalThis.location.assign(url.trim());
  }
}
