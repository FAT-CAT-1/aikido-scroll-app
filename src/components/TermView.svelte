<script lang="ts">
  // 用語詳細（S-05 / design-complete A-8「used_in から技へ逆リンク、動画リンク表示」/ backlog T27）
  import { glossaryIndex } from '../lib/content/glossary-index'
  import { contentIndex, loadGlossary } from '../lib/content/loader'
  import { GLOSSARY_CATEGORY_LABEL, VIDEO_RANK_LABEL } from '../lib/content/labels'
  import type { GlossaryEntry } from '../lib/content/types'
  import PageHeader from './PageHeader.svelte'
  import StatusBadge from './StatusBadge.svelte'

  let { id }: { id: string } = $props()

  let entry = $state.raw<GlossaryEntry | null>(null)
  let loading = $state(true)

  $effect(() => {
    let cancelled = false
    loading = true
    loadGlossary(id).then((g) => {
      if (cancelled) return
      entry = g
      loading = false
      // 見出しへフォーカス（読み上げがこの用語から始まる）
      queueMicrotask(() => document.getElementById('term-title')?.focus({ preventScroll: true }))
    })
    return () => {
      cancelled = true
    }
  })

  const nameOfTerm = (slug: string) => glossaryIndex.find((g) => g.id === slug)?.name_ja ?? slug
  const allTechniques = [...contentIndex.techniques, ...contentIndex.kihon]
  const techniqueOf = (tid: string) => allTechniques.find((t) => t.id === tid)
</script>

<main class="term">
  {#if loading}
    <p class="note">読み込み中…</p>
  {:else if !entry}
    <PageHeader title="用語が見つかりません" fallback="#/glossary" fallbackLabel="単語集" />
    <p><a href="#/glossary">単語集の一覧へ</a></p>
  {:else}
    <PageHeader fallback="#/glossary" fallbackLabel="単語集" />
    <article aria-labelledby="term-title">
      <header class="head">
        <h1 id="term-title" tabindex="-1">{entry.name_ja}</h1>
        <p class="reading">
          {entry.reading}{#if entry.romaji}<span class="romaji">{entry.romaji}</span>{/if}
        </p>
        {#if entry.name_en.length}<p class="en">{entry.name_en.join(' / ')}</p>{/if}
        <p class="meta">
          <span class="cat">{GLOSSARY_CATEGORY_LABEL[entry.category] ?? entry.category}</span>
          {#if entry.aliases.length}<span class="aliases">別表記：{entry.aliases.join('、')}</span>{/if}
          <StatusBadge status={entry.status} />
        </p>
      </header>

      <section class="block" aria-labelledby="def-h">
        <h2 id="def-h">定義</h2>
        <div class="def">{@html entry.def_html}</div>
      </section>

      {#if entry.detail_html}
        <section class="block" aria-labelledby="detail-h">
          <h2 id="detail-h">詳しく</h2>
          <div class="prose">{@html entry.detail_html}</div>
        </section>
      {/if}

      {#if entry.used_in.length}
        <section class="block" aria-labelledby="used-h">
          <h2 id="used-h">この用語が出てくる技</h2>
          <ul class="chips">
            {#each entry.used_in as tid (tid)}
              {@const t = techniqueOf(tid)}
              {#if t}
                <li><a href="#/{t.type === 'kihon' ? 'kihon' : 'techniques'}/{t.id}">{t.name_ja}</a></li>
              {/if}
            {/each}
          </ul>
        </section>
      {/if}

      {#if entry.related.length || entry.related_html}
        <section class="block" aria-labelledby="rel-h">
          <h2 id="rel-h">関連する用語</h2>
          {#if entry.related_html}<div class="prose">{@html entry.related_html}</div>{/if}
          {#if entry.related.length}
            <ul class="chips">
              {#each entry.related as rid (rid)}
                <li><a href="#/glossary/{rid}">{nameOfTerm(rid)}</a></li>
              {/each}
            </ul>
          {/if}
        </section>
      {/if}

      {#if entry.videos.length}
        <section class="block" aria-labelledby="video-h">
          <h2 id="video-h">動画（外部サイト）</h2>
          <ul class="videos">
            {#each entry.videos as v (v.url)}
              <li>
                <a href={v.url} target="_blank" rel="noopener noreferrer">{v.note || '動画を開く'}</a>
                <span class="who">{v.instructor}（{VIDEO_RANK_LABEL(v.rank)}）</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </article>
  {/if}
</main>

<style>
  .term {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 var(--space-3) var(--space-6);
  }
  .head {
    display: grid;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }
  h1 {
    font-size: var(--text-xxl);
  }
  h1:focus {
    outline: none;
  }
  .reading {
    font-family: var(--font-sub);
    color: var(--sumi-juu);
  }
  .romaji {
    margin-left: var(--space-2);
    font-style: italic;
  }
  .en {
    font-family: var(--font-sub);
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
  }
  .cat {
    padding: 0 6px;
    border: 1px solid var(--sumi-juu);
    border-radius: 2px;
  }
  .aliases {
    color: var(--sumi-juu);
  }
  .block {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--sumi-sei);
  }
  h2 {
    font-size: var(--text-l);
    margin-bottom: var(--space-2);
  }
  .def {
    font-size: var(--text-l);
    line-height: 1.7;
  }
  .prose :global(p + p) {
    margin-top: var(--space-2);
  }
  .prose :global(ul) {
    padding-left: 1.2em;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chips a {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-ui);
    border-radius: var(--radius-m);
    background: var(--washi-light);
    text-decoration: none;
    color: var(--sumi-shou);
  }
  .videos {
    padding-left: 1.2em;
  }
  .who {
    display: block;
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .note {
    padding: var(--space-5);
  }
</style>
