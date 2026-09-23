#!/usr/bin/env node
// 1ファイル版：アプリ全体（画面・原稿・フォント）を HTML 1つにまとめる（docs/decisions.md D-35）
//
//   npm run build:single
//     → dist-single/aikido-scroll-app.html  ダブルクリックで開ける／ファイルのまま渡せる
//     → dist-single/artifact.html           claude.ai の Artifact に載せる形（<html>・<head>・<body> を外したもの）
//
// 公開版（npm run build → GitHub Pages）との違い
// - Service Worker・manifest を持たない。オフラインの自動キャッシュとホーム画面への追加は公開版で行う
//   （このファイル自体は通信なしで最後まで動く）
// - JS は1本（画面・原稿の遅延読み込みなし）。CSS・フォント・アイコンは埋め込み。
//   フォントの取得待ちが無いので、Web フォントは最初から使う（src/lib/fonts.ts の html.fonts を HTML に付けておく）
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { build } from 'vite'
import contentPlugin from './vite-plugin-content.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'dist-single')
const FILE_NAME = 'aikido-scroll-app.html'
const ARTIFACT_NAME = 'artifact.html'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 置き換える対象が見つからなければ止める（Vite の出力形式が変わったときに、壊れた1ファイルを出さない） */
function replaceOnce(source, pattern, replacement, what) {
  if (!pattern.test(source)) throw new Error(`build:single: ${what} が HTML に見つかりません`)
  return source.replace(pattern, () => replacement)
}

/** vite-plugin-pwa を使わないので、登録関数を何もしないものに置き換える */
/**
 * <script> の中に「<!--」があり、「-->」より前に「<script」が来ると、HTML の読み取りが本物の </script> を飲み込み、
 * 以後の HTML がスクリプトとして扱われて壊れる（script data double escaped）。そうなる並びがあればビルドを止める
 */
function assertNoDoubleEscape(code, what) {
  let i = code.indexOf('<!--')
  while (i !== -1) {
    const close = code.indexOf('-->', i + 4)
    const open = code.slice(i + 4, close === -1 ? undefined : close).search(/<script[\s/>]/i)
    if (open !== -1) throw new Error(`${what} に「<!--」の後の「<script」があり、1ファイルに埋め込めません`)
    i = close === -1 ? -1 : code.indexOf('<!--', close + 3)
  }
}

function pwaStub() {
  const stubId = '\0single-pwa-register'
  return {
    name: 'single:pwa-stub',
    enforce: 'pre',
    resolveId: (source) => (source === 'virtual:pwa-register' ? stubId : null),
    load: (id) => (id === stubId ? 'export function registerSW() { return async () => {} }' : null),
  }
}

/** CSS の public/fonts/*.woff2 を data URI にする */
function inlineFonts() {
  return {
    name: 'single:inline-fonts',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.css') || !code.includes("url('/fonts/")) return null
      let out = code
      for (const [, file] of code.matchAll(/url\('\/fonts\/([\w.-]+\.woff2)'\)/g)) {
        const data = (await readFile(path.join(ROOT, 'public', 'fonts', file))).toString('base64')
        out = out.replaceAll(`url('/fonts/${file}')`, `url(data:font/woff2;base64,${data})`)
      }
      return { code: out, map: null }
    },
  }
}

