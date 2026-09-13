<script lang="ts">
  // 再生コントロール（animation-spec §5-2 / design-complete B-5「親指到達域・筆アイコン」/ backlog T26）
  // prefers-reduced-motion のときは自動再生を出さず、kf 単位のステップ送りだけにする
  interface Props {
    playing: boolean
    speed: number
    reducedMotion: boolean
    canPrev: boolean
    canNext: boolean
    ontoggleplay: () => void
    onspeed: (speed: number) => void
    onprev: () => void
    onnext: () => void
  }
  let { playing, speed, reducedMotion, canPrev, canNext, ontoggleplay, onspeed, onprev, onnext }: Props = $props()
</script>

<div class="controls" role="group" aria-label="再生">
  <button type="button" class="step" onclick={onprev} disabled={!canPrev} aria-label="前の場面（キーフレーム）へ">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5 L8 12 L17 19" /><path class="bar" d="M6 5 V19" /></svg>
  </button>

  {#if !reducedMotion}
    <button type="button" class="play" onclick={ontoggleplay} aria-pressed={playing} aria-label={playing ? '一時停止' : '再生'}>
      {#if playing}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="bar" d="M9 5 V19" /><path class="bar" d="M15 5 V19" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M8 4.5 C 13 8, 17 10.5, 19.5 12 C 17 13.5, 13 16, 8 19.5 Z" /></svg>
      {/if}
      <span class="play-label">{playing ? '止める' : '再生'}</span>
    </button>
  {:else}
    <span class="rm-note">動きを減らす設定のため、場面ごとに送ります</span>
  {/if}

  <button type="button" class="step" onclick={onnext} disabled={!canNext} aria-label="次の場面（キーフレーム）へ">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5 L16 12 L7 19" /><path class="bar" d="M18 5 V19" /></svg>
  </button>

  {#if !reducedMotion}
    <button type="button" class="speed" onclick={() => onspeed(speed === 1 ? 0.5 : 1)} aria-label="再生の速さ（現在 {speed === 1 ? '等速' : '半分'}）">
      {speed === 1 ? '1×' : '0.5×'}
    </button>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }
  button {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 1px solid var(--sumi-shou);
    border-radius: var(--radius-m);
    background: var(--washi-light);
    color: var(--sumi-shou);
    cursor: pointer;
    font: inherit;
  }
  button:disabled {
    border-color: var(--sumi-sei);
    color: var(--sumi-tan);
    cursor: default;
  }
  .play {
    min-width: 112px;
    background: var(--sumi-shou);
    color: var(--washi);
  }
  .play[aria-pressed='true'] {
    background: var(--washi-light);
    color: var(--sumi-shou);
  }
  .play-label {
    font-family: var(--font-heading);
    font-size: var(--text-l);
  }
  svg {
    width: 22px;
    height: 22px;
  }
  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  path.bar {
    stroke-width: 3;
  }
  path.fill {
    fill: currentColor;
    stroke-width: 1.5;
  }
  .speed {
    font-family: var(--font-sub);
    font-size: var(--text-s);
    min-width: 56px;
  }
  .rm-note {
    font-size: var(--text-xs);
    color: var(--sumi-juu);
    max-width: 12em;
    text-align: center;
  }
</style>
