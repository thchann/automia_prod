import { clearAuthTokens } from "@automia/api";

export {
  getAccessToken,
  getRefreshToken,
  isAuthenticated as isAccessGranted,
} from "@automia/api";

export function clearAccessToken(): void {
  clearAuthTokens();
}
