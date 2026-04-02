import { apiRequest } from "./client";
import { clearAuthTokens, setAuthTokens } from "./tokens";
import type { TokenResponse, UserMeResponse, UserProfilePatch } from "./types";

export async function login(body: { email: string; password: string }): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function register(body: {
  name: string;
  email: string;
  password: string;
}): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logoutRemote(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
}

export async function fetchMe(): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>("/auth/me");
}

export async function patchMe(body: UserProfilePatch): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
