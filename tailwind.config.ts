import type { Config } from "tailwindcss";

// design.md의 Discord 디자인 토큰 매핑
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5865F2",
          hover: "#4752C4",
          active: "#3C45A5",
        },
        bg: {
          primary: "#313338",
          secondary: "#2B2D31",
          "secondary-alt": "#232428",
          tertiary: "#1E1F22",
          floating: "#111214",
          input: "#383A40",
          modifier: "#404249",
        },
        txt: {
          normal: "#DBDEE1",
          muted: "#949BA4",
          faint: "#6D6F78",
          header: "#F2F3F5",
          "header-secondary": "#B5BAC1",
          link: "#00A8FC",
        },
        status: {
          online: "#23A55A",
          idle: "#F0B232",
          dnd: "#F23F43",
          danger: "#DA373C",
          offline: "#80848E",
        },
        accent: {
          green: "#57F287",
          yellow: "#FEE75C",
          fuchsia: "#EB459E",
          red: "#ED4245",
        },
      },
      fontSize: {
        xxs: ["11px", { lineHeight: "1.3", letterSpacing: "0.02em" }],
      },
      boxShadow: {
        "elev-low": "0 1px 0 rgba(2,2,2,0.2)",
        "elev-medium": "0 4px 4px rgba(0,0,0,0.16)",
        "elev-high": "0 8px 16px rgba(0,0,0,0.24)",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-rec": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pop-in": "pop-in 350ms cubic-bezier(0.25,1,0.5,1)",
        "fade-in": "fade-in 200ms ease",
        "slide-up": "slide-up 300ms cubic-bezier(0.25,1,0.5,1)",
        "pulse-rec": "pulse-rec 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
