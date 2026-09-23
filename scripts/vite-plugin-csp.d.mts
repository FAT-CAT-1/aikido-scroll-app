import type { Plugin } from 'vite'

/** 本番ビルドの index.html に CSP を meta で入れる（scripts/vite-plugin-csp.mjs） */
export default function cspPlugin(): Plugin
export function cspFor(html: string): string
