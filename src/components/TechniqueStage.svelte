<script lang="ts">
  // アニメ領域：骨格＋6部位の l1 吹き出し（上段＝目・顔・肩／下段＝腹・膝・足）＋筆致の引き出し線（backlog T16）
  // 吹き出しは一時停止中だけ表示し、再生・スクロール中は消す（animation-spec §5-3）
  // 3D の姿勢（scene3d）があれば 3D（Body3D）で描き、無ければ 2D の骨格（Body）で描く（animation-spec §13）
  import { tick } from 'svelte'
  import Body from '../lib/anim/Body.svelte'
  import Body3D from '../lib/anim3d/Body3D.svelte'
  import { partAnchors, type Cam } from '../lib/anim3d/camera'
  import type { Scene3D } from '../lib/anim3d/pose3d'
  import { VIEW_H, VIEW_W, partAnchor } from '../lib/anim/geometry'
  import { pinch, type PinchDirection, type PinchEvent } from '../lib/gesture/pinch'
  import { BOTTOM_PARTS, TOP_PARTS, leaderLines, leaderPath, nearestPart, orderByX, readAnchors, type Anchors, type Leader } from '../lib/anim/markers'
  import type { ScenePose } from '../lib/anim/timeline'
  import type { Body3D as Body3DDef, Part, PartLevels, Role, Vec3 } from '../lib/content/types'
  import { PART_LABEL, PART_SHORT } from '../lib/content/types'
  import PartBubble from './PartBubble.svelte'
  import Zoomable from './Zoomable.svelte'

  interface Props {
    /** 2D の姿勢（3D を描くときは不要） */
    scene?: ScenePose | null
    /** 3D の姿勢・カメラ・体型・技全体の範囲（あれば 3D で描く） */
    scene3d?: Scene3D | null
    cam?: Cam | null
    body3d?: Body3DDef | null
    bounds3d?: { min: Vec3; max: Vec3 } | null
    /** 3D が描けなかったとき（WebGL が使えない端末） */
    onfallback3d?: () => void
    view: Role
    ground?: number
    label: string
    /** 現在 kf の注目側6部位（原稿が無ければ null） */
    parts: Record<Part, PartLevels> | null
    paused: boolean
    toggleId: string
    /** 深層トグルで開いている部位（開いている間は吹き出しの段をたたみ、その部位の印だけを残す） */
    focusPart?: Part | null
    depth?: number
    onselect?: (part: Part) => void
    /** アニメ領域でのピンチ。part は2指の中点に最も近い部位（T21 でトグルの開閉に使う） */
    onpinch?: (direction: PinchDirection, part: Part | null) => void
  }
  let {
    scene = null,
    scene3d = null,
    cam = null,
    body3d = null,
    bounds3d = null,
    onfallback3d = () => {},
    view,
    ground = 520,
    label,
    parts,
    paused,
    toggleId,
    focusPart = null,
    depth = 0,
    onselect = () => {},
    onpinch = () => {},
  }: Props = $props()

  const mode3d = $derived(!!(scene3d && cam && body3d && bounds3d))

  let drawing = $state<HTMLElement>()

  function handlePinch(e: PinchEvent) {
    if (!wrap || !drawing) return
    // 中点（アニメ領域の座標）→ ステージ座標に直して、最も近い部位の起点を選ぶ
    const w = wrap.getBoundingClientRect()
    const d = drawing.getBoundingClientRect()
    const point = { x: e.center.x + d.left - w.left, y: e.center.y + d.top - w.top }
    onpinch(e.direction, nearestPart(readAnchors(wrap, view), point))
  }

  const focused = $derived(focusPart !== null && depth > 0)

  let wrap = $state<HTMLElement>()
  let anchors = $state.raw<Anchors>({})
  let leaders = $state.raw<Leader[]>([])
  const bubbleEls: Partial<Record<Part, HTMLElement>> = $state({})

  const textOf = (part: Part) => parts?.[part]?.l1 || '（原稿準備中）'

  async function measure() {
    if (!wrap) return
    await tick()
    // 待っている間に画面を離れた（コンポーネントが破棄された）場合は何もしない
    if (!wrap?.isConnected) return
    anchors = readAnchors(wrap, view)
    const map = new Map<Part, HTMLElement>()
    for (const p of [...TOP_PARTS, ...BOTTOM_PARTS]) {
      const el = bubbleEls[p]
      if (el) map.set(p, el)
    }
    leaders = paused && !focused ? leaderLines(wrap, map, anchors) : []
  }

  // 姿勢・視点・一時停止状態・開いている部位が変わったら測り直す
  $effect(() => {
    void scene
    void scene3d
    void cam
    void view
    void paused
    void parts
    void focused
    measure()
  })

  const focusAnchor = $derived(focused && focusPart ? anchors[focusPart] : undefined)

  // ---- ズーム（T19）: 開いている部位の起点を中心に、深さ1〜5で 1.2〜2.0 倍 ----
  // 中心は DOM を測らずポーズから計算する（最初のフレームから正しい位置で拡大が始まる）。閉じた後も縮小し終えるまで中心を保つ
  let origin = $state({ x: 50, y: 50 })
  $effect.pre(() => {
    if (!focused || !focusPart || !scene) return
    const p = partAnchor(scene[view], focusPart, 'f')
    const x = view === 'uke' ? VIEW_W - p[0] : p[0]
    origin = { x: (x / VIEW_W) * 100, y: (p[1] / VIEW_H) * 100 }
  })
  const zoom = $derived(focused ? Math.min(2, 1 + 0.2 * depth) : 1)

  $effect(() => {
    if (!wrap) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(wrap)
    return () => ro.disconnect()
  })

  // 段内の並び（起点の x 順）も DOM を測らずポーズから計算する。測ってから並べ替えると、最初の描画の後に吹き出しが動いてレイアウトがずれる
  const poseAnchors = $derived.by(() => {
    const out: Anchors = {}
    if (mode3d && scene3d && cam) {
      const a = partAnchors(scene3d[view], cam)
      for (const part of [...TOP_PARTS, ...BOTTOM_PARTS]) out[part] = { x: a[part].x, y: a[part].y }
      return out
    }
    if (!scene) return out
    for (const part of [...TOP_PARTS, ...BOTTOM_PARTS]) {
      const p = partAnchor(scene[view], part, 'f')
      out[part] = { x: view === 'uke' ? VIEW_W - p[0] : p[0], y: p[1] }
    }
    return out
  })
  const topOrder = $derived(orderByX(TOP_PARTS, poseAnchors))
  const bottomOrder = $derived(orderByX(BOTTOM_PARTS, poseAnchors))
