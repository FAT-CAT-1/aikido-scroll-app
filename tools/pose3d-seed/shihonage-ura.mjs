// 四方投げ（裏）・片手取り の 3D ポーズ初版（推定）。node tools/pose3d-seed/shihonage-ura.mjs [--force]
//
// 原稿 content/techniques/shihonage-ura.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// 投げる向きはディレクター確認（2026-09-23 夜）：受けが最初にいた側（+x）へ投げる（表は取りが最初にいた側）。
// - 構え・接触・崩し：四方投げ（表）と同じ（逆半身、受けは左手で取りの右手首を掴み、取りは両手で受けの左手首を持って前へ導く）
// - 間（0.4）：取りは前足（右）を受けの前足の外側（受けの左＝+z 側）へ滑らせ、受けの手首を額の前へ振りかぶる
// - 間（0.45）：前足を軸に後ろ足（左）を大きく回して転換する途中
// - 転換：続けて両足で転回し、受けの左横で +x（受けが最初にいた側）を向く。受けの腕は肩口へ畳まれ、頭の上で両手に持たれる
// - 投げ：前足を受けの背中の方（+x）へ一歩踏み出し、剣のように斬り下ろす。受けは膝を曲げて沈み、後ろ（+x）へ倒れる
// - 残心：受けは仰向け（頭は +x）。取りは受身に合わせて手を静かに離し、受けの頭や腕を踏まない位置に立つ
import { add, at, figure, fwd, mul, norm, resetWarnings, STAND_HIP, supine, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as shiho from './shihonage-omote.mjs'

resetWarnings()
const { Y, headOf } = omote

const HOLD = [
  { hand: 'tori.hand_r', on: 'uke.wrist_l' },
  { hand: 'tori.hand_l', on: 'uke.wrist_l' },
]
const holdR = (uke) => add(uke.joints.wrist_l, [0.02, 0.03, 0.02])
const holdL = (uke) => add(uke.joints.wrist_l, [-0.03, -0.02, -0.02])
/** 投げる向き：受けが最初にいた側 */
const THROW = 0

// ---- 間（0.4）：前足（右）を受けの前足の外側へ滑らせ、手首を額の前へ振りかぶる ----
const soto = (() => {
  const uke = figure(
    {
      hip: [0.26, STAND_HIP - 0.1, 0.12],
      yaw: 192,
      chestYaw: 200,
      lean: 8,
      head: { yaw: 20, pitch: 5 },
      legs: { l: { ankle: at(0.04, 0.2, Y), toe: 190 }, r: { ankle: at(0.58, -0.04, Y), toe: 240 } },
      arms: { l: { hand: [-0.02, 1.5, 0.42], pole: norm([0, 1, 0.3]) }, r: { hand: [0.26, 0.95, -0.24], soft: true } },
    },
    'soto 受け',
  )
  const tori = figure(
    {
      hip: [-0.2, STAND_HIP - 0.1, 0.5],
      yaw: 10,
      chestYaw: 0,
      lean: 4,
      head: { pitch: 8 },
      lookAt: add(headOf(uke), [0.4, 0, 0.2]),
      // 前足（右）を受けの左足の外側へ
      legs: { r: { ankle: at(0.02, 0.56, Y), toe: 20 }, l: { ankle: at(-0.52, 0.36, Y), toe: -40 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'soto 取り',
  )
  return { id: 'soto', at: 0.4, between: true, contacts: HOLD, tori, uke }
})()

// ---- 間（0.45）：右足を軸に左足を後ろへ大きく回して転換する途中（左回り。後ろ足は受けから離れる側を回る。受けの手首は頭の上に保つ） ----
const mawaru = (() => {
  const uke = figure(
    {
      hip: [0.27, STAND_HIP - 0.12, 0.11],
      yaw: 188,
      chestYaw: 196,
      lean: 5,
      head: { yaw: 25, pitch: 5 },
      legs: { l: { ankle: at(0.05, 0.2, Y), toe: 190 }, r: { ankle: at(0.58, -0.04, Y), toe: 240 } },
      arms: { l: { hand: [0.12, 1.6, 0.38], pole: norm([0.3, 1, 0.3]) }, r: { hand: [0.28, 0.95, -0.22], soft: true } },
    },
    'mawaru 受け',
  )
  const yaw = -80
  const tori = figure(
    {
      hip: [0.03, STAND_HIP - 0.12, 0.66],
      yaw,
      chestYaw: yaw + 30,
      lean: 4,
      head: { pitch: 10 },
      lookAt: add(headOf(uke), [0.3, 0.2, 0]),
      legs: { r: { ankle: at(0.02, 0.56, Y), toe: 60 }, l: { ankle: add(at(0.02, 0.56, 0.14), mul(fwd(yaw), -0.5)), toe: yaw + 40, toeUp: 0.04 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'mawaru 取り',
  )
  return { id: 'mawaru', at: 0.45, between: true, contacts: HOLD, tori, uke }
})()

// ---- 転換（0.5）：転回して受けの左横で +x を向く。受けの腕は肩口へ畳まれ、頭の上で持たれる ----
const tenkan = (() => {
  const uke = figure(
    {
      hip: [0.28, STAND_HIP - 0.13, 0.1],
      yaw: 185,
      chestYaw: 190,
      lean: 3,
      head: { yaw: 30, pitch: 0 },
      legs: { l: { ankle: at(0.08, 0.2, Y), toe: 185 }, r: { ankle: at(0.56, -0.02, Y), toe: 230 } },
      // 左腕は肘を曲げて手が肩口の上へ畳まれる
      arms: { l: { hand: [0.32, 1.6, 0.3], pole: norm([-0.6, 1, 0.3]) }, r: { hand: [0.3, 0.95, -0.2], soft: true } },
    },
    'tenkan 受け',
  )
  const tori = figure(
    {
      hip: [0.14, STAND_HIP - 0.13, 0.58],
      yaw: THROW,
      chestYaw: THROW - 20,
      lean: 4,
      head: { pitch: 6 },
      lookAt: add(headOf(uke), [0.8, -0.3, 0]),
      legs: { r: { ankle: at(0.38, 0.5, Y), toe: THROW + 10 }, l: { ankle: at(-0.1, 0.72, Y), toe: THROW - 50 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'tenkan 取り',
  )
  return { id: 'tenkan', at: 0.5, contacts: HOLD, tori, uke }
})()

// ---- 投げ（0.75）：前足を受けの背中の方（+x）へ踏み出して斬り下ろす。受けは膝を曲げて沈み、後ろへ倒れる ----
const nage = (() => {
  const f = fwd(THROW)
  const uke = figure(
    {
      hip: [0.5, 0.62, 0.12],
      yaw: 182,
      chestYaw: 186,
      lean: -18,
      head: { pitch: -30 },
      legs: { l: { ankle: at(0.28, 0.24, Y), toe: 185 }, r: { ankle: at(0.3, -0.06, Y), toe: 200 } },
      arms: { l: { hand: [0.5, 1.12, 0.3], pole: norm([-0.6, 1, 0.3]) }, r: { hand: [0.34, 0.72, -0.08], soft: true } },
    },
    'nage 受け',
  )
  const tori = figure(
    {
      hip: [0.36, STAND_HIP - 0.2, 0.56],
      yaw: THROW,
      chestYaw: THROW - 10,
      lean: 12,
      faceAt: add(headOf(uke), [0.5, -0.3, 0]),
      lookAt: add(headOf(uke), [0.8, -0.6, 0]),
      legs: { r: { ankle: add(at(0.38, 0.5, Y), mul(f, 0.34)), toe: THROW + 10 }, l: { ankle: add(at(-0.1, 0.72, Y), mul(f, 0.26)), toe: THROW - 50 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'nage 取り',
  )
  return { id: 'nage', at: 0.75, contacts: HOLD, tori, uke }
})()

// ---- 間（0.86）：受けは尻から畳に着いて背中を丸め、後ろへ転がる途中 ----
const ochiru = (() => {
  const uke = figure(
    {
      hip: [0.8, 0.16, 0.12],
      yaw: 182,
      lean: -48,
      pelvisTilt: -40,
      head: { pitch: -35 },
      legs: {
        l: { ankle: at(0.4, 0.26, 0.2), toe: 185, pole: [0, 1, 0] },
        r: { ankle: at(0.42, -0.02, 0.2), toe: 180, pole: [0, 1, 0] },
      },
      arms: { l: { hand: [0.66, 0.72, 0.3], soft: true }, r: { hand: [0.6, 0.4, -0.1], soft: true } },
    },
    'ochiru 受け',
  )
  const tori = figure(
    {
      hip: [0.56, STAND_HIP - 0.34, 0.54],
      yaw: THROW,
      chestYaw: THROW - 4,
      lean: 30,
      faceAt: uke.joints.head,
      lookAt: uke.joints.head,
      legs: { r: { ankle: add(nage.tori.joints.ankle_r, mul(fwd(THROW), 0.14)), toe: THROW + 10 }, l: { ankle: add(add(nage.tori.joints.ankle_l, mul(fwd(THROW), 0.12)), [0, 0.12, 0]), toe: THROW - 30, toeUp: 0.04 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'ochiru 取り',
  )
  return { id: 'ochiru', at: 0.86, between: true, contacts: HOLD, tori, uke }
})()

// ---- 残心（1.0）：受けは仰向け（頭は +x）。取りは手を静かに離し、受けの頭や腕を踏まない位置に立つ ----
const zanshin = (() => {
  const uke = supine(
    {
      hip: [1.1, 0.12],
      headYaw: THROW,
      // 腕は畳の上に置く（肘は上へ曲げる）
      arms: { l: { hand: [1.3, 0.05, 0.5], soft: true, pole: [0, 1, 0] }, r: { hand: [1.0, 0.05, -0.2], soft: true, pole: [0, 1, 0] } },
    },
    'zanshin 受け',
  )
  const tori = figure(
    {
      hip: [0.9, STAND_HIP - 0.05, 0.72],
      yaw: -30,
      chestYaw: -36,
      lean: 8,
      faceAt: uke.joints.head,
      lookAt: uke.joints.head,
      legs: { r: { ankle: at(1.12, 0.58, Y), toe: -20 }, l: { ankle: at(0.7, 0.86, Y), toe: -70 } },
      arms: { r: { hand: [1.18, 0.95, 0.62], soft: true }, l: { hand: [1.08, 0.9, 0.78], soft: true } },
    },
    'zanshin 取り',
  )
  return { id: 'zanshin', at: 1.0, tori, uke }
})()

writePose3D('shihonage-ura', [shiho.kamae, shiho.contact, shiho.kuzushi, soto, mawaru, tenkan, nage, ochiru, zanshin], {
  note: '記述からの推定（動画なし）。逆半身・片手取り。投げる向きは受けが最初にいた側（ディレクター確認）。転換・転回で回る量を師範に確認する',
})
