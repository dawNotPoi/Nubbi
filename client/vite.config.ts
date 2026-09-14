import react from "@vitejs/plugin-react-swc";
import { codeInspectorPlugin } from "code-inspector-plugin";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), codeInspectorPlugin({ bundler: "vite" })],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("mermaid")) {
            return "mermaid-vendor";
          }

          if (id.includes("react-markdown-editor-lite")) {
            return "markdown-editor-vendor";
          }

          if (id.includes("lowlight")) {
            return "lowlight-vendor";
          }

          if (
            id.includes("@tiptap/extension-") ||
            id.includes("@tiptap/markdown")
          ) {
            return "tiptap-extension-vendor";
          }

          if (
            id.includes("@tiptap/core") ||
            id.includes("@tiptap/react") ||
            id.includes("@tiptap/pm") ||
            id.includes("@tiptap/extensions") ||
            id.includes("@tiptap/starter-kit") ||
            id.includes("@tiptap/suggestion") ||
            id.includes("@tiptap/cli")
          ) {
            return "tiptap-core-vendor";
          }

          if (
            id.includes("@xyflow/react") ||
            id.includes("cytoscape") ||
            id.includes("katex")
          ) {
            return "diagram-vendor";
          }

          if (
            id.includes("xlsx") ||
            id.includes("mammoth") ||
            id.includes("jszip")
          ) {
            return "file-vendor";
          }

          if (
            id.includes("socket.io-client") ||
            id.includes("simple-peer")
          ) {
            return "realtime-vendor";
          }

          if (id.includes("antd") || id.includes("@ant-design/icons")) {
            return "antd-vendor";
          }

          if (id.includes("react-router-dom")) {
            return "router-vendor";
          }

          if (id.includes("react-dom") || id.includes("/react/")) {
            return "react-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "simple-peer": "simple-peer/simplepeer.min.js",
    },
  },
});
