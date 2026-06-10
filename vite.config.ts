import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the same build works served by Flask on the Pi
// and under a subpath (e.g. seriouspeople.co/meetpetro) on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
