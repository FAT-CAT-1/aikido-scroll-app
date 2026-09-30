// 入身転換（基礎動作・逆半身片手取り）の 3D ポーズ初版（推定）。node tools/pose3d-seed/irimi-tenkan.mjs [--force]
//
// 原稿 content/kihon/irimi-tenkan.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え・接触：転換（= 四方投げ（表））と同じ。逆半身で、受けは前の手（左）で取りの前の手首（右）を掴む
// - 間（0.38）：前足を受けの前足の外側へ回り込ませながら送り出す途中
// - 入身：取りは前足（右）を受けの前足の外側を越えて深く送り出し、後ろ足を引きつけて、受けの側面のやや後ろへ入る。
//         まだ元の向き（+x）を向いている。掴まれた手は腰の前
// - 間（0.62）：踏み込んだ前足を軸に、後ろ足を受けから離れる側（+z）を通して後ろへ回す途中（左回り）
// - 転換：約 180° 回り、受けの左斜め後ろで受けと同じ向き（-x）を向く
// - 残心：掴まれた手の手刀を前へ伸ばし、受けを前方へ導く。受けは掴んだまま半歩前へ出る
import { resetWarnings, STAND_HIP, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as tk from './tenkan.mjs'

resetWarnings()
const { Y } = omote
const { GRAB, toriStance, ukeHolding } = tk

/** 入身で送り出した前足（右）の位置：受けの前足（左, [0.0, 0.12]）の外側を越えた所 */
const PIVOT = [0.28, 0.5]

const kamae = tk.kamae
const contact = { ...tk.contact, at: 0.25 }

// ---- 間（0.38）：前足を受けの前足の外側（+z）へ回り込ませながら送り出す途中 ----
const okuri = (() => {
  const tori = toriStance([-0.12, 0.42], -4, {
    label: 'okuri 取り',
    back: [0.52, 0.1],
    hipDrop: 0.05,
    lean: 5,
    faceAt: [1.2, 1.5, 0.1],
    lookAt: [1.2, 1.35, 0.05],
  })
  const uke = ukeHolding(tori, { hip: [0.24, STAND_HIP - 0.05, 0.03], yaw: 202, lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'okuri 受け', lookAt: tori.joints.head })
  return { id: 'okuri', at: 0.38, between: true, contacts: [GRAB], tori, uke }
})()

// ---- 入身（0.5）：前足を深く送り出し、受けの側面のやや後ろへ。まだ +x を向く ----
const irimi = (() => {
  const tori = toriStance(PIVOT, -2, {
    label: 'irimi 取り',
    // 後ろ足は前足の真後ろへ引きつける（受けの前足のつま先に寄せない）
    back: [0.5, 0.02],
    hipDrop: 0.06,
    lean: 6,
    faceAt: [1.6, 1.45, 0.2],
    lookAt: [1.6, 1.3, 0.1],
  })
  const uke = ukeHolding(tori, { hip: [0.24, STAND_HIP - 0.05, 0.03], yaw: 200, lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'irimi 受け', lookAt: tori.joints.head })
  return { id: 'irimi', at: 0.5, contacts: [GRAB], tori, uke }
})()

// ---- 間（0.62）：前足を軸に、後ろ足を受けから離れる側を通して後ろへ回す途中 ----
const mawaru = (() => {
  const tori = toriStance(PIVOT, -95, {
    label: 'mawaru 取り',
    back: [0.42, 0.12],
    backToeUp: 0.05,
    lean: 6,
    handAhead: 0.36,
    faceAt: [0.3, 1.4, -0.6],
    lookAt: [0.3, 1.3, -0.9],
  })
  const uke = ukeHolding(tori, { hip: [0.22, STAND_HIP - 0.05, 0.04], yaw: 198, lf: [0.0, Y, 0.12], rf: [0.58, Y, -0.1], label: 'mawaru 受け', lookAt: tori.joints.head })
  return { id: 'mawaru', at: 0.62, between: true, contacts: [GRAB], tori, uke }
})()

// ---- 転換（0.75）：約 180° 回り、受けの左斜め後ろで -x を向く ----
const tenkan = (() => {
  const tori = toriStance(PIVOT, -180, {
    label: 'tenkan 取り',
    handAhead: 0.36,
    faceAt: [-2.5, 1.4, 0.5],
    lookAt: [-2.5, 1.2, 0.5],
  })
  const uke = ukeHolding(tori, {
    hip: [0.2, STAND_HIP - 0.05, 0.05],
    yaw: 195,
    lf: [-0.02, Y, 0.14],
    rf: [0.56, Y, -0.08],
    label: 'tenkan 受け',
    lookAt: [-1.5, 1.3, 0.3],
  })
  return { id: 'tenkan', at: 0.75, contacts: [GRAB], tori, uke }
})()

// ---- 残心（1.0）：手刀を前へ伸ばして受けを前方へ導く。受けは半歩前へ ----
const zanshin = (() => {
  const tori = toriStance(PIVOT, -180, {
    label: 'zanshin 取り',
    handAhead: 0.5,
    handY: 1.0,
    lean: 8,
    faceAt: [-3, 1.45, 0.5],
    lookAt: [-3, 1.25, 0.5],
  })
  const uke = ukeHolding(tori, {
    hip: [-0.02, STAND_HIP - 0.04, 0.06],
    yaw: 190,
    lean: 8,
    lf: [-0.25, Y, 0.14],
    rf: [0.32, Y, -0.08],
    label: 'zanshin 受け',
    lookAt: [-2, 1.2, 0.3],
  })
  return { id: 'zanshin', at: 1.0, contacts: [GRAB], tori, uke }
})()

writePose3D('irimi-tenkan', [kamae, contact, okuri, irimi, mawaru, tenkan, zanshin], {
  note: '記述からの推定（動画なし）。逆半身片手取り。前足を送り足で深く入れ、そこを軸に左回りに約180°回る。入り方（送り足か歩み足か）を師範に確認する',
})
