import { expect, type Page } from '@playwright/test'

export const TECHNIQUE = 'ikkyo-omote'

/** 技詳細を開いて、一時停止（吹き出し表示）まで待つ */
export async function openTechnique(page: Page, id = TECHNIQUE) {
  await page.goto(`./#/techniques/${id}`)
  await expect(page.locator('.stage.paused')).toBeVisible()
  await expect(page.locator('.bubble')).toHaveCount(6)
}

/** トグルの深さ（閉じていれば 0） */
export async function toggleDepth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const t = document.querySelector('#part-toggle')
    if (!t || (t as HTMLElement).hidden) return 0
    return Number(t.className.match(/depth-(\d)/)?.[1] ?? 0)
  })
}

export async function expectDepth(page: Page, depth: number) {
  await expect.poll(() => toggleDepth(page)).toBe(depth)
}

/** 巻物ストリップを進捗 p までスクロールし、一時停止を待つ */
export async function scrubTo(page: Page, p: number) {
  await page.locator('.strip .scroller').evaluate((el, progress) => {
    el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) * progress)
  }, p)
  await expect(page.locator('.stage')).not.toHaveClass(/paused/)
  await expect(page.locator('.stage.paused')).toBeVisible()
}

/** アニメ領域で2指ピンチ（部位の起点を中心に）。Pointer Events を合成する */
export async function pinch(page: Page, direction: 'out' | 'in', part: string, role = 'tori') {
  await page.evaluate(
    async ({ direction, part, role }) => {
      const drawing = document.querySelector('.drawing') as HTMLElement
      const sided = ['shoulder', 'knee', 'foot'].includes(part)
      const anchor = document.querySelector(`#${role}-${part}${sided ? '-f' : ''} .anchor`)!.getBoundingClientRect()
      const cx = anchor.left + anchor.width / 2
      const cy = anchor.top + anchor.height / 2
      const [from, to] = direction === 'out' ? [20, 110] : [110, 20]
      const fire = (type: string, id: number, x: number) =>
        drawing.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: cy }))
      fire('pointerdown', 1, cx - from / 2)
      fire('pointerdown', 2, cx + from / 2)
      for (let s = 1; s <= 8; s++) {
        const d = from + ((to - from) * s) / 8
        fire('pointermove', 1, cx - d / 2)
        fire('pointermove', 2, cx + d / 2)
        await new Promise((r) => setTimeout(r, 10))
      }
      fire('pointerup', 1, cx - to / 2)
      fire('pointerup', 2, cx + to / 2)
      await new Promise((r) => setTimeout(r, 400)) // クールダウン分待つ
    },
    { direction, part, role },
  )
}
