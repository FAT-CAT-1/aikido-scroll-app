// 一時停止時の6部位マーカー（animation-spec §6 / backlog T16）
// SVG 内の各部位の起点（.anchor）を getBoundingClientRect で読み、HTML レイヤーの吹き出しと引き出し線の座標にする。
// SVG が左右反転・拡大されていても、画面上の実座標が得られる。
import type { Part, Role } from '../content/types'

/** 吹き出しの段（上段＝上半身、下段＝下半身）。段内の並びは起点の x 順 */
export const TOP_PARTS: readonly Part[] = ['eye', 'face', 'shoulder']
export const BOTTOM_PARTS: readonly Part[] = ['hara', 'knee', 'foot']
export const ALL_PARTS: readonly Part[] = [...TOP_PARTS, ...BOTTOM_PARTS]

const SIDED = new Set<Part>(['shoulder', 'knee', 'foot'])

/** 部位要素の id（#{role}-{part}[-{f|b}]）。マーカーは注目側の手前（f） */
export function partElementId(role: Role, part: Part, side: 'f' | 'b' = 'f'): string {
  return SIDED.has(part) ? `${role}-${part}-${side}` : `${role}-${part}`
}

export interface XY {
  x: number
  y: number
}
export type Anchors = Partial<Record<Part, XY>>

/** container 左上を原点とした各部位の起点座標（px） */
export function readAnchors(container: HTMLElement, role: Role): Anchors {
  const base = container.getBoundingClientRect()
  const out: Anchors = {}
  for (const part of ALL_PARTS) {
    const anchor = container.querySelector(`#${partElementId(role, part)} .anchor`)
    if (!anchor) continue
    const r = anchor.getBoundingClientRect()
    out[part] = { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top }
  }
  return out
}

/** 段内の並び（起点の x 昇順）→ 引き出し線が交差しにくい */
export function orderByX(parts: readonly Part[], anchors: Anchors): Part[] {
  return [...parts].sort((a, b) => (anchors[a]?.x ?? 0) - (anchors[b]?.x ?? 0))
}

export interface Leader {
  part: Part
  from: XY
  to: XY
}

/** 吹き出し（上段は下辺中央、下段は上辺中央）から起点までの線 */
export function leaderLines(container: HTMLElement, bubbles: Map<Part, HTMLElement>, anchors: Anchors): Leader[] {
  const base = container.getBoundingClientRect()
  const lines: Leader[] = []
  for (const [part, el] of bubbles) {
    const to = anchors[part]
    if (!to || !el.isConnected) continue
    const r = el.getBoundingClientRect()
    const top = TOP_PARTS.includes(part)
    lines.push({
      part,
      from: { x: r.left + r.width / 2 - base.left, y: (top ? r.bottom : r.top) - base.top },
      to,
    })
  }
  return lines
}

/** 点に最も近い部位（ピンチの中心 → 対象部位） */
export function nearestPart(anchors: Anchors, point: XY): Part | null {
  let best: Part | null = null
  let bestD = Infinity
  for (const part of ALL_PARTS) {
    const a = anchors[part]
    if (!a) continue
    const d = Math.hypot(a.x - point.x, a.y - point.y)
    if (d < bestD) {
      best = part
      bestD = d
    }
  }
  return best
}

/** 筆線風の引き出し線（わずかに弧を描く2次ベジェ） */
export function leaderPath(l: Leader): string {
  const mx = (l.from.x + l.to.x) / 2
  const my = (l.from.y + l.to.y) / 2
  const bend = Math.max(-18, Math.min(18, (l.to.x - l.from.x) * 0.15))
  return `M${l.from.x.toFixed(1)} ${l.from.y.toFixed(1)}Q${(mx - bend).toFixed(1)} ${my.toFixed(1)} ${l.to.x.toFixed(1)} ${l.to.y.toFixed(1)}`
}
