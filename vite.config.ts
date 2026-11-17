import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function siteHtmlMetaPlugin(isAdminBuild: boolean): Plugin {
  return {
    name: 'site-html-meta-transform',
    transformIndexHtml(html) {
      if (isAdminBuild) {
        return html
          .replace(
            '<title>SHANTO — Web Developer, App &amp; Game Creator</title>',
            '<title>SHANTO Admin — Portfolio Studio</title>\n    <meta name="robots" content="noindex, nofollow" />'
          )
          .replace(/content="https:\/\/sbshanto\.web\.app\/"/g, 'content="https://sbadminshanto.web.app/"')
          .replace(/href="https:\/\/sbshanto\.web\.app\/"/g, 'href="https://sbadminshanto.web.app/"')
          .replace('/apple-touch-icon.png', '/apple-touch-icon-admin.png')
          .replace('/icon.svg', '/icon-admin.svg')
          .replace('content="SHANTO" />\n    <link rel="apple-touch-icon"', 'content="ShantoAdmin" />\n    <link rel="apple-touch-icon"');
      }
      return html;
    },
  };
}

export default defineConfig(() => {
  const isAdminBuild = process.env.VITE_APP_MODE === 'admin';

  return {
    plugins: [
      react(),
      tailwindcss(),
      siteHtmlMetaPlugin(isAdminBuild),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: isAdminBuild
          ? [
              'icon-admin.svg',
              'apple-touch-icon-admin.png',
              'pwa-admin-192.png',
              'pwa-admin-512.png',
              'pwa-admin-maskable-512.png',
            ]
          : [
              'icon.svg',
              'apple-touch-icon.png',
              'pwa-192x192.png',
              'pwa-512x512.png',
              'pwa-maskable-512x512.png',
            ],
        manifest: isAdminBuild
          ? {
              id: '/',
              name: 'SHANTO Admin — Portfolio Studio',
              short_name: 'ShantoAdmin',
              description:
                'Mobile-ready admin control center for Shanto portfolio analytics, projects, CV, and client inquiries.',
              theme_color: '#050507',
              background_color: '#050507',
              display: 'standalone',
              orientation: 'portrait',
              start_url: '/',
              scope: '/',
              icons: [
                {
                  src: '/pwa-admin-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/pwa-admin-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/pwa-admin-maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            }
          : {
              id: '/',
              name: 'SHANTO — Web, App & Game Studio',
              short_name: 'SHANTO',
              description:
                'Interactive portfolio for Shanto showcasing custom websites, full-stack apps, and 2D/3D games.',
              theme_color: '#050507',
              background_color: '#050507',
              display: 'standalone',
              start_url: '/',
              scope: '/',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/pwa-maskable-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
          globIgnores: ['**/aistudio/**'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
