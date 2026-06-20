import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0908",
        ink: "#FFFFFF",
        gold: "#FFE58A",
        coral: { from: "#D94B45", to: "#F08B6F" },
        glass: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.10)",
      },
      borderRadius: { card: "24px", pill: "999px" },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Wanted Sans",
          "Pretendard",
          "system-ui",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "coral-cta": "linear-gradient(90deg,#D94B45,#F08B6F)",
      },
    },
  },
  plugins: [],
};

export default config;
