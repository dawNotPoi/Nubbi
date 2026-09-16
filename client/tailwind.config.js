// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
          DEFAULT: "var(--accent-border)",
          foreground: "var(--accent-contrast)",
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
          DEFAULT: "var(--accent-bg)",
          foreground: "var(--accent-text)",
        },
        destructive: {
          DEFAULT: "#fef2f2",
          foreground: "#dc2626",
        },
        border: "var(--border-row)",
        input: "var(--border-toolbar)",
        ring: "var(--focus-ring)",
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        "focus-input": "0 0 0 2px var(--focus-ring)",
        soft: "0 10px 30px rgba(55, 53, 47, 0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwind-scrollbar")],
};
