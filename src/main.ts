import { mount } from 'svelte'
import './styles/tokens.css'
import './styles/base.css'
import './styles/content.css'
import App from './App.svelte'
import { setupFonts } from './lib/fonts'
import { setupPwa } from './lib/pwa.svelte'

// 画面の読み込み（mount 中の遅延読み込み）より先に、フォントの読み込み開始の待ち合わせを用意する
setupFonts()

const app = mount(App, {
  target: document.getElementById('app')!,
})

// HTML だけで出していた表紙を、アプリの最初の描画の後に取り除く
requestAnimationFrame(() => document.getElementById('splash')?.remove())
setTimeout(() => document.getElementById('splash')?.remove(), 1500)

setupPwa()

export default app
