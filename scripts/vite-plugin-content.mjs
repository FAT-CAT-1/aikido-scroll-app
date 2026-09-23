// Vite プラグイン: 起動・ビルド時に build:content を実行し、dev では content/ の変更を監視して再生成する
// ログは件数とエラーだけ（警告の詳細は `npm run build:content` で見る）
import path from 'node:path'
import { buildContent } from './build-content.mjs'
import { safe } from './content/diagnostics.mjs'

/** @returns {import('vite').Plugin} */
export default function contentPlugin() {
  let root = process.cwd()
  let isBuild = false
  let timer = /** @type {NodeJS.Timeout | undefined} */ (undefined)

  const run = async (logger) => {
    const { diag } = await buildContent({ root, quiet: true, log: () => {} })
    for (const item of diag.items.filter((i) => i.level === 'error')) logger.error(`[content] ${safe(item.loc)}  ${safe(item.msg)}`)
    logger.info(`[content] 生成（エラー ${diag.errorCount} / 警告 ${diag.warnCount}${diag.warnCount ? '・詳細は npm run build:content' : ''}）`, { timestamp: true })
    return diag
  }

  return {
    name: 'aikido-content',
    configResolved(config) {
      root = config.root
      isBuild = config.command === 'build'
    },
    async buildStart() {
      const logger = { info: (s) => console.log(s), error: (s) => console.error(s) }
      const diag = await run(logger)
      if (isBuild && diag.errorCount) this.error(`build:content でエラー ${diag.errorCount} 件`)
    },
    configureServer(server) {
      const contentDir = path.join(root, 'content')
      server.watcher.add(contentDir)
      const rebuild = (file) => {
        if (!path.resolve(file).startsWith(contentDir)) return
        clearTimeout(timer)
        // 原稿の書きかけで例外が出ても dev サーバーを止めない（docs/decisions.md D-46）
        timer = setTimeout(() => run(server.config.logger).catch((e) => server.config.logger.error(`[content] 生成に失敗: ${safe(e instanceof Error ? e.message : e)}`)), 300)
      }
      server.watcher.on('add', rebuild)
      server.watcher.on('change', rebuild)
      server.watcher.on('unlink', rebuild)
    },
  }
}
