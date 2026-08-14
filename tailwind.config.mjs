/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#07090e',
        surface: {
          50: '#151922',
          100: '#12161f',
          200: '#0e1219',
          300: '#0a0d13',
          card: 'rgba(18, 22, 31, 0.75)',
        },
        brand: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          emerald: '#10b981',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        'glow-pulse': 'glow 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body': '#9ca3af',
            '--tw-prose-headings': '#f3f4f6',
            '--tw-prose-lead': '#d1d5db',
            '--tw-prose-links': '#38bdf8',
            '--tw-prose-bold': '#f9fafb',
            '--tw-prose-counters': '#6b7280',
            '--tw-prose-bullets': '#4b5563',
            '--tw-prose-hr': '#1f2937',
            '--tw-prose-quotes': '#e5e7eb',
            '--tw-prose-quote-borders': '#0284c7',
            '--tw-prose-captions': '#9ca3af',
            '--tw-prose-code': '#38bdf8',
            '--tw-prose-pre-code': '#e5e7eb',
            '--tw-prose-pre-bg': '#0f141c',
            '--tw-prose-th-borders': '#374151',
            '--tw-prose-td-borders': '#1f2937',
          },
        },
      }),
    },
  },
  plugins: [
    import('@tailwindcss/typography'),
  ],
};
