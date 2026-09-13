// 技ファイルの見出し解析・攻撃法の差分・構造検証・pose 突合（content-spec §2, §5, §6 / animation-spec §3, §10）
import { describe, expect, it } from 'vitest'
import { Diagnostics } from '../../scripts/content/diagnostics.mjs'
import { createRenderer } from '../../scripts/content/inline.mjs'
import { checkPoseWarnings, validatePose } from '../../scripts/content/pose.mjs'
import { parseTechnique } from '../../scripts/content/technique.mjs'
import { keyframeFor, nearestIndex } from '../../src/lib/content/keyframe'
import type { Technique } from '../../src/lib/content/types'
import { roleBlock, techniqueMd, THREE_KFS } from './helpers'

function parse(md: string, file = 'content/techniques/test-waza.md') {
  const diag = new Diagnostics()
  const renderer = createRenderer({ resolveTerm: (n: string) => (n === '入身' ? { kind: 'glossary', id: 'irimi' } : null), diag })
  const t = parseTechnique({ file, rel: file, raw: md, type: 'technique', renderer, diag })
  return { t: t as unknown as Technique & { links: string[] }, diag }
}

const errors = (diag: Diagnostics) => diag.items.filter((i) => i.level === 'error').map((i) => i.msg)

describe('見出し規約の解析', () => {
  it('kf × 取り/受け × 6部位 × l1〜l5 を JSON（content-spec §5）にする', () => {
    const { t, diag } = parse(techniqueMd({ kfs: THREE_KFS }))
    expect(errors(diag)).toEqual([])
    expect(diag.warnCount).toBe(0)
    expect(t.keyframes.map((k) => `${k.id}@${k.at}`)).toEqual(['kamae@0', 'contact@0.4', 'osae@1'])
    const kf = t.keyframes[1]!
    expect(Object.keys(kf.tori)).toEqual(['eye', 'face', 'shoulder', 'hara', 'knee', 'foot'])
    expect(kf.uke.hara.l1).toBe('受け腹（帯）の要点')
    expect(kf.tori.eye.l4_html).toContain('誤り：')
    expect(kf.tori.eye.l5_html).toContain('class="t-v"')
    expect(t.summary_html).toContain('data-term="irimi"')
    expect(t.terms).toEqual(['irimi'])
    expect(t.sources.shinsa).toEqual({ name: '審査要項', url: 'https://example.org/shinsa' })
  })

  it('id がファイル名と違うとエラー', () => {
    const { diag } = parse(techniqueMd({ id: 'other', kfs: THREE_KFS }))
    expect(errors(diag).some((m) => m.includes('ファイル名'))).toBe(true)
  })

  it('at が単調増加でないとエラー', () => {
    const kfs = [THREE_KFS[0]!, { ...THREE_KFS[2]!, at: 0.3 }, { ...THREE_KFS[1]!, at: 0.2 }]
    const { diag } = parse(techniqueMd({ kfs }))
    expect(errors(diag).some((m) => m.includes('単調増加'))).toBe(true)
  })

  it('部位の欠落・順序違い・受けの欠落はエラー', () => {
    const base = techniqueMd({ kfs: THREE_KFS })
    const missingPart = base.replace(/\*\*膝\*\*\n(- l\d: .*\n){5}/, '')
    expect(errors(parse(missingPart).diag).some((m) => m.includes('部位の欠落'))).toBe(true)

    const swapped = base.replace('**目**', '**__EYE__**').replace('**顔**', '**目**').replace('**__EYE__**', '**顔**')
    expect(errors(parse(swapped).diag).some((m) => m.includes('順序'))).toBe(true)

    const noUke = base.replace(/#### 受け[\s\S]*?(?=### \[kf\] contact)/, '')
    expect(errors(parse(noUke).diag).some((m) => m.includes('「受け」がありません'))).toBe(true)
  })

  it('l1〜l5 の欠落はエラー、l4 に「誤り：」「修正：」が無いと警告', () => {
    const base = techniqueMd({ kfs: THREE_KFS })
    const noL3 = base.replace('- l3: 取り目の理由はこうである。\n', '')
    expect(errors(parse(noL3).diag).some((m) => m.includes('l3 がありません'))).toBe(true)
    const badL4 = base.replace('- l4: 誤り：取り目を固める。修正：取り目を緩める。', '- l4: 取り目を固めない。')
    expect(parse(badL4).diag.items.some((i) => i.level === 'warn' && i.msg.includes('誤り：'))).toBe(true)
  })

  it('文字数: 上限超は警告、+10% 超はエラー（l1=20字）', () => {
    const base = techniqueMd({ kfs: THREE_KFS })
    const warnMd = base.replace('- l1: 取り目の要点', `- l1: ${'あ'.repeat(21)}`)
    const w = parse(warnMd).diag
    expect(w.items.some((i) => i.level === 'warn' && i.msg.includes('上限20字超'))).toBe(true)
    const errMd = base.replace('- l1: 取り目の要点', `- l1: ${'あ'.repeat(23)}`)
    expect(errors(parse(errMd).diag).some((m) => m.includes('+10%超'))).toBe(true)
  })

  it('部位見出しの前に空行が無い（前の l5 に吸い込まれる）とエラー', () => {
    const base = techniqueMd({ kfs: THREE_KFS })
    const lazy = base.replace('師範により異なる。}}\n\n**顔**', '師範により異なる。}}\n**顔**')
    expect(errors(parse(lazy).diag).some((m) => m.includes('空行'))).toBe(true)
  })
})

describe('攻撃法バリエーション（overrides）', () => {
  const contact = { id: 'contact', label: '接触', at: 0.4, l2: '片手取りでの接触をこうする。' }
  const variation = `
## 攻撃法バリエーション
### [attack] katate-dori | 片手取り
overrides: [contact]
片手首を取られた場合の差分。
#### [kf] contact | 接触 | at=0.4
##### 取り
${roleBlock('取り', contact, 5).split('\n').slice(1).join('\n')}

${roleBlock('受け', contact, 5)}
`
  it('overrides の kf を丸ごと置き換える（keyframeFor）', () => {
    const { t, diag } = parse(techniqueMd({ kfs: THREE_KFS, attacks: ['shomen-uchi', 'katate-dori'], extra: variation }))
    expect(errors(diag)).toEqual([])
    expect(t.attack_overrides['katate-dori']!.label).toBe('片手取り')
    expect(keyframeFor(t, 'katate-dori', 1)!.tori.eye.l2_html).toContain('片手取りでの接触')
    expect(keyframeFor(t, 'shomen-uchi', 1)!.tori.eye.l2_html).not.toContain('片手取り')
    expect(keyframeFor(t, 'katate-dori', 0)!.id).toBe('kamae')
  })

  it('overrides に書いた kf が本文に無い／at が違うとエラー', () => {
    const missing = variation.replace('overrides: [contact]', 'overrides: [contact, osae]')
    expect(errors(parse(techniqueMd({ kfs: THREE_KFS, attacks: ['shomen-uchi', 'katate-dori'], extra: missing })).diag).some((m) => m.includes('本文にありません'))).toBe(true)
    const wrongAt = variation.replace('#### [kf] contact | 接触 | at=0.4', '#### [kf] contact | 接触 | at=0.5')
    expect(errors(parse(techniqueMd({ kfs: THREE_KFS, attacks: ['shomen-uchi', 'katate-dori'], extra: wrongAt })).diag).some((m) => m.includes('一致しません'))).toBe(true)
  })
})

describe('nearestIndex（現在kf）', () => {
  const kfs = [{ at: 0 }, { at: 0.4 }, { at: 1 }]
  it('|progress − at| が最小の kf。同距離なら前の kf', () => {
    expect(nearestIndex(kfs, 0.1)).toBe(0)
    expect(nearestIndex(kfs, 0.3)).toBe(1)
    expect(nearestIndex(kfs, 0.2)).toBe(0)
    expect(nearestIndex(kfs, 0.95)).toBe(2)
  })
})

describe('pose.json の検証と原稿との突合', () => {
  const figure = (x: number) => ({
    facing: 1,
    head_dir: 0,
    gaze: 0,
    hara_dir: 0,
    joints: {
      head: [x, 130], neck: [x, 175], shoulder_f: [x + 16, 183], shoulder_b: [x - 16, 183],
      elbow_f: [x + 20, 243], elbow_b: [x - 20, 243], wrist_f: [x + 25, 298], wrist_b: [x - 25, 298],
      hip: [x, 300], hipjoint_f: [x + 12, 305], hipjoint_b: [x - 12, 305],
      knee_f: [x + 15, 420], knee_b: [x - 15, 420], ankle_f: [x + 15, 512], ankle_b: [x - 15, 512],
    },
  })
  const pose = (ats: [string, number][]) => ({
    id: 'test-waza',
    viewBox: [1000, 600],
    ground: 520,
    keyframes: ats.map(([id, at]) => ({ id, at, tori: figure(400), uke: { ...figure(600), facing: -1 } })),
  })
  const technique = { keyframes: THREE_KFS.map((k) => ({ id: k.id, at: k.at })) }

  it('kf id/at が原稿と一致すればエラーなし', () => {
    const diag = new Diagnostics()
    expect(validatePose({ rel: 'p.json', id: 'test-waza', pose: pose([['kamae', 0], ['contact', 0.4], ['osae', 1]]), technique, diag })).toBe(true)
    expect(diag.errorCount).toBe(0)
  })

  it('原稿と kf が食い違うとエラー（pose の構造は正しいので出力は可）', () => {
    const diag = new Diagnostics()
    const ok = validatePose({ rel: 'p.json', id: 'test-waza', pose: pose([['kamae', 0], ['contact', 0.5], ['osae', 1]]), technique, diag })
    expect(ok).toBe(true)
    expect(errors(diag).some((m) => m.includes('一致しません'))).toBe(true)
  })

  it('関節の欠落・at の重複はエラーで出力しない', () => {
    const p = pose([['kamae', 0], ['contact', 0], ['osae', 1]])
    delete (p.keyframes[0]!.tori.joints as Record<string, unknown>).knee_b
    const diag = new Diagnostics()
    expect(validatePose({ rel: 'p.json', id: 'test-waza', pose: p, technique, diag })).toBe(false)
    expect(errors(diag).some((m) => m.includes('knee_b'))).toBe(true)
    expect(errors(diag).some((m) => m.includes('単調増加'))).toBe(true)
  })

  it('骨長 ±15%・地面より下・頭の重なり・帯の向きを警告（T14）', () => {
    const body = { bones: { 'knee-ankle': 110 }, segments: [['knee_f', 'ankle_f', 'knee-ankle']] }
    const p = pose([['kamae', 0], ['contact', 0.4], ['osae', 1]])
    const k = p.keyframes[1]!
    k.tori.joints.ankle_f = [415, 560]
    k.uke.joints.head = [410, 130]
    k.uke.hara_dir = 120
    const diag = new Diagnostics()
    checkPoseWarnings({ rel: 'p.json', pose: p, body, diag })
    const w = diag.items.map((i) => i.msg).join('\n')
    expect(w).toMatch(/骨 knee_f–ankle_f/)
    expect(w).toMatch(/地面/)
    expect(w).toMatch(/頭の距離/)
    expect(w).toMatch(/hara_dir=120/)
  })
})
