// 座技呼吸法・両手取り の 3D ポーズ初版（推定）。node tools/pose3d-seed/suwariwaza-kokyuho.mjs [--force]
//
// 原稿 content/techniques/suwariwaza-kokyuho.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え：正座で向き合う（取りは -x 側で +x を向く、受けは +x 側で -x を向く）。自分の両膝の間は拳二つ、相手の膝との間は拳一つ〜二つ。
//         取りは両手を太ももの上に置く
// - 接触：受けは膝を少し進め、上体を前へ倒して取りの両手首を上から掴む（受けの左手→取りの右手首、右手→左手首）
// - 上げ：取りは腰を少し前へ出し、指先を上に向けた手刀を受けの肩の方へ上げる。受けは膝を畳に着けたまま腰が踵から浮き、上へ伸びる
// - 間（0.5）：取りはつま先を立てて腰を上げ、右膝を外へ回しながら進め始める。受けは膝を中心に腰が後ろ下へ沈み始める
// - 崩し：取りはつま先を立てて跪座になり、右膝を受けの左膝の外側（+z）へ進め、腰を回して両手の手刀を受けの左斜め後ろへ伸ばす
//         （崩す向きの左右は推定。右手の側を深く送る）。受けは顎を引き背中を丸めて、足を尻の下から抜きながら斜め後ろへ倒れていく
// - 間（0.72）：受けは背中を畳に着けて転がる途中。取りは膝行で受けの体側へ寄り始める
// - 抑え：受けは仰向け（頭は受けの左斜め後ろ）。取りは跪座で受けの左の体側に寄り、膝を脇腹と肩の近くに置いて、
//         受けに掴まれたままの手刀で受けの両腕を胸の上へ抑える
// - 残心：抑えを保ったまま、取りは背筋を伸ばして目線を上げる
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, BODY, figure, fwd, kiza, lerp, mul, norm, rightOf, seiza, sub, supine, UP, warnings, writePose3D } from './lib.mjs'

const L = BODY.bones

/** 受けの両手が取りの両手首を掴む（向き合っているので受けの左手が取りの右手首） */
const GRAB = [
  { hand: 'uke.hand_l', on: 'tori.wrist_r' },
  { hand: 'uke.hand_r', on: 'tori.wrist_l' },
]
/** 手首を上から掴む手の位置と向き（掌を手首の上にかぶせ、指先は下へ回る） */
const grasp = (tori, side, toward) => ({
  hand: add(tori.joints[`wrist_${side}`], [0, 0.055, 0]),
  dir: norm(add(mul(toward, 0.35), [0, -1, 0])),
})
/** 自分の帯（丹田）：受けが顎を引いて見る所 */
const obiOf = (fig) => fig.joints.hara

/** 座った姿勢で、脚の形を決めてから手の置き場所を決める（太ももの上など） */
function seated(make, handsAt) {
  const n = warnings.length
  const base = make({ l: { hand: [0, 0.3, 0], soft: true }, r: { hand: [0, 0.3, 0], soft: true } })
  warnings.length = n
  return make(handsAt(base))
}
/** 太ももの上に手を置く：手首は股関節から膝への t の所、指先は膝の方へ */
const onThigh = (fig, side, t = 0.4) => {
  const hj = fig.joints[`hipjoint_${side}`]
  const knee = fig.joints[`knee_${side}`]
  const dir = norm(sub(knee, hj))
  const wrist = add(lerp(hj, knee, t), [0, 0.12, 0])
  return { hand: add(wrist, mul(dir, L.hand)), dir }
}

// 両者の膝の中心：相手の膝との間に拳一つ〜二つ
const TORI_C = [-0.15, 0]
const UKE_C = [0.15, 0]
const UKE_C2 = [0.07, 0] // 接触で膝を少し進めた所

// ---- 構え（0.0）：正座で向き合い、取りは両手を太ももの上に置く ----
export const kamae = (() => {
  const uke = seated(
    (arms) => seiza({ center: UKE_C, yaw: 180, lean: 6, spread: 0.3, head: { pitch: -4 }, arms }, 'kamae 受け'),
    (b) => ({ l: onThigh(b, 'l'), r: onThigh(b, 'r') }),
  )
  const tori = seated(
    (arms) =>
      seiza({ center: TORI_C, yaw: 0, lean: 6, spread: 0.3, head: { pitch: -4 }, lookAt: add(uke.joints.neck, [0, -0.12, 0]), arms }, 'kamae 取り'),
    (b) => ({ l: onThigh(b, 'l'), r: onThigh(b, 'r') }),
  )
  return { id: 'kamae', at: 0, tori, uke }
})()

