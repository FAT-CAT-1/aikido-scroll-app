// 技・基礎ファイル（content/techniques/*.md, content/kihon/**/*.md）の構造解析と検証（content-spec §2, §5, §6）

import path from 'node:path'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { charCount } from './inline.mjs'

export const PARTS = /** @type {const} */ ([
  ['目', 'eye'],
  ['顔', 'face'],
  ['肩', 'shoulder'],
  ['腹（帯）', 'hara'],
  ['膝', 'knee'],
  ['足', 'foot'],
])
const PART_BY_LABEL = Object.fromEntries(PARTS)
const LABEL_BY_PART = Object.fromEntries(PARTS.map(([l, k]) => [k, l]))
export const ROLE_BY_LABEL = { 取り: 'tori', 受け: 'uke' }
export const LIMITS = { l1: 20, l2: 60, l3: 150, l4: 300, l5: 600 }
const LEVELS = /** @type {const} */ (['l1', 'l2', 'l3', 'l4', 'l5'])

const RANKS = ['5kyu', '4kyu', '3kyu', '2kyu', '1kyu', 'shodan', 'kihon']
const CATEGORIES = ['osae', 'nage', 'kokyu', 'kihon', 'ukemi', 'attack']
const FORMS = ['omote', 'ura', 'none']
const STATUSES = ['draft', 'review', 'approved']
const KF_HEADING = /^\[kf\]\s*([^|\s]+)\s*\|\s*([^|]+?)\s*\|\s*at\s*=\s*([0-9]*\.?[0-9]+)\s*$/
const ATTACK_HEADING = /^\[attack\]\s*([^|\s]+)\s*\|\s*(.+?)\s*$/

const structure = unified().use(remarkParse).use(remarkGfm)

export function nodeText(node) {
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(nodeText).join('')
}

export function toArray(v) {
  if (v === undefined || v === null || v === '') return []
  return Array.isArray(v) ? v.map(String) : [String(v)]
}

/** sources: { key: "名前 https://..." } → { key: { name, url? } } */
export function normalizeSources(raw) {
  const out = {}
  for (const [key, value] of Object.entries(raw ?? {})) {
    const s = String(value ?? '').trim()
    const m = s.match(/^(.*?)\s*(https?:\/\/\S+)$/)
    out[key] = m ? { name: m[1] || m[2], url: m[2] } : { name: s }
  }
  return out
}

/** 動画リンクの検証（content-spec §4） */
export function checkVideos(videos, loc, diag) {
  if (videos === undefined || videos === null) return []
  if (!Array.isArray(videos)) {
    diag.error(loc, 'videos は配列で書く')
    return []
  }
  return videos.map((v, i) => {
    const w = `videos[${i}]`
    const url = String(v?.url ?? '')
    if (!/^https:\/\/(www\.youtube\.com\/watch\?v=[\w-]+(&t=\d+s?)?|youtu\.be\/[\w-]+(\?t=\d+s?)?)$/.test(url)) {
      diag.warn(loc, `${w}: URL が YouTube の規定形式ではありません（watch?v=ID&t=秒 / youtu.be/ID?t=秒）`)
    }
    const rank = String(v?.rank ?? 'unknown')
    const dan = rank.match(/^(\d+)dan$/)
    if (rank === 'unknown') diag.warn(loc, `${w}: 講師の段位が unknown です（講師基準: 四段以上 or 師範）`)
    else if (rank !== 'shihan' && !(dan && Number(dan[1]) >= 4)) diag.warn(loc, `${w}: 講師基準（四段以上 or 師範）を満たしません: ${rank}`)
    const note = String(v?.note ?? '')
    if (!note) diag.warn(loc, `${w}: note（何が分かる動画か、30字以内）がありません`)
    else if (charCount(note) > 30) diag.warn(loc, `${w}: note が30字を超えています`)
    return { url, instructor: String(v?.instructor ?? ''), rank, note }
  })
}

function splitBy(nodes, depth) {
  const pre = []
  const groups = []
  for (const n of nodes) {
    if (n.type === 'heading' && n.depth === depth) groups.push({ heading: n, nodes: [] })
    else if (groups.length) groups[groups.length - 1].nodes.push(n)
    else pre.push(n)
  }
  return { pre, groups }
}

