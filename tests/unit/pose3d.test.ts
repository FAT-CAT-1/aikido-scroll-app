// 3D ポーズの補間・カメラの投影（docs/animation-spec.md §13）
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { BONES3D as BONES_MJS, JOINTS3D as JOINTS_MJS } from '../../scripts/content/pose3d.mjs'
import { buildContent } from '../../scripts/build-content.mjs'
import { frameCamera, partAnchors, project, type Zoom } from '../../src/lib/anim3d/camera'
import { BONES3D, createPose3DTimeline, evalScene, JOINTS3D, posePoints } from '../../src/lib/anim3d/pose3d'
import { dist } from '../../src/lib/anim3d/vec'
import type { Pose3DData, Vec3 } from '../../src/lib/content/types'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

async function ikkyo(): Promise<Pose3DData> {
  const { poses3d } = await buildContent({ root: ROOT, quiet: true, log: () => {} })
  const p = poses3d.find((x: Pose3DData) => x.id === 'ikkyo-omote')
  if (!p) throw new Error('ikkyo-omote の pose3d がありません')
  return p
}

describe('骨格の定義', () => {
  it('ビルド側（mjs）と表示側（ts）の関節・骨が一致する', () => {
    expect([...JOINTS3D]).toEqual([...JOINTS_MJS])
    expect(BONES3D.map((b) => b.join('/'))).toEqual(BONES_MJS.map((b: readonly string[]) => b.join('/')))
  })

  it('標準体型のファイルに全ての骨の長さがある', () => {
    const body = JSON.parse(readFileSync(path.join(ROOT, 'content/poses3d/_body3d.json'), 'utf8'))
    for (const [, , key] of BONES3D) expect(body.bones[key], key).toBeGreaterThan(0)
  })
})