</script>

<div class="stage" class:paused class:focused bind:this={wrap}>
  <div class="band top" aria-hidden={!paused}>
    {#each TOP_PARTS as part (part)}
      <PartBubble {part} text={textOf(part)} expanded={focusPart === part && depth > 0} controls={toggleId} order={topOrder.indexOf(part)} {onselect} bind:element={bubbleEls[part]} />
    {/each}
  </div>

  <div class="drawing" bind:this={drawing} use:pinch={{ onpinch: handlePinch }}>
    {#if mode3d && scene3d && cam && body3d && bounds3d}
      <Body3D scene={scene3d} {view} {cam} body={body3d} bounds={bounds3d} {label} focusPart={focused ? focusPart : null} {zoom} onfallback={onfallback3d} />
    {:else if scene}
      <Zoomable scale={zoom} originX={origin.x} originY={origin.y}>
        <Body pose={scene} {view} {ground} {label} />
      </Zoomable>
    {/if}
  </div>

  <div class="band bottom" aria-hidden={!paused}>
    {#each BOTTOM_PARTS as part (part)}
      <PartBubble {part} text={textOf(part)} expanded={focusPart === part && depth > 0} controls={toggleId} order={bottomOrder.indexOf(part)} {onselect} bind:element={bubbleEls[part]} />
    {/each}
  </div>

  <svg class="leaders" aria-hidden="true">
    {#each leaders as l (l.part)}
      <path class="leader" d={leaderPath(l)} />
      <circle class="leader-dot" cx={l.to.x} cy={l.to.y} r="4" />
    {/each}
    {#if focusAnchor}
      <circle class="focus-ring" cx={focusAnchor.x} cy={focusAnchor.y} r="14" />
      <circle class="leader-dot" cx={focusAnchor.x} cy={focusAnchor.y} r="4" />
    {/if}
  </svg>

  {#if focusAnchor && focusPart}
    <!-- 開いている部位の小さな札（タップでさらに深く） -->
    <button
      type="button"
      class="focus-chip"
      style:left="{Math.max(0, Math.min((wrap?.clientWidth ?? 9999) - 60, focusAnchor.x))}px"
      style:top="{Math.max(56, focusAnchor.y)}px"
      aria-controls={toggleId}
      aria-expanded="true"
      onclick={() => focusPart && onselect(focusPart)}
    >
      <span aria-hidden="true">{PART_SHORT[focusPart]}</span><span class="visually-hidden">{PART_LABEL[focusPart]}をさらに詳しく</span>
    </button>
  {/if}
</div>

<style>
  .stage {
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: var(--space-2);
    user-select: none;
    -webkit-user-select: none;
  }
  .band {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    min-height: 66px;
    align-items: stretch;
    transition: opacity var(--dur-base) var(--ease-out);
  }
  .band.top {
    align-items: end;
  }
  .stage:not(.paused) .band {
    opacity: 0;
    visibility: hidden;
  }
  /* 部位を開いている間は段をたたんで骨格だけにする（下の解説を広く読むため） */
  .stage.focused .band {
    display: none;
  }
  .focus-ring {
    fill: none;
    stroke: var(--shu);
    stroke-width: 2.5;
    stroke-dasharray: 4 3;
  }
  .focus-chip {
    position: absolute;
    transform: translate(12px, -110%);
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    display: grid;
    place-items: center;
    padding: 0;
    border: 1.5px solid var(--shu);
    border-radius: 50%;
    background: var(--washi-light);
    color: var(--shu);
    font-family: var(--font-heading);
    font-size: var(--text-l);
    cursor: pointer;
  }
  .drawing {
    aspect-ratio: 1000 / 600;
    width: 100%;
    overflow: hidden;
    /* ピンチ判定のため、アニメ領域の要素にだけ touch-action を止める。ページ全体・吹き出し・解説の標準ズームとスクロールは生きる（CLAUDE.md 絶対ルール4） */
    touch-action: none;
  }
  .leaders {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }
  .leader {
    fill: none;
    stroke: var(--sumi-shou);
    stroke-width: 1.5;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .leader-dot {
    fill: var(--washi);
    stroke: var(--shu);
    stroke-width: 2;
  }
</style>
