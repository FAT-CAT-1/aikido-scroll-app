<script lang="ts">
  // アニメ領域：骨格＋6部位の l1 吹き出し（上段＝目・顔・肩／下段＝腹・膝・足）＋筆致の引き出し線（backlog T16）
  // 吹き出しは一時停止中だけ表示し、再生・スクロール中は消す（animation-spec §5-3）
  import { tick } from 'svelte'
  import Body from '../lib/anim/Body.svelte'
  import { VIEW_H, VIEW_W, partAnchor } from '../lib/anim/geometry'
  import { BOTTOM_PARTS, TOP_PARTS, leaderLines, leaderPath, orderByX, readAnchors, type Anchors, type Leader } from '../lib/anim/markers'
  import type { ScenePose } from '../lib/anim/timeline'
  import type { Part, PartLevels, Role } from '../lib/content/types'
  import { PART_LABEL, PART_SHORT } from '../lib/content/types'
  import PartBubble from './PartBubble.svelte'
  import Zoomable from './Zoomable.svelte'

  interface Props {
    scene: ScenePose
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
  }
  let { scene, view, ground = 520, label, parts, paused, toggleId, focusPart = null, depth = 0, onselect = () => {} }: Props = $props()

  const focused = $derived(focusPart !== null && depth > 0)

  let wrap = $state<HTMLElement>()
  let anchors = $state.raw<Anchors>({})
  let leaders = $state.raw<Leader[]>([])
  const bubbleEls: Partial<Record<Part, HTMLElement>> = $state({})

  const textOf = (part: Part) => parts?.[part]?.l1 || '（原稿準備中）'

  async function measure() {
    if (!wrap) return
    await tick()
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
    if (!focused || !focusPart) return
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

  const topOrder = $derived(orderByX(TOP_PARTS, anchors))
  const bottomOrder = $derived(orderByX(BOTTOM_PARTS, anchors))
</script>

<div class="stage" class:paused class:focused bind:this={wrap}>
  <div class="band top" aria-hidden={!paused}>
    {#each TOP_PARTS as part (part)}
      <PartBubble {part} text={textOf(part)} expanded={focusPart === part && depth > 0} controls={toggleId} order={topOrder.indexOf(part)} {onselect} bind:element={bubbleEls[part]} />
    {/each}
  </div>

  <div class="drawing">
    <Zoomable scale={zoom} originX={origin.x} originY={origin.y}>
      <Body pose={scene} {view} {ground} {label} />
    </Zoomable>
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
