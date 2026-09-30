// 原稿1本だけを検証する（src/generated は書き換えない）。node tools/check-manuscript.mjs content/kihon/hanmi.md [...]
//
// 書いている途中の原稿を build:content と同じ規則（構造・5階層・字数・信頼マーク・[[用語]]）で確かめるため。
// 何本かを同時に書いていても、生成物を書かないので互いにぶつからない。[[用語]] の解決表は単語集・技・基礎動作の全部から作る。
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { Diagnostics } from '../scripts/content/diagnostics.mjs'
import { createRenderer } from '../scripts/content/inline.mjs'
import { parseTechnique, readFrontmatter, toArray } from '../scripts/content/technique.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const rel = (f) => path.relative(ROOT, f).replaceAll('\\', '/')

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p)
  }
  return out
}

const targets = process.argv.slice(2).map((f) => path.resolve(f))
if (!targets.length) {
  console.error('使い方: node tools/check-manuscript.mjs content/kihon/<id>.md [...]')
  process.exit(2)
}

// [[用語]] の解決表（build-content.mjs の pass 1 と同じ優先順位：単語集 → 技・基礎動作）
const glossaryNames = new Map()
const techniqueNames = new Map()
for (const f of await walk(path.join(ROOT, 'content', 'glossary'))) {
  const d = readFrontmatter(await readFile(f, 'utf8'))
  const target = { kind: 'glossary', id: String(d.id ?? path.basename(f, '.md')) }
  for (const n of [d.name_ja, ...toArray(d.aliases)]) if (n && !glossaryNames.has(String(n))) glossaryNames.set(String(n), target)
}
for (const [dir, kind] of [
  ['techniques', 'technique'],
  ['kihon', 'kihon'],
]) {
  for (const f of await walk(path.join(ROOT, 'content', dir))) {
    const d = readFrontmatter(await readFile(f, 'utf8'))
    const target = { kind, id: String(d.id ?? path.basename(f, '.md')) }
    for (const n of [d.name_ja, ...toArray(d.aliases)]) if (n && !techniqueNames.has(String(n))) techniqueNames.set(String(n), target)
  }
}

const diag = new Diagnostics()
const renderer = createRenderer({ resolveTerm: (name) => glossaryNames.get(name) ?? techniqueNames.get(name) ?? null, diag })
for (const file of targets) {
  const type = rel(file).startsWith('content/kihon/') ? 'kihon' : 'technique'
  const t = parseTechnique({ file, rel: rel(file), raw: await readFile(file, 'utf8'), type, renderer, diag })
  console.log(`${rel(file)}: kf ${t.keyframes?.length ?? 0}（${(t.keyframes ?? []).map((k) => `${k.id}@${k.at}`).join(' ')}）`)
}
diag.print()
process.exit(diag.errorCount ? 1 : 0)
