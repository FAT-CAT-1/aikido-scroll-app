// axe-core：主要画面で WCAG 2.2 A/AA の違反 0（SKILL §7 / requirements §9 / backlog T30）
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectDepth, openTechnique } from './helpers'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page, label: string) {
  // 段の出現・ズームのアニメーション途中の半透明な色で判定しないよう、終わるまで待つ
  await page.waitForTimeout(800)
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const summary = result.violations.map((v) => `${v.id}（${v.impact}）: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
  expect(summary, `${label} の axe 違反`).toEqual([])
}

test.describe('axe（WCAG 2.2 AA）', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'axe は Chromium で1回だけ実行')
  // precache 完了の通知が検査の途中（表示アニメーションの半透明な状態）に出ないよう、Service Worker は止める。通知は下の専用テストで確認
  test.use({ serviceWorkers: 'block' })

  test('巻物トップ', async ({ page }) => {
    await page.goto('./#/')
    await expect(page.locator('.chapter').first()).toBeVisible()
    await expectNoViolations(page, '巻物トップ')
  })

  test('技の一覧', async ({ page }) => {
    await page.goto('./#/techniques')
    await expect(page.locator('.card').first()).toBeVisible()
    await expectNoViolations(page, '技の一覧')
  })

  test('技詳細（一時停止・吹き出し）', async ({ page }) => {
    await openTechnique(page)
    await expectNoViolations(page, '技詳細')
  })

  test('技詳細（深層トグル l5・受けの視点）', async ({ page }) => {
    await openTechnique(page)
    await page.getByRole('tab', { name: /受け/ }).click()
    await page.locator('.bubble[data-part=shoulder]').click()
    for (let i = 0; i < 4; i++) await page.locator('#part-toggle .more').click()
    await expectDepth(page, 5)
    await expectNoViolations(page, '深層トグル')
  })

  test('単語集と用語詳細', async ({ page }) => {
    await page.goto('./#/glossary')
    await expect(page.locator('.card').first()).toBeVisible()
    await expectNoViolations(page, '単語集')
    await page.goto('./#/glossary/irimi')
    await expect(page.locator('#term-title')).toBeVisible()
    await expectNoViolations(page, '用語詳細')
  })

  test('更新・オフライン準備の通知', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('aikido-sw-updated', '1'))
    await page.goto('./#/')
    await expect(page.locator('.toast')).toContainText('新しい版に更新しました')
    await expectNoViolations(page, '通知')
  })

  test('reduced-motion の技詳細', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 412, height: 915 } })
    const page = await context.newPage()
    await page.goto('./#/techniques/ikkyo-omote')
    await expect(page.locator('.stage.paused')).toBeVisible()
    await expect(page.getByRole('button', { name: '再生', exact: true })).toHaveCount(0)
    await expectNoViolations(page, 'reduced-motion')
    await context.close()
  })
})
