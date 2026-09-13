// テスト用の原稿 md を組み立てる
export const PART_LABELS = ['目', '顔', '肩', '腹（帯）', '膝', '足'] as const

export interface KfSpec {
  id: string
  label: string
  at: number
  /** 部位の l2 に差し込む文（任意） */
  l2?: string
}

export function levels(prefix: string, l2?: string): string {
  return [
    `- l1: ${prefix}の要点`,
    `- l2: ${l2 ?? `${prefix}を具体的にこうする。`}`,
    `- l3: ${prefix}の理由はこうである。`,
    `- l4: 誤り：${prefix}を固める。修正：${prefix}を緩める。`,
    `- l5: {{v:${prefix}の指導は師範により異なる。}}`,
  ].join('\n')
}

export function roleBlock(role: '取り' | '受け', kf: KfSpec, headingLevel = 4): string {
  const h = '#'.repeat(headingLevel)
  const parts = PART_LABELS.map((p) => `**${p}**\n${levels(`${role}${p}`, kf.l2)}`).join('\n\n')
  return `${h} ${role}\n${parts}`
}

export function techniqueMd(opts: {
  id?: string
  kfs: KfSpec[]
  attacks?: string[]
  extra?: string
  frontmatter?: string
}): string {
  const id = opts.id ?? 'test-waza'
  const attacks = opts.attacks ?? ['shomen-uchi']
  const kfs = opts.kfs
    .map((k) => `### [kf] ${k.id} | ${k.label} | at=${k.at}\n${k.label}の状況。\n\n${roleBlock('取り', k)}\n\n${roleBlock('受け', k)}`)
    .join('\n\n')
  return `---
id: ${id}
type: technique
name_ja: テスト技
reading: てすとわざ
name_en: [Test]
aliases: [試技]
form: omote
rank: 5kyu
category: osae
default_attack: ${attacks[0]}
attacks: [${attacks.join(', ')}]
videos: []
sources:
  shinsa: 審査要項 https://example.org/shinsa
status: draft
${opts.frontmatter ?? ''}---

## 概要
[[入身]]の技。{{f:五級の科目である。@src:shinsa}}

## キーフレーム
${kfs}
${opts.extra ?? ''}
`
}

export const THREE_KFS: KfSpec[] = [
  { id: 'kamae', label: '構え', at: 0 },
  { id: 'contact', label: '接触', at: 0.4 },
  { id: 'osae', label: '抑え', at: 1 },
]
