import { getApiBaseUrl } from "./env";
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./tokens";
import type { TokenResponse } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function joinUrl(base: string, path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
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

function formatDetailMessage(detail: unknown): string | undefined {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!detail || typeof detail !== "object") return undefined;

  const rec = detail as Record<string, unknown>;
  const nested = rec.detail;

  if (typeof nested === "string" && nested.trim()) return nested;

  if (Array.isArray(nested)) {
    const parts = nested
      .map((item) => {
        if (!item || typeof item !== "object") return String(item);
        const row = item as Record<string, unknown>;
        const msg = typeof row.msg === "string" ? row.msg : undefined;
        const loc = Array.isArray(row.loc)
          ? row.loc
              .map((v) => String(v))
              .filter(Boolean)
              .join(".")
          : undefined;
        if (msg && loc) return `${loc}: ${msg}`;
        return msg ?? undefined;
      })
      .filter((v): v is string => !!v && v.trim().length > 0);
    if (parts.length > 0) return parts.join("; ");
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return undefined;
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

export type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  _retry?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { skipAuth, _retry, ...init } = options;
  const base = getApiBaseUrl();
  const url = joinUrl(base, path);

  const headers = new Headers(init.headers);
  const body = init.body;
  if (
    body &&
    typeof body === "string" &&
    !headers.has("Content-Type") &&
    !headers.has("content-type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !skipAuth && !_retry) {
    const isAuthPath =
      path.includes("/auth/login") ||
      path.includes("/auth/register") ||
      path.includes("/auth/refresh");
    if (!isAuthPath) {
      try {
        await refreshAccessToken();
        return apiRequest<T>(path, { ...options, _retry: true });
      } catch {
        throw new ApiError(401, "Unauthorized", await parseBodyDetail(res));
      }
    }
  }

  if (!res.ok) {
    const detail = await parseBodyDetail(res);
    const msg = formatDetailMessage(detail) ?? res.statusText;
    throw new ApiError(res.status, msg || "Request failed", detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers.get("content-type");
  if (!ct?.includes("application/json")) {
    return (await res.text()) as T;
  }

  return res.json() as Promise<T>;
}

/** Authenticated fetch returning a binary body (e.g. PDF export). */
export async function apiRequestBlob(path: string, options: ApiRequestOptions = {}): Promise<Blob> {
  const { skipAuth, _retry, ...init } = options;
  const base = getApiBaseUrl();
  const url = joinUrl(base, path);

  const headers = new Headers(init.headers);
  const body = init.body;
  if (
    body &&
    typeof body === "string" &&
    !headers.has("Content-Type") &&
    !headers.has("content-type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !skipAuth && !_retry) {
    const isAuthPath =
      path.includes("/auth/login") ||
      path.includes("/auth/register") ||
      path.includes("/auth/refresh");
    if (!isAuthPath) {
      try {
        await refreshAccessToken();
        return apiRequestBlob(path, { ...options, _retry: true });
      } catch {
        throw new ApiError(401, "Unauthorized", await parseBodyDetail(res));
      }
    }
  }

  if (!res.ok) {
    const detail = await parseBodyDetail(res);
    const msg = formatDetailMessage(detail) ?? res.statusText;
    throw new ApiError(res.status, msg || "Request failed", detail);
  }

  return res.blob();
}
