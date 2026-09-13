// 単語集の往復（F-07 / backlog T27）と一覧（F-08）
import { expect, test } from '@playwright/test'
import { expectDepth, openTechnique, scrubTo } from './helpers'

test('用語リンク→単語集→戻るで、同じ視点・再生位置・トグル深さ・スクロールに戻る', async ({ page }) => {
  await openTechnique(page)
  await page.getByRole('tab', { name: /受け/ }).click()
  await scrubTo(page, 0.15)
  await page.locator('.bubble[data-part=shoulder]').click()
  await page.locator('#part-toggle .more').click()
  await page.locator('#part-toggle .more').click()
  await expectDepth(page, 3)

  const term = page.locator('#part-toggle a.term').first()
  await term.scrollIntoViewIfNeeded()
  const scrollBefore = await page.evaluate(() => Math.round(window.scrollY))
  const slider = page.getByRole('slider', { name: /技の再生位置/ })
  const at = await slider.getAttribute('aria-valuenow')
  const termName = (await term.textContent()) ?? ''
  await term.click()

  await expect(page).toHaveURL(/#\/glossary\//)
  await expect(page.locator('#term-title')).toBeVisible()
  await page.goBack()

  await expect(page).toHaveURL(/#\/techniques\/ikkyo-omote$/)
  await expectDepth(page, 3)
  await expect(page.getByRole('tab', { name: /受け/ })).toHaveAttribute('aria-selected', 'true')
  await expect(slider).toHaveAttribute('aria-valuenow', at ?? '')
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(scrollBefore)
  expect(termName.length).toBeGreaterThan(0)

  await page.goBack()
  await expectDepth(page, 2)
})

test('単語集を検索・分類で絞り込み、用語から出てくる技へ移動できる', async ({ page }) => {
  await page.goto('./#/glossary')
  await expect(page.locator('.card').first()).toBeVisible()
  await page.getByRole('searchbox', { name: '用語を検索' }).fill('イリミ')
  await expect(page.locator('.card .name').first()).toHaveText('入身')
  await page.locator('.card', { hasText: '入身' }).first().click()
  await expect(page.locator('#term-title')).toHaveText('入身')
  await page.getByRole('link', { name: '一教（表）' }).click()
  await expect(page).toHaveURL(/#\/techniques\/ikkyo-omote$/)
})
