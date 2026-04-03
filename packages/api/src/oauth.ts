import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";

/** Must match the deployed backend route (no trailing slash on base). */
const OAUTH_INSTAGRAM_AUTHORIZE = "/oauth/instagram/authorize";

const TAG = "[Instagram OAuth]";

function oauthDebugEnabled(): boolean {
  return (
    Boolean(import.meta.env?.DEV) ||
    import.meta.env?.VITE_DEBUG_OAUTH === "true" ||
    (typeof globalThis !== "undefined" &&
      "localStorage" in globalThis &&
      globalThis.localStorage?.getItem("automia_debug_oauth") === "1")
  );
}

function dlog(...args: unknown[]): void {
  if (oauthDebugEnabled()) {
    console.debug(TAG, ...args);
  }
}

function dwarn(...args: unknown[]): void {
  if (oauthDebugEnabled()) {
    console.warn(TAG, ...args);
  }
}

/**
 * Instagram OAuth: open Meta login in this tab.
 * `redirect: "manual"` — if the API returns 302 to Instagram, fetch must not follow (CORS).
 */
export async function startInstagramOAuth(): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken || typeof window === "undefined") {
    dwarn("aborted: no access token or not in browser");
    return;
  }

  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  const endpoint = `${apiBase}${OAUTH_INSTAGRAM_AUTHORIZE}`;

  dlog("request", { endpoint });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      redirect: "manual",
    });
  } catch (e) {
    dwarn("fetch failed (network / blocked?)", e);
    return;
  }

  const ct = res.headers.get("content-type") ?? "";
  const locationHeader = res.headers.get("Location");

  dlog("response", {
    status: res.status,
    ok: res.ok,
    type: res.type,
    contentType: ct,
    hasLocationHeader: Boolean(locationHeader),
  });

  let target: string | null = null;

  if (res.ok) {
    try {
      const text = await res.text();
      dlog("body length", text.length);
      let data: { authorize_url?: string; url?: string };
      try {
        data = JSON.parse(text) as { authorize_url?: string; url?: string };
      } catch {
        dwarn("200 but body is not JSON (first 200 chars)", text.slice(0, 200));
        return;
      }
      dlog("JSON keys", Object.keys(data));
      target = data.authorize_url ?? data.url ?? null;
      if (!target?.trim()) {
        dwarn("JSON missing authorize_url / url", data);
      }
    } catch (e) {
      dwarn("failed to read response body", e);
      return;
    }
  } else if ([301, 302, 307, 308].includes(res.status)) {
    if (locationHeader) {
      try {
        target = new URL(locationHeader.trim(), endpoint).href;
      } catch {
        target = locationHeader.trim();
      }
      dlog("using Location from redirect", target);
    } else {
      dwarn(
        "redirect status but no Location header readable (cross-origin fetch often hides Location unless Access-Control-Expose-Headers includes Location, or response may be opaque)",
        { status: res.status, type: res.type },
      );
    }
  } else if (res.status === 0 || res.type === "opaqueredirect") {
    dwarn(
      "opaque redirect (status 0 / opaqueredirect): browser will not expose redirect URL to JS — backend should return 200 JSON { authorize_url } instead of 302 for this flow",
      { type: res.type, status: res.status },
    );
  } else {
    try {
      const errText = await res.clone().text();
      dwarn("unexpected status", { status: res.status, bodyPreview: errText.slice(0, 300) });
    } catch {
      dwarn("unexpected status", res.status);
    }
  }

  if (target?.trim()) {
    dlog("navigating", target.trim());
    window.location.href = target.trim();
  } else {
    dwarn("no navigation URL — fix backend JSON or CORS+Expose-Headers for Location");
  }
}
