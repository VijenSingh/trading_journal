/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { 950:"#F5F3FF", 900:"#FFFFFF", 800:"#FFFFFF", 700:"#F3EFFB", 600:"#EAE3F7", 500:"#DED3F2" },
        green: { DEFAULT:"#10B981", dim:"rgba(16,185,129,0.1)", bright:"#34D399" },
        red: { DEFAULT:"#F43F5E", dim:"rgba(244,63,94,0.1)" },
        blue: { DEFAULT:"#6366F1", dim:"rgba(99,102,241,0.1)" },
        amber: { DEFAULT:"#F59E0B", dim:"rgba(245,158,11,0.1)" },
        purple: { DEFAULT:"#7C3AED", dim:"rgba(124,58,237,0.1)", bright:"#A78BFA" },
        pink: { DEFAULT:"#EC4899", dim:"rgba(236,72,153,0.1)" },
        ink: { 100:"#1E1B2E", 200:"#453F5C", 300:"#6B6483", 400:"#8B85A0", 500:"#A9A4BC", 600:"#C7C3D6" },
      },
      fontFamily: { sans:["Inter","sans-serif"], mono:["JetBrains Mono","monospace"] },
      animation: {
        "fade-in":"fadeIn 0.2s ease",
        "slide-up":"slideUp 0.3s cubic-bezier(.16,1,.3,1)",
        "pulse-green":"pulseGreen 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:{ from:{opacity:"0"}, to:{opacity:"1"} },
        slideUp:{ from:{opacity:"0",transform:"translateY(16px)"}, to:{opacity:"1",transform:"translateY(0)"} },
        pulseGreen:{ "0%,100%":{boxShadow:"0 0 0 0 rgba(16,185,129,0)"}, "50%":{boxShadow:"0 0 20px 4px rgba(16,185,129,0.25)"} },
      },
      borderRadius: { xl:"12px", "2xl":"16px", "3xl":"20px" },
      boxShadow: {
        card:"0 4px 32px rgba(124,58,237,0.08)",
        glow:"0 0 24px rgba(16,185,129,0.25)",
        "glow-red":"0 0 24px rgba(244,63,94,0.2)",
        "glow-purple":"0 4px 24px rgba(124,58,237,0.35)",
      },
    },
  },
  plugins: [],
};
