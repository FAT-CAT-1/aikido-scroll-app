// E2E（design-complete A-11: iPhone/Pixel エミュレーションで 一時停止→吹き出し→展開→戻る→ピンチ→単語集往復、axe）
//   npm run test:e2e              … 本番ビルド＋preview（Service Worker あり）で iPhone(WebKit)・Pixel(Chromium)
//   E2E_TARGET=dev npm run test:e2e … 開発サーバーで（原稿の執筆途中など、本番ビルドが通らないとき）
import { defineConfig, devices } from '@playwright/test'

const dev = process.env.E2E_TARGET === 'dev'
const port = dev ? 5176 : 4176
const baseURL = `http://localhost:${port}/aikido-scroll-app/`

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: dev ? `npx vite --port ${port} --strictPort` : `npm run build && npx vite preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'pixel-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
