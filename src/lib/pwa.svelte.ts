// Service Worker の登録と通知（design-complete A-9 / backlog T28）
// - registerType: autoUpdate（新しい版が来たら Service Worker が入れ替わり、ページが再読み込みされる）
// - 再読み込み後に「新しい版に更新しました」、初回の precache 完了時に「オフラインでも使えます」を一度だけ知らせる
// - 表示中の画面（トグルの深さ・進捗など）は history.state に残っているので、再読み込みしても元の画面に戻る
import { registerSW } from 'virtual:pwa-register'

const UPDATED_KEY = 'aikido-sw-updated'
const OFFLINE_READY_KEY = 'aikido-offline-ready'
const HOUR = 60 * 60 * 1000

class PwaNotice {
  message = $state('')
  private timer: ReturnType<typeof setTimeout> | undefined

  show(message: string) {
    this.message = message
    clearTimeout(this.timer)
    this.timer = setTimeout(() => (this.message = ''), 6000)
  }

  dismiss() {
    this.message = ''
  }
}

export const pwaNotice = new PwaNotice()

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function setupPwa() {
  if (!('serviceWorker' in navigator)) return
  const store = storage()

  // 前回、更新のために再読み込みされていたら知らせる
  try {
    if (sessionStorage.getItem(UPDATED_KEY)) {
      sessionStorage.removeItem(UPDATED_KEY)
      pwaNotice.show('新しい版に更新しました')
    }
  } catch {
    /* 保存領域が使えない環境では通知しない */
  }

  // 既に制御している Service Worker が入れ替わる＝更新。直後にプラグインが再読み込みする
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    try {
      sessionStorage.setItem(UPDATED_KEY, '1')
    } catch {
      /* noop */
    }
  })

  // 登録はページの読み込み完了後（既定）。precache（約2.3MB）の取得が初回表示の JS・データと帯域を取り合わないようにする
  registerSW({
    onOfflineReady() {
      if (store?.getItem(OFFLINE_READY_KEY)) return
      store?.setItem(OFFLINE_READY_KEY, '1')
      pwaNotice.show('オフラインでも使えるようになりました')
    },
    onRegisteredSW(_url, registration) {
      // 開いたままでも1時間ごとに新しい版を確かめる
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR)
    },
  })
}
