/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cursor: {
          primary: '#8B5CF6',
          secondary: '#6366F1',
          accent: '#3B82F6',
          dark: '#0A0A0B',
          darker: '#050505',
          light: '#1A1A1C',
          lighter: '#252528',
          border: '#2A2A2D',
          text: '#E4E4E7',
          'text-muted': '#A1A1AA',
        },
        reddit: {
          orange: '#FF4500',
          dark: '#1a1a1b',
          light: '#272729',
        },
      },
      backgroundImage: {
        'gradient-cursor': 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0B 0%, #1A1A1C 100%)',
      },
      boxShadow: {
        'cursor-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'cursor-glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
    },
  },
  plugins: [],
}






