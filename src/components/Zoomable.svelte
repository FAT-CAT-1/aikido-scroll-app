<script lang="ts">
  // 部位へのズーム（design-complete A-8「transform-origin/scale 制御、reduced-motion対応」/ animation-spec §6「scale(2.0) まで」）
  // 拡大は ease-out、縮小は ease-in（B-6）。reduced-motion ではトークン --dur-zoom が 0s になり即時に切り替わる
  import type { Snippet } from 'svelte'

  interface Props {
    /** 1〜2.0 */
    scale: number
    /** 拡大の中心（要素の幅・高さに対する %） */
    originX: number
    originY: number
    children: Snippet
  }
  let { scale, originX, originY, children }: Props = $props()

  const MAX_SCALE = 2
  const s = $derived(Math.max(1, Math.min(MAX_SCALE, scale)))
  let prev = 1
  let easing = $state('var(--ease-out)')
  $effect.pre(() => {
    easing = s >= prev ? 'var(--ease-out)' : 'var(--ease-in)'
    prev = s
  })
</script>

<div class="zoomable" class:zoomed={s > 1} style:transform-origin="{originX}% {originY}%" style:transform="scale({s})" style:transition-timing-function={easing}>
  {@render children()}
</div>

<style>
  .zoomable {
    width: 100%;
    height: 100%;
    transition-property: transform;
    transition-duration: var(--dur-zoom);
    will-change: transform;
  }
</style>
