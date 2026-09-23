<script lang="ts">
  // 3D のカメラの位置（斜め・横・真上）。docs/animation-spec.md §13-4
  import { CAMERA_DESC, CAMERA_LABEL, CAMERA_PRESETS, type CameraPreset } from '../lib/anim3d/camera'

  interface Props {
    value: CameraPreset
    onchange: (preset: CameraPreset) => void
  }
  let { value, onchange }: Props = $props()
</script>

<div class="cams" role="group" aria-label="カメラの位置">
  {#each CAMERA_PRESETS as p (p)}
    <button type="button" class="cam" aria-pressed={value === p} title={CAMERA_DESC[p]} onclick={() => onchange(p)}>{CAMERA_LABEL[p]}</button>
  {/each}
</div>

<style>
  .cams {
    display: inline-flex;
    border: 1px solid var(--sumi-tan);
    border-radius: var(--radius-m);
    overflow: hidden;
  }
  .cam {
    appearance: none;
    min-width: var(--tap-min);
    min-height: var(--tap-min);
    padding: 0 var(--space-2);
    border: 0;
    background: var(--washi-light);
    color: var(--sumi-nou);
    font-family: var(--font-sub);
    font-size: var(--text-s);
    cursor: pointer;
  }
  .cam + .cam {
    border-left: 1px solid var(--sumi-tan);
  }
  .cam[aria-pressed='true'] {
    background: var(--sumi-shou);
    color: var(--washi);
  }
</style>
