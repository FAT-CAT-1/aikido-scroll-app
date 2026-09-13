#!/usr/bin/env node
// content/**/*.md ＋ content/poses/*.pose.json → src/generated/**/*.json（design-complete A-2）
//
//   npm run build:content          … 生成。エラーがあれば終了コード 1（CI 失敗）、警告はログのみ
//   npm run build:content -- --quiet
//
// 出力（src/generated/ は git 管理外）
//   index.json                 技・基礎・単語集・章ページの一覧（アプリ起動時に読む）
//   techniques/{id}.json       技（content-spec §5）  kihon/{id}.json  基礎
//   glossary/{id}.json         用語（used_in 付き）
//   pages/{name}.json          章ページ
//   poses/{id}.json            検証済みポーズ
//   unresolved-terms.txt       未解決の [[用語]]（ある場合のみ）

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Diagnostics } from './content/diagnostics.mjs'
import { parseGlossary, parsePage } from './content/glossary.mjs'
import { createRenderer } from './content/inline.mjs'
import { validatePose } from './content/pose.mjs'
import { parseTechnique, readFrontmatter, toArray } from './content/technique.mjs'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..')

async function walk(dir, ext) {
  if (!existsSync(dir)) return []
  const out = []
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...(await walk(p, ext)))
    else if (ent.name.endsWith(ext)) out.push(p)
  }
  return out.sort()
}

