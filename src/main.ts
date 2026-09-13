import { mount } from 'svelte'
import './styles/tokens.css'
import './styles/base.css'
import './styles/content.css'
import App from './App.svelte'
import { setupPwa } from './lib/pwa.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

setupPwa()

export default app
