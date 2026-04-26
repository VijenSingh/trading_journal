/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { 950:"#05070D", 900:"#090D17", 800:"#0F1520", 700:"#141C28", 600:"#1A2334", 500:"#202B3E" },
        green: { DEFAULT:"#00E676", dim:"rgba(0,230,118,0.1)", bright:"#69FF9C" },
        red: { DEFAULT:"#FF4560", dim:"rgba(255,69,96,0.1)" },
        blue: { DEFAULT:"#4D8EFF", dim:"rgba(77,142,255,0.1)" },
        amber: { DEFAULT:"#FFB020", dim:"rgba(255,176,32,0.1)" },
        purple: { DEFAULT:"#A855F7", dim:"rgba(168,85,247,0.1)" },
        ink: { 100:"#E8EDF5", 200:"#B0BDD0", 300:"#7A8BA5", 400:"#4A5870", 500:"#2D3A50" },
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
        pulseGreen:{ "0%,100%":{boxShadow:"0 0 0 0 rgba(0,230,118,0)"}, "50%":{boxShadow:"0 0 20px 4px rgba(0,230,118,0.2)"} },
      },
      borderRadius: { xl:"12px", "2xl":"16px", "3xl":"20px" },
      boxShadow: {
        card:"0 4px 32px rgba(0,0,0,0.5)",
        glow:"0 0 24px rgba(0,230,118,0.2)",
        "glow-red":"0 0 24px rgba(255,69,96,0.2)",
      },
    },
  },
  plugins: [],
};
