// pose.json 初版の推定生成用ヘルパー（animation-spec §9 手順2）
// 胴・頭は角度から順運動学、四肢は足首・手首の目標位置から2リンク逆運動学で解く。
// 骨長は content/poses/_body.json を使うので、生成したポーズは骨長が一定になる。
// ※ 初版を作るためだけの道具。ディレクターが pose-editor で直した後は再実行しない（上書きになる）。

import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const BODY = JSON.parse(readFileSync(path.join(ROOT, 'content', 'poses', '_body.json'), 'utf8'))
const L = BODY.bones

const rad = (d) => (d * Math.PI) / 180
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const mul = (a, k) => [a[0] * k, a[1] * k]
const len = (a) => Math.hypot(a[0], a[1])
const norm = (a) => mul(a, 1 / (len(a) || 1))
const round = (p) => [Math.round(p[0]), Math.round(p[1])]

export const warnings = []

/**
 * 2リンク IK。root から target へ、長さ l1・l2 の関節（肘・膝）位置を返す。
 * prefer: 候補2つのうち選ぶ側（'forward' | 'back' | 'up' | 'down'）。facing で前後を解釈
 */
function ik(root, target, l1, l2, prefer, facing, label) {
  let d = len(sub(target, root))
  const maxD = l1 + l2 - 0.5
  const minD = Math.abs(l1 - l2) + 0.5
  if (d > maxD) {
    warnings.push(`${label}: 目標まで ${d.toFixed(0)} で届かない（最大 ${maxD.toFixed(0)}）→ 伸ばしきりで近似`)
    d = maxD
  } else if (d < minD) d = minD
  const u = norm(sub(target, root))
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)]
  const c1 = add(root, mul(rot(u, a), l1))
  const c2 = add(root, mul(rot(u, -a), l1))
  const score = (c) => {
    if (prefer === 'forward') return c[0] * facing
    if (prefer === 'back') return -c[0] * facing
    if (prefer === 'up') return -c[1]
    return c[1]
  }
  const joint = score(c1) >= score(c2) ? c1 : c2
  const end = add(joint, mul(norm(sub(target, joint)), l2))
  return [joint, end]
}

/**
 * 1人分のポーズ
 * @param {{
 *   facing: 1 | -1, hip?: [number, number], anchor?: [string, [number, number]],
 *   torso: number, neck?: number,
 *   head_dir?: number, gaze?: number, hara_dir?: number, lead?: 'f' | 'b',
 *   ankles?: { f?: [number, number], b?: [number, number] }, knees?: { f?: string, b?: string },
 *   legs?: { f?: [number, number], b?: [number, number] },
 *   wrists?: { f?: [number, number], b?: [number, number] }, elbows?: { f?: string, b?: string },
 *   arms?: { f?: [number, number], b?: [number, number] },
 * }} s
 *  角度の約束（度）: torso/neck は鉛直上向き=0、legs/arms（[上の骨, 下の骨]）は鉛直下向き=0。いずれも正=facing 側
 *  位置: hip を直接指定するか、anchor=['knee_f', [x,y]] で指定関節をその点に合わせる（脚は legs 指定時のみ）
 *  四肢: legs/arms は角度で順運動学、ankles/wrists は目標点へ逆運動学（anchor 適用後の絶対座標）
 */
export function figure(s, label) {
  const f = s.facing
  const up = (deg) => [f * Math.sin(rad(deg)), -Math.cos(rad(deg))]
  const down = (deg) => [f * Math.sin(rad(deg)), Math.cos(rad(deg))]
  const u = up(s.torso)
  const forward = mul([-u[1], u[0]], f) // 胴に直交し facing 側を向く単位ベクトル
  const lead = s.lead ?? 'f'
  const side = (k) => (k === lead ? 1 : -1)

  // まず腰を原点に順運動学で組み、anchor があれば平行移動する
  let joints = { hip: [0, 0] }
  joints.neck = mul(u, L['neck-hip'])
  joints.head = add(joints.neck, mul(up(s.torso + (s.neck ?? 0)), L['head-neck']))
  for (const k of ['f', 'b']) {
    joints[`shoulder_${k}`] = add(add(joints.neck, mul(u, -8)), mul(forward, 16 * side(k)))
    joints[`hipjoint_${k}`] = add(mul(u, -5), mul(forward, 12 * side(k)))
    const leg = s.legs?.[k]
    if (leg) {
      joints[`knee_${k}`] = add(joints[`hipjoint_${k}`], mul(down(leg[0]), L['hipjoint-knee']))
      joints[`ankle_${k}`] = add(joints[`knee_${k}`], mul(down(leg[1]), L['knee-ankle']))
    }
    const arm = s.arms?.[k]
    if (arm) {
      joints[`elbow_${k}`] = add(joints[`shoulder_${k}`], mul(down(arm[0]), L['shoulder-elbow']))
      joints[`wrist_${k}`] = add(joints[`elbow_${k}`], mul(down(arm[1]), L['elbow-wrist']))
    }
  }
  const offset = s.anchor ? sub(s.anchor[1], joints[s.anchor[0]]) : s.hip
  if (!offset || !Number.isFinite(offset[0])) throw new Error(`${label}: hip か anchor（legs 指定済みの関節）が必要です`)
  joints = Object.fromEntries(Object.entries(joints).map(([k, p]) => [k, add(p, offset)]))

  for (const k of ['f', 'b']) {
    if (!s.arms?.[k]) {
      if (!s.wrists?.[k]) throw new Error(`${label}: 腕${k} に arms か wrists が必要です`)
      const [elbow, wrist] = ik(joints[`shoulder_${k}`], s.wrists[k], L['shoulder-elbow'], L['elbow-wrist'], s.elbows?.[k] ?? 'down', f, `${label} 腕${k}`)
      Object.assign(joints, { [`elbow_${k}`]: elbow, [`wrist_${k}`]: wrist })
    }
    if (!s.legs?.[k]) {
      if (!s.ankles?.[k]) throw new Error(`${label}: 脚${k} に legs か ankles が必要です`)
      const [knee, ankle] = ik(joints[`hipjoint_${k}`], s.ankles[k], L['hipjoint-knee'], L['knee-ankle'], s.knees?.[k] ?? 'forward', f, `${label} 脚${k}`)
      Object.assign(joints, { [`knee_${k}`]: knee, [`ankle_${k}`]: ankle })
    }
  }
  const order = ['head', 'neck', 'shoulder_f', 'shoulder_b', 'elbow_f', 'elbow_b', 'wrist_f', 'wrist_b', 'hip', 'hipjoint_f', 'hipjoint_b', 'knee_f', 'knee_b', 'ankle_f', 'ankle_b']
  return {
    facing: f,
    head_dir: s.head_dir ?? 0,
    gaze: s.gaze ?? 0,
    hara_dir: s.hara_dir ?? 0,
    joints: Object.fromEntries(order.map((k) => [k, round(joints[k])])),
  }
}

