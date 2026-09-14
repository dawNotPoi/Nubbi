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
        "accent-bg": "var(--accent-bg)",
        "accent-text": "var(--accent-text)",

        skeleton: "var(--skeleton)",

        // shadcn/ui semantic tokens
        background: "hsl(0 0% 100%)",
        foreground: "hsl(0 0% 3.9%)",
        card: "hsl(0 0% 100%)",
        "card-foreground": "hsl(0 0% 3.9%)",
        popover: "hsl(0 0% 100%)",
        "popover-foreground": "hsl(0 0% 3.9%)",
        primary: {
          DEFAULT: "hsl(222 100% 64%)",
          foreground: "hsl(0 0% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(0 0% 96.1%)",
          foreground: "hsl(0 0% 9%)",
        },
        muted: {
          DEFAULT: "hsl(0 0% 96.1%)",
          foreground: "hsl(0 0% 45.1%)",
        },
        accent: {
          DEFAULT: "#eef3ff",
          foreground: "#4f8cff",
        },
        destructive: {
          DEFAULT: "#fef2f2",
          foreground: "#dc2626",
        },
        border: "hsl(0 0% 93%)",
        input: "hsl(0 0% 93%)",
        ring: "hsl(222 100% 64%)",
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        "focus-input": "0 0 0 2px var(--focus-ring)",
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwind-scrollbar")],
};
