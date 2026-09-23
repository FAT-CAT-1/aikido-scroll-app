// 一教（表）・正面打ち の 3D ポーズ初版（推定）。node tools/pose3d-seed/ikkyo-omote.mjs [--force]
//
// 原稿 content/techniques/ikkyo-omote.md の各 kf の「足・膝・肩・腹」の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え：右の相半身で向き合う（取りは -x 側で +x を向く、受けは +x 側で -x を向く）
// - 接触：受けは後ろ足（左）を踏み込んで右手刀で正面を打つ。取りは後ろ足（左）を受けの外側（受けの右＝-z）へ踏み込み、
//         右手で受けの手首、左手で肘に触れる
// - 崩し：取りは前の足に体重を移し腰を切って、受けの肘をその顔の方へ押し上げる。受けは左へ回されながら少し沈む
// - 入身：取りは後ろ足（右）を受けの脇の下へ大きく踏み込み、両手を前下へ下ろす。受けは膝と自由な手（左）を畳に着く
// - 抑え：受けは腹這い、右腕を体に対して直角よりやや頭の側へ伸ばされる。取りは跪座で、受けに近い膝を脇に、他方の膝を手首の側に
// - 残心：抑えを保ったまま取りは目線を上げる。受けは自由な手で畳を叩いて合図する
import { add, at, figure, fwd, kiza, lerp, mul, norm, prone, rightOf, STAND_HIP, sub, UP, writePose3D, yawTo } from './lib.mjs'

const Y = 0.08 // 立っているときの足首の高さ

/** 相手の頭（視線・顔を向ける先） */
const headOf = (fig) => fig.joints.head
/** 受けの右腕につかむ点：手首の少し上／上腕の肘寄り */
const gripWrist = (uke, dy) => add(uke.joints.wrist_r, [0, dy, 0])
const gripElbow = (uke, dy, t = 0.85) => add(lerp(uke.joints.shoulder_r, uke.joints.elbow_r, t), [0, dy, 0])

const GRIPS = [
  { hand: 'tori.hand_r', on: 'uke.wrist_r' },
  { hand: 'tori.hand_l', on: ['uke.shoulder_r', 'uke.elbow_r', 0.85] },
]

// ---- 構え（0.0） ----
const kamae = (() => {
  const ukeHead = [0.8, 1.66, 0.02]
  const toriHead = [-0.8, 1.66, -0.02]
  const tori = figure(
    {
      hip: [-0.84, STAND_HIP - 0.02, 0.0],
      yaw: -28,
      chestYaw: -20,
      lean: 3,
      faceAt: ukeHead,
      lookAt: ukeHead,
      legs: { r: { ankle: at(-0.52, 0.07, Y), toe: 0 }, l: { ankle: at(-1.12, -0.13, Y), toe: -75 } },
      arms: { r: { hand: [-0.3, 1.12, 0.05] }, l: { hand: [-0.6, 1.0, -0.07] } },
    },
    'kamae 取り',
  )
  const uke = figure(
    {
      hip: [0.84, STAND_HIP - 0.02, 0.0],
      yaw: 152,
      chestYaw: 160,
      lean: 3,
      faceAt: toriHead,
      lookAt: toriHead,
      legs: { r: { ankle: at(0.52, -0.07, Y), toe: 180 }, l: { ankle: at(1.12, 0.13, Y), toe: 105 } },
      arms: { r: { hand: [0.3, 1.12, -0.05] }, l: { hand: [0.6, 1.0, 0.07] } },
    },
    'kamae 受け',
  )
  return { id: 'kamae', at: 0, tori, uke }
})()

// ---- 間：受けが振りかぶる（0.07） ----
const furikaburi = (() => {
  const uke = figure(
    {
      hip: [0.79, STAND_HIP - 0.03, 0.03],
      yaw: 170,
      chestYaw: 175,
      lean: 6,
      faceAt: [-0.78, 1.64, -0.04],
      lookAt: [-0.78, 1.64, -0.04],
      legs: { r: { ankle: at(0.52, -0.07, Y), toe: 180 }, l: { ankle: at(1.12, 0.13, Y), toe: 105 } },
      arms: { r: { hand: [0.62, 1.9, -0.1], pole: norm([0.3, 0.2, -1]) }, l: { hand: [0.66, 0.98, 0.2] } },
    },
    'furikaburi 受け',
  )
  const tori = figure(
    {
      hip: [-0.8, STAND_HIP - 0.03, -0.04],
      yaw: -20,
      chestYaw: -10,
      lean: 5,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: at(-0.52, 0.07, Y), toe: 0 }, l: { ankle: at(-1.12, -0.13, Y), toe: -75 } },
      arms: { r: { hand: [-0.34, 1.28, 0.03] }, l: { hand: [-0.56, 1.06, -0.1] } },
    },
    'furikaburi 取り',
  )
  return { id: 'furikaburi', at: 0.07, between: true, tori, uke }
})()

