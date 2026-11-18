import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function siteHtmlMetaPlugin(isAdminBuild: boolean): Plugin {
  return {
    name: 'site-html-meta-transform',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!isAdminBuild) {
          return html;
        }

        const adminHeadTags = `
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
    />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#050507" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="AdminStudio" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-admin.png" />
    <link rel="icon" type="image/svg+xml" href="/icon-admin.svg" />
    <title>Admin Studio Control</title>
    <meta name="description" content="Private administration studio." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Oswald:wght@500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
      rel="stylesheet"
    />`;

        return html.replace(/<head>[\s\S]*?<\/head>/, `<head>${adminHeadTags}\n  </head>`);
      },
    },
  };
}

function isolateOutputAssetsPlugin(appMode: string | undefined): Plugin {
  let outDir = 'dist';
  return {
    name: 'isolate-output-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const rmIfExists = (relPath: string) => {
        const target = path.join(outDir, relPath);
        if (fs.existsSync(target)) {
          fs.rmSync(target, { recursive: true, force: true });
        }
      };

      // Always strip user upload attachments from deployable builds
      rmIfExists('assets/aistudio');

      if (appMode === 'viewer') {
        rmIfExists('icon-admin.svg');
        rmIfExists('apple-touch-icon-admin.png');
        rmIfExists('pwa-admin-192.png');
        rmIfExists('pwa-admin-512.png');
        rmIfExists('pwa-admin-maskable-512.png');
      } else if (appMode === 'admin') {
        rmIfExists('icon.svg');
        rmIfExists('apple-touch-icon.png');
        rmIfExists('pwa-192x192.png');
        rmIfExists('pwa-512x512.png');
        rmIfExists('pwa-maskable-512x512.png');
        rmIfExists('sitemap.xml');
        rmIfExists('assets/og-card.jpg');
        rmIfExists('assets/og-card.png');
        rmIfExists('assets/shanto-cutout.png');
        const robotsPath = path.join(outDir, 'robots.txt');
        if (fs.existsSync(outDir)) {
          fs.writeFileSync(robotsPath, 'User-agent: *\nDisallow: /\n', 'utf8');
        }
      }
    },
  };
}

export default defineConfig(() => {
  const appMode = process.env.VITE_APP_MODE;
  const isAdminBuild = appMode === 'admin';
  const isViewerBuild = appMode === 'viewer';

  const appEntryPath = isAdminBuild
    ? path.resolve(__dirname, 'src/AdminApp.tsx')
    : isViewerBuild
      ? path.resolve(__dirname, 'src/ViewerApp.tsx')
      : path.resolve(__dirname, 'src/App.tsx');

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
              name: 'Admin Studio Control',
              short_name: 'AdminStudio',
              description: 'Private administration control portal.',
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
          globPatterns: isAdminBuild
            ? ['**/*.{js,css,html,woff,woff2}', 'pwa-admin-*.png', 'icon-admin.svg']
            : ['**/*.{js,css,html,ico,svg,woff,woff2}'],
          globIgnores: isAdminBuild
            ? ['**/aistudio/**', '**/og-card.*', '**/shanto-cutout.*', '**/pwa-192*', '**/pwa-512*', '**/pwa-maskable*']
            : ['**/aistudio/**', '**/pwa-admin-*', '**/icon-admin.svg', '**/apple-touch-icon-admin.png'],
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
          enabled: false,
        },
      }),
      isolateOutputAssetsPlugin(appMode),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@app-entry': appEntryPath,
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
