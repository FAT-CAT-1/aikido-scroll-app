<script lang="ts">
  // 視点切替タブ（取り／受け）。animation-spec §4 / design-complete B-5「選択側に焦墨下線」
  import type { Role } from '../lib/content/types'
  import { ROLE_LABEL } from '../lib/content/types'

  interface Props {
    view: Role
    controls: string
    onchange: (view: Role) => void
  }
  let { view, controls, onchange }: Props = $props()

  const roles: Role[] = ['tori', 'uke']

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next: Role = view === 'tori' ? 'uke' : 'tori'
    onchange(next)
    queueMicrotask(() => document.getElementById(`view-tab-${next}`)?.focus())
  }
</script>

<div class="tabs" role="tablist" aria-label="視点">
  {#each roles as role (role)}
    <button
      id="view-tab-{role}"
      class="tab"
      role="tab"
      type="button"
      aria-selected={view === role}
      aria-controls={controls}
      tabindex={view === role ? 0 : -1}
      onclick={() => onchange(role)}
      {onkeydown}
    >
      {ROLE_LABEL[role]}<span class="sub">の視点</span>
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--space-4);
  }
  .tab {
    appearance: none;
    background: none;
    border: 0;
    border-bottom: var(--line-thin) solid transparent;
    padding: var(--space-1) var(--space-1);
    min-height: var(--tap-min);
    min-width: var(--tap-min);
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--sumi-juu);
    cursor: pointer;
  }
  .tab[aria-selected='true'] {
    color: var(--sumi-shou);
    border-bottom: var(--line-bold) solid var(--selected);
  }
  .sub {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    margin-left: 2px;
  }
</style>
