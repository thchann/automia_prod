import { ApiError } from "./client";
import { getApiBaseUrl } from "./env";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./tokens";
import type { TokenResponse } from "./types";

/** Only this route is available; must use fetch `redirect: "manual"` — never default follow (CORS on Instagram). */
const OAUTH_INSTAGRAM_AUTHORIZE = "/oauth/instagram/authorize";

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

function resolveLocation(loc: string, apiBase: string): string {
  try {
    return new URL(loc.trim(), apiBase).href;
  } catch {
    return loc.trim();
  }
}

async function fetchAuthorizeManual(accessToken: string): Promise<Response> {
  return fetch(joinUrl(getApiBaseUrl(), OAUTH_INSTAGRAM_AUTHORIZE), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });
}

/**
 * GET /oauth/instagram/authorize with Bearer + redirect: "manual" → read `Location` → `window.location.href`.
 * Do not use `apiRequest` (default redirect follows to api.instagram.com → CORS).
 * API must allow your web origin and expose `Location` (CORSMiddleware expose_headers).
 */
export async function startInstagramOAuth(): Promise<void> {
  let token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  let res = await fetchAuthorizeManual(token);

  if (res.status === 401) {
    await refreshAccessToken();
    token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    res = await fetchAuthorizeManual(token);
  }

  const isRedirect =
    res.status === 302 || res.status === 301 || res.status === 307 || res.status === 308;
  if (isRedirect) {
    const loc = res.headers.get("Location");
    if (loc) {
      const target = resolveLocation(loc, getApiBaseUrl());
      if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
        globalThis.location.href = target;
        return;
      }
    }
    throw new Error(
      "Instagram OAuth: redirect had no readable Location. Ensure CORS exposes Location and your site origin is allowed.",
    );
  }

  if (res.type === "opaqueredirect" || res.status === 0) {
    throw new Error(
      "Instagram OAuth: opaque redirect — cannot read Location. Ensure Access-Control-Expose-Headers includes Location.",
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

  throw new Error(`Unexpected response from ${OAUTH_INSTAGRAM_AUTHORIZE} (${res.status})`);
}
