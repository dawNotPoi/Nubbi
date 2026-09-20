import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { codeInspectorPlugin } from "code-inspector-plugin";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    codeInspectorPlugin({
      bundler: "vite",
      importClient: "file",
      injectTo: path.resolve(__dirname, "./src/main.tsx"),
      skipSnippets: ["htmlScript"],
    }),
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "simple-peer": "simple-peer/simplepeer.min.js",
    },
    // 强制 react / react-dom 解析到同一个副本，避免 better-auth 等依赖
    // 通过 peer 解析到 store 里的 react@19 副本，造成双 React 导致 hooks 失效
    dedupe: ["react", "react-dom"],
  },
});
