// 本番ビルドの index.html に Content-Security-Policy を meta で入れる（GitHub Pages は応答ヘッダを付けられないため）。
//
// 原稿の文章は {@html} で画面に出すので、万一ビルドの検査をすり抜けた javascript: リンクやスクリプトがあっても
// 実行させない二重の守り（docs/decisions.md D-44）。index.html の小さなインラインスクリプトだけは内容のハッシュで許す。
// - 開発サーバー（apply: 'build' なので対象外）と1ファイル版（scripts/build-single.mjs は別設定）には入れない
// - style は Svelte の style 属性・表紙の <style> があるので 'unsafe-inline' を許す（スタイルからはスクリプトを実行できない）
// - frame-ancestors は meta では効かない（ヘッダ専用）

import { createHash } from 'node:crypto'

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

/** @param {string} html */
export function cspFor(html) {
  const hashes = [...html.matchAll(INLINE_SCRIPT_RE)].map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

/** @returns {import('vite').Plugin} */
export default function cspPlugin() {
  return {
    name: 'aikido-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const meta = `<meta http-equiv="Content-Security-Policy" content="${cspFor(html)}" />`
        if (!/<meta charset[^>]*>/i.test(html)) throw new Error('index.html に <meta charset> がありません（CSP を入れる位置）')
        return html.replace(/(<meta charset[^>]*>)/i, `$1\n    ${meta}`)
      },
    },
  }
}
