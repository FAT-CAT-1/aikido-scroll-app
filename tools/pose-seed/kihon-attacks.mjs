#!/usr/bin/env node
// 攻撃法（基礎動作）：正面打ち・横面打ち・突き の pose.json 初版（推定）。WebGL が使えない端末で使う 2D
//   node tools/pose-seed/kihon-attacks.mjs [--force]  … shomen-uchi / yokomen-uchi / tsuki の3ファイル
//
// 2D 真横・取り右向き（facing +1）。相半身の構え（取りは手前(f)、受けは奥(b)の足が前）から、受けは後ろ足を踏み込んで
// 打つ・突く（踏み込んだ後は受けの手前(f)の足が前）。横面打ちの横からの弧と、突きを外す取りの体の開きは奥行きなので 3D が正
import { figure, writePose } from './lib.mjs'

const G = 512 // 立ち姿勢の足首の高さ

/** 手首を肩からの向きで置く（rel = { f: [前へ, 下へ], b: [...] }、長さは腕が届く 110 までに縮める） */
function withHands(spec, label, rel) {
  const base = figure({ ...spec, wrists: undefined, elbows: undefined, arms: { f: [20, 60], b: [16, 60] } }, label)
  const wrists = {}
  for (const k of ['f', 'b']) {
    const sh = base.joints[`shoulder_${k}`]
    let [dx, dy] = rel[k]
    const len = Math.hypot(dx, dy)
    if (len > 110) {
      dx *= 110 / len
      dy *= 110 / len
    }
    wrists[k] = [sh[0] + spec.facing * dx, sh[1] + dy]
  }
  return figure({ ...spec, wrists, elbows: spec.elbows }, label)
}

// 相半身の構え（一教（表）の構えと同じ）
const kamae = {
  id: 'kamae',
  at: 0.0,
  ease: 'power1.inOut',
  tori: figure({ facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [469, 250], b: [413, 286] } }, 'kamae 取り'),
  uke: figure({ facing: -1, hip: [620, 300], torso: 2, lead: 'b', gaze: -4, ankles: { b: [553, G], f: [687, G] }, wrists: { b: [531, 250], f: [587, 286] } }, 'kamae 受け'),
}

/** 受け：後ろ足（手前 f）を踏み込んだ姿勢 */
const ukeStepped = (label, rel, { hip = 590, torso = 8, elbows } = {}) =>
  withHands({ facing: -1, hip: [hip, 302], torso, lead: 'f', gaze: -6, ankles: { f: [hip - 55, G], b: [hip + 68, G] }, elbows }, label, rel)
/** 取り：前足を半歩送った右半身 */
const toriStep = (label, rel, { hip = 405, torso = 4, elbows } = {}) =>
  withHands({ facing: 1, hip: [hip, 300], torso, lead: 'f', gaze: -6, ankles: { f: [hip + 67, G], b: [hip - 67, G] }, elbows }, label, rel)

// ---- 正面打ち：振りかぶり → 前の手（奥 b）の手刀を額へ振り下ろす。取りは前の手（手前 f）の手刀で合わせる ----
{
  const furikaburi = withHands(
    { facing: -1, hip: [618, 300], torso: 2, lead: 'b', gaze: -6, ankles: { b: [553, G], f: [687, G] }, elbows: { b: 'up', f: 'down' } },
    'furikaburi 受け',
    { b: [10, -108], f: [28, 100] },
  )
  const uke = ukeStepped('uchi 受け', { b: [104, -14], f: [30, 100] }, { elbows: { b: 'up', f: 'down' } })
  const tori = toriStep('uchi 取り', { f: [64, -8], b: [22, 104] }, { elbows: { f: 'down', b: 'down' } })
  await writePose('shomen-uchi', [kamae, { id: 'furikaburi', at: 0.4, ease: 'power2.in', tori: kamae.tori, uke: furikaburi }, { id: 'uchi', at: 1.0, tori, uke }])
}

// ---- 横面打ち：振りかぶり（頭の斜め上へ）→ 斜め上から側頭部へ。取りは打たれる側の手（奥 b）の手刀で合わせる ----
{
  const furikaburi = withHands(
    { facing: -1, hip: [618, 300], torso: -2, lead: 'b', gaze: -6, ankles: { b: [553, G], f: [687, G] }, elbows: { b: 'up', f: 'down' } },
    'furikaburi 受け',
    { b: [-30, -104], f: [28, 100] },
  )
  const uke = ukeStepped('uchi 受け', { b: [100, 4], f: [30, 100] }, { torso: 10, elbows: { b: 'up', f: 'down' } })
  const tori = toriStep('uchi 取り', { b: [60, -16], f: [44, 70] }, { elbows: { f: 'down', b: 'down' } })
  await writePose('yokomen-uchi', [kamae, { id: 'furikaburi', at: 0.4, ease: 'power2.in', tori: kamae.tori, uke: furikaburi }, { id: 'uchi', at: 1.0, tori, uke }])
}

// ---- 突き：後ろの手（手前 f）の拳を腰へ引きつけ → 後ろ足を踏み込んで中段を突く。取りは体を開き、前の手を突き手の外側へ ----
{
  const fumikomi = withHands(
    { facing: -1, hip: [608, 302], torso: 6, lead: 'b', gaze: -6, ankles: { b: [553, G], f: [650, 500] }, knees: { f: 'forward' } },
    'fumikomi 受け',
    { b: [70, 70], f: [-14, 104] },
  )
  const uke = ukeStepped('tsuki 受け', { f: [108, 18], b: [-20, 100] }, { hip: 575, torso: 10 })
  const tori = toriStep('tsuki 取り', { f: [74, 40], b: [30, 100] }, { hip: 418, torso: 6 })
  await writePose('tsuki', [kamae, { id: 'fumikomi', at: 0.4, ease: 'power2.in', tori: kamae.tori, uke: fumikomi }, { id: 'tsuki', at: 1.0, tori, uke }])
}
