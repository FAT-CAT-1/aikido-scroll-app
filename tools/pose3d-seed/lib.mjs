// 3D ポーズの初版を「技の記述から推定」して作るための道具（docs/animation-spec.md §13-6 / §9 の c 方式）
//
// 腰（丹田）の位置と体の向き・傾き、足首の位置、手の位置を決めると、標準体型（content/poses3d/_body3d.json）の
// 骨長のまま膝と肘を解いて 21 関節を出す。座標はメートル、y が上、床 y=0。
// 向き（yaw）は度で、0＝+x、90＝+z。体の右は yaw が 0 のとき +z。
//
// 動画から作った動き（mocap）に置き換えるまでの仮のデータ。書き出したファイルは師範の校閲まで status は推定のまま。
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const BODY = JSON.parse(readFileSync(path.join(ROOT, 'content', 'poses3d', '_body3d.json'), 'utf8'))
const L = BODY.bones
export const warnings = []

// ---- ベクトル ----
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const len = (a) => Math.hypot(a[0], a[1], a[2])
export const norm = (a) => {
  const l = len(a)
  return l > 1e-9 ? mul(a, 1 / l) : [0, 1, 0]
}
export const lerp = (a, b, t) => add(a, mul(sub(b, a), t))
const reject = (v, n) => sub(v, mul(n, dot(v, n)))
const rad = (d) => (d * Math.PI) / 180
export const UP = [0, 1, 0]
export const DOWN = [0, -1, 0]
/** 向き yaw の前方（水平） */
export const fwd = (yaw) => [Math.cos(rad(yaw)), 0, Math.sin(rad(yaw))]
/** 向き yaw のときの体の右（水平） */
export const rightOf = (yaw) => [-Math.sin(rad(yaw)), 0, Math.cos(rad(yaw))]
/** 床の上の点 [x, z] → [x, y, z] */
export const at = (x, z, y = 0) => [x, y, z]
/**
 * 姿勢を床の上で回して動かす。pivot（[x, z]）を中心に deg 度（向き yaw が増える向き）回してから offset（[x, z]）だけ動かす。
 * 骨の長さ・床からの高さは変わらない。ほかの技で同じ形の場面を使い回すため（例：一教（裏）の転換〜抑えは表の入身〜抑えを回したもの）
 */
export function turnFigure(fig, deg, pivot = [0, 0], offset = [0, 0]) {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  const tp = ([x, y, z]) => {
    const dx = x - pivot[0]
    const dz = z - pivot[1]
    return [pivot[0] + dx * c - dz * s + offset[0], y, pivot[1] + dx * s + dz * c + offset[1]]
  }
  const tv = ([x, y, z]) => [x * c - z * s, y, x * s + z * c]
  return { joints: Object.fromEntries(Object.entries(fig.joints).map(([k, v]) => [k, tp(v)])), gaze: tv(fig.gaze) }
}

/** 別の技の場面を読み込んだときの注意を消す（書き出す技の注意だけを表示する） */
export function resetWarnings() {
  warnings.length = 0
}

/** 2点を結ぶ水平の向き（度） */
export const yawTo = (from, to) => (Math.atan2(to[2] - from[2], to[0] - from[0]) * 180) / Math.PI

function ik(root, target, l1, l2, pole, label) {
  const d0 = len(sub(target, root))
  if (d0 > l1 + l2 - 1e-3) warnings.push(`${label}: 届きません（${d0.toFixed(3)}m > ${(l1 + l2).toFixed(3)}m）→ 伸ばし切り`)
  const n = norm(sub(target, root))
  const d = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(l1 + l2 - 1e-4, d0))
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const bend = norm(reject(pole, n))
  return [add(add(root, mul(n, a)), mul(bend, h)), add(root, mul(n, d))]
}

/**
 * 1体の姿勢
 * @param {object} s
 * @param {number[]} s.hip 腰（帯の結び目の奥＝丹田）の位置
 * @param {number} s.yaw 腰の向き（度）
 * @param {number} [s.chestYaw] 胸の向き（省略時 yaw）
 * @param {number} [s.lean] 背骨を前へ倒す角度（度）
 * @param {number} [s.side] 背骨を右へ倒す角度（度）
 * @param {number[]} [s.spine] 背骨の向きを直接（うつ伏せなど）
 * @param {number[]} [s.front] 胸の正面の向きを直接
 * @param {number} [s.pelvisTilt] 骨盤を前へ倒す角度（省略時 lean の半分）
 * @param {number[]} [s.pelvisUp] 骨盤の上向きを直接
 * @param {number[]} [s.pelvisFront] 骨盤の正面（帯の結び目）を直接
 * @param {{yaw?: number, pitch?: number}} [s.head] 顔を右へ回す・上へ向ける角度（胸に対して）
 * @param {number[]} [s.faceAt] 顔を向ける点（head より優先）
 * @param {number[]} [s.lookAt] 視線を向ける点（省略時は顔の向き）
 * @param {Record<'l'|'r', any>} s.legs 脚：{ ankle, toe（つま先の yaw）, pole? } または { kneel: [x, z], tucked?, back? }
 * @param {Record<'l'|'r', any>} s.arms 腕：{ hand, dir?, pole? }
 * @param {string} label 注意の表示用
 */
