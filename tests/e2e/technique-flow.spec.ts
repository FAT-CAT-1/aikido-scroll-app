// 通し操作：一時停止→吹き出し→タップで l1〜l5→戻る×5→ピンチ→再生中に触れて停止（backlog T30 / M3 の観点）
import { expect, test } from '@playwright/test'
import { expectDepth, openTechnique, pinch, scrubTo } from './helpers'

test('一覧から技を開き、一時停止で6部位の吹き出しが出る', async ({ page }) => {
  await page.goto('./#/techniques')
  await page.getByRole('link', { name: /一教（表）/ }).click()
  await expect(page).toHaveURL(/#\/techniques\/ikkyo-omote$/)
  await expect(page.locator('.stage.paused')).toBeVisible()
  const texts = await page.locator('.bubble .text').allTextContents()
  expect(texts).toHaveLength(6)
  for (const t of texts) expect(t).not.toContain('原稿準備中')
})

test('kf を跨ぐと吹き出しの文が変わる（巻物をスクロールして止める）', async ({ page }) => {
  await openTechnique(page)
  const before = await page.locator('.bubble[data-part=eye] .text').textContent()
  await scrubTo(page, 0.36)
  await expect(page.locator('.kf-name')).toContainText('崩し')
  await expect(page.locator('.bubble[data-part=eye] .text')).not.toHaveText(before ?? '')
})

test('タップで1段ずつ l5 まで開き、戻るボタンで1段ずつ閉じる', async ({ page }) => {
  await page.goto('./#/techniques')
  await page.getByRole('link', { name: /一教（表）/ }).click()
  await expect(page.locator('.stage.paused')).toBeVisible()

  await page.locator('.bubble[data-part=hara]').click()
  await expectDepth(page, 1)
  await expect(page.locator('#part-toggle h2')).toContainText('腹（帯）')
  await expect(page.locator('.bubble[data-part=hara]')).toHaveAttribute('aria-expanded', 'true')
  for (let d = 2; d <= 5; d++) {
    await page.locator('#part-toggle .more').click()
    await expectDepth(page, d)
  }
  await expect(page.locator('#part-toggle .level')).toHaveCount(5)
  await expect(page.locator('#part-toggle .more')).toBeDisabled()

  for (let d = 4; d >= 0; d--) {
    await page.goBack()
    await expectDepth(page, d)
  }
  await expect(page).toHaveURL(/#\/techniques\/ikkyo-omote$/)
  // 全部閉じた後の戻るで一覧へ（スタックの底で1回だけ抜ける）
  await page.goBack()
  await expect(page).toHaveURL(/#\/techniques$/)
})

test('ピンチアウトで1段開き、ピンチインで1段閉じる（1回のピンチで1段）', async ({ page }) => {
  await openTechnique(page)
  await pinch(page, 'out', 'knee')
  await expectDepth(page, 1)
  await expect(page.locator('#part-toggle h2')).toContainText('膝')
  await pinch(page, 'out', 'knee')
  await expectDepth(page, 2)
  await pinch(page, 'in', 'knee')
  await expectDepth(page, 1)
  await page.goBack()
  await expectDepth(page, 0)
})

test('Esc と「一段閉じる」でも1段ずつ閉じ、全部閉じると吹き出しへフォーカスが戻る', async ({ page }) => {
  await openTechnique(page)
  await page.locator('.bubble[data-part=eye]').click()
  await page.locator('#part-toggle .more').click()
  await expectDepth(page, 2)
  await page.keyboard.press('Escape')
  await expectDepth(page, 1)
  await page.locator('#part-toggle .less').click()
  await expectDepth(page, 0)
  await expect(page.locator('.bubble[data-part=eye]')).toBeFocused()
})

test('再生すると進み、再生中に巻物へ触れると止まって吹き出しが出る', async ({ page }) => {
  await openTechnique(page)
  await page.getByRole('button', { name: '再生', exact: true }).click()
  const slider = page.getByRole('slider', { name: /技の再生位置/ })
  await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(8)
  await expect(page.locator('.stage')).not.toHaveClass(/paused/)
  await slider.dispatchEvent('pointerdown')
  await expect(page.getByRole('button', { name: '再生', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.stage.paused')).toBeVisible()
})

test('巻物を右端から左端（最初）まで一気に戻すと、構えに戻る', async ({ page }) => {
  await openTechnique(page)
  const slider = page.getByRole('slider', { name: /技の再生位置/ })
  await scrubTo(page, 1)
  await expect(slider).toHaveAttribute('aria-valuenow', '100')
  await scrubTo(page, 0)
  await expect(slider).toHaveAttribute('aria-valuenow', '0')
})

test('視点を受けに切り替えても再生位置を保つ', async ({ page }) => {
  await openTechnique(page)
  await scrubTo(page, 0.55)
  const slider = page.getByRole('slider', { name: /技の再生位置/ })
  const at = await slider.getAttribute('aria-valuenow')
  await page.getByRole('tab', { name: /受け/ }).click()
  // 3D でも 2D でも、アニメ領域の説明が受けの視点になる（3D はカメラが受けの側へ回り、2D は左右反転）
  await expect(page.locator('.drawing [role=img]')).toHaveAttribute('aria-label', /受けの視点/)
  await expect(page.locator('#uke-knee-f .anchor')).toHaveCount(1)
  await expect(slider).toHaveAttribute('aria-valuenow', at ?? '')
})