/** 関節の位置だけ取り出す（相手の手首・肘を接触点にするとき用） */
export function jointOf(fig, name) {
  return fig.joints[name]
}

/** 画面の左右を反転した姿勢（x → 1000 − x、facing 反転。向きの角度は facing 基準なのでそのまま） */
export function mirror(fig) {
  return {
    ...fig,
    facing: -fig.facing,
    joints: Object.fromEntries(Object.entries(fig.joints).map(([k, [x, y]]) => [k, [1000 - x, y]])),
  }
}

const MAT = 508

/** 正座（腰を踵に下ろす）。knee: 手前の膝の位置 x。wrists 省略時は膝の上に手を置く */
export function seiza({ facing, kneeX, torso = 4, neck = 0, lead = 'f', wrists, elbows, gaze = -5, head_dir = 0, hara_dir = 0, sit = 1 }, label) {
  // sit=1 で踵に座る、0 に近いほど膝立ちに近づく
  const thigh = 90 - 30 * (1 - sit)
  const base = figure(
    { facing, anchor: ['knee_f', [kneeX, MAT]], torso, neck, lead, gaze, head_dir, hara_dir, legs: { f: [thigh, -94], b: [thigh - 4, -96] }, arms: { f: [20, 70], b: [16, 66] } },
    label,
  )
  if (!wrists) return base
  return figure(
    { facing, hip: base.joints.hip, torso, neck, lead, gaze, head_dir, hara_dir, legs: { f: [thigh, -94], b: [thigh - 4, -96] }, wrists, elbows },
    label,
  )
}

/** 仰向け（頭の x が headX、体は頭から dir 方向＝1 右 / -1 左へ伸びる）。膝を立てる */
export function supine({ headX, dir, y = 486, wrists, elbows, gaze = 85, head_dir = 70, knees = 40 }, label) {
  // 仰向け: facing＝足の方向（dir）とし、胴を後ろへ 88° 倒す（体の正面が上を向く）
  const facing = /** @type {1 | -1} */ (dir)
  const hip = [headX + dir * (45 + 125), y + 8]
  return figure(
    {
      facing, hip, torso: -88, neck: 4, lead: 'f', gaze, head_dir, hara_dir: 85,
      // 大腿は上前方へ（膝を立てる）、下腿は床へ下りる
      legs: { f: [90 + knees, 90 - knees * 1.2], b: [90 + knees * 0.8, 90 - knees] },
      wrists: wrists ?? { f: [hip[0] - dir * 30, y + 16], b: [hip[0] - dir * 10, y + 18] },
      elbows: elbows ?? { f: 'up', b: 'up' },
    },
    label,
  )
}

/** pose.json を書き出す（pose-editor と同じ整形）。既存ファイルは --force 無しでは上書きしない */
export async function writePose(id, keyframes) {
  const { existsSync, writeFileSync } = await import('node:fs')
  const out = path.join(ROOT, 'content', 'poses', `${id}.pose.json`)
  if (existsSync(out) && !process.argv.includes('--force')) {
    console.error(`${path.relative(process.cwd(), out)} は既にあります（エディタでの修正を守るため上書きしません。--force で上書き）`)
    process.exit(1)
  }
  const pose = { id, viewBox: [1000, 600], ground: 520, keyframes }
  writeFileSync(out, JSON.stringify(pose, null, 2).replace(/\[\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?)\s+\]/g, '[$1, $2]') + '\n')
  console.log(`書き出し: ${path.relative(process.cwd(), out)}`)
  for (const w of warnings) console.log(`  注意: ${w}`)
}
