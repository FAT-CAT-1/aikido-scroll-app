<script lang="ts">
  // pose → 取り・受け2体の SVG（animation-spec §1-3 A 棒人間 / §4 視点切替）
  // view=uke のときはシーン全体を左右反転し、注目側を手前レイヤー・濃墨にする。文字やマーカーは SVG 外（HTML）に描く。
  import type { FigurePose, Role } from '../content/types'
  import Figure from './Figure.svelte'
  import { VIEW_H, VIEW_W } from './geometry'

  interface Props {
    pose: { tori: FigurePose; uke: FigurePose }
    view?: Role
    ids?: boolean
    ground?: number
    label?: string
  }
  let { pose, view = 'tori', ids = true, ground = 520, label = '' }: Props = $props()

  const other = $derived<Role>(view === 'tori' ? 'uke' : 'tori')
</script>

<svg class="body" viewBox="0 0 {VIEW_W} {VIEW_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
  <path class="ground" d="M24 {ground + 3}H976" />
  <g class="scene" transform={view === 'uke' ? `translate(${VIEW_W} 0) scale(-1 1)` : undefined}>
    <!-- 奥レイヤー（相手・淡墨） -->
    <Figure role={other} pose={pose[other]} focus={false} {ids} />
    <!-- 手前レイヤー（注目側・濃墨・帯矢印） -->
    <Figure role={view} pose={pose[view]} focus={true} {ids} />
  </g>
</svg>

<style>
  .body {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .ground {
    fill: none;
    stroke: var(--sumi-sei);
    stroke-width: 3;
    stroke-linecap: round;
  }
</style>
