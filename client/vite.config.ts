import react from "@vitejs/plugin-react-swc";
import { codeInspectorPlugin } from "code-inspector-plugin";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), codeInspectorPlugin({ bundler: "vite" })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "simple-peer": "simple-peer/simplepeer.min.js",
    },
  },
});
