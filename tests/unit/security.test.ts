// セキュリティ監査（2026-09-23、docs/decisions.md D-44）で見つかった原稿パイプラインの穴の回帰テスト
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildContent } from '../../scripts/build-content.mjs'
import { Diagnostics } from '../../scripts/content/diagnostics.mjs'
import { frontmatterLanguage, parseFrontmatter } from '../../scripts/content/frontmatter.mjs'
import { createRenderer } from '../../scripts/content/inline.mjs'
import { EASE_RE } from '../../scripts/content/pose.mjs'
import { checkVideos } from '../../scripts/content/technique.mjs'
import { cspFor } from '../../scripts/vite-plugin-csp.mjs'

const errors = (diag: Diagnostics) => diag.items.filter((i) => i.level === 'error').map((i) => i.msg)

function render(md: string, inline = true) {
  const diag = new Diagnostics()
  const renderer = createRenderer({ resolveTerm: (n: string) => (n === '入身' ? { kind: 'glossary', id: 'irimi' } : null), diag })
  const r = renderer.render(md, { loc: 't.md:1', inline, sources: { s: { name: '出典', url: 'https://example.org/s' } } })
  return { html: r.html, diag }
}

describe('原稿のリンク先（{@html} で出すので実行できる URL を通さない）', () => {
  it.each([
    ['インラインのリンク', '[a](javascript:alert(1))'],
    ['自動リンク', '<javascript:alert(1)>'],
    ['文字参照で隠した scheme', '[a](&#106;avascript:alert(1))'],
    ['大文字の混ぜ書き', '[a](JavaScript:alert(1))'],
    ['先頭の空白', '[a](< javascript:alert(1)>)'],
    ['data: URL', '[a](data:text/html,<script>alert(1)</script>)'],
  ])('%s はエラーにして href に出さない', (_, md) => {
    const { html, diag } = render(md)
    // リンクを外して文字だけ残す（文字としての「javascript:」は実行されない）
    expect(html).not.toContain('href')
    expect(html).not.toContain('<a')
    expect(errors(diag).some((m) => m.includes('リンク先'))).toBe(true)
  })

  it('参照リンクの定義もエラーにする', () => {
    const { html, diag } = render('[a][r]\n\n[r]: javascript:alert(1)', false)
    expect(html.toLowerCase()).not.toMatch(/href="[^"]*javascript/)
    expect(errors(diag).some((m) => m.includes('リンク先'))).toBe(true)
  })

  it('画像はエラーにして出さない（閲覧者の情報が外に漏れる）', () => {
    const { html, diag } = render('![図](https://example.com/x.png)')
    expect(html).not.toContain('<img')
    expect(errors(diag).some((m) => m.includes('画像'))).toBe(true)
  })

  it('https・mailto のリンク、用語リンク、出典リンクはそのまま', () => {
    const { html, diag } = render('[公式](https://example.org/a) [連絡](mailto:a@example.org) [[入身]] 文。@src:s')
    expect(html).toContain('href="https://example.org/a"')
    expect(html).toContain('href="mailto:a@example.org"')
    expect(html).toContain('href="#/glossary/irimi"')
    expect(html).toContain('href="https://example.org/s"')
    expect(errors(diag)).toEqual([])
  })
})

