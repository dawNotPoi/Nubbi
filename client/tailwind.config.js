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
        normal: "rgb(229 231 235)",
        normalGray: "rgb(243,248,254)",
        sidebar: "var(--sidebar)",
        background: "var(--background)",
        surface: "var(--surface)",
        panel: "var(--panel)",

        border: "var(--border)",
        divider: "var(--divider)",

        foreground: "var(--foreground)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        inverse: "var(--inverse)",

        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",

        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwind-scrollbar")],
};
