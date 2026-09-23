// 3D ポーズの時間補間（docs/animation-spec.md §13-3）
//
// 進捗 0〜1 の姿勢を kf から計算する。2D（timeline.ts）と同じく全体の長さを 1 とし、kf の at を時刻にする。
// - 骨の向きを球面補間し、腰（丹田）から標準の骨長でつなぐ → kf の間でも手足が伸び縮みしない
// - 脚は足首の位置を補間して膝を解く（IK）→ 着いた足は滑らず、踏み出す足は少し浮いて進む
// - contacts：前後の kf の両方にある「手 → 相手の部位」は、区間の間ずっと手を相手に付けたままにする
import { gsap } from 'gsap'
import type { Body3D, Contact3D, ContactTarget, Figure3D, Joint3D, Pose3DData, Pose3DKeyframe, Role, Vec3 } from '../content/types'
import { add, dist, lerp, normalize, reject, scale, slerpDir, sub, twoBoneIK } from './vec'

export const JOINTS3D: readonly Joint3D[] = [
  'head',
  'nose',
  'neck',
  'shoulder_l',
  'shoulder_r',
  'elbow_l',
  'elbow_r',
  'wrist_l',
  'wrist_r',
  'hand_l',
  'hand_r',
  'hip',
  'hara',
  'hipjoint_l',
  'hipjoint_r',
  'knee_l',
  'knee_r',
  'ankle_l',
  'ankle_r',
  'toe_l',
  'toe_r',
]

/** [親, 子, 骨長のキー]。親が先（scripts/content/pose3d.mjs の BONES3D と同じ） */
export const BONES3D: readonly (readonly [Joint3D, Joint3D, string])[] = [
  ['hip', 'neck', 'spine'],
  ['neck', 'head', 'neck-head'],
  ['head', 'nose', 'head-nose'],
  ['neck', 'shoulder_l', 'neck-shoulder'],
  ['shoulder_l', 'elbow_l', 'upper-arm'],
  ['elbow_l', 'wrist_l', 'forearm'],
  ['wrist_l', 'hand_l', 'hand'],
  ['neck', 'shoulder_r', 'neck-shoulder'],
  ['shoulder_r', 'elbow_r', 'upper-arm'],
  ['elbow_r', 'wrist_r', 'forearm'],
  ['wrist_r', 'hand_r', 'hand'],
  ['hip', 'hara', 'hip-hara'],
  ['hip', 'hipjoint_l', 'hip-hipjoint'],
  ['hipjoint_l', 'knee_l', 'thigh'],
  ['knee_l', 'ankle_l', 'shin'],
  ['ankle_l', 'toe_l', 'foot'],
  ['hip', 'hipjoint_r', 'hip-hipjoint'],
  ['hipjoint_r', 'knee_r', 'thigh'],
  ['knee_r', 'ankle_r', 'shin'],
  ['ankle_r', 'toe_r', 'foot'],
]

export interface Scene3D {
  tori: Figure3D
  uke: Figure3D
}

type Joints = Record<Joint3D, Vec3>
const SIDES = ['l', 'r'] as const
/** 脚の膝・足首は IK で解くので、骨の向きの補間では飛ばす */
const LEG_IK = new Set<Joint3D>(['knee_l', 'knee_r', 'ankle_l', 'ankle_r'])
/** 踏み出す足を浮かせる高さ（移動距離に応じて、最大） */
const MAX_LIFT = 0.1
/** 膝・肘が床に潜らない高さ（関節の中心。膝は膝頭の厚み、肘は腕の太さの分） */
const KNEE_MIN_Y = 0.05
const ELBOW_MIN_Y = 0.04
export const DEFAULT_EASE_3D = 'power2.inOut'

const dirOf = (j: Joints, a: Joint3D, b: Joint3D) => normalize(sub(j[b], j[a]))

/** 曲がる関節（膝・肘）が曲がっている向き：root→end の線から mid がどちらにずれているか */
function bendDir(root: Vec3, mid: Vec3, end: Vec3, fallback: Vec3): Vec3 {
  return normalize(reject(sub(mid, root), normalize(sub(end, root))), fallback)
}

