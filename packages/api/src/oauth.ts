import { ApiError } from "./client";
import { getApiBaseUrl } from "./env";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./tokens";
import type { TokenResponse } from "./types";

function joinUrl(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${p}`;
}

async function parseBodyDetail(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<void> {
  const rt = getRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const base = getApiBaseUrl();
  const res = await fetch(joinUrl(base, "/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) {
    clearAuthTokens();
    throw new ApiError(res.status, "Session expired", await parseBodyDetail(res));
  }
  const data = (await res.json()) as TokenResponse;
  setAuthTokens(data.access_token, data.refresh_token);
}

async function fetchInstagramAuthorizeResponse(accessToken: string): Promise<Response> {
  const base = getApiBaseUrl();
  return fetch(joinUrl(base, "/oauth/instagram/authorize"), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });
}

function resolveRedirectTarget(location: string, apiBase: string): string {
  try {
    return new URL(location, apiBase).href;
  } catch {
    return location;
  }
}

/**
 * Authenticated GET /oauth/instagram/authorize (302 → Instagram).
 * Uses fetch with redirect: "manual" so the browser can read `Location` and navigate.
 * Backend CORS must expose the `Location` header (see CORSMiddleware expose_headers).
 */
export async function startInstagramOAuth(): Promise<void> {
  let token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  let res = await fetchInstagramAuthorizeResponse(token);

  if (res.status === 401) {
    await refreshAccessToken();
    token = getAccessToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    res = await fetchInstagramAuthorizeResponse(token);
  }

  if (res.status === 302 || res.status === 301 || res.status === 307 || res.status === 308) {
    const loc = res.headers.get("Location");
    if (loc) {
      const target = resolveRedirectTarget(loc.trim(), getApiBaseUrl());
      if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
        globalThis.location.assign(target);
        return;
      }
    }
    throw new Error(
      "Instagram OAuth redirect missing Location header. Ensure the API exposes Location in CORS (expose_headers).",
    );
  }

  if (!res.ok) {
    const detail = await parseBodyDetail(res);
    const msg =
      typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, msg || "Request failed", detail);
  }

  throw new Error(`Unexpected response from /oauth/instagram/authorize (${res.status})`);
}
