import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0d14',
        surface: {
          50: '#161b26',
          100: '#121620',
          200: '#0e1219',
          300: '#0a0d13',
          card: 'rgba(16, 21, 30, 0.75)',
        },
        brand: {
          cyan: '#00f2fe',
          blue: '#38bdf8',
          emerald: '#10b981',
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
      typography: {
        DEFAULT: {
          css: {
            color: '#cbd5e1', // slate-300
            maxWidth: 'none',
            fontSize: '1rem',
            lineHeight: '1.85',
            'p, ul, ol, blockquote': {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            'h1, h2, h3, h4, h5, h6': {
              color: '#f8fafc', // slate-50
              fontWeight: '700',
              letterSpacing: '-0.02em',
              scrollMarginTop: '6rem',
            },
            h2: {
              fontSize: '1.5rem',
              marginTop: '2.5rem',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            },
            h3: {
              fontSize: '1.25rem',
              marginTop: '2rem',
              marginBottom: '0.75rem',
              color: '#f1f5f9',
            },
            h4: {
              fontSize: '1.05rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
              color: '#e2e8f0',
            },
            strong: {
              color: '#f8fafc',
              fontWeight: '600',
            },
            a: {
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: '500',
              borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
              transition: 'border-color 0.2s, color 0.2s',
              '&:hover': {
                color: '#7dd3fc',
                borderBottomColor: '#7dd3fc',
              },
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.625em',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.625em',
            },
            li: {
              marginTop: '0.375em',
              marginBottom: '0.375em',
              lineHeight: '1.75',
            },
            'li > p': {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            'ul > li::marker': {
              color: '#64748b',
            },
            'ol > li::marker': {
              color: '#94a3b8',
              fontWeight: '500',
            },
            hr: {
              borderColor: 'rgba(255, 255, 255, 0.08)',
              marginTop: '3rem',
              marginBottom: '3rem',
            },
            blockquote: {
              fontWeight: '400',
              fontStyle: 'normal',
              color: '#94a3b8',
              borderLeftWidth: '3px',
              borderLeftColor: '#38bdf8',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '0.75rem 1.25rem',
              borderRadius: '0 0.75rem 0.75rem 0',
              quotes: 'none',
            },
            'blockquote p:first-of-type::before': {
              content: 'none',
            },
            'blockquote p:last-of-type::after': {
              content: 'none',
            },
            table: {
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            },
            thead: {
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            },
            'thead th': {
              color: '#f8fafc',
              fontWeight: '600',
              textAlign: 'left',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(255, 255, 255, 0.05)',
            },
            'tbody td': {
              padding: '0.75rem 1rem',
              verticalAlign: 'top',
            },
            code: {
              color: '#e2e8f0',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
              fontSize: '0.875em',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            img: {
              borderRadius: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
