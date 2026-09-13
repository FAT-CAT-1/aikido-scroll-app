// hash ルート（design-complete A-8）: #/, #/techniques, #/techniques/:id, #/kihon, #/kihon/:id, #/glossary, #/glossary/:slug, #/pages/:name
// 現在のルートは history の状態（nav.state.path）から決める（T22）
import { nav } from './history/nav.svelte'

export type Route =
  | { name: 'home' }
  | { name: 'techniques'; kind: 'technique' | 'kihon' }
  | { name: 'technique'; id: string; kind: 'technique' | 'kihon' }
  | { name: 'glossary' }
  | { name: 'term'; id: string }
  | { name: 'page'; id: string }
  | { name: 'notfound'; path: string }

export function parseHash(hash: string): Route {
  let path = hash.replace(/^#/, '')
  try {
    path = decodeURIComponent(path)
  } catch {
    /* 不正なエンコードはそのまま */
  }
  const seg = path.split('?')[0]!.split('/').filter(Boolean)
  const [head, id] = seg
  if (!head) return { name: 'home' }
  if (head === 'techniques') return id ? { name: 'technique', id, kind: 'technique' } : { name: 'techniques', kind: 'technique' }
  if (head === 'kihon') return id ? { name: 'technique', id, kind: 'kihon' } : { name: 'techniques', kind: 'kihon' }
  if (head === 'glossary') return id ? { name: 'term', id } : { name: 'glossary' }
  if (head === 'pages' && id) return { name: 'page', id }
  return { name: 'notfound', path }
}

export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'techniques':
      return route.kind === 'kihon' ? '#/kihon' : '#/techniques'
    case 'technique':
      return `#/${route.kind === 'kihon' ? 'kihon' : 'techniques'}/${route.id}`
    case 'glossary':
      return '#/glossary'
    case 'term':
      return `#/glossary/${route.id}`
    case 'page':
      return `#/pages/${route.id}`
    case 'notfound':
      return `#${route.path}`
  }
}

class Router {
  // history の状態はトグルの開閉でも毎回新しいオブジェクトになるので、path の文字列が変わったときだけルートを作り直す。
  // （ルートを直接派生させると、同じ画面でもトグル開閉のたびに画面が作り直され、読み込みやフォーカスがやり直しになる）
  private readonly path = $derived(nav.state.path)
  readonly route = $derived<Route>(parseHash(this.path))
}

export const router = new Router()
