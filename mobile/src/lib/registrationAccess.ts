const KEY = "automia_reg_access_ok_v1";
const CODE_KEY = "automia_reg_access_code_v1";

/** Call after the server confirms the access code is valid. Stores the code for registration. */
export function setRegistrationAccessGranted(accessCode: string): void {
  sessionStorage.setItem(KEY, "1");
  sessionStorage.setItem(CODE_KEY, accessCode.trim());
}

export function getPendingRegistrationAccessCode(): string | null {
  const v = sessionStorage.getItem(CODE_KEY);
  return v && v.length > 0 ? v : null;
}

export function clearRegistrationAccessGranted(): void {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(CODE_KEY);
}

export function hasRegistrationAccess(): boolean {
  return sessionStorage.getItem(KEY) === "1" && getPendingRegistrationAccessCode() !== null;
}
