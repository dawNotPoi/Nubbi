/** 仅保存外观与阅读偏好，不包含用户身份或文章内容。 */
export type ReaderPreferences = {
  theme: "system" | "light" | "dark";
  font: "serif" | "sans";
  size: "standard" | "large";
  effects: "on" | "off";
};

const storageKey = "nubbi-blog:appearance";
const changeEvent = "nubbi-blog:appearance-change";
const defaults: ReaderPreferences = { theme: "system", font: "sans", size: "standard", effects: "on" };
const choices = { theme: ["system", "light", "dark"], font: ["serif", "sans"], size: ["standard", "large"], effects: ["on", "off"] };

/**
 * 将浏览器存储视为不可信输入，逐项回退，避免旧值或损坏数据影响阅读。
 * @param value 原始偏好 JSON。
 * @returns 完整且合法的偏好。
 */
export function parsePreferences(value: string | null): ReaderPreferences {
  try {
    const parsed: unknown = JSON.parse(value || "null");
    if (!parsed || typeof parsed !== "object") return defaults;
    const data = parsed as Record<string, unknown>;
    return {
      theme: data.theme === "light" || data.theme === "dark" ? data.theme : "system",
      font: data.font === "serif" ? "serif" : "sans",
      size: data.size === "large" ? "large" : "standard",
      effects: data.effects === "off" ? "off" : "on",
    };
  } catch { return defaults; }
}

/**
 * HTML 属性是当前页面的状态源，存储被禁用时交互仍可用。
 * @returns 稳定的字符串快照，供 React 比较。
 */
export function preferenceSnapshot(): string {
  const { theme, font, size, effects } = document.documentElement.dataset;
  return JSON.stringify(parsePreferences(JSON.stringify({ theme, font, size, effects })));
}

/** @returns 与静态首屏一致的默认偏好快照。 */
export function serverPreferenceSnapshot(): string { return JSON.stringify(defaults); }

/**
 * 把偏好应用到根节点，页面和浮层共享同一排版、主题变量。
 * @param preferences 已校验的偏好。
 * @returns 无返回值。
 */
function applyPreferences(preferences: ReaderPreferences): void {
  Object.assign(document.documentElement.dataset, preferences);
}

/**
 * 更新外观并通知本页订阅者；存储失败不阻断界面更新。
 * @param patch 本次修改的偏好。
 * @returns 无返回值。
 */
export function updatePreferences(patch: Partial<ReaderPreferences>): void {
  const next = { ...parsePreferences(preferenceSnapshot()), ...patch };
  applyPreferences(next);
  try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* 隐私模式下只保留当前页面偏好。 */ }
  window.dispatchEvent(new Event(changeEvent));
}

/**
 * 同步同页和跨标签页操作，不向页面增加轮询或系统主题监听。
 * @param notify React 外部状态通知函数。
 * @returns 取消订阅函数。
 */
export function subscribePreferences(notify: () => void): () => void {
  /** 存储清除也恢复默认值，避免多个标签页的显示不一致。 */
  const sync = (event: StorageEvent): void => {
    if (event.key !== storageKey && event.key !== null) return;
    applyPreferences(parsePreferences(event.newValue));
    notify();
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", sync);
  };
}

/** 仅由静态白名单生成，先于正文绘制执行，避免已保存的深色偏好闪成亮色。 */
export const preferenceBootstrap = `(()=>{try{const d=${JSON.stringify(defaults)},c=${JSON.stringify(choices)},p=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||'null');for(const k of Object.keys(d)){document.documentElement.dataset[k]=p&&c[k].includes(p[k])?p[k]:d[k]}}catch{}})()`;