/**
 * @param {{
 *   file: string, rel: string, raw: string, type: 'technique' | 'kihon',
 *   renderer: ReturnType<typeof import('./inline.mjs').createRenderer>,
 *   diag: import('./diagnostics.mjs').Diagnostics,
 * }} args
 */
export function parseTechnique({ file, rel, raw, type, renderer, diag }) {
  const fm = matter(raw)
  const data = fm.data
  const body = fm.content
  const lineOffset = raw.slice(0, raw.length - body.length).split('\n').length - 1
  const locOf = (node) => `${rel}:${(node?.position?.start.line ?? 0) + lineOffset}`
  const top = `${rel}:1`
  const slice = (node) => body.slice(node.position.start.offset, node.position.end.offset)
  const sliceAll = (nodes) => nodes.map(slice).join('\n\n')

  // ---- frontmatter ----
  const id = String(data.id ?? '')
  const base = path.basename(file, '.md')
  if (id !== base) diag.error(top, `id「${id}」がファイル名「${base}」と一致しません`)
  if (data.type !== type) diag.warn(top, `type は「${type}」のはずです（現在: ${data.type}）`)
  for (const key of ['name_ja', 'reading']) if (!data[key]) diag.error(top, `${key} がありません`)
  if (!FORMS.includes(data.form)) diag.error(top, `form は ${FORMS.join('|')} のいずれか（現在: ${data.form}）`)
  if (!RANKS.includes(String(data.rank))) diag.error(top, `rank は ${RANKS.join('|')} のいずれか（現在: ${data.rank}）`)
  if (!CATEGORIES.includes(data.category)) diag.error(top, `category は ${CATEGORIES.join('|')} のいずれか（現在: ${data.category}）`)
  const attacks = toArray(data.attacks)
  const defaultAttack = data.default_attack ? String(data.default_attack) : null
  if (type === 'technique' || attacks.length || defaultAttack) {
    if (!defaultAttack) diag.error(top, 'default_attack がありません')
    if (attacks[0] !== defaultAttack) diag.error(top, `attacks の先頭（${attacks[0]}）が default_attack（${defaultAttack}）と一致しません`)
  }
  const status = String(data.status ?? 'draft')
  if (!STATUSES.includes(status)) diag.error(top, `status は ${STATUSES.join('|')} のいずれか`)
  if (status === 'approved' && !data.reviewer) diag.error(top, 'status: approved なのに reviewer が空です')
  const sources = normalizeSources(data.sources)
  const videos = checkVideos(data.videos, top, diag)

  const terms = new Set()
  const links = new Set()
  const collect = (r) => {
    r.terms.forEach((t) => terms.add(t))
    r.links.forEach((t) => links.add(t))
    return r
  }
  const renderBlocks = (nodes, where) => (nodes.length ? collect(renderer.render(sliceAll(nodes), { loc: locOf(nodes[0]), where, sources })).html : '')

  // ---- 本文 ----
  const tree = /** @type {any} */ (structure.parse(body))
  const sections = splitBy(tree.children, 2)
  if (sections.pre.some((n) => n.type !== 'heading' || n.depth !== 1)) diag.warn(locOf(sections.pre[0]), '最初の「## 」見出しより前に本文があります（無視されます）')

  let summaryHtml = ''
  let relatedHtml = ''
  /** @type {any[]} */
  let keyframes = []
  const attackOverrides = {}
  let attackSection = null
  const seenSections = new Set()

  for (const sec of sections.groups) {
    const name = nodeText(sec.heading).trim()
    if (seenSections.has(name)) diag.error(locOf(sec.heading), `「## ${name}」が重複しています`)
    seenSections.add(name)
    if (name === '概要') summaryHtml = renderBlocks(sec.nodes, '概要')
    else if (name === '関連') relatedHtml = renderBlocks(sec.nodes, '関連')
    else if (name === 'キーフレーム') keyframes = parseKeyframes(sec.nodes, 3)
    else if (name === '攻撃法バリエーション') attackSection = sec
    else diag.warn(locOf(sec.heading), `「## ${name}」は規定外の節です（概要・キーフレーム・攻撃法バリエーション・関連）`)
  }
  if (!summaryHtml) diag.warn(top, '「## 概要」がありません')
  if (!seenSections.has('キーフレーム')) diag.error(top, '「## キーフレーム」がありません')

  // kf の数・at の単調増加
  const minKf = type === 'kihon' ? 1 : 3
  if (keyframes.length < minKf) diag.error(top, `キーフレームは最低${minKf}つ必要です（現在 ${keyframes.length}）`)
  const ids = new Set()
  keyframes.forEach((kf, i) => {
    if (ids.has(kf.id)) diag.error(kf._loc, `kf id「${kf.id}」が重複しています`)
    ids.add(kf.id)
    if (i > 0 && !(kf.at > keyframes[i - 1].at)) diag.error(kf._loc, `at が単調増加していません（${keyframes[i - 1].id}=${keyframes[i - 1].at} → ${kf.id}=${kf.at}）`)
  })

  if (attackSection) parseAttacks(attackSection.nodes)
  for (const a of attacks.slice(1)) {
    if (!attackOverrides[a]) diag.warn(top, `attacks の「${a}」に対応する「### [attack] ${a} | …」がありません`)
  }

  const clean = (kf) => {
    const { _loc, ...rest } = kf
    return rest
  }

  return {
    id,
    type,
    name_ja: String(data.name_ja ?? ''),
    reading: String(data.reading ?? ''),
    name_en: toArray(data.name_en),
    aliases: toArray(data.aliases),
    form: data.form,
    rank: String(data.rank),
    category: data.category,
    default_attack: defaultAttack,
    attacks,
    summary_html: summaryHtml,
    keyframes: keyframes.map(clean),
    attack_overrides: Object.fromEntries(
      Object.entries(attackOverrides).map(([k, v]) => [k, { ...v, keyframes: Object.fromEntries(Object.entries(v.keyframes).map(([kk, kv]) => [kk, clean(kv)])) }]),
    ),
    related_html: relatedHtml,
    videos,
    sources,
    terms: [...terms].sort(),
    links: [...links].sort(),
    status,
    reviewer: data.reviewer ? String(data.reviewer) : null,
  }

  // ------------------------------------------------------------------

  function parseKeyframes(nodes, depth, where = '') {
    const { pre, groups } = splitBy(nodes, depth)
    if (pre.length) diag.warn(locOf(pre[0]), `${where}最初の kf 見出しより前の本文は無視されます`)
    return groups.map((g) => parseKeyframe(g, depth, where)).filter(Boolean)
  }

  function parseKeyframe(group, depth, where) {
    const headingText = nodeText(group.heading).trim()
    const m = headingText.match(KF_HEADING)
    if (!m) {
      diag.error(locOf(group.heading), `${where}kf 見出しの書式が違います: 「${headingText}」（### [kf] id | 名前 | at=0.0〜1.0）`)
      return null
    }
    const [, kfId, label, atStr] = m
    const at = Number(atStr)
    const loc = locOf(group.heading)
    const w = `${where}kf=${kfId}`
    if (!/^[a-z][a-z0-9-]*$/.test(kfId)) diag.error(loc, `${w}: kf id は英小文字（数字・ハイフン可）で書く`)
    if (!(at >= 0 && at <= 1)) diag.error(loc, `${w}: at は 0.0〜1.0（現在 ${atStr}）`)

    const { pre, groups } = splitBy(group.nodes, depth + 1)
    const descHtml = renderBlocks(pre, `${w} 状況説明`)
    if (!descHtml) diag.warn(loc, `${w}: 状況説明（1〜2文）がありません`)

    const roles = {}
    for (const rg of groups) {
      const roleLabel = nodeText(rg.heading).trim()
      const role = ROLE_BY_LABEL[roleLabel]
      if (!role) {
        diag.error(locOf(rg.heading), `${w}: ロール見出し「${roleLabel}」は規定外（取り／受け）`)
        continue
      }
      if (roles[role]) diag.error(locOf(rg.heading), `${w}: 「${roleLabel}」が重複しています`)
      roles[role] = parseRole(rg.nodes, `${w} ${roleLabel}`, locOf(rg.heading))
    }
    for (const [label2, role] of Object.entries(ROLE_BY_LABEL)) {
      if (!roles[role]) diag.error(loc, `${w}: 「${label2}」がありません（取り・受けは両方必須）`)
    }
    return { id: kfId, label, at, desc_html: descHtml, tori: roles.tori ?? {}, uke: roles.uke ?? {}, _loc: loc }
  }

  function parseRole(nodes, where, roleLoc) {
    /** @type {Record<string, Record<string, { src: string, node: any }>>} */
    const raw = {}
    const order = []
    let current = null
    for (const n of nodes) {
      if (n.type === 'paragraph' && n.children.length === 1 && n.children[0].type === 'strong') {
        const label = nodeText(n.children[0]).trim()
        const key = PART_BY_LABEL[label]
        if (!key) {
          diag.error(locOf(n), `${where}: 部位「${label}」は規定外（目・顔・肩・腹（帯）・膝・足）`)
          current = null
          continue
        }
        if (raw[key]) diag.error(locOf(n), `${where}: 部位「${label}」が重複しています`)
        raw[key] = raw[key] ?? {}
        order.push(key)
        current = key
        continue
      }
      if (n.type === 'list' && current) {
        parseLevels(n, raw[current], `${where} ${LABEL_BY_PART[current]}`)
        continue
      }
      diag.warn(locOf(n), `${where}: 部位見出し（**目** など）と l1〜l5 の箇条書き以外の要素は無視されます`)
    }

    const expected = PARTS.map(([, k]) => k)
    const missing = expected.filter((k) => !raw[k])
    if (missing.length) diag.error(roleLoc, `${where}: 部位の欠落 ${missing.map((k) => LABEL_BY_PART[k]).join('・')}`)
    else if (order.join() !== expected.join()) diag.error(roleLoc, `${where}: 部位の順序が規定と異なります（目→顔→肩→腹（帯）→膝→足）`)

    const parts = {}
    for (const key of expected) {
      if (!raw[key]) continue
      parts[key] = renderPart(raw[key], `${where} ${LABEL_BY_PART[key]}`, roleLoc)
    }
    return parts
  }

  function parseLevels(list, target, where) {
    for (const item of list.children) {
      const para = item.children[0]
      if (!para || para.type !== 'paragraph') {
        diag.error(locOf(item), `${where}: 「- l1: …」の形式ではない箇条書きがあります`)
        continue
      }
      const src = slice(para)
      const m = src.match(/^l([1-5])\s*([:：])\s*([\s\S]*)$/)
      if (!m) {
        diag.error(locOf(item), `${where}: 「- l1:」〜「- l5:」で始まらない行があります: ${src.slice(0, 20)}…`)
        continue
      }
      if (m[2] === '：') diag.warn(locOf(item), `${where} l${m[1]}: コロンは半角「:」で書く`)
      let text = m[3]
      const lazyPart = text.match(/\n\s*\*\*([^*\n]+)\*\*\s*(\n|$)/)
      if (lazyPart) {
        diag.error(locOf(item), `${where} l${m[1]}: 次の部位見出し「**${lazyPart[1]}**」の前に空行が必要です`)
        text = text.slice(0, lazyPart.index)
      }
      if (item.children.length > 1) diag.warn(locOf(item), `${where} l${m[1]}: 箇条書きの入れ子・複数段落は無視されます`)
      const level = `l${m[1]}`
      if (target[level]) diag.error(locOf(item), `${where}: ${level} が重複しています`)
      target[level] = { src: text.replace(/\s*\n\s*/g, ''), node: item }
    }
  }

  function checkLimit(text, level, loc, where) {
    const n = charCount(text.trim())
    const lim = LIMITS[level]
    if (n > lim * 1.1) diag.error(loc, `${where} ${level}: ${n}字（上限${lim}字の+10%超）`)
    else if (n > lim) diag.warn(loc, `${where} ${level}: ${n}字（上限${lim}字超）`)
  }

  function renderPart(levels, where, fallbackLoc) {
    const out = {}
    for (const level of LEVELS) {
      const entry = levels[level]
      if (!entry || entry.src.trim() === '') {
        diag.error(entry ? locOf(entry.node) : fallbackLoc, `${where}: ${level} がありません（5階層必須）`)
        out[level === 'l1' ? 'l1' : `${level}_html`] = ''
        continue
      }
      const loc = locOf(entry.node)
      const r = collect(renderer.render(entry.src, { loc, where: `${where} ${level}`, inline: true, sources }))
      checkLimit(r.text, level, loc, where)
      if (level === 'l1') {
        if (r.marks.f || r.marks.v) diag.warn(loc, `${where} l1: 信頼マークは使わない（吹き出しは一般的な指導扱い）`)
        if (r.terms.size || r.links.size || r.unresolved.size) diag.warn(loc, `${where} l1: 用語リンクは付けない（表示は文字のみ）`)
        if (/[。．]$/.test(r.text.trim())) diag.warn(loc, `${where} l1: 句点「。」を付けない`)
        out.l1 = r.text.trim()
      } else {
        if (level === 'l4' && !(r.text.includes('誤り：') && r.text.includes('修正：'))) {
          diag.warn(loc, `${where} l4: 「誤り：」「修正：」の両方を含める`)
        }
        out[`${level}_html`] = r.html
      }
    }
    return out
  }

  function parseAttacks(nodes) {
    const { pre, groups } = splitBy(nodes, 3)
    if (pre.length) diag.warn(locOf(pre[0]), '攻撃法バリエーション: 最初の「### [attack]」より前の本文は無視されます')
    for (const g of groups) {
      const headingText = nodeText(g.heading).trim()
      const m = headingText.match(ATTACK_HEADING)
      const loc = locOf(g.heading)
      if (!m) {
        diag.error(loc, `攻撃法見出しの書式が違います: 「${headingText}」（### [attack] slug | 日本語名）`)
        continue
      }
      const [, slug, label] = m
      const w = `attack=${slug}`
      if (!attacks.includes(slug)) diag.error(loc, `${w}: frontmatter の attacks にありません`)
      else if (slug === defaultAttack) diag.warn(loc, `${w}: 基本攻撃法（default_attack）の差分は書かない`)
      if (attackOverrides[slug]) diag.error(loc, `${w}: 重複しています`)

      const sub = splitBy(g.nodes, 4)
      let overrides = /** @type {string[] | null} */ (null)
      const descParts = []
      for (const n of sub.pre) {
        const text = slice(n)
        // content-spec §2-2 の書式どおり、overrides 行の直後に空行なしで差分説明が続いてもよい
        const om = n.type === 'paragraph' ? text.match(/^overrides\s*:\s*\[([^\]]*)\][ \t]*(?:\r?\n([\s\S]*))?$/) : null
        if (om) {
          overrides = om[1].split(',').map((s) => s.trim()).filter(Boolean)
          if (om[2]?.trim()) descParts.push(om[2])
        } else descParts.push(text)
      }
      if (!overrides) {
        diag.error(loc, `${w}: 「overrides: [kf id, …]」の行がありません`)
        overrides = []
      }
      const kfs = parseKeyframes(g.nodes.filter((n) => !sub.pre.includes(n)), 4, `${w} `)
      const written = new Map(kfs.map((k) => [k.id, k]))
      for (const o of overrides) {
        if (!written.has(o)) diag.error(loc, `${w}: overrides に書いた kf「${o}」が本文にありません`)
      }
      for (const k of kfs) {
        if (!overrides.includes(k.id)) diag.error(k._loc, `${w}: kf「${k.id}」が overrides に含まれていません`)
        const baseKf = keyframes.find((b) => b.id === k.id)
        if (!baseKf) diag.error(k._loc, `${w}: kf「${k.id}」は基本のキーフレームにありません`)
        else if (baseKf.at !== k.at) diag.error(k._loc, `${w}: kf「${k.id}」の at（${k.at}）が基本（${baseKf.at}）と一致しません`)
      }
      attackOverrides[slug] = {
        label,
        overrides,
        desc_html: descParts.length ? collect(renderer.render(descParts.join('\n\n'), { loc, where: `${w} 差分説明`, sources })).html : '',
        keyframes: Object.fromEntries(kfs.map((k) => [k.id, k])),
      }
    }
  }
}

/** 名前解決用に frontmatter だけ読む */
export function readFrontmatter(raw) {
  return matter(raw).data
}
