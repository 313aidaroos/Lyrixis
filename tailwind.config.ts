import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#07061A",
        surface: "#100F2A",
        line: "rgba(168,150,255,0.14)",
        ink: "#F4F2FF",
        "ink-2": "#B9B4D6",
        "ink-3": "#7F7AA3",
        violet: "#8B5CF6",
        electric: "#6366F1",
        magenta: "#EC4899",
        cyan: "#22D3EE",
        blue: "#3B82F6",
        gold: "#E8C069",
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
