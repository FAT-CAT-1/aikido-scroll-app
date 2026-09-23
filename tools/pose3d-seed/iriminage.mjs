// 入身投げ・正面打ち の 3D ポーズ初版（推定）。node tools/pose3d-seed/iriminage.mjs [--force]
//
// 原稿 content/techniques/iriminage.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え・振りかぶり：一教（表）と同じ（右の相半身）
// - 接触：受けは後ろ足（左）を踏み込んで正面を打つ（一教と同じ）。取りは前足（右）を受けの打ち手の外側（受けの右の側面）へ進め、
//         右の手刀を受けの打ち手に添えて下へ流す（一教（裏）の接触と同じ足）
// - 入身：取りは受けの側面から背後へ深く踏み込み（左足を受けの足の後ろ近くへ）、受けと同じ向きになる。左手を受けの首筋に添え、
//         右手で打ち手を下へ導き続ける。受けは前へ運ばれる
// - 転換：取りは受けの背後に踏み込んだ左足を軸に、右足を大きく円く回す。受けの頭を取りの左肩の近くへ導き、受けは前へ折れたまま
//         取りの外側を円く回る
// - 投げ：起き上がる受けの顔の前へ右腕を上げ、右足を受けの前へ深く踏み込んで斬り下ろす。受けは膝を曲げて沈み、後ろへ倒れる
// - 残心：受けは後ろ受身で転がり、腰を着いて取りの方を見る。取りは投げ終わりの姿勢で立つ
import { add, at, figure, fwd, lerp, mul, norm, resetWarnings, rightOf, STAND_HIP, sub, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'

resetWarnings()
const { Y, headOf, gripWrist } = omote

/** 右の手刀を受けの打ち手（手首）に添える */
const WRIST = { hand: 'tori.hand_r', on: 'uke.wrist_r' }
/** 左手を受けの首筋に添える */
const NECK = { hand: 'tori.hand_l', on: 'uke.neck' }
/** 受けの首の後ろ（首筋）：首から背中側へ少し */
const napeOf = (uke) => {
  const j = uke.joints
  const back = norm(sub(j.neck, j.nose))
  return add(j.neck, add(mul([back[0], 0, back[2]], 0.07), [0, 0.02, 0]))
}

// ---- 接触（0.15）：受けは一教と同じ。取りは前足（右）で受けの右の側面へ、右の手刀を打ち手に添える ----
const contact = (() => {
  const uke = omote.contact.uke
  const tori = figure(
    {
      hip: [-0.32, STAND_HIP - 0.05, -0.52],
      yaw: 60,
      chestYaw: 50,
      lean: 6,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: at(-0.1, -0.46, Y), toe: 60 }, l: { ankle: at(-0.58, -0.59, Y), toe: 0 } },
      arms: { r: { hand: gripWrist(uke, -0.045) }, l: { hand: [-0.1, 1.12, -0.3] } },
    },
    'contact 取り',
  )
  return { id: 'contact', at: 0.15, contacts: [WRIST], tori, uke }
})()

// ---- 間（0.25）：取りは受けの右横を、受けの方を向いて通りながら、左足を受けの背後へ運ぶ（受けの体の中を通らないように） ----
const yoko = (() => {
  const uke = figure(
    {
      hip: [0.38, STAND_HIP - 0.07, 0.03],
      yaw: 186,
      chestYaw: 186,
      lean: 18,
      head: { pitch: -5 },
      legs: { l: { ankle: at(0.16, 0.17, Y), toe: 185 }, r: { ankle: at(0.5, -0.09, Y), toe: 175 } },
      arms: { r: { hand: [0.2, 0.98, -0.3] }, l: { hand: [0.12, 1.05, 0.22] } },
    },
    'yoko 受け',
  )
  const tori = figure(
    {
      hip: [0.12, STAND_HIP - 0.08, -0.52],
      yaw: 118,
      chestYaw: 105,
      lean: 10,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: at(-0.1, -0.46, Y), toe: 90 }, l: { ankle: at(0.32, -0.56, 0.15), toe: 170, toeUp: 0.04 } },
      arms: { r: { hand: gripWrist(uke, 0.03) }, l: { hand: add(uke.joints.shoulder_r, [0.1, 0.02, -0.1]) } },
    },
    'yoko 取り',
  )
  return { id: 'yoko', at: 0.25, between: true, contacts: [WRIST], tori, uke }
})()

