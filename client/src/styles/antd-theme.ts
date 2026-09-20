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

  /**
   * AntD 几何 Token 要求数字，从共享的像素变量读取，避免维护第二套圆角。
   * @param name 以 px 定义的主题变量名。
   * @returns 有效的非负像素值，缺失时使用 AntD 默认值。
   */
  const readPixels = (name: string): number | undefined => {
    const value = Number.parseFloat(read(name) ?? "");
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  };

  return {
    token: {
      colorPrimary: read("--primary"),
      colorPrimaryHover: read("--primary-hover"),
      colorPrimaryActive: read("--primary-active"),
      colorText: read("--text-primary"),
      colorTextSecondary: read("--text-muted"),
      colorBorder: read("--border-button"),
      colorBorderSecondary: read("--border-row"),
      colorBgContainer: read("--surface"),
      colorBgElevated: read("--surface"),
      colorFillSecondary: read("--bg-hover"),
      colorFillTertiary: read("--sidebar"),
      fontFamily: read("--font-ui"),
      fontSize: 14,
      borderRadius: readPixels("--radius-control"),
      borderRadiusSM: readPixels("--radius-compact"),
      borderRadiusXS: readPixels("--radius-compact"),
      borderRadiusLG: readPixels("--radius-panel"),
      controlHeight: 34,
      controlHeightSM: 30,
      boxShadowSecondary: read("--shadow-popover"),
    },
    components: {
      Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 500, borderRadiusLG: readPixels("--radius-control") },
      Input: { activeShadow: "0 0 0 3px var(--focus-ring)", borderRadiusLG: readPixels("--radius-control") },
      Checkbox: { borderRadiusSM: readPixels("--radius-checkbox") },
      Dropdown: { paddingBlock: 4 },
      Select: { activeOutlineColor: read("--focus-ring") },
    },
  };
}
