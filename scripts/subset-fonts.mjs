#!/usr/bin/env node
// フォントのサブセット化（backlog T02 / SKILL §1「ローカルサブセット」）
//
// 原本: google/fonts（SIL OFL 1.1、Reserved Font Name なし）を固定コミットから取得し、sha256 を検証して
//       fonts-src/（git 管理外）に置く。
// 出力: public/fonts/*.woff2（コミット対象）、public/fonts/LICENSE-*.txt、scripts/font-charset.json
//
// 収録文字（書体の役割ごとに分ける。3G 回線とオフライン precache の容量を抑えるため）
//   body    = 基本集合（ASCII・かな・約物・全角英数など）＋ JIS 第1水準漢字 ＋ 原稿・UI の全文字 … Shippori Mincho 400
//   text    = 基本集合 ＋ 原稿・UI の全文字（旧字「氣」など）                          … Shippori Mincho 700 / Zen Old Mincho
//   display = 基本集合 ＋ 見出し・技名・用語名・UI 文字列の文字                          … Yuji Syuku（見出し専用）
// 原稿・UI 走査対象: content/**/*.md、docs/content-draft.md（今後の原稿の元ネタ）、src/**、index.html
// 原稿を増やしてサブセット外の文字が出たら `npm run fonts` を再実行する（build:content が警告する）。
//
// 使い方: npm run fonts            … 必要なら原本を取得してサブセット生成
//         npm run fonts -- --report … 生成せず、文字数と各書体の未収録文字だけ表示

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC_DIR = path.join(ROOT, 'fonts-src')
const OUT_DIR = path.join(ROOT, 'public', 'fonts')
const CHARSET_FILE = path.join(ROOT, 'scripts', 'font-charset.json')

// google/fonts の固定コミット（2026-09-14 取得時の main）
const COMMIT = '809e4d8b8d7e9364a914909bb777679606c178b8'
const RAW = `https://raw.githubusercontent.com/google/fonts/${COMMIT}/ofl`

export const FONTS = [
  {
    family: 'Yuji Syuku', weight: 400, charset: 'display', dir: 'yujisyuku', file: 'YujiSyuku-Regular.ttf', out: 'yuji-syuku-400.woff2',
    sha256: '82728ebafc8c97391e2dab633414a806f344b8e4e2227d307179f07b548fca61',
  },
  {
    family: 'Shippori Mincho', weight: 400, charset: 'body', dir: 'shipporimincho', file: 'ShipporiMincho-Regular.ttf', out: 'shippori-mincho-400.woff2',
    sha256: '769b5269f0f9bc6534b352c0e6bd856a566e03ff788f107191c2d835863570b2',
  },
  {
    family: 'Shippori Mincho', weight: 700, charset: 'text', dir: 'shipporimincho', file: 'ShipporiMincho-Bold.ttf', out: 'shippori-mincho-700.woff2',
    sha256: '63bc4eddc74793f671c3ab827c5175e773ffbe569d0bf50ee65375ea9e3bc286',
  },
  {
    family: 'Zen Old Mincho', weight: 400, charset: 'text', dir: 'zenoldmincho', file: 'ZenOldMincho-Regular.ttf', out: 'zen-old-mincho-400.woff2',
    sha256: '4c051a78a21c4e8e9dccf1c754776d33f356b8cc6ef95d9b64761b9bae814b84',
  },
]
// ライセンス文も公開物に入るので、フォント本体と同じく sha256 で固定する（docs/decisions.md D-46）
const LICENSES = [
  { dir: 'yujisyuku', out: 'LICENSE-YujiSyuku.txt', sha256: 'ef7c85c72ae94381c8bc4832ae4e6fbabdeafa2bb8a31313cd75dce95a690256' },
  { dir: 'shipporimincho', out: 'LICENSE-ShipporiMincho.txt', sha256: '41fba056279be5f45ff9a99e44b7b53897b42732f5806d8e666e0ab49ac6bd38' },
  { dir: 'zenoldmincho', out: 'LICENSE-ZenOldMincho.txt', sha256: '469d214f9842809659c827b7f2adaf40ec0df6efdd5fe18b7127665c32aafaec' },
]

// ---------- 文字集合 ----------

function range(from, to) {
  const s = []
  for (let c = from; c <= to; c++) s.push(String.fromCodePoint(c))
  return s
}

