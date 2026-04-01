/**
 * Client-side access gate (placeholder). Replace `verifyAccessCode` with a real API call later.
 */
const ACCESS_TOKEN_KEY = "automia_access_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
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
    const token = `automia.${btoa(JSON.stringify({ v: 1, ts: Date.now(), scope: "desktop" }))}`;
    setAccessToken(token);
    return { ok: true, token };
  }
  return { ok: false, error: "Invalid access code" };
}
