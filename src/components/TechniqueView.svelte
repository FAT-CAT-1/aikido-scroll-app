<script lang="ts">
  // 技詳細（S-03）。T12 時点：pose.json の最初の kf で取り・受け2体を静止表示する
  import Body from '../lib/anim/Body.svelte'
  import { loadKihon, loadPose, loadTechnique } from '../lib/content/loader'
  import type { PoseData, Technique } from '../lib/content/types'

  interface Props {
    id: string
    kind?: 'technique' | 'kihon'
  }
  let { id, kind = 'technique' }: Props = $props()

  let technique = $state.raw<Technique | null>(null)
  let poseData = $state.raw<PoseData | null>(null)
  let loading = $state(true)

  $effect(() => {
    let cancelled = false
    loading = true
    Promise.all([kind === 'kihon' ? loadKihon(id) : loadTechnique(id), loadPose(id)]).then(([t, p]) => {
      if (cancelled) return
      technique = t
      poseData = p
      loading = false
    })
    return () => {
      cancelled = true
    }
  })

  const first = $derived(poseData?.keyframes[0] ?? null)
</script>

<article class="technique">
  <header class="head">
    <a class="back" href="#/">← 表紙</a>
    <h1>{technique?.name_ja ?? id}</h1>
  </header>

  {#if loading}
    <p class="note">読み込み中…</p>
  {:else if !first}
    <p class="note">この技のアニメーション（pose.json）はまだありません。</p>
  {:else}
    <div class="stage">
      <Body pose={first} ground={poseData?.ground} label={`${technique?.name_ja ?? id}の取りと受け`} />
    </div>
  {/if}
</article>

<style>
  .technique {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-3);
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }
  .back {
    font-size: var(--text-s);
  }
  h1 {
    font-size: var(--text-xl);
  }
  .stage {
    aspect-ratio: 1000 / 600;
    width: 100%;
  }
  .note {
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
</style>
