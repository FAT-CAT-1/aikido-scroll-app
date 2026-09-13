// 信頼マーク・用語リンク・出典・文字数（content-spec §2-4〜2-6, §9）
import { describe, expect, it } from 'vitest'
import { Diagnostics } from '../../scripts/content/diagnostics.mjs'
import { charCount, createRenderer } from '../../scripts/content/inline.mjs'

const terms: Record<string, { kind: 'glossary' | 'technique'; id: string }> = {
  入身: { kind: 'glossary', id: 'irimi' },
  入り身: { kind: 'glossary', id: 'irimi' },
  手刀: { kind: 'glossary', id: 'tegatana' },
  '一教（裏）': { kind: 'technique', id: 'ikkyo-ura' },
}

function setup() {
  const diag = new Diagnostics()
  const renderer = createRenderer({ resolveTerm: (n: string) => terms[n] ?? null, diag })
  const render = (md: string, opts: Record<string, unknown> = {}) =>
    renderer.render(md, { loc: 't.md:1', inline: true, sources: { shinsa: { name: '審査要項', url: 'https://example.org/s' } }, ...opts })
  return { diag, render }
}

describe('charCount（全角=1・半角英数=0.5）', () => {
  it('全角と半角を数える', () => {
    expect(charCount('入身')).toBe(2)
    expect(charCount('abc')).toBe(1.5)
    expect(charCount('5級')).toBe(1.5)
  })
})

describe('信頼マーク', () => {
  it('f/v/無印を t-f/t-v/t-g に変換する', () => {
    const { render, diag } = setup()
    const r = render('一般の文。{{f:事実の文。@src:shinsa}}{{v:師範差の文。}}')
    expect(r.html).toContain('<span class="t-g">一般の文。</span>')
    expect(r.html).toContain('<span class="t-f">事実の文。<span class="src">（出典：<a href="https://example.org/s"')
    expect(r.html).toContain('<span class="t-v">師範差の文。</span>')
    expect(diag.errorCount).toBe(0)
    expect(diag.warnCount).toBe(0)
  })

  it('文字数は記法と出典表記を除いた表示テキストで数える', () => {
    const { render } = setup()
    const r = render('{{f:[[入り身|入身]]する。@src:shinsa}}')
    expect(r.text).toBe('入り身する。')
    expect(charCount(r.text)).toBe(6)
  })

  it('1マークに2文あるとエラー', () => {
    const { render, diag } = setup()
    render('{{v:一文目。二文目。}}')
    expect(diag.items.some((i) => i.level === 'error' && i.msg.includes('複数の文'))).toBe(true)
  })

  it('入れ子・閉じ忘れ・対応の無い閉じ記号はエラー', () => {
    for (const md of ['{{f:外{{v:内。}}。}}', '{{v:閉じていない。', '閉じだけ。}}']) {
      const { render, diag } = setup()
      render(md)
      expect(diag.errorCount, md).toBeGreaterThan(0)
    }
  })

  it('@src の無い {{f:}} は警告', () => {
    const { render, diag } = setup()
    render('{{f:出典の無い事実。}}')
    expect(diag.items.some((i) => i.level === 'warn' && i.msg.includes('@src'))).toBe(true)
  })
})

describe('用語リンク', () => {
  it('単語集へリンクし、同じ文章で2回目以降はリンクしない', () => {
    const { render } = setup()
    const r = render('[[入身]]して、また[[入身]]する。')
    expect(r.html.match(/<a /g)?.length).toBe(1)
    expect(r.html).toContain('href="#/glossary/irimi"')
    expect(r.html).toContain('data-term="irimi"')
    expect([...r.terms]).toEqual(['irimi'])
  })

  it('[[表示|正規名]] は表示を出し正規名で解決する', () => {
    const { render } = setup()
    const r = render('[[入り身|入身]]する。')
    expect(r.html).toContain('>入り身</a>')
    expect(r.html).toContain('#/glossary/irimi')
  })

  it('単語集に無ければ技へリンクする（D-18）', () => {
    const { render } = setup()
    const r = render('表裏の相方は[[一教（裏）]]。')
    expect(r.html).toContain('href="#/techniques/ikkyo-ura"')
  })

  it('未解決の用語は警告し、文字だけ出す', () => {
    const { render, diag } = setup()
    const r = render('[[未定義語]]を使う。')
    expect(r.html).toContain('term-unresolved')
    expect(diag.items.some((i) => i.level === 'warn' && i.msg.includes('未解決'))).toBe(true)
  })

  it('HTML の特殊文字はエスケープされる', () => {
    const { render } = setup()
    expect(render('a < b & "c"').html).not.toContain('< b')
  })
})
