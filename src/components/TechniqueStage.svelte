<script lang="ts">
  // アニメ領域：骨格＋6部位の l1 吹き出し（上段＝目・顔・肩／下段＝腹・膝・足）＋筆致の引き出し線（backlog T16）
  // 吹き出しは一時停止中だけ表示し、再生・スクロール中は消す（animation-spec §5-3）
  import { tick } from 'svelte'
  import Body from '../lib/anim/Body.svelte'
  import { BOTTOM_PARTS, TOP_PARTS, leaderLines, leaderPath, orderByX, readAnchors, type Anchors, type Leader } from '../lib/anim/markers'
  import type { ScenePose } from '../lib/anim/timeline'
  import type { Part, PartLevels, Role } from '../lib/content/types'
  import PartBubble from './PartBubble.svelte'

  interface Props {
    scene: ScenePose
    view: Role
    ground?: number
    label: string
    /** 現在 kf の注目側6部位（原稿が無ければ null） */
    parts: Record<Part, PartLevels> | null
    paused: boolean
    toggleId: string
    onselect?: (part: Part) => void
  }
  let { scene, view, ground = 520, label, parts, paused, toggleId, onselect = () => {} }: Props = $props()

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
    leaders = paused ? leaderLines(wrap, map, anchors) : []
  }

  // 姿勢・視点・一時停止状態が変わったら測り直す
  $effect(() => {
    void scene
    void view
    void paused
    void parts
    measure()
  })

  $effect(() => {
    if (!wrap) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(wrap)
    return () => ro.disconnect()
  })

  const topOrder = $derived(orderByX(TOP_PARTS, anchors))
  const bottomOrder = $derived(orderByX(BOTTOM_PARTS, anchors))
</script>

<div class="stage" class:paused bind:this={wrap}>
  <div class="band top" aria-hidden={!paused}>
    {#each TOP_PARTS as part (part)}
      <PartBubble {part} text={textOf(part)} expanded={false} controls={toggleId} order={topOrder.indexOf(part)} {onselect} bind:element={bubbleEls[part]} />
    {/each}
  </div>

  <div class="drawing">
    <Body pose={scene} {view} {ground} {label} />
  </div>

  <div class="band bottom" aria-hidden={!paused}>
    {#each BOTTOM_PARTS as part (part)}
      <PartBubble {part} text={textOf(part)} expanded={false} controls={toggleId} order={bottomOrder.indexOf(part)} {onselect} bind:element={bubbleEls[part]} />
    {/each}
  </div>

  <svg class="leaders" aria-hidden="true">
    {#each leaders as l (l.part)}
      <path class="leader" d={leaderPath(l)} />
      <circle class="leader-dot" cx={l.to.x} cy={l.to.y} r="4" />
    {/each}
  </svg>
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
