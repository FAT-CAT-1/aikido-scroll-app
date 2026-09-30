#!/usr/bin/env node
// 基礎動作（半身・転換・入身転換）の pose.json 初版（推定）。WebGL が使えない端末で使う 2D
//   node tools/pose-seed/kihon-taisabaki.mjs [--force]  … hanmi / tenkan / irimi-tenkan の3ファイル
//
// 2D 真横・取り右向き（facing +1）。相半身は取りが手前(f)・受けが奥(b)の足が前、逆半身は両者とも手前(f)の足が前
// （ikkyo-omote.mjs・shihonage.mjs と同じ約束）。
// 転換で取りは向きを変えるが、2D では掴まれた手を回った後も手前(f)の手として描く（途中で手が入れ替わって見えないように。
// 本当の奥行きと左右は 3D が正）。
import { figure, writePose } from './lib.mjs'

const G = 512 // 立ち姿勢の足首の高さ

// 相半身（一教の構え）と逆半身（四方投げの構え）の受け・取り
const aiTori = () =>
  figure({ facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [469, 250], b: [413, 286] } }, 'ai-hanmi 取り')
const aiUke = () =>
  figure({ facing: -1, hip: [620, 300], torso: 2, lead: 'b', gaze: -4, ankles: { b: [553, G], f: [687, G] }, wrists: { b: [531, 250], f: [587, 286] } }, 'ai-hanmi 受け')
const gyakuUke = () =>
  figure({ facing: -1, hip: [620, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [553, G], b: [687, G] }, wrists: { f: [531, 250], b: [587, 286] } }, 'gyaku-hanmi 受け')

// ---- 半身：自然体 → 相半身 → 逆半身（受けがその場で足を入れ替える） ----
{
  const tori = figure({ facing: 1, hip: [352, 292], torso: 0, lead: 'f', gaze: -2, ankles: { f: [358, G], b: [346, G] }, wrists: { f: [360, 284], b: [344, 284] } }, 'shizentai 取り')
  const uke = figure({ facing: -1, hip: [648, 292], torso: 0, lead: 'f', gaze: -2, ankles: { f: [642, G], b: [654, G] }, wrists: { f: [640, 284], b: [656, 284] } }, 'shizentai 受け')
  await writePose('hanmi', [
    { id: 'shizentai', at: 0.0, ease: 'power1.inOut', tori, uke },
    { id: 'ai-hanmi', at: 0.5, ease: 'power1.inOut', tori: aiTori(), uke: aiUke() },
    { id: 'gyaku-hanmi', at: 1.0, tori: aiTori(), uke: gyakuUke() },
  ])
}

// 逆半身の構えと片手取りの接触（shihonage.mjs とほぼ同じ形。掴む位置を少し上げて両者の腕が届くようにした）
function kamaeContact(contactAt) {
  const grip = [502, 262]
  return [
    {
      id: 'kamae',
      at: 0.0,
      ease: 'power1.inOut',
      // 転換・入身転換の構えでは、取りは前の手を帯の高さで体の前に置く
      tori: figure({ facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [450, 280], b: [410, 288] } }, 'kamae 取り'),
      uke: gyakuUke(),
    },
    {
      id: 'contact',
      at: contactAt,
      ease: 'power2.inOut',
      tori: figure({ facing: 1, hip: [405, 302], torso: 4, lead: 'f', gaze: -6, ankles: { f: [465, G], b: [340, G] }, wrists: { f: grip, b: [422, 288] } }, 'contact 取り'),
      uke: figure({ facing: -1, hip: [598, 302], torso: 6, lead: 'f', gaze: -6, ankles: { f: [540, G], b: [665, G] }, wrists: { f: [grip[0] + 8, grip[1] - 4], b: [612, 288] } }, 'contact 受け'),
    },
  ]
}

/** 受け：-x を向き、手前の手で取りの手首（hand）を掴んだまま */
const ukeHolding = (hip, fx, bx, hand, label, torso = 6) =>
  figure({ facing: -1, hip: [hip, 302], torso, lead: 'f', gaze: -4, ankles: { f: [fx, G], b: [bx, G] }, wrists: { f: [hand[0] + 6, hand[1] - 5], b: [hip + 10, 286] } }, label)

// ---- 転換：前足を軸に約 180° 回り、受けの横で同じ向きへ ----
{
  // 2D は真横から見るので、横に並ぶ2人の頭が重ならないよう、取りを受けより少し前（-x）に置く
  const turned = [500, 276]
  const reach = [455, 266]
  await writePose('tenkan', [
    ...kamaeContact(0.3),
    {
      id: 'tenkan',
      at: 0.65,
      ease: 'power2.inOut',
      tori: figure({ facing: -1, hip: [520, 300], torso: 3, lead: 'f', gaze: 0, ankles: { f: [473, G], b: [595, G] }, wrists: { f: turned, b: [540, 290] } }, 'tenkan 取り'),
      uke: ukeHolding(592, 538, 658, turned, 'tenkan 受け'),
    },
    {
      id: 'zanshin',
      at: 1.0,
      tori: figure({ facing: -1, hip: [490, 300], torso: 6, lead: 'f', gaze: 2, ankles: { f: [443, G], b: [565, G] }, wrists: { f: reach, b: [510, 290] } }, 'zanshin 取り'),
      uke: ukeHolding(555, 500, 620, reach, 'zanshin 受け'),
    },
  ])
}

// ---- 入身転換：前足を受けの前足の外を越えて深く送り、そこを軸に約 180° 回る ----
{
  const entered = [566, 282]
  const turned = [630, 280]
  const reach = [592, 266]
  await writePose('irimi-tenkan', [
    ...kamaeContact(0.25),
    {
      id: 'irimi',
      at: 0.5,
      ease: 'power2.inOut',
      tori: figure({ facing: 1, hip: [515, 304], torso: 5, lead: 'f', gaze: -2, ankles: { f: [585, G], b: [450, G] }, wrists: { f: entered, b: [536, 292] } }, 'irimi 取り'),
      uke: ukeHolding(600, 540, 665, entered, 'irimi 受け', 2),
    },
    {
      id: 'tenkan',
      at: 0.75,
      ease: 'power2.inOut',
      tori: figure({ facing: -1, hip: [680, 300], torso: 3, lead: 'f', gaze: 0, ankles: { f: [625, G], b: [750, G] }, wrists: { f: turned, b: [698, 290] } }, 'tenkan 取り'),
      uke: ukeHolding(600, 540, 665, turned, 'tenkan 受け'),
    },
    {
      id: 'zanshin',
      at: 1.0,
      tori: figure({ facing: -1, hip: [676, 300], torso: 6, lead: 'f', gaze: 2, ankles: { f: [625, G], b: [750, G] }, wrists: { f: reach, b: [694, 290] } }, 'zanshin 取り'),
      uke: ukeHolding(570, 515, 635, reach, 'zanshin 受け'),
    },
  ])
}
