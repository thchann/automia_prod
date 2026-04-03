import { apiRequest } from "./client";
import type { OAuthAuthorizeUrlResponse } from "./types";

/**
 * Authenticated GET /oauth/instagram/authorize-url — returns the Instagram OAuth URL
 * (same destination the server would send in a 302 from GET /oauth/instagram/authorize).
 * SPAs use this because fetch can send Authorization; a top-level navigation to /authorize cannot.
 */
export async function getInstagramAuthorizeUrl(): Promise<OAuthAuthorizeUrlResponse> {
  return apiRequest<OAuthAuthorizeUrlResponse>("/oauth/instagram/authorize-url");
}

/**
 * Fetches the authorize URL with the current access token, then navigates to Instagram OAuth.
 * Call from the Automations “Connect” button after login.
 */
export async function startInstagramOAuth(): Promise<void> {
  const { url } = await getInstagramAuthorizeUrl();
  if (!url?.trim()) {
    throw new Error("Missing Instagram authorize URL");
  }
  if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
    globalThis.location.assign(url.trim());
  }
}
