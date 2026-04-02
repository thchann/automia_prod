import { apiRequest } from "./client";
import type { OAuthAuthorizeUrlResponse } from "./types";

export async function getInstagramAuthorizeUrl(): Promise<OAuthAuthorizeUrlResponse> {
  return apiRequest<OAuthAuthorizeUrlResponse>("/oauth/instagram/authorize-url");
}
