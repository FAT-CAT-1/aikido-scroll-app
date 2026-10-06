// 基礎動作（#/kihon）：一覧に並び、開くと技と同じ画面（3D・吹き出し・推定の注記）で見られる（docs/decisions.md D-51）
import { expect, test } from '@playwright/test'
import { openTechnique } from './helpers'

const KIHON = [
  { id: 'hanmi', name: '半身' },
  { id: 'tenkan', name: '転換' },
  { id: 'irimi-tenkan', name: '入身転換' },
  { id: 'shikko', name: '膝行' },
  { id: 'ukemi-ushiro', name: '後ろ受身' },
  { id: 'ukemi-mae', name: '前受身' },
  { id: 'shomen-uchi', name: '正面打ち' },
  { id: 'yokomen-uchi', name: '横面打ち' },
  { id: 'tsuki', name: '突き' },
  { id: 'katate-dori', name: '片手取り' },
  { id: 'ryote-dori', name: '両手取り' },
  { id: 'kata-dori', name: '肩取り' },
]

test('基礎動作の一覧に項目が並び、選ぶとその基礎動作のページが開く', async ({ page }) => {
  await page.goto('./#/kihon')
  const cards = page.locator('a.card')
  await expect(cards).toHaveCount(KIHON.length)
  for (const k of KIHON) await expect(cards.locator('.name').getByText(k.name, { exact: true })).toBeVisible()
  await cards.filter({ hasText: '入身転換' }).click()
  await expect(page).toHaveURL(/#\/kihon\/irimi-tenkan$/)
  await expect(page.locator('.stage.paused')).toBeVisible()
  await expect(page.locator('.bubble')).toHaveCount(6)
})

for (const k of KIHON) {
  test(`${k.name}（${k.id}）も 3D で描き、推定の注記が出る`, async ({ page }) => {
    await openTechnique(page, k.id, 'kihon')
    const body = page.locator('.body3d')
    test.skip((await body.count()) === 0, 'この端末では WebGL が使えず 2D で表示')
    await expect(page.locator('.body3d.ready')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.body3d .note')).toContainText('推定の動き')
  })
}

test('技のページの攻撃法から攻撃法のページへ移り、戻るで技のページへ戻る（backlog K-5）', async ({ page }) => {
  await openTechnique(page, 'ikkyo-omote')
  await page.getByRole('link', { name: /攻撃法\s*正面打ち/ }).click()
  await expect(page).toHaveURL(/#\/kihon\/shomen-uchi$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('正面打ち')
  await page.goBack()
  await expect(page).toHaveURL(/#\/techniques\/ikkyo-omote$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('一教（表）')
})