function baseChars() {
  return [
    ...range(0x20, 0x7e), // ASCII
    '×', '÷', '°', '·', '©',
    ...range(0x2010, 0x2027), // ダッシュ・引用符・…‥
    '※', '‰', '′', '″',
    ...range(0x2160, 0x216b), // ローマ数字
    ...range(0x2190, 0x2199), // 矢印
    ...range(0x2460, 0x2473), // ①〜⑳
    '─', '│', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '○', '◎', '●', '★', '☆',
    ...range(0x3000, 0x303f), // 和文約物（、。「」々〆〜 など）
    ...range(0x3041, 0x309f), // ひらがな
    ...range(0x30a0, 0x30ff), // カタカナ
    ...range(0xff01, 0xff65), // 全角英数・半角約物
  ]
}

// JIS X 0208 第1水準漢字（Shift_JIS 0x889F–0x9872）
function jisLevel1() {
  const dec = new TextDecoder('shift_jis')
  const out = []
  for (let code = 0x889f; code <= 0x9872; code++) {
    const lo = code & 0xff
    if (lo < 0x40 || lo === 0x7f || lo > 0xfc) continue
    const ch = dec.decode(new Uint8Array([code >> 8, lo]))
    if ([...ch].length === 1 && /\p{Script=Han}/u.test(ch)) out.push(ch)
  }
  return out
}

async function walk(dir, exts) {
  if (!existsSync(dir)) return []
  const out = []
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...(await walk(p, exts)))
    else if (exts.some((e) => ent.name.endsWith(e))) out.push(p)
  }
  return out
}

// 見出し書体に必要な部分だけを原稿から抜き出す（見出し行・技名など frontmatter・kf 見出し・[[用語]]・**強調**・表の1列目）
function displayParts(md) {
  const parts = []
  for (const line of md.split('\n')) {
    if (/^#{1,6}\s/.test(line)) parts.push(line)
    const fm = line.match(/^(name_ja|reading|aliases|label|title):\s*(.+)$/)
    if (fm) parts.push(fm[2])
    const cell = line.match(/^\|\s*([^|]+?)\s*\|/)
    if (cell) parts.push(cell[1])
  }
  for (const m of md.matchAll(/\[\[([^\]]+)\]\]/g)) parts.push(m[1])
  for (const m of md.matchAll(/\*\*([^*]+)\*\*/g)) parts.push(m[1])
  return parts.join('')
}

export async function scannedChars() {
  const mdFiles = [...(await walk(path.join(ROOT, 'content'), ['.md'])), path.join(ROOT, 'docs', 'content-draft.md')]
  const uiFiles = [...(await walk(path.join(ROOT, 'src'), ['.svelte', '.ts', '.html'])), path.join(ROOT, 'index.html')]
  const all = new Set()
  const display = new Set()
  for (const f of mdFiles.filter((f) => existsSync(f))) {
    const md = await readFile(f, 'utf8')
    for (const ch of md) all.add(ch)
    for (const ch of displayParts(md)) display.add(ch)
  }
  for (const f of uiFiles.filter((f) => existsSync(f) && !f.includes(`${path.sep}generated${path.sep}`))) {
    for (const ch of await readFile(f, 'utf8')) {
      all.add(ch)
      display.add(ch)
    }
  }
  return { all, display }
}

function isRenderable(ch) {
  const cp = ch.codePointAt(0)
  return cp >= 0x20 && !(cp >= 0xd800 && cp <= 0xdfff) && !/\p{Cc}/u.test(ch)
}

// ---------- 原本の取得と検証 ----------

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

