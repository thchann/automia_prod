interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REGISTRATION_ACCESS_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
