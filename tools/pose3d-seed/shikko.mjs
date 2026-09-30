// 膝行（基礎動作）の 3D ポーズ初版（推定）。node tools/pose3d-seed/shikko.mjs [--force]
//
// 原稿 content/kihon/shikko.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 受け：座技呼吸法の構えと同じ正座で、最初から最後まで取りを見ている
// - 正座：取りは受けから少し遠め（膝行で二歩進めば手が届く所）に正座し、両手を太ももの上に置く
// - 跪座：つま先を立て、踵の上に腰を保つ
// - 一歩目：左の膝を軸に腰を左へ回し、右の膝を半歩（約 30cm）前へ運ぶ。足は尻の下にたたんだまま、腰は低く保つ
// - 二歩目：右の膝を軸に腰を右へ回し、左の膝を前へ運ぶ
// - 止まる：右の膝を左の膝の横へ運んでそろえ、跪座で止まる（座技呼吸法の構えの間合い）
// 膝は床に着いたまま運ぶので、腰の高さで股関節から膝までの水平の距離が決まる。構え（跪座）は両膝の位置から腰を逆算し（solveHip）、
// 歩く間は腰を左右の真ん中付近に保つ（腰を膝の位置に合わせて横へ振ると、尻の下の足が大きく振られるため）。軸の膝は少しずれる
import { add, BODY, figure, fwd, mul, norm, resetWarnings, rightOf, seiza, writePose3D } from './lib.mjs'
import * as suwa from './suwariwaza-kokyuho.mjs'

resetWarnings()
const L = BODY.bones
const { seated, onThigh } = suwa
const uke = suwa.kamae.uke
const ukeHead = uke.joints.head
const lookAt = add(ukeHead, [0, -0.2, 0])

/** 両手を太ももの上に置く */
const handsOnThighs = (b) => ({ l: onThigh(b, 'l', 0.3), r: onThigh(b, 'r', 0.3) })

/**
 * 両膝を床の点 kr・kl（[x, z]）に着けるときの腰の位置。腰の高さ hipY と向き yaw から、
 * 股関節（腰から左右へ 0.09）と膝の水平の距離が太ももの長さで決まるので、2つの円の交点（膝より後ろ）を求める
 */
function solveHip(kr, kl, yaw, hipY) {
  const hjY = hipY - 0.07
  const h = Math.sqrt(L.thigh * L.thigh - (hjY - 0.06) ** 2)
  const r = rightOf(yaw)
  const c1 = [kr[0] - r[0] * 0.09, kr[1] - r[2] * 0.09]
  const c2 = [kl[0] + r[0] * 0.09, kl[1] + r[2] * 0.09]
  const dx = c2[0] - c1[0]
  const dz = c2[1] - c1[1]
  const d = Math.hypot(dx, dz)
  const off = Math.sqrt(Math.max(0, h * h - (d / 2) ** 2))
  const mid = [c1[0] + dx / 2, c1[1] + dz / 2]
  const n = [-dz / d, dx / d]
  const p1 = [mid[0] + n[0] * off, mid[1] + n[1] * off]
  const p2 = [mid[0] - n[0] * off, mid[1] - n[1] * off]
  const p = p1[0] < p2[0] ? p1 : p2
  return [p[0], hipY, p[1]]
}

/**
 * 跪座の形で両膝を kr・kl に着けた姿勢。front（'r' | 'l'）の足はすねを少し外へ逃がす（両足が尻の下で重ならないように）
 */
function kneeling(label, { kr, kl, yaw, hipY = 0.44, front, hands = 'thigh', hip: hipGiven }) {
  // 腰の位置を渡されたときはそれを使う（膝は kneel の向きに、太ももの長さで決まる所に着く）
  const hip = hipGiven ?? solveHip(kr, kl, yaw, hipY)
  const r = rightOf(yaw)
  const backOf = (side) => (side === front ? norm(add(mul(fwd(yaw), -1), mul(r, side === 'r' ? 0.15 : -0.15))) : null)
  const leg = (side, k) => ({ kneel: k, tucked: true, ...(backOf(side) ? { back: backOf(side) } : {}) })
  const make = (arms) =>
    figure({ hip, yaw, chestYaw: yaw * 0.5, lean: 4, lookAt, legs: { r: leg('r', kr), l: leg('l', kl) }, arms }, label)
  return seated(make, (b) =>
    hands === 'thigh'
      ? handsOnThighs(b)
      : {
          r: { hand: add(add(b.joints.hip, mul(r, 0.24)), [0.1, 0.02, 0]), soft: true, dir: norm([1, -0.6, 0]) },
          l: { hand: add(add(b.joints.hip, mul(r, -0.24)), [0.1, 0.02, 0]), soft: true, dir: norm([1, -0.6, 0]) },
        },
  )
}

// 膝の位置（[x, z]）。受けの膝の中心は x = 0.15
const K0 = { r: [-0.66, 0.15], l: [-0.66, -0.15] } // 跪座
const K1 = { r: [-0.36, 0.12], l: K0.l } // 一歩目：右の膝を前へ（左の膝が軸）
const K2 = { r: [-0.44, 0.1], l: [-0.1, -0.12] } // 二歩目：左の膝を前へ（右の膝が軸）
const K3 = { r: [-0.1, 0.15], l: K2.l } // 止まる：右の膝を左の膝の横へ

// ---- 正座（0.0）：受けから少し遠めに正座 ----
const seizaKf = (() => {
  const tori = seated(
    (arms) => seiza({ center: [-0.66, 0], yaw: 0, lean: 6, spread: 0.3, head: { pitch: -4 }, lookAt, arms }, 'seiza 取り'),
    handsOnThighs,
  )
  return { id: 'seiza', at: 0, tori, uke }
})()

// ---- 跪座（0.2）：つま先を立てて踵の上に腰 ----
const kizaKf = { id: 'kiza', at: 0.2, tori: kneeling('kiza 取り', { kr: K0.r, kl: K0.l, yaw: 0, hipY: 0.42, hands: 'thigh' }), uke }

// ---- 一歩目（0.5）：左の膝を軸に腰を左へ回し、右の膝を半歩前へ ----
const ippo = { id: 'ippo', at: 0.5, tori: kneeling('ippo 取り', { kr: K1.r, kl: K1.l, yaw: -30, front: 'r', hip: [-0.8, 0.44, 0.03] }), uke }

// ---- 二歩目（0.8）：右の膝を軸に腰を右へ回し、左の膝を前へ ----
const nippo = { id: 'nippo', at: 0.8, tori: kneeling('nippo 取り', { kr: K2.r, kl: K2.l, yaw: 30, front: 'l', hip: [-0.5, 0.44, -0.03] }), uke }

// ---- 止まる（1.0）：右の膝を左の膝の横へ運んでそろえ、跪座で止まる ----
const tomaru = { id: 'tomaru', at: 1.0, tori: kneeling('tomaru 取り', { kr: K3.r, kl: K3.l, yaw: 0, hipY: 0.42, hands: 'thigh' }), uke }

writePose3D('shikko', [seizaKf, kizaKf, ippo, nippo, tomaru], {
  note: '記述からの推定（動画なし）。正座で待つ受けへ、取りが跪座から片膝ずつ二歩で間合いを詰める。膝の運び方（歩幅・腰の回し方）を師範に確認する',
})