describe('frontmatter は YAML だけ（---js などを実行しない）', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__frontmatterEval
  })

  it.each(['js', 'javascript', 'JS', 'coffee', 'json'])('「---%s」はエラーにして中身を読まない', (lang) => {
    const diag = new Diagnostics()
    const fm = parseFrontmatter(`---${lang}\n(globalThis.__frontmatterEval = 1, { id: 'x' })\n---\n本文\n`, diag, 'x.md:1')
    expect((globalThis as Record<string, unknown>).__frontmatterEval).toBeUndefined()
    expect(fm.data).toEqual({})
    expect(errors(diag).some((m) => m.includes('YAML だけ'))).toBe(true)
  })

  it('区切り線の言語名を読み取る', () => {
    expect(frontmatterLanguage('---\nid: a\n---\n')).toBe('')
    expect(frontmatterLanguage('﻿---js \nx\n---\n')).toBe('js')
    expect(frontmatterLanguage('----\n')).toBe('')
  })

  it('YAML（区切り線に何も書かない・yaml と書く）は今までどおり読む', () => {
    const diag = new Diagnostics()
    expect(parseFrontmatter('---\nid: irimi\n---\n本文\n', diag).data).toEqual({ id: 'irimi' })
    expect(parseFrontmatter('---yaml\nid: irimi\n---\n本文\n', diag).data).toEqual({ id: 'irimi' })
    expect(diag.items).toEqual([])
  })

  it('YAML の書き間違いはビルドを落とさずエラーにする', () => {
    const diag = new Diagnostics()
    expect(parseFrontmatter('---\nid: [a\n---\n', diag, 'x.md:1').data).toEqual({})
    expect(errors(diag).some((m) => m.includes('読めません'))).toBe(true)
  })
})

describe('生成物の書き出し先は src/generated の中だけ', () => {
  let root = ''
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it('id に「../」があっても外へ書かず、エラーにする', async () => {
    root = mkdtempSync(path.join(tmpdir(), 'aikido-sec-'))
    mkdirSync(path.join(root, 'content', 'glossary'), { recursive: true })
    const probe = ['..', '..', '..', 'escaped-probe'].join('/')
    writeFileSync(path.join(root, 'content', 'glossary', 'probe.md'), `---\nid: ${probe}\nname_ja: 検証\nreading: けんしょう\ncategory: waza\n---\n## 定義\n検証。\n`)
    const { diag } = await buildContent({ root, quiet: true, log: () => {} })
    expect(existsSync(path.join(root, 'escaped-probe.json'))).toBe(false)
    expect(errors(diag).some((m) => m.includes('小文字ローマ字'))).toBe(true)
    expect(errors(diag).some((m) => m.includes('src/generated の外'))).toBe(true)
  })
})

describe('その他', () => {
  it('動画の URL は https 以外をエラーにして出力しない', () => {
    const diag = new Diagnostics()
    const out = checkVideos(
      [
        { url: 'javascript:alert(1)', instructor: 'a', rank: 'shihan', note: '確認' },
        { url: 'https://youtu.be/abc?t=1', instructor: 'b', rank: 'shihan', note: '確認' },
      ],
      'x.md:1',
      diag,
    )
    expect(out.map((v) => v.url)).toEqual(['https://youtu.be/abc?t=1'])
    expect(errors(diag).some((m) => m.includes('https://'))).toBe(true)
  })

  it('ease は GSAP の名前だけ', () => {
    for (const ok of ['power2.inOut', 'power1.out', 'none', 'back.out(1.7)', 'sine']) expect(EASE_RE.test(ok)).toBe(true)
    for (const bad of ['__proto__', 'toString', 'power2.inOut; alert(1)', '']) expect(EASE_RE.test(bad)).toBe(false)
  })

  it('ログに出す原稿の文字列は改行・制御文字をエスケープする（CI のコマンド行を作らせない）', () => {
    const diag = new Diagnostics()
    diag.error('x.md:1', 'id「a\n::error::偽\u001b[31m」')
    const lines: string[] = []
    diag.print({ log: (s) => lines.push(s) })
    expect(lines[0]).not.toContain('\n')
    expect(lines[0]).not.toContain('\u001b')
    expect(lines[0]).toContain('\\u000a::error::')
  })

  it('CSP はインラインスクリプトの内容のハッシュだけを許す', () => {
    const csp = cspFor('<head><script>a()</script><script type="module" src="/x.js"></script></head>')
    expect(csp).toContain("script-src 'self' 'sha256-")
    expect(csp.match(/sha256-/g)).toHaveLength(1)
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src')) ?? ''
    expect(scriptSrc).not.toContain('unsafe')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'none'")
  })
})