// ---- 接触（0.15） ----
const contact = (() => {
  const uke = figure(
    {
      hip: [0.52, STAND_HIP - 0.05, 0.05],
      yaw: 200,
      chestYaw: 188,
      lean: 12,
      faceAt: [-0.4, 1.62, -0.16],
      lookAt: [-0.4, 1.62, -0.16],
      legs: { l: { ankle: at(0.26, 0.17, Y), toe: 190 }, r: { ankle: at(0.54, -0.08, Y), toe: 165 } },
      arms: { r: { hand: [-0.03, 1.52, -0.05] }, l: { hand: [0.46, 0.96, 0.25] } },
    },
    'contact 受け',
  )
  const tori = figure(
    {
      hip: [-0.44, STAND_HIP - 0.04, -0.17],
      yaw: 42,
      chestYaw: 26,
      lean: 5,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { l: { ankle: at(-0.28, -0.37, Y), toe: 25 }, r: { ankle: at(-0.54, 0.07, Y), toe: 55 } },
      arms: { r: { hand: gripWrist(uke, -0.045) }, l: { hand: gripElbow(uke, -0.055) } },
    },
    'contact 取り',
  )
  return { id: 'contact', at: 0.15, contacts: GRIPS, tori, uke }
})()

// ---- 崩し（0.35） ----
const kuzushi = (() => {
  const uke = figure(
    {
      hip: [0.47, STAND_HIP - 0.09, 0.12],
      yaw: 186,
      chestYaw: 158,
      lean: 16,
      side: -6,
      head: { yaw: -10, pitch: -15 },
      legs: { l: { ankle: at(0.26, 0.17, Y), toe: 190 }, r: { ankle: at(0.54, -0.08, Y), toe: 165 } },
      // 右腕：肘を顔の方へ押し上げられる（肘が上がり、手首は前下）
      arms: { r: { hand: [0.1, 1.32, -0.14], pole: norm([0.2, 1, 0.3]) }, l: { hand: [0.4, 0.92, 0.34] } },
    },
    'kuzushi 受け',
  )
  const tori = figure(
    {
      hip: [-0.27, STAND_HIP - 0.06, -0.2],
      yaw: 30,
      chestYaw: 18,
      lean: 9,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { l: { ankle: at(-0.28, -0.37, Y), toe: 25 }, r: { ankle: at(-0.54, 0.07, 0.1), toe: 55, toeUp: 0.02 } },
      arms: { r: { hand: gripWrist(uke, 0.035) }, l: { hand: gripElbow(uke, -0.05) } },
    },
    'kuzushi 取り',
  )
  return { id: 'kuzushi', at: 0.35, contacts: GRIPS, tori, uke }
})()

// ---- 入身（0.55） ----
const irimi = (() => {
  const ukeHip = [0.95, 0.5, 0.3]
  const pelvisYaw = 130
  const chestYaw = 120
  const kneeCenter = add([ukeHip[0], 0, ukeHip[2]], mul(fwd(pelvisYaw), 0.14))
  const base = {
    hip: ukeHip,
    yaw: pelvisYaw,
    chestYaw,
    lean: 68,
    head: { yaw: -20, pitch: -10 },
    legs: {
      l: { kneel: [kneeCenter[0] - rightOf(pelvisYaw)[0] * 0.12, kneeCenter[2] - rightOf(pelvisYaw)[2] * 0.12], tucked: true, back: mul(fwd(pelvisYaw), -1) },
      r: { kneel: [kneeCenter[0] + rightOf(pelvisYaw)[0] * 0.12, kneeCenter[2] + rightOf(pelvisYaw)[2] * 0.12], tucked: true, back: mul(fwd(pelvisYaw), -1) },
    },
  }
  // 肩の位置を出してから、右腕（前下へ伸ばされる）と左手（畳に着く）を決める
  const probe = figure({ ...base, arms: { r: { hand: [0, 0.6, 0.2] }, l: { hand: [0.8, 0.1, 0.8] } } }, 'irimi 受け（仮）')
  const armDir = norm(add(add(mul(rightOf(chestYaw), 0.9), [0, -0.33, 0]), mul(fwd(chestYaw), 0.12)))
  const handR = add(probe.joints.shoulder_r, mul(armDir, 0.6))
  const handL = add(add([ukeHip[0], 0.045, ukeHip[2]], mul(fwd(chestYaw), 0.52)), mul(rightOf(chestYaw), -0.18))
  const uke = figure({ ...base, arms: { r: { hand: handR }, l: { hand: handL, dir: norm(add(mul(fwd(chestYaw), 1), [0, -0.3, 0])) } } }, 'irimi 受け')

  const hands = lerp(uke.joints.wrist_r, uke.joints.elbow_r, 0.5)
  const toriYaw = 30
  const toriHip = add(sub([hands[0], 0, hands[2]], mul(fwd(toriYaw), 0.4)), [0, 0.72, 0])
  const tori = figure(
    {
      hip: toriHip,
      yaw: toriYaw + 8,
      chestYaw: toriYaw,
      lean: 40,
      faceAt: uke.joints.neck,
      lookAt: uke.joints.head,
      // 後ろになった足（左）は、踏み込みに合わせて少し引き寄せる
      legs: { r: { ankle: at(0.2, 0.3, Y), toe: 35 }, l: { ankle: at(-0.16, -0.27, 0.1), toe: 22, toeUp: 0.03 } },
      arms: { r: { hand: gripWrist(uke, 0.035) }, l: { hand: gripElbow(uke, 0.045) } },
    },
    'irimi 取り',
  )
  return { id: 'irimi', at: 0.55, contacts: GRIPS, tori, uke }
})()

