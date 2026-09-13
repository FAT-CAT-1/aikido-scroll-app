// 単語集（content/glossary/*.md）と章ページ（content/pages/*.md）の解析（content-spec §3）

import path from 'node:path'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { charCount } from './inline.mjs'
import { checkVideos, nodeText, toArray } from './technique.mjs'

const CATEGORIES = ['taisabaki', 'waza', 'kihon', 'shiso', 'rekishi', 'soshiki', 'buki', 'hito']
const STATUSES = ['draft', 'review', 'approved']
const structure = unified().use(remarkParse).use(remarkGfm)

function sectionsOf(body) {
  const tree = /** @type {any} */ (structure.parse(body))
  const pre = []
  const sections = []
  for (const n of tree.children) {
    if (n.type === 'heading' && n.depth === 2) sections.push({ name: nodeText(n).trim(), heading: n, nodes: [] })
    else if (sections.length) sections[sections.length - 1].nodes.push(n)
    else pre.push(n)
  }
  const slice = (nodes) => nodes.map((n) => body.slice(n.position.start.offset, n.position.end.offset)).join('\n\n')
  return { pre, sections, slice }
}

/**
 * @param {{ file: string, rel: string, raw: string, renderer: any, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function parseGlossary({ file, rel, raw, renderer, diag }) {
  const fm = matter(raw)
  const d = fm.data
  const top = `${rel}:1`
  const id = String(d.id ?? '')
  const base = path.basename(file, '.md')
  if (id !== base) diag.error(top, `id「${id}」がファイル名「${base}」と一致しません`)
  for (const key of ['name_ja', 'reading']) if (!d[key]) diag.error(top, `${key} がありません`)
  if (!CATEGORIES.includes(d.category)) diag.error(top, `category は ${CATEGORIES.join('|')} のいずれか（現在: ${d.category}）`)
  const status = String(d.status ?? 'draft')
  if (!STATUSES.includes(status)) diag.error(top, `status は ${STATUSES.join('|')} のいずれか`)
  if (status === 'approved' && !d.reviewer) diag.error(top, 'status: approved なのに reviewer が空です')

  const { sections, slice } = sectionsOf(fm.content)
  const terms = new Set()
  const links = new Set()
  const render = (name, opts = {}) => {
    const sec = sections.find((s) => s.name === name)
    if (!sec || !sec.nodes.length) return null
    const r = renderer.render(slice(sec.nodes), { loc: top, where: name, ...opts })
    r.terms.forEach((t) => t !== id && terms.add(t))
    r.links.forEach((t) => links.add(t))
    return r
  }
  for (const s of sections) {
    if (!['定義', '詳細', '関連'].includes(s.name)) diag.warn(top, `「## ${s.name}」は規定外の節です（定義・詳細・関連）`)
  }
  const def = render('定義')
  if (!def) diag.error(top, '「## 定義」がありません')
  else if (charCount(def.text.trim()) > 66) diag.error(top, `定義: ${charCount(def.text.trim())}字（上限60字の+10%超）`)
  else if (charCount(def.text.trim()) > 60) diag.warn(top, `定義: ${charCount(def.text.trim())}字（上限60字超）`)
  const detail = render('詳細')
  const related = render('関連')

  return {
    id,
    name_ja: String(d.name_ja ?? ''),
    reading: String(d.reading ?? ''),
    romaji: String(d.romaji ?? ''),
    name_en: toArray(d.name_en),
    aliases: toArray(d.aliases),
    category: d.category,
    related: toArray(d.related),
    videos: checkVideos(d.videos, top, diag),
    def_html: def?.html ?? '',
    def_text: (def?.text ?? '').trim(),
    detail_html: detail?.html ?? '',
    related_html: related?.html ?? '',
    terms: [...terms].sort(),
    links: [...links].sort(),
    used_in: /** @type {string[]} */ ([]),
    status,
  }
}

/**
 * 章ページ（自由形式）。frontmatter の title（なければ最初の # 見出し）と本文 HTML
 * @param {{ file: string, rel: string, raw: string, renderer: any, diag: import('./diagnostics.mjs').Diagnostics }} args
 */
export function parsePage({ file, rel, raw, renderer, diag }) {
  const fm = matter(raw)
  const name = path.basename(file, '.md')
  let body = fm.content
  let title = fm.data.title ? String(fm.data.title) : ''
  const h1 = body.match(/^#\s+(.+)$/m)
  if (!title && h1) title = h1[1].trim()
  if (h1) body = body.replace(h1[0], '')
  if (!title) diag.warn(`${rel}:1`, 'title（frontmatter か「# 見出し」）がありません')
  const r = renderer.render(body, { loc: `${rel}:1`, where: '' })
  return {
    name,
    title,
    lead: fm.data.lead ? String(fm.data.lead) : '',
    order: Number(fm.data.order ?? 999),
    html: r.html,
    terms: [...r.terms].sort(),
    links: [...r.links].sort(),
  }
}
