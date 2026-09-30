// 前受身（基礎動作・逆半身片手取り）の 3D ポーズ初版（推定）。node tools/pose3d-seed/ukemi-mae.mjs [--force]
//
// 原稿 content/kihon/ukemi-mae.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え・接触：転換（= 四方投げ（表））と同じ。受けは前の手（左）で取りの前の手首（右）を掴む
// - 間（0.27・0.34）：取りは転換と同じく、前足を受けの前足の外側へ半歩進めて軸にし、受けから離れる側へ後ろ足を回す
// - 導き：取りは回り終えて -x を向き、掴まれた手を前下へ伸ばす。受けは手を離し、前足（左）を大きく踏み出して、
//         前の腕（左）を丸く前下へ差し出す
// - 間（0.52）：受けは前の腕の小指側を畳に着け、顎を引いて頭を外へ逃がし、腰を高く保つ
// - 回る：丸めた背中で斜めに転がる途中（肩は +x 側、腰は -x 側。脚は曲げたまま頭の上を越えていく）
// - 間（0.8）：転がり終えて座り、右足を前に着き、左の膝を畳に着ける
// - 間（0.9）：左の膝を着いたまま腰を上げ、取りの方へ向きを変えていく
// - 起き上がる：立ち上がって取りの方へ向き直り、半身に構える。取りは回った位置で受けを見届ける
import { add, figure, fwd, mul, norm, resetWarnings, STAND_HIP, UP, warnings, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as tk from './tenkan.mjs'

resetWarnings()
const { Y, headOf } = omote
const { GRAB, PIVOT, toriStance, ukeHolding } = tk

const kamae = tk.kamae
const contact = { ...tk.contact, at: 0.2 }

// ---- 間（0.27）：前足を受けの前足の外側へ半歩進めて軸にする（転換と同じ） ----
const fumikomi = (() => {
  const u = contact.uke.joints
  const tori = toriStance(PIVOT, -10, { label: 'fumikomi 取り', back: [0.5, 0.22], faceAt: u.head, lookAt: u.head })
  const uke = ukeHolding(tori, { hip: [0.24, STAND_HIP - 0.05, 0.03], lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'fumikomi 受け' })
  return { id: 'fumikomi', at: 0.27, between: true, contacts: [GRAB], tori, uke }
})()

// ---- 間（0.34）：後ろ足を受けから離れる側へ回す途中（転換と同じ） ----
const toriMawaru = (() => {
  const tori = toriStance(PIVOT, -100, {
    label: 'tori-mawaru 取り',
    back: [0.42, 0.12],
    backToeUp: 0.05,
    lean: 6,
    handAhead: 0.36,
    faceAt: [0.25, 1.4, -0.3],
    lookAt: [0.3, 1.3, -0.6],
  })
  const uke = ukeHolding(tori, { hip: [0.2, STAND_HIP - 0.06, 0.05], yaw: 198, lean: 10, lf: [-0.04, Y, 0.12], rf: [0.56, Y, -0.1], label: 'tori-mawaru 受け' })
  return { id: 'tori-mawaru', at: 0.34, between: true, contacts: [GRAB], tori, uke }
})()

// 取り：回り終えて -x を向いた半身で、受けを見届ける
const toriTurned = (label, lookAt) => toriStance(PIVOT, -180, { label, handAhead: 0.34, handY: 0.95, lean: 6, faceAt: lookAt, lookAt })

// ---- 導き（0.4）：取りは掴まれた手を前下へ伸ばす。受けは手を離し、前足を大きく踏み出して前の腕を丸く差し出す ----
const michibiki = (() => {
  const tori = toriStance(PIVOT, -180, {
    label: 'michibiki 取り',
    handAhead: 0.4,
    handY: 0.9,
    lean: 16,
    faceAt: [-0.9, 0.9, 0.2],
    lookAt: [-0.9, 0.6, 0.2],
  })
  const uke = figure(
    {
      hip: [-0.12, 0.82, 0.04],
      yaw: 185,
      chestYaw: 190,
      lean: 42,
      head: { pitch: -30, yaw: 20 },
      legs: {
        l: { ankle: [-0.46, Y, 0.12], toe: 180 },
        r: { ankle: [0.3, Y, -0.1], toe: 215 },
      },
      // 前の腕（左）は肘を軽く曲げて輪のように前下へ。後ろの手も前へ
      arms: {
        l: { hand: [-0.72, 0.68, 0.14], dir: norm([-0.3, -0.6, -0.7]), pole: norm([0, 0.6, 1]) },
        r: { hand: [-0.5, 0.52, -0.08], soft: true },
      },
    },
    'michibiki 受け',
  )
  return { id: 'michibiki', at: 0.4, tori, uke }
})()

// ---- 間（0.52）：前の腕の小指側を畳に着け、顎を引いて頭を外へ逃がし、腰を高く保つ ----
const hairu = (() => {
  const body = {
      hip: [-0.5, 0.66, 0.04],
      yaw: 185,
      chestYaw: 195,
      lean: 100,
      head: { pitch: -35, yaw: 35 },
      legs: {
        l: { ankle: [-0.62, Y, 0.14], toe: 180, pole: norm([-1, 0.3, 0.2]) },
        r: { ankle: [-0.02, Y + 0.04, -0.08], toe: 200, toeUp: 0.06 },
      },
  }
  const n = warnings.length
  const pre = figure({ ...body, arms: { l: { hand: [0, 0.3, 0], soft: true }, r: { hand: [0, 0.3, 0], soft: true } } }, '')
  warnings.length = n
  const sh = pre.joints.shoulder_l
  // 前の腕（左）の小指側を、肩の斜め前下の畳に着ける
  const uke = figure(
    {
      ...body,
      arms: {
        l: { hand: [sh[0] - 0.15, 0.07, sh[2] + 0.08], dir: norm([-1, 0, 0.3]), pole: norm([0.2, 1, 0.8]) },
        r: { hand: [sh[0] - 0.05, 0.14, sh[2] - 0.3], soft: true },
      },
    },
    'hairu 受け',
  )
  return { id: 'hairu', at: 0.52, between: true, tori: toriTurned('hairu 取り', headOf(uke)), uke }
})()

// ---- 回る（0.65）：丸めた背中で斜めに転がる途中。肩は +x 側、腰は -x 側、脚は曲げたまま頭の上を越えていく ----
const mawaru = (() => {
  const f = fwd(10) // 腰から肩への向き（前の肩から反対側の腰への斜め）
  const spine = norm(add(mul(f, 0.96), [0, 0.26, 0]))
  const hip = [-1.28, 0.26, 0.02]
  const n = warnings.length
  const lift = (side) => ({
    ankle: add(add(hip, mul(f, -0.22)), [0, 0.48, side === 'l' ? 0.12 : -0.1]),
    toe: 190,
    pole: norm(add(mul(f, 0.2), UP)),
  })
  const body = {
    hip,
    yaw: 10,
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
      arms: {
        l: { hand: add(pre.joints.shoulder_l, [-0.2, -0.1, 0.25]), soft: true },
        r: { hand: add(pre.joints.knee_r, [0.08, -0.04, -0.1]), soft: true },
      },
    },
    'mawaru 受け',
  )
  return { id: 'mawaru', at: 0.65, tori: toriTurned('mawaru 取り', headOf(uke)), uke }
})()

