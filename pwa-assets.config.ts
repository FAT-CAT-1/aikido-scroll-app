// PWA アイコン生成設定（`npx pwa-assets-generator` で public/icons/ に PNG を出力しコミットする）
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const washi = '#efe8d8'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: washi } },
    apple: { sizes: [180], padding: 0.1, resizeOptions: { background: washi } },
  },
  images: ['public/icons/icon.svg'],
})
