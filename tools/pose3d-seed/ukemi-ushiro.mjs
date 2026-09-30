// 後ろ受身（基礎動作）の 3D ポーズ初版（推定）。node tools/pose3d-seed/ukemi-ushiro.mjs [--force]
//
// 原稿 content/kihon/ukemi-ushiro.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え：相半身（一教（表）の構えを、取りが一歩で受けの胸元に手が届く間合いまで詰めた形）
// - 接触：取りは前足を半歩進め、前の手の手刀を受けの胸元へ軽く当てる。受けは顎を引き、上体をわずかに後ろへ預ける
// - 沈む：受けは後ろ足を半歩引き、その踵の近くへ腰を下ろす。背中を丸めて両腕を前へ。取りは手を離して半身へ戻る
// - 間（0.52）：受けは尻を畳に着け、背中を丸めて後ろへ傾く
// - 転がる：丸めた背中で後ろへ転がる（頭は +x）。顎を引いて頭を畳から浮かせ、膝を胸へ引き寄せる
// - 間（0.82）：転がった勢いで前へ戻り、足を体の下へ運ぶ
// - 起き上がる：片膝を畳に着いて起き上がり（片膝立ち）、取りへ向き直る
import { add, figure, fwd, mul, norm, resetWarnings, rightOf, STAND_HIP, turnFigure, UP, warnings, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'

resetWarnings()
const { Y, headOf } = omote

/** 床の上で平行に動かす */
const shift = (fig, dx) => turnFigure(fig, 0, [0, 0], [dx, 0])

// ---- 構え（0.0）：相半身。取りが一歩で受けの胸元に届く間合い ----
const kamae = { id: 'kamae', at: 0, tori: shift(omote.kamae.tori, 0.39), uke: shift(omote.kamae.uke, -0.34) }

// ---- 接触（0.2）：取りは前足を半歩進め、手刀を受けの胸元へ軽く当てる ----
const contact = (() => {
  const uke = figure(
    {
      hip: [0.52, STAND_HIP - 0.01, 0.0],
      yaw: 152,
      chestYaw: 160,
      lean: -6,
      head: { pitch: -12 },
      legs: { r: { ankle: [0.24, Y, -0.07], toe: 180 }, l: { ankle: [0.76, Y, 0.13], toe: 105 } },
      arms: { r: { hand: [0.24, 1.02, -0.14], soft: true }, l: { hand: [0.36, 0.96, 0.12], soft: true } },
    },
    'contact 受け',
  )
  // 受けの胸元（首の少し下、胸の前の面）
  const chest = add(add(uke.joints.neck, [0, -0.16, 0]), mul(fwd(160), 0.21))
  const tori = figure(
    {
      hip: [-0.22, STAND_HIP - 0.03, 0.02],
      yaw: -20,
      chestYaw: -10,
      lean: 8,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: [0.09, Y, 0.07], toe: 0 }, l: { ankle: [-0.55, Y, -0.12], toe: -70 } },
      arms: { r: { hand: chest, dir: norm([1, 0.15, 0]) }, l: { hand: [-0.1, 0.98, -0.12], soft: true } },
    },
    'contact 取り',
  )
  return { id: 'contact', at: 0.2, tori, uke }
})()

// 取りは手を離して半身へ戻る（構えより少し前）
const toriHanmi = (lookAt) =>
  figure(
    {
      hip: [-0.3, STAND_HIP - 0.02, 0.0],
      yaw: -28,
      chestYaw: -20,
      lean: 4,
      faceAt: lookAt,
      lookAt,
      legs: { r: { ankle: [0.02, Y, 0.07], toe: 0 }, l: { ankle: [-0.58, Y, -0.13], toe: -75 } },
      arms: { r: { hand: [0.02, 1.08, 0.06] }, l: { hand: [-0.26, 0.98, -0.08], soft: true } },
    },
    'hanmi 取り',
  )

// ---- 沈む（0.4）：後ろ足を半歩引いて、その踵の近くへ腰を下ろす。背中を丸め、両腕を前へ ----
const shizumu = (() => {
  const uke = figure(
    {
      hip: [0.86, 0.36, 0.06],
      yaw: 172,
      lean: 22,
      head: { pitch: -24 },
      legs: {
        r: { ankle: [0.42, Y, -0.06], toe: 180, pole: norm([-1, 0.6, -0.1]) },
        // 後ろ足の踵は尻の真下より少し前（膝を前上へ向けてしゃがむ）
        l: { ankle: [0.76, Y + 0.02, 0.15], toe: 170, toeUp: 0.06, pole: norm([-1, 0.7, 0.1]) },
      },
      arms: { r: { hand: [0.4, 0.72, -0.14], soft: true }, l: { hand: [0.42, 0.72, 0.2], soft: true } },
    },
    'shizumu 受け',
  )
  return { id: 'shizumu', at: 0.4, tori: toriHanmi(headOf(uke)), uke }
})()

