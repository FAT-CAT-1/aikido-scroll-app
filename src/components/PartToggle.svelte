<script lang="ts" module>
  export const LEVEL_LABEL = ['要点', '具体的に', 'なぜそうするか', 'よくある誤りと直し方', '師範による違い・歴史・他の技との関係'] as const
</script>

<script lang="ts">
  // 深層トグル（l1→l2→…→l5）。design-complete A-8「l1〜l5 の深層表示（現在 kf の解説）、ARIA、Esc」/ B-5「深いほど余白増・行間増・墨を濃く・和紙濃度up」
  import { tick } from 'svelte'
  import type { Part, PartLevels, Role } from '../lib/content/types'
  import { PART_LABEL, ROLE_LABEL } from '../lib/content/types'

  interface Props {
    id: string
    role: Role
    part: Part | null
    depth: number
    levels: PartLevels | null
    kfLabel: string
    ondeepen: () => void
    oncloseone: () => void
  }
  let { id, role, part, depth, levels, kfLabel, ondeepen, oncloseone }: Props = $props()

  const open = $derived(part !== null && depth > 0)
  const bodies = $derived(levels ? [levels.l1, levels.l2_html, levels.l3_html, levels.l4_html, levels.l5_html] : [])
  const hasTrustMarks = $derived(bodies.slice(1, depth).some((h) => /class="t-[fv]"/.test(h)))

  let prevDepth = 0
  // 開いたら見出しへ、深くしたら新しく開いた段へフォーカスを移す（読み上げが新しい内容から始まる）
  $effect(() => {
    const d = open ? depth : 0
    if (d > 0 && d !== prevDepth) {
      const target = d === 1 || d < prevDepth ? `${id}-title` : `${id}-lv${d}`
      tick().then(() => document.getElementById(target)?.focus({ preventScroll: d === 1 }))
    }
    prevDepth = d
  })
</script>

<section {id} class="toggle depth-{open ? depth : 0}" aria-labelledby="{id}-title" hidden={!open}>
  {#if open && part}
    <header class="head">
      <h2 id="{id}-title" tabindex="-1">
        <span class="role">{ROLE_LABEL[role]}</span>の<span class="part">{PART_LABEL[part]}</span>
        <small class="kf">— {kfLabel}</small>
      </h2>
      <p class="depth-meter" aria-label="詳しさ {depth}／5">
        {#each [1, 2, 3, 4, 5] as n (n)}<span class="dot" class:on={n <= depth} aria-hidden="true"></span>{/each}
      </p>
    </header>

    {#if !levels}
      <p class="missing">この部位の解説はまだ原稿がありません。</p>
    {:else}
      <ol class="levels">
        {#each bodies.slice(0, depth) as body, i (i)}
          <li class="level lv{i + 1}">
            <h3 id="{id}-lv{i + 1}" tabindex="-1"><span class="lv-num">{i + 1}</span>{LEVEL_LABEL[i]}</h3>
            {#if i === 0}
              <p class="l1">{body}</p>
            {:else}
              <div class="body">{@html body}</div>
            {/if}
          </li>
        {/each}
      </ol>
      {#if hasTrustMarks}
        <p class="trust-legend">
          <span>印なし＝一般的な指導</span><span><span class="t-f">事実（出典あり）</span></span><span><span class="t-v">師範・会派により異なる</span></span>
        </p>
      {/if}
    {/if}

    <div class="actions">
      <button type="button" class="more" onclick={ondeepen} disabled={depth >= 5 || !levels} aria-controls={id}>
        {depth >= 5 ? 'これで全部です' : `さらに詳しく（${depth + 1}／5）`}
      </button>
      <button type="button" class="less" onclick={oncloseone}>{depth > 1 ? '一段閉じる' : '閉じる'}</button>
    </div>
    <p class="hint">吹き出しをもう一度タップ／ピンチアウトで深く、ピンチイン・戻る・Esc で一段閉じる</p>
  {/if}
</section>

<style>
  .toggle {
    --pad: var(--space-3);
    --ink: var(--sumi-nou);
    margin-top: var(--space-2);
    padding: var(--pad);
    background: var(--washi-light);
    border-top: var(--line-thin) solid var(--sumi-shou);
    color: var(--ink);
    transition:
      background-color var(--dur-base) var(--ease-out),
      padding var(--dur-base) var(--ease-out);
  }
  /* 深いほど余白・行間・墨・和紙の濃さを増す */
  .depth-2 {
    --pad: calc(var(--space-3) + 2px);
  }
  .depth-3 {
    --pad: calc(var(--space-3) + 4px);
    background: #f2ecdf;
  }
  .depth-4 {
    --pad: calc(var(--space-4) - 2px);
    background: #ede5d4;
    --ink: var(--sumi-shou);
  }
  .depth-5 {
    --pad: var(--space-4);
    background: var(--washi-deep);
    --ink: var(--sumi-shou);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }
  h2 {
    font-size: var(--text-l);
  }
  h2:focus {
    outline: none;
  }
  h2:focus-visible {
    outline: 2px solid var(--focus);
  }
  .part {
    color: var(--shu);
  }
  .kf {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }
  .depth-meter {
    display: flex;
    gap: 3px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid var(--sumi-shou);
  }
  .dot.on {
    background: var(--sumi-shou);
  }

  .levels {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
  }
  .level {
    animation: reveal var(--dur-slow) var(--ease-out);
  }
  h3 {
    font-size: var(--text-s);
    font-family: var(--font-body);
    font-weight: 700;
    color: var(--sumi-juu);
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  h3:focus {
    outline: none;
  }
  h3:focus-visible {
    outline: 2px solid var(--focus);
  }
  .lv-num {
    display: inline-grid;
    place-items: center;
    width: 1.4em;
    height: 1.4em;
    border: 1px solid currentColor;
    border-radius: 2px;
    font-family: var(--font-heading);
    font-weight: 400;
  }
  .l1 {
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--sumi-shou);
  }
  .body {
    font-size: var(--text-m);
    line-height: calc(var(--leading-body) + 0.05 * var(--lv, 1));
  }
  .lv3 .body {
    --lv: 2;
  }
  .lv4 .body {
    --lv: 3;
  }
  .lv5 .body {
    --lv: 4;
  }
  .missing {
    margin-top: var(--space-2);
    color: var(--sumi-juu);
  }
  .trust-legend {
    margin-top: var(--space-3);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .actions button {
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius-s);
    font: inherit;
    cursor: pointer;
  }
  .more {
    background: var(--sumi-shou);
    color: var(--washi);
    border: 1px solid var(--sumi-shou);
  }
  .more:disabled {
    background: var(--sumi-sei);
    border-color: var(--sumi-sei);
    color: var(--sumi-nou);
    cursor: default;
  }
  .less {
    background: transparent;
    color: var(--sumi-shou);
    border: 1px solid var(--sumi-shou);
  }
  .hint {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--sumi-juu);
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .level {
      animation: none;
    }
  }
</style>
