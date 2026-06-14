import type { Config } from "tailwindcss";

// Design tokens ported verbatim from the job-board.html prototype.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        appbg: "#f5f7fa",
        panel: "#ffffff",
        ink: "#0f172a",
        muted: "#64748b",
        line: "#e2e8f0",
        brand: "#4f46e5",
        "brand-dark": "#4338ca",
        "brand-soft": "#eef2ff",
        chip: "#f1f5f9",
        sgreen: "#16a34a",
        "sgreen-bg": "#dcfce7",
        sblue: "#2563eb",
        "sblue-bg": "#dbeafe",
        samber: "#d97706",
        "samber-bg": "#fef3c7",
        sslate: "#475569",
        "sslate-bg": "#f1f5f9",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.06),0 4px 14px rgba(15,23,42,.05)",
        cardhover: "0 6px 22px rgba(15,23,42,.09)",
      },
      maxWidth: {
        wrap: "1280px",
      },
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
