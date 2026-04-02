const ACCESS = "automia_access_token";
const REFRESH = "automia_refresh_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS, token);
  } catch {
    /* ignore */
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH, token);
  } catch {
    /* ignore */
  }
}

export function setAuthTokens(access: string, refresh: string): void {
  setAccessToken(access);
  setRefreshToken(refresh);
}

export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    /* ignore */
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
