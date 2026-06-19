import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0a2540',
        amber: { DEFAULT: '#f59e0b' },
        success: '#10b981',
      },
    },
  },
  plugins: [],
};

export default config;
