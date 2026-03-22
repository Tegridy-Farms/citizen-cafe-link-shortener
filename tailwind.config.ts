import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        // Brand palette per design bible
        brand: {
          yellow: '#FFE300',
          charcoal: '#373230',
        },
        surface: '#FAFAFA',
        border: '#E4E1DC',
        'text-primary': '#373230',
        'text-muted': '#7A756F',
        error: '#B91C1C',
        success: '#065F46',
      },
      fontFamily: {
        sans: ['Assistant', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
