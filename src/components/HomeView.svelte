<script lang="ts">
  // 巻物トップ（S-01）。表示中の章は history に保存し、戻ってきたとき同じ章から表示する（T22/T27）
  import { contentIndex } from '../lib/content/loader'
  import { nav } from '../lib/history/nav.svelte'
  import ScrollStage, { type Chapter } from './ScrollStage.svelte'

  const pageLead = (name: string) => contentIndex.pages.find((p) => p.name === name)?.lead || undefined
  const count = (n: number, unit: string) => (n > 0 ? `${n}${unit}` : undefined)

  // 章の並び（requirements F-01）。章扉の文言は原稿（pages の lead）か件数だけを表示し、解説文を直書きしない（D-23）
  const chapters: Chapter[] = [
    { id: 'cover', num: '序', title: '合氣道' },
    { id: 'history', num: '一', title: '沿革', href: '#/pages/history', lead: pageLead('history') },
    { id: 'philosophy', num: '二', title: '理念', href: '#/pages/philosophy', lead: pageLead('philosophy') },
    { id: 'kihon', num: '三', title: '基礎動作', href: '#/kihon', lead: count(contentIndex.kihon.length, '項目') },
    { id: 'techniques', num: '四', title: '技', href: '#/techniques', action: '技の一覧', lead: count(contentIndex.techniques.length, '技') },
    { id: 'glossary', num: '五', title: '単語集', href: '#/glossary', lead: count(contentIndex.glossary_count, '語') },
  ]

  const saved = (nav.state.snap.home as { chapter?: number } | undefined)?.chapter
  let chapter = $state(typeof saved === 'number' ? saved : 0)

  $effect(() => nav.stack.registerSnapshot('home', () => ({ chapter })))
</script>

<main>
  <h1 class="visually-hidden">合氣道徹底解説</h1>
  <ScrollStage {chapters} initialIndex={chapter} onindexchange={(i) => (chapter = i)} />
</main>
