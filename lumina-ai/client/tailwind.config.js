/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A10",
        surface: "#14141C",
        surface2: "#1C1C27",
        line: "#2A2A38",
        ink: "#F2F1F8",
        muted: "#9591AC",
        violet: "#8B5CF6",
        cyan: "#22D3EE",
        coral: "#FB7756",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        prism: "linear-gradient(115deg, #8B5CF6 0%, #22D3EE 50%, #FB7756 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139, 92, 246, 0.45)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
