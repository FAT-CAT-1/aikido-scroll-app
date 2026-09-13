<svelte:options namespace="svg" />

<script lang="ts">
  // 1人分の棒人間（A 段階・墨の筆線）。部位 id は #{role}-{part}[-{f|b}]（CLAUDE.md 絶対ルール2）
  import type { FigurePose, Role } from '../content/types'
  import { FOOT_LEN, HARA_LEN, HEAD_R, add, dirVec, partAnchor, polyline, pt, scale } from './geometry'

  interface Props {
    role: Role
    pose: FigurePose
    /** 注目側＝手前・濃墨・帯矢印あり／相手＝奥・淡墨 */
    focus: boolean
    /** 部位 id を付けるか（アニメ本体のみ true。一覧の縮小表示などは false で id 重複を避ける） */
    ids?: boolean
  }
  let { role, pose, focus, ids = true }: Props = $props()

  const id = (s: string) => (ids ? `${role}-${s}` : undefined)
  const j = $derived(pose.joints)
  const fwd = $derived(pose.facing)
  const toe = (side: 'f' | 'b') => add(j[`ankle_${side}`], [fwd * FOOT_LEN, 1])

  const limbs = $derived({
    armF: polyline(j.shoulder_f, j.elbow_f, j.wrist_f),
    armB: polyline(j.shoulder_b, j.elbow_b, j.wrist_b),
    legF: polyline(j.hipjoint_f, j.knee_f, j.ankle_f, toe('f')),
    legB: polyline(j.hipjoint_b, j.knee_b, j.ankle_b, toe('b')),
    torso: polyline(j.neck, j.hip),
    clavicle: polyline(j.shoulder_b, j.neck, j.shoulder_f),
    pelvis: polyline(j.hipjoint_b, j.hip, j.hipjoint_f),
    neck: polyline(j.head, j.neck),
  })
  const headLine = $derived(polyline(add(j.head, scale(dirVec(fwd, pose.head_dir), HEAD_R * 0.35)), add(j.head, scale(dirVec(fwd, pose.head_dir), HEAD_R + 8))))
  const eyePoint = $derived(add(j.head, scale(dirVec(fwd, pose.head_dir), HEAD_R * 0.45)))
  const gazeLine = $derived(polyline(eyePoint, add(j.head, scale(dirVec(fwd, pose.gaze), 72))))
  const haraTip = $derived(add(j.hip, scale(dirVec(fwd, pose.hara_dir), HARA_LEN)))
  const haraHead = $derived.by(() => {
    const d = dirVec(fwd, pose.hara_dir)
    const n: [number, number] = [-d[1], d[0]]
    const base = add(haraTip, scale(d, -12))
    return `M${pt(add(base, scale(n, 7)))}L${pt(haraTip)}L${pt(add(base, scale(n, -7)))}`
  })
  const anchor = (part: Parameters<typeof partAnchor>[1], side: 'f' | 'b' = 'f') => partAnchor(pose, part, side)
</script>

<g id={ids ? role : undefined} class="figure" class:focus data-role={role}>
  <!-- 奥の手足（b）は先に・薄く描く -->
  <g class="far">
    <path class="limb" d={limbs.legB} />
    <path class="limb" d={limbs.armB} />
  </g>
  <path class="limb thin" d={limbs.pelvis} />
  <path class="limb torso" d={limbs.torso} />
  <path class="limb thin" d={limbs.clavicle} />
  <path class="limb neck" d={limbs.neck} />
  <path class="limb" d={limbs.legF} />
  <path class="limb" d={limbs.armF} />

  <!-- 部位（マーカー起点 .anchor を含む。markers.ts が getBoundingClientRect で読む） -->
  <g id={id('face')} class="part" data-part="face">
    <circle class="head" cx={j.head[0]} cy={j.head[1]} r={HEAD_R} />
    <path class="head-dir" d={headLine} />
    <circle class="anchor" cx={anchor('face')[0]} cy={anchor('face')[1]} r="1" />
  </g>
  <g id={id('eye')} class="part" data-part="eye">
    <circle class="eye" cx={eyePoint[0]} cy={eyePoint[1]} r="2.6" />
    {#if focus}<path class="gaze" d={gazeLine} />{/if}
    <circle class="anchor" cx={anchor('eye')[0]} cy={anchor('eye')[1]} r="1" />
  </g>
  {#each ['f', 'b'] as const as side (side)}
    <g id={id(`shoulder-${side}`)} class="part" data-part="shoulder" data-side={side}>
      <circle class="joint" cx={j[`shoulder_${side}`][0]} cy={j[`shoulder_${side}`][1]} r="3.5" />
      <circle class="anchor" cx={anchor('shoulder', side)[0]} cy={anchor('shoulder', side)[1]} r="1" />
    </g>
    <g id={id(`knee-${side}`)} class="part" data-part="knee" data-side={side}>
      <circle class="joint" cx={j[`knee_${side}`][0]} cy={j[`knee_${side}`][1]} r="3.5" />
      <circle class="anchor" cx={anchor('knee', side)[0]} cy={anchor('knee', side)[1]} r="1" />
    </g>
    <g id={id(`foot-${side}`)} class="part" data-part="foot" data-side={side}>
      <circle class="joint" cx={j[`ankle_${side}`][0]} cy={j[`ankle_${side}`][1]} r="3.5" />
      <circle class="anchor" cx={anchor('foot', side)[0]} cy={anchor('foot', side)[1]} r="1" />
    </g>
  {/each}
  <g id={id('hara')} class="part" data-part="hara">
    <circle class="joint" cx={j.hip[0]} cy={j.hip[1]} r="4" />
    {#if focus}
      <path class="hara-arrow" d={polyline(j.hip, haraTip)} />
      <path class="hara-arrow head" d={haraHead} />
    {/if}
    <circle class="anchor" cx={anchor('hara')[0]} cy={anchor('hara')[1]} r="1" />
  </g>
</g>

<style>
  .figure {
    --ink: var(--sumi-tan);
  }
  .figure.focus {
    --ink: var(--sumi-shou);
  }
  .limb {
    fill: none;
    stroke: var(--ink);
    stroke-width: 6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .limb.torso {
    stroke-width: 8;
  }
  .limb.neck {
    stroke-width: 4;
  }
  .limb.thin {
    stroke-width: 3;
  }
  .far {
    opacity: 0.55;
  }
  .head {
    fill: var(--washi);
    stroke: var(--ink);
    stroke-width: 4.5;
  }
  .head-dir {
    stroke: var(--ink);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .eye,
  .joint {
    fill: var(--ink);
  }
  .gaze {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-dasharray: 2 5;
    stroke-linecap: round;
    opacity: 0.8;
  }
  .hara-arrow {
    fill: none;
    stroke: var(--shu);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .anchor {
    fill: none;
    stroke: none;
    pointer-events: none;
  }
</style>
