// 現在のキーフレームと、その解説（攻撃法の差分を反映）を決める（animation-spec §5-3 / content-spec §5）
import type { Keyframe, Technique } from './types'

/** 進捗に最も近い kf の番号（|progress − at| 最小。同距離なら前の kf） */
export function nearestIndex(keyframes: readonly { at: number }[], progress: number): number {
  let best = 0
  let bestD = Infinity
  keyframes.forEach((k, i) => {
    const d = Math.abs(progress - k.at)
    if (d < bestD - 1e-9) {
      best = i
      bestD = d
    }
  })
  return best
}

/**
 * 攻撃法を選んだときの kf。attack_overrides[attack].keyframes に同じ id があれば丸ごと置き換える（マージしない）
 */
export function keyframeFor(technique: Technique, attack: string | null, index: number): Keyframe | null {
  const base = technique.keyframes[index]
  if (!base) return null
  if (!attack || attack === technique.default_attack) return base
  return technique.attack_overrides[attack]?.keyframes[base.id] ?? base
}

/** 攻撃法の表示名（差分節の日本語名。基本攻撃法は単語集の名前が無ければ slug） */
export function attackLabel(technique: Technique, attack: string, glossaryName?: (slug: string) => string | undefined): string {
  return technique.attack_overrides[attack]?.label ?? glossaryName?.(attack) ?? attack
}
