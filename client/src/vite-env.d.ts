/// <reference types="vite/client" />
// env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // 其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
