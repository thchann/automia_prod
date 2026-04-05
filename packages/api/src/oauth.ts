import { getAccessToken } from "./tokens";
import { getApiBaseUrl } from "./env";

export type StartInstagramOAuthOptions = {
  /** When the API supports it, ties the new OAuth flow to an automation type (DM vs comment, etc.). */
  automationTypeId?: string;
  /** Fallback hint when `automationTypeId` is not known (e.g. catalog slug before types load). */
  automationTypeCode?: string;
};

export async function startInstagramOAuth(options?: StartInstagramOAuthOptions) {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const params = new URLSearchParams();
  if (options?.automationTypeId) params.set("automation_type_id", options.automationTypeId);
  if (options?.automationTypeCode) params.set("automation_type_code", options.automationTypeCode);
  const qs = params.toString();
  const path = `${getApiBaseUrl().replace(/\/$/, "")}/oauth/instagram/authorize${qs ? `?${qs}` : ""}`;

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

  // 👀 Detect when popup closes
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        resolve();
      }
    }, 500);
  });
}