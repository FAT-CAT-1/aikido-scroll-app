<script lang="ts">
  // 章ページ（S-06：沿革・理念など。原稿 content/pages/*.md）
  import { tick } from 'svelte'
  import { loadPage } from '../lib/content/loader'
  import type { Page } from '../lib/content/types'
  import { nav } from '../lib/history/nav.svelte'
  import BrushLine from './BrushLine.svelte'
  import PageHeader from './PageHeader.svelte'

  let { id }: { id: string } = $props()

  function readRestore(): number | null {
    const s = nav.state.snap.page as { id?: string; scrollY?: number } | undefined
    return s && s.id === id && typeof s.scrollY === 'number' ? s.scrollY : null
  }
  const restoreY = readRestore()

  let page = $state.raw<Page | null>(null)
  let loading = $state(true)

  $effect(() => {
    let cancelled = false
    loadPage(id).then(async (p) => {
      if (cancelled) return
      page = p
      loading = false
      if (restoreY !== null) {
        await tick()
        window.scrollTo({ top: restoreY, behavior: 'instant' })
      }
    })
    return () => {
      cancelled = true
    }
  })

  $effect(() => nav.stack.registerSnapshot('page', () => ({ id, scrollY: Math.round(window.scrollY) })))
</script>

<main class="page">
  {#if loading}
    <p class="note">読み込み中…</p>
  {:else if !page}
    <PageHeader title="ページが見つかりません" />
    <p>この章の原稿は準備中です。<a href="#/">巻物へ戻る</a></p>
  {:else}
    <PageHeader title={page.title} />
    {#if page.lead}
      <p class="lead">{page.lead}</p>
    {/if}
    <BrushLine width={200} />
    <article class="prose">{@html page.html}</article>
  {/if}
</main>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 var(--space-3) var(--space-6);
  }
  .lead {
    font-size: var(--text-l);
    line-height: 1.7;
    margin: var(--space-2) 0 var(--space-3);
  }
  .prose {
    margin-top: var(--space-4);
  }
  .prose :global(h2) {
    font-size: var(--text-xl);
    margin: var(--space-6) 0 var(--space-3);
    padding-left: var(--space-2);
    border-left: var(--line-bold) solid var(--shu);
  }
  .prose :global(h3) {
    font-size: var(--text-l);
    margin: var(--space-4) 0 var(--space-2);
  }
  .prose :global(p) {
    margin: 0 0 var(--space-3);
  }
  .prose :global(ul),
  .prose :global(ol) {
    padding-left: 1.4em;
    margin: 0 0 var(--space-3);
  }
  .prose :global(li + li) {
    margin-top: var(--space-1);
  }
  /* 表はスマホで横スクロール（ページ全体は横に広げない） */
  .prose :global(table) {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
    margin: 0 0 var(--space-4);
    font-size: var(--text-s);
    max-width: 100%;
  }
  .prose :global(th),
  .prose :global(td) {
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--sumi-sei);
    text-align: left;
    vertical-align: top;
  }
  .prose :global(th) {
    font-weight: 700;
    color: var(--sumi-shou);
    white-space: nowrap;
  }
  .prose :global(blockquote) {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-left: var(--line-thin) solid var(--sumi-tan);
    background: var(--washi-light);
  }
  .note {
    padding: var(--space-5);
  }
</style>
