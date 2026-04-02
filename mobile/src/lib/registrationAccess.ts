const KEY = "automia_reg_access_ok_v1";

export function setRegistrationAccessGranted(): void {
  sessionStorage.setItem(KEY, "1");
}

export function clearRegistrationAccessGranted(): void {
  sessionStorage.removeItem(KEY);
}

export function hasRegistrationAccess(): boolean {
  return sessionStorage.getItem(KEY) === "1";
}
