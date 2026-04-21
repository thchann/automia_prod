import { getAccessToken } from "./tokens";
import { getApiBaseUrl } from "./env";

export type InstagramOAuthResult =
  | { status: "success"; oauth_connection_id?: string }
  | { status: "cancelled" }
  | { status: "error"; message?: string };

export async function startInstagramOAuth(): Promise<InstagramOAuthResult> {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const path = `${getApiBaseUrl().replace(/\/$/, "")}/oauth/instagram/authorize`;

  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to get Instagram authorization URL");
  }

  const { authorization_url } = await res.json();

  if (!authorization_url) {
    throw new Error("No authorization URL returned");
  }

  // 📦 Open popup
  const width = 500;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    authorization_url,
    "instagram_oauth",
    `width=${width},height=${height},left=${left},top=${top}`
  );

  if (!popup) {
    throw new Error("Popup blocked");
  }

  return new Promise<InstagramOAuthResult>((resolve) => {
    let settled = false;
    const settle = (result: InstagramOAuthResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(interval);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (!event.origin || event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; status?: "success" | "error"; oauth_connection_id?: string; message?: string }
        | undefined;
      if (!data || data.type !== "automia:instagram-oauth") return;
      if (data.status === "success") {
        settle({ status: "success", oauth_connection_id: data.oauth_connection_id });
        return;
      }
      settle({ status: "error", message: data.message });
    };

    window.addEventListener("message", onMessage);

    const interval = setInterval(() => {
      if (popup.closed) {
        settle({ status: "cancelled" });
      }
    }, 500);
  });
}