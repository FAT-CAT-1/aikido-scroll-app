<script lang="ts">
  // 技詳細（S-03）。pose.json から Timeline を作り、スライダーで 0〜1 を動かすと補間される（T13）。
  // 視点切替（T15）：取り／受けタブで反転＋レイヤー入替＋濃淡。切替時も progress（at）を保つ
  import Body from '../lib/anim/Body.svelte'
  import { createPoseTimeline, nearestKeyframeIndex, type PoseTimeline, type ScenePose } from '../lib/anim/timeline'
  import { loadKihon, loadPose, loadTechnique } from '../lib/content/loader'
  import type { PoseData, Role, Technique } from '../lib/content/types'
  import ViewTabs from './ViewTabs.svelte'

  interface Props {
    id: string
    kind?: 'technique' | 'kihon'
  }
  let { id, kind = 'technique' }: Props = $props()

  let technique = $state.raw<Technique | null>(null)
  let poseData = $state.raw<PoseData | null>(null)
  let scene = $state.raw<ScenePose | null>(null)
  let progress = $state(0)
  let view = $state<Role>('tori')
  let loading = $state(true)
  let timeline: PoseTimeline | null = null

  $effect(() => {
    let cancelled = false
    loading = true
    Promise.all([kind === 'kihon' ? loadKihon(id) : loadTechnique(id), loadPose(id)]).then(([t, p]) => {
      if (cancelled) return
      technique = t
      poseData = p
      timeline?.destroy()
      timeline = p ? createPoseTimeline(p) : null
      scene = timeline ? timeline.seek(progress) : null
      loading = false
    })
    return () => {
      cancelled = true
      timeline?.destroy()
      timeline = null
    }
  })

  const kfIndex = $derived(poseData ? nearestKeyframeIndex(poseData.keyframes, progress) : 0)
  const kfLabel = $derived(technique?.keyframes[kfIndex]?.label ?? poseData?.keyframes[kfIndex]?.id ?? '')

  function onScrub(e: Event) {
    progress = Number((e.currentTarget as HTMLInputElement).value)
    if (timeline) scene = timeline.seek(progress)
  }
</script>

<article class="technique">
  <header class="head">
    <a class="back" href="#/">← 表紙</a>
    <h1>{technique?.name_ja ?? id}</h1>
  </header>

  {#if loading}
    <p class="note">読み込み中…</p>
  {:else if !scene}
    <p class="note">この技のアニメーション（pose.json）はまだありません。</p>
  {:else}
    <ViewTabs {view} controls="technique-stage" onchange={(v) => (view = v)} />
    <div class="stage" id="technique-stage" role="tabpanel" aria-labelledby="view-tab-{view}">
      <Body pose={scene} {view} ground={poseData?.ground} label={`${technique?.name_ja ?? id}の動き（${view === 'tori' ? '取り' : '受け'}の視点）`} />
    </div>
    <label class="scrub">
      <span class="visually-hidden">再生位置</span>
      <input type="range" min="0" max="1" step="0.001" value={progress} oninput={onScrub} aria-valuetext={`${Math.round(progress * 100)}%（${kfLabel}）`} />
    </label>
    <p class="kf">位置 {progress.toFixed(3)} ／ 最寄りのキーフレーム：{kfLabel}</p>
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
  .scrub input {
    width: 100%;
  }
  .kf,
  .note {
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
</style>
