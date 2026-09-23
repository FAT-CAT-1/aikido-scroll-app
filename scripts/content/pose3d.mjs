// 3D ポーズ（content/poses3d/{id}.pose3d.json）の定義と検証（docs/animation-spec.md §13）
//
// - 単位はメートル、y が上、床は y=0。取りは最初 +x を向き、受けは -x を向く
// - 関節 21 点は解剖学の左右（_l / _r）。画面上の手前（f）／奥（b）は実行時にカメラからの近さで決める
// - kf は技の原稿（content/techniques/{id}.md）の kf と id・at が一致する。原稿に無い「間の kf」は between: true を付けて足せる
// - contacts：その kf と次の kf の両方に同じ組があれば、その区間は手をつかんだ相手の部位に付けたままにする

import { EASE_RE } from './pose.mjs'

export const JOINTS3D = /** @type {const} */ ([
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
])

/** [親, 子, 骨長のキー]。親が先に来る順（腰＝丹田から順につなぐ） */
export const BONES3D = /** @type {const} */ ([
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
])

const ROLES = ['tori', 'uke']
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum)
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** "tori.hand_r" → { role, joint }（不正なら null） */
export function parseJointRef(ref) {
  if (typeof ref !== 'string') return null
  const [role, joint] = ref.split('.')
  return ROLES.includes(role) && JOINTS3D.includes(joint) ? { role, joint } : null
}

function validContactTarget(on) {
  if (typeof on === 'string') return !!parseJointRef(on)
  if (!Array.isArray(on) || on.length !== 3) return false
  const a = parseJointRef(on[0])
  const b = parseJointRef(on[1])
  return !!a && !!b && a.role === b.role && isNum(on[2]) && on[2] >= 0 && on[2] <= 1
}

/**
 * 構造の検証。致命的でなければ true（原稿との kf 不一致はエラーとして報告するが出力は続ける）
 * @param {{ rel: string, id: string, pose: any, technique: any, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function validatePose3D({ rel, id, pose, technique, diag }) {
  const loc = `${rel}:1`
  if (!pose || typeof pose !== 'object') {
    diag.error(loc, 'JSON のオブジェクトではありません')
    return false
  }
  if (pose.id !== id) diag.error(loc, `id が "${pose.id}" です（ファイル名に合わせて "${id}"）`)
  if (!Array.isArray(pose.keyframes) || pose.keyframes.length < 2) {
    diag.error(loc, 'keyframes が2つ以上必要です')
    return false
  }
  let ok = true
  let prevAt = -1
  pose.keyframes.forEach((kf, i) => {
    const where = `kf[${i}]${kf?.id ? `（${kf.id}）` : ''}`
    if (typeof kf?.id !== 'string' || !kf.id) {
      diag.error(loc, `${where} id がありません`)
      ok = false
    }
    if (!isNum(kf?.at) || kf.at < 0 || kf.at > 1) {
      diag.error(loc, `${where} at は 0〜1 の数`)
      ok = false
    } else if (kf.at <= prevAt) {
      diag.error(loc, `${where} at が前の kf 以下です（時刻の順に並べる）`)
      ok = false
    } else prevAt = kf.at
    if (kf?.ease !== undefined && (typeof kf.ease !== 'string' || !EASE_RE.test(kf.ease))) {
      diag.error(loc, `${where} ease は GSAP の名前（例 power2.inOut）`)
      ok = false
    }
    for (const role of ROLES) {
      const fig = kf?.[role]
      if (!fig || typeof fig !== 'object' || !fig.joints) {
        diag.error(loc, `${where} ${role}.joints がありません`)
        ok = false
        continue
      }
      for (const j of JOINTS3D) {
        if (!isVec(fig.joints[j])) {
          diag.error(loc, `${where} ${role}.joints.${j} は [x, y, z] の数`)
          ok = false
        }
      }
      if (!isVec(fig.gaze)) {
        diag.error(loc, `${where} ${role}.gaze は [x, y, z] の向き`)
        ok = false
      }
    }
    for (const c of kf?.contacts ?? []) {
      const hand = parseJointRef(c?.hand)
      if (!hand || !hand.joint.startsWith('hand_') || !validContactTarget(c?.on)) {
        diag.error(loc, `${where} contacts の形が不正です（{ "hand": "tori.hand_r", "on": "uke.wrist_r" | ["uke.shoulder_r", "uke.elbow_r", 0.85] }）`)
        ok = false
      }
    }
  })
  if (!ok) return false

  // 原稿の kf と突き合わせる（間の kf は除く）
  if (technique) {
    const main = pose.keyframes.filter((k) => !k.between)
    const a = technique.keyframes.map((k) => `${k.id}@${k.at}`)
    const b = main.map((k) => `${k.id}@${k.at}`)
    if (a.join() !== b.join()) {
      const onlyMd = a.filter((x) => !b.includes(x))
      const onlyPose = b.filter((x) => !a.includes(x))
      diag.error(loc, `原稿と kf id/at が一致しません（原稿のみ: ${onlyMd.join(' ') || 'なし'} ／ pose3d のみ: ${onlyPose.join(' ') || 'なし'}）`)
    }
    if (pose.keyframes[0].between || pose.keyframes.at(-1).between) diag.error(loc, '最初と最後の kf は原稿の kf にする（between にしない）')
  } else {
    diag.warn(loc, `対応する原稿 ${id}.md がありません`)
  }
  return true
}

/**
 * 形の警告：骨長が標準から ±5% 超／関節が床より下／取りと受けの頭が近すぎる／視線が単位ベクトルでない
 * @param {{ rel: string, pose: any, body: any, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function checkPose3DWarnings({ rel, pose, body, diag }) {
  const loc = `${rel}:1`
  const bones = body?.bones ?? {}
  for (const kf of pose.keyframes) {
    for (const role of ROLES) {
      const j = kf[role].joints
      for (const [a, b, key] of BONES3D) {
        const std = bones[key]
        if (!std) continue
        const len = dist(j[a], j[b])
        if (Math.abs(len - std) / std > 0.05) diag.warn(loc, `kf=${kf.id} ${role} ${a}–${b} の長さ ${len.toFixed(3)}m が標準 ${std}m から 5% 超ずれています`)
      }
      for (const name of JOINTS3D) {
        if (j[name][1] < -0.02) diag.warn(loc, `kf=${kf.id} ${role}.${name} が床より下です（y=${j[name][1].toFixed(3)}）`)
      }
      const g = kf[role].gaze
      if (Math.abs(Math.hypot(...g) - 1) > 0.05) diag.warn(loc, `kf=${kf.id} ${role}.gaze は長さ 1 の向きにする`)
    }
    const d = dist(kf.tori.joints.head, kf.uke.joints.head)
    if (d < 0.25) diag.warn(loc, `kf=${kf.id} 取りと受けの頭が近すぎます（${d.toFixed(2)}m）`)
  }
}