// ---- 入身（0.35）：取りは受けの背後へ深く入り、受けと同じ向きに。左手は首筋、右手は打ち手を下へ ----
const irimi = (() => {
  const uke = figure(
    {
      hip: [0.26, STAND_HIP - 0.1, 0.02],
      yaw: 186,
      chestYaw: 184,
      lean: 24,
      head: { pitch: -8 },
      legs: { l: { ankle: at(0.04, 0.17, Y), toe: 185 }, r: { ankle: at(0.44, -0.1, Y), toe: 175 } },
      // 打ち手（右）は取りに下へ、体の横から後ろへ導かれる。自由な手（左）は体の前
      arms: { r: { hand: [0.36, 0.84, -0.26] }, l: { hand: [0.02, 1.02, 0.22] } },
    },
    'irimi 受け',
  )
  const yaw = 196
  const tori = figure(
    {
      hip: [0.74, STAND_HIP - 0.12, -0.26],
      yaw,
      chestYaw: yaw - 6,
      lean: 12,
      faceAt: add(headOf(uke), mul(fwd(186), 0.6)),
      lookAt: add(headOf(uke), mul(fwd(186), 1.2)),
      // 左足を受けの右足の後ろ近くへ深く踏み込み（前足）、右足は後ろ
      legs: { l: { ankle: at(0.56, -0.02, Y), toe: 190 }, r: { ankle: at(1.02, -0.44, Y), toe: 230 } },
      arms: { r: { hand: gripWrist(uke, 0.03) }, l: { hand: napeOf(uke) } },
    },
    'irimi 取り',
  )
  return { id: 'irimi', at: 0.35, contacts: [WRIST, NECK], tori, uke }
})()

// ---- 転換（0.55）：左足を軸に右足を円く回す。受けの頭を左肩の近くへ導き、受けは前へ折れて取りの外側を回る ----
const PIVOT = [0.56, -0.02]
/**
 * 転換の間の姿勢：取りは左足（PIVOT）を軸に向き yaw まで回っている。受けは取りの左前で前へ折れ、頭を取りの左肩の近く
 * （頭同士の間は空ける）に導かれている。受けの打ち手（右手首）は、受けの右肩と取りの右肩の間の低い所で取りの右手が制する
 * @param {number} yaw 取りの向き
 * @param {number[]} rightFoot 取りの右足（回している足）の位置
 * @param {{ id: string, at: number, between?: boolean, toriLean?: number, ukeLean?: number, dist?: number }} o
 */
function turning(yaw, rightFoot, { id, at: atTime, between = false, toriLean = 22, ukeLean = 58, dist = 0.72 }) {
  const toriHip = [PIVOT[0] - 0.08, STAND_HIP - 0.2, PIVOT[1] + 0.04]
  const left = mul(rightOf(yaw), -1)
  const ukeHip = add(add([toriHip[0], 0.78, toriHip[2]], mul(fwd(yaw), 0.32)), mul(left, dist))
  const toShoulder = sub(add(toriHip, mul(left, 0.2)), ukeHip)
  const ukeYaw = (Math.atan2(toShoulder[2], toShoulder[0]) * 180) / Math.PI
  const uFwd = fwd(ukeYaw)
  const uRight = rightOf(ukeYaw)
  const ukeBase = {
    hip: ukeHip,
    yaw: ukeYaw + 20,
    chestYaw: ukeYaw,
    lean: ukeLean,
    head: { yaw: 20, pitch: 5 },
    legs: {
      l: { ankle: add(at(ukeHip[0], ukeHip[2], Y), add(mul(uFwd, -0.1), mul(uRight, -0.16))), toe: ukeYaw + 30 },
      r: { ankle: add(at(ukeHip[0], ukeHip[2], Y), add(mul(uFwd, -0.32), mul(uRight, 0.18))), toe: ukeYaw + 10 },
    },
  }
  const lHand = add(add([ukeHip[0], 0.55, ukeHip[2]], mul(uFwd, 0.38)), mul(uRight, -0.22))
  const ukeProbe = figure({ ...ukeBase, arms: { r: { hand: add(ukeHip, [0, 0.25, 0]) }, l: { hand: lHand } } }, `${id} 受け（仮）`)
  const toriBase = {
    hip: toriHip,
    yaw,
    chestYaw: yaw - 10,
    lean: toriLean,
    faceAt: add(toriHip, add(mul(fwd(yaw - 30), 1), [0, 0.3, 0])),
    lookAt: add(toriHip, add(mul(fwd(yaw - 30), 2), [0, -0.3, 0])),
    legs: { l: { ankle: at(PIVOT[0], PIVOT[1], Y), toe: yaw - 10 }, r: { ankle: rightFoot, toe: yaw + 50, ...(rightFoot[1] > Y + 0.02 ? { toeUp: 0.04 } : {}) } },
  }
  const toriProbe = figure({ ...toriBase, arms: { r: { hand: add(toriHip, [0, 0.1, 0]) }, l: { hand: napeOf(ukeProbe) } } }, `${id} 取り（仮）`)
  const wrist = add(lerp(ukeProbe.joints.shoulder_r, toriProbe.joints.shoulder_r, 0.5), [0, -0.38, 0])
  const uke = figure({ ...ukeBase, arms: { r: { hand: add(wrist, mul(norm(sub(wrist, ukeProbe.joints.shoulder_r)), 0.09)) }, l: { hand: lHand } } }, `${id} 受け`)
  const tori = figure({ ...toriBase, arms: { r: { hand: gripWrist(uke, 0.03) }, l: { hand: napeOf(uke) } } }, `${id} 取り`)
  return { id, at: atTime, ...(between ? { between: true } : {}), contacts: [WRIST, NECK], tori, uke }
}

