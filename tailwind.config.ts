import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: '#09090F',
        'ink-2': '#12121C',
        'ink-3': '#1C1C2A',
        'ink-4': '#252535',
        orange: '#FF6B35',
        'orange-hover': '#FF7F4E',
        'game-cyan': '#06D6FE',
        'game-yellow': '#FFD600',
        'game-pink': '#FF2D7A',
        'game-lime': '#39FF14',
        'game-violet': '#9B5DE5',
        snow: '#F0F0FF',
        'snow-muted': '#8888AA',
        'snow-faint': '#44445A',
      },
      boxShadow: {
        'glow-orange': '0 0 30px rgba(255,107,53,0.4)',
        'glow-cyan': '0 0 30px rgba(6,214,254,0.35)',
        'glow-yellow': '0 0 30px rgba(255,214,0,0.35)',
        'glow-pink': '0 0 30px rgba(255,45,122,0.35)',
        'glow-violet': '0 0 30px rgba(155,93,229,0.35)',
        card: '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}

export default config
