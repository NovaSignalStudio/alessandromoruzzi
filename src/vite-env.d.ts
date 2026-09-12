/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PREVIEW?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
