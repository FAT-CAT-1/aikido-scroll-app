// ポーズデータ（content/poses/{id}.pose.json）の検証（animation-spec §3, §10）

export const JOINTS = /** @type {const} */ ([
  'head',
  'neck',
  'shoulder_f',
  'shoulder_b',
  'elbow_f',
  'elbow_b',
  'wrist_f',
  'wrist_b',
  'hip',
  'hipjoint_f',
  'hipjoint_b',
  'knee_f',
  'knee_b',
  'ankle_f',
  'ankle_b',
])

export const VIEWBOX = [1000, 600]
export const GROUND = 520

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * 構造・kf 突合の検証（エラー）。骨長・地面などの警告は checkPoseWarnings（T14）。
 * @param {{ rel: string, id: string, pose: any, technique: any | null, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function validatePose({ rel, id, pose, technique, diag }) {
  const loc = `${rel}:1`
  let ok = true
  const err = (msg) => {
    ok = false
    diag.error(loc, msg)
  }
  if (pose.id !== id) err(`id「${pose.id}」がファイル名「${id}」と一致しません`)
  if (!Array.isArray(pose.viewBox) || pose.viewBox[0] !== VIEWBOX[0] || pose.viewBox[1] !== VIEWBOX[1]) err(`viewBox は [${VIEWBOX}] 固定です`)
  if (!isNum(pose.ground)) err('ground（地面の y）がありません')
  if (!Array.isArray(pose.keyframes) || pose.keyframes.length === 0) {
    err('keyframes がありません')
    return false
  }

  pose.keyframes.forEach((kf, i) => {
    const w = `kf[${i}]=${kf?.id}`
    if (!isNum(kf.at)) err(`${w}: at が数値ではありません`)
    if (i > 0 && !(kf.at > pose.keyframes[i - 1].at)) err(`${w}: at が単調増加していない、または重複しています`)
    if (kf.ease !== undefined && typeof kf.ease !== 'string') err(`${w}: ease は文字列（例 power2.inOut）`)
    for (const role of ['tori', 'uke']) {
      const r = kf[role]
      if (!r) {
        err(`${w}: ${role} がありません`)
        continue
      }
      if (r.facing !== 1 && r.facing !== -1) err(`${w} ${role}: facing は 1 か -1`)
      for (const key of ['head_dir', 'gaze', 'hara_dir']) if (!isNum(r[key])) err(`${w} ${role}: ${key} が数値ではありません`)
      const missing = JOINTS.filter((j) => !Array.isArray(r.joints?.[j]) || r.joints[j].length !== 2 || !r.joints[j].every(isNum))
      if (missing.length) err(`${w} ${role}: 関節の欠落・不正 ${missing.join(', ')}（15関節必須）`)
      const extra = Object.keys(r.joints ?? {}).filter((j) => !JOINTS.includes(j))
      if (extra.length) diag.warn(loc, `${w} ${role}: 規定外の関節 ${extra.join(', ')}`)
    }
  })

  if (!technique) {
    diag.warn(loc, `対応する原稿 ${id}.md がありません`)
    return ok
  }
  const mdKfs = technique.keyframes.map((k) => `${k.id}@${k.at}`)
  const poseKfs = pose.keyframes.map((k) => `${k.id}@${k.at}`)
  const onlyMd = mdKfs.filter((k) => !poseKfs.includes(k))
  const onlyPose = poseKfs.filter((k) => !mdKfs.includes(k))
  if (onlyMd.length || onlyPose.length || mdKfs.join() !== poseKfs.join()) {
    err(`原稿と kf id/at が一致しません（原稿のみ: ${onlyMd.join(' ') || 'なし'} ／ pose のみ: ${onlyPose.join(' ') || 'なし'}）`)
  }
  return ok
}
