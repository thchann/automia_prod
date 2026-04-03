import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";

const OAUTH_INSTAGRAM_AUTHORIZE = "/oauth/instagram/authorize";

function joinBasePath(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${p}`;
}

function resolveLocation(location: string, apiBase: string): string {
  try {
    return new URL(location.trim(), apiBase).href;
  } catch {
    return location.trim();
  }
}

/**
 * Connect Instagram: GET /oauth/instagram/authorize with Bearer + redirect: manual.
 * On 302, read Location and send the user there (full page). Backend unchanged.
 */
export async function startInstagramOAuth(): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  const apiBase = getApiBaseUrl();
  const res = await fetch(joinBasePath(apiBase, OAUTH_INSTAGRAM_AUTHORIZE), {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });

  const isRedirect =
    res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308;
  if (isRedirect) {
    const loc = res.headers.get("Location");
    if (loc && typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
      globalThis.location.href = resolveLocation(loc, apiBase);
      return;
    }
  }

  if (res.type === "opaqueredirect" || res.status === 0) {
    return;
  }

  if (!res.ok) return;
}
