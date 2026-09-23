// 四方投げ（表）・片手取り の 3D ポーズ初版（推定）。node tools/pose3d-seed/shihonage-omote.mjs [--force]
//
// 原稿 content/techniques/shihonage-omote.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え：逆半身（取りは右足前、受けは左足前）。受けが一歩で取りの前の手首に届く間合い
// - 接触：受けは前足（左）を送り出し、前の手（左）で取りの前の手首（右）を掴む
// - 崩し：取りは掴まれた手の手刀を返して受けの手首を捉え、左手も添えて両手で持つ。前足を半歩右前へ送り、受けを前へ導く
// - 間（0.4）：後ろ足（左）を受けの前へ大きく踏み込み（入身）、受けの手首を額の前へ振りかぶる
// - くぐり：両足のつま先の付け根を軸に約 180° 転回して、受けの腕の下をくぐり向きを変える。受けは腕を畳まれ、背中を投げの向きへ
// - 投げ：前足（右）を受けの背中の方へ送り足で踏み出し、両手を剣のように斬り下ろす。受けは膝を曲げて沈み、後ろへ倒れる
// - 残心：受けは仰向け。取りは膝を曲げて腰を落とし、受けの肩の近くで受けの手を耳元へ導いて制する
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, at, figure, fwd, lerp, mul, norm, resetWarnings, rightOf, STAND_HIP, sub, supine, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'

resetWarnings()
const { Y, headOf } = omote

/** 受けの左手が取りの右手首を掴む（接触） */
const GRAB = { hand: 'uke.hand_l', on: 'tori.wrist_r' }
/** 取りの両手が受けの左手首を持つ（崩し〜投げ） */
const HOLD = [
  { hand: 'tori.hand_r', on: 'uke.wrist_l' },
  { hand: 'tori.hand_l', on: 'uke.wrist_l' },
]
/** 受けの左手首を両手で持つ位置（右手は手首の少し先、左手は少し手前） */
const holdR = (uke) => add(uke.joints.wrist_l, [0.02, 0.03, 0.02])
const holdL = (uke) => add(uke.joints.wrist_l, [-0.03, -0.02, -0.02])

// ---- 構え（0.0）：逆半身。取りは一教と同じ右半身、受けは左半身 ----
const kamae = (() => {
  const tori = omote.kamae.tori
  const uke = figure(
    {
      hip: [0.84, STAND_HIP - 0.02, 0.0],
      yaw: 208,
      chestYaw: 200,
      lean: 3,
      faceAt: headOf(tori),
      lookAt: headOf(tori),
      legs: { l: { ankle: at(0.52, 0.07, Y), toe: 180 }, r: { ankle: at(1.12, -0.13, Y), toe: 255 } },
      arms: { l: { hand: [0.3, 1.12, 0.05] }, r: { hand: [0.6, 1.0, -0.07] } },
    },
    'kamae 受け',
  )
  return { id: 'kamae', at: 0, tori, uke }
})()

// ---- 接触（0.15）：受けは前足を送り出し、左手で取りの右手首を掴む ----
const contact = (() => {
  const tori = figure(
    {
      hip: [-0.8, STAND_HIP - 0.03, 0.02],
      yaw: -22,
      chestYaw: -12,
      lean: 4,
      faceAt: [0.4, 1.62, 0.05],
      lookAt: [0.4, 1.6, 0.05],
      legs: { r: { ankle: at(-0.52, 0.07, Y), toe: 0 }, l: { ankle: at(-1.12, -0.13, Y), toe: -75 } },
      arms: { r: { hand: [-0.3, 1.04, 0.08] }, l: { hand: [-0.6, 1.0, -0.07] } },
    },
    'contact 取り',
  )
  const uke = figure(
    {
      hip: [0.24, STAND_HIP - 0.05, 0.02],
      yaw: 205,
      chestYaw: 196,
      lean: 9,
      faceAt: headOf(tori),
      lookAt: headOf(tori),
      legs: { l: { ankle: at(0.0, 0.12, Y), toe: 185 }, r: { ankle: at(0.58, -0.1, Y), toe: 250 } },
      arms: { l: { hand: add(tori.joints.wrist_r, [0.03, 0.03, 0.0]) }, r: { hand: [0.2, 0.98, -0.28], soft: true } },
    },
    'contact 受け',
  )
  return { id: 'contact', at: 0.15, contacts: [GRAB], tori, uke }
})()

