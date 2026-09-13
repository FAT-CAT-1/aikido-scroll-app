#!/usr/bin/env node
// 片手取り四方投げ（表・裏）の pose.json 初版（推定）
//   node tools/pose-seed/shihonage.mjs [--force]  … shihonage-omote / shihonage-ura の2ファイル
// 逆半身：取り・受けとも手前(f)の足が前（画面上で互いに違う側の足が前）。受けは手前の手で取りの手前の手首を掴む。
import { figure, jointOf, supine, writePose } from './lib.mjs'

const G = 512

function common() {
  const kfs = []
  // 構え（逆半身）
  kfs.push({
    id: 'kamae',
    at: 0.0,
    ease: 'power1.inOut',
    tori: figure({ facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [469, 250], b: [413, 286] } }, 'kamae 取り'),
    uke: figure({ facing: -1, hip: [620, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [553, G], b: [687, G] }, wrists: { f: [531, 250], b: [587, 286] } }, 'kamae 受け'),
  })
  // 接触（片手取り）: 受けの手前の手が取りの手前の手首を掴む
  {
    const grip = [500, 282]
    const tori = figure({ facing: 1, hip: [395, 302], torso: 4, lead: 'f', gaze: -6, ankles: { f: [455, G], b: [330, G] }, wrists: { f: grip, b: [420, 300] } }, 'contact 取り')
    const uke = figure({ facing: -1, hip: [598, 302], torso: 6, lead: 'f', gaze: -6, ankles: { f: [540, G], b: [665, G] }, wrists: { f: [grip[0] + 8, grip[1] - 4], b: [615, 305] } }, 'contact 受け')
    kfs.push({ id: 'contact', at: 0.15, ease: 'power2.inOut', tori, uke })
  }
  // 崩し: 掴まれた手を手刀で前上へ導いて受けを伸ばし、奥の手でも受けの手首を取る
  {
    const hand = [515, 222]
    const uke = figure({ facing: -1, hip: [612, 314], torso: 24, neck: 4, lead: 'f', gaze: -12, head_dir: -8, hara_dir: -15, ankles: { f: [555, G], b: [675, G] }, wrists: { f: hand, b: [630, 330] }, elbows: { f: 'up', b: 'down' } }, 'kuzushi 受け')
    const tori = figure({ facing: 1, hip: [420, 308], torso: 10, lead: 'f', gaze: -15, head_dir: -6, hara_dir: -6, ankles: { f: [488, G], b: [350, G] }, wrists: { f: [hand[0] - 8, hand[1] + 4], b: [hand[0] - 16, hand[1] + 10] } }, 'kuzushi 取り')
    kfs.push({ id: 'kuzushi', at: 0.3, ease: 'power2.inOut', tori, uke })
  }
  return kfs
}

// 投げ・残心（表裏共通の形）：取りは向きを変えて受けの手を肩口から斬り下ろし、受けは後ろへ崩れて後ろ受身
function finish() {
  const kfs = []
  {
    const uke = figure({ facing: 1, hip: [455, 345], torso: -34, neck: -18, lead: 'f', gaze: 40, head_dir: 35, hara_dir: 25, ankles: { f: [520, G], b: [395, G] }, wrists: { f: [430, 170], b: [470, 350] }, elbows: { f: 'up', b: 'down' } }, 'nage 受け')
    const tori = figure({ facing: -1, hip: [575, 318], torso: 20, neck: 0, lead: 'f', gaze: -25, head_dir: -15, hara_dir: -20, ankles: { f: [505, G], b: [650, G] }, wrists: { f: jointOf(uke, 'wrist_f'), b: [jointOf(uke, 'wrist_f')[0] + 14, jointOf(uke, 'wrist_f')[1] + 10] }, elbows: { f: 'down', b: 'down' } }, 'nage 取り')
    kfs.push({ id: 'nage', at: 0.75, ease: 'power2.in', tori, uke })
  }
  {
    const uke = supine({ headX: 300, dir: 1, wrists: { f: [318, 452], b: [430, 505] } }, 'zanshin 受け')
    const tori = figure({ facing: -1, hip: [520, 380], torso: 22, neck: -6, lead: 'f', gaze: -30, head_dir: -20, hara_dir: -20, ankles: { f: [440, G], b: [610, 500] }, knees: { f: 'forward', b: 'down' }, wrists: { f: jointOf(uke, 'wrist_f'), b: [500, 400] } }, 'zanshin 取り')
    kfs.push({ id: 'zanshin', at: 1.0, tori, uke })
  }
  return kfs
}

// ---- 表：受けの前方へ入身して腕の下をくぐり、腕を肩へ畳む ----
{
  const kfs = common()
  const hand = [555, 150]
  const uke = figure({ facing: -1, hip: [628, 300], torso: -6, neck: -6, lead: 'f', gaze: 15, head_dir: 12, hara_dir: 5, ankles: { f: [575, G], b: [688, G] }, wrists: { f: hand, b: [648, 300] }, elbows: { f: 'up', b: 'down' } }, 'kuguri 受け')
  const tori = figure({ facing: 1, hip: [518, 326], torso: 22, neck: 12, lead: 'b', gaze: 0, head_dir: 5, hara_dir: 0, ankles: { b: [588, G], f: [448, G] }, wrists: { f: [hand[0] - 6, hand[1] + 6], b: [hand[0] - 14, hand[1] + 14] }, elbows: { f: 'up', b: 'up' } }, 'kuguri 取り')
  kfs.push({ id: 'kuguri', at: 0.5, ease: 'power2.inOut', tori, uke })
  await writePose('shihonage-omote', [...kfs, ...finish()])
}

// ---- 裏：受けの側面へ入り、転換して受けの腕を頭上へ回し肩へ畳む ----
{
  const kfs = common()
  const hand = [600, 150]
  const uke = figure({ facing: -1, hip: [560, 304], torso: 4, neck: -4, lead: 'f', gaze: 5, head_dir: 8, hara_dir: 0, ankles: { f: [505, G], b: [620, G] }, wrists: { f: hand, b: [575, 305] }, elbows: { f: 'up', b: 'down' } }, 'tenkan 受け')
  const tori = figure({ facing: -1, hip: [652, 310], torso: 8, neck: 4, lead: 'f', gaze: 0, head_dir: 5, hara_dir: -5, ankles: { f: [592, G], b: [722, G] }, wrists: { f: [hand[0] + 6, hand[1] + 6], b: [hand[0] + 14, hand[1] + 14] }, elbows: { f: 'up', b: 'up' } }, 'tenkan 取り')
  kfs.push({ id: 'tenkan', at: 0.5, ease: 'power2.inOut', tori, uke })
  await writePose('shihonage-ura', [...kfs, ...finish()])
}
