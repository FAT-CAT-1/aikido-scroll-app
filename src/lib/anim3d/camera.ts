// 3D のカメラ・投影・部位の起点（docs/animation-spec.md §13-4）
//
// three.js を読み込む前（技の説明文の表示・吹き出しの並び）にも位置が要るので、投影はここで計算する。
// three.js の PerspectiveCamera（lookAt ＋ setViewOffset）と同じ式にしてあり、単体テストで一致を確かめる。
import type { Figure3D, Part, Role, Vec3 } from '../content/types'
import type { Scene3D } from './pose3d'
import { add, cross, dot, lerp, normalize, scale, sub } from './vec'

export type CameraPreset = 'oblique' | 'side' | 'top'
export const CAMERA_PRESETS: readonly CameraPreset[] = ['oblique', 'side', 'top']
export const CAMERA_LABEL: Record<CameraPreset, string> = { oblique: '斜め', side: '横', top: '真上' }
/** 読み上げ用の説明 */
export const CAMERA_DESC: Record<CameraPreset, string> = { oblique: '斜め上から', side: '真横から', top: '真上から' }

/** アニメ領域の縦横比（2D と同じ 1000:600） */
export const ASPECT = 1000 / 600

export interface Cam {
  eye: Vec3
  target: Vec3
  up: Vec3
  /** 縦の画角（度） */
  fov: number
  aspect: number
}

/** 拡大：画面上の点 (cx, cy)（0〜1）を中心に s 倍（2D の Zoomable と同じ見え方） */
export interface Zoom {
  s: number
  cx: number
  cy: number
}
export const NO_ZOOM: Zoom = { s: 1, cx: 0.5, cy: 0.5 }

interface PresetDef {
  /** 注目点からカメラへの向き（取りの視点。受けの視点では y 軸まわりに 180° 回す） */
  dir: Vec3
  up: Vec3
  fov: number
}

const deg = Math.PI / 180
const PRESETS: Record<CameraPreset, PresetDef> = {
  // 取りの斜め後ろ・上から（取りが手前、受けの正面が見える）
  oblique: { dir: normalize([-Math.sin(38 * deg) * Math.cos(30 * deg), Math.sin(30 * deg), Math.cos(38 * deg) * Math.cos(30 * deg)]), up: [0, 1, 0], fov: 30 },
  // 真横（2D と同じ見え方。取りが左、受けが右）
  side: { dir: normalize([0, Math.sin(8 * deg), Math.cos(8 * deg)]), up: [0, 1, 0], fov: 28 },
  // 真上（足運びが分かる。取りが左、受けが右）
  top: { dir: [0, 1, 0], up: [0, 0, -1], fov: 24 },
}

const turn = (v: Vec3): Vec3 => [-v[0], v[1], -v[2]]

/** カメラの座標軸（three.js の Matrix4.lookAt と同じ）。同じカメラで何度も投影するので覚えておく */
const basisCache = new WeakMap<Cam, { x: Vec3; y: Vec3; z: Vec3; f: number }>()
function basis(cam: Cam) {
  let b = basisCache.get(cam)
  if (!b) {
    const z = normalize(sub(cam.eye, cam.target))
    const x = normalize(cross(cam.up, z), [1, 0, 0])
    const y = cross(z, x)
    b = { x, y, z, f: 1 / Math.tan((cam.fov * deg) / 2) }
    basisCache.set(cam, b)
  }
  return b
}

/** 世界座標 → 画面上の位置（0〜1、左上原点）と、カメラからの奥行き（m） */
export function project(cam: Cam, p: Vec3, zoom: Zoom = NO_ZOOM): { x: number; y: number; depth: number } {
  const { x, y, z, f } = basis(cam)
  const d = sub(p, cam.eye)
  const cx = dot(d, x)
  const cy = dot(d, y)
  const depth = -dot(d, z)
  const nx = ((f / cam.aspect) * cx) / depth
  const ny = (f * cy) / depth
  const sx = (nx + 1) / 2
  const sy = (1 - ny) / 2
  return { x: zoom.cx + (sx - zoom.cx) * zoom.s, y: zoom.cy + (sy - zoom.cy) * zoom.s, depth }
}

/**
 * 技全体（全 kf の関節 points）が入るようにカメラを置く。技の間はカメラを動かさない（揺れると動きが読めない）
 * 画面の内側（左右 5%・上下 7% の余白）に全点が入る最短の距離を探し、写った範囲が画面の中央に来るよう注視点をずらす
 */
