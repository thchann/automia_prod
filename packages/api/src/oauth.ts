import { getAccessToken } from "./tokens";
import { getApiBaseUrl } from "./env";

export async function startInstagramOAuth() {
  const token = getAccessToken();
  if (!token) throw new Error("No access token");

  const res = await fetch(
    `${getApiBaseUrl().replace(/\/$/, "")}/oauth/instagram/authorize`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to get Instagram authorization URL");
  }

  const data = await res.json();

  if (!data.authorization_url) {
    throw new Error("No authorization URL returned");
  }

  window.location.href = data.authorization_url;
}