// ---- 間（0.52）：尻を畳に着け、背中を丸めて後ろへ傾く ----
const suwaru = (() => {
  const uke = figure(
    {
      hip: [1.0, 0.15, 0.06],
      yaw: 180,
      lean: -40,
      pelvisTilt: -40,
      head: { pitch: -30 },
      legs: {
        r: { ankle: [0.62, Y, -0.08], toe: 180, pole: norm([-0.4, 1, 0]) },
        l: { ankle: [0.66, Y, 0.18], toe: 180, pole: norm([-0.4, 1, 0]) },
      },
      arms: { r: { hand: [0.62, 0.5, -0.16], soft: true }, l: { hand: [0.64, 0.5, 0.24], soft: true } },
    },
    'suwaru 受け',
  )
  return { id: 'suwaru', at: 0.52, between: true, tori: toriHanmi(headOf(uke)), uke }
})()

// ---- 転がる（0.65）：丸めた背中で後ろへ転がる。頭は +x、顎を引いて頭を浮かせ、膝を胸へ ----
const korogaru = (() => {
  const f = fwd(0) // 頭の向き
  const spine = norm(add(mul(f, 0.97), [0, 0.2, 0]))
  const hip = [1.12, 0.22, 0.06]
  const n = warnings.length
  const lift = (side) => ({
    ankle: add(add(hip, mul(f, -0.1)), [0, 0.48, side === 'l' ? 0.13 : -0.11]),
    toe: 180,
    pole: norm(add(mul(f, 0.4), UP)),
  })
  const body = {
    hip,
    yaw: 0,
    spine,
    front: UP,
    pelvisUp: norm(add(mul(f, 0.7), [0, 0.7, 0])),
    pelvisFront: norm(add(mul(f, -0.7), [0, 0.7, 0])),
    legs: { l: lift('l'), r: lift('r') },
  }
  const pre = figure({ ...body, arms: { l: { hand: [0, 0.3, 0], soft: true }, r: { hand: [0, 0.3, 0], soft: true } } }, '')
  warnings.length = n
  const uke = figure(
    {
      ...body,
      faceAt: pre.joints.hara,
      lookAt: pre.joints.hara,
      // 両腕は膝の方へ前へ（畳を後ろへ突かない）
      arms: {
        r: { hand: add(pre.joints.knee_r, [0.05, -0.02, -0.12]), soft: true },
        l: { hand: add(pre.joints.knee_l, [0.05, -0.02, 0.12]), soft: true },
      },
    },
    'korogaru 受け',
  )
  return { id: 'korogaru', at: 0.65, tori: toriHanmi(headOf(uke)), uke }
})()

// ---- 間（0.82）：転がった勢いで前へ戻り、足を体の下へ運ぶ ----
const modoru = (() => {
  const uke = figure(
    {
      hip: [1.0, 0.2, 0.06],
      yaw: 180,
      lean: 18,
      head: { pitch: -6 },
      legs: {
        // 右足は前に着き膝を立てる。左足は畳に膝を着く準備で体の下へ
        r: { ankle: [0.66, Y, -0.08], toe: 180, pole: norm([-0.3, 1, 0]) },
        l: { kneel: [0.6, 0.16], back: [1, 0, 0.1] },
      },
      arms: { r: { hand: [0.62, 0.62, -0.18], soft: true }, l: { hand: [0.66, 0.6, 0.24], soft: true } },
    },
    'modoru 受け',
  )
  return { id: 'modoru', at: 0.82, between: true, tori: toriHanmi(headOf(uke)), uke }
})()

// ---- 間（0.91）：左の膝を畳に着けたまま腰を上げていく ----
const tatsu = (() => {
  const uke = figure(
    {
      hip: [0.99, 0.36, 0.06],
      yaw: 182,
      lean: 12,
      head: { pitch: 0 },
      legs: {
        r: { ankle: [0.64, Y, -0.08], toe: 182, pole: norm([-0.3, 1, 0]) },
        l: { kneel: [0.63, 0.16], tucked: true, back: [1, 0, 0] },
      },
      arms: { r: { hand: [0.66, 0.62, -0.12], soft: true }, l: { hand: [0.7, 0.66, 0.22], soft: true } },
    },
    'tatsu 受け',
  )
  return { id: 'tatsu', at: 0.91, between: true, tori: toriHanmi(headOf(uke)), uke }
})()

// ---- 起き上がる（1.0）：左の膝を畳に着き、右足を前に立てた片膝立ちで、取りへ向き直る ----
const okiru = (() => {
  const uke = figure(
    {
      hip: [0.98, 0.52, 0.06],
      yaw: 185,
      lean: 6,
      faceAt: [-0.3, 1.5, 0],
      lookAt: [-0.3, 1.5, 0],
      legs: {
        r: { ankle: [0.62, Y, -0.08], toe: 185 },
        l: { kneel: [0.94, 0.16], tucked: true, back: [1, 0, 0] },
      },
      arms: { r: { hand: add([0.62, 0.66, -0.08], mul(rightOf(185), 0.02)), soft: true }, l: { hand: [0.72, 0.8, 0.2], soft: true } },
    },
    'okiru 受け',
  )
  return { id: 'okiru', at: 1.0, tori: toriHanmi(headOf(uke)), uke }
})()

writePose3D('ukemi-ushiro', [kamae, contact, shizumu, suwaru, korogaru, modoru, tatsu, okiru], {
  note: '記述からの推定（動画なし）。取りが胸元へ手刀を当てて後ろへ導き、受けは腰を下ろして丸めた背中で転がり、片膝立ちで起き上がる。腰の下ろし方と起き上がり方を師範に確認する',
})
