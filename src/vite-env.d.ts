/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DB_USER: string;
  readonly VITE_DB_PASSWORD: string;
  readonly VITE_DB_HOST: string;
  readonly VITE_DB_PORT: string;
  readonly VITE_DB_NAME: string;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}