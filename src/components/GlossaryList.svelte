<script lang="ts">
  // 単語集一覧（S-04 / requirements F-08「五十音／分類で閲覧・検索」）
  import { tick } from 'svelte'
  import { contentIndex } from '../lib/content/loader'
  import { GLOSSARY_CATEGORY_LABEL, KANA_ROW_ORDER, kanaRow } from '../lib/content/labels'
  import { nav } from '../lib/history/nav.svelte'
  import PageHeader from './PageHeader.svelte'

  interface Snapshot {
    query: string
    category: string
    scrollY: number
  }
  function readRestore(): Snapshot | null {
    return (nav.state.snap.glossary as Snapshot | undefined) ?? null
  }
  const restore = readRestore()

  let query = $state(restore?.query ?? '')
  let category = $state(restore?.category ?? '')

  $effect(() => nav.stack.registerSnapshot('glossary', () => ({ query, category, scrollY: Math.round(window.scrollY) })))
  $effect(() => {
    if (restore) tick().then(() => window.scrollTo({ top: restore.scrollY, behavior: 'instant' }))
  })

  const categories = $derived([...new Set(contentIndex.glossary.map((g) => g.category))].sort())

  // 検索は ひらがな/カタカナ・全角/半角・大文字小文字の違いを吸収する
  const normalize = (s: string) =>
    s
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・ー-]/g, '')

  const filtered = $derived.by(() => {
    const q = normalize(query)
    return contentIndex.glossary.filter((g) => {
      if (category && g.category !== category) return false
      if (!q) return true
      return [g.name_ja, g.reading, g.romaji, ...g.name_en, g.def_text].some((s) => normalize(s).includes(q))
    })
  })

  const groups = $derived.by(() => {
    const map = new Map<string, typeof filtered>()
    for (const g of filtered) {
      const row = kanaRow(g.reading)
      map.set(row, [...(map.get(row) ?? []), g])
    }
    return KANA_ROW_ORDER.filter((r) => map.has(r)).map((r) => ({ row: r, items: map.get(r)! }))
  })

  function jump(row: string) {
    document.getElementById(`kana-${row}`)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
</script>

<main class="glossary">
  <PageHeader title="単語集" sub="{contentIndex.glossary.length}語" />

  <div class="tools">
    <label class="search">
      <span class="visually-hidden">用語を検索</span>
      <input type="search" bind:value={query} placeholder="用語・読み・英語で検索" autocomplete="off" enterkeyhint="search" />
    </label>
    <div class="filters" role="group" aria-label="分類で絞り込む">
      <button type="button" aria-pressed={category === ''} onclick={() => (category = '')}>すべて</button>
      {#each categories as c (c)}
        <button type="button" aria-pressed={category === c} onclick={() => (category = category === c ? '' : c)}>{GLOSSARY_CATEGORY_LABEL[c] ?? c}</button>
      {/each}
    </div>
  </div>

  <nav class="kana" aria-label="五十音で移動">
    {#each groups as g (g.row)}
      <button type="button" onclick={() => jump(g.row)}>{g.row}</button>
    {/each}
  </nav>

  <p class="count" role="status">{filtered.length}語を表示</p>

  {#each groups as g (g.row)}
    <section class="group" aria-labelledby="kana-{g.row}">
      <h2 id="kana-{g.row}">{g.row}</h2>
      <ul class="cards">
        {#each g.items as item (item.id)}
          <li>
            <a class="card" href="#/glossary/{item.id}">
              <span class="name">{item.name_ja}</span>
              <span class="reading">{item.reading}</span>
              <span class="def">{item.def_text}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="empty">該当する用語がありません。</p>
  {/each}
</main>

<style>
  .glossary {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 var(--space-3) var(--space-6);
  }
  .tools {
    display: grid;
    gap: var(--space-2);
  }
  .search input {
    width: 100%;
    min-height: var(--tap-min);
    padding: 0 var(--space-2);
    font: inherit;
    background: transparent;
    border: 0;
    border-bottom: var(--line-thin) solid var(--sumi-shou);
    border-radius: 0;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .filters button,
  .kana button {
    min-height: 36px;
    padding: 0 var(--space-2);
    font: inherit;
    font-size: var(--text-s);
    background: var(--washi-light);
    border: 1px solid var(--sumi-tan);
    border-radius: var(--radius-s);
    color: var(--sumi-shou);
    cursor: pointer;
  }
  .filters button[aria-pressed='true'] {
    background: var(--sumi-shou);
    color: var(--washi);
    border-color: var(--sumi-shou);
  }
  .kana {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    background: var(--washi);
  }
  .kana button {
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    font-family: var(--font-heading);
    font-size: var(--text-l);
  }
  .count {
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .group h2 {
    font-size: var(--text-xl);
    margin: var(--space-4) 0 var(--space-2);
    scroll-margin-top: 64px;
    color: var(--shu);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0 var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--washi-light);
    border: 1px solid var(--sumi-sei);
    border-left: var(--line-bold) solid var(--sumi-shou);
    border-radius: var(--radius-s);
    text-decoration: none;
    color: var(--sumi-nou);
  }
  .name {
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--sumi-shou);
  }
  .reading {
    align-self: end;
    font-family: var(--font-sub);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .def {
    grid-column: 1 / -1;
    font-size: var(--text-s);
  }
  .empty {
    margin-top: var(--space-4);
  }
</style>
