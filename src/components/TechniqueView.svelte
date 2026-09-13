<script lang="ts">
  // 技詳細（S-03）
  // - pose.json から Timeline を作り、進捗 0〜1 で補間表示（T13）
  // - 視点切替：取り／受けタブで反転＋レイヤー入替＋濃淡。切替時も進捗を保つ（T15）
  // - 一時停止で注目側6部位の l1 吹き出し（T16）
  // - 技の巻物ストリップの横スクロール量＝進捗。指を止めて 300ms で一時停止（T25）
  // - 再生ボタンで自動スクロール同期。再生中に触れたら即一時停止。0.5×。reduced-motion は kf ステップ送り（T26）
  // - 現在 kf（|progress − at| 最小）の解説へ切替。攻撃法を選ぶと差分 kf で丸ごと置換（T17）
  // - 吹き出しタップで深層トグル（l1→l5）。同じ部位をもう一度で1段深く、Esc／一段閉じるで1段戻る（T18）
  // - アニメ領域のピンチ：開く＝中点に最も近い部位を開く／1段深く、閉じる＝1段閉じる（T21）
  // - トグルの深さは history と同期：開くたび pushState、戻るボタンで1段ずつ閉じる、画面の「閉じる」は history.back()（T22）
  //   用語リンクで離れて戻ったときは、保存しておいた進捗・視点・スクロールとトグルの深さを復元する
  import { gsap } from 'gsap'
  import { tick } from 'svelte'
  import { MediaQuery } from 'svelte/reactivity'
  import { createPoseTimeline, type PoseTimeline, type ScenePose } from '../lib/anim/timeline'
  import type { PinchDirection } from '../lib/gesture/pinch'
  import { nav } from '../lib/history/nav.svelte'
  import { holdFonts } from '../lib/fonts'
  import { keyframeFor, nearestIndex } from '../lib/content/keyframe'
  import { contentIndex, loadKihon, loadPose, loadTechnique } from '../lib/content/loader'
  import type { Part, PoseData, Role, Technique } from '../lib/content/types'
  import PartToggle from './PartToggle.svelte'
  import PlayControls from './PlayControls.svelte'
  import ScrubStrip from './ScrubStrip.svelte'
  import StatusBadge from './StatusBadge.svelte'
  import TechniqueStage from './TechniqueStage.svelte'
  import ViewTabs from './ViewTabs.svelte'

  interface Props {
    id: string
    kind?: 'technique' | 'kihon'
  }
  let { id, kind = 'technique' }: Props = $props()

  const TOGGLE_ID = 'part-toggle'

  interface Snapshot {
    id: string
    progress: number
    view: Role
    attack: string | null
    scrollY: number
  }
  // 戻ってきたときの復元（このエントリに保存された同じ技の状態）。App が技 id ごとに作り直すので、作成時に一度だけ読む
  function readRestore(): Snapshot | null {
    const saved = nav.state.snap.technique as Snapshot | undefined
    return saved && saved.id === id ? saved : null
  }
  const restore = readRestore()

  let technique = $state.raw<Technique | null>(null)
  let poseData = $state.raw<PoseData | null>(null)
  let scene = $state.raw<ScenePose | null>(null)
  let progress = $state(restore?.progress ?? 0)
  let view = $state<Role>(restore?.view ?? nav.state.toggle?.role ?? 'tori')
  let attack = $state<string | null>(null)
  let paused = $state(true)
  let loading = $state(true)
  let timeline: PoseTimeline | null = null

  $effect(() => {
    let cancelled = false
    loading = true
    // 技データを表示するまで Web フォントの読み込みを待たせる（lib/fonts.ts）
    const releaseFonts = holdFonts()
    Promise.all([kind === 'kihon' ? loadKihon(id) : loadTechnique(id), loadPose(id)])
      .then(async ([t, p]) => {
        if (cancelled) return
        technique = t
        poseData = p
        attack = restore?.attack && t?.attacks.includes(restore.attack) ? restore.attack : (t?.default_attack ?? null)
        timeline?.destroy()
        timeline = p ? createPoseTimeline(p) : null
        scene = timeline ? timeline.seek(progress) : null
        loading = false
        await tick()
        if (restore) window.scrollTo({ top: restore.scrollY, behavior: 'instant' })
      })
      .finally(() => setTimeout(releaseFonts, 0))
    return () => {
      cancelled = true
      releaseFonts()
      stopPlaying()
      timeline?.destroy()
      timeline = null
    }
  })

  // 画面遷移（用語リンクなど）の直前と、トグルを開くときに今の状態を history に保存する
  $effect(() => nav.stack.registerSnapshot('technique', (): Record<string, unknown> => ({ id, progress, view, attack, scrollY: Math.round(window.scrollY) }) satisfies Snapshot))

  // kf の並びは原稿を正とし、原稿が無ければ pose の kf を使う
  const kfList = $derived(technique?.keyframes ?? poseData?.keyframes ?? [])
  const kfIndex = $derived(nearestIndex(kfList, progress))
  const kf = $derived(technique ? keyframeFor(technique, attack, kfIndex) : null)
  const kfLabel = $derived(kf?.label ?? poseData?.keyframes[kfIndex]?.id ?? '')
  const parts = $derived(kf ? kf[view] : null)

  const attackDesc = $derived(attack && attack !== technique?.default_attack ? (technique?.attack_overrides[attack]?.desc_html ?? '') : '')

  const glossaryName = (slug: string) => contentIndex.glossary.find((g) => g.id === slug)?.name_ja
  const attackName = (slug: string) => technique?.attack_overrides[slug]?.label ?? glossaryName(slug) ?? slug

  // ---- 巻物ストリップとの同期（ScrollDriven → 300ms 停止で Paused） ----
  function seekTo(p: number) {
    progress = p
    if (timeline) scene = timeline.seek(p)
  }
  function onScrub(p: number) {
    seekTo(p)
    paused = false
    if (nav.state.toggle) nav.stack.closeAll()
  }
  function onIdle() {
    paused = true
  }

  // ---- 再生（Playing）：GSAP で進捗を進め、ストリップの位置も同期する ----
  const BASE_SECONDS = 7 // 等速で技の最初から最後まで
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)')
  let playing = $state(false)
  let speed = $state(1)
  let playTween: gsap.core.Tween | null = null

  function startPlaying() {
    if (reducedMotion.current || !timeline) return
    if (nav.state.toggle) nav.stack.closeAll()
    const from = progress >= 0.999 ? 0 : progress
    const proxy = { p: from }
    playTween?.kill()
    playing = true
    paused = false
    playTween = gsap.to(proxy, {
      p: 1,
      duration: (BASE_SECONDS * (1 - from)) / speed,
      ease: 'none',
      onUpdate: () => seekTo(proxy.p),
      onComplete: () => stopPlaying(),
    })
  }
  function stopPlaying() {
    playTween?.kill()
    playTween = null
    if (playing) {
      playing = false
      paused = true
    }
  }
  function togglePlay() {
    if (playing) stopPlaying()
    else startPlaying()
  }
  function changeSpeed(s: number) {
    speed = s
    if (playing) startPlaying()
  }
  // 再生中に巻物・骨格へ触れたら止める（animation-spec §5-2「ユーザーのスクロール入力で Paused」）
  function onUserInteract() {
    if (playing) stopPlaying()
  }
  let stageBlock = $state<HTMLElement>()
  $effect(() => {
    const el = stageBlock
    if (!el) return
    el.addEventListener('pointerdown', onUserInteract)
    return () => el.removeEventListener('pointerdown', onUserInteract)
  })

  // kf 単位の送り（reduced-motion の代替・キーボード操作にも）
  const prevAt = $derived([...kfList].reverse().find((k) => k.at < progress - 1e-6)?.at ?? null)
  const nextAt = $derived(kfList.find((k) => k.at > progress + 1e-6)?.at ?? null)
  function stepTo(at: number | null) {
    if (at === null) return
    stopPlaying()
    if (nav.state.toggle) nav.stack.closeAll()
    seekTo(at)
    paused = true
  }
  const stripKeyframes = $derived(kfList.map((k) => ({ id: k.id, label: 'label' in k ? k.label : k.id, at: k.at })))

  // ---- 深層トグル：状態は history（nav.state.toggle）が正 ----
  const toggle = $derived(nav.state.path === hrefOfThis() && nav.state.toggle?.role === view ? nav.state.toggle : null)
  function hrefOfThis() {
    return `#/${kind === 'kihon' ? 'kihon' : 'techniques'}/${id}`
  }

  function onSelectPart(part: Part) {
    if (!paused || !kf) return
    if (!toggle) nav.stack.open(view, part, kf.id)
    else if (toggle.part === part) nav.stack.deepen()
  }
  function deepen() {
    nav.stack.deepen()
  }
  function closeOne() {
    nav.stack.closeOne()
  }
  function onPinch(direction: PinchDirection, part: Part | null) {
    if (direction === 'in') {
      closeOne()
      return
    }
    if (!paused || !kf) return
    if (toggle) nav.stack.deepen()
    else if (part) nav.stack.open(view, part, kf.id)
  }
  function changeView(v: Role) {
    if (nav.state.toggle) nav.stack.closeAll()
    view = v
  }

  // すべて閉じたら（戻るボタンでも）、開く元になった吹き出しへフォーカスを戻す
  let lastPart: Part | null = null
  $effect(() => {
    const part = toggle?.part ?? null
    if (lastPart && !part) {
      const target = lastPart
      tick().then(() => (document.querySelector(`.bubble[data-part="${target}"]`) as HTMLElement | null)?.focus({ preventScroll: true }))
    }
    lastPart = part
  })
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && toggle) {
      e.preventDefault()
      closeOne()
    }
  }

  const focusLevels = $derived(toggle && parts ? parts[toggle.part] : null)
</script>

<svelte:window onkeydown={onWindowKeydown} />

<main class="technique">
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

    <div id="technique-stage" class="stage-block" class:focused={toggle !== null} role="tabpanel" aria-labelledby="view-tab-{view}" bind:this={stageBlock}>
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
        onpinch={onPinch}
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

    <ScrubStrip
      keyframes={stripKeyframes}
      {progress}
      {playing}
      label="技の再生位置（巻物）"
      valueText={`${Math.round(progress * 100)}%・${kfLabel}`}
      onscrub={onScrub}
      onidle={onIdle}
      oninteract={onUserInteract}
    />

    <PlayControls
      {playing}
      {speed}
      reducedMotion={reducedMotion.current}
      canPrev={prevAt !== null}
      canNext={nextAt !== null}
      ontoggleplay={togglePlay}
      onspeed={changeSpeed}
      onprev={() => stepTo(prevAt)}
      onnext={() => stepTo(nextAt)}
    />

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
</main>

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
