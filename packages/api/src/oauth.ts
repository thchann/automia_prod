import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";

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

export type StartInstagramOAuthOptions = {
  /** If true, navigate the current tab instead of opening a popup. Default: popup. */
  sameTab?: boolean;
};

/**
 * Connect Instagram: GET /oauth/instagram/authorize with Bearer + redirect: manual.
 * On 302, read Location and open Instagram OAuth in a **popup** (opens `about:blank` first so the
 * browser treats it as a user gesture and is less likely to block the window).
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
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  });

  const isRedirect =
    res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308;
  if (isRedirect) {
    const loc = res.headers.get("Location");
    if (loc) {
      const target = resolveLocation(loc, apiBase);
      if (w && !w.closed) {
        w.location.href = target;
        try {
          w.focus();
        } catch {
          /* ignore */
        }
        return;
      }
      if (typeof globalThis !== "undefined" && "location" in globalThis && globalThis.location) {
        globalThis.location.href = target;
      }
      return;
    }
  }

  if (res.type === "opaqueredirect" || res.status === 0) {
    try {
      w?.close();
    } catch {
      /* ignore */
    }
    return;
  }

  if (!res.ok) {
    try {
      w?.close();
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    w?.close();
  } catch {
    /* ignore */
  }
}
