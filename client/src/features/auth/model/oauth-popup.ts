/** 弹窗只报告流程结果；真实身份仍由服务端会话确认。 */
export type OAuthPopupResult = "completed" | "failed" | "cancelled" | "timeout";

/** 单次 OAuth 窗口的生命周期，不保存认证凭证。 */
export interface OAuthPopup {
  callbackURL: string;
  result: Promise<OAuthPopupResult>;
  /** @param url 已校验的提供方地址。 @returns 无返回值。 */
  navigate(url: string): void;
  /** @returns 释放监听器、定时器并关闭窗口。 */
  dispose(): void;
}

const POPUP_TIMEOUT_MS = 3 * 60 * 1000;
const POPUP_MESSAGE_TYPE = "nubbi:oauth-complete";

/**
 * 在用户点击的同步调用栈中打开窗口，避免异步请求后触发弹窗拦截。
 * @returns 桌面端弹窗；移动端或被拦截时返回 null，调用方沿用整页跳转。
 */
export const openOAuthPopup = (): OAuthPopup | null => {
  if (typeof BroadcastChannel === "undefined" ||
    window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return null;
  const attempt = crypto.randomUUID();
  const width = 520;
  const height = 680;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open("about:blank", `nubbi-github-${attempt}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
  if (!popup) return null;
  if (import.meta.env.DEV) console.debug("[oauth-popup] opened");
  popup.document.title = "正在连接 GitHub · NUBBI";
  popup.document.body.textContent = "正在连接 GitHub，请稍候…";

  const callback = new URL("/oauth-callback.html", window.location.origin);
  callback.searchParams.set("attempt", attempt);
  let settle: (result: OAuthPopupResult) => void;
  const result = new Promise<OAuthPopupResult>((resolve) => { settle = resolve; });
  let finished = false;

  /** 清理所有监听，确保关闭窗口后不会继续发布过期结果。 */
  const finish = (outcome: OAuthPopupResult): void => {
    if (finished) return;
    finished = true;
    if (import.meta.env.DEV) console.debug("[oauth-popup]", outcome);
    channel.close();
    window.removeEventListener("pagehide", onPageHide);
    window.clearInterval(closedTimer);
    window.clearTimeout(timeoutTimer);
    popup.close();
    settle(outcome);
  };
  /** 同源专用频道按随机标记隔离本次回调，不信任通知中的身份数据。 */
  const onMessage = (event: MessageEvent<unknown>): void => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (typeof data !== "object" || data === null ||
      !("type" in data) || data.type !== POPUP_MESSAGE_TYPE ||
      !("attempt" in data) || data.attempt !== attempt ||
      !("failed" in data) || typeof data.failed !== "boolean") return;
    finish(data.failed ? "failed" : "completed");
  };
  /** 原页面离开时关闭子窗口，不让旧授权流程留在后台。 */
  const onPageHide = (): void => finish("cancelled");
  const closedTimer = window.setInterval(() => {
    if (popup.closed) finish("cancelled");
  }, 500);
  const timeoutTimer = window.setTimeout(() => finish("timeout"), POPUP_TIMEOUT_MS);
  // 跨站跳转可能切断 opener；同源频道不依赖跨窗口引用的存续。
  const channel = new BroadcastChannel(`nubbi:oauth:${attempt}`);
  channel.onmessage = onMessage;
  window.addEventListener("pagehide", onPageHide);

  return {
    callbackURL: callback.toString(),
    result,
    navigate(url) {
      if (import.meta.env.DEV) console.debug("[oauth-popup] navigating");
      if (!finished) popup.location.replace(url);
    },
    dispose: () => finish("cancelled"),
  };
};
