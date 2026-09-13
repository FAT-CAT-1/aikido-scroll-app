// オフライン（F-10 / backlog T28）: 本番ビルドの Service Worker で precache した後、通信を切っても一教が全部動く
import { expect, test } from '@playwright/test'
import { expectDepth } from './helpers'

test.skip(process.env.E2E_TARGET === 'dev', 'Service Worker は本番ビルドのみ')
test.skip(({ browserName }) => browserName !== 'chromium', 'オフラインのエミュレーションは Chromium で確認')

test('機内モード相当で、技・トグル・単語集が表示される', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100))
  })
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0)

  await context.setOffline(true)
  await page.goto('./#/techniques/ikkyo-omote')
  await expect(page.locator('.stage.paused')).toBeVisible()
  await expect(page.locator('.bubble')).toHaveCount(6)
  await page.locator('.bubble[data-part=hara]').click()
  await page.locator('#part-toggle .more').click()
  await expectDepth(page, 2)
  await page.goto('./#/glossary')
  await expect(page.locator('.card').first()).toBeVisible()
  expect(await page.evaluate(() => navigator.onLine)).toBe(false)
  await context.setOffline(false)
})
