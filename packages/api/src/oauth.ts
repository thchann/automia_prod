import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";
import type { OAuthAuthorizeUrlResponse } from "./types";

const OAUTH_INSTAGRAM_AUTHORIZE = "/oauth/instagram/authorize";

const POPUP_FEATURES =
  "width=600,height=720,left=120,top=80,scrollbars=yes,resizable=yes,status=yes";

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

function closePopup(w: Window | null): void {
  try {
    w?.close();
  } catch {
    /* ignore */
  }
}

function navigateToInstagram(target: string, w: Window | null): void {
  const url = target.trim();
  if (!url) return;
  if (w && !w.closed) {
    w.location.href = url;
    try {
      w.focus();
    } catch {
      /* ignore */
    }
    return;
  }
  if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
    globalThis.location.href = url;
  }
}

export type StartInstagramOAuthOptions = {
  /** If true, navigate the current tab instead of opening a popup. Default: popup. */
  sameTab?: boolean;
};

/**
 * Instagram connect: prefer **JSON** (`Accept: application/json`) so we get `authorize_url` in the
 * body — cross-origin `fetch` often **cannot** read `Location` on a 302, which left popups on `about:blank`.
 * Fallback: `redirect: manual` + `Location` when the API only returns 302.
 */
export async function startInstagramOAuth(options?: StartInstagramOAuthOptions): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  const sameTab = options?.sameTab === true;
  const w =
    typeof window !== "undefined" && !sameTab
      ? window.open("about:blank", "automia_instagram_oauth", POPUP_FEATURES)
      : null;

  const apiBase = getApiBaseUrl();
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 1) Preferred: 200 JSON { authorize_url } (backend must honor Accept: application/json)
  const resJson = await fetch(joinBasePath(apiBase, OAUTH_INSTAGRAM_AUTHORIZE), {
    headers: {
      ...authHeaders,
      Accept: "application/json",
    },
  });

  const ct = resJson.headers.get("content-type") || "";
  if (resJson.ok && ct.includes("application/json")) {
    try {
      const data = (await resJson.json()) as OAuthAuthorizeUrlResponse & { url?: string };
      const target = data.authorize_url ?? data.url;
      if (target?.trim()) {
        navigateToInstagram(target, w);
        return;
      }
    } catch {
      closePopup(w);
      return;
    }
    closePopup(w);
    return;
  }

  // 2) Fallback: 302 + Location (only works if API exposes Location to CORS)
  const resRedirect = await fetch(joinBasePath(apiBase, OAUTH_INSTAGRAM_AUTHORIZE), {
    headers: authHeaders,
    redirect: "manual",
  });

  const isRedirect =
    resRedirect.status === 301 ||
    resRedirect.status === 302 ||
    resRedirect.status === 307 ||
    resRedirect.status === 308;
  if (isRedirect) {
    const loc = resRedirect.headers.get("Location");
    if (loc) {
      navigateToInstagram(resolveLocation(loc, apiBase), w);
      return;
    }
  }

  closePopup(w);
}
