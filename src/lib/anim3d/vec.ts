// 3D の小さなベクトル計算（three.js に頼らない。表示前の計算や単体テストで使う）
import type { Vec3 } from '../content/types'

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const dist = (a: Vec3, b: Vec3) => length(sub(a, b))
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

export function normalize(a: Vec3, fallback: Vec3 = [0, 1, 0]): Vec3 {
  const l = length(a)
  return l > 1e-9 ? scale(a, 1 / l) : fallback
}

/** a に垂直な単位ベクトル（どれでもよいとき） */
export function anyPerpendicular(a: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  return normalize(cross(a, ref))
}

/** 単位ベクトルどうしの球面線形補間（向きを保ったまま回す。長さは 1） */
export function slerpDir(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.max(-1, Math.min(1, dot(a, b)))
  if (d > 0.9995) return normalize(lerp(a, b, t), a)
  const theta = Math.acos(d)
  if (d < -0.9995) {
    // 真逆：a に垂直な軸まわりに回す
    const axis = anyPerpendicular(a)
    return normalize(add(scale(a, Math.cos(Math.PI * t)), scale(axis, Math.sin(Math.PI * t))), a)
  }
  const s = Math.sin(theta)
  return add(scale(a, Math.sin((1 - t) * theta) / s), scale(b, Math.sin(t * theta) / s))
}

/** v のうち n（単位ベクトル）に垂直な成分 */
export const reject = (v: Vec3, n: Vec3): Vec3 => sub(v, scale(n, dot(v, n)))

/**
 * 2本の骨（長さ l1, l2）を root から target へ伸ばす（解析解）。曲がる向きは pole（単位ベクトル）の側
 * 届かないときはまっすぐ伸ばして target の方向へ。返り値は [中間の関節, 先端]
 * minY を渡すと、中間の関節（膝・肘）が床の高さ minY より下に行かないよう、骨の長さを保ったまま曲がる向きを回す
 */
export function twoBoneIK(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3, minY?: number): [Vec3, Vec3] {
  const toTarget = sub(target, root)
  const d0 = length(toTarget)
  const n = normalize(toTarget, [0, -1, 0])
  const d = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(l1 + l2 - 1e-4, d0))
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const bend = normalize(reject(pole, n), anyPerpendicular(n))
  const center = add(root, scale(n, a))
  let mid = add(center, scale(bend, h))
  if (minY !== undefined && mid[1] < minY && h > 1e-6) {
    // 中間の関節は center を中心とする半径 h の円の上を動ける。y ≥ minY になる、今の向きに最も近い角度へ回す
    const e2 = cross(n, bend)
    const A = h * bend[1]
    const B = h * e2[1]
    const R = Math.hypot(A, B)
    const k = minY - center[1]
    const phi = Math.atan2(B, A)
    let theta = phi
    if (k <= R) {
      const w = Math.acos(Math.max(-1, Math.min(1, k / R)))
      const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x))
      const c1 = wrap(phi - w)
      const c2 = wrap(phi + w)
      theta = Math.abs(c1) < Math.abs(c2) ? c1 : c2
    }
    mid = add(center, add(scale(bend, h * Math.cos(theta)), scale(e2, h * Math.sin(theta))))
  }
  return [mid, add(root, scale(n, d))]
}