// ---- 崩し（0.3）：取りは両手で受けの左手首を持ち、前足を右前へ半歩送って受けを前へ導く ----
const kuzushi = (() => {
  const uke = figure(
    {
      hip: [0.24, STAND_HIP - 0.08, 0.12],
      yaw: 200,
      chestYaw: 190,
      lean: 18,
      head: { pitch: -8 },
      legs: { l: { ankle: at(0.02, 0.2, Y), toe: 190 }, r: { ankle: at(0.6, -0.04, Y), toe: 245 } },
      arms: { l: { hand: [-0.2, 0.98, 0.38] }, r: { hand: [0.2, 0.95, -0.25] } },
    },
    'kuzushi 受け',
  )
  const tori = figure(
    {
      hip: [-0.62, STAND_HIP - 0.05, 0.14],
      yaw: 14,
      chestYaw: 26,
      lean: 8,
      faceAt: add(headOf(uke), [0, 0, 0.4]),
      lookAt: add(uke.joints.hand_l, [0.3, 0, 0.5]),
      legs: { r: { ankle: at(-0.38, 0.24, Y), toe: 30 }, l: { ankle: at(-0.92, -0.02, Y), toe: -25 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'kuzushi 取り',
  )
  return { id: 'kuzushi', at: 0.3, contacts: HOLD, tori, uke }
})()

// ---- 間（0.4）：後ろ足（左）を受けの前へ大きく踏み込み、受けの手首を額の前へ振りかぶる ----
const irimi = (() => {
  const uke = figure(
    {
      hip: [0.2, STAND_HIP - 0.1, 0.14],
      yaw: 175,
      chestYaw: 160,
      lean: 10,
      head: { yaw: -20, pitch: 5 },
      legs: { l: { ankle: at(0.0, 0.22, Y), toe: 170 }, r: { ankle: at(0.52, -0.02, Y), toe: 220 } },
      arms: { l: { hand: [0.02, 1.55, 0.5], pole: norm([0, 1, 0.3]) }, r: { hand: [0.22, 0.95, -0.24], soft: true } },
    },
    'irimi 受け',
  )
  const tori = figure(
    {
      hip: [-0.2, STAND_HIP - 0.12, 0.56],
      yaw: 20,
      chestYaw: 40,
      lean: 4,
      head: { pitch: 10 },
      lookAt: add(headOf(uke), [0.5, 0, 0.3]),
      // 左足を受けの前（左前）へ大きく踏み込む。右足はその場
      legs: { l: { ankle: at(0.1, 0.74, Y), toe: 25, pole: norm([0.7, 0, 0.7]) }, r: { ankle: at(-0.38, 0.24, Y), toe: 40 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'irimi 取り',
  )
  return { id: 'irimi', at: 0.4, between: true, contacts: HOLD, tori, uke }
})()

// ---- 間（0.45）：受けの腕を頭の上に保ったまま、受けの左横（+z 側）を大回りして腕の下をくぐる（受けの足をまたがない） ----
const kuguriNaka = (() => {
  const uke = figure(
    {
      hip: [0.14, STAND_HIP - 0.12, 0.18],
      yaw: 100,
      chestYaw: 80,
      lean: 6,
      head: { yaw: 20, pitch: 5 },
      legs: { l: { ankle: at(0.06, 0.3, Y), toe: 100 }, r: { ankle: at(0.3, 0.0, Y), toe: 110 } },
      arms: { l: { hand: [0.12, 1.62, 0.5], pole: norm([0.3, 1, 0.4]) }, r: { hand: [0.3, 0.95, -0.1], soft: true } },
    },
    'kuguri-naka 受け',
  )
  const tori = figure(
    {
      hip: [0.2, STAND_HIP - 0.16, 0.74],
      yaw: 100,
      chestYaw: 120,
      lean: 6,
      head: { pitch: 10 },
      lookAt: add(headOf(uke), [0.4, 0.1, 0]),
      legs: { l: { ankle: at(0.02, 0.84, Y), toe: 90 }, r: { ankle: at(0.42, 0.78, 0.12), toe: 130, toeUp: 0.04 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'kuguri-naka 取り',
  )
  return { id: 'kuguri-naka', at: 0.45, between: true, contacts: HOLD, tori, uke }
})()

// ---- くぐり（0.5）：約 180° 転回して受けの腕の下をくぐり、-x（投げの向き）を向く。受けは腕を畳まれ、背中を -x へ ----
const THROW = 180
const kuguri = (() => {
  const uke = figure(
    {
      hip: [0.08, STAND_HIP - 0.13, 0.22],
      yaw: 20,
      chestYaw: 10,
      lean: 4,
      head: { yaw: 25, pitch: 0 },
      legs: { l: { ankle: at(0.06, 0.28, Y), toe: 30 }, r: { ankle: at(0.14, 0.02, Y), toe: 0 } },
      // 左腕は肘を曲げて手が肩口へ畳まれ、頭の上で取りに持たれる
      arms: { l: { hand: [0.08, 1.58, 0.42], pole: norm([0.6, 1, 0.4]) }, r: { hand: [0.3, 0.95, 0.02], soft: true } },
    },
    'kuguri 受け',
  )
  const tori = figure(
    {
      hip: [0.55, STAND_HIP - 0.14, 0.44],
      yaw: THROW,
      chestYaw: THROW - 10,
      lean: 8,
      head: { pitch: 8 },
      lookAt: add(headOf(uke), [-0.8, -0.3, 0]),
      // 転回で向きが変わり、右足が前（-x 側）
      legs: { r: { ankle: at(0.34, 0.58, Y), toe: THROW + 10 }, l: { ankle: at(0.8, 0.34, Y), toe: THROW - 50 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'kuguri 取り',
  )
  return { id: 'kuguri', at: 0.5, contacts: HOLD, tori, uke }
})()

// ---- 投げ（0.75）：前足（右）を受けの背中の方へ送り足で踏み出し、両手を斬り下ろす。受けは膝を曲げて沈み、後ろへ倒れる ----
const nage = (() => {
  const f = fwd(THROW)
  const uke = figure(
    {
      hip: [-0.18, 0.62, 0.2],
      yaw: 12,
      chestYaw: 8,
      lean: -18,
      head: { pitch: -30 },
      legs: { l: { ankle: at(0.12, 0.4, Y), toe: 20 }, r: { ankle: at(0.18, 0.06, Y), toe: 0 } },
      arms: { l: { hand: [-0.02, 1.12, 0.4], pole: norm([0.6, 1, 0.3]) }, r: { hand: [0.24, 0.72, 0.02], soft: true } },
    },
    'nage 受け',
  )
  const tori = figure(
    {
      hip: [0.34, STAND_HIP - 0.2, 0.38],
      yaw: THROW,
      chestYaw: THROW - 6,
      lean: 12,
      faceAt: add(headOf(uke), [-0.5, -0.3, 0]),
      lookAt: add(headOf(uke), [-0.8, -0.6, 0]),
      legs: { r: { ankle: add(at(0.34, 0.58, Y), mul(f, 0.34)), toe: THROW + 10 }, l: { ankle: add(at(0.8, 0.34, Y), mul(f, 0.26)), toe: THROW - 50 } },
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
      hip: [-0.62, 0.16, 0.24],
      yaw: 12,
      lean: -48,
      pelvisTilt: -40,
      head: { pitch: -35 },
      legs: {
        l: { ankle: at(-0.02, 0.4, 0.2), toe: 20, pole: [0, 1, 0] },
        r: { ankle: at(0.0, 0.12, 0.2), toe: 0, pole: [0, 1, 0] },
      },
      arms: { l: { hand: [-0.2, 0.72, 0.42], soft: true }, r: { hand: [-0.2, 0.4, 0.02], soft: true } },
    },
    'ochiru 受け',
  )
  const tori = figure(
    {
      hip: [-0.04, STAND_HIP - 0.36, 0.4],
      yaw: THROW,
      chestYaw: THROW - 4,
      lean: 38,
      faceAt: uke.joints.head,
      lookAt: uke.joints.head,
      legs: { r: { ankle: add(nage.tori.joints.ankle_r, mul(fwd(THROW), 0.14)), toe: THROW + 10 }, l: { ankle: add(add(nage.tori.joints.ankle_l, mul(fwd(THROW), 0.12)), [0, 0.12, 0]), toe: THROW - 30, toeUp: 0.04 } },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'ochiru 取り',
  )
  return { id: 'ochiru', at: 0.86, between: true, contacts: HOLD, tori, uke }
})()

// ---- 残心（1.0）：受けは仰向け。取りは膝を曲げて腰を落とし、受けの肩の近くで受けの手を耳元へ導いて制する ----
const zanshin = (() => {
  // 頭は -x（投げの向き）。仰向けでは受けの左は +z 側
  const probe = supine({ hip: [-0.7, 0.26], headYaw: THROW, arms: { l: { hand: [-1.1, 0.1, 0.5], soft: true }, r: { hand: [-0.5, 0.05, 0.02], soft: true } } }, 'zanshin 受け（仮）')
  const ear = add(probe.joints.head, [0.04, 0.0, 0.17])
  const uke = supine(
    {
      hip: [-0.7, 0.26],
      headYaw: THROW,
      arms: { l: { hand: ear, pole: norm([0.3, 1, 0.6]) }, r: { hand: [-0.46, 0.05, 0.0], soft: true } },
    },
    'zanshin 受け',
  )
  const w = uke.joints.wrist_l
  // 取り：受けの手首（耳元）の斜め後ろ（+x・+z）で左膝を着き、手首の方へ向いて前へ傾く
  const hip = [w[0] + 0.18, 0.44, w[2] + 0.19]
  const yaw = (Math.atan2(w[2] - hip[2], w[0] - hip[0]) * 180) / Math.PI
  const back = mul(fwd(yaw), -1)
  const tori = figure(
    {
      hip,
      yaw,
      chestYaw: yaw,
      lean: 62,
      lookAt: uke.joints.head,
      // 左膝を畳に着き、右足を立てて腰を落とす（受けの頭や腕を踏まない位置）
      legs: {
        l: { kneel: [hip[0] - rightOf(yaw)[0] * 0.12, hip[2] - rightOf(yaw)[2] * 0.12], tucked: true, back },
        r: { ankle: add(at(hip[0], hip[2], Y), add(mul(fwd(yaw), 0.04), mul(rightOf(yaw), 0.34))), toe: yaw + 30, pole: norm(add(fwd(yaw + 30), [0, 0.3, 0])) },
      },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'zanshin 取り',
  )
  return { id: 'zanshin', at: 1.0, contacts: HOLD, tori, uke }
})()

// ---- 間（0.94）：受けは仰向けになり、取りは受けの左側の外を通って頭の横へ歩み寄る（受けの体をまたがない） ----
const ayumi = (() => {
  // 受けの左手はまだ取りが胸の上に持ち上げている（残心で耳元へ下ろす）
  const sh0 = zanshin.uke.joints.shoulder_l
  const uke = supine(
    { hip: [-0.7, 0.26], headYaw: THROW, arms: { l: { hand: add(sh0, [0.12, 0.5, 0.12]) }, r: { hand: [-0.46, 0.05, 0.0], soft: true, pole: [0, 1, 0] } } },
    'ayumi 受け',
  )
  const w = uke.joints.wrist_l
  const hip = [w[0] + 0.34, STAND_HIP - 0.3, w[2] + 0.3]
  const yaw = (Math.atan2(w[2] - hip[2], w[0] - hip[0]) * 180) / Math.PI
  const tori = figure(
    {
      hip,
      yaw,
      chestYaw: yaw,
      lean: 40,
      lookAt: uke.joints.head,
      legs: {
        // 両足とも受けの体の外側（+z）に、受けの体と並ぶ向きで置く
        l: { ankle: at(hip[0] + 0.24, hip[2] + 0.14, Y), toe: THROW - 20 },
        r: { ankle: at(hip[0] - 0.26, hip[2] + 0.1, Y), toe: THROW + 10 },
      },
      arms: { r: { hand: holdR(uke) }, l: { hand: holdL(uke) } },
    },
    'ayumi 取り',
  )
  return { id: 'ayumi', at: 0.94, between: true, contacts: HOLD, tori, uke }
})()

export { kamae, contact, kuzushi, irimi, kuguriNaka, kuguri, nage, ochiru, ayumi, zanshin }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writePose3D('shihonage-omote', [kamae, contact, kuzushi, irimi, kuguriNaka, kuguri, nage, ochiru, ayumi, zanshin], {
    note: '記述からの推定（動画なし）。逆半身・片手取り。くぐり・投げる向き（取りが最初にいた側）・残心の形はディレクター確認済み（2026-09-23）',
  })
}
void lerp
void rightOf
void sub
