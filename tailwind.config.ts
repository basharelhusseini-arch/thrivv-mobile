import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Premium fitness-tech color system
        thrivv: {
          bg: {
            dark: '#0B0D10',
            darker: '#060708',
            card: '#13151A',
          },
          // UI accent gold; the wordmark uses its own champagne-gold finish.
          gold: {
            DEFAULT: '#FFD000',
            50: '#FFFBEB',
            100: '#FFF4CC',
            200: '#FFE999',
            300: '#FFDD66',
            400: '#FFD633',
            500: '#FFD000',
            600: '#E6BB00',
            700: '#CCA600',
            800: '#B39100',
          },
          neon: {
            green: '#10B981',
          },
          text: {
            primary: '#F9FAFB',
            secondary: '#9CA3AF',
            muted: '#6B7280',
          }
        },
        // Aliases for common usage
        'brand-primary': '#FFD000',
        'brand-gold': '#FFD000',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg': ['1.0625rem', { lineHeight: '1.75rem' }],
        'xl': ['1.1875rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.4375rem', { lineHeight: '2rem' }],
        '3xl': ['1.8125rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.1875rem', { lineHeight: '2.5rem' }],
        '5xl': ['2.875rem', { lineHeight: '1' }],
        '6xl': ['3.5rem', { lineHeight: '1' }],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'slide-up': 'slide-up 0.25s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(16px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(12px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 195, 0, 0.2), 0 0 40px rgba(255, 195, 0, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 195, 0, 0.3), 0 0 60px rgba(255, 195, 0, 0.15)',
          },
        },
        'shimmer': {
          '0%': {
            backgroundPosition: '-200% center',
          },
          '100%': {
            backgroundPosition: '200% center',
          },
        },
      },
      transitionDelay: {
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
};
export default config;
