import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import contentPlugin from './scripts/vite-plugin-content.mjs'

// GitHub Pages のサブパス配信（design-complete A-10）。カスタムドメイン時は '/'
const base = '/aikido-scroll-app/'

export default defineConfig({
  base,
  plugins: [
    // content/ → src/generated/（起動・ビルド時に生成、dev は変更を監視）
    contentPlugin(),
    svelte(),
    // design-complete A-9。manifest はここで定義する（docs/decisions.md D-09〜D-12）
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // アイコン類は workbox.globPatterns で precache 済みのため、二重登録しない
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: '合氣道徹底解説',
        short_name: '合氣道',
        description: '獨協大学合氣道部の技を、取り・受けのアニメーションと部位ごとの解説で学ぶアプリ',
        lang: 'ja',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#efe8d8',
        theme_color: '#1a1a1a',
        categories: ['education', 'sports'],
        icons: [
          { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // オフラインで全コンテンツ（JSON は JS チャンクとして同梱）・フォント・アイコンを閲覧可（F-10）
        // manifest.webmanifest はプラグインが自動で precache に加える
        globPatterns: ['**/*.{js,css,html,svg,json,woff2,png,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
})
