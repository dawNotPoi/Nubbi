// 极简 Service Worker：仅用于安装后立即接管页面并让新版本尽快生效。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
