module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#111827',
        surface: '#0b1220',
        muted: '#6b7280',
        glassLight: 'rgba(255,255,255,0.04)',
        glassStrong: 'rgba(255,255,255,0.06)'
      },
      boxShadow: {
        'glass-lg': '0 10px 40px rgba(2,6,23,0.7)'
      }
    }
  },
  plugins: [],
}
