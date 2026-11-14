import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the app from https://<user>.github.io/KrokLingo/
  base: command === 'build' ? '/KrokLingo/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
}))
