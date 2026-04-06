import { apiRequest } from "./client";
import { clearAuthTokens, setAuthTokens } from "./tokens";
import { patchSettings } from "./settings";
import type {
  AccessCodeValidateResponse,
  ProfileUpdateRequest,
  RegisterRequestBody,
  TokenResponse,
  UserMeResponse,
  UserProfilePatch,
} from "./types";

export async function login(body: { email: string; password: string }): Promise<TokenResponse> {
  const data = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  setAuthTokens(data.access_token, data.refresh_token);
  return data;
}

export async function validateAccessCode(body: { access_code: string }): Promise<AccessCodeValidateResponse> {
  return apiRequest<AccessCodeValidateResponse>("/auth/access-code/validate", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export async function register(body: RegisterRequestBody): Promise<TokenResponse> {
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

/** Persists profile fields via `PATCH /settings` (backend has no `PATCH /auth/me`). */
export async function patchMe(body: UserProfilePatch): Promise<UserMeResponse> {
  return patchSettings(body);
}

export async function patchProfile(body: ProfileUpdateRequest): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
