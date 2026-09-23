<script lang="ts">
  // 3D の技アニメ（docs/animation-spec.md §13）
  // - three.js の描画部分（renderer.ts）はここで遅延読み込みする。技の説明文や吹き出しは先に出る
  // - 部位の起点は DOM の小さな印（#{role}-{part}[-{f|b}] .anchor）として重ねる。吹き出しの引き出し線・ピンチの部位判定は 2D と同じ仕組みで読む
  //   f＝カメラに近い側（手前）、b＝遠い側
  // - 部位を開いたときの拡大は、その部位の画面上の位置を中心にカメラの写す範囲を狭める（2D の拡大と同じ見え方で、にじまない）
  // - WebGL が使えなければ onfallback を呼ぶ（技詳細は 2D に切り替える）
  import { gsap } from 'gsap'
  import { onMount, untrack } from 'svelte'
  import type { Body3D, Part, Role, Vec3 } from '../content/types'
  import { farAnchor, isSided, NO_ZOOM, partAnchors, type Cam, type Zoom } from './camera'
  import type { Scene3D } from './pose3d'
  import type { Renderer3D } from './renderer'

  interface Props {
    scene: Scene3D
    view: Role
    cam: Cam
    body: Body3D
    bounds: { min: Vec3; max: Vec3 }
    label: string
    /** 開いている部位（拡大の中心） */
    focusPart?: Part | null
    /** 拡大率 1〜2 */
    zoom?: number
    /** 動きの出どころの注記（記述からの推定など）。絵の左上に常に出す */
    note?: string
    onfallback?: () => void
  }
  let { scene, view, cam, body, bounds, label, focusPart = null, zoom = 1, note = '', onfallback = () => {} }: Props = $props()

  let box = $state<HTMLElement>()
  let canvas = $state<HTMLCanvasElement>()
  let renderer: Renderer3D | null = null
  let ready = $state(false)

  // ---- 拡大（2D の Zoomable と同じ時間・イージング。reduced-motion では即時） ----
  let zoomState = $state<Zoom>({ ...NO_ZOOM })
  const tweenTarget: Zoom = { ...NO_ZOOM }
  let tween: gsap.core.Tween | null = null
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // 拡大率・開いている部位・カメラ・視点が変わったときだけ動かす（姿勢や途中の拡大率には反応しない）
  $effect(() => {
    const target = Math.max(1, Math.min(2, zoom))
    const part = focusPart
    const c = cam
    const v = view
    untrack(() => {
      // 開いたとき（とカメラを切り替えたとき）は、その部位の今の位置を中心にする。閉じるときは中心を保ったまま戻す
      if (target > 1 && part) {
        const a = partAnchors(scene[v], c)[part]
        tweenTarget.cx = a.x
        tweenTarget.cy = a.y
      }
      tween?.kill()
      const from = zoomState.s
      if (reduced() || Math.abs(from - target) < 1e-4) {
        zoomState = { s: target, cx: tweenTarget.cx, cy: tweenTarget.cy }
        return
      }
      const p = { s: from }
      tween = gsap.to(p, {
        s: target,
        duration: 0.45,
        ease: target >= from ? 'power2.out' : 'power2.in',
        onUpdate: () => (zoomState = { s: p.s, cx: tweenTarget.cx, cy: tweenTarget.cy }),
      })
    })
  })

  // ---- 部位の起点（DOM の印） ----
  interface Mark {
    id: string
    x: number
    y: number
  }
  const PARTS: readonly Part[] = ['eye', 'face', 'shoulder', 'hara', 'knee', 'foot']
  const marks = $derived.by(() => {
    const out: Mark[] = []
    for (const role of ['tori', 'uke'] as const) {
      const fig = scene[role]
      const near = partAnchors(fig, cam, zoomState)
      for (const part of PARTS) {
        const a = near[part]
        if (!isSided(part)) {
          out.push({ id: `${role}-${part}`, x: a.x, y: a.y })
          continue
        }
        out.push({ id: `${role}-${part}-f`, x: a.x, y: a.y })
        const b = farAnchor(fig, part, a.side, cam, zoomState)
        out.push({ id: `${role}-${part}-b`, x: b.x, y: b.y })
      }
    }
    return out
  })

  // 描くのは1コマに1回（姿勢・拡大・大きさが同じコマで何度変わっても）
  let frame = 0
  function draw() {
    if (!renderer || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      renderer?.update(scene, view, cam, zoomState)
    })
  }
  function resize() {
    if (!box || !renderer) return
    renderer.resize(box.clientWidth, box.clientHeight)
  }

  $effect(() => {
    void scene
    void view
    void cam
    void zoomState
    if (ready) draw()
  })

  onMount(() => {
    let disposed = false
    let ro: ResizeObserver | undefined
    const lost = (e: Event) => {
      e.preventDefault()
      onfallback()
    }
    // three.js（約140KB gzip）の読み込みと初期化は、技の説明文と吹き出しを出して手が空いてから
    const whenIdle = () =>
      new Promise<void>((resolve) => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        requestAnimationFrame(() => (idle ? idle(() => resolve(), { timeout: 1200 }) : setTimeout(resolve, 200)))
      })
    whenIdle()
      .then(() => import('./renderer'))
      .then((m) => {
        if (disposed || !canvas) return
        try {
          renderer = m.createRenderer3D(canvas, body, bounds, m.paletteFromCss(canvas))
        } catch {
          onfallback()
          return
        }
        canvas.addEventListener('webglcontextlost', lost)
        resize()
        return renderer.warmUp(scene, view, cam)
      })
      .then(() => {
        if (disposed || !renderer) return
        ro = new ResizeObserver(() => {
          resize()
          draw()
        })
        if (box) ro.observe(box)
        ready = true
        draw()
      })
      .catch(() => onfallback())
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      tween?.kill()
      ro?.disconnect()
      canvas?.removeEventListener('webglcontextlost', lost)
      renderer?.dispose()
      renderer = null
    }
  })
</script>

<div class="body3d" bind:this={box} class:ready role="img" aria-label={note ? `${label}。${note}` : label}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  {#if note}
    <p class="note" aria-hidden="true">{note}</p>
  {/if}
  {#if !ready}
    <p class="loading" aria-hidden="true">3D を準備中…</p>
  {/if}
  <div class="marks" aria-hidden="true">
    {#each marks as m (m.id)}
      <div class="mark" id={m.id} style:left="{m.x * 100}%" style:top="{m.y * 100}%"><span class="anchor"></span></div>
    {/each}
  </div>
</div>

<style>
  .body3d {
    position: relative;
    width: 100%;
    height: 100%;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--sumi-juu);
    font-size: var(--text-s);
  }
  .marks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  /* 推定の動きであることの注記（decisions D-41）。絵の邪魔にならない左上に小さく、ただし常に読める濃さで */
  .note {
    position: absolute;
    left: var(--space-1);
    top: var(--space-1);
    margin: 0;
    max-width: 70%;
    padding: 2px var(--space-2);
    border: 1px solid var(--sumi-tan);
    border-radius: var(--radius-s);
    background: var(--washi-light);
    color: var(--sumi-nou);
    font-size: var(--text-xs);
    line-height: 1.5;
    pointer-events: none;
  }
  .mark {
    position: absolute;
    width: 0;
    height: 0;
  }
  .anchor {
    position: absolute;
    left: -1px;
    top: -1px;
    width: 2px;
    height: 2px;
  }
</style>
