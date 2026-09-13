// 単体テスト（design-complete A-11: loader／pinch／toggleStack／pose 突合）
// アプリ用の Vite プラグイン（原稿生成・PWA）は読み込まない
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
})
