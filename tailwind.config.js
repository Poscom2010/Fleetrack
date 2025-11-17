/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        surface: {
          100: "#0f172a",
          200: "#111b2f",
          300: "#15213c",
          400: "#1f2937",
        },
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans'",
          "'Inter'",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        brand: "0 20px 45px -20px rgba(99, 102, 241, 0.65)",
        soft: "0 18px 40px -24px rgba(15, 23, 42, 0.65)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)",
        "surface-gradient":
          "radial-gradient(circle at top left, rgba(99, 102, 241, 0.22), transparent 55%), radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.28), transparent 60%)",
      },
      borderRadius: {
        "3xl": "1.5rem",
      },
      blur: {
        "4xl": "96px",
      },
    },
  },
  plugins: [],
};
