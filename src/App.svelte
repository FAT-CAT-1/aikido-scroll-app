<script lang="ts">
  import ScrollStage, { type Chapter } from './components/ScrollStage.svelte'
  import TechniqueView from './components/TechniqueView.svelte'
  import { contentIndex } from './lib/content/loader'
  import { router } from './lib/router.svelte'

  const pageLead = (name: string) => contentIndex.pages.find((p) => p.name === name)?.lead || undefined
  const count = (n: number, unit: string) => (n > 0 ? `${n}${unit}` : undefined)

  // 章の並び（requirements F-01）。章扉の文言は原稿（pages の lead）か件数だけを表示し、解説文を直書きしない
  const chapters: Chapter[] = [
    { id: 'cover', num: '序', title: '合氣道' },
    { id: 'history', num: '一', title: '沿革', href: '#/pages/history', lead: pageLead('history') },
    { id: 'philosophy', num: '二', title: '理念', href: '#/pages/philosophy', lead: pageLead('philosophy') },
    { id: 'kihon', num: '三', title: '基礎動作', href: '#/kihon', lead: count(contentIndex.kihon.length, '項目') },
    { id: 'techniques', num: '四', title: '技', href: '#/techniques', action: '技の一覧', lead: count(contentIndex.techniques.length, '技') },
    { id: 'glossary', num: '五', title: '単語集', href: '#/glossary', lead: count(contentIndex.glossary.length, '語') },
  ]

  // 巻物の位置は一覧から戻ったときに復元する（T27 で history.state へ移す）
  let chapterIndex = 0
</script>

{#if router.route.name === 'technique'}
  {#key router.route.id}
    <TechniqueView id={router.route.id} kind={router.route.kind} />
  {/key}
{:else if router.route.name === 'home'}
  <main>
    <h1 class="visually-hidden">合氣道徹底解説</h1>
    <ScrollStage {chapters} initialIndex={chapterIndex} onindexchange={(i) => (chapterIndex = i)} />
  </main>
{:else}
  <main class="placeholder">
    <p>この画面は準備中です。</p>
    <p><a href="#/">巻物へ戻る</a>　<a href="#/techniques/ikkyo-omote">一教（表）</a></p>
  </main>
{/if}

<style>
  .placeholder {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: var(--space-3);
    text-align: center;
  }
</style>