export function frameCamera(points: readonly Vec3[], preset: CameraPreset, view: Role, aspect = ASPECT): Cam {
  const def = PRESETS[preset]
  const dir = view === 'uke' ? turn(def.dir) : def.dir
  const up = view === 'uke' && preset === 'top' ? turn(def.up) : def.up
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const p of points) for (let i = 0; i < 3; i++) (min[i] = Math.min(min[i]!, p[i]!)), (max[i] = Math.max(max[i]!, p[i]!))
  let target = lerp(min, max, 0.5)
  const at = (t: Vec3, d: number): Cam => ({ eye: add(t, scale(dir, d)), target: t, up, fov: def.fov, aspect })
  const fitDistance = (t: Vec3) => {
    let lo = 0.5
    let hi = 40
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2
      const cam = at(t, mid)
      const fits = points.every((c) => {
        const p = project(cam, c)
        return p.depth > 0.1 && p.x >= 0.05 && p.x <= 0.95 && p.y >= 0.07 && p.y <= 0.93
      })
      if (fits) hi = mid
      else lo = mid
    }
    return hi
  }
  let d = fitDistance(target)
  for (let pass = 0; pass < 2; pass++) {
    const cam = at(target, d)
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (const c of points) {
      const p = project(cam, c)
      x0 = Math.min(x0, p.x)
      x1 = Math.max(x1, p.x)
      y0 = Math.min(y0, p.y)
      y1 = Math.max(y1, p.y)
    }
    // 画面上のずれ（0〜1）→ 注視点の距離での世界の長さ
    const t = Math.tan((def.fov * deg) / 2)
    const { x, y } = basis(cam)
    const dx = ((x0 + x1) / 2 - 0.5) * 2 * d * t * aspect
    const dy = (0.5 - (y0 + y1) / 2) * 2 * d * t
    target = add(target, add(scale(x, dx), scale(y, dy)))
    d = fitDistance(target)
  }
  return at(target, d)
}

/** 部位の起点（世界座標）。左右のある部位は side の側 */
export function partPoint(fig: Figure3D, part: Part, side: 'l' | 'r'): Vec3 {
  const j = fig.joints
  switch (part) {
    case 'eye': {
      // 両目の間から視線の方向へ少し出た点（2D の「目」と同じく視線の上）
      const eyes = add(lerp(j.head, j.nose, 0.55), [0, 0.03, 0])
      return add(eyes, scale(fig.gaze, 0.16))
    }
    case 'face':
      return j.nose
    case 'shoulder':
      return add(j[`shoulder_${side}`], [0, 0.06, 0])
    case 'hara':
      return j.hara
    case 'knee':
      return j[`knee_${side}`]
    case 'foot':
      return lerp(j[`ankle_${side}`], j[`toe_${side}`], 0.5)
  }
}

const SIDED = new Set<Part>(['shoulder', 'knee', 'foot'])
const ALL: readonly Part[] = ['eye', 'face', 'shoulder', 'hara', 'knee', 'foot']

export interface Anchor3D {
  x: number
  y: number
  /** 左右のある部位で、カメラに近い側（手前＝f） */
  side: 'l' | 'r'
}

/** 1体の6部位の画面上の起点。左右のある部位はカメラに近い側を手前（f）にする */
export function partAnchors(fig: Figure3D, cam: Cam, zoom: Zoom = NO_ZOOM): Record<Part, Anchor3D> {
  const out = {} as Record<Part, Anchor3D>
  for (const part of ALL) {
    if (!SIDED.has(part)) {
      const p = project(cam, partPoint(fig, part, 'r'), zoom)
      out[part] = { x: p.x, y: p.y, side: 'r' }
      continue
    }
    const l = project(cam, partPoint(fig, part, 'l'), zoom)
    const r = project(cam, partPoint(fig, part, 'r'), zoom)
    out[part] = l.depth < r.depth ? { x: l.x, y: l.y, side: 'l' } : { x: r.x, y: r.y, side: 'r' }
  }
  return out
}

/** 部位要素の id に使う、奥側（b）の起点 */
export function farAnchor(fig: Figure3D, part: Part, near: 'l' | 'r', cam: Cam, zoom: Zoom = NO_ZOOM) {
  const p = project(cam, partPoint(fig, part, near === 'l' ? 'r' : 'l'), zoom)
  return { x: p.x, y: p.y }
}

export const isSided = (part: Part) => SIDED.has(part)

/** 画面の読み上げ用：場面の説明（誰がどちらにいるか） */
export function sceneLabel(name: string, view: Role, preset: CameraPreset) {
  return `${name}の動き（${view === 'tori' ? '取り' : '受け'}の視点・${CAMERA_DESC[preset]}）`
}

export type { Scene3D }