// ---- 抑え（0.8）・残心（1.0） ----
function pin(id, atTime, { tap, toriLean, toriHeadPitch, lookUp }) {
  const headYaw = 110
  const hip = [0.98, 0.28]
  const spine = fwd(headYaw)
  const right = norm([-spine[2], 0, spine[0]]) // うつ伏せの右（体の頭の方向に対して）
  // 右腕は体に対して直角よりやや頭の側へ、左手は頭の横（合図の手）
  const probe = prone({ hip, headYaw, arms: { r: { hand: [0.2, 0.08, 0.6] }, l: { hand: [1.2, 0.05, 1.0] } } }, `${id} 受け（仮）`)
  const armDir = norm(add(mul(right, Math.cos((10 * Math.PI) / 180)), mul(spine, Math.sin((10 * Math.PI) / 180))))
  const shR = probe.joints.shoulder_r
  const handR = add([shR[0], 0.075, shR[2]], mul(armDir, 0.61))
  const handL = add(add(probe.joints.neck, mul(spine, 0.22)), add(mul(right, -0.3), [0, (tap ? 0.12 : 0.045) - probe.joints.neck[1], 0]))
  const uke = prone({ hip, headYaw, arms: { r: { hand: handR, dir: armDir, pole: [0, 1, 0] }, l: { hand: handL, dir: norm(add(spine, mul(right, -0.3))), pole: norm(add(mul(right, -1), [0, 0.4, 0])) } } }, `${id} 受け`)

  // 取り：受けの頭の方を向いた跪座。受けに近い膝を脇に、他方の膝を手首の側に（腕の線より足の側）
  const armpit = sub(uke.joints.shoulder_r, mul(spine, 0.14))
  const nearKnee = sub([armpit[0], 0, armpit[2]], mul(spine, 0.06))
  const farKnee = sub([uke.joints.wrist_r[0], 0, uke.joints.wrist_r[2]], mul(spine, 0.12))
  const center = lerp(nearKnee, farKnee, 0.5)
  const spread = Math.hypot(nearKnee[0] - farKnee[0], nearKnee[2] - farKnee[2])
  const tori = kiza(
    {
      center: [center[0], center[2]],
      yaw: headYaw,
      spread: Math.min(0.42, spread),
      back: 0.18,
      hipY: 0.42,
      lean: toriLean,
      ...(lookUp ? { head: { pitch: toriHeadPitch } } : { faceAt: uke.joints.elbow_r }),
      lookAt: lookUp ? add(uke.joints.head, [0.6, 1.1, 1.2]) : uke.joints.elbow_r,
      arms: { l: { hand: gripElbow(uke, 0.045, 0.8) }, r: { hand: gripWrist(uke, 0.04) } },
    },
    `${id} 取り`,
  )
  return { id, at: atTime, contacts: GRIPS, tori, uke }
}

const osae = pin('osae', 0.8, { tap: false, toriLean: 50 })
const zanshin = pin('zanshin', 1.0, { tap: true, toriLean: 48, toriHeadPitch: 32, lookUp: true })

writePose3D('ikkyo-omote', [kamae, furikaburi, contact, kuzushi, irimi, osae, zanshin], {
  note: '記述からの推定（動画なし）。右の相半身・正面打ち。足運びと抑えの形は docs/content-review-notes.md の 3D の項を師範に確認する',
})
void UP
void yawTo
