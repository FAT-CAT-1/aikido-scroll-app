import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// GitHub Pages のサブパス配信（design-complete A-10）。カスタムドメイン時は '/'
const base = '/aikido-scroll-app/'

export default defineConfig({
  base,
  plugins: [svelte()],
})
