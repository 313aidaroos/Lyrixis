import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FBFAFF",
        surface: "#FFFFFF",
        line: "#E6E4F2",
        ink: "#15122B",
        "ink-2": "#57537A",
        "ink-3": "#8D89AB",
        violet: "#6366F1",
        magenta: "#EC4899",
        cyan: "#06B6D4",
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
