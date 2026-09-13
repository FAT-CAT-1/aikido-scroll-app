// Vite プラグイン: 起動・ビルド時に build:content を実行し、dev では content/ の変更を監視して再生成する
import path from 'node:path'
import { buildContent } from './build-content.mjs'

/** @returns {import('vite').Plugin} */
export default function contentPlugin() {
  let root = process.cwd()
  let isBuild = false
  let timer = /** @type {NodeJS.Timeout | undefined} */ (undefined)

  return {
    name: 'aikido-content',
    configResolved(config) {
      root = config.root
      isBuild = config.command === 'build'
    },
    async buildStart() {
      const { diag } = await buildContent({ root, quiet: true })
      if (isBuild && diag.errorCount) this.error(`build:content でエラー ${diag.errorCount} 件（上のログを参照）`)
    },
    configureServer(server) {
      const contentDir = path.join(root, 'content')
      server.watcher.add(contentDir)
      const rebuild = (file) => {
        if (!path.resolve(file).startsWith(contentDir)) return
        clearTimeout(timer)
        timer = setTimeout(async () => {
          const { diag } = await buildContent({ root, quiet: true })
          server.config.logger.info(`[content] 再生成（エラー ${diag.errorCount} / 警告 ${diag.warnCount}）`, { timestamp: true })
        }, 150)
      }
      server.watcher.on('add', rebuild)
      server.watcher.on('change', rebuild)
      server.watcher.on('unlink', rebuild)
    },
  }
}
