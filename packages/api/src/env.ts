/** Public URL for the verification “Test connection” button — not the JSON API base (avoids localhost when VITE_API_URL is unset). */
const DEFAULT_HEALTH_CHECK_URL = "https://www.automiacars.com/";

export function getHealthCheckPingUrl(): string {
  const raw = import.meta.env.VITE_HEALTH_CHECK_URL;
  if (typeof raw === "string" && raw.trim()) {
    try {
      return new URL(raw.trim()).href;
    } catch {
      return DEFAULT_HEALTH_CHECK_URL;
    }
  }
  return DEFAULT_HEALTH_CHECK_URL;
}

/** Base origin only, no trailing slash. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL;
  let url = "http://localhost:8000";
  if (typeof raw === "string" && raw.trim()) {
    url = raw.trim().replace(/\/$/, "");
  }
  return normalizeApiOriginForBrowser(url);
}

export function normalizeApiOriginForBrowser(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:") return url.replace(/\/$/, "");
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    const hostedRemote =
      u.hostname.includes("railway.app") ||
      u.hostname.endsWith(".onrender.com") ||
      u.hostname.endsWith(".vercel.app");
    const pageIsHttps =
      typeof globalThis !== "undefined" &&
      "location" in globalThis &&
      (globalThis as { location?: { protocol?: string } }).location?.protocol === "https:";
    const shouldUseHttps = !isLocal && (hostedRemote || pageIsHttps);
    if (shouldUseHttps) {
      u.protocol = "https:";
      return u.toString().replace(/\/$/, "");
    }
  } catch {
    /* keep */
  }
  return url.replace(/\/$/, "");
}

const DEFAULT_CODE = "ABCDE";

export function normalizeAccessCode(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

export function getExpectedRegistrationCode(): string {
  const raw = import.meta.env.VITE_REGISTRATION_ACCESS_CODE;
  const normalized = normalizeAccessCode(
    typeof raw === "string" && raw.trim() ? raw.trim() : DEFAULT_CODE,
  );
  return normalized.length >= 5 ? normalized.slice(0, 5) : DEFAULT_CODE;
}
