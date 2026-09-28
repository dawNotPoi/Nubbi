/** 博客支持的配色模式。 */
export type Theme = "light" | "dark";

const THEME_KEY = "dawn-color-theme";

/** 首次绘制前恢复合法主题；存储受限时交给系统配色。 */
export const THEME_BOOTSTRAP = `try{const t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}`;

/**
 * 读取已生效配色，未设置时跟随系统。
 * @returns 当前亮暗模式。
 */
export function getThemeSnapshot(): Theme {
  const theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") return theme;
  return getSystemTheme();
}

/** 读取系统当前配色。 */
function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * 保存选择，不提前改变 DOM 或广播同步更新。
 * @param theme 用户提交的主题。
 * @returns 无返回值。
 */
export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 存储受限时仍保留本页的选择。
  }
}

/**
 * 初始化并监听外部偏好，DOM 更新交给 Provider 的提交阶段。
 * @param notify 接收主题以及是否为显式偏好。
 * @returns 释放监听器的函数。
 */
export function subscribeTheme(notify: (theme: Theme, explicit: boolean) => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  /** 系统变化仅在没有显式选择时生效。 */
  const onSystem = (): void => {
    if (!document.documentElement.dataset.theme) notify(getSystemTheme(), false);
  };
  /** 跨标签清除偏好时恢复系统配色。 */
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      // 存储不可访问时不接收其他存储域的同名事件。
      return;
    }
    const theme = event.newValue;
    const explicit = theme === "light" || theme === "dark";
    notify(explicit ? theme : getSystemTheme(), explicit);
  };
  media.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  notify(getThemeSnapshot(), Boolean(document.documentElement.dataset.theme));
  return () => {
    media.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}