// ---- 接触（0.15）：受けは膝を少し進め、上体を前へ倒して取りの両手首を上から掴み、重さを乗せる ----
export const contact = (() => {
  const tori = seated(
    (arms) =>
      seiza({ center: TORI_C, yaw: 0, lean: 10, spread: 0.3, head: { pitch: 0 }, lookAt: [0.1, 0.62, 0], arms }, 'contact 取り'),
    (b) => ({ l: onThigh(b, 'l', 0.52), r: onThigh(b, 'r', 0.52) }),
  )
  const uke = seiza(
    {
      center: UKE_C2,
      yaw: 180,
      lean: 42,
      spread: 0.3,
      head: { pitch: 14 },
      lookAt: add(tori.joints.neck, [0, -0.15, 0]),
      arms: { l: grasp(tori, 'r', fwd(180)), r: grasp(tori, 'l', fwd(180)) },
    },
    'contact 受け',
  )
  return { id: 'contact', at: 0.15, contacts: GRAB, tori, uke }
})()

// ---- 上げ（0.4）：取りは腰を少し前へ出して手刀を受けの肩の方へ上げる。受けは腰が踵から浮いて上へ伸びる ----
export const age = (() => {
  const tori = seiza(
    {
      center: TORI_C,
      yaw: 0,
      back: 0.33,
      hipY: 0.35,
      lean: 10,
      spread: 0.3,
      head: { pitch: 6 },
      lookAt: [0.9, 1.0, 0],
      arms: {
        // 指先を上に向けた手刀。肘は体の近くに保つ
        r: { hand: [0.05, 0.86, 0.16], dir: norm([0.35, 1, 0]), pole: norm([0.2, -1, 0.6]) },
        l: { hand: [0.05, 0.86, -0.16], dir: norm([0.35, 1, 0]), pole: norm([0.2, -1, -0.6]) },
      },
    },
    'age 取り',
  )
  const uke = kiza(
    {
      center: UKE_C2,
      yaw: 180,
      back: 0.12,
      hipY: 0.53,
      lean: -6,
      spread: 0.3,
      tucked: false,
      head: { pitch: -8 },
      lookAt: add(tori.joints.neck, [0, -0.1, 0]),
      arms: { l: grasp(tori, 'r', fwd(180)), r: grasp(tori, 'l', fwd(180)) },
    },
    'age 受け',
  )
  return { id: 'age', at: 0.4, contacts: GRAB, tori, uke }
})()

// ---- 間（0.5）：取りはつま先を立てて腰を上げ、右膝を外へ回しながら進め始める。受けは膝を畳に着けたまま、腰が後ろ下へ沈み始める ----
export const susumu = (() => {
  const tori = figure(
    {
      hip: [-0.3, 0.44, 0.12],
      yaw: 10,
      chestYaw: 18,
      lean: 18,
      head: { pitch: 2 },
      lookAt: [0.9, 0.7, 0.3],
      legs: {
        r: { kneel: [-0.06, 0.44], tucked: true },
        l: { kneel: [-0.16, -0.14], tucked: true, back: [-1, 0, 0] },
      },
      arms: {
        r: { hand: [0.26, 0.82, 0.24], dir: norm([0.6, 0.8, 0.2]) },
        l: { hand: [0.24, 0.84, -0.06], dir: norm([0.6, 0.8, 0]) },
      },
    },
    'susumu 取り',
  )
  // 膝を中心に腰が円を描いて後ろ下へ（膝と股関節の間は太ももの長さのまま）
  const uke = figure(
    {
      hip: [0.39, 0.42, 0.08],
      yaw: 188,
      lean: -18,
      pelvisTilt: -12,
      head: { pitch: -12 },
      lookAt: [0.1, 0.4, 0.1],
      legs: {
        l: { kneel: [0.05, 0.17], back: [1, 0, 0.1] },
        r: { kneel: [0.07, -0.15], back: [1, 0, -0.15] },
      },
      arms: { l: grasp(tori, 'r', fwd(190)), r: grasp(tori, 'l', fwd(190)) },
    },
    'susumu 受け',
  )
  return { id: 'susumu', at: 0.5, between: true, contacts: GRAB, tori, uke }
})()

