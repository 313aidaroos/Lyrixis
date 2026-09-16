import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FFF8F2",
        surface: "#FFFFFF",
        line: "#EADFD4",
        ink: "#1C1730",
        "ink-2": "#5A5470",
        "ink-3": "#8A8499",
        violet: "#A855F7",
        magenta: "#EC4899",
        cyan: "#0891B2",
        gold: "#B8892D",
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
