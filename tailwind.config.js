/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003262',
          light: '#004080',
          dark: '#002040'
        },
        secondary: {
          DEFAULT: '#FDB515',
          light: '#FFC947',
          dark: '#E6A000'
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      }
    }
  },
  plugins: []
};

