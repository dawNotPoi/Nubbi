import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 生产环境注册 Service Worker，提供简单的离线缓存能力。
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}