function parseRef(ref: string): { role: Role; joint: Joint3D } {
  const [role, joint] = ref.split('.') as [Role, Joint3D]
  return { role, joint }
}

/** つかんだ先の点（関節、または2関節の間） */
function targetPoint(scene: Scene3D, on: ContactTarget): Vec3 {
  if (typeof on === 'string') {
    const r = parseRef(on)
    return scene[r.role].joints[r.joint]
  }
  const a = parseRef(on[0])
  const b = parseRef(on[1])
  return lerp(scene[a.role].joints[a.joint], scene[b.role].joints[b.joint], on[2])
}

const contactKey = (c: Contact3D) => `${c.hand}>${JSON.stringify(c.on)}`

/** 1体の姿勢を、kf a→b の区間の u（0〜1、イージング済み）で求める（contacts は後で当てる） */
function evalFigure(a: Figure3D, b: Figure3D, u: number, body: Body3D): Figure3D {
  const A = a.joints
  const B = b.joints
  const len = body.bones
  const out = { hip: lerp(A.hip, B.hip, u) } as Joints
  for (const [p, c, key] of BONES3D) {
    if (LEG_IK.has(c)) continue
    if (c === 'toe_l' || c === 'toe_r') continue
    out[c] = add(out[p], scale(slerpDir(dirOf(A, p, c), dirOf(B, p, c), u), len[key] ?? dist(A[p], A[c])))
  }
  for (const s of SIDES) {
    const hj = `hipjoint_${s}` as const
    const kn = `knee_${s}` as const
    const an = `ankle_${s}` as const
    const to = `toe_${s}` as const
    // 足首は位置で補間し、動く足は途中で少し浮かせる
    const moved = Math.hypot(B[an][0] - A[an][0], B[an][2] - A[an][2])
    const lift = moved > 0.05 ? Math.min(MAX_LIFT, moved * 0.3) * Math.sin(Math.PI * u) : 0
    const ankleTarget = add(lerp(A[an], B[an], u), [0, lift, 0])
    const pole = slerpDir(bendDir(A[hj], A[kn], A[an], [1, 0, 0]), bendDir(B[hj], B[kn], B[an], [1, 0, 0]), u)
    const [knee, ankle] = twoBoneIK(out[hj], ankleTarget, len.thigh ?? 0.43, len.shin ?? 0.42, pole, KNEE_MIN_Y)
    out[kn] = knee
    out[an] = ankle
    out[to] = add(ankle, scale(slerpDir(dirOf(A, an, to), dirOf(B, an, to), u), len.foot ?? 0.19))
  }
  // 腕は骨の向きの補間で求めるので、肘が床に潜るときだけ手首の位置を保って解き直す
  for (const s of SIDES) {
    const sh = `shoulder_${s}` as const
    const el = `elbow_${s}` as const
    const wr = `wrist_${s}` as const
    const ha = `hand_${s}` as const
    if (out[el][1] >= ELBOW_MIN_Y) continue
    const handDir = normalize(sub(out[ha], out[wr]))
    const [elbow, wrist] = twoBoneIK(out[sh], out[wr], len['upper-arm'] ?? 0.28, len.forearm ?? 0.25, bendDir(out[sh], out[el], out[wr], [0, 1, 0]), ELBOW_MIN_Y)
    out[el] = elbow
    out[wr] = wrist
    out[ha] = add(wrist, scale(handDir, len.hand ?? 0.09))
  }
  return { joints: out, gaze: slerpDir(a.gaze, b.gaze, u) }
}

/** 手を target に付ける（肩は動かさず、肘・手首を解き直す） */
function applyContact(fig: Figure3D, handJoint: Joint3D, handTarget: Vec3, pole: Vec3, body: Body3D) {
  const s = handJoint.endsWith('_l') ? 'l' : 'r'
  const j = fig.joints
  const handDir = dirOf(j, `wrist_${s}`, `hand_${s}`)
  const wristTarget = sub(handTarget, scale(handDir, body.bones.hand ?? 0.09))
  const [elbow, wrist] = twoBoneIK(j[`shoulder_${s}`], wristTarget, body.bones['upper-arm'] ?? 0.28, body.bones.forearm ?? 0.25, pole, ELBOW_MIN_Y)
  j[`elbow_${s}`] = elbow
  j[`wrist_${s}`] = wrist
  j[`hand_${s}`] = add(wrist, scale(handDir, body.bones.hand ?? 0.09))
}

