// 原稿の文章（Markdown）を HTML に変換する。すべてビルド時に行う（SKILL §1「実行時の正規表現置換」禁止）。
//
// - 信頼マーク（content-spec §2-5）: {{f:文。}} → <span class="t-f">、{{v:文。}} → <span class="t-v">、
//   マークの外側（一般的な指導）→ <span class="t-g">。1マーク1文・入れ子禁止を検査
// - 用語リンク（§2-6）: [[用語]] / [[表示|正規名]] → <a class="term" data-term="slug" href="#/glossary/slug">
//   正規名は単語集の name_ja / aliases、なければ技・基礎の name_ja / aliases で解決（docs/decisions.md D-18）。
//   1つの文章内で同じ用語は初出のみリンク
// - 出典（§2-5）: @src:key → <span class="src">（出典：…）</span>
// - 文字数（§2-4, §9）: 表示テキスト（記法と出典表記を除く）で 全角=1・半角英数=0.5

import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

/** 表示文字数（全角=1、半角英数・半角カナ=0.5） */
export function charCount(text) {
  let n = 0
  for (const ch of text) {
    const cp = /** @type {number} */ (ch.codePointAt(0))
    n += cp <= 0x7e || (cp >= 0xff61 && cp <= 0xff9f) ? 0.5 : 1
  }
  return n
}

