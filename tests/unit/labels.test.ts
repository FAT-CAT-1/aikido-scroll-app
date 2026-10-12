// 単語集の五十音の行分け（GlossaryList の見出し）
import { describe, expect, it } from 'vitest'
import { kanaRow } from '../../src/lib/content/labels'

describe('kanaRow', () => {
  it('各行の頭と終わりの文字を、その行に入れる', () => {
    expect(kanaRow('あいき')).toBe('あ')
    expect(kanaRow('おもて')).toBe('あ')
    expect(kanaRow('かまえ')).toBe('か')
    expect(kanaRow('ごきょう')).toBe('か')
    expect(kanaRow('わざ')).toBe('わ')
    expect(kanaRow('ん')).toBe('わ')
  })

  it('カタカナはひらがなと同じ行に入れる', () => {
    expect(kanaRow('アンドレ')).toBe('あ')
    expect(kanaRow('ノケ')).toBe('な')
  })

  it('「ゔ／ヴ」は「う」の濁音なので、あ行に入れる（わ行にしない）', () => {
    expect(kanaRow('ゔぁ')).toBe('あ')
    expect(kanaRow('ヴォルフ')).toBe('あ')
  })

  it('小さい「ゕ／ゖ」は、か行に入れる（わ行にしない）', () => {
    expect(kanaRow('ゕ')).toBe('か')
    expect(kanaRow('ゖ')).toBe('か')
  })

  it('かな以外と空は「他」', () => {
    expect(kanaRow('')).toBe('他')
    expect(kanaRow('  ')).toBe('他')
    expect(kanaRow('Aikido')).toBe('他')
    expect(kanaRow('合気')).toBe('他')
  })
})
