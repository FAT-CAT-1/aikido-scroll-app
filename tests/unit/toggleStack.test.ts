// トグルの深さと History API の同期（design-complete A-6 / backlog T22）
import { describe, expect, it } from 'vitest'
import { ToggleStack, type HistoryLike } from '../../src/lib/history/toggleStack'

/** ブラウザの History を模す。popstate は非同期（flush で配送） */
class FakeHistory implements HistoryLike {
  entries: { state: unknown; url: string }[] = [{ state: null, url: '#/techniques/ikkyo-omote' }]
  index = 0
  pushes = 0
  private queue: (() => void)[] = []
  onpop: (state: unknown) => void = () => {}

  get state() {
    return this.entries[this.index]!.state
  }
  get url() {
    return this.entries[this.index]!.url
  }
  pushState(data: unknown, _unused: string, url?: string | null) {
    this.entries = this.entries.slice(0, this.index + 1)
    this.entries.push({ state: structuredClone(data), url: url ?? this.url })
    this.index++
    this.pushes++
  }
  replaceState(data: unknown, _unused: string, url?: string | null) {
    this.entries[this.index] = { state: structuredClone(data), url: url ?? this.url }
  }
  back() {
    this.go(-1)
  }
  go(delta: number) {
    const next = Math.max(0, Math.min(this.entries.length - 1, this.index + delta))
    if (next === this.index) return
    this.index = next
    this.queue.push(() => this.onpop(this.state))
  }
  flush() {
    const q = this.queue
    this.queue = []
    q.forEach((f) => f())
  }
}

function setup() {
  const h = new FakeHistory()
  const stack = new ToggleStack(h, () => h.url)
  h.onpop = (s) => stack.onPopState(s)
  return { h, stack }
}

describe('ToggleStack', () => {
  it('開く・深くするたび1エントリ push、深さは最大5', () => {
    const { h, stack } = setup()
    expect(stack.open('tori', 'knee', 'contact')).toBe(true)
    for (let i = 0; i < 10; i++) stack.deepen()
    expect(stack.depth).toBe(5)
    expect(h.pushes).toBe(5)
    expect(stack.state.toggle).toMatchObject({ role: 'tori', part: 'knee', kf: 'contact', depth: 5 })
  })

  it('戻るボタン（popstate）で1段ずつ閉じ、popstate では push しない', () => {
    const { h, stack } = setup()
    stack.open('uke', 'eye', 'kamae')
    stack.deepen()
    stack.deepen()
    const pushes = h.pushes
    h.back()
    h.flush()
    expect(stack.depth).toBe(2)
    h.back()
    h.flush()
    h.back()
    h.flush()
    expect(stack.depth).toBe(0)
    expect(h.pushes).toBe(pushes)
  })

  it('手動の「一段閉じる」は history.back() と同期し、popstate 待ちの二重操作を無視する', () => {
    const { h, stack } = setup()
    stack.open('tori', 'hara', 'osae')
    stack.deepen()
    expect(stack.closeOne()).toBe(true)
    expect(stack.closeOne()).toBe(false) // まだ popstate が来ていない
    expect(stack.deepen()).toBe(false)
    h.flush()
    expect(stack.depth).toBe(1)
    expect(stack.busy).toBe(false)
    expect(h.index).toBe(1)
  })

  it('全部閉じる＝開いた段数だけ go(-depth)', () => {
    const { h, stack } = setup()
    stack.open('tori', 'foot', 'irimi')
    stack.deepen()
    stack.deepen()
    stack.closeAll()
    h.flush()
    expect(stack.depth).toBe(0)
    expect(h.index).toBe(0)
  })

  it('進む（forward）で再び開いた状態を描く', () => {
    const { h, stack } = setup()
    stack.open('tori', 'eye', 'kamae')
    stack.deepen()
    h.back()
    h.flush()
    h.go(1)
    h.flush()
    expect(stack.depth).toBe(2)
  })

  it('画面遷移は今の状態を保存してから push し、戻ると保存した状態とトグルの深さに戻る', () => {
    const { h, stack } = setup()
    let progress = 0.35
    stack.registerSnapshot('technique', () => ({ progress }))
    stack.open('uke', 'shoulder', 'kuzushi')
    stack.deepen()
    stack.deepen()
    progress = 0.36
    stack.navigate('#/glossary/tegatana')
    expect(stack.state.path).toBe('#/glossary/tegatana')
    expect(stack.depth).toBe(0)
    h.back()
    h.flush()
    expect(stack.state.path).toBe('#/techniques/ikkyo-omote')
    expect(stack.depth).toBe(3)
    expect(stack.state.snap.technique).toEqual({ progress: 0.36 })
  })

  it('アプリが作っていないエントリ（手入力の URL）は新しい状態で置き換える', () => {
    const { h, stack } = setup()
    stack.open('tori', 'eye', 'kamae')
    h.entries.push({ state: null, url: '#/glossary' })
    h.index++
    stack.onPopState(null)
    expect(stack.state.path).toBe('#/glossary')
    expect(stack.depth).toBe(0)
    expect(h.state).toMatchObject({ path: '#/glossary', toggle: null })
  })

  it('再読み込み後（同じ path の state が残っている）はトグルの深さを引き継ぐ', () => {
    const { h, stack } = setup()
    stack.open('tori', 'knee', 'contact')
    stack.deepen()
    const reloaded = new ToggleStack(h, () => h.url)
    expect(reloaded.depth).toBe(2)
  })
})
