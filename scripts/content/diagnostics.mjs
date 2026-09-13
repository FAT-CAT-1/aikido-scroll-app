// ビルド時の診断（content-spec §6 / animation-spec §10 のエラー・警告・情報）を集める

export class Diagnostics {
  constructor() {
    /** @type {{ level: 'error' | 'warn' | 'info', loc: string, msg: string }[]} */
    this.items = []
  }

  error(loc, msg) {
    this.items.push({ level: 'error', loc, msg })
  }

  warn(loc, msg) {
    this.items.push({ level: 'warn', loc, msg })
  }

  info(loc, msg) {
    this.items.push({ level: 'info', loc, msg })
  }

  count(level) {
    return this.items.filter((i) => i.level === level).length
  }

  get errorCount() {
    return this.count('error')
  }

  get warnCount() {
    return this.count('warn')
  }

  /** @param {{ log?: (s: string) => void }} [opts] */
  print({ log = console.log } = {}) {
    const label = { error: 'エラー', warn: '警告', info: '情報' }
    const order = { error: 0, warn: 1, info: 2 }
    const sorted = [...this.items].sort((a, b) => order[a.level] - order[b.level] || a.loc.localeCompare(b.loc))
    for (const i of sorted) log(`[${label[i.level]}] ${i.loc}  ${i.msg}`)
    log(`build:content  エラー ${this.errorCount} ／ 警告 ${this.warnCount} ／ 情報 ${this.count('info')}`)
  }
}
