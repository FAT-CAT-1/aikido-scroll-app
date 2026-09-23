// 一教（裏）・正面打ち の 3D ポーズ初版（推定）。node tools/pose3d-seed/ikkyo-ura.mjs [--force]
//
// 原稿 content/techniques/ikkyo-ura.md の各 kf の記述に合わせた（docs/content-review-notes.md の 3D の項）。
// - 構え・振りかぶり：一教（表）と同じ（右の相半身）
// - 接触：受けは後ろ足（左）を踏み込んで正面を打つ（表と同じ）。取りは前足（右）を受けの打ち手の外側（受けの右の側面＝-z）へ進め、
//         打ちの線から外れて、右手で受けの手首、左手で肘に触れる
// - 崩し：取りは側面の前足に体重を移し、受けの肘をその顔の方へ押し上げながら腰を回し始める。受けは前へ崩れる（表と同じ）
// - 転換：取りは前足（右）を軸に、後ろ足（左）を受けの背後側へ大きく円く回して約 200° 回り、腰を落とす。受けは取りの前を円く回されて
//         膝と自由な手を畳に着く。転換後の取りの前後の構えは表の入身と同じ形なので、表の入身〜抑えを床の上で回して使う（D-48）
// - 抑え・残心：表と同じ形（受けは腹這い、取りは跪座で受けの頭の方を向き、膝を脇と手首に）を、転換で回った向きに置く
import { add, at, figure, fwd, mul, norm, resetWarnings, STAND_HIP, turnFigure, writePose3D } from './lib.mjs'
import * as omote from './ikkyo-omote.mjs'

resetWarnings()
const { Y, headOf, gripWrist, gripElbow, GRIPS } = omote

/** 取りの軸足（右）：接触で受けの右の側面へ進めた位置。転換の間ずっとここを軸に回る */
const PIVOT = [-0.1, -0.46]
/** 転換で表の入身〜抑えをどれだけ回して置くか（度）。表の入身の取りの向き 38° → 裏の転換後 238° */
const TURN = 200

// ---- 接触（0.15）：受けは表と同じ。取りは前足で側面へ ----
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
      legs: { r: { ankle: at(PIVOT[0], PIVOT[1], Y), toe: 60 }, l: { ankle: at(-0.58, -0.59, Y), toe: 0 } },
      arms: { r: { hand: gripWrist(uke, -0.045) }, l: { hand: gripElbow(uke, -0.055) } },
    },
    'contact 取り',
  )
  return { id: 'contact', at: 0.15, contacts: GRIPS, tori, uke }
})()

// ---- 崩し（0.35）：受けは表と同じ。取りは側面の前足に体重を移し、腰を回し始める ----
const kuzushi = (() => {
  const uke = omote.kuzushi.uke
  const tori = figure(
    {
      hip: [-0.2, STAND_HIP - 0.09, -0.5],
      yaw: 78,
      chestYaw: 64,
      lean: 10,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: at(PIVOT[0], PIVOT[1], Y), toe: 60 }, l: { ankle: at(-0.52, -0.6, 0.1), toe: 10, toeUp: 0.02 } },
      arms: { r: { hand: gripWrist(uke, 0.035) }, l: { hand: gripElbow(uke, -0.05) } },
    },
    'kuzushi 取り',
  )
  return { id: 'kuzushi', at: 0.35, contacts: GRIPS, tori, uke }
})()

// ---- 転換の途中（0.48）：後ろ足（左）が軸足の後ろを円く回っている。受けは前へ折れながら取りの前を回される ----
const mawaru = (() => {
  const yaw = 150
  const toriHip = [PIVOT[0] + 0.03, 0.84, PIVOT[1] + 0.03]
  // 受け：表の「前へ折れて沈む」姿勢を、取りの前へ回して置く（表では取り 36° の前にいる）
  const o = omote.oreru
  const deg = yaw - 36
  const uke = turnFigure(o.uke, deg, [o.tori.joints.hip[0], o.tori.joints.hip[2]], [toriHip[0] - o.tori.joints.hip[0], toriHip[2] - o.tori.joints.hip[2]])
  const swing = add(at(PIVOT[0], PIVOT[1], 0.15), mul(fwd(yaw), -0.5))
  const tori = figure(
    {
      hip: toriHip,
      yaw,
      chestYaw: yaw - 8,
      lean: 22,
      faceAt: headOf(uke),
      lookAt: headOf(uke),
      legs: { r: { ankle: at(PIVOT[0], PIVOT[1], Y), toe: yaw - 20 }, l: { ankle: swing, toe: yaw + 40, toeUp: 0.04 } },
      arms: { r: { hand: gripWrist(uke, 0.035) }, l: { hand: gripElbow(uke, -0.02) } },
    },
    'mawaru 取り',
  )
  return { id: 'mawaru', at: 0.48, between: true, contacts: GRIPS, tori, uke }
})()

// ---- 転換（0.6）〜残心（1.0）：表の入身〜残心を、取りの軸足が PIVOT に来るよう回して置く ----
const irimiR = turnFigure(omote.irimi.tori, TURN)
const offset = [PIVOT[0] - irimiR.joints.ankle_r[0], PIVOT[1] - irimiR.joints.ankle_r[2]]
/** 表の場面を回して置き直す（id・時刻を裏のものにする） */
const place = (kf, id, atTime, between = false) => ({
  id,
  at: atTime,
  ...(between ? { between: true } : {}),
  contacts: GRIPS,
  tori: turnFigure(kf.tori, TURN, [0, 0], offset),
  uke: turnFigure(kf.uke, TURN, [0, 0], offset),
})

const tenkan = place(omote.irimi, 'tenkan', 0.6)
const osaeIn = place(omote.osaeIn, 'osae-in', 0.7, true)
const hiza = place(omote.hiza, 'hiza', 0.78, true)
const osae = place(omote.osae, 'osae', 0.85)
const zanshin = place(omote.zanshin, 'zanshin', 1.0)

writePose3D('ikkyo-ura', [omote.kamae, omote.furikaburi, contact, kuzushi, mawaru, tenkan, osaeIn, hiza, osae, zanshin], {
  note: '記述からの推定（動画なし）。右の相半身・正面打ち。転換〜抑えは一教（表）の入身〜抑えを回した形。回る量と受けの倒れる位置を師範に確認する',
})
void norm
