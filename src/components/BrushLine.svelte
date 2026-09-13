<script lang="ts">
  // 筆致線（太→細へ抜ける墨の線）。visible になると描かれる（prefers-reduced-motion では即表示）。design-complete B-4-3 / B-6
  interface Props {
    visible?: boolean
    width?: number
    color?: string
  }
  let { visible = true, width = 240, color = 'var(--sumi-shou)' }: Props = $props()
</script>

<svg class="brush" class:drawn={visible} viewBox="0 0 240 16" width={width} height={(width * 16) / 240} aria-hidden="true" focusable="false">
  <!-- 太い入り→細い抜き を2本の線の重ねで表現 -->
  <path class="stroke thick" pathLength="1" d="M4 9 C60 6 120 7 170 8" stroke={color} />
  <path class="stroke thin" pathLength="1" d="M20 8.5 C90 7 170 7.5 236 6" stroke={color} />
</svg>

<style>
  .brush {
    display: block;
    overflow: visible;
  }
  .stroke {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 0.7s var(--ease-out);
  }
  .thick {
    stroke-width: 6;
  }
  .thin {
    stroke-width: 2;
    transition-delay: 0.12s;
  }
  .drawn .stroke {
    stroke-dashoffset: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .stroke {
      transition: none;
      stroke-dashoffset: 0;
    }
  }
</style>
