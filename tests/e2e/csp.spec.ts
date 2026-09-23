// 本番ビルドの Content-Security-Policy（docs/decisions.md D-44）：主な画面を一通り開いても、CSP の違反が起きない
import { expect, test } from '@playwright/test'
import { openTechnique } from './helpers'

test.skip(process.env.E2E_TARGET === 'dev', 'CSP は本番ビルドだけに入れる')

test('CSP が入っていて、表紙・技詳細（3D）・単語集・用語で違反が起きない', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] }
    w.__csp = []
    document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  await page.goto('./')
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self' 'sha256-/)
  // インラインスクリプト（Service Worker の制御下なら最初から Web フォント）は、ハッシュで許されて動く
  await expect(page.locator('.emaki')).toBeVisible()

  await openTechnique(page)
  if ((await page.locator('.body3d').count()) > 0) await expect(page.locator('.body3d.ready')).toBeVisible({ timeout: 20_000 })
  await page.goto('./#/glossary')
  await expect(page.getByRole('searchbox')).toBeVisible()
  await page.goto('./#/glossary/aikido')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
  expect(violations).toEqual([])
})
