import typography from "@tailwindcss/typography";

// v4 迁移期保留既有 Token 和尺寸映射，由 index.css 的 @config 显式加载。
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "translate(-50%, -50%) scale(0.9)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
      },
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-subtle": "var(--surface-subtle)",
        sidebar: "var(--sidebar)",

        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        "text-placeholder": "var(--text-placeholder)",

        "bg-hover": "var(--bg-hover)",
        "bg-selected": "var(--bg-selected)",
        "bg-icon-hover": "var(--bg-icon-hover)",
        "bg-panel": "var(--bg-panel)",

        "border-row": "var(--border-row)",
        "border-button": "var(--border-button)",
        "border-button-hover": "var(--border-button-hover)",
        "border-toolbar": "var(--border-toolbar)",

        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        selected: {
          DEFAULT: "var(--selected)",
          foreground: "var(--selected-foreground)",
        },
        "focus-ring": "var(--focus-ring)",

        "accent-border": "var(--accent-border)",
        "accent-hover": "var(--accent-hover)",
        "accent-active": "var(--accent-active)",
        "accent-bg": "var(--accent-bg)",
        "accent-soft": "var(--accent-soft)",
        "accent-text": "var(--accent-text)",
        "accent-contrast": "var(--accent-contrast)",

        skeleton: "var(--skeleton)",

        background: "var(--canvas)",
        foreground: "var(--text-primary)",
        card: "var(--surface)",
        "card-foreground": "var(--text-primary)",
        popover: "var(--surface)",
        "popover-foreground": "var(--text-primary)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--bg-hover)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--danger-bg)",
          foreground: "var(--danger-text)",
        },
        border: "var(--border-row)",
        input: "var(--border-button)",
        ring: "var(--focus-ring)",
      },
      borderRadius: {
        compact: "var(--radius-compact)",
        control: "var(--radius-control)",
        panel: "var(--radius-panel)",
        sheet: "var(--radius-sheet)",
        full: "var(--radius-full)",
        // 旧工具类保持兼容，业务组件统一使用上面的角色名称。
        sm: "var(--radius-compact)",
        md: "var(--radius-control)",
        lg: "var(--radius-panel)",
        xl: "var(--radius-panel)",
        "2xl": "var(--radius-panel)",
        "3xl": "var(--radius-panel)",
      },
      boxShadow: {
        "focus-input": "0 0 0 3px var(--focus-ring)",
        soft: "var(--shadow-popover)",
      },
    },
  },
  plugins: [typography],
};
