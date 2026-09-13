// ピンチ判定（SKILL §4 / backlog T20・T21）
// - Pointer Events で2ポインタの距離の変化を見る（MDN "Pinch zoom gestures" 方式）
// - 1回のピンチで1段だけ発火（指を離すまで再発火しない）＋ 連続発火防止のクールダウン
// - アニメ領域の要素にだけ付ける。touch-action: none はその要素の CSS で指定し、ページ全体の標準ズームは殺さない（CLAUDE.md 絶対ルール4）
// - デスクトップのトラックパッド: Chromium/Firefox は ctrl+wheel、Safari は GestureEvent

export type PinchDirection = 'out' | 'in'

export interface PinchEvent {
  direction: PinchDirection
  /** 要素の左上を原点とした2指の中点（px） */
  center: { x: number; y: number }
  ratio: number
}

export interface PinchOptions {
  /** 距離の変化率（開く: 以上 / 閉じる: 1/ratio 以下）。既定 1.25 */
  ratio?: number
  /** 距離の変化量の下限（px）。小さな指の揺れで発火しない。既定 30 */
  minDelta?: number
  /** 発火後、次の発火を受け付けない時間（ms）。既定 350 */
  cooldown?: number
}

const DEFAULTS: Required<PinchOptions> = { ratio: 1.25, minDelta: 30, cooldown: 350 }

interface Pt {
  x: number
  y: number
}

/** DOM に依存しない判定器（単体テスト用に分離） */
export class PinchRecognizer {
  private points = new Map<number, Pt>()
  private startDist = 0
  private fired = false
  private lastFire = -Infinity
  private readonly opts: Required<PinchOptions>

  constructor(
    private readonly emit: (e: PinchEvent) => void,
    options: PinchOptions = {},
    private readonly now: () => number = () => performance.now(),
  ) {
    this.opts = { ...DEFAULTS, ...options }
  }

  /** 2本以上の指が触れているか（ピンチ中） */
  get active(): boolean {
    return this.points.size >= 2
  }

  down(id: number, x: number, y: number): void {
    this.points.set(id, { x, y })
    if (this.points.size === 2) this.begin()
  }

  move(id: number, x: number, y: number): void {
    if (!this.points.has(id)) return
    this.points.set(id, { x, y })
    if (this.points.size < 2 || this.startDist <= 0 || this.fired) return
    const [a, b] = this.pair()
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    const ratio = d / this.startDist
    const delta = d - this.startDist
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (ratio >= this.opts.ratio && delta >= this.opts.minDelta) this.fire('out', center, ratio)
    else if (ratio <= 1 / this.opts.ratio && -delta >= this.opts.minDelta) this.fire('in', center, ratio)
  }

  up(id: number): void {
    this.points.delete(id)
    if (this.points.size < 2) {
      this.startDist = 0
      this.fired = false
    }
  }

  private pair(): [Pt, Pt] {
    const it = this.points.values()
    return [it.next().value as Pt, it.next().value as Pt]
  }

  private begin() {
    const [a, b] = this.pair()
    this.startDist = Math.hypot(a.x - b.x, a.y - b.y)
    this.fired = false
  }

  private fire(direction: PinchDirection, center: Pt, ratio: number) {
    const t = this.now()
    if (t - this.lastFire < this.opts.cooldown) return
    this.fired = true
    this.lastFire = t
    this.emit({ direction, center, ratio })
  }
}

/** 要素にピンチ判定を付ける。戻り値で解除 */
export function attachPinch(el: HTMLElement, onPinch: (e: PinchEvent) => void, options: PinchOptions = {}): () => void {
  const local = (clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }
  const recognizer = new PinchRecognizer(onPinch, options)
  const opts = { ...DEFAULTS, ...options }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const p = local(e.clientX, e.clientY)
    recognizer.down(e.pointerId, p.x, p.y)
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    const p = local(e.clientX, e.clientY)
    recognizer.move(e.pointerId, p.x, p.y)
  }
  const onUp = (e: PointerEvent) => recognizer.up(e.pointerId)

  // トラックパッドのピンチ（Chromium / Firefox）: ctrlKey 付きの wheel。アニメ領域の上だけで扱う
  let wheelSum = 0
  let wheelTimer: ReturnType<typeof setTimeout> | undefined
  let wheelLast = -Infinity
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    wheelSum += e.deltaY
    clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => (wheelSum = 0), 250)
    const now = performance.now()
    if (Math.abs(wheelSum) < 40 || now - wheelLast < opts.cooldown * 2) return
    wheelLast = now
    const direction: PinchDirection = wheelSum < 0 ? 'out' : 'in'
    wheelSum = 0
    onPinch({ direction, center: local(e.clientX, e.clientY), ratio: direction === 'out' ? opts.ratio : 1 / opts.ratio })
  }

  // Safari（macOS トラックパッド・iOS）: GestureEvent。ページのズームにせず、1ジェスチャー1回だけ発火
  type GestureLike = Event & { scale: number; clientX: number; clientY: number }
  let gestureFired = false
  const onGestureStart = (e: Event) => {
    e.preventDefault()
    gestureFired = false
  }
  const onGestureChange = (e: Event) => {
    e.preventDefault()
    const g = e as GestureLike
    if (gestureFired || recognizer.active) return
    if (g.scale >= opts.ratio || g.scale <= 1 / opts.ratio) {
      gestureFired = true
      onPinch({ direction: g.scale > 1 ? 'out' : 'in', center: local(g.clientX, g.clientY), ratio: g.scale })
    }
  }

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(t, onUp)
  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('gesturestart', onGestureStart as EventListener)
  el.addEventListener('gesturechange', onGestureChange as EventListener)

  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.removeEventListener(t, onUp)
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('gesturestart', onGestureStart as EventListener)
    el.removeEventListener('gesturechange', onGestureChange as EventListener)
    clearTimeout(wheelTimer)
  }
}

/** Svelte アクション: <div use:pinch={{ onpinch }}> */
export function pinch(node: HTMLElement, params: { onpinch: (e: PinchEvent) => void; options?: PinchOptions }) {
  let current = params
  const detach = attachPinch(node, (e) => current.onpinch(e), params.options)
  return {
    update(next: typeof params) {
      current = next
    },
    destroy() {
      detach()
    },
  }
}
