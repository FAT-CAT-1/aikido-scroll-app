<script lang="ts">
  // 技一覧（S-02 / requirements「級別／攻撃法別フィルタ、技カード」）。基礎動作（#/kihon）も同じ画面で表示する
  import { tick } from 'svelte'
  import { contentIndex } from '../lib/content/loader'
  import { FORM_LABEL, RANK_LABEL, RANK_ORDER, TECHNIQUE_CATEGORY_LABEL } from '../lib/content/labels'
  import type { TechniqueSummary } from '../lib/content/types'
  import { nav } from '../lib/history/nav.svelte'
  import PageHeader from './PageHeader.svelte'
  import StatusBadge from './StatusBadge.svelte'

  let { kind }: { kind: 'technique' | 'kihon' } = $props()

  interface Snapshot {
    rank: string
    attack: string
    scrollY: number
  }
  function readRestore(): Snapshot | null {
    return (nav.state.snap[`list-${kind}`] as Snapshot | undefined) ?? null
  }
  const restore = readRestore()

  let rank = $state(restore?.rank ?? '')
  let attack = $state(restore?.attack ?? '')

  $effect(() => nav.stack.registerSnapshot(`list-${kind}`, () => ({ rank, attack, scrollY: Math.round(window.scrollY) })))
  $effect(() => {
    if (restore) tick().then(() => window.scrollTo({ top: restore.scrollY, behavior: 'instant' }))
  })

  const items = $derived<TechniqueSummary[]>(kind === 'kihon' ? contentIndex.kihon : contentIndex.techniques)
  const title = $derived(kind === 'kihon' ? '基礎動作' : '技の一覧')
  const glossaryName = (slug: string) => contentIndex.glossary.find((g) => g.id === slug)?.name_ja ?? slug

  const ranks = $derived(RANK_ORDER.filter((r) => items.some((t) => t.rank === r)))
  const attacks = $derived([...new Set(items.flatMap((t) => t.attacks))])

  const filtered = $derived(items.filter((t) => (!rank || t.rank === rank) && (!attack || t.attacks.includes(attack))))
  const groups = $derived(
    RANK_ORDER.map((r) => ({ rank: r, items: filtered.filter((t) => t.rank === r).sort((a, b) => a.reading.localeCompare(b.reading, 'ja')) })).filter((g) => g.items.length),
  )
  const href = (t: TechniqueSummary) => `#/${t.type === 'kihon' ? 'kihon' : 'techniques'}/${t.id}`
</script>

<main class="list">
  <PageHeader {title} sub={items.length ? `${items.length}件` : ''} />

  {#if !items.length}
    <p class="empty">この章の原稿は準備中です。</p>
  {:else}
    {#if ranks.length > 1}
      <div class="filters" role="group" aria-label="級で絞り込む">
        <button type="button" aria-pressed={rank === ''} onclick={() => (rank = '')}>すべての級</button>
        {#each ranks as r (r)}
          <button type="button" aria-pressed={rank === r} onclick={() => (rank = rank === r ? '' : r)}>{RANK_LABEL[r] ?? r}</button>
        {/each}
      </div>
    {/if}
    {#if attacks.length > 1}
      <div class="filters" role="group" aria-label="攻撃法で絞り込む">
        <button type="button" aria-pressed={attack === ''} onclick={() => (attack = '')}>すべての攻撃法</button>
        {#each attacks as a (a)}
          <button type="button" aria-pressed={attack === a} onclick={() => (attack = attack === a ? '' : a)}>{glossaryName(a)}</button>
        {/each}
      </div>
    {/if}

    <p class="count" role="status">{filtered.length}件を表示</p>

    {#each groups as g (g.rank)}
      <section class="group" aria-labelledby="rank-{g.rank}">
        <h2 id="rank-{g.rank}">{RANK_LABEL[g.rank] ?? g.rank}</h2>
        <ul class="cards">
          {#each g.items as t (t.id)}
            <li>
              <a class="card" href={href(t)}>
                <span class="name">{t.name_ja}</span>
                <span class="reading">{t.reading}</span>
                <span class="meta">
                  {#if FORM_LABEL[t.form]}<span class="tag">{FORM_LABEL[t.form]}</span>{/if}
                  <span class="tag">{TECHNIQUE_CATEGORY_LABEL[t.category] ?? t.category}</span>
                  {#if t.default_attack}<span class="attack">{glossaryName(t.default_attack)}</span>{/if}
                  <span class="kf">{t.has_pose ? `アニメ ${t.kf_count}場面` : `${t.kf_count}場面（アニメ準備中）`}</span>
                </span>
                <span class="badge"><StatusBadge status={t.status} /></span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="empty">該当する技がありません。</p>
    {/each}
  {/if}
</main>

<style>
  .list {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 var(--space-3) var(--space-6);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }
  .filters button {
    min-height: 40px;
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
    border-color: var(--sumi-shou);
    color: var(--washi);
  }
  .count {
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .group h2 {
    font-size: var(--text-xl);
    margin: var(--space-4) 0 var(--space-2);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .card {
    position: relative;
    display: grid;
    gap: 2px;
    padding: var(--space-3);
    padding-right: 5.5rem;
    background: var(--washi-light);
    border: 1px solid var(--sumi-sei);
    border-left: var(--line-bold) solid var(--sumi-shou);
    border-radius: var(--radius-s);
    color: var(--sumi-nou);
    text-decoration: none;
  }
  .card:hover {
    border-color: var(--sumi-shou);
  }
  .name {
    font-family: var(--font-heading);
    font-size: var(--text-xl);
    color: var(--sumi-shou);
  }
  .reading {
    font-family: var(--font-sub);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
    margin-top: var(--space-1);
    font-size: var(--text-xs);
  }
  .tag {
    padding: 0 6px;
    border: 1px solid var(--sumi-juu);
    border-radius: 2px;
  }
  .attack,
  .kf {
    color: var(--sumi-juu);
  }
  .badge {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }
  .empty {
    margin-top: var(--space-4);
  }
</style>
