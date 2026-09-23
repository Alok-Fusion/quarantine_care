import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-hover': 'var(--panel-hover)',
        subpanel: 'var(--subpanel)',
        input: 'var(--input-bg)',
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'status-fever': 'var(--status-fever)',
        'status-stable': 'var(--status-stable)',
        'status-pending': 'var(--status-pending)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        btn: 'var(--btn)',
        'btn-hover': 'var(--btn-hover)',
        'btn-active': 'var(--btn-active)',
        'alert-bg': 'var(--alert-bg)',
        'badge-bg': 'var(--badge-bg)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
