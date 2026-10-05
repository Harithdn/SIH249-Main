/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#F3F6F9',
        elev: '#FFFFFF',
        surface: '#FFFFFF',
        surface2: '#F7F9FB',
        inset: '#EEF2F6',
        line: { DEFAULT: '#D8E0E8', strong: '#B9C6D2' },
        txt: { DEFAULT: '#172B3A', dim: '#526575', faint: '#718291' },
        acc: { DEFAULT: '#1677B8', dim: '#E2F1FA', strong: '#238AC8' },
        ok: { DEFAULT: '#238A5B', dim: '#E8F6EF' },
        warn: { DEFAULT: '#B7791F', dim: '#FFF5DC' },
        alert: { DEFAULT: '#C45D21', dim: '#FFF0E5' },
        crit: { DEFAULT: '#C0393B', dim: '#FDECEC' },
        off: { DEFAULT: '#647685', dim: '#EDF1F5' },
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