// 崩す向き：受けの左斜め後ろ（+x +z）
const FALL = 35

// 抑えの受けの位置：仰向けで頭は受けの左斜め後ろ
const U_HIP = [0.5, 0.16]
const U_HEAD = FALL
const uSpine = fwd(U_HEAD)
/** 仰向けの受けの左（体側の外）。仰向けでは rightOf(headYaw) が体の左になる */
const uLeft = rightOf(U_HEAD)

// ---- 崩し（0.6）：取りは跪座で右膝を受けの左膝の外側へ進め、腰を回して手刀を受けの斜め後ろへ伸ばす。受けは背中を丸めて倒れていく ----
export const kuzushi = (() => {
  // 受け：腰を踵の左横（倒れる側）へ落とし、背中を丸めて後ろへ倒れていく。膝はまだ畳の上、足は尻の下から右横へ抜ける
  const ukeBody = {
    hip: [0.52, 0.25, 0.2],
    yaw: 195,
    lean: -32,
    pelvisTilt: -30,
    legs: {
      l: { kneel: [0.06, 0.24], back: [0.7, 0, -0.7] },
      r: { kneel: [0.1, -0.08], back: [0.6, 0, -0.8] },
    },
  }
  // 腕を決める前に首と帯の位置を出す
  const n = warnings.length
  const pre = figure({ ...ukeBody, arms: { l: { hand: [0, 0.3, 0], soft: true }, r: { hand: [0, 0.3, 0], soft: true } } }, '')
  warnings.length = n
  const f = fwd(FALL)
  const tori = figure(
    {
      // つま先を立てて腰を踵から上げ、右膝を受けの左膝の外側へ進める
      hip: [-0.1, 0.5, 0.22],
      yaw: 20,
      chestYaw: 35,
      lean: 28,
      head: { pitch: -4 },
      lookAt: add([0.4, 0, 0.12], mul(f, 0.9)),
      legs: {
        r: { kneel: [0.25, 0.62], tucked: true },
        l: { kneel: [-0.2, -0.1], tucked: true, back: [-1, 0, -0.1] },
      },
      arms: {
        // 手刀を受けの斜め後ろへ伸ばす。右手（崩す側）をより深く
        r: { hand: add([0.42, 0.72, 0.34], mul(f, 0.09)), dir: norm(add(f, [0, 0.25, 0])) },
        l: { hand: add([0.38, 0.76, 0.06], mul(f, 0.09)), dir: norm(add(f, [0, 0.35, 0])) },
      },
    },
    'kuzushi 取り',
  )
  // 受けは取りの手首を掴んだまま、顎を引いて自分の帯を見る
  const uke = figure(
    {
      ...ukeBody,
      faceAt: obiOf(pre),
      lookAt: obiOf(pre),
      arms: { l: grasp(tori, 'r', mul(f, -1)), r: grasp(tori, 'l', mul(f, -1)) },
    },
    'kuzushi 受け',
  )
  return { id: 'kuzushi', at: 0.6, contacts: GRAB, tori, uke }
})()

