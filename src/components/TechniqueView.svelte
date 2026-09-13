<script lang="ts">
  // 技詳細（S-03）
  // - pose.json から Timeline を作り、進捗 0〜1 で補間表示（T13）
  // - 視点切替：取り／受けタブで反転＋レイヤー入替＋濃淡。切替時も進捗を保つ（T15）
  // - 一時停止で注目側6部位の l1 吹き出し（T16）。T25 までは「スライダー操作が 300ms 止まったら一時停止」
  // - 現在 kf（|progress − at| 最小）の解説へ切替。攻撃法を選ぶと差分 kf で丸ごと置換（T17）
  // - 吹き出しタップで深層トグル（l1→l5）。同じ部位をもう一度で1段深く、Esc／一段閉じるで1段戻る（T18）
  import { createPoseTimeline, type PoseTimeline, type ScenePose } from '../lib/anim/timeline'
  import { keyframeFor, nearestIndex } from '../lib/content/keyframe'
  import { contentIndex, loadKihon, loadPose, loadTechnique } from '../lib/content/loader'
  import type { Part, PoseData, Role, Technique } from '../lib/content/types'
  import PartToggle from './PartToggle.svelte'
  import StatusBadge from './StatusBadge.svelte'
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
  let attack = $state<string | null>(null)
  let paused = $state(true)
  let toggle = $state<{ part: Part; depth: number } | null>(null)
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
      attack = t?.default_attack ?? null
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

  // kf の並びは原稿を正とし、原稿が無ければ pose の kf を使う
  const kfList = $derived(technique?.keyframes ?? poseData?.keyframes ?? [])
  const kfIndex = $derived(nearestIndex(kfList, progress))
  const kf = $derived(technique ? keyframeFor(technique, attack, kfIndex) : null)
  const kfLabel = $derived(kf?.label ?? poseData?.keyframes[kfIndex]?.id ?? '')
  const parts = $derived(kf ? kf[view] : null)

  const attackDesc = $derived(attack && attack !== technique?.default_attack ? (technique?.attack_overrides[attack]?.desc_html ?? '') : '')

  const glossaryName = (slug: string) => contentIndex.glossary.find((g) => g.id === slug)?.name_ja
  const attackName = (slug: string) => technique?.attack_overrides[slug]?.label ?? glossaryName(slug) ?? slug

  function onScrub(e: Event) {
    progress = Number((e.currentTarget as HTMLInputElement).value)
    if (timeline) scene = timeline.seek(progress)
    paused = false
    toggle = null
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => (paused = true), IDLE_MS)
  }

  // ---- 深層トグル（T22 で history と同期する） ----
  function onSelectPart(part: Part) {
    if (!paused) return
    if (toggle?.part === part) deepen()
    else toggle = { part, depth: 1 }
  }
  function deepen() {
    if (toggle && toggle.depth < 5) toggle = { ...toggle, depth: toggle.depth + 1 }
  }
  function closeOne() {
    if (!toggle) return
    const part = toggle.part
    toggle = toggle.depth > 1 ? { ...toggle, depth: toggle.depth - 1 } : null
    // すべて閉じたら、開く元になった吹き出しへフォーカスを戻す
    if (!toggle) queueMicrotask(() => (document.querySelector(`.bubble[data-part="${part}"]`) as HTMLElement | null)?.focus())
  }
  function changeView(v: Role) {
    toggle = null
    view = v
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && toggle) {
      e.preventDefault()
      closeOne()
    }
  }

  const focusLevels = $derived(toggle && parts ? parts[toggle.part] : null)
</script>

<svelte:window onkeydown={onWindowKeydown} />

<article class="technique">
  <header class="head">
    <a class="back" href="#/">← 表紙</a>
    <div class="title">
      <h1>{technique?.name_ja ?? id}</h1>
      {#if technique}
        <p class="reading">{technique.reading}{#if technique.name_en[0]}<span class="en">{technique.name_en[0]}</span>{/if}</p>
      {/if}
    </div>
    {#if technique}<StatusBadge status={technique.status} />{/if}
  </header>

  {#if loading}
    <p class="note">読み込み中…</p>
  {:else if !scene}
    <p class="note">この技のアニメーション（pose.json）はまだありません。</p>
  {:else}
    <div class="controls-top">
      <ViewTabs {view} controls="technique-stage" onchange={changeView} />
      {#if technique && technique.attacks.length > 1}
        <label class="attack">
          <span>攻撃法</span>
          <select bind:value={attack}>
            {#each technique.attacks as a (a)}
              <option value={a}>{attackName(a)}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>

    <div id="technique-stage" class="stage-block" class:focused={toggle !== null} role="tabpanel" aria-labelledby="view-tab-{view}">
      <TechniqueStage
        {scene}
        {view}
        ground={poseData?.ground}
        label={`${technique?.name_ja ?? id}の動き（${view === 'tori' ? '取り' : '受け'}の視点）`}
        {parts}
        {paused}
        toggleId={TOGGLE_ID}
        focusPart={toggle?.part ?? null}
        depth={toggle?.depth ?? 0}
        onselect={onSelectPart}
      />
    </div>

    <PartToggle
      id={TOGGLE_ID}
      role={view}
      part={toggle?.part ?? null}
      depth={toggle?.depth ?? 0}
      levels={focusLevels}
      {kfLabel}
      ondeepen={deepen}
      oncloseone={closeOne}
    />

    <label class="scrub">
      <span class="visually-hidden">再生位置</span>
      <input type="range" min="0" max="1" step="0.001" value={progress} oninput={onScrub} aria-valuetext={`${Math.round(progress * 100)}%（${kfLabel}）`} />
    </label>

    <section class="kf-info" aria-live="polite" aria-atomic="true">
      <h2 class="kf-name">
        <span class="kf-count">{kfIndex + 1}／{kfList.length}</span>
        {kfLabel}
      </h2>
      {#if kf?.desc_html}
        <p class="kf-desc">{@html kf.desc_html}</p>
      {/if}
      {#if attackDesc}
        <p class="attack-desc">{@html attackDesc}</p>
      {/if}
    </section>
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
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .back {
    font-size: var(--text-s);
    white-space: nowrap;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  h1 {
    font-size: var(--text-xl);
  }
  .reading {
    font-family: var(--font-sub);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .en {
    margin-left: var(--space-2);
    letter-spacing: 0.02em;
  }
  .controls-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .attack {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-s);
  }
  .attack select {
    min-height: var(--tap-min);
    font: inherit;
    background: var(--washi-light);
    border: 1px solid var(--sumi-tan);
    border-radius: var(--radius-s);
  }
  /* 部位を開いている間は骨格を画面上部に留め、下の解説を読みながら見られるようにする */
  .stage-block.focused {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--washi);
    padding-top: var(--space-1);
  }
  .scrub input {
    width: 100%;
  }
  .kf-info {
    margin-top: var(--space-2);
  }
  .kf-name {
    font-size: var(--text-l);
  }
  .kf-count {
    font-family: var(--font-sub);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
    margin-right: var(--space-2);
  }
  .kf-desc,
  .attack-desc {
    font-size: var(--text-m);
    margin-top: var(--space-1);
  }
  .note {
    font-size: var(--text-s);
    color: var(--sumi-juu);
  }
</style>