export function figure(s, label) {
  const chestYaw = s.chestYaw ?? s.yaw
  const cf = fwd(chestYaw)
  const lean = s.lean ?? 0
  let spine = s.spine ? norm(s.spine) : norm(add(mul(UP, Math.cos(rad(lean))), mul(cf, Math.sin(rad(lean)))))
  if (!s.spine && s.side) spine = norm(add(mul(spine, Math.cos(rad(s.side))), mul(rightOf(chestYaw), Math.sin(rad(s.side)))))
  const front = s.front ? norm(reject(s.front, spine)) : norm(reject(cf, spine))
  const right = norm(cross(front, spine))
  const hip = s.hip
  const neck = add(hip, mul(spine, L.spine))
  const shoulder = (sign) => add(neck, mul(norm(sub(mul(right, 0.185 * sign), mul(spine, 0.04))), L['neck-shoulder']))

  // 頭：首は背骨より少し起こす。pitch は頭ごと前後に傾ける
  let headUp = norm(add(mul(spine, 0.6), mul(UP, 0.4)))
  if (s.spine) headUp = norm(add(mul(spine, 0.9), mul(UP, 0.1)))
  let face = norm(reject(front, headUp))
  if (s.faceAt) {
    const want = norm(sub(s.faceAt, add(neck, mul(headUp, L['neck-head']))))
    face = norm(reject(want, headUp))
    // 上下も向ける（首ごと少し傾ける）
    const pitch = Math.asin(Math.max(-1, Math.min(1, dot(want, headUp))))
    const f2 = norm(add(mul(face, Math.cos(pitch)), mul(headUp, Math.sin(pitch))))
    headUp = norm(sub(mul(headUp, Math.cos(pitch * 0.6)), mul(face, Math.sin(pitch * 0.6))))
    face = f2
  } else if (s.head) {
    const yaw = rad(s.head.yaw ?? 0)
    const headRight = norm(cross(face, headUp))
    face = norm(add(mul(face, Math.cos(yaw)), mul(headRight, Math.sin(yaw))))
    const p = rad(s.head.pitch ?? 0)
    const f2 = norm(add(mul(face, Math.cos(p)), mul(headUp, Math.sin(p))))
    headUp = norm(sub(mul(headUp, Math.cos(p * 0.6)), mul(face, Math.sin(p * 0.6))))
    face = f2
  }
  const head = add(neck, mul(headUp, L['neck-head']))
  const nose = add(head, mul(face, L['head-nose']))
  const eyes = add(lerp(head, nose, 0.55), [0, 0.03, 0])
  const gaze = s.lookAt ? norm(sub(s.lookAt, eyes)) : face

  // 骨盤
  const tilt = rad(s.pelvisTilt ?? lean * 0.5)
  const pf0 = fwd(s.yaw)
  const pelvisFront = s.pelvisFront ? norm(s.pelvisFront) : norm(sub(mul(pf0, Math.cos(tilt)), mul(UP, Math.sin(tilt))))
  const pelvisUp = s.pelvisUp ? norm(s.pelvisUp) : norm(add(mul(UP, Math.cos(tilt)), mul(pf0, Math.sin(tilt))))
  const pelvisRight = norm(cross(pelvisFront, pelvisUp))
  const hara = add(hip, mul(pelvisFront, L['hip-hara']))
  const hipjoint = (sign) => add(hip, mul(norm(sub(mul(pelvisRight, 0.09 * sign), mul(pelvisUp, 0.07))), L['hip-hipjoint']))

  const j = { head, nose, neck, hip, hara }
  for (const [side, sign] of [
    ['l', -1],
    ['r', 1],
  ]) {
    j[`shoulder_${side}`] = shoulder(sign)
    j[`hipjoint_${side}`] = hipjoint(sign)
    // 脚
    const leg = s.legs[side]
    const hj = j[`hipjoint_${side}`]
    if (leg.kneel) {
      // 膝を床（y=0.06）に着く。膝は股関節から大腿の長さの所で、指定の点の方向
      const kneeY = 0.06
      const dy = hj[1] - kneeY
      let knee
      if (dy >= L.thigh) {
        warnings.push(`${label} ${side} 膝：腰が高すぎて膝が床に届きません`)
        knee = [hj[0], hj[1] - L.thigh, hj[2]]
      } else {
        const horiz = Math.sqrt(L.thigh * L.thigh - dy * dy)
        const u = norm([leg.kneel[0] - hj[0], 0, leg.kneel[1] - hj[2]])
        knee = [hj[0] + u[0] * horiz, kneeY, hj[2] + u[2] * horiz]
      }
      // すねは後ろへ（腰の下の方へ、または back の向き）。つま先を立てるときは足首を上げる
      const back = leg.back ? norm([leg.back[0], 0, leg.back[2]]) : norm([hj[0] - knee[0], 0, hj[2] - knee[2]])
      const ankleY = leg.tucked ? 0.17 : 0.075
      const h = Math.sqrt(Math.max(0, L.shin * L.shin - (ankleY - kneeY) ** 2))
      const ankle = [knee[0] + back[0] * h, ankleY, knee[2] + back[2] * h]
      const toeDir = leg.tucked ? norm(add(mul(back, 0.42), DOWN)) : norm(add(back, [0, -0.15, 0]))
      j[`knee_${side}`] = knee
      j[`ankle_${side}`] = ankle
      j[`toe_${side}`] = add(ankle, mul(toeDir, L.foot))
    } else {
      const ankle = leg.ankle
      const toeYaw = leg.toe ?? s.yaw
      // つま先が床（y≈0.02）に着く傾き
      const drop = Math.max(-0.12, Math.min(L.foot * 0.98, ankle[1] - 0.02 - (leg.toeUp ?? 0)))
      const flat = Math.sqrt(L.foot * L.foot - drop * drop)
      const toeDir = norm([Math.cos(rad(toeYaw)) * flat, -drop, Math.sin(rad(toeYaw)) * flat])
      const pole = leg.pole ?? norm(add(fwd(toeYaw), mul(pelvisRight, 0.15 * sign)))
      const [knee, a2] = ik(hj, ankle, L.thigh, L.shin, pole, `${label} ${side}脚`)
      j[`knee_${side}`] = knee
      j[`ankle_${side}`] = a2
      j[`toe_${side}`] = add(a2, mul(toeDir, L.foot))
    }
    // 腕
    const arm = s.arms[side]
    const sh = j[`shoulder_${side}`]
    // soft：つかんでいない手（位置は目安）。届かなければ肩からの向きはそのままに、届く所まで寄せる
    const reach = L['upper-arm'] + L.forearm + L.hand - 0.02
    const hand = arm.soft && len(sub(arm.hand, sh)) > reach ? add(sh, mul(norm(sub(arm.hand, sh)), reach)) : arm.hand
    const dir = arm.dir ? norm(arm.dir) : norm(sub(hand, sh))
    const wristTarget = sub(hand, mul(dir, L.hand))
    const pole = arm.pole ?? norm(add(DOWN, add(mul(right, 0.5 * sign), mul(front, -0.2))))
    const [elbow, wrist] = ik(sh, wristTarget, L['upper-arm'], L.forearm, pole, `${label} ${side}腕`)
    j[`elbow_${side}`] = elbow
    j[`wrist_${side}`] = wrist
    j[`hand_${side}`] = add(wrist, mul(dir, L.hand))
  }
  return { joints: j, gaze }
}

