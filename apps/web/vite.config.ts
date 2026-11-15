import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const DESCRIPTION =
  'Тренажер «Крок 1. Стоматологія»: іспит з таймером, тренування за темами англійською й українською, словник невідомих слів.'

/**
 * Installable app with an offline shell. The service worker precaches the built app; the question
 * bank and user data are not in it (the bank is kept in IndexedDB, the API is always asked live).
 * A new version waits for the user's "Оновити" (see components/PwaPrompt.tsx), so a running test is
 * never reloaded under them.
 */
const pwa = VitePWA({
  registerType: 'prompt',
  injectRegister: false,
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'KrokLingo',
    short_name: 'KrokLingo',
    description: DESCRIPTION,
    lang: 'uk',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['education', 'medical'],
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Тести', url: 'tests', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
      { name: 'Словник', url: 'dictionary', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
    globIgnores: ['404.html'],
    // every app path (/tests, /results/…) opens the cached shell when offline
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  },
})

/**
 * GitHub Pages has no rewrites for single-page apps: a direct link or a refresh on /KrokLingo/tests
 * would be a 404. Shipping index.html as 404.html makes Pages serve the app for every path; the
 * router then reads the path.
 */
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the app from https://<user>.github.io/KrokLingo/ (and `vite preview` mirrors it)
  base: command === 'build' || isPreview ? '/KrokLingo/' : '/',
  plugins: [react(), tailwindcss(), pwa, spaFallback()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
}))
