// pose → GSAP Timeline（T13）と、実際の原稿が警告0でビルドできること（レビュー基準「build:content 警告0」）
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildContent } from '../../scripts/build-content.mjs'
import { createPoseTimeline } from '../../src/lib/anim/timeline'
import type { PoseData } from '../../src/lib/content/types'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const pose = JSON.parse(readFileSync(path.join(ROOT, 'content/poses/ikkyo-omote.pose.json'), 'utf8')) as PoseData

describe('createPoseTimeline', () => {
  it('kf の at では kf の座標そのもの。前後に飛ばしても同じ', () => {
    const tl = createPoseTimeline(pose)
    for (const order of [[0, 1, 2, 3, 4, 5], [5, 2, 4, 0, 3, 1]]) {
      for (const i of order) {
        const kf = pose.keyframes[i]!
        const s = tl.seek(kf.at)
        expect(s.tori.joints.knee_f[0]).toBeCloseTo(kf.tori.joints.knee_f[0], 5)
        expect(s.uke.joints.head[1]).toBeCloseTo(kf.uke.joints.head[1], 5)
        expect(s.tori.facing).toBe(kf.tori.facing)
      }
    }
    tl.destroy()
  })

  it('kf の間は両端の間の値に補間される', () => {
    const tl = createPoseTimeline(pose)
    const a = pose.keyframes[1]!
    const b = pose.keyframes[2]!
    const mid = tl.seek((a.at + b.at) / 2).tori.joints.hip[0]
    const lo = Math.min(a.tori.joints.hip[0], b.tori.joints.hip[0])
    const hi = Math.max(a.tori.joints.hip[0], b.tori.joints.hip[0])
    expect(mid).toBeGreaterThanOrEqual(lo)
    expect(mid).toBeLessThanOrEqual(hi)
    expect(tl.timeline.duration()).toBeCloseTo(1, 5)
    tl.destroy()
  })
})

describe('実際の原稿（content/）', () => {
  it('build:content がエラー0・警告0', async () => {
    const { diag, techniques } = await buildContent({ root: ROOT, quiet: true, log: () => {} })
    const problems = diag.items.filter((i) => i.level !== 'info').map((i) => `${i.level} ${i.loc} ${i.msg}`)
    expect(problems).toEqual([])
    expect(techniques.length).toBeGreaterThan(0)
  })
})
