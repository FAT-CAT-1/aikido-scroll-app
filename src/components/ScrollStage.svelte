<script lang="ts" module>
  export interface Chapter {
    id: string
    /** 縦書きの章題（UI 文字列） */
    title: string
    /** 章番号（漢数字） */
    num: string
    href?: string
    /** 章扉の短い案内（原稿 content/pages の lead、または件数などの UI 表示） */
    lead?: string
    action?: string
  }
</script>

<script lang="ts">
  // 巻物トップ（S-01 / design-complete A-7 / backlog T24）
  // 横 Scroll Snap（x mandatory・章ごとに止まる）＋ overscroll-behavior-x: contain（端での戻るジェスチャー誤爆を防ぐ）
  // 進捗の筆線は CSS scroll-driven animations、非対応ブラウザは GSAP ScrollTrigger で同じ見た目にする
  import { onMount } from 'svelte'
  import BrushLine from './BrushLine.svelte'

  interface Props {
    chapters: Chapter[]
    /** 初期表示する章（戻ってきたときの復元用） */
    initialIndex?: number
    onindexchange?: (index: number) => void
  }
  let { chapters, initialIndex = 0, onindexchange }: Props = $props()

  let scroller = $state<HTMLElement>()
  let progressBar = $state<HTMLElement>()
  let index = $state(0)

  const supportsScrollTimeline = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')

  function goTo(i: number, smooth = true) {
    if (!scroller) return
    const clamped = Math.max(0, Math.min(chapters.length - 1, i))
    const target = scroller.children[clamped] as HTMLElement | undefined
    if (!target) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ left: target.offsetLeft, behavior: smooth && !reduce ? 'smooth' : 'instant' })
  }

  onMount(() => {
    const el = scroller!
    goTo(initialIndex, false)
    index = initialIndex

    // 表示中の章（IntersectionObserver: 6割以上見えている章）
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index)
            if (i !== index) {
              index = i
              onindexchange?.(i)
            }
          }
        }
      },
      { root: el, threshold: 0.6 },
    )
    for (const c of el.children) io.observe(c)

    // デスクトップ: 縦ホイールを横スクロールに（横成分があるトラックパッドはそのまま）
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return
      e.preventDefault()
      goTo(index + Math.sign(e.deltaY))
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    // 進捗の筆線: scroll-driven animations 非対応なら ScrollTrigger で代替（必要な時だけ読み込む）
    let cleanupFallback: (() => void) | undefined
    if (!supportsScrollTimeline && progressBar) {
      import('../lib/anim/scroll-progress').then(({ attachScrollProgress }) => {
        cleanupFallback = attachScrollProgress(el, progressBar!)
      })
    }

    return () => {
      io.disconnect()
      el.removeEventListener('wheel', onWheel)
      cleanupFallback?.()
    }
  })

</script>