// 回る途中（0.45）：取りは左回りに半分回って受けの方（+z）を向き、右足は軸足の後ろを円く回っている。受けは取りの前（+z 側）を回る
const mawaru = turning(110, add(at(PIVOT[0], PIVOT[1], 0.15), mul(fwd(110), -0.55)), { id: 'mawaru', at: 0.45, between: true, toriLean: 16, ukeLean: 46, dist: 0.84 })
// 転換（0.55）：左足を軸に右足を後ろへ円く回し終えた（約 170° 左へ）
const tenkan = turning(24, add(at(PIVOT[0], PIVOT[1], Y), add(mul(fwd(24), -0.62), mul(rightOf(24), 0.22))), { id: 'tenkan', at: 0.55, ukeLean: 52, dist: 0.88 })

// ---- 投げ（0.8）：右腕を受けの顔の前へ上げ、右足を受けの前へ深く踏み込む。受けは起き上がりかけて後ろへ倒れ始める ----
/** 投げる向き（取りの前進の向き・受けが倒れる向き） */
const D = -30
const nage = (() => {
  const T = [0.74, STAND_HIP - 0.11, -0.2]
  const f = fwd(D)
  const r = rightOf(D)
  // 受け：取りの右前。取りの方を向いたまま、膝を曲げて後ろへ反る
  const U = add(add([T[0], STAND_HIP - 0.17, T[2]], mul(f, 0.34)), mul(r, 0.38))
  const uYaw = D + 180 - 18
  const uf = fwd(uYaw)
  const ur = rightOf(uYaw)
  const onFloor = (p) => at(p[0], p[2], Y)
  const uke = figure(
    {
      hip: U,
      yaw: uYaw,
      chestYaw: uYaw - 6,
      lean: -14,
      head: { pitch: 10 },
      legs: {
        l: { ankle: onFloor(add(U, add(mul(uf, 0.1), mul(ur, -0.16)))), toe: uYaw - 20 },
        r: { ankle: onFloor(add(U, add(mul(uf, -0.16), mul(ur, 0.17)))), toe: uYaw + 15 },
      },
      arms: { r: { hand: add(add(U, [0, 0.22, 0]), add(mul(uf, 0.34), mul(ur, 0.16))) }, l: { hand: add(add(U, [0, 0.3, 0]), add(mul(uf, 0.36), mul(ur, -0.14))) } },
    },
    'nage 受け',
  )
  const face = add(add(uke.joints.nose, mul(uf, 0.05)), [0, -0.05, 0])
  const tori = figure(
    {
      hip: T,
      yaw: D,
      chestYaw: D + 10,
      lean: 10,
      faceAt: add(T, add(mul(f, 1), [0, 0.5, 0])),
      lookAt: add(T, add(mul(f, 2.2), [0, -0.9, 0])),
      // 右足を受けの前へ深く踏み込む（前足）。左足は転換の軸足の位置
      legs: { r: { ankle: onFloor(add(T, add(mul(f, 0.42), mul(r, 0.12)))), toe: D + 10 }, l: { ankle: at(PIVOT[0], PIVOT[1], Y), toe: D - 40 } },
      arms: { r: { hand: face, dir: norm(add(mul(r, 1), mul(f, 0.3))) }, l: { hand: napeOf(uke) } },
    },
    'nage 取り',
  )
  return { id: 'nage', at: 0.8, contacts: [NECK], tori, uke }
})()

