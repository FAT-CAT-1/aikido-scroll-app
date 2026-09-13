<script lang="ts">
  // 一時停止時の l1 吹き出し（design-complete A-8 / B-5「淡墨枠＋和紙下地。指し線は筆致。l1・20字」）
  import type { Part } from '../lib/content/types'
  import { PART_LABEL, PART_SHORT } from '../lib/content/types'

  interface Props {
    part: Part
    text: string
    expanded: boolean
    controls: string
    order?: number
    onselect: (part: Part) => void
    element?: HTMLElement
  }
  let { part, text, expanded, controls, order = 0, onselect, element = $bindable() }: Props = $props()
</script>

<button
  bind:this={element}
  class="bubble"
  type="button"
  style:order
  aria-expanded={expanded}
  aria-controls={controls}
  data-part={part}
  onclick={() => onselect(part)}
>
  <span class="label" aria-hidden="true">{PART_SHORT[part]}</span>
  <span class="visually-hidden">{PART_LABEL[part]}：</span>
  <span class="text">{text}</span>
</button>

<style>
  .bubble {
    appearance: none;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 2px var(--space-1);
    width: 100%;
    min-height: var(--tap-min);
    padding: var(--space-1) var(--space-2);
    background: var(--washi-light);
    border: 1px solid var(--sumi-tan);
    border-radius: var(--radius-m);
    color: var(--sumi-shou);
    text-align: left;
    cursor: pointer;
    box-shadow: 0 1px 0 var(--sumi-sei);
  }
  .bubble:hover {
    border-color: var(--sumi-shou);
  }
  .bubble[aria-expanded='true'] {
    border-color: var(--shu);
    box-shadow: inset 0 0 0 1px var(--shu);
  }
  .label {
    font-family: var(--font-heading);
    font-size: var(--text-m);
    line-height: 1.3;
    color: var(--shu);
  }
  .text {
    font-size: var(--text-xs);
    line-height: 1.45;
    word-break: auto-phrase;
  }
</style>
