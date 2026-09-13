// 骨格の幾何（animation-spec §1〜§2, §6）
import type { FigurePose, JointName, Part, Point } from '../content/types'

export const VIEW_W = 1000
export const VIEW_H = 600
export const HEAD_R = 20
export const FOOT_LEN = 24
export const HARA_LEN = 40

export const JOINTS: readonly JointName[] = [
  'head',
  'neck',
  'shoulder_f',
  'shoulder_b',
  'elbow_f',
  'elbow_b',
  'wrist_f',
  'wrist_b',
  'hip',
  'hipjoint_f',
  'hipjoint_b',
  'knee_f',
  'knee_b',
  'ankle_f',
  'ankle_b',
]

/** 向きパラメータ（0＝体の正面方向、正＝上）→ 単位ベクトル（SVG 座標、y 下向き） */
export function dirVec(facing: number, deg: number): Point {
  const r = (deg * Math.PI) / 180
  return [facing * Math.cos(r), -Math.sin(r)]
}

export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
export const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k]

/** 部位マーカーの起点（animation-spec §6）。side は左右のある部位の f/b */
export function partAnchor(fig: FigurePose, part: Part, side: 'f' | 'b' = 'f'): Point {
  const j = fig.joints
  switch (part) {
    case 'eye':
      return add(j.head, scale(dirVec(fig.facing, fig.gaze), 30))
    case 'face':
      return add(j.head, scale(dirVec(fig.facing, fig.head_dir), HEAD_R + 10))
    case 'shoulder':
      return add(j[`shoulder_${side}`], [0, -16])
    case 'hara':
      return add(j.hip, scale(dirVec(fig.facing, fig.hara_dir), HARA_LEN))
    case 'knee':
      return add(j[`knee_${side}`], [fig.facing * 16, 0])
    case 'foot':
      return add(j[`ankle_${side}`], [0, 16])
  }
}

const f = (n: number) => Math.round(n * 10) / 10
export const pt = (p: Point) => `${f(p[0])} ${f(p[1])}`
export const polyline = (...ps: Point[]) => `M${ps.map(pt).join('L')}`
