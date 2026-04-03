import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./tokens";

/** Must match the deployed backend route (no trailing slash on base). */
const OAUTH_INSTAGRAM_AUTHORIZE = "/oauth/instagram/authorize";

const TAG = "[Instagram OAuth]";

/** Why `startInstagramOAuth` did not navigate to Instagram. */
export type InstagramOAuthFailureReason =
  | "no_token"
  | "fetch_failed"
  | "not_json"
  | "no_authorize_url"
  | "redirect_no_location"
  | "opaque_redirect"
  | "http_error";

export type InstagramOAuthResult =
  | { ok: true }
  | { ok: false; reason: InstagramOAuthFailureReason; detail?: string };

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

/** Always visible in console (production too) so failures are not silent. */
function fail(reason: InstagramOAuthFailureReason, detail?: string): InstagramOAuthResult {
  const msg = detail ? `${reason}: ${detail}` : reason;
  console.warn(TAG, msg);
  if (oauthDebugEnabled()) {
    console.warn(TAG, "(verbose logs: set localStorage automia_debug_oauth=1 or VITE_DEBUG_OAUTH=true)");
  }
  return { ok: false, reason, detail };
}

/**
 * Instagram OAuth: open Meta login in this tab.
 * `redirect: "manual"` — if the API returns 302 to Instagram, fetch must not follow (CORS).
 */
export async function startInstagramOAuth(): Promise<InstagramOAuthResult> {
  const accessToken = getAccessToken();
  if (!accessToken || typeof window === "undefined") {
    return fail("no_token");
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
    return fail("fetch_failed", e instanceof Error ? e.message : String(e));
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
        if (oauthDebugEnabled()) {
          console.warn(TAG, "200 but body is not JSON (first 200 chars)", text.slice(0, 200));
        }
        return fail("not_json", text.slice(0, 120));
      }
      dlog("JSON keys", Object.keys(data));
      target = data.authorize_url ?? data.url ?? null;
      if (!target?.trim()) {
        return fail("no_authorize_url");
      }
    } catch (e) {
      return fail("fetch_failed", e instanceof Error ? e.message : String(e));
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
      return fail("redirect_no_location", `status=${res.status} type=${res.type}`);
    }
  } else if (res.status === 0 || res.type === "opaqueredirect") {
    return fail("opaque_redirect", `type=${res.type}`);
  } else {
    let preview = "";
    try {
      preview = (await res.clone().text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    return fail("http_error", `${res.status} ${preview}`);
  }

  if (target?.trim()) {
    dlog("navigating", target.trim());
    window.location.href = target.trim();
    return { ok: true };
  }

  return fail("no_authorize_url");
}
