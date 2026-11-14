import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the app from https://<user>.github.io/KrokLingo/
  base: command === 'build' ? '/KrokLingo/' : '/',
  plugins: [react()],
}))
