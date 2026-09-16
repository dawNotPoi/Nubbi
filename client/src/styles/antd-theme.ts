import type { ThemeConfig } from "antd";

/**
 * 从当前 CSS 语义 Token 派生 AntD 主题，不维护另一套颜色常量。
 * @returns 供迁移期 AntD 组件使用的主题配置。
 */
export function getNubbiAntdTheme(): ThemeConfig {
  if (typeof window === "undefined") return {};
  const styles = getComputedStyle(document.documentElement);

  /**
   * 读取已经由 Vite 加载的全局变量；缺失时交由 AntD 使用默认值。
   * @param name 语义 Token 名称。
   * @returns 非空颜色或样式值。
   */
  const read = (name: string): string | undefined =>
    styles.getPropertyValue(name).trim() || undefined;

  return {
    token: {
      colorPrimary: read("--accent-border"),
      colorPrimaryHover: read("--accent-hover"),
      colorPrimaryActive: read("--accent-active"),
      colorText: read("--text-primary"),
      colorTextSecondary: read("--text-muted"),
      colorBorder: read("--border-button"),
      colorBorderSecondary: read("--border-row"),
      colorBgContainer: read("--surface"),
      colorBgElevated: read("--surface"),
      colorFillSecondary: read("--bg-hover"),
      colorFillTertiary: read("--sidebar"),
      borderRadius: 8,
      controlHeight: 36,
      controlHeightSM: 32,
      boxShadowSecondary: read("--shadow-popover"),
    },
    components: {
      Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 500 },
      Dropdown: { paddingBlock: 6 },
      Input: { activeShadow: "0 0 0 2px var(--focus-ring)" },
      Select: { activeOutlineColor: read("--focus-ring") },
    },
  };
}
