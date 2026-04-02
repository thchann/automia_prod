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
    const msg =
      typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : res.statusText;
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
