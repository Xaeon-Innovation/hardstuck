/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_PAYMOB_PUBLIC_KEY: string;
  readonly VITE_DEFAULT_CURRENCY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