// ---- 間（0.88）：受けは膝を深く曲げて腰を落とし、後ろへ転がり始める。取りは右腕を斬り下ろしながら前へ ----
const ochiru = (() => {
  const f = fwd(D)
  const r = rightOf(D)
  const T = add(nage.tori.joints.hip, add(mul(f, 0.14), [0, -0.04, 0]))
  const U = add([nage.uke.joints.hip[0], 0.46, nage.uke.joints.hip[2]], mul(f, 0.28))
  const uYaw = D + 180 - 10
  const uf = fwd(uYaw)
  const ur = rightOf(uYaw)
  const onFloor = (p) => at(p[0], p[2], Y)
  const uke = figure(
    {
      hip: U,
      yaw: uYaw,
      lean: -22,
      head: { pitch: -25 },
      legs: {
        l: { ankle: onFloor(add(U, add(mul(uf, 0.34), mul(ur, -0.15)))), toe: uYaw },
        r: { ankle: onFloor(add(U, add(mul(uf, 0.3), mul(ur, 0.16)))), toe: uYaw },
      },
      arms: { r: { hand: add(add(U, [0, 0.35, 0]), add(mul(uf, 0.4), mul(ur, 0.18))) }, l: { hand: add(add(U, [0, 0.35, 0]), add(mul(uf, 0.4), mul(ur, -0.18))) } },
    },
    'ochiru 受け',
  )
  const tori = figure(
    {
      hip: T,
      yaw: D,
      chestYaw: D + 6,
      lean: 12,
      faceAt: add(T, add(mul(f, 1), [0, 0.3, 0])),
      lookAt: uke.joints.hip,
      legs: { r: { ankle: nage.tori.joints.ankle_r, toe: D + 10 }, l: { ankle: add(at(PIVOT[0], PIVOT[1], 0.12), mul(f, 0.2)), toe: D - 20, toeUp: 0.04 } },
      arms: { r: { hand: add(add(T, [0, 0.25, 0]), add(mul(f, 0.52), mul(r, 0.22))) }, l: { hand: add(add(T, [0, 0.2, 0]), add(mul(f, 0.3), mul(r, -0.2))) } },
    },
    'ochiru 取り',
  )
  return { id: 'ochiru', at: 0.88, between: true, tori, uke }
})()

// ---- 残心（1.0）：受けは後ろ受身で転がり、腰を着いて取りの方を見る。取りは投げ終わりの半身で立つ ----
const zanshin = (() => {
  const f = fwd(D)
  const r = rightOf(D)
  const T = add(ochiru.tori.joints.hip, add(mul(f, 0.12), [0, 0.1, 0]))
  const U = add([ochiru.uke.joints.hip[0], 0.14, ochiru.uke.joints.hip[2]], mul(f, 1.05))
  const uYaw = D + 180
  const uf = fwd(uYaw)
  const ur = rightOf(uYaw)
  const onFloor = (p, y = Y) => at(p[0], p[2], y)
  const uke = figure(
    {
      hip: U,
      yaw: uYaw,
      lean: -30,
      pelvisTilt: -30,
      faceAt: add(T, [0, 0.4, 0]),
      lookAt: add(T, [0, 0.5, 0]),
      // 膝を立てて座り、両手は腰の後ろの畳に
      legs: {
        l: { ankle: onFloor(add(U, add(mul(uf, 0.52), mul(ur, -0.15)))), toe: uYaw, pole: norm(add(uf, [0, 1, 0])) },
        r: { ankle: onFloor(add(U, add(mul(uf, 0.46), mul(ur, 0.17)))), toe: uYaw, pole: norm(add(uf, [0, 1, 0])) },
      },
      arms: {
        r: { hand: onFloor(add(U, add(mul(uf, -0.26), mul(ur, 0.26))), 0.03), pole: norm(add(mul(uf, -1), [0, 0.5, 0])) },
        l: { hand: onFloor(add(U, add(mul(uf, -0.26), mul(ur, -0.26))), 0.03), pole: norm(add(mul(uf, -1), [0, 0.5, 0])) },
      },
    },
    'zanshin 受け',
  )
  const tori = figure(
    {
      hip: T,
      yaw: D - 10,
      chestYaw: D,
      lean: 4,
      faceAt: add(uke.joints.head, [0, 0.4, 0]),
      lookAt: uke.joints.head,
      legs: { r: { ankle: add(nage.tori.joints.ankle_r, mul(f, 0.1)), toe: D + 10 }, l: { ankle: add(at(PIVOT[0], PIVOT[1], Y), mul(f, 0.4)), toe: D - 60 } },
      arms: { r: { hand: add(add(T, [0, 0.08, 0]), add(mul(f, 0.5), mul(r, 0.24))) }, l: { hand: add(add(T, [0, 0.05, 0]), add(mul(f, 0.25), mul(r, -0.12))) } },
    },
    'zanshin 取り',
  )
  return { id: 'zanshin', at: 1.0, tori, uke }
})()

export { contact, yoko, irimi, mawaru, tenkan, nage, ochiru, zanshin }

writePose3D('iriminage', [omote.kamae, omote.furikaburi, contact, yoko, irimi, mawaru, tenkan, nage, ochiru, zanshin], {
  note: '記述からの推定（動画なし）。右の相半身・正面打ち。入身で受けの背後へ入る深さ、転換で回る量、投げる向きを師範に確認する',
})
