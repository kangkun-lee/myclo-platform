/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        card: "#18181b",
        primary: "#cffafe",
        accent: "#a78bfa",
        text: "#fafafa",
        muted: "#a1a1aa",
        border: "rgba(255, 255, 255, 0.1)",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(207, 250, 254, 0.2)",
      },
    },
  },
  plugins: [],
}
