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
 * Instagram OAuth: **always** use `redirect: "manual"` on fetch.
 * If the API returns 302 to Instagram and fetch *follows* (default), the browser loads Instagram
 * *inside* fetch → CORS error. We only assign the Instagram URL to `popup.location.href` (real navigation).
 *
 * Flow: one request with Bearer + `Accept: application/json` → 200 JSON `authorize_url`, or 302 + `Location`.
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

  const res = await fetch(joinBasePath(apiBase, OAUTH_INSTAGRAM_AUTHORIZE), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    redirect: "manual",
  });

  const ct = res.headers.get("content-type") || "";

  if (res.ok && ct.includes("application/json")) {
    try {
      const data = (await res.json()) as OAuthAuthorizeUrlResponse & { url?: string };
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

  const isRedirect =
    res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308;
  if (isRedirect) {
    const loc = res.headers.get("Location");
    if (loc) {
      navigateToInstagram(resolveLocation(loc, apiBase), w);
      return;
    }
  }

  closePopup(w);
}
