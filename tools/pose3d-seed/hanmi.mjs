// 半身（基礎動作）の 3D ポーズ初版（推定）。node tools/pose3d-seed/hanmi.mjs [--force]
//
// 原稿 content/kihon/hanmi.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 自然体：取りと受けが両足を肩幅に開いて真っ直ぐ立ち、向き合う。両手は体の横
// - 相半身：両者が同じ側の足（右）を半歩前へ出し、後ろ足を外へ開く。一教（表）の構えと同じ形を使う
// - 逆半身：受けがその場で前後の足を入れ替え、左足が前になる。四方投げ（表）の構えの受けと同じ形を使う
import { at, figure, resetWarnings, STAND_HIP, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'
import * as shiho from './shihonage-omote.mjs'

resetWarnings()
const { Y } = omote

// ---- 自然体（0.0）：両足を肩幅に開いて真っ直ぐ立ち、両手は体の横 ----
const shizentai = (() => {
  const toriHead = [-0.98, 1.66, 0]
  const ukeHead = [0.98, 1.66, 0]
  const tori = figure(
    {
      hip: [-0.98, STAND_HIP + 0.01, 0],
      yaw: 0,
      lean: 1,
      faceAt: ukeHead,
      lookAt: ukeHead,
      legs: { r: { ankle: at(-0.98, 0.13, Y), toe: 8 }, l: { ankle: at(-0.98, -0.13, Y), toe: -8 } },
      arms: { r: { hand: [-0.95, 0.8, 0.27], soft: true }, l: { hand: [-0.95, 0.8, -0.27], soft: true } },
    },
    'shizentai 取り',
  )
  const uke = figure(
    {
      hip: [0.98, STAND_HIP + 0.01, 0],
      yaw: 180,
      lean: 1,
      faceAt: toriHead,
      lookAt: toriHead,
      // 受けの右は -z
      legs: { r: { ankle: at(0.98, -0.13, Y), toe: 172 }, l: { ankle: at(0.98, 0.13, Y), toe: 188 } },
      arms: { r: { hand: [0.95, 0.8, -0.27], soft: true }, l: { hand: [0.95, 0.8, 0.27], soft: true } },
    },
    'shizentai 受け',
  )
  return { id: 'shizentai', at: 0, tori, uke }
})()

// ---- 相半身（0.5）：両者とも右足を前に。一教（表）の構え ----
const aiHanmi = { id: 'ai-hanmi', at: 0.5, tori: omote.kamae.tori, uke: omote.kamae.uke }

// ---- 逆半身（1.0）：受けがその場で足を入れ替えて左足前。取りは相半身のまま ----
const gyakuHanmi = { id: 'gyaku-hanmi', at: 1.0, tori: omote.kamae.tori, uke: shiho.kamae.uke }

writePose3D('hanmi', [shizentai, aiHanmi, gyakuHanmi], {
  note: '記述からの推定（動画なし）。自然体から相半身、受けが足を入れ替えて逆半身。足の開きと向きを師範に確認する',
})
