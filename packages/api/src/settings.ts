import { apiRequest } from "./client";
import type { ProfileUpdateRequest, UserMeResponse } from "./types";

/**
 * `GET /settings` — same `UserMeResponse` as `GET /auth/me` (see `app/routes/settings.py`).
 */
export async function getSettings(): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>("/settings");
}

/**
 * `PATCH /settings` — body matches FastAPI `ProfileUpdateRequest` and
 * `apply_user_profile_updates` in `app/services/user_profile.py` (only sent keys are applied).
 */
export async function patchSettings(body: ProfileUpdateRequest): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>("/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
