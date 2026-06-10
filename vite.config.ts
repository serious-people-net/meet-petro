import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Relative base so the same build works served by Flask on the Pi
// and under a subpath (e.g. seriouspeople.co/meet-petro) on GitHub Pages.
// Two pages: / is the product site, /app/ is the demo / exhibit app.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        site: r('index.html'),
        app: r('app/index.html'),
      },
    },
  },
})