/** @param {{ root?: string, quiet?: boolean, log?: (s: string) => void }} [opts] */
export async function buildContent({ root = DEFAULT_ROOT, quiet = false, log = console.log } = {}) {
  const diag = new Diagnostics()
  const contentDir = path.join(root, 'content')
  const outDir = path.join(root, 'src', 'generated')
  const rel = (f) => path.relative(root, f).replaceAll('\\', '/')

  const read = async (files) => Promise.all(files.map(async (file) => ({ file, rel: rel(file), raw: await readFile(file, 'utf8') })))
  const techniqueFiles = await read(await walk(path.join(contentDir, 'techniques'), '.md'))
  const kihonFiles = await read(await walk(path.join(contentDir, 'kihon'), '.md'))
  const glossaryFiles = await read(await walk(path.join(contentDir, 'glossary'), '.md'))
  const pageFiles = await read(await walk(path.join(contentDir, 'pages'), '.md'))
  const poseFiles = (await walk(path.join(contentDir, 'poses'), '.pose.json')).filter((f) => !path.basename(f).startsWith('_'))

  // ---- pass 1: 名前 → id（[[用語]] の解決表） ----
  const glossaryNames = new Map()
  const techniqueNames = new Map()
  const register = (map, name, target, loc) => {
    if (!name) return
    const prev = map.get(name)
    if (prev && prev.id !== target.id) diag.warn(loc, `名前「${name}」が ${prev.id} と ${target.id} で重複しています`)
    else map.set(name, target)
  }
  for (const g of glossaryFiles) {
    const d = readFrontmatter(g.raw)
    const target = { kind: 'glossary', id: String(d.id ?? path.basename(g.file, '.md')) }
    for (const n of [d.name_ja, ...toArray(d.aliases)]) register(glossaryNames, String(n ?? ''), target, `${g.rel}:1`)
  }
  for (const [files, kind] of [
    [techniqueFiles, 'technique'],
    [kihonFiles, 'kihon'],
  ]) {
    for (const t of files) {
      const d = readFrontmatter(t.raw)
      const target = { kind, id: String(d.id ?? path.basename(t.file, '.md')) }
      for (const n of [d.name_ja, ...toArray(d.aliases)]) register(techniqueNames, String(n ?? ''), target, `${t.rel}:1`)
    }
  }
  const resolveTerm = (name) => glossaryNames.get(name) ?? techniqueNames.get(name) ?? null
  const renderer = createRenderer({ resolveTerm, diag })

  // ---- pass 2: 解析・描画・検証 ----
  const techniques = techniqueFiles.map((f) => parseTechnique({ ...f, type: 'technique', renderer, diag }))
  const kihon = kihonFiles.map((f) => parseTechnique({ ...f, type: 'kihon', renderer, diag }))
  const glossary = glossaryFiles.map((f) => parseGlossary({ ...f, renderer, diag }))
  const pages = pageFiles.map((f) => parsePage({ ...f, renderer, diag }))

  const byId = new Map([...techniques, ...kihon].map((t) => [t.id, t]))
  const glossaryById = new Map(glossary.map((g) => [g.id, g]))

  for (const g of glossary) {
    for (const r of g.related) if (!glossaryById.has(r)) diag.warn(`content/glossary/${g.id}.md:1`, `related の「${r}」が単語集にありません`)
  }
  for (const t of [...techniques, ...kihon]) {
    for (const slug of t.terms) glossaryById.get(slug)?.used_in.push(t.id)
  }

  const poses = []
  for (const file of poseFiles) {
    const id = path.basename(file, '.pose.json')
    let pose
    try {
      pose = JSON.parse(await readFile(file, 'utf8'))
    } catch (e) {
      diag.error(`${rel(file)}:1`, `JSON として読めません: ${/** @type {Error} */ (e).message}`)
      continue
    }
    if (validatePose({ rel: rel(file), id, pose, technique: byId.get(id) ?? null, diag })) poses.push(pose)
  }
  const poseIds = new Set(poses.map((p) => p.id))
  for (const t of techniques) if (!poseIds.has(t.id)) diag.warn(`content/techniques/${t.id}.md:1`, 'pose.json がありません（アニメなしで表示）')

  // フォントのサブセット外の文字（D-03）
  const charsetFile = path.join(root, 'scripts', 'font-charset.json')
  if (existsSync(charsetFile)) {
    const charset = new Set(JSON.parse(await readFile(charsetFile, 'utf8')).text)
    const missing = new Set()
    const scan = (s) => {
      for (const ch of String(s).replace(/<[^>]+>/g, '')) if (ch.codePointAt(0) > 0x7e && !charset.has(ch) && !/\s/.test(ch)) missing.add(ch)
    }
    JSON.stringify([techniques, kihon, glossary, pages], (_, v) => (typeof v === 'string' && scan(v), v))
    if (missing.size) diag.warn('scripts/font-charset.json', `フォントのサブセットに無い文字 ${missing.size}字: ${[...missing].join('')} → npm run fonts を実行`)
  }

  // 情報（content-spec §6）
  const all = [...techniques, ...kihon, ...glossary]
  const approved = all.filter((x) => x.status === 'approved').length
  diag.info('content', `draft ${all.filter((x) => x.status === 'draft').length}件 ／ review ${all.filter((x) => x.status === 'review').length}件 ／ approved ${approved}件（approved率 ${all.length ? Math.round((approved / all.length) * 100) : 0}%）`)

  // ---- 出力 ----
  const index = {
    techniques: techniques.map(summary),
    kihon: kihon.map(summary),
    glossary: glossary
      .map((g) => ({ id: g.id, name_ja: g.name_ja, reading: g.reading, romaji: g.romaji, name_en: g.name_en, category: g.category, def_text: g.def_text, status: g.status }))
      .sort((a, b) => a.reading.localeCompare(b.reading, 'ja')),
    pages: pages.map((p) => ({ name: p.name, title: p.title, lead: p.lead, order: p.order })).sort((a, b) => a.order - b.order),
  }
  function summary(t) {
    return {
      id: t.id,
      type: t.type,
      name_ja: t.name_ja,
      reading: t.reading,
      name_en: t.name_en,
      form: t.form,
      rank: t.rank,
      category: t.category,
      default_attack: t.default_attack,
      attacks: t.attacks,
      status: t.status,
      kf_count: t.keyframes.length,
      has_pose: poseIds.has(t.id),
    }
  }

  const outputs = new Map()
  const put = (p, obj) => outputs.set(path.join(outDir, p), typeof obj === 'string' ? obj : JSON.stringify(obj))
  put('index.json', index)
  for (const t of techniques) put(`techniques/${t.id}.json`, t)
  for (const t of kihon) put(`kihon/${t.id}.json`, t)
  for (const g of glossary) put(`glossary/${g.id}.json`, g)
  for (const p of pages) put(`pages/${p.name}.json`, p)
  for (const p of poses) put(`poses/${p.id}.json`, p)
  const unresolved = [...new Set(diag.items.filter((i) => i.msg.includes('未解決の用語')).map((i) => i.msg.match(/\[\[(.+?)\]\]/)?.[1]))].filter(Boolean)
  if (unresolved.length) put('unresolved-terms.txt', unresolved.join('\n') + '\n')

  // 変更があったファイルだけ書く（dev サーバーの無駄な再読込を避ける）。古い生成物は削除
  for (const [file, content] of outputs) {
    await mkdir(path.dirname(file), { recursive: true })
    const prev = existsSync(file) ? await readFile(file, 'utf8') : null
    if (prev !== content) await writeFile(file, content)
  }
  for (const file of await walk(outDir, '')) {
    if (!outputs.has(file)) await rm(file)
  }

  if (!quiet || diag.errorCount || diag.warnCount) diag.print({ log })
  return { diag, index, techniques, kihon, glossary, pages, poses }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { diag } = await buildContent({ quiet: process.argv.includes('--quiet') })
  if (diag.errorCount) process.exit(1)
}
