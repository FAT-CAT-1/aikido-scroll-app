// 原稿の frontmatter を読む（YAML だけ）。
//
// gray-matter は「---js」「---coffee」のように区切り線の後ろに言語名を書くと、その言語で frontmatter を実行する
// （JavaScript は eval）。原稿はデータとして扱う約束なので、YAML 以外は読まずにエラーにする（docs/decisions.md D-44）。
// 念のため gray-matter の YAML 以外の読み手も差し替えて、どの経路でも実行されないようにする。

import matter from 'gray-matter'

const refuse = () => {
  throw new Error('frontmatter は YAML だけ使えます')
}
// options を渡すと gray-matter の内容ごとのキャッシュも使われない（同じ本文の別ファイルで結果が混ざらない）
const OPTIONS = { engines: { javascript: refuse, coffee: refuse, json: refuse } }

/** 区切り線「---」の後ろに書かれた言語名（無ければ ''） */
export function frontmatterLanguage(raw) {
  const s = raw.replace(/^﻿/, '')
  if (!s.startsWith('---') || s.charAt(3) === '-') return ''
  const end = s.search(/\r?\n/)
  return (end === -1 ? s.slice(3) : s.slice(3, end)).trim()
}

/**
 * @param {string} raw
 * @param {import('./diagnostics.mjs').Diagnostics} [diag] 無いときは黙って空の frontmatter を返す（名前解決の下読み用）
 * @param {string} [loc]
 * @returns {{ data: Record<string, any>, content: string }}
 */
export function parseFrontmatter(raw, diag, loc = '') {
  const lang = frontmatterLanguage(raw)
  if (lang && !/^ya?ml$/i.test(lang)) {
    diag?.error(loc, `frontmatter は YAML だけ使えます（「---${lang}」は読み込みません）`)
    return { data: {}, content: '' }
  }
  try {
    const fm = matter(raw, OPTIONS)
    return { data: fm.data ?? {}, content: fm.content }
  } catch (e) {
    diag?.error(loc, `frontmatter を読めません: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`)
    return { data: {}, content: '' }
  }
}
