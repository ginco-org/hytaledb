/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'var(--sl-color-gray-5)',
        background: 'var(--sl-color-bg)',
        foreground: 'var(--sl-color-text)',
        card: {
          DEFAULT: 'var(--sl-color-bg-nav)',
        },
        muted: {
          DEFAULT: 'var(--sl-color-gray-6)',
          foreground: 'var(--sl-color-gray-2)',
        },
        destructive: {
          DEFAULT: 'var(--sl-color-red)',
          foreground: 'var(--sl-color-red)',
        },
      },
    },
  },
  plugins: [],
}
