<script lang="ts">
  // 技の巻物ストリップ（animation-spec §5-2 / design-complete A-4 / backlog T25）
  // 横スクロール量を 0〜1 に正規化して進捗にする。中央の朱の線（再生位置）に kf の目盛りが重なる位置が、その kf の at。
  // - 指（ホイール・キー）で動かすと onscrub(progress)。止まって 300ms で onidle（＝一時停止。親が吹き出しを出す）
  // - 止まった位置が kf から ±2.5% 以内なら、その kf にそろえてから一時停止（姿勢と解説を一致させる）
  //   CSS の scroll-snap は再生の停止時などに勝手に位置を動かし進捗と食い違うため使わない
  // - 自分で書いた scrollLeft（再生・kf 送り・復元）による scroll イベントは、期待位置との一致で見分けて無視する
  // - キーボード: role=slider。←→ で 2%、PageUp/PageDown・Home/End で kf 単位／端
  import { onMount } from 'svelte'

  interface Props {
    keyframes: readonly { id: string; label: string; at: number }[]
    progress: number
    playing?: boolean
    label: string
    valueText: string
    onscrub: (progress: number) => void
    onidle: () => void
    /** 再生中にユーザーが触った（ホイール・指・キー） */
    oninteract?: () => void
  }
  let { keyframes, progress, playing = false, label, valueText, onscrub, onidle, oninteract = () => {} }: Props = $props()

  const LENGTH = 4 // 巻物の長さ（表示幅の何倍か）
  const IDLE_MS = 300
  const SNAP = 0.025 // kf にそろえる範囲（進捗）

  let scroller = $state<HTMLElement>()
  let width = $state(0)
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  /** 最後に自分で書いた scrollLeft（これと一致する scroll イベントは自分の書き込み）。NaN＝まだ無い／使い終わった */
  let writtenLeft = Number.NaN

  const maxScroll = $derived(width * (LENGTH - 1))

  function setScroll(p: number) {
    if (!scroller || maxScroll <= 0) return
    const left = Math.round(p * maxScroll)
    if (Math.abs(scroller.scrollLeft - left) < 1) return
    writtenLeft = left
    scroller.scrollLeft = left
  }

  // 親から進捗が変わったら（再生・kf 送り・復元）スクロール位置を合わせる
  $effect(() => {
    void maxScroll
    setScroll(progress)
  })

  onMount(() => {
    const el = scroller!
    const ro = new ResizeObserver(() => (width = el.clientWidth))
    ro.observe(el)
    width = el.clientWidth
    return () => {
      ro.disconnect()
      clearTimeout(idleTimer)
    }
  })

  function onScroll() {
    if (!scroller || maxScroll <= 0) return
    // 自分の書き込み（再生中の同期など）はユーザー操作として扱わない。1回分の scroll イベントで使い終わる
    // （残しておくと、後で指がたまたま同じ位置で止まったときに無視してしまう。初期値を 0 付近にすると左端への移動を無視する）
    if (Math.abs(scroller.scrollLeft - writtenLeft) <= 1) {
      writtenLeft = Number.NaN
      return
    }
    if (playing) return
    const p = Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll))
    onscrub(p)
    clearTimeout(idleTimer)
    idleTimer = setTimeout(settle, IDLE_MS)
  }

  /** 止まったら：近くの kf にそろえてから一時停止 */
  function settle() {
    const near = keyframes.find((k) => Math.abs(k.at - progress) <= SNAP)
    if (near && Math.abs(near.at - progress) > 1e-4) {
      onscrub(near.at)
      setScroll(near.at)
    }
    onidle()
  }

  function stepTo(p: number) {
    oninteract()
    const clamped = Math.min(1, Math.max(0, p))
    onscrub(clamped)
    setScroll(clamped)
    clearTimeout(idleTimer)
    idleTimer = setTimeout(settle, IDLE_MS)
  }

  function onkeydown(e: KeyboardEvent) {
    const idx = keyframes.findIndex((k) => k.at > progress + 1e-6)
    const next = idx === -1 ? 1 : keyframes[idx]!.at
    const prevs = keyframes.filter((k) => k.at < progress - 1e-6)
    const prev = prevs.length ? prevs[prevs.length - 1]!.at : 0
    const map: Record<string, number> = {
      ArrowRight: progress + 0.02,
      ArrowUp: progress + 0.02,
      ArrowLeft: progress - 0.02,
      ArrowDown: progress - 0.02,
      PageDown: next,
      PageUp: prev,
      Home: 0,
      End: 1,
    }
    if (!(e.key in map)) return
    e.preventDefault()
    stepTo(map[e.key]!)
  }
</script>

<div class="strip" class:playing>
  <div
    class="scroller"
    bind:this={scroller}
    onscroll={onScroll}
    onpointerdown={() => playing && oninteract()}
    onwheel={() => playing && oninteract()}
    ontouchstart={() => playing && oninteract()}
    {onkeydown}
    role="slider"
    tabindex="0"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(progress * 100)}
    aria-valuetext={valueText}
  >
    <div class="track" style:width="{width * LENGTH}px">
      <svg class="paper" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 {LENGTH * 100} 64">
        <path class="brush" d="M0 38 C {LENGTH * 25} 35, {LENGTH * 50} 40, {LENGTH * 75} 37 S {LENGTH * 100} 38, {LENGTH * 100} 38" />
      </svg>
      {#each keyframes as k, i (k.id)}
        <div class="tick" style:left="{width / 2 + k.at * maxScroll}px">
          <span class="mark" aria-hidden="true"></span>
          <span class="kf-label">{k.label}</span>
          <span class="kf-num" aria-hidden="true">{i + 1}</span>
        </div>
      {/each}
    </div>
  </div>
  <div class="playhead" aria-hidden="true"></div>
</div>

<style>
  .strip {
    position: relative;
    height: 72px;
    margin-top: var(--space-2);
    border-top: 1px solid var(--sumi-sei);
    border-bottom: 1px solid var(--sumi-sei);
    background: var(--washi-deep);
    /* 端をにじませる */
    mask-image: linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
  }
  .scroller {
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    touch-action: pan-x;
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  .scroller:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: -2px;
  }
  .track {
    position: relative;
    height: 100%;
  }
  .paper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .brush {
    fill: none;
    stroke: var(--sumi-tan);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
  }
  .mark {
    position: absolute;
    left: -1.5px;
    top: 22px;
    width: 3px;
    height: 22px;
    background: var(--sumi-shou);
    border-radius: 2px;
  }
  .kf-label {
    position: absolute;
    top: 46px;
    transform: translateX(-50%);
    white-space: nowrap;
    font-family: var(--font-heading);
    font-size: var(--text-s);
    color: var(--sumi-shou);
  }
  .kf-num {
    position: absolute;
    top: 3px;
    transform: translateX(-50%);
    font-family: var(--font-sub);
    font-size: var(--text-xs);
    color: var(--sumi-nou);
  }
  .playhead {
    position: absolute;
    left: 50%;
    top: 0;
    /* kf 名（下段）に重ならないよう目盛りの高さまで */
    bottom: 26px;
    width: 2px;
    margin-left: -1px;
    background: var(--shu);
    pointer-events: none;
  }
  .playhead::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 0;
    border: 6px solid transparent;
    border-top-color: var(--shu);
  }
</style>
