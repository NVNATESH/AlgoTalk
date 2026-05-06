import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          elevated: '#15151f',
          card: '#1a1a26',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.16)',
        },
        accent: {
          violet: '#8b5cf6',
          fuchsia: '#ec4899',
          emerald: '#10b981',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'mesh-dark':
          'radial-gradient(at 20% 0%, rgba(139,92,246,0.15) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(236,72,153,0.12) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(6,182,212,0.10) 0px, transparent 50%)',
        'gradient-violet': 'linear-gradient(90deg, #8b5cf6, #ec4899)',
        'gradient-emerald': 'linear-gradient(90deg, #10b981, #06b6d4)',
        'gradient-amber': 'linear-gradient(90deg, #f59e0b, #f43f5e)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
