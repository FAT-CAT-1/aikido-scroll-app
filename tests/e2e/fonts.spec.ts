// Web フォントの読み込み順（backlog T31 / src/lib/fonts.ts）
// - 初回：技データを表示してから html.fonts を付け、Web フォントに切り替える（フォントが JS・データより先に帯域を取らない）
// - 2回目以降（Service Worker が制御＝precache 済み）：アプリの JS より前、HTML の段階で html.fonts が付いている
import { expect, test } from '@playwright/test'

test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium で確認')

declare global {
  interface Window {
    __fontsOn?: { contentShown: boolean }
    __fontsAtDomReady?: boolean
  }
}

test('初回は技データの表示後に Web フォントへ切り替わる', async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (!window.__fontsOn && document.documentElement.classList.contains('fonts')) {
        window.__fontsOn = { contentShown: !!document.querySelector('.kf-desc') }
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] })
  })
  await page.goto('./#/techniques/ikkyo-omote')
  await expect(page.locator('.kf-desc')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__fontsOn ?? null)).toEqual({ contentShown: true })
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Shippori Mincho"', '合氣道'))).toBe(true)
  const family = await page.locator('.kf-desc').evaluate((el) => getComputedStyle(el).fontFamily)
  expect(family).toContain('Shippori Mincho')
})

test('Service Worker の制御下では最初から Web フォントで表示する', async ({ page }) => {
  test.skip(process.env.E2E_TARGET === 'dev', 'Service Worker は本番ビルドのみ')
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100))
  })
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      window.__fontsAtDomReady = document.documentElement.classList.contains('fonts')
    })
  })
  await page.reload()
  await expect(page.locator('.chapter').first()).toBeVisible()
  expect(await page.evaluate(() => window.__fontsAtDomReady)).toBe(true)
})
