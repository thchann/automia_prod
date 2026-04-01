/**
 * Client-side access gate (placeholder). Replace `verifyAccessCode` with a real API call later.
 * Token is stored in localStorage so you can swap storage or shape without changing route guards.
 */
const ACCESS_TOKEN_KEY = "automia_access_token";
const LEGACY_VERIFIED_KEY = "automia_mobile_verified";

export function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) return token;
    if (localStorage.getItem(LEGACY_VERIFIED_KEY) === "true") {
      const migrated = `automia.legacy.${Date.now()}`;
      localStorage.setItem(ACCESS_TOKEN_KEY, migrated);
      localStorage.removeItem(LEGACY_VERIFIED_KEY);
      return migrated;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_VERIFIED_KEY);
  } catch {
    // ignore
  }
}

export function isAccessGranted(): boolean {
  return Boolean(getAccessToken());
}

/** TODO: replace with POST /auth/verify or equivalent */
export async function verifyAccessCode(code: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const trimmed = code.replace(/\s/g, "").toUpperCase();
  await new Promise((r) => setTimeout(r, 250));
  if (trimmed === "ABCDE") {
    const token = `automia.${btoa(JSON.stringify({ v: 1, ts: Date.now(), scope: "mobile" }))}`;
    setAccessToken(token);
    return { ok: true, token };
  }
  return { ok: false, error: "Invalid access code" };
}
