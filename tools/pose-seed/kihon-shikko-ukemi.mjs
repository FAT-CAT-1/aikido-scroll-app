#!/usr/bin/env node
// 基礎動作（膝行・後ろ受身・前受身）の pose.json 初版（推定）。WebGL が使えない端末で使う 2D
//   node tools/pose-seed/kihon-shikko-ukemi.mjs [--force]  … shikko / ukemi-ushiro / ukemi-mae の3ファイル
//
// 2D 真横・取り右向き（facing +1）。膝を運ぶ脚・転がる体は角度（legs / torso）で組み、奥行きのある動きは 3D が正。
import { figure, seiza, writePose } from './lib.mjs'

const G = 512 // 立ち姿勢の足首の高さ
const MAT = 508 // 膝・体を畳に着けたときの高さ

/**
 * 手首を肩からの向きで置く（rel = { f: [前へ, 下へ], b: [...] }、長さは腕が届く 110 までに縮める）。
 * 体を倒したり転がったりする姿勢でも、腕が届かない注意を出さずに手の位置を決めるため
 */
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
  return figure({ ...spec, wrists }, label)
}

// ---- 膝行：正座 → 跪座 → 一歩目 → 二歩目 → 止まる。受けは正座のまま ----
// 真横の 2D では腰の回りと左右の膝の運びは描けないので、跪座の形のまま（腰を少し上げて）前へ進む姿で表す。膝の運び方は 3D が正
{
  const uke = () => seiza({ facing: -1, kneeX: 600, torso: 3 }, 'shikko 受け')
  const kneel = (label, kneeX, sit) => seiza({ facing: 1, kneeX, torso: 2, sit }, label)
  await writePose('shikko', [
    { id: 'seiza', at: 0.0, ease: 'power1.inOut', tori: seiza({ facing: 1, kneeX: 330, torso: 3 }, 'seiza 取り'), uke: uke() },
    { id: 'kiza', at: 0.2, ease: 'power2.inOut', tori: kneel('kiza 取り', 330, 0.8), uke: uke() },
    { id: 'ippo', at: 0.5, ease: 'power2.inOut', tori: kneel('ippo 取り', 412, 0.72), uke: uke() },
    { id: 'nippo', at: 0.8, ease: 'power2.inOut', tori: kneel('nippo 取り', 470, 0.72), uke: uke() },
    { id: 'tomaru', at: 1.0, tori: kneel('tomaru 取り', 494, 0.8), uke: uke() },
  ])
}

// ---- 後ろ受身：構え（相半身）→ 接触（手刀を胸元へ）→ 沈む → 転がる → 片膝立ちで起き上がる ----
{
  const toriHanmi = (label) =>
    figure({ facing: 1, hip: [420, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [487, G], b: [353, G] }, wrists: { f: [505, 256], b: [450, 286] } }, label)
  const kamaeUke = figure({ facing: -1, hip: [600, 300], torso: 2, lead: 'b', gaze: -4, ankles: { b: [533, G], f: [667, G] }, wrists: { b: [515, 256], f: [567, 286] } }, 'kamae 受け')
  const contactUke = withHands({ facing: -1, hip: [604, 300], torso: -6, neck: -6, lead: 'b', gaze: 10, ankles: { b: [537, G], f: [671, G] } }, 'contact 受け', { f: [34, 96], b: [40, 92] })
  const shizumu = figure(
    { facing: -1, hip: [650, 418], torso: 26, neck: 16, lead: 'b', gaze: 20, head_dir: 10, ankles: { b: [560, G], f: [660, 500] }, knees: { b: 'forward', f: 'forward' }, wrists: { b: [548, 372], f: [556, 378] } },
    'shizumu 受け',
  )
  // 両腕は膝の方へ（畳を後ろへ突かない）
  const korogaru = withHands(
    { facing: -1, hip: [690, 470], torso: -84, neck: 40, lead: 'b', gaze: 60, head_dir: 50, hara_dir: 60, ankles: { b: [650, 396], f: [660, 392] }, knees: { b: 'up', f: 'up' } },
    'korogaru 受け',
    { f: [104, -20], b: [100, -26] },
  )
  // 片膝立ち：奥の膝を畳に着き、手前の足を前に立てる
  const okiru = figure(
    { facing: -1, anchor: ['knee_b', [690, MAT]], torso: 4, lead: 'f', gaze: -4, legs: { b: [0, -88] }, ankles: { f: [605, G] }, knees: { f: 'forward' }, wrists: { f: [622, 330], b: [650, 340] } },
    'okiru 受け',
  )
  await writePose('ukemi-ushiro', [
    { id: 'kamae', at: 0.0, ease: 'power1.inOut', tori: toriHanmi('kamae 取り'), uke: kamaeUke },
    {
      id: 'contact',
      at: 0.2,
      ease: 'power2.inOut',
      tori: figure({ facing: 1, hip: [446, 302], torso: 6, lead: 'f', gaze: -6, ankles: { f: [512, G], b: [378, G] }, wrists: { f: [556, 206], b: [468, 290] } }, 'contact 取り'),
      uke: contactUke,
    },
    { id: 'shizumu', at: 0.4, ease: 'power2.in', tori: toriHanmi('shizumu 取り'), uke: shizumu },
    { id: 'korogaru', at: 0.65, ease: 'power2.inOut', tori: toriHanmi('korogaru 取り'), uke: korogaru },
    { id: 'okiru', at: 1.0, tori: toriHanmi('okiru 取り'), uke: okiru },
  ])
}

