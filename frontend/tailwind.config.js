/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#8c2bee",
        "background-light": "#f7f6f8",
        "background-dark": "#191022",
        // legacy aliases for compatibility
        bg: "#191022",
        card: "rgba(255, 255, 255, 0.03)",
        text: "#ffffff",
        muted: "rgba(255, 255, 255, 0.5)",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "serif": ["Playfair Display", "serif"],
        sans: ["Space Grotesk", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