/** HTML に JS・CSS を埋め込んで1ファイルにし、Artifact 用の形も出す */
function singleFile() {
  return {
    name: 'single:file',
    enforce: 'post',
    async transformIndexHtml(html) {
      const icon = (await readFile(path.join(ROOT, 'public', 'icons', 'icon.svg'))).toString('base64')
      let out = html
      // アイコンは data URI の SVG 1つにする（favicon.ico・apple-touch-icon のファイルは無い）
      out = out.replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '')
      out = replaceOnce(out, /<\/title>/, `</title>\n    <link rel="icon" href="data:image/svg+xml;base64,${icon}" type="image/svg+xml" />`, '<title>')
      // Service Worker を見てフォントを切り替えるスクリプトは不要。最初から Web フォントを使う
      out = out.replace(/\s*<!-- Service Worker が制御している[^>]*-->/, '')
      out = replaceOnce(out, /\s*<script>\s*if \(navigator\.serviceWorker[\s\S]*?<\/script>/, '', 'Service Worker の確認スクリプト')
      out = replaceOnce(out, /<html lang="ja">/, '<html lang="ja" class="fonts">', '<html lang="ja">')
      return out
    },
    // order: 'post'：Vite が動的 import の目印（__VITE_PRELOAD__）を置き換えた後の JS を埋め込む
    generateBundle: { order: 'post', handler(_, bundle) {
      const page = bundle['index.html']
      if (!page || page.type !== 'asset') this.error('index.html が出力に見つかりません')
      const chunks = Object.values(bundle).filter((f) => f.type === 'chunk')
      if (chunks.length !== 1) this.error(`JS が1本にまとまっていません（${chunks.length}本）`)
      const styles = Object.values(bundle).filter((f) => f.type === 'asset' && f.fileName.endsWith('.css'))
      const others = Object.values(bundle).filter((f) => f !== page && f.type === 'asset' && !f.fileName.endsWith('.css'))
      if (others.length) this.error(`埋め込めないファイルが残っています: ${others.map((f) => f.fileName).join(', ')}`)

      const full = String(page.source)
      // Artifact 用：<meta>・<link> は Artifact 側の <head> が持つので落とし、言語と Web フォントの指定は先頭のスクリプトで付ける
      const title = full.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? ''
      const head = (full.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '').replace(title, '').replace(/\s*<meta [^>]*>/g, '').replace(/\s*<link rel="icon"[^>]*>/g, '')
      const body = full.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
      const fragment = `${title}\n<script>document.documentElement.lang = 'ja'; document.documentElement.classList.add('fonts')</script>${head}\n${body}`

      const inline = (html) => {
        let out = html
        // CSS を先に差し込む（JS を先に入れると、JS の中の文字列がタグの検索に当たりうるため。docs/decisions.md D-46）
        for (const style of styles) {
          const css = String(style.source)
          if (/<\/style/i.test(css)) throw new Error(`${style.fileName} に </style があり、<style> に埋め込めません`)
          out = replaceOnce(out, new RegExp(`<link rel="stylesheet" crossorigin href="[^"]*${escapeRe(style.fileName)}">`), `<style>${css}</style>`, style.fileName)
        }
        for (const chunk of chunks) {
          // </script を含む文字列でスクリプトが途中で閉じないようにする（大文字小文字はそのまま残す）
          const code = chunk.code.replace(/<\/(script)/gi, '<\\/$1')
          assertNoDoubleEscape(code, chunk.fileName)
          out = replaceOnce(out, new RegExp(`<script type="module" crossorigin src="[^"]*${escapeRe(chunk.fileName)}"></script>`), `<script type="module">${code}</script>`, chunk.fileName)
        }
        return out
      }

      for (const f of [page, ...chunks, ...styles]) delete bundle[f.fileName]
      this.emitFile({ type: 'asset', fileName: FILE_NAME, source: inline(full) })
      this.emitFile({ type: 'asset', fileName: ARTIFACT_NAME, source: inline(fragment) })
    } },
  }
}

await build({
  root: ROOT,
  configFile: false,
  mode: 'single',
  base: './',
  publicDir: false,
  logLevel: 'warn',
  plugins: [contentPlugin(), svelte(), pwaStub(), inlineFonts(), singleFile()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 10_000,
    rolldownOptions: { output: { codeSplitting: false } },
  },
})

const { stat } = await import('node:fs/promises')
for (const name of [FILE_NAME, ARTIFACT_NAME]) {
  const { size } = await stat(path.join(OUT_DIR, name))
  console.log(`dist-single/${name}  ${(size / 1024 / 1024).toFixed(2)} MB`)
}