<section class="emaki" aria-label="巻物">
  <!-- スクロール領域はフォーカス可能にし、ブラウザ標準の ←→ / Home / End スクロール（スナップ付き）で章を移動できる -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroller" class:timeline={supportsScrollTimeline} bind:this={scroller} tabindex="0" role="region" aria-roledescription="巻物" aria-label="章の一覧（左右の矢印キーで移動）">
    {#each chapters as ch, i (ch.id)}
      <article class="chapter" data-index={i} aria-roledescription="章" aria-label="{ch.num} {ch.title}（{i + 1} / {chapters.length}）">
        <div class="inner">
          <header class="title-block">
            <span class="num" aria-hidden="true">{ch.num}</span>
            <h2 class="title">{ch.title}</h2>
          </header>
          <div class="body">
            <BrushLine visible={index === i} width={180} />
            {#if ch.lead}<p class="lead">{ch.lead}</p>{/if}
            {#if ch.href}
              <a class="enter" href={ch.href}>{ch.action ?? 'ひらく'}<span aria-hidden="true">　→</span></a>
            {/if}
          </div>
          <span class="seal" aria-hidden="true"></span>
        </div>
      </article>
    {/each}
  </div>

  <div class="dock">
    <button class="nav" type="button" onclick={() => goTo(index - 1)} disabled={index === 0} aria-label="前の章">←</button>
    <div class="progress" aria-hidden="true">
      <div class="progress-track"></div>
      <div class="progress-ink" bind:this={progressBar}></div>
    </div>
    <button class="nav" type="button" onclick={() => goTo(index + 1)} disabled={index === chapters.length - 1} aria-label="次の章">→</button>
  </div>
  <nav class="toc" aria-label="章へ移動">
    {#each chapters as ch, i (ch.id)}
      <button type="button" class="toc-item" aria-current={index === i ? 'true' : undefined} onclick={() => goTo(i)}>{ch.title}</button>
    {/each}
  </nav>
</section>

<style>
  .emaki {
    position: relative;
    height: 100dvh;
    display: grid;
    grid-template-rows: 1fr auto auto;
    overflow: hidden;
  }

  .scroller {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-timeline: --emaki x;
  }
  .scroller::-webkit-scrollbar {
    display: none;
  }
  .scroller:focus-visible {
    outline-offset: -4px;
  }

  .chapter {
    flex: 0 0 100%;
    min-width: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    display: grid;
    padding: var(--space-5) var(--space-4) var(--space-3);
    overflow-y: auto;
  }

  .inner {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-4);
    align-items: stretch;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  .title-block {
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }
  .num {
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--shu);
  }
  .title {
    writing-mode: vertical-rl;
    /* 縦向きは幅で、横向きスマホ・200% 表示は高さで決める（4字の章題＋番号が章の高さに収まる大きさ。D-43） */
    font-size: clamp(2rem, min(16vw, (100dvh - 200px) / 5), 5.5rem);
    letter-spacing: 0.15em;
    line-height: 1;
  }

  .body {
    grid-column: 1;
    grid-row: 1;
    align-self: end;
    display: grid;
    gap: var(--space-3);
    padding-bottom: var(--space-5);
  }
  .lead {
    font-size: var(--text-m);
    color: var(--sumi-nou);
    max-width: 30em;
  }
  .enter {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-min);
    padding: 0 var(--space-3);
    border: var(--line-thin) solid var(--sumi-shou);
    border-radius: var(--radius-s);
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--sumi-shou);
    text-decoration: none;
    background: var(--washi-light);
  }
  .enter:active {
    background: var(--washi-deep);
  }

  .seal {
    position: absolute;
    right: 0;
    bottom: var(--space-3);
    width: 20px;
    height: 20px;
    background: var(--shu);
    border-radius: 2px;
    opacity: 0.9;
  }

  .dock {
    display: grid;
    grid-template-columns: var(--tap-min) 1fr var(--tap-min);
    align-items: center;
    gap: var(--space-3);
    padding: 0 var(--space-3);
  }
  .nav {
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    border: 0;
    background: none;
    font-size: var(--text-l);
    color: var(--sumi-shou);
    cursor: pointer;
  }
  .nav:disabled {
    color: var(--sumi-sei);
    cursor: default;
  }
  .progress {
    position: relative;
    height: 10px;
  }
  .progress-track {
    position: absolute;
    inset: 4px 0;
    background: var(--sumi-sei);
    border-radius: 2px;
    opacity: 0.6;
  }
  .progress-ink {
    position: absolute;
    inset: 2px 0;
    background: var(--sumi-shou);
    border-radius: 3px 6px 6px 3px;
    transform-origin: left center;
    transform: scaleX(0.02);
  }
  @supports (animation-timeline: scroll()) {
    .emaki {
      timeline-scope: --emaki;
    }
    .progress-ink {
      animation: emaki-progress linear both;
      animation-timeline: --emaki;
    }
  }
  @keyframes emaki-progress {
    from {
      transform: scaleX(0.02);
    }
    to {
      transform: scaleX(1);
    }
  }

  .toc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0 var(--space-1);
    padding: var(--space-2) var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom));
  }
  .toc-item {
    border: 0;
    background: none;
    min-height: var(--tap-min);
    min-width: var(--tap-min);
    padding: 0 var(--space-1);
    font-size: var(--text-s);
    color: var(--sumi-juu);
    border-bottom: var(--line-thin) solid transparent;
    cursor: pointer;
  }
  .toc-item[aria-current='true'] {
    color: var(--sumi-shou);
    border-bottom-color: var(--sumi-shou);
  }
</style>