/** 立ち姿の腰の高さ：膝を少し緩めた自然体 */
export const STAND_HIP = 0.97

/** 跪座（膝を床に着き、つま先を立てて踵に腰を下ろす）。center は両膝の間の床の点 */
export function kiza({ center, yaw, spread = 0.4, back = 0.3, hipY = 0.4, lean = 0, tucked = true, ...rest }, label) {
  const f = fwd(yaw)
  const r = rightOf(yaw)
  const c = [center[0], 0, center[1]]
  const kneeL = add(c, mul(r, -spread / 2))
  const kneeR = add(c, mul(r, spread / 2))
  const hip = add(sub(c, mul(f, back)), [0, hipY, 0])
  return figure(
    {
      hip,
      yaw,
      lean,
      legs: { l: { kneel: [kneeL[0], kneeL[2]], tucked }, r: { kneel: [kneeR[0], kneeR[2]], tucked } },
      ...rest,
    },
    label,
  )
}

/** 正座（膝を床に着き、足の甲を寝かせて踵の上に腰を下ろす）。center は両膝の間の床の点 */
export function seiza(s, label) {
  return kiza({ spread: 0.26, back: 0.37, hipY: 0.33, tucked: false, ...s }, label)
}

/** うつ伏せ（腹這い）。hip は床の点 [x, z]、headYaw は頭の方向。顔は faceSide（'l'|'r'）の側へ向けて頬を畳に */
export function prone({ hip, headYaw, faceSide = 'l', arms, legSpread = 0.08 }, label) {
  const spine = fwd(headYaw)
  const front = DOWN
  const right = norm(cross(front, spine))
  const h = [hip[0], 0.13, hip[1]]
  const pelvisRight = right
  const legs = {}
  for (const [side, sign] of [
    ['l', -1],
    ['r', 1],
  ]) {
    const hj = add(h, mul(norm(sub(mul(pelvisRight, 0.09 * sign), mul(spine, 0.07))), L['hip-hipjoint']))
    const ankle = add(add(hj, mul(spine, -0.835)), add(mul(right, legSpread * sign), [0, 0.09 - hj[1], 0]))
    legs[side] = { ankle, toe: yawOf(mul(spine, -1)), toeUp: 0.05, pole: [0, 1, 0] }
  }
  const out = figure(
    {
      hip: h,
      yaw: headYaw,
      spine,
      front,
      pelvisUp: spine,
      pelvisFront: DOWN,
      faceAt: add(add(h, mul(spine, 0.9)), add(mul(right, faceSide === 'l' ? -0.6 : 0.6), [0, -0.05, 0])),
      legs,
      arms,
    },
    label,
  )
  // 足の甲を床に：つま先は後ろへ寝かせる
  for (const side of ['l', 'r']) {
    const a = out.joints[`ankle_${side}`]
    out.joints[`toe_${side}`] = add(a, mul(norm(add(mul(spine, -1), [0, -0.12, 0])), L.foot))
  }
  return out
}

