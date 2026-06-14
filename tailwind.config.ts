import type { Config } from "tailwindcss";

// Colors are driven by CSS variables (see app/globals.css) so the same classes
// work in both dark (default) and light themes.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        appbg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        brand: "var(--brand)",
        "brand-dark": "var(--brand-dark)",
        "brand-soft": "var(--brand-soft)",
        chip: "var(--chip)",
        "chip-ink": "var(--chip-ink)",
        green: "var(--green)",
        sgreen: "var(--ink-green)",
        "sgreen-bg": "var(--green-bg)",
        sblue: "var(--ink-blue)",
        "sblue-bg": "var(--blue-bg)",
        samber: "var(--ink-amber)",
        "samber-bg": "var(--amber-bg)",
        sslate: "var(--muted)",
        "sslate-bg": "var(--slate-bg)",
        "red-soft": "var(--red-bg)",
        "red-ink": "var(--ink-red)",
      },
      boxShadow: {
        card: "var(--shadow)",
        cardhover: "var(--shadow-hover)",
      },
      maxWidth: { wrap: "1280px" },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
