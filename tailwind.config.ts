import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C96A',
          subtle: 'rgba(201,168,76,.12)',
        },
        fg: '#EDE9E0',
        surface: {
          1: '#0f0f0f',
          2: '#161616',
          3: '#1e1e1e',
          4: '#272727',
          5: '#333333',
        },
        dim: {
          DEFAULT: 'rgba(237,233,224,.4)',
          2: 'rgba(237,233,224,.18)',
        },
        stage: {
          green: '#7ec97e',
          blue: '#8090d0',
          gold: '#C9A84C',
          red: '#c06060',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'serif'],
        sans: ['var(--font-sans)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'DM Mono', 'monospace'],
      },
      borderColor: {
        subtle: 'rgba(255,255,255,.04)',
        'light-border': 'rgba(255,255,255,.07)',
      },
    },
  },
  plugins: [],
}

export default config