async function fetchVerified(url, dest, expectedSha) {
  if (existsSync(dest)) {
    const buf = await readFile(dest)
    if (!expectedSha || sha256(buf) === expectedSha) return buf
    throw new Error(`${path.basename(dest)} の sha256 が一致しません。fonts-src/ の該当ファイルを削除して再実行してください。`)
  }
  console.log(`  取得: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`取得失敗 ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (expectedSha && sha256(buf) !== expectedSha) throw new Error(`sha256 不一致（改ざん・取得元変更の可能性）: ${url}`)
  await writeFile(dest, buf)
  return buf
}

// ---------- cmap 解析（収録文字の確認用。format 4 / 12） ----------

function fontCodepoints(buf) {
  const numTables = buf.readUInt16BE(4)
  let cmapOffset = -1
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    if (buf.toString('latin1', rec, rec + 4) === 'cmap') cmapOffset = buf.readUInt32BE(rec + 8)
  }
  if (cmapOffset < 0) throw new Error('cmap テーブルがありません')
  const n = buf.readUInt16BE(cmapOffset + 2)
  const subtables = []
  for (let i = 0; i < n; i++) {
    const r = cmapOffset + 4 + i * 8
    subtables.push({ platform: buf.readUInt16BE(r), encoding: buf.readUInt16BE(r + 2), offset: cmapOffset + buf.readUInt32BE(r + 4) })
  }
  const set = new Set()
  const fmt12 = subtables.find((s) => buf.readUInt16BE(s.offset) === 12)
  if (fmt12) {
    const groups = buf.readUInt32BE(fmt12.offset + 12)
    for (let g = 0; g < groups; g++) {
      const p = fmt12.offset + 16 + g * 12
      const start = buf.readUInt32BE(p)
      const end = buf.readUInt32BE(p + 4)
      for (let c = start; c <= end; c++) set.add(c)
    }
    return set
  }
  const fmt4 = subtables.find((s) => buf.readUInt16BE(s.offset) === 4)
  if (!fmt4) throw new Error('cmap format 4/12 がありません')
  const o = fmt4.offset
  const segX2 = buf.readUInt16BE(o + 6)
  const endBase = o + 14
  const startBase = endBase + segX2 + 2
  const deltaBase = startBase + segX2
  const rangeBase = deltaBase + segX2
  for (let s = 0; s < segX2 / 2; s++) {
    const end = buf.readUInt16BE(endBase + s * 2)
    const start = buf.readUInt16BE(startBase + s * 2)
    const delta = buf.readInt16BE(deltaBase + s * 2)
    const rangeOffset = buf.readUInt16BE(rangeBase + s * 2)
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff
      else {
        const gp = rangeBase + s * 2 + rangeOffset + (c - start) * 2
        glyph = buf.readUInt16BE(gp)
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff
      }
      if (glyph !== 0) set.add(c)
    }
  }
  return set
}

// ---------- メイン ----------

async function main() {
  const reportOnly = process.argv.includes('--report')
  await mkdir(SRC_DIR, { recursive: true })

  const scanned = await scannedChars()
  const all = [...scanned.all].filter(isRenderable)
  const display = [...scanned.display].filter(isRenderable)
  const toText = (chars) => [...new Set(chars)].sort().join('')
  const charsets = {
    body: toText([...baseChars(), ...jisLevel1(), ...all]),
    text: toText([...baseChars(), ...all]),
    display: toText([...baseChars(), ...display]),
  }
  for (const [k, v] of Object.entries(charsets)) console.log(`収録文字数 ${k}: ${[...v].length}`)

  let total = 0
  for (const f of FONTS) {
    const buf = await fetchVerified(`${RAW}/${f.dir}/${f.file}`, path.join(SRC_DIR, f.file), f.sha256)
    const cps = fontCodepoints(buf)
    const wanted = f.charset === 'display' ? display : all
    const missing = wanted.filter((ch) => !cps.has(ch.codePointAt(0)) && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(ch))
    if (missing.length) console.log(`  ${f.family} ${f.weight}: 原稿中の未収録文字 ${missing.length} → ${missing.join('')}（代替書体で表示）`)
    if (reportOnly) continue
    const out = await subsetFont(buf, charsets[f.charset], { targetFormat: 'woff2' })
    await mkdir(OUT_DIR, { recursive: true })
    await writeFile(path.join(OUT_DIR, f.out), out)
    total += out.length
    console.log(`  ${f.out}（${f.charset}）: ${(out.length / 1024).toFixed(0)} KB`)
  }
  if (reportOnly) return

  for (const l of LICENSES) {
    const dest = path.join(SRC_DIR, `OFL-${l.dir}.txt`)
    await fetchVerified(`${RAW}/${l.dir}/OFL.txt`, dest, l.sha256)
    await copyFile(dest, path.join(OUT_DIR, l.out))
  }
  // build:content が「サブセット外の文字」を警告するための一覧（本文書体 text の収録文字）
  await writeFile(CHARSET_FILE, JSON.stringify({ commit: COMMIT, text: charsets.text, display: charsets.display }) + '\n')
  console.log(`合計 ${(total / 1024).toFixed(0)} KB → public/fonts/`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
