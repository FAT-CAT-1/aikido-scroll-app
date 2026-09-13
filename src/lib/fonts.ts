// Web フォント（public/fonts のサブセット、計 約1.8MB）の読み込み開始を、画面の中身の表示後まで遅らせる（backlog T31）
// - html.fonts が付くまでは端末の明朝で表示し、付いたら font-display: swap で順に差し替わる（tokens.css）
// - 初回：遅延読み込みの画面と技データが出揃ってから付ける。3G で JS・データより先にフォントが帯域を取らないようにする
// - 2回目以降：Service Worker が制御している＝フォントも precache 済みなので、index.html のインラインスクリプトが最初から付ける
const FALLBACK_MS = 4000

let holds = 0
let started = false
let fallback: ReturnType<typeof setTimeout> | undefined

function start() {
  if (started) return
  started = true
  clearTimeout(fallback)
  document.documentElement.classList.add('fonts')
}

function startWhenIdle() {
  if (started || holds > 0 || document.readyState !== 'complete') return
  // 表示した直後の描画を邪魔しないよう、次に手が空いたときに付ける
  const run = () => {
    if (holds === 0) start()
  }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1000 })
  else setTimeout(run, 100)
}

/** 画面の中身を読み込んでいる間、フォントの読み込み開始を待たせる。返り値の関数を呼ぶと解除 */
export function holdFonts(): () => void {
  if (started) return () => {}
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds--
    startWhenIdle()
  }
}

/** 読み込み中の Promise が終わるまでフォントを待たせる（終わった画面の描画を待つため、解除は次のタスクで） */
export function holdFontsUntil<T>(promise: Promise<T>): Promise<T> {
  const release = holdFonts()
  const later = () => setTimeout(release, 0)
  promise.then(later, later)
  return promise
}

export function setupFonts() {
  if (document.documentElement.classList.contains('fonts')) {
    started = true
    return
  }
  // 読み込みが長引いても、いずれは必ず切り替える
  fallback = setTimeout(start, FALLBACK_MS)
  if (document.readyState === 'complete') startWhenIdle()
  else window.addEventListener('load', startWhenIdle, { once: true })
}
