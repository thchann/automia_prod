import { getAccessToken } from "./tokens";
import { getApiBaseUrl } from "./env";

export async function startInstagramOAuth() {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(
    `${getApiBaseUrl().replace(/\/$/, "")}/oauth/instagram/authorize`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

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