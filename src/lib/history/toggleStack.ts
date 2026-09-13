// トグルの深さと画面遷移を History API と同期する（design-complete A-6 / SKILL §4 / backlog T22）
//
// 方針：状態は history.state が正。UI は現在のエントリの状態から描く。
// - 部位を開く・1段深くする → pushState（1段＝1エントリ）
// - 戻るボタン → popstate で1つ前のエントリの状態を描く（＝1段閉じる）。popstate では決して push しない
// - 画面の「一段閉じる」・ピンチイン・Esc → history.back() を呼び、popstate を待つ（手動クローズとスタックを同期）
// - 自分で呼んだ back()/go() の popstate が届くまでは次の開閉を受け付けない（二重 push・順序の逆転を防ぐ）
// - 用語リンクなどの画面遷移 → 今の画面の状態（進捗・視点・スクロール）を replaceState で保存してから push
//   → 戻ると保存した状態とトグルの深さが復元される（F-07）
// - DOM・Svelte に依存しない（HistoryLike を差し替えて単体テストする）

import type { Part, Role } from '../content/types'

export const MAX_DEPTH = 5
const APP = 'aikido-scroll-app'

export interface ToggleEntry {
  role: Role
  part: Part
  /** 開いたときのキーフレーム id */
  kf: string
  depth: number
}

export interface NavState {
  app: typeof APP
  /** エントリの通し番号（進む・戻るの判定・デバッグ用） */
  seq: number
  /** hash ルート（例 #/techniques/ikkyo-omote） */
  path: string
  toggle: ToggleEntry | null
  /** 画面の復元用（進捗・視点・スクロール位置など） */
  snap: Record<string, unknown>
}

export interface HistoryLike {
  readonly state: unknown
  pushState(data: unknown, unused: string, url?: string | null): void
  replaceState(data: unknown, unused: string, url?: string | null): void
  back(): void
  go(delta: number): void
}

export function isNavState(s: unknown, path?: string): s is NavState {
  if (!s || typeof s !== 'object') return false
  const o = s as Partial<NavState>
  return o.app === APP && typeof o.path === 'string' && typeof o.seq === 'number' && (path === undefined || o.path === path)
}

type Listener = (state: NavState) => void

export class ToggleStack {
  private current: NavState
  private pending = 0
  private pendingTimer: ReturnType<typeof setTimeout> | undefined
  private readonly listeners = new Set<Listener>()
  private readonly snapshotProviders = new Map<string, () => Record<string, unknown>>()

  constructor(
    private readonly history: HistoryLike,
    private readonly currentPath: () => string,
  ) {
    const path = currentPath()
    const s = history.state
    if (isNavState(s, path)) {
      this.current = s
    } else {
      this.current = { app: APP, seq: 0, path, toggle: null, snap: {} }
      history.replaceState(this.current, '')
    }
  }

  get state(): NavState {
    return this.current
  }

  get depth(): number {
    return this.current.toggle?.depth ?? 0
  }

  /** 自分で呼んだ back()/go() の popstate 待ちか */
  get busy(): boolean {
    return this.pending > 0
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** 画面遷移の直前に今の画面の状態を集める関数を登録する */
  registerSnapshot(key: string, provide: () => Record<string, unknown>): () => void {
    this.snapshotProviders.set(key, provide)
    return () => {
      if (this.snapshotProviders.get(key) === provide) this.snapshotProviders.delete(key)
    }
  }

  /** 何も開いていない状態から部位を開く（深さ1） */
  open(role: Role, part: Part, kf: string): boolean {
    if (this.busy || this.current.toggle) return false
    return this.push({ role, part, kf, depth: 1 })
  }

  /** 1段深くする */
  deepen(): boolean {
    const cur = this.current.toggle
    if (this.busy || !cur || cur.depth >= MAX_DEPTH) return false
    return this.push({ ...cur, depth: cur.depth + 1 })
  }

  /** 1段閉じる（history.back と同期） */
  closeOne(): boolean {
    if (this.busy || !this.current.toggle) return false
    this.expectPop()
    this.history.back()
    return true
  }

  /** すべて閉じる（開いた段数だけ戻る） */
  closeAll(): boolean {
    const d = this.depth
    if (this.busy || d === 0) return false
    this.expectPop()
    this.history.go(-d)
    return true
  }

  /** ルートを変える（用語リンクなど）。今の画面の状態を保存してから push */
  navigate(path: string): boolean {
    if (this.busy || path === this.current.path) return false
    this.saveSnapshot(this.collectSnapshot())
    const next: NavState = { app: APP, seq: this.current.seq + 1, path, toggle: null, snap: {} }
    this.history.pushState(next, '', path)
    this.set(next)
    return true
  }

  /** 今のエントリに画面の状態を保存する（replaceState。回数制限があるので頻繁には呼ばない） */
  saveSnapshot(patch: Record<string, unknown>): void {
    this.current = { ...this.current, snap: { ...this.current.snap, ...patch } }
    this.history.replaceState(this.current, '')
  }

  /** window の popstate / hashchange から呼ぶ */
  onPopState(state: unknown): void {
    if (this.pending > 0) {
      this.pending--
      if (this.pending === 0) clearTimeout(this.pendingTimer)
    }
    const path = this.currentPath()
    if (isNavState(state, path)) {
      this.set(state)
    } else {
      // 手入力の URL・外部リンクなど、このアプリが作っていないエントリ
      const fresh: NavState = { app: APP, seq: this.current.seq + 1, path, toggle: null, snap: {} }
      this.history.replaceState(fresh, '')
      this.set(fresh)
    }
  }

  private push(toggle: ToggleEntry): boolean {
    const cur = this.current.toggle
    if (cur && cur.role === toggle.role && cur.part === toggle.part && cur.kf === toggle.kf && cur.depth === toggle.depth) return false
    const next: NavState = { ...this.current, seq: this.current.seq + 1, toggle, snap: { ...this.current.snap, ...this.collectSnapshot() } }
    this.history.pushState(next, '')
    this.set(next)
    return true
  }

  private collectSnapshot(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, provide] of this.snapshotProviders) out[key] = provide()
    return out
  }

  private expectPop() {
    this.pending++
    // popstate が来ない環境（履歴の先頭で戻った等）でも操作不能にならないよう保険をかける
    clearTimeout(this.pendingTimer)
    this.pendingTimer = setTimeout(() => (this.pending = 0), 1500)
  }

  private set(state: NavState) {
    this.current = state
    for (const fn of this.listeners) fn(state)
  }
}
