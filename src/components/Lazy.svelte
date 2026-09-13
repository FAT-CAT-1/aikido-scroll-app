<script lang="ts" generics="P extends Record<string, unknown>">
  // 画面コンポーネントの遅延読み込み（初回表示に必要な JS を減らす。読み込んだ画面はキャッシュされ、PWA では precache 済み）
  import type { Component } from 'svelte'
  import { holdFontsUntil } from '../lib/fonts'

  interface Props {
    load: () => Promise<{ default: Component<P> }>
    props: P
  }
  let { load, props }: Props = $props()
</script>

{#await holdFontsUntil(load())}
  <main class="loading" aria-busy="true">
    <p>読み込み中…</p>
  </main>
{:then mod}
  <mod.default {...props} />
{:catch}
  <main class="loading">
    <p>画面を読み込めませんでした。通信状態を確かめて、もう一度開いてください。</p>
  </main>
{/await}

<style>
  .loading {
    min-height: 60dvh;
    display: grid;
    place-items: center;
    color: var(--sumi-juu);
    font-size: var(--text-s);
  }
</style>
