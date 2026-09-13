// hash ルート（design-complete A-8）: #/, #/techniques, #/techniques/:id, #/kihon/:id, #/glossary, #/glossary/:slug, #/pages/:name

export type Route =
  | { name: 'home' }
  | { name: 'techniques' }
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
  if (head === 'techniques') return id ? { name: 'technique', id, kind: 'technique' } : { name: 'techniques' }
  if (head === 'kihon') return id ? { name: 'technique', id, kind: 'kihon' } : { name: 'techniques' }
  if (head === 'glossary') return id ? { name: 'term', id } : { name: 'glossary' }
  if (head === 'pages' && id) return { name: 'page', id }
  return { name: 'notfound', path }
}

export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'techniques':
      return '#/techniques'
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
  route = $state<Route>(parseHash(location.hash))

  constructor() {
    const sync = () => {
      const next = parseHash(location.hash)
      if (hrefOf(next) !== hrefOf(this.route)) this.route = next
    }
    addEventListener('hashchange', sync)
    addEventListener('popstate', sync)
  }
}

export const router = new Router()
