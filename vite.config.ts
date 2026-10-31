import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/azure-soullink-tracking/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
      ],
      manifest: {
        name: "Fisi's Tracker",
        short_name: "Fisi's Tracker",
        description: "Fisi's Tracker for Fisi and Seri · Pokémon Unbound",
        lang: 'en',
        dir: 'ltr',
        start_url: '/azure-soullink-tracking/',
        scope: '/azure-soullink-tracking/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#E4F3FF',
        theme_color: '#E4F3FF',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: 'unbound-v10-import',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,woff,woff2,ttf,ico,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^https:\/\/raw\.githubusercontent\.com\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'poke-sprites',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 365 },
              // Opaque image responses are status 0. Never replace a sprite
              // fetch with a synthetic error; a miss falls through to the
              // image's own onError Poké Ball.
              cacheableResponse: { statuses: [0, 200] },
              fetchOptions: { mode: 'no-cors', credentials: 'omit', redirect: 'follow' },
            },
          },
        ],
      },
    }),
  ],
})
