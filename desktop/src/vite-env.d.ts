/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_HEALTH_CHECK_URL?: string;
  readonly VITE_REGISTRATION_ACCESS_CODE?: string;
}