const MARK_RE = /\{\{([fv]):|\}\}/g
const TOKEN_RE = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]|@src:([A-Za-z0-9_-]+)/g
const PHRASING_PARENTS = new Set(['paragraph', 'heading', 'tableCell'])
/** 原稿のリンクに許す URL（先頭の空白や大文字の混ぜ書きで判定をすり抜けないよう、先頭から完全に一致させる） */
const SAFE_URL_RE = /^(?:https?:\/\/|mailto:|#\/)/

const parser = unified().use(remarkParse).use(remarkGfm)
const compiler = unified().use(remarkRehype).use(rehypeStringify)

/** mdast ノード列の表示テキスト（出典表記は除く） */
function plainText(nodes) {
  let s = ''
  for (const n of nodes) {
    if (n.type === 'srcRef') continue
    if (typeof n.value === 'string' && n.type !== 'html') s += n.value
    else if (n.children) s += plainText(n.children)
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem' || n.type === 'tableRow') s += '\n'
  }
  return s
}

function hasMarkSyntax(node) {
  if (typeof node.value === 'string') return /\{\{[fv]:|\}\}/.test(node.value)
  return (node.children ?? []).some(hasMarkSyntax)
}

/**
 * @param {{
 *   resolveTerm: (name: string) => ({ kind: 'glossary' | 'technique' | 'kihon', id: string } | null),
 *   diag: import('./diagnostics.mjs').Diagnostics,
 * }} opts
 */
export function createRenderer({ resolveTerm, diag }) {
  /** 1回の render の文脈 */
  let ctx = /** @type {any} */ (null)

  const where = () => (ctx.where ? `${ctx.where}: ` : '')

  function termNode(display, canonical, insideLink) {
    const target = resolveTerm(canonical)
    if (!target) {
      ctx.unresolved.add(canonical)
      diag.warn(ctx.loc, `${where()}[[${canonical}]] が単語集・技に見つかりません（未解決の用語）`)
      return { type: 'text', value: display, data: { hName: 'span', hProperties: { className: ['term-unresolved'] } } }
    }
    const key = `${target.kind}:${target.id}`
    if (target.kind === 'glossary') ctx.terms.add(target.id)
    else ctx.links.add(key)
    if (insideLink || ctx.linked.has(key)) return { type: 'text', value: display }
    ctx.linked.add(key)
    if (target.kind === 'glossary') {
      return {
        type: 'link',
        url: `#/glossary/${target.id}`,
        children: [{ type: 'text', value: display }],
        data: { hProperties: { className: ['term'], dataTerm: target.id } },
      }
    }
    const route = target.kind === 'kihon' ? 'kihon' : 'techniques'
    return {
      type: 'link',
      url: `#/${route}/${target.id}`,
      children: [{ type: 'text', value: display }],
      data: { hProperties: { className: ['term', 'term-waza'], dataTechnique: target.id } },
    }
  }

  function srcNode(key) {
    ctx.srcCount++
    // 自分の持つ key だけを見る（@src:constructor などで Object の組み込みを拾わない）
    const src = ctx.sources && Object.hasOwn(ctx.sources, key) ? ctx.sources[key] : undefined
    const data = { hName: 'span', hProperties: { className: ['src'] } }
    if (!src) {
      diag.warn(ctx.loc, `${where()}@src:${key} が frontmatter の sources に定義されていません`)
      return { type: 'srcRef', data, children: [{ type: 'text', value: `（出典：${key}）` }] }
    }
    const children = src.url
      ? [
          { type: 'text', value: '（出典：' },
          {
            type: 'link',
            url: src.url,
            children: [{ type: 'text', value: src.name }],
            data: { hProperties: { target: '_blank', rel: ['noopener', 'noreferrer'] } },
          },
          { type: 'text', value: '）' },
        ]
      : [{ type: 'text', value: `（出典：${src.name}）` }]
    return { type: 'srcRef', data, children }
  }

  function expandTokens(node, insideLink = false) {
    if (node.type === 'text') {
      const out = []
      const v = node.value
      let last = 0
      TOKEN_RE.lastIndex = 0
      let m
      while ((m = TOKEN_RE.exec(v))) {
        if (m.index > last) out.push({ type: 'text', value: v.slice(last, m.index) })
        if (m[3]) out.push(srcNode(m[3]))
        else out.push(termNode(m[1].trim(), (m[2] ?? m[1]).trim(), insideLink))
        last = m.index + m[0].length
      }
      if (last < v.length) out.push({ type: 'text', value: v.slice(last) })
      return out
    }
    if (node.children) {
      const inLink = insideLink || node.type === 'link'
      return [{ ...node, children: node.children.flatMap((c) => expandTokens(c, inLink)) }]
    }
    return [node]
  }

  function checkMark(kind, rawNodes, text) {
    ctx.marks[kind]++
    const sentences = text.split(/[。！？]/).filter((s) => s.trim() !== '')
    if (sentences.length > 1) diag.error(ctx.loc, `${where()}{{${kind}:}} に複数の文があります（1マーク＝1文。{{${kind}:A。}}{{${kind}:B。}} と書く）`)
    if (kind === 'f' && !rawNodes.some((n) => typeof n.value === 'string' && n.value.includes('@src:'))) {
      diag.warn(ctx.loc, `${where()}{{f:}} に @src がありません（事実には出典を付ける）`)
    }
  }

  function mergeText(children) {
    const out = []
    for (const c of children) {
      const last = out[out.length - 1]
      if (c.type === 'text' && last && last.type === 'text' && !c.data && !last.data) last.value += c.value
      else out.push({ ...c })
    }
    return out
  }

  function transformPhrasing(children) {
    const segments = []
    let cur = { kind: 'g', nodes: /** @type {any[]} */ ([]) }
    const flush = () => {
      if (cur.nodes.length) segments.push(cur)
    }
    for (const node of mergeText(children)) {
      if (node.type !== 'text') {
        if (hasMarkSyntax(node)) diag.error(ctx.loc, `${where()}強調・リンクの内側に信頼マークの記号があります（マークは文の外側に付ける）`)
        cur.nodes.push(node)
        continue
      }
      const value = node.value
      let last = 0
      MARK_RE.lastIndex = 0
      let m
      while ((m = MARK_RE.exec(value))) {
        const before = value.slice(last, m.index)
        if (before) cur.nodes.push({ type: 'text', value: before })
        if (m[0] === '}}') {
          if (cur.kind === 'g') {
            diag.error(ctx.loc, `${where()}対応する {{ の無い }} があります`)
          } else {
            flush()
            cur = { kind: 'g', nodes: [] }
          }
        } else {
          if (cur.kind !== 'g') diag.error(ctx.loc, `${where()}信頼マークが入れ子になっているか、閉じる前に次のマークが始まっています`)
          flush()
          cur = { kind: m[1], nodes: [] }
        }
        last = m.index + m[0].length
      }
      const rest = value.slice(last)
      if (rest) cur.nodes.push({ type: 'text', value: rest })
    }
    if (cur.kind !== 'g') diag.error(ctx.loc, `${where()}信頼マーク {{${cur.kind}: が閉じていません`)
    flush()

    return segments.flatMap((seg) => {
      const inner = seg.nodes.flatMap((n) => expandTokens(n))
      const text = plainText(inner)
      if (seg.kind === 'g' && text.trim() === '') return inner
      if (seg.kind !== 'g') checkMark(seg.kind, seg.nodes, text)
      return [{ type: 'trust', data: { hName: 'span', hProperties: { className: [`t-${seg.kind}`] } }, children: inner }]
    })
  }

  /**
   * リンク先の検査（docs/decisions.md D-44）。{@html} で画面に出すので、実行できる URL（javascript: など）を通さない。
   * 許すのは https / http / mailto と、アプリ内の「#/」だけ。画像は外部に閲覧者の情報が漏れるので使わない。
   * 違反はエラー（ビルドが止まる）にし、dev サーバーでも実行されないよう URL を消しておく
   */
  function checkUrls(node) {
    if (!node.children) return
    node.children = node.children.flatMap((c) => {
      if (c.type === 'image' || c.type === 'imageReference') {
        diag.error(ctx.loc, `${where()}画像は原稿に書けません（${c.alt ?? ''}）`)
        return c.alt ? [{ type: 'text', value: c.alt }] : []
      }
      if ((c.type === 'link' || c.type === 'definition') && !SAFE_URL_RE.test(c.url ?? '')) {
        diag.error(ctx.loc, `${where()}リンク先は https:// か http:// か mailto: で書く（${String(c.url).slice(0, 40)}）`)
        if (c.type === 'definition') return [{ ...c, url: '' }]
        checkUrls(c)
        return c.children
      }
      checkUrls(c)
      return [c]
    })
  }

  function visit(node) {
    if (PHRASING_PARENTS.has(node.type)) {
      node.children = transformPhrasing(node.children ?? [])
      return
    }
    if (node.type === 'html') {
      diag.warn(ctx.loc, `${where()}原稿中の生 HTML は出力しません`)
      return
    }
    for (const c of node.children ?? []) visit(c)
  }

  /**
   * @param {string} markdown
   * @param {{ loc: string, where?: string, inline?: boolean, sources?: Record<string, { name: string, url?: string }> }} opts
   */
  function render(markdown, { loc, where: w = '', inline = false, sources = {} }) {
    ctx = {
      loc,
      where: w,
      sources,
      linked: new Set(),
      terms: new Set(),
      links: new Set(),
      unresolved: new Set(),
      marks: { f: 0, v: 0 },
      srcCount: 0,
    }
    const tree = /** @type {any} */ (parser.parse(markdown))
    if (inline && (tree.children.length > 1 || (tree.children[0] && tree.children[0].type !== 'paragraph'))) {
      diag.warn(loc, `${where()}1段落の文章として解釈できません（行頭の「1. 」「# 」「> 」などを避ける）`)
    }
    visit(tree)
    checkUrls(tree)
    const text = plainText(tree.children).replace(/\n+$/, '')
    const hast = compiler.runSync(tree)
    let html = compiler.stringify(/** @type {any} */ (hast)).trim()
    if (inline) html = html.replace(/^<p>([\s\S]*)<\/p>$/, '$1')
    return { html, text, terms: ctx.terms, links: ctx.links, unresolved: ctx.unresolved, marks: ctx.marks, srcCount: ctx.srcCount }
  }

  return { render }
}
