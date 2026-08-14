import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)',
        'surface-solid': 'var(--surface-solid)',
        'surface-hover': 'var(--surface-hover)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-subtle': 'var(--fg-subtle)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'HarmonyOS Sans SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono Variable',
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        DEFAULT: '250ms',
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 var(--highlight), var(--shadow-card)',
      },
      maxWidth: {
        prose: '68ch',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--fg-muted)',
            color: 'var(--fg-muted)',
            maxWidth: 'none',
            fontSize: '0.9375rem',
            lineHeight: '1.9',
            'p, ul, ol, blockquote': {
              marginTop: '1.3em',
              marginBottom: '1.3em',
            },
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--fg)',
              fontWeight: '650',
              letterSpacing: '-0.02em',
              scrollMarginTop: '6rem',
            },
            h2: {
              fontSize: '1.375rem',
              marginTop: '2.75rem',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--line)',
            },
            h3: {
              fontSize: '1.125rem',
              marginTop: '2rem',
              marginBottom: '0.75rem',
            },
            h4: {
              fontSize: '1rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
            },
            strong: {
              color: 'var(--fg)',
              fontWeight: '600',
            },
            a: {
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: '450',
              borderBottom: '1px solid var(--accent-line)',
              transition: 'border-color 250ms cubic-bezier(0.16,1,0.3,1), color 250ms cubic-bezier(0.16,1,0.3,1)',
              '&:hover': {
                color: 'var(--accent-hover)',
                borderBottomColor: 'var(--accent)',
              },
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5em',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.5em',
            },
            li: {
              marginTop: '0.35em',
              marginBottom: '0.35em',
              lineHeight: '1.8',
            },
            'li > p': {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            'ul > li::marker': {
              color: 'var(--fg-subtle)',
            },
            'ol > li::marker': {
              color: 'var(--fg-subtle)',
              fontWeight: '450',
            },
            hr: {
              borderColor: 'var(--line)',
              marginTop: '3rem',
              marginBottom: '3rem',
            },
            blockquote: {
              fontWeight: '400',
              fontStyle: 'normal',
              color: 'var(--fg-subtle)',
              borderLeftWidth: '2px',
              borderLeftColor: 'var(--accent-line)',
              backgroundColor: 'transparent',
              paddingLeft: '1.15rem',
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
              fontSize: '0.875rem',
            },
            thead: {
              borderBottomWidth: '1px',
              borderBottomColor: 'var(--line-strong)',
            },
            'thead th': {
              color: 'var(--fg)',
              fontWeight: '600',
              textAlign: 'left',
              padding: '0.6rem 0.9rem',
              backgroundColor: 'transparent',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderBottomColor: 'var(--line)',
            },
            'tbody td': {
              padding: '0.6rem 0.9rem',
              verticalAlign: 'top',
            },
            code: {
              color: 'var(--fg)',
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--line)',
              padding: '0.15em 0.4em',
              borderRadius: '0.3rem',
              fontWeight: '400',
              fontSize: '0.85em',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            'pre code': {
              border: 'none',
            },
            img: {
              borderRadius: '0.625rem',
              border: '1px solid var(--line)',
              marginTop: '1.75rem',
              marginBottom: '1.75rem',
            },
            figcaption: {
              color: 'var(--fg-subtle)',
              fontSize: '0.8125rem',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
