<script lang="ts">
  // 技詳細（S-03）
  // - pose.json から Timeline を作り、進捗 0〜1 で補間表示（T13）
  // - 視点切替：取り／受けタブで反転＋レイヤー入替＋濃淡。切替時も進捗を保つ（T15）
  // - 一時停止で注目側6部位の l1 吹き出し（T16）。T25 までは「スライダー操作が 300ms 止まったら一時停止」
  import { createPoseTimeline, nearestKeyframeIndex, type PoseTimeline, type ScenePose } from '../lib/anim/timeline'
  import { loadKihon, loadPose, loadTechnique } from '../lib/content/loader'
  import type { Part, PoseData, Role, Technique } from '../lib/content/types'
  import TechniqueStage from './TechniqueStage.svelte'
  import ViewTabs from './ViewTabs.svelte'

  interface Props {
    id: string
    kind?: 'technique' | 'kihon'
  }
  let { id, kind = 'technique' }: Props = $props()

  const TOGGLE_ID = 'part-toggle'
  const IDLE_MS = 300

  let technique = $state.raw<Technique | null>(null)
  let poseData = $state.raw<PoseData | null>(null)
  let scene = $state.raw<ScenePose | null>(null)
  let progress = $state(0)
  let view = $state<Role>('tori')
  let paused = $state(true)
  let loading = $state(true)
  let timeline: PoseTimeline | null = null
  let idleTimer: ReturnType<typeof setTimeout> | undefined

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
      clearTimeout(idleTimer)
      timeline?.destroy()
      timeline = null
    }
  })

  const kfIndex = $derived(poseData ? nearestKeyframeIndex(poseData.keyframes, progress) : 0)
  const kf = $derived(technique?.keyframes[kfIndex] ?? null)
  const kfLabel = $derived(kf?.label ?? poseData?.keyframes[kfIndex]?.id ?? '')
  const parts = $derived(kf ? kf[view] : null)

  function onScrub(e: Event) {
    progress = Number((e.currentTarget as HTMLInputElement).value)
    if (timeline) scene = timeline.seek(progress)
    paused = false
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => (paused = true), IDLE_MS)
  }

  function onSelectPart(part: Part) {
    // T18 で深層トグルを開く
    void part
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
    <div id="technique-stage" role="tabpanel" aria-labelledby="view-tab-{view}">
      <TechniqueStage
        {scene}
        {view}
        ground={poseData?.ground}
        label={`${technique?.name_ja ?? id}の動き（${view === 'tori' ? '取り' : '受け'}の視点）`}
        {parts}
        {paused}
        toggleId={TOGGLE_ID}
        onselect={onSelectPart}
      />
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
    max-width: 760px;
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
  .scrub input {
    width: 100%;
  }
  .kf,
  .note {
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
</style>
