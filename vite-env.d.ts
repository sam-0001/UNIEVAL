/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_CASHFREE_APP_ID: string;
  readonly VITE_SUPER_ADMIN_EMAIL: string;
  readonly VITE_WHATSAPP_GROUP_LINK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}