// ---- 間（0.8）：転がり終えて座る。右足を前に着き、左の膝を畳に着ける（-x を向いたまま） ----
const suwaru = (() => {
  const uke = figure(
    {
      hip: [-1.55, 0.2, 0.04],
      yaw: 180,
      lean: 18,
      head: { pitch: -6 },
      legs: {
        r: { ankle: [-1.9, Y, -0.08], toe: 180, pole: norm([-0.3, 1, 0]) },
        l: { kneel: [-1.95, 0.16], back: [1, 0, 0.1] },
      },
      arms: { r: { hand: [-1.9, 0.6, -0.16], soft: true }, l: { hand: [-1.86, 0.58, 0.22], soft: true } },
    },
    'suwaru 受け',
  )
  return { id: 'suwaru', at: 0.8, between: true, tori: toriTurned('suwaru 取り', headOf(uke)), uke }
})()

// ---- 間（0.9）：左の膝を着いたまま腰を上げ、取りの方（+x）へ向きを変えていく（+z 側を通って回る） ----
const mukinaoru = (() => {
  const uke = figure(
    {
      hip: [-1.62, 0.5, 0.1],
      yaw: 95,
      lean: 10,
      faceAt: [0.2, 1.5, 0.5],
      lookAt: [0.2, 1.5, 0.5],
      legs: {
        r: { ankle: [-1.58, Y, 0.45], toe: 100 },
        l: { kneel: [-1.62, 0.3], tucked: true, back: [0, 0, -1] },
      },
      arms: { r: { hand: [-1.5, 0.75, 0.34], soft: true }, l: { hand: [-1.72, 0.8, 0.3], soft: true } },
    },
    'mukinaoru 受け',
  )
  return { id: 'mukinaoru', at: 0.9, between: true, tori: toriTurned('mukinaoru 取り', headOf(uke)), uke }
})()

// ---- 起き上がる（1.0）：立ち上がって取りの方へ向き直り、右半身に構える ----
const okiru = (() => {
  const toward = 12 // 取りの方
  const uke = figure(
    {
      hip: [-1.66, STAND_HIP - 0.04, 0.12],
      yaw: toward - 28,
      chestYaw: toward - 20,
      lean: 3,
      faceAt: [0.25, 1.62, 0.5],
      lookAt: [0.25, 1.62, 0.5],
      legs: { r: { ankle: add([-1.66, Y, 0.12], add(mul(fwd(toward), 0.32), [0, 0, 0.07])), toe: toward }, l: { ankle: add([-1.66, Y, 0.12], add(mul(fwd(toward), -0.28), [0, 0, -0.2])), toe: toward - 75 } },
      arms: { r: { hand: add([-1.66, 1.12, 0.12], mul(fwd(toward), 0.52)) }, l: { hand: add([-1.66, 1.0, 0.04], mul(fwd(toward), 0.24)) } },
    },
    'okiru 受け',
  )
  return { id: 'okiru', at: 1.0, tori: toriTurned('okiru 取り', headOf(uke)), uke }
})()

writePose3D('ukemi-mae', [kamae, contact, fumikomi, toriMawaru, michibiki, hairu, mawaru, suwaru, mukinaoru, okiru], {
  note: '記述からの推定（動画なし）。片手取りから取りが転換して前へ導き、受けは前の腕から畳に着いて斜めに転がり、起き上がって向き直る。転がる向きと起き上がり方を師範に確認する',
})
