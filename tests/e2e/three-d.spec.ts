// 3D の技アニメ（docs/animation-spec.md §13）：カメラの切り替え、部位の起点、WebGL が使えない端末での 2D への切り替え
import { expect, type Page, test } from '@playwright/test'
import { openTechnique } from './helpers'

test('3D で描き、カメラ（斜め・横・真上）を切り替えても吹き出しと部位の起点が残る', async ({ page }) => {
  await openTechnique(page)
  const body = page.locator('.body3d')
  test.skip((await body.count()) === 0, 'この端末では WebGL が使えず 2D で表示')
  await expect(page.locator('.body3d.ready')).toBeVisible({ timeout: 20_000 })
  // 記述からの推定の動きには、常に注記が出る（decisions D-41）
  await expect(page.locator('.body3d .note')).toContainText('推定の動き')
  await expect(body).toHaveAttribute('aria-label', /推定の動き/)
  const cams = page.getByRole('group', { name: 'カメラの位置' })
  await expect(cams.getByRole('button', { name: '斜め', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const [name, desc] of [
    ['横', '真横から'],
    ['真上', '真上から'],
    ['斜め', '斜め上から'],
  ] as const) {
    await cams.getByRole('button', { name, exact: true }).click()
    await expect(cams.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(body).toHaveAttribute('aria-label', new RegExp(desc))
    await expect(page.locator('.bubble')).toHaveCount(6)
    // 取りの6部位の起点（手前）が、アニメ領域の中にある
    for (const id of ['tori-eye', 'tori-face', 'tori-shoulder-f', 'tori-hara', 'tori-knee-f', 'tori-foot-f']) {
      const box = await page.locator(`#${id} .anchor`).boundingBox()
      const area = (await page.locator('.drawing').boundingBox())!
      expect(box, id).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(area.x - 2)
      expect(box!.x).toBeLessThanOrEqual(area.x + area.width + 2)
      expect(box!.y).toBeGreaterThanOrEqual(area.y - 2)
      expect(box!.y).toBeLessThanOrEqual(area.y + area.height + 2)
    }
  }
})

test('部位を開くと、その部位を中心に 3D のまま拡大する（起点の位置が変わらない）', async ({ page }) => {
  await openTechnique(page)
  test.skip((await page.locator('.body3d').count()) === 0, 'この端末では WebGL が使えず 2D で表示')
  const rel = async (id: string) => {
    const a = (await page.locator(`#${id} .anchor`).boundingBox())!
    const area = (await page.locator('.drawing').boundingBox())!
    return { x: a.x - area.x, y: a.y - area.y }
  }
  const kneeBefore = await rel('tori-knee-f')
  const eyeBefore = await rel('tori-eye')
  await page.locator('.bubble[data-part=knee]').click()
  await page.locator('#part-toggle .more').click()
  await page.waitForTimeout(700) // 拡大が終わるまで
  const kneeAfter = await rel('tori-knee-f')
  const eyeAfter = await rel('tori-eye')
  // 開いた部位の起点はアニメ領域の中で同じ位置に留まる（拡大の中心）
  expect(Math.abs(kneeAfter.x - kneeBefore.x)).toBeLessThan(3)
  expect(Math.abs(kneeAfter.y - kneeBefore.y)).toBeLessThan(3)
  // 他の部位は中心から離れる：深さ2で 1.4 倍
  const d0 = Math.hypot(eyeBefore.x - kneeBefore.x, eyeBefore.y - kneeBefore.y)
  const d1 = Math.hypot(eyeAfter.x - kneeAfter.x, eyeAfter.y - kneeAfter.y)
  expect(d1 / d0).toBeGreaterThan(1.35)
  expect(d1 / d0).toBeLessThan(1.45)
})

/** WebGL が使えない端末のふりをする */
async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}

test('WebGL が使えない端末では 2D の骨格で表示し、吹き出し・トグルはそのまま使える', async ({ page }) => {
  await withoutWebGL(page)
  await openTechnique(page)
  await expect(page.locator('svg.body')).toBeVisible()
  await expect(page.locator('.body3d')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'カメラの位置' })).toHaveCount(0)
  await page.locator('.bubble[data-part=hara]').click()
  await expect(page.locator('#part-toggle')).toBeVisible()
})

test('2D で表示するときも、記述からの推定の動きには注記が出て読み上げにも含まれる', async ({ page }) => {
  // 全ての技に 3D ができたので（D-48）、WebGL が使えない端末の 2D で確かめる
  await withoutWebGL(page)
  await openTechnique(page, 'suwariwaza-kokyuho')
  await expect(page.locator('.body3d')).toHaveCount(0)
  // decisions D-45：2D のポーズも source が estimate（または無し）なら注記を出す
  await expect(page.locator('.drawing > .note')).toHaveText('推定の動き：実際の動きと異なる所があります')
  await expect(page.locator('svg.body')).toHaveAttribute('aria-label', /推定の動き/)
})

for (const id of ['ikkyo-ura', 'iriminage', 'shihonage-omote', 'shihonage-ura', 'suwariwaza-kokyuho']) test(`${id} も 3D で描き、推定の注記が出る（D-48）`, async ({ page }) => {
  await openTechnique(page, id)
  const body = page.locator('.body3d')
  test.skip((await body.count()) === 0, 'この端末では WebGL が使えず 2D で表示')
  await expect(page.locator('.body3d.ready')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.body3d .note')).toContainText('推定の動き')
  await expect(page.locator('.bubble')).toHaveCount(6)
})
