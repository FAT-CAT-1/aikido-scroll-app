// 転換（基礎動作・逆半身片手取り）の 3D ポーズ初版（推定）。node tools/pose3d-seed/tenkan.mjs [--force]
//
// 原稿 content/kihon/tenkan.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え・接触：四方投げ（表）と同じ（逆半身。受けは前足を送り出し、前の手（左）で取りの前の手首（右）を掴む）
// - 間（0.42）：取りは前足（右）を受けの前足の外側（受けの左＝+z）へ半歩進めて軸にする。後ろ足も少し引きつける
// - 間（0.54）：前足を軸に、後ろ足を受けから離れる側（+z）を通して後ろへ回す途中。取りは受けの左横を向いている
// - 転換：約 180° 回り、受けの左横で受けと同じ向き（-x）を向く。掴まれた手は腰の前
// - 残心：掴まれた手の手刀を腰の高さで前へ伸ばす。受けは導かれて半歩前へ出る
//
// 回る向き：取りの軸足は受けの左の外にあり、受けは取りの右（-z）側にいる。後ろ足が受けの足元を通らないよう、
// 取りは左回り（真上から見て反時計回り。yaw が減る向き）に回る。yaw の数は -28 → -118 → -208 と連続させる
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, figure, fwd, mul, norm, resetWarnings, rightOf, STAND_HIP, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as shiho from './shihonage-omote.mjs'

resetWarnings()
const { Y, headOf } = omote

/** 受けの左手が取りの右手首を掴む（接触〜残心） */
const GRAB = { hand: 'uke.hand_l', on: 'tori.wrist_r' }
/** 受けの手：取りの手首を上から掴む */
const grab = (tori) => add(tori.joints.wrist_r, [0.03, 0.035, 0])

/**
 * 取りの右半身（右足前）を、前足の位置 P と向き D（度）から作る。一教（表）の構えの足の開きに合わせる：
 * 後ろ足は P から後ろへ 0.6・左へ 0.2、腰は後ろへ 0.32・左へ 0.07。掴まれた右手は腰の前
 */
function toriStance(P, D, { label, lean = 4, hipDrop = 0.04, back = [0.6, 0.2], handAhead = 0.4, handY = 0.97, lookAt, faceAt, free, backToeUp = 0 }) {
  const f = fwd(D)
  const r = rightOf(D)
  const p3 = [P[0], Y, P[1]]
  const backFoot = add(add(p3, mul(f, -back[0])), mul(r, -back[1]))
  const hip = add(add([P[0], STAND_HIP - hipDrop, P[1]], mul(f, -0.32)), mul(r, -0.07))
  const hand = add(add([hip[0], handY, hip[2]], mul(f, handAhead)), mul(r, 0.1))
  const freeHand = free ?? add(add([hip[0], 0.98, hip[2]], mul(f, 0.28)), mul(r, -0.2))
  return figure(
    {
      hip,
      yaw: D - 28,
      chestYaw: D - 20,
      lean,
      ...(faceAt ? { faceAt } : {}),
      ...(lookAt ? { lookAt } : {}),
      legs: { r: { ankle: p3, toe: D }, l: { ankle: backFoot, toe: D - 75, toeUp: backToeUp } },
      // 掴まれた手の肘は下へ落とし、体から離さない（受けの側へ張り出さない）
      arms: { r: { hand, dir: norm(add(f, [0, 0.2, 0])), pole: norm(add([0, -1, 0], mul(r, -0.35))) }, l: { hand: freeHand, soft: true } },
    },
    label,
  )
}

/** 受け：左半身で -x を向き、左手で取りの右手首を掴んだまま（腰と足の位置を渡す） */
function ukeHolding(tori, { hip, yaw = 205, chestYaw, lean = 6, lf, rf, label, lookAt }) {
  return figure(
    {
      hip,
      yaw,
      chestYaw: chestYaw ?? yaw - 8,
      lean,
      faceAt: lookAt ?? headOf(tori),
      lookAt: lookAt ?? headOf(tori),
      legs: { l: { ankle: lf, toe: yaw - 20 }, r: { ankle: rf, toe: yaw + 45 } },
      // 掴んだ腕の肘は下・内側へ（取りの側へ張り出さない）
      arms: { l: { hand: grab(tori), pole: norm([0.3, -1, -0.5]) }, r: { hand: add(hip, [-0.05, 0.02, -0.28]), soft: true } },
    },
    label,
  )
}

