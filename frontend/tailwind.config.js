/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0B1015',
        elev: '#0E141A',
        surface: '#121A21',
        surface2: '#161F27',
        inset: '#0C1218',
        line: { DEFAULT: '#1F2A33', strong: '#2A3641' },
        txt: { DEFAULT: '#E5E8EA', dim: '#929CA5', faint: '#75808B' },
        acc: { DEFAULT: '#56A8CC', dim: '#17303C', strong: '#6FBEDD' },
        ok: { DEFAULT: '#6FB789', dim: '#142219' },
        warn: { DEFAULT: '#D4AC55', dim: '#251F10' },
        alert: { DEFAULT: '#D98B54', dim: '#251A0F' },
        crit: { DEFAULT: '#D97070', dim: '#261313' },
        off: { DEFAULT: '#8A95A0', dim: '#171E25' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        xxs: ['10.5px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [],
}
