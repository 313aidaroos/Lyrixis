import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#05050A",
        surface: "#0C0C16",
        line: "#1C1C2E",
        ink: "#FFFFFF",
        "ink-2": "#B4B4C8",
        "ink-3": "#7A7A92",
        violet: "#6366F1",
        magenta: "#EC4899",
        cyan: "#22D3EE",
        gold: "#C4A35A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
