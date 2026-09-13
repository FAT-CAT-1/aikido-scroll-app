<script lang="ts">
  // 校閲前バッジ（content-spec §7「draft/review も表示するが朱の『校閲前』バッジ」／ design-complete B-5「朱の印風」）
  import type { Status } from '../lib/content/types'

  let { status }: { status: Status } = $props()
</script>

{#if status !== 'approved'}
  <span class="badge" title={status === 'review' ? '師範・上級生の校閲中です' : '師範の校閲前の原稿です'}>
    校閲前
  </span>
{/if}

<style>
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border: 1.5px solid var(--shu);
    border-radius: 3px;
    color: var(--shu);
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    line-height: 1.4;
    letter-spacing: 0.1em;
    transform: rotate(-3deg);
    white-space: nowrap;
  }
</style>
