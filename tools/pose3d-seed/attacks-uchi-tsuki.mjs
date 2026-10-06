// 攻撃法（基礎動作）：正面打ち・横面打ち・突き の 3D ポーズ初版（推定）。node tools/pose3d-seed/attacks-uchi-tsuki.mjs [--force]
//
// 原稿 content/kihon/attacks/{shomen-uchi,yokomen-uchi,tsuki}.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// いずれも相半身（右）の構えから（一教（表）の構えより間合いを詰め、受けの一歩で取りの頭・腹に届く距離）。受けは後ろ足（左）を一歩踏み込んで打つ・突く（一教（表）の受けの正面打ちと同じ足運び）。
// - 正面打ち：振りかぶりは一教（表）の間（受けが前の手を額の上へ）と同じ。打ちで受けは前の手（右）の手刀を取りの額へ真っ直ぐ。
//             取りは前足を半歩送り、前の手（右）の手刀を上げて受けの手首に合わせる
// - 横面打ち：受けは前の手（右）を体の外側から頭の斜め上へ振りかぶり、斜め上から弧を描いて取りの側頭部（取りの左＝-z 側）へ。
//             取りは前足を半歩送り、打たれる側の手（後ろの手＝左）の手刀を側頭部の横へ上げて受けの手首に合わせる
// - 突き：受けは後ろの手（左）の拳を腰の横へ引きつけ、後ろ足を踏み込んで同じ側の拳で取りの腹（帯の少し上）を真っ直ぐ突く。
//         取りは前足を突き手の外側（+z）の斜め前へ送って体を開き、突きの線から外れて、前の手（右）の手刀を突き手の外側へ添える
import { add, figure, mul, norm, resetWarnings, STAND_HIP, turnFigure, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'

resetWarnings()
const { Y, headOf } = omote
/** 構えの間合い：一教（表）の構えから両者を D ずつ寄せ、受けの一歩で取りの頭・腹に届く距離にする */
const D = 0.24
const shift = (fig, dx) => turnFigure(fig, 0, [0, 0], [dx, 0])
const kamae = { id: 'kamae', at: 0, tori: shift(omote.kamae.tori, D), uke: shift(omote.kamae.uke, -D) }

/** 取り：右半身で前足を半歩送った構え（腰の位置 hipX、腰を落とす量 drop）。手は渡す */
const toriStep = (label, { hipX = -0.45, hipZ = 0, drop = 0.03, yaw = -26, r, l, lookAt, legs }) =>
  figure(
    {
      hip: [hipX, STAND_HIP - drop, hipZ],
      yaw,
      chestYaw: yaw + 8,
      lean: 4,
      faceAt: lookAt,
      lookAt,
      legs: legs ?? { r: { ankle: [hipX + 0.33, Y, hipZ + 0.07], toe: 0 }, l: { ankle: [hipX - 0.29, Y, hipZ - 0.13], toe: -75 } },
      arms: { r, l },
    },
    label,
  )

/** 受け：後ろ足（左）を一歩踏み込んだ姿勢（一教（表）の接触の受けと同じ足） */
const ukeStepped = (label, { yaw = 168, chestYaw = 172, lean = 8, r, l, lookAt, hip = [0.28, STAND_HIP - 0.05, 0.05], lf = [0.02, Y, 0.17], rf = [0.3, Y, -0.08] }) =>
  figure(
    {
      hip,
      yaw,
      chestYaw,
      lean,
      faceAt: lookAt,
      lookAt,
      legs: { l: { ankle: lf, toe: 190 }, r: { ankle: rf, toe: 165 } },
      arms: { r, l },
    },
    label,
  )

// ================= 正面打ち =================
{
  const furikaburi = { id: 'furikaburi', at: 0.4, tori: shift(omote.furikaburi.tori, D), uke: shift(omote.furikaburi.uke, -D) }
  const toriHead = [-0.4, 1.62, 0.0]
  // 受け：前の手（右）の手刀を取りの額へ真っ直ぐ振り下ろす（取りの手刀に合う所で止まる）
  const uke = ukeStepped('uchi 受け', {
    lookAt: toriHead,
    r: { hand: [-0.16, 1.52, -0.03], dir: norm([-1, -0.35, 0]) },
    l: { hand: [0.16, 0.98, 0.18], soft: true },
  })
  const meet = add(uke.joints.wrist_r, [-0.02, -0.04, 0.02])
  const tori = toriStep('uchi 取り', {
    lookAt: headOf(uke),
    r: { hand: meet, dir: norm([0.6, 0.8, 0]) },
    l: { hand: [-0.26, 1.0, -0.06], soft: true },
  })
  writePose3D('shomen-uchi', [kamae, furikaburi, { id: 'uchi', at: 1.0, tori, uke }], {
    note: '記述からの推定（動画なし）。相半身から、受けは後ろ足を踏み込んで前の手の手刀で額へ打つ。取りは前の手の手刀で合わせる。打つ手と足の組み合わせを師範に確認する',
  })
}

// ================= 横面打ち =================
{
  const toriHead = headOf(kamae.tori)
  const furikaburi = (() => {
    const uke = figure(
      {
        hip: [0.58, STAND_HIP - 0.03, 0.0],
        yaw: 160,
        chestYaw: 175,
        lean: 4,
        faceAt: toriHead,
        lookAt: toriHead,
        legs: { r: { ankle: [0.28, Y, -0.07], toe: 180 }, l: { ankle: [0.88, Y, 0.13], toe: 105 } },
        // 前の手（右）を体の外側（受けの右＝-z）から頭の斜め上へ
        arms: { r: { hand: [0.46, 1.86, -0.36], pole: norm([0.2, -0.3, -1]) }, l: { hand: [0.32, 1.0, 0.12], soft: true } },
      },
      'furikaburi 受け',
    )
    return { id: 'furikaburi', at: 0.4, tori: kamae.tori, uke }
  })()
  // 打ちが取りの手刀に合う所（取りの左の側頭部の横、少し前）
  const M = [-0.3, 1.5, -0.3]
  const uke = ukeStepped('uchi 受け', {
    yaw: 172,
    chestYaw: 150,
    lean: 6,
    lookAt: [-0.4, 1.62, 0],
    r: { hand: M, dir: norm([-0.5, -0.2, -0.8]), pole: norm([0.3, -0.4, -1]) },
    l: { hand: [0.18, 0.98, 0.2], soft: true },
  })
  const tori = toriStep('uchi 取り', {
    hipX: -0.45,
    lookAt: headOf(uke),
    r: { hand: [-0.12, 1.15, 0.1], soft: true },
    l: { hand: add(uke.joints.wrist_r, [-0.04, -0.02, 0.03]), dir: norm([0.3, 1, -0.2]), pole: norm([0, -1, -0.6]) },
  })
  writePose3D('yokomen-uchi', [kamae, furikaburi, { id: 'uchi', at: 1.0, tori, uke }], {
    note: '記述からの推定（動画なし）。相半身から、受けは後ろ足を踏み込んで前の手の手刀で取りの側頭部へ斜めに打つ。取りは打たれる側の手の手刀で合わせる。打つ手と足、取りの受け方を師範に確認する',
  })
}

// ================= 突き =================
{
  const toriHead = headOf(kamae.tori)
  // 踏み込み（0.4）：後ろの手（左）の拳を腰の横へ引きつけ、後ろ足を踏み出し始める
  const fumikomi = (() => {
    const uke = figure(
      {
        hip: [0.5, STAND_HIP - 0.04, 0.02],
        yaw: 170,
        chestYaw: 165,
        lean: 6,
        faceAt: toriHead,
        lookAt: toriHead,
        legs: { r: { ankle: [0.28, Y, -0.07], toe: 180 }, l: { ankle: [0.6, Y + 0.06, 0.14], toe: 150, toeUp: 0.04 } },
        arms: { r: { hand: [0.12, 1.1, -0.06] }, l: { hand: [0.56, 1.0, 0.3], dir: norm([-1, 0, 0]), soft: true } },
      },
      'fumikomi 受け',
    )
    return { id: 'fumikomi', at: 0.4, tori: kamae.tori, uke }
  })()
  // 突き（1.0）：後ろ足を踏み込み、同じ側の拳（左）で取りの腹を真っ直ぐ突く。取りは突き手の外側へ体を開く
  const uke = ukeStepped('tsuki 受け', {
    yaw: 205,
    chestYaw: 198,
    lean: 10,
    hip: [0.24, STAND_HIP - 0.06, 0.06],
    lf: [-0.02, Y, 0.14],
    rf: [0.34, Y, -0.08],
    lookAt: [-0.6, 1.1, 0.1],
    l: { hand: [-0.34, 1.06, 0.1], dir: norm([-1, -0.05, 0]) },
    r: { hand: [0.38, 1.0, -0.22], soft: true },
  })
  // 突き手の前腕の外側（+z）
  const outside = add(add(uke.joints.wrist_l, mul(norm(add(uke.joints.elbow_l, mul(uke.joints.wrist_l, -1))), 0.12)), [0, 0.03, 0.08])
  const tori = toriStep('tsuki 取り', {
    hipX: -0.5,
    hipZ: 0.44,
    yaw: -52,
    lookAt: headOf(uke),
    legs: { r: { ankle: [-0.24, Y, 0.54], toe: -25 }, l: { ankle: [-0.78, Y, 0.26], toe: -115 } },
    r: { hand: outside, dir: norm([1, -0.05, -0.2]) },
    l: { hand: [-0.38, 1.0, 0.3], soft: true },
  })
  // 間（0.75）：取りは前足を先に突き手の外側へ運び、後ろ足はまだ元の所（両足が同時に横へ開かないように）。受けは踏み込みの途中
  // 送り足の途中で両足の間が構えより広がるので、取りは腰を少し落とす
  const hiraku = (() => {
    const u = ukeStepped('hiraku 受け', {
      yaw: 196,
      chestYaw: 190,
      lean: 8,
      hip: [0.32, STAND_HIP - 0.05, 0.05],
      lf: [0.06, Y + 0.02, 0.14],
      rf: [0.34, Y, -0.08],
      lookAt: [-0.6, 1.1, 0.1],
      l: { hand: [-0.18, 1.05, 0.1], dir: norm([-1, -0.05, 0]) },
      r: { hand: [0.4, 1.0, -0.2], soft: true },
    })
    const t = toriStep('hiraku 取り', {
      hipX: -0.58,
      hipZ: 0.24,
      drop: 0.08,
      yaw: -38,
      lookAt: headOf(u),
      legs: { r: { ankle: [-0.24, Y, 0.54], toe: -25 }, l: { ankle: [-0.88, Y, -0.13], toe: -100 } },
      r: { hand: [-0.2, 1.08, 0.36], soft: true },
      l: { hand: [-0.46, 1.0, 0.18], soft: true },
    })
    return { id: 'hiraku', at: 0.75, between: true, tori: t, uke: u }
  })()
  writePose3D('tsuki', [kamae, fumikomi, hiraku, { id: 'tsuki', at: 1.0, tori, uke }], {
    note: '記述からの推定（動画なし）。相半身から、受けは後ろ足を踏み込んで同じ側の拳で中段を突く。取りは突き手の外側へ体を開いて手刀を添える。突く手と足、取りの外し方を師範に確認する',
  })
}