// ---- 構え（0.0）：四方投げ（表）の構え。ただし取りは前の手を帯の高さで体の前に置く（原稿の構えの記述） ----
export const kamae = (() => {
  const u = shiho.kamae.uke
  const tori = figure(
    {
      hip: [-0.84, STAND_HIP - 0.02, 0.0],
      yaw: -28,
      chestYaw: -20,
      lean: 3,
      faceAt: headOf(u),
      lookAt: headOf(u),
      legs: { r: { ankle: [-0.52, Y, 0.07], toe: 0 }, l: { ankle: [-1.12, Y, -0.13], toe: -75 } },
      arms: { r: { hand: [-0.42, 1.0, 0.07], dir: norm([1, 0.25, 0]) }, l: { hand: [-0.64, 0.95, -0.08], soft: true } },
    },
    'kamae 取り',
  )
  return { id: 'kamae', at: 0, tori, uke: u }
})()

// ---- 接触（0.3）：四方投げ（表）と同じ ----
export const contact = { ...shiho.contact, at: 0.3 }

/** 軸足（取りの右足）の位置：受けの前足（左）の外側、半歩前 */
export const PIVOT = [-0.1, 0.46]

// ---- 間（0.42）：前足を受けの前足の外側へ半歩進めて軸にする ----
const fumikomi = (() => {
  const u = contact.uke.joints
  const tori = toriStance(PIVOT, -10, {
    label: 'fumikomi 取り',
    back: [0.5, 0.22],
    faceAt: u.head,
    lookAt: u.head,
  })
  const uke = ukeHolding(tori, { hip: [0.24, STAND_HIP - 0.05, 0.03], lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'fumikomi 受け' })
  return { id: 'fumikomi', at: 0.42, between: true, contacts: [GRAB], tori, uke }
})()

// ---- 間（0.54）：前足を軸に、後ろ足を受けから離れる側（+z）を通して後ろへ回す途中。受けの左横を向く ----
const mawaru = (() => {
  const D = -100
  const tori = toriStance(PIVOT, D, {
    label: 'mawaru 取り',
    back: [0.42, 0.12],
    backToeUp: 0.05,
    lean: 6,
    handAhead: 0.36,
    faceAt: [0.25, 1.4, -0.3],
    lookAt: [0.3, 1.3, -0.6],
  })
  const uke = ukeHolding(tori, { hip: [0.22, STAND_HIP - 0.05, 0.05], yaw: 200, lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'mawaru 受け' })
  return { id: 'mawaru', at: 0.54, between: true, contacts: [GRAB], tori, uke }
})()

// ---- 転換（0.65）：約 180° 回り、受けの左横で -x を向く。掴まれた手は腰の前 ----
export const tenkan = (() => {
  const D = -180
  const tori = toriStance(PIVOT, D, {
    label: 'tenkan 取り',
    handAhead: 0.36,
    lookAt: [-2.5, 1.2, 0.4],
    faceAt: [-2.5, 1.4, 0.4],
  })
  const uke = ukeHolding(tori, {
    hip: [0.18, STAND_HIP - 0.05, 0.06],
    yaw: 195,
    lf: [-0.02, Y, 0.14],
    rf: [0.56, Y, -0.08],
    label: 'tenkan 受け',
    lookAt: [-1.5, 1.3, 0.3],
  })
  return { id: 'tenkan', at: 0.65, contacts: [GRAB], tori, uke }
})()

// ---- 残心（1.0）：掴まれた手の手刀を腰の高さで前へ伸ばす。受けは導かれて半歩前へ ----
export const zanshin = (() => {
  const D = -180
  const tori = toriStance(PIVOT, D, {
    label: 'zanshin 取り',
    handAhead: 0.5,
    handY: 1.0,
    lean: 8,
    lookAt: [-3, 1.25, 0.4],
    faceAt: [-3, 1.45, 0.4],
  })
  const uke = ukeHolding(tori, {
    hip: [-0.04, STAND_HIP - 0.04, 0.06],
    yaw: 190,
    lean: 8,
    lf: [-0.27, Y, 0.14],
    rf: [0.3, Y, -0.08],
    label: 'zanshin 受け',
    lookAt: [-2, 1.2, 0.3],
  })
  return { id: 'zanshin', at: 1.0, contacts: [GRAB], tori, uke }
})()

export { GRAB, grab, toriStance, ukeHolding }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writePose3D('tenkan', [kamae, contact, fumikomi, mawaru, tenkan, zanshin], {
    note: '記述からの推定（動画なし）。逆半身片手取り。前足を軸に左回りに約180°回る。回る向きと足運びの細部を師範に確認する',
  })
}
