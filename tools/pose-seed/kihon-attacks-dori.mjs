#!/usr/bin/env node
// 攻撃法（基礎動作）：片手取り・両手取り・肩取り の pose.json 初版（推定）。WebGL が使えない端末で使う 2D
//   node tools/pose-seed/kihon-attacks-dori.mjs [--force]  … katate-dori / ryote-dori / kata-dori の3ファイル
//
// 2D 真横・取り右向き（facing +1）。逆半身（取り・受けとも手前(f)の足が前）。受けは前足を送り出して掴む
import { figure, writePose } from './lib.mjs'

const G = 512 // 立ち姿勢の足首の高さ

/** 取り：逆半身の構え。両手（wf・wb）を体の前に置く */
const toriKamae = (label, wf, wb, hip = 380) =>
  figure({ facing: 1, hip: [hip, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [hip + 67, G], b: [hip - 67, G] }, wrists: { f: wf, b: wb } }, label)
/** 受け：逆半身。腰の位置 hip、足の位置、両手 */
const uke = (label, hip, { f, b, ankles, torso = 4 }) =>
  figure({ facing: -1, hip: [hip, 302], torso, lead: 'f', gaze: -6, ankles: ankles ?? { f: [hip - 67, G], b: [hip + 67, G] }, wrists: { f, b } }, label)

const ukeKamae = uke('kamae 受け', 620, { f: [531, 250], b: [587, 286], ankles: { f: [553, G], b: [687, G] }, torso: 2 })

// ---- 片手取り：受けは前足を送り出し、前の手（手前 f）で取りの前の手首を上から掴む ----
{
  const tori = toriKamae('kamae 取り', [450, 280], [410, 288])
  const grip = [502, 262]
  await writePose('katate-dori', [
    { id: 'kamae', at: 0.0, ease: 'power1.inOut', tori, uke: ukeKamae },
    { id: 'fumikomi', at: 0.4, ease: 'power2.inOut', tori, uke: uke('fumikomi 受け', 610, { f: [520, 262], b: [612, 290], ankles: { f: [548, 500], b: [676, G] }, torso: 6 }) },
    {
      id: 'tsukamu',
      at: 1.0,
      tori: figure({ facing: 1, hip: [405, 302], torso: 4, lead: 'f', gaze: -6, ankles: { f: [465, G], b: [340, G] }, wrists: { f: grip, b: [422, 288] } }, 'tsukamu 取り'),
      uke: uke('tsukamu 受け', 598, { f: [grip[0] + 8, grip[1] - 4], b: [612, 288], ankles: { f: [540, G], b: [665, G] }, torso: 6 }),
    },
  ])
}

// ---- 両手取り：受けは前足を送り出し、両手で取りの両手首を上から掴む ----
{
  // 真横の 2D では奥の手どうしで掴むので、受けは片手取りより近くに立つ
  const tori = toriKamae('kamae 取り', [450, 280], [425, 280])
  const gf = [490, 262]
  const gb = [468, 270]
  await writePose('ryote-dori', [
    { id: 'kamae', at: 0.0, ease: 'power1.inOut', tori, uke: ukeKamae },
    { id: 'fumikomi', at: 0.4, ease: 'power2.inOut', tori, uke: uke('fumikomi 受け', 600, { f: [520, 262], b: [560, 282], ankles: { f: [540, 500], b: [666, G] }, torso: 6 }) },
    {
      id: 'tsukamu',
      at: 1.0,
      tori: figure({ facing: 1, hip: [410, 302], torso: 4, lead: 'f', gaze: -6, ankles: { f: [470, G], b: [345, G] }, wrists: { f: gf, b: gb } }, 'tsukamu 取り'),
      uke: uke('tsukamu 受け', 536, { f: [gf[0] + 8, gf[1] - 4], b: [gb[0] + 8, gb[1] - 4], ankles: { f: [482, G], b: [600, G] }, torso: 8 }),
    },
  ])
}

// ---- 肩取り：受けは前足を送り出し、前の手（手前 f）で取りの前の肩の道着を掴んで押さえる ----
{
  const tori = toriKamae('kamae 取り', [450, 280], [410, 288])
  const toriHeld = figure({ facing: 1, hip: [392, 306], torso: 3, lead: 'f', gaze: -6, ankles: { f: [458, G], b: [326, G] }, wrists: { f: [452, 282], b: [412, 292] } }, 'tsukamu 取り')
  const shoulder = toriHeld.joints.shoulder_f
  await writePose('kata-dori', [
    { id: 'kamae', at: 0.0, ease: 'power1.inOut', tori, uke: ukeKamae },
    { id: 'fumikomi', at: 0.4, ease: 'power2.inOut', tori, uke: uke('fumikomi 受け', 600, { f: [510, 200], b: [606, 290], ankles: { f: [540, 500], b: [666, G] }, torso: 5 }) },
    {
      id: 'tsukamu',
      at: 1.0,
      tori: toriHeld,
      uke: uke('tsukamu 受け', 520, { f: [shoulder[0] + 12, shoulder[1] + 6], b: [532, 290], ankles: { f: [470, G], b: [585, G] }, torso: 4 }),
    },
  ])
}