// ---- 前受身：構え・接触（逆半身片手取り）→ 導き（取りは転換して前下へ導く）→ 回る → 起き上がって向き直る ----
{
  const grip = [502, 262]
  const gyakuUke = figure({ facing: -1, hip: [620, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [553, G], b: [687, G] }, wrists: { f: [531, 250], b: [587, 286] } }, 'kamae 受け')
  // 取りは回り終えて -x を向き、受けを見届ける（2D では掴まれていた手を手前の手のまま描く）
  const toriTurned = (label, wf = [492, 280]) =>
    figure({ facing: -1, hip: [520, 300], torso: 4, lead: 'f', gaze: 4, ankles: { f: [473, G], b: [595, G] }, wrists: { f: wf, b: [540, 290] } }, label)
  // 前の腕を丸く前下へ差し出す
  const michibikiUke = withHands(
    { facing: -1, hip: [520, 334], torso: 46, neck: 18, lead: 'f', gaze: 30, head_dir: 20, ankles: { f: [428, G], b: [604, G] } },
    'michibiki 受け',
    { f: [80, 74], b: [70, 80] },
  )
  // 転がる途中：肩は畳の近く（右）、腰は左上、脚は曲げたまま頭の上を越えていく
  const mawaruUke = figure(
    { facing: -1, hip: [300, 440], torso: -107, neck: 40, lead: 'f', gaze: 60, head_dir: 40, hara_dir: 60, ankles: { f: [262, 360], b: [270, 356] }, knees: { f: 'up', b: 'up' }, wrists: { f: [330, 420], b: [340, 426] } },
    'mawaru 受け',
  )
  const okiruUke = figure({ facing: 1, hip: [200, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [267, G], b: [133, G] }, wrists: { f: [289, 250], b: [233, 286] } }, 'okiru 受け')
  await writePose('ukemi-mae', [
    {
      id: 'kamae',
      at: 0.0,
      ease: 'power1.inOut',
      tori: figure({ facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [450, 280], b: [410, 288] } }, 'kamae 取り'),
      uke: gyakuUke,
    },
    {
      id: 'contact',
      at: 0.2,
      ease: 'power2.inOut',
      tori: figure({ facing: 1, hip: [405, 302], torso: 4, lead: 'f', gaze: -6, ankles: { f: [465, G], b: [340, G] }, wrists: { f: grip, b: [422, 288] } }, 'contact 取り'),
      uke: figure({ facing: -1, hip: [598, 302], torso: 6, lead: 'f', gaze: -6, ankles: { f: [540, G], b: [665, G] }, wrists: { f: [grip[0] + 8, grip[1] - 4], b: [612, 288] } }, 'contact 受け'),
    },
    { id: 'michibiki', at: 0.4, ease: 'power2.inOut', tori: toriTurned('michibiki 取り', [476, 290]), uke: michibikiUke },
    { id: 'mawaru', at: 0.65, ease: 'power1.inOut', tori: toriTurned('mawaru 取り'), uke: mawaruUke },
    { id: 'okiru', at: 1.0, tori: toriTurned('okiru 取り'), uke: okiruUke },
  ])
}
