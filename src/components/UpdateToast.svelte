<script lang="ts">
  // 更新・オフライン準備の通知（読み上げは role=status）
  import { pwaNotice } from '../lib/pwa.svelte'
</script>

<div class="toast-region" role="status" aria-live="polite">
  {#if pwaNotice.message}
    <div class="toast">
      <span>{pwaNotice.message}</span>
      <button type="button" onclick={() => pwaNotice.dismiss()} aria-label="通知を閉じる">×</button>
    </div>
  {/if}
</div>

<style>
  .toast-region {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 10;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: calc(100vw - 2 * var(--space-3));
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
    background: var(--sumi-shou);
    color: var(--washi);
    border-radius: var(--radius-m);
    font-size: var(--text-s);
    animation: rise var(--dur-base) var(--ease-out);
  }
  button {
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 0;
    background: none;
    color: inherit;
    font-size: var(--text-l);
    cursor: pointer;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
