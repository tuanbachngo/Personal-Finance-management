import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",
        border: "var(--color-border)",
        primary: "var(--color-primary)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

