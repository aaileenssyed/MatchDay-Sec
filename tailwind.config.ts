import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 45px rgba(244, 180, 57, 0.35)",
        greenGlow: "0 0 35px rgba(74, 222, 128, 0.25)",
      },
      animation: {
        blink: "blink 1.1s steps(2, start) infinite",
        scan: "scan 8s linear infinite",
        float: "float 4s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.8s ease-in-out infinite",
      },
      keyframes: {
        blink: { "0%, 45%": { opacity: "1" }, "46%, 100%": { opacity: "0" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        pulseGlow: { "0%, 100%": { opacity: "0.65" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