describe('3D の補間', () => {
  it('kf の間でも骨の長さが変わらない（伸び縮みしない）', async () => {
    const data = await ikkyo()
    const tl = createPose3DTimeline(data)
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const s = tl.seek(p)
      for (const role of ['tori', 'uke'] as const) {
        for (const [a, b, key] of BONES3D) {
          expect(Math.abs(dist(s[role].joints[a], s[role].joints[b]) - data.body.bones[key]!), `p=${p.toFixed(2)} ${role} ${a}-${b}`).toBeLessThan(0.002)
        }
      }
    }
  })

  it('kf の時刻ではその kf の姿勢になる', async () => {
    const data = await ikkyo()
    const tl = createPose3DTimeline(data)
    for (const kf of data.keyframes) {
      const s = tl.seek(kf.at)
      for (const role of ['tori', 'uke'] as const) {
        for (const j of JOINTS3D) expect(dist(s[role].joints[j], kf[role].joints[j]), `${kf.id} ${role}.${j}`).toBeLessThan(0.005)
      }
    }
  })

  it('両方の kf で同じ場所にある足首は、途中でも動かない（足が滑らない）', async () => {
    const data = await ikkyo()
    const kfs = data.keyframes
    let checked = 0
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i]!
      const b = kfs[i + 1]!
      for (const role of ['tori', 'uke'] as const) {
        for (const ankle of ['ankle_l', 'ankle_r'] as const) {
          if (dist(a[role].joints[ankle], b[role].joints[ankle]) > 1e-6) continue
          for (const u of [0.25, 0.5, 0.75]) {
            const s = evalScene(a, b, u, data.body)
            expect(dist(s[role].joints[ankle], a[role].joints[ankle]), `${a.id}→${b.id} ${role}.${ankle} u=${u}`).toBeLessThan(0.003)
            checked++
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('つかんだ手は区間の途中でも相手の部位から離れない', async () => {
    const data = await ikkyo()
    const kfs = data.keyframes
    let checked = 0
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i]!
      const b = kfs[i + 1]!
      const inB = new Set((b.contacts ?? []).map((c) => JSON.stringify(c)))
      for (const c of a.contacts ?? []) {
        if (!inB.has(JSON.stringify(c)) || typeof c.on !== 'string') continue
        const [hRole, hJoint] = c.hand.split('.') as ['tori' | 'uke', 'hand_l' | 'hand_r']
        const [tRole, tJoint] = c.on.split('.') as ['tori' | 'uke', 'wrist_r']
        const offA = dist(a[hRole].joints[hJoint], a[tRole].joints[tJoint])
        const offB = dist(b[hRole].joints[hJoint], b[tRole].joints[tJoint])
        const s = evalScene(a, b, 0.5, data.body)
        const mid = dist(s[hRole].joints[hJoint], s[tRole].joints[tJoint])
        expect(mid, `${a.id}→${b.id} ${c.hand}`).toBeLessThan(Math.max(offA, offB) + 0.01)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('関節が床より下に行かない（全区間）', async () => {
    const data = await ikkyo()
    const tl = createPose3DTimeline(data)
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const s = tl.seek(p)
      for (const role of ['tori', 'uke'] as const) {
        for (const j of JOINTS3D) expect(s[role].joints[j][1], `p=${p.toFixed(2)} ${role}.${j}`).toBeGreaterThan(-0.03)
      }
    }
  })
})

describe('3D のカメラ', () => {
  it('投影が three.js の PerspectiveCamera（lookAt・setViewOffset）と一致する', async () => {
    const data = await ikkyo()
    const points = posePoints(data)
    for (const preset of ['oblique', 'side', 'top'] as const) {
      for (const view of ['tori', 'uke'] as const) {
        const cam = frameCamera(points, preset, view)
        const zoom: Zoom = { s: 1.6, cx: 0.37, cy: 0.58 }
        const three = new PerspectiveCamera(cam.fov, cam.aspect, 0.05, 80)
        three.position.set(...cam.eye)
        three.up.set(...cam.up)
        three.lookAt(...cam.target)
        const W = 1000
        const H = 600
        three.setViewOffset(W, H, zoom.cx * W * (1 - 1 / zoom.s), zoom.cy * H * (1 - 1 / zoom.s), W / zoom.s, H / zoom.s)
        three.updateProjectionMatrix()
        three.updateMatrixWorld()
        for (const p of [data.keyframes[0]!.tori.joints.head, data.keyframes[3]!.uke.joints.knee_r, [0.3, 0, -0.2] as Vec3]) {
          const ours = project(cam, p, zoom)
          const v = new Vector3(...p).project(three)
          expect(ours.x, `${preset}/${view} x`).toBeCloseTo((v.x + 1) / 2, 5)
          expect(ours.y, `${preset}/${view} y`).toBeCloseTo((1 - v.y) / 2, 5)
        }
      }
    }
  })

  it('技の全 kf が画面に入り、取りの視点では取りが画面の左側にいる', async () => {
    const data = await ikkyo()
    const points = posePoints(data)
    for (const preset of ['oblique', 'side', 'top'] as const) {
      const cam = frameCamera(points, preset, 'tori')
      for (const p of points) {
        const q = project(cam, p)
        expect(q.x).toBeGreaterThanOrEqual(0.04)
        expect(q.x).toBeLessThanOrEqual(0.96)
        expect(q.y).toBeGreaterThanOrEqual(0.06)
        expect(q.y).toBeLessThanOrEqual(0.94)
      }
      const kamae = data.keyframes[0]!
      expect(project(cam, kamae.tori.joints.hip).x).toBeLessThan(project(cam, kamae.uke.joints.hip).x)
      const uke = frameCamera(points, preset, 'uke')
      expect(project(uke, kamae.uke.joints.hip).x).toBeLessThan(project(uke, kamae.tori.joints.hip).x)
    }
  })

  it('左右のある部位は、カメラに近い側を手前（f）にする', async () => {
    const data = await ikkyo()
    const cam = frameCamera(posePoints(data), 'side', 'tori')
    const fig = data.keyframes[0]!.tori
    // 横からのカメラは +z 側にある。構えの取りは右（+z）が手前
    expect(partAnchors(fig, cam).knee.side).toBe(fig.joints.knee_r[2] > fig.joints.knee_l[2] ? 'r' : 'l')
  })
})
