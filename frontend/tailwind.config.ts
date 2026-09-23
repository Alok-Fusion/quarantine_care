import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0F1720',
        panel: '#16212C',
        'panel-hover': '#1C2B39',
        border: '#2A3844',
        'border-light': '#3B4E5E',
        text: '#E7EDF2',
        'text-muted': '#8FA1AF',
        'status-fever': '#C4472F',
        'status-stable': '#4F9D69',
        'status-pending': '#D9A441',
        // Button neutrals
        btn: '#223242',
        'btn-hover': '#2C4054',
        'btn-active': '#1A2835',
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