// ---- 間（0.72）：受けは背中を丸めて畳に着け、膝を胸の方へ引き上げて転がる途中。取りは膝行で受けの左の体側へ回り始める ----
export const taoreru = (() => {
  const f = uSpine
  const spine = norm(add(mul(f, 0.93), [0, 0.37, 0]))
  const hip = [U_HIP[0] - 0.02, 0.15, U_HIP[1] - 0.02]
  const n = warnings.length
  const lift = (side) => ({ ankle: add(add(hip, mul(f, -0.4)), add(mul(uLeft, side === 'l' ? -0.12 : -0.34), [0, 0.22, 0])), toe: U_HEAD + 200, pole: norm(add(add(mul(f, 0.2), mul(uLeft, 0.3)), UP)) })
  const body = {
    hip,
    yaw: U_HEAD,
    spine,
    front: UP,
    pelvisUp: norm(add(mul(f, 0.75), [0, 0.66, 0])),
    pelvisFront: norm(add(mul(f, -0.66), [0, 0.75, 0])),
    legs: { l: lift('l'), r: lift('r') },
  }
  const pre = figure({ ...body, arms: { l: { hand: [0, 0.3, 0], soft: true }, r: { hand: [0, 0.3, 0], soft: true } } }, '')
  warnings.length = n
  const chest = add(pre.joints.hip, mul(spine, 0.36))
  const toriDir = norm(add(add(mul(uLeft, -0.6), mul(f, 0.5)), [0, -0.2, 0]))
  const tori = figure(
    {
      hip: [0.1, 0.5, 0.68],
      yaw: -15,
      chestYaw: -25,
      lean: 29,
      faceAt: pre.joints.head,
      lookAt: pre.joints.head,
      legs: {
        r: { kneel: [0.46, 0.76], tucked: true },
        l: { kneel: [0.12, 0.44], tucked: true, back: [-0.6, 0, 0.8] },
      },
      arms: {
        r: { hand: add(add(chest, add(mul(uLeft, 0.2), [0, 0.22, 0])), mul(f, -0.02)), dir: toriDir },
        l: { hand: add(add(chest, add(mul(uLeft, 0.12), [0, 0.22, 0])), mul(f, -0.04)), dir: toriDir },
      },
    },
    'taoreru 取り',
  )
  const uke = figure(
    {
      ...body,
      faceAt: pre.joints.hara,
      lookAt: pre.joints.hara,
      arms: { l: grasp(tori, 'r', uLeft), r: grasp(tori, 'l', uLeft) },
    },
    'taoreru 受け',
  )
  return { id: 'taoreru', at: 0.72, between: true, contacts: GRAB, tori, uke }
})()

// ---- 抑え（0.85）：受けは仰向け。取りは跪座で受けの左の体側に寄り、手刀で受けの両腕を胸の上へ抑える ----
function osaeFrame(id, at, { toriLean, head, lookUp, near = 0.08 }) {
  const chest = add([U_HIP[0], 0, U_HIP[1]], mul(uSpine, 0.34))
  const center = add(add([U_HIP[0], 0, U_HIP[1]], mul(uSpine, 0.32)), mul(uLeft, 0.22))
  const yaw = (Math.atan2(-uLeft[2], -uLeft[0]) * 180) / Math.PI
  // 取りの手首：受けの胸の上
  const wr = add(add(chest, add(mul(uSpine, 0.1), mul(uLeft, near))), [0, 0.38, 0])
  const wl = add(add(chest, add(mul(uSpine, -0.06), mul(uLeft, near))), [0, 0.38, 0])
  const toriDir = norm(add(mul(uLeft, -1), [0, -0.25, 0]))
  const tori = kiza(
    {
      center: [center[0], center[2]],
      yaw,
      spread: 0.46,
      back: 0.28,
      hipY: 0.45,
      lean: toriLean,
      ...(head ? { head } : {}),
      lookAt: lookUp,
      arms: {
        r: { hand: add(wr, mul(toriDir, L.hand)), dir: toriDir },
        l: { hand: add(wl, mul(toriDir, L.hand)), dir: toriDir },
      },
    },
    `${id} 取り`,
  )
  const uke = supine(
    {
      hip: U_HIP,
      headYaw: U_HEAD,
      arms: { l: grasp(tori, 'r', uLeft), r: grasp(tori, 'l', uLeft) },
      lookAt: tori.joints.head,
    },
    `${id} 受け`,
  )
  return { id, at, contacts: GRAB, tori, uke }
}

/** 仰向けの受けの顔のあたり */
const U_FACE = add(add([U_HIP[0], 0.2, U_HIP[1]], mul(uSpine, 0.72)), [0, 0, 0])
export const osae = osaeFrame('osae', 0.85, { toriLean: 30, lookUp: U_FACE })
// 残心：目線を上げ、受けを視野に残しつつ周りも見渡す
export const zanshin = osaeFrame('zanshin', 1.0, { toriLean: 28, near: 0.11, head: { pitch: 8 }, lookUp: add(U_FACE, add(mul(uSpine, 1.2), [0, 0.9, 0])) })

const keyframes = [kamae, contact, age, susumu, kuzushi, taoreru, osae, zanshin]

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writePose3D('suwariwaza-kokyuho', keyframes, {
    note: '記述からの推定（動画なし）。正座で向き合い両手取り。崩す向き（受けの左斜め後ろ）と抑えで取りが寄る側を師範に確認する',
  })
}
