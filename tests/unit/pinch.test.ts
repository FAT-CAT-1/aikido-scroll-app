// ピンチ判定（SKILL §4 / backlog T20・T21）
import { describe, expect, it } from 'vitest'
import { PinchRecognizer, type PinchEvent } from '../../src/lib/gesture/pinch'

function setup(now = { t: 0 }) {
  const events: PinchEvent[] = []
  const r = new PinchRecognizer((e) => events.push(e), {}, () => now.t)
  /** 中心 (cx, cy) で2指の間隔を from → to に変える1回のピンチ */
  const gesture = (from: number, to: number, cx = 100, cy = 100, steps = 8) => {
    r.down(1, cx - from / 2, cy)
    r.down(2, cx + from / 2, cy)
    for (let s = 1; s <= steps; s++) {
      const d = from + ((to - from) * s) / steps
      r.move(1, cx - d / 2, cy)
      r.move(2, cx + d / 2, cy)
    }
    r.up(1)
    r.up(2)
  }
  return { r, events, gesture, now }
}

describe('PinchRecognizer', () => {
  it('指を開くと out、閉じると in を1回だけ出す', () => {
    const { events, gesture, now } = setup()
    gesture(60, 200)
    now.t += 1000
    gesture(200, 60)
    expect(events.map((e) => e.direction)).toEqual(['out', 'in'])
    expect(events[0]!.center).toEqual({ x: 100, y: 100 })
  })

  it('1回のピンチの途中で何度しきい値を越えても1段だけ', () => {
    const { r, events } = setup()
    r.down(1, 0, 0)
    r.down(2, 50, 0)
    for (const x of [100, 150, 250, 400]) r.move(2, x, 0)
    r.up(1)
    r.up(2)
    expect(events).toHaveLength(1)
  })

  it('変化が小さい（30px 未満）なら出さない', () => {
    const { events, gesture } = setup()
    gesture(40, 60) // ×1.5 だが +20px
    expect(events).toHaveLength(0)
  })

  it('クールダウン中（350ms）の次のピンチは無視する', () => {
    const { events, gesture, now } = setup()
    gesture(60, 200)
    now.t += 200
    gesture(60, 200)
    now.t += 400
    gesture(60, 200)
    expect(events).toHaveLength(2)
  })

  it('指1本では出さない。3本目の指は無視する', () => {
    const { r, events } = setup()
    r.down(1, 0, 0)
    r.move(1, 300, 0)
    r.up(1)
    expect(events).toHaveLength(0)
    r.down(1, 0, 0)
    r.down(2, 60, 0)
    r.down(3, 500, 500)
    r.move(3, 900, 900)
    expect(events).toHaveLength(0)
    r.move(2, 200, 0)
    expect(events.map((e) => e.direction)).toEqual(['out'])
  })
})