/**
 * 仰向け（背中を畳に着ける）。hip は床の点 [x, z]、headYaw は頭の方向。kneesUp なら両膝を立てる（足裏を畳に）。
 * 仰向けでは体の右は rightOf(headYaw) の逆になる（うつ伏せと左右が入れ替わる）
 */
export function supine({ hip, headYaw, kneesUp = true, arms, lookAt }, label) {
  const spine = fwd(headYaw)
  const front = UP
  const right = norm(cross(front, spine))
  const h = [hip[0], 0.13, hip[1]]
  const legs = {}
  for (const [side, sign] of [
    ['l', -1],
    ['r', 1],
  ]) {
    const hj = add(h, mul(norm(sub(mul(right, 0.09 * sign), mul(spine, 0.07))), L['hip-hipjoint']))
    const ankle = kneesUp
      ? add(add(hj, mul(spine, -0.55)), add(mul(right, 0.05 * sign), [0, 0.08 - hj[1], 0]))
      : add(add(hj, mul(spine, -0.835)), add(mul(right, 0.06 * sign), [0, 0.09 - hj[1], 0]))
    legs[side] = { ankle, toe: yawOf(mul(spine, -1)), pole: kneesUp ? UP : [0, 1, 0] }
  }
  return figure(
    {
      hip: h,
      yaw: headYaw,
      spine,
      front,
      pelvisUp: spine,
      pelvisFront: UP,
      faceAt: add(add(h, mul(spine, 0.9)), [0, 0.6, 0]),
      ...(lookAt ? { lookAt } : {}),
      legs,
      arms,
    },
    label,
  )
}

const yawOf = (v) => (Math.atan2(v[2], v[0]) * 180) / Math.PI

/** 数値を 1mm に丸める */
function round(fig) {
  const r = (v) => v.map((x) => Math.round(x * 1000) / 1000)
  return { joints: Object.fromEntries(Object.entries(fig.joints).map(([k, v]) => [k, r(v)])), gaze: r(norm(fig.gaze)) }
}

/** pose3d.json を書き出す。既存ファイルは --force 無しでは上書きしない（手で直した動きを守る） */
export function writePose3D(id, keyframes, { note = '', source = 'estimate' } = {}) {
  const out = path.join(ROOT, 'content', 'poses3d', `${id}.pose3d.json`)
  if (existsSync(out) && !process.argv.includes('--force')) {
    console.error(`${path.relative(process.cwd(), out)} は既にあります（手での修正を守るため上書きしません。--force で上書き）`)
    process.exit(1)
  }
  const data = {
    id,
    source,
    note,
    keyframes: keyframes.map((k) => ({ ...k, tori: round(k.tori), uke: round(k.uke) })),
  }
  const json = JSON.stringify(data, null, 2).replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, '[$1, $2, $3]')
  writeFileSync(out, json + '\n')
  console.log(`書き出し: ${path.relative(process.cwd(), out)}`)
  for (const w of warnings) console.log(`  注意: ${w}`)
}
