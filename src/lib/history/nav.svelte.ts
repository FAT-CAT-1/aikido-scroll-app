// ToggleStack（toggleStack.ts）を window の History とつなぎ、Svelte から読める状態にする
import { isNavState, ToggleStack, type NavState } from './toggleStack'

const currentPath = () => (location.hash && location.hash !== '#' ? location.hash : '#/')

class Nav {
  readonly stack = new ToggleStack(history, currentPath)
  state = $state.raw<NavState>(this.stack.state)

  constructor() {
    this.stack.subscribe((s) => (this.state = s))
    addEventListener('popstate', (e) => this.stack.onPopState(e.state))
    // hash だけが変わり popstate が来ない環境向け（アプリの状態と食い違ったときだけ同期）
    addEventListener('hashchange', () => {
      if (currentPath() !== this.state.path) this.stack.onPopState(isNavState(history.state) ? history.state : null)
    })
    // アプリ内リンク（#/…）はすべて navigate を通す：遷移前に画面の状態を保存し、戻ったとき復元できるようにする
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      const href = a?.getAttribute('href')
      if (!a || !href || !href.startsWith('#/') || (a.target && a.target !== '_self')) return
      e.preventDefault()
      this.stack.navigate(href)
    })
  }

  navigate(path: string) {
    return this.stack.navigate(path)
  }
}

export const nav = new Nav()
