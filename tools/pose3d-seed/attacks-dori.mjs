// 攻撃法（基礎動作）：片手取り・両手取り・肩取り の 3D ポーズ初版（推定）。node tools/pose3d-seed/attacks-dori.mjs [--force]
//
// 原稿 content/kihon/attacks/{katate-dori,ryote-dori,kata-dori}.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// いずれも逆半身（取りは右足前、受けは左足前）。受けは前足（左）を送り出して掴む。
// - 片手取り：構えは転換と同じ（取りは前の手を帯の高さで体の前）。掴むは四方投げ（表）の接触と同じ
// - 両手取り：取りは両手を帯の高さで体の前に置く。受けは前の手（左）で取りの前の手首（右）を、後ろの手（右）で後ろの手首（左）を掴む
// - 肩取り：受けは前の手（左）で取りの前の肩（右）の道着を掴み、肘を伸ばして押さえる。取りは肩を落とし腰を少し落とす
import { add, figure, mul, norm, resetWarnings, STAND_HIP, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as shiho from './shihonage-omote.mjs'
import * as tk from './tenkan.mjs'

resetWarnings()
const { Y, headOf } = omote
const { GRAB, grab } = tk
const ukeKamae = shiho.kamae.uke

/** 受け：前足（左）を送り出していく姿勢。t = 0（構え）〜 1（着いた所） */
function ukeStep(label, t, { arms, lean = 6, lookAt, yaw = 207, hip, lf, rf }) {
  const lerpN = (a, b) => a + (b - a) * t
  return figure(
    {
      hip: hip ?? [lerpN(0.84, 0.24), STAND_HIP - lerpN(0.02, 0.05), lerpN(0.0, 0.02)],
      yaw,
      chestYaw: yaw - 8,
      lean,
      faceAt: lookAt,
      lookAt,
      legs: {
        l: { ankle: lf ?? [lerpN(0.52, 0.0), Y + (t > 0 && t < 1 ? 0.03 : 0), lerpN(0.07, 0.12)], toe: 185 },
        r: { ankle: rf ?? [lerpN(1.12, 0.58), Y, lerpN(-0.13, -0.1)], toe: 250 },
      },
      arms,
    },
    label,
  )
}

// ================= 片手取り =================
{
  const kamae = tk.kamae
  const tori = kamae.tori
  const fumikomi = {
    id: 'fumikomi',
    at: 0.4,
    tori,
    uke: ukeStep('fumikomi 受け', 0.5, {
      lookAt: headOf(tori),
      arms: { l: { hand: add(tori.joints.wrist_r, [0.16, 0.08, 0.0]), dir: norm([-1, -0.3, 0]), soft: true }, r: { hand: [0.62, 0.98, -0.24], soft: true } },
    }),
  }
  writePose3D('katate-dori', [kamae, fumikomi, { ...tk.contact, id: 'tsukamu', at: 1.0, contacts: [GRAB] }], {
    note: '記述からの推定（動画なし）。逆半身で、受けは前足を送り出して前の手で取りの前の手首を上から掴む。掴む向きと強さを師範に確認する',
  })
}

// ================= 両手取り =================
{
  const GRAB2 = [GRAB, { hand: 'uke.hand_r', on: 'tori.wrist_l' }]
  /** 取り：逆半身で両手を帯の高さで体の前に置く */
  const toriBoth = (label, hipX) =>
    figure(
      {
        hip: [hipX, STAND_HIP - 0.02, 0.0],
        yaw: -28,
        chestYaw: -16,
        lean: 3,
        faceAt: headOf(ukeKamae),
        lookAt: headOf(ukeKamae),
        legs: { r: { ankle: [hipX + 0.32, Y, 0.07], toe: 0 }, l: { ankle: [hipX - 0.28, Y, -0.13], toe: -75 } },
        arms: {
          r: { hand: [hipX + 0.42, 1.0, 0.1], dir: norm([1, 0.25, 0]) },
          l: { hand: [hipX + 0.32, 1.0, -0.1], dir: norm([1, 0.25, 0]) },
        },
      },
      label,
    )
  const kamae = { id: 'kamae', at: 0, tori: toriBoth('kamae 取り', -0.84), uke: ukeKamae }
  const tori = toriBoth('tsukamu 取り', -0.78)
  const fumikomi = {
    id: 'fumikomi',
    at: 0.4,
    tori: kamae.tori,
    uke: ukeStep('fumikomi 受け', 0.5, {
      lookAt: headOf(kamae.tori),
      arms: {
        l: { hand: add(kamae.tori.joints.wrist_r, [0.16, 0.08, 0.0]), dir: norm([-1, -0.3, 0]), soft: true },
        r: { hand: add(kamae.tori.joints.wrist_l, [0.18, 0.08, 0.0]), dir: norm([-1, -0.3, 0]), soft: true },
      },
    }),
  }
  const uke = ukeStep('tsukamu 受け', 1, {
    lookAt: headOf(tori),
    yaw: 186,
    hip: [-0.01, STAND_HIP - 0.05, 0.02],
    lf: [-0.24, Y, 0.22],
    rf: [0.32, Y, -0.1],
    arms: {
      l: { hand: grab(tori), dir: norm([-0.35, -1, 0]) },
      r: { hand: add(tori.joints.wrist_l, [0.03, 0.035, 0]), dir: norm([-0.35, -1, 0]) },
    },
  })
  writePose3D('ryote-dori', [kamae, fumikomi, { id: 'tsukamu', at: 1.0, contacts: GRAB2, tori, uke }], {
    note: '記述からの推定（動画なし）。立って逆半身で、受けは前足を送り出して取りの両手首を上から掴む。掴む向きと強さを師範に確認する',
  })
}

// ================= 肩取り =================
{
  const kamae = tk.kamae
  const SHOULDER = { hand: 'uke.hand_l', on: 'tori.shoulder_r' }
  const fumikomi = {
    id: 'fumikomi',
    at: 0.4,
    tori: kamae.tori,
    uke: ukeStep('fumikomi 受け', 0.5, {
      lookAt: headOf(kamae.tori),
      arms: { l: { hand: add(kamae.tori.joints.shoulder_r, [0.24, -0.02, 0.0]), dir: norm([-1, 0, 0]), soft: true }, r: { hand: [0.62, 0.98, -0.24], soft: true } },
    }),
  }
  // 取り：肩を落とし、膝を少し緩めて腰を落とす。前の手は体の前
  const tori = figure(
    {
      hip: [-0.8, STAND_HIP - 0.06, 0.0],
      yaw: -26,
      chestYaw: -18,
      lean: 4,
      faceAt: [0.25, 1.62, 0.05],
      lookAt: [0.25, 1.62, 0.05],
      legs: { r: { ankle: [-0.48, Y, 0.07], toe: 0 }, l: { ankle: [-1.1, Y, -0.13], toe: -75 } },
      arms: { r: { hand: [-0.4, 1.02, 0.08], dir: norm([1, 0.25, 0]) }, l: { hand: [-0.64, 0.95, -0.08], soft: true } },
    },
    'tsukamu 取り',
  )
  // 受け：前の手（左）で取りの前の肩（右）の道着の前を掴み、肘を伸ばして押さえる
  // 肩口の前（襟寄り）。上腕に掛からない所
  const grip = add(tori.joints.shoulder_r, [0.08, -0.03, -0.07])
  const uke = ukeStep('tsukamu 受け', 1, {
    lookAt: headOf(tori),
    lean: 4,
    yaw: 196,
    hip: [-0.2, STAND_HIP - 0.04, 0.08],
    lf: [-0.4, Y, 0.32],
    rf: [0.14, Y, -0.06],
    arms: { l: { hand: grip, dir: norm([-1, -0.2, 0.15]), pole: norm([0.2, -1, 0.4]) }, r: { hand: [0.5, 0.98, -0.26], soft: true } },
  })
  writePose3D('kata-dori', [kamae, fumikomi, { id: 'tsukamu', at: 1.0, contacts: [SHOULDER], tori, uke }], {
    note: '記述からの推定（動画なし）。逆半身で、受けは前足を送り出して前の手で取りの前の肩の道着を掴み、肘を伸ばして押さえる。掴む所と半身の組み合わせを師範に確認する',
  })
}
