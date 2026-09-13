<script lang="ts">
  // 一覧・詳細画面の共通見出し。「戻る」はアプリ内に戻り先があれば history.back()、なければ親の画面へ
  import { nav } from '../lib/history/nav.svelte'

  interface Props {
    /** 空なら見出しを出さない（画面側で h1 を持つ場合） */
    title?: string
    sub?: string
    /** 戻り先が無いときに移動する画面 */
    fallback?: string
    fallbackLabel?: string
  }
  let { title = '', sub = '', fallback = '#/', fallbackLabel = '巻物' }: Props = $props()

  function back(e: MouseEvent) {
    // アプリ内で遷移してきた（seq > 0）ならブラウザの戻ると同じ動きにする
    if (nav.state.seq > 0 && history.length > 1) {
      e.preventDefault()
      history.back()
    }
  }
</script>

<header class="page-head">
  <a class="back" href={fallback} onclick={back}>← {nav.state.seq > 0 ? '戻る' : fallbackLabel}</a>
  {#if title}<h1>{title}</h1>{/if}
  {#if sub}<p class="sub">{sub}</p>{/if}
</header>

<style>
  .page-head {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) 0 var(--space-2);
  }
  .back {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-min);
    font-size: var(--text-s);
  }
  h1 {
    font-size: var(--text-xxl);
  }
  .sub {
    font-family: var(--font-sub);
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
</style>
