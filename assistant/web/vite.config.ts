import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 开发环境把 /api 请求代理到本地 Assistant API，避免跨域。
      "/api": "http://localhost:8787",
    },
  },
});