/** 区間 a→b の u（イージング済み）の場面 */
export function evalScene(a: Pose3DKeyframe, b: Pose3DKeyframe, u: number, body: Body3D): Scene3D {
  const scene: Scene3D = { tori: evalFigure(a.tori, b.tori, u, body), uke: evalFigure(a.uke, b.uke, u, body) }
  const inB = new Set((b.contacts ?? []).map(contactKey))
  for (const c of a.contacts ?? []) {
    if (!inB.has(contactKey(c))) continue
    const hand = parseRef(c.hand)
    const s = hand.joint.endsWith('_l') ? 'l' : 'r'
    // kf a・b での「手 − つかんだ点」のずれを補間して保つ
    const offA = sub(a[hand.role].joints[hand.joint], targetPoint(a, c.on))
    const offB = sub(b[hand.role].joints[hand.joint], targetPoint(b, c.on))
    const target = add(targetPoint(scene, c.on), lerp(offA, offB, u))
    const aj = a[hand.role].joints
    const bj = b[hand.role].joints
    const pole = slerpDir(bendDir(aj[`shoulder_${s}`], aj[`elbow_${s}`], aj[`wrist_${s}`], [0, -1, 0]), bendDir(bj[`shoulder_${s}`], bj[`elbow_${s}`], bj[`wrist_${s}`], [0, -1, 0]), u)
    applyContact(scene[hand.role], hand.joint, target, pole, body)
  }
  return scene
}

export interface Pose3DTimeline {
  readonly data: Pose3DData
  /** 進捗 0〜1 の場面 */
  seek(progress: number): Scene3D
}

export function createPose3DTimeline(data: Pose3DData): Pose3DTimeline {
  const kfs = [...data.keyframes].sort((a, b) => a.at - b.at)
  if (kfs.length < 2) throw new Error(`pose3d ${data.id}: keyframes が2つ以上必要です`)
  const eases = kfs.map((k) => gsap.parseEase(k.ease ?? DEFAULT_EASE_3D))
  return {
    data,
    seek(progress: number) {
      const t = Math.min(1, Math.max(0, progress))
      let i = 0
      while (i < kfs.length - 2 && t > kfs[i + 1]!.at) i++
      const a = kfs[i]!
      const b = kfs[i + 1]!
      const raw = b.at > a.at ? Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))) : 1
      return evalScene(a, b, eases[i]!(raw), data.body)
    },
  }
}

/** カメラの画角合わせに使う点：全 kf の関節と、頭の上・手足の太さの分の点 */
export function posePoints(data: Pose3DData): Vec3[] {
  const pts: Vec3[] = []
  const r = 0.09
  for (const kf of data.keyframes) {
    for (const role of ['tori', 'uke'] as const) {
      const j = kf[role].joints
      for (const p of Object.values(j)) pts.push(p, [p[0] + r, p[1], p[2]], [p[0] - r, p[1], p[2]], [p[0], p[1], p[2] + r], [p[0], p[1], p[2] - r])
      pts.push([j.head[0], j.head[1] + (data.body.radii.head ?? 0.105) + 0.02, j.head[2]])
      pts.push([j.hip[0], 0, j.hip[2]])
    }
  }
  return pts
}

/** 全 kf を含む箱（床の広さに使う） */
export function poseBounds(data: Pose3DData): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, 0, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const kf of data.keyframes) {
    for (const role of ['tori', 'uke'] as const) {
      for (const p of Object.values(kf[role].joints)) {
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i]!, p[i]!)
          max[i] = Math.max(max[i]!, p[i]!)
        }
      }
    }
  }
  // 頭の丸みと手足の太さの分だけ広げる
  const pad = 0.14
  return { min: [min[0] - pad, 0, min[2] - pad], max: [max[0] + pad, max[1] + pad, max[2] + pad] }
}
