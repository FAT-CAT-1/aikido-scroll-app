// ポーズデータ（content/poses/{id}.pose.json）の検証（animation-spec §3, §10）

/** GSAP の ease 名（知らない名前だと実行時に技のアニメが止まるので、ビルドで弾く。3D と共通。D-44） */
export const EASE_RE = /^(?:none|(?:power[0-4]|sine|expo|circ|back|elastic|bounce)(?:\.(?:in|out|inOut))?(?:\(\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\))?)$/

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

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * 形の妥当性の警告（animation-spec §3 制約・§10 警告、backlog T14）
 * - 骨長: 標準骨長（_body.json）と、最初の kf からの変化がそれぞれ ±15% を超える
 * - 関節が地面（ground）より下
 * - 取りと受けの頭の距離が 60 未満（重なりすぎ）
 * - hara_dir が体の正面（facing）から 90° 以上ずれている
 * @param {{ rel: string, pose: any, body: any, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function checkPoseWarnings({ rel, pose, body, diag }) {
  const loc = `${rel}:1`
  const segments = body?.segments ?? []
  const first = pose.keyframes[0]
  for (const kf of pose.keyframes) {
    for (const role of ['tori', 'uke']) {
      const who = `kf=${kf.id} ${role === 'tori' ? '取り' : '受け'}`
      const j = kf[role].joints
      for (const [a, b, boneKey] of segments) {
        const len = dist(j[a], j[b])
        const std = body.bones[boneKey]
        if (std && Math.abs(len - std) / std > 0.15) {
          diag.warn(loc, `${who}: 骨 ${a}–${b} が ${len.toFixed(0)}（標準 ${std} の ±15% 超）`)
          continue
        }
        const base = dist(first[role].joints[a], first[role].joints[b])
        if (base > 0 && Math.abs(len - base) / base > 0.15) {
          diag.warn(loc, `${who}: 骨 ${a}–${b} が kf=${first.id} の ${base.toFixed(0)} から ${len.toFixed(0)} に変化（±15% 超・伸び縮み）`)
        }
      }
      const below = JOINTS.filter((name) => j[name][1] > pose.ground)
      if (below.length) diag.warn(loc, `${who}: 地面 y=${pose.ground} より下の関節 ${below.join(', ')}`)
      if (Math.abs(kf[role].hara_dir) >= 90) diag.warn(loc, `${who}: hara_dir=${kf[role].hara_dir} が体の正面（facing）から 90° 以上ずれています`)
    }
    const headGap = dist(kf.tori.joints.head, kf.uke.joints.head)
    if (headGap < 60) diag.warn(loc, `kf=${kf.id}: 取りと受けの頭の距離が ${headGap.toFixed(0)}（60 未満・重なりすぎ）`)
  }
}

/**
 * 構造・kf 突合の検証（エラー）。骨長・地面などの警告は checkPoseWarnings。
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
    if (kf.ease !== undefined && (typeof kf.ease !== 'string' || !EASE_RE.test(kf.ease))) err(`${w}: ease は GSAP の名前（例 power2.inOut）`)
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
    // エラーとして報告する（CI は失敗）が、構造が正しければ pose は出力し、執筆途中でもアニメは確認できるようにする
    diag.error(loc, `原稿と kf id/at が一致しません（原稿のみ: ${onlyMd.join(' ') || 'なし'} ／ pose のみ: ${onlyPose.join(' ') || 'なし'}）`)
  }
  return ok
}
