// pose.json → GSAP Timeline（animation-spec §5-1 / backlog T13）
//
// - 全体の長さを 1 にし、kf の at をそのまま時刻にする（content-spec §9「seek(at) に直結」）
// - kf 間は全関節・向き角度を同じ ease（既定 power2.inOut）で補間。関節別イージングは不採用
// - facing は補間せず、直近の kf の値に瞬時に切り替える
// - 任意の位置へ飛んでも正しく描けるよう、各区間は fromTo（immediateRender: false）で開始値を固定する

import { gsap } from 'gsap'
import type { FigurePose, JointName, PoseData, PoseKeyframe, Point, Role } from '../content/types'
import { JOINTS } from './geometry'

export interface ScenePose {
  tori: FigurePose
  uke: FigurePose
}

const ROLES: readonly Role[] = ['tori', 'uke']
const ANGLES = ['head_dir', 'gaze', 'hara_dir'] as const
export const DEFAULT_EASE = 'power2.inOut'

function flatten(kf: PoseKeyframe): Record<string, number> {
  const o: Record<string, number> = {}
  for (const r of ROLES) {
    const fig = kf[r]
    for (const j of JOINTS) {
      o[`${r}_${j}_x`] = fig.joints[j][0]
      o[`${r}_${j}_y`] = fig.joints[j][1]
    }
    for (const a of ANGLES) o[`${r}_${a}`] = fig[a]
  }
  return o
}

export interface PoseTimeline {
  readonly timeline: gsap.core.Timeline
  readonly keyframes: readonly PoseKeyframe[]
  /** 進捗 0〜1 の姿勢を計算して返す（タイムラインもその位置へ移動する） */
  seek(progress: number): ScenePose
  destroy(): void
}

export function createPoseTimeline(data: PoseData): PoseTimeline {
  const kfs = [...data.keyframes].sort((a, b) => a.at - b.at)
  if (!kfs.length) throw new Error(`pose ${data.id}: keyframes がありません`)
  const first = kfs[0]!
  const proxy = flatten(first)
  const tl = gsap.timeline({ paused: true })
  tl.set(proxy, flatten(first), 0)
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]!
    const b = kfs[i + 1]!
    tl.fromTo(proxy, flatten(a), { ...flatten(b), duration: b.at - a.at, ease: a.ease ?? DEFAULT_EASE, immediateRender: false }, a.at)
  }
  // 最後の kf が 1 より前でも、全体の長さを 1 に揃える
  if (tl.duration() < 1) tl.set({}, {}, 1)

  const read = (time: number): ScenePose => {
    let idx = 0
    for (let i = 0; i < kfs.length; i++) if (kfs[i]!.at <= time + 1e-9) idx = i
    const build = (r: Role): FigurePose => ({
      facing: kfs[idx]![r].facing,
      head_dir: proxy[`${r}_head_dir`]!,
      gaze: proxy[`${r}_gaze`]!,
      hara_dir: proxy[`${r}_hara_dir`]!,
      joints: Object.fromEntries(JOINTS.map((j) => [j, [proxy[`${r}_${j}_x`]!, proxy[`${r}_${j}_y`]!] as Point])) as Record<JointName, Point>,
    })
    return { tori: build('tori'), uke: build('uke') }
  }

  return {
    timeline: tl,
    keyframes: kfs,
    seek(progress: number) {
      const t = Math.min(1, Math.max(0, progress))
      tl.time(t)
      return read(t)
    },
    destroy() {
      tl.kill()
    },
  }
}
