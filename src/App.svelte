<script lang="ts">
  import TechniqueView from './components/TechniqueView.svelte'
  import { router } from './lib/router.svelte'
</script>

{#if router.route.name === 'technique'}
  {#key router.route.id}
    <TechniqueView id={router.route.id} kind={router.route.kind} />
  {/key}
{:else}
  <main class="cover">
    <h1 class="title">合氣道</h1>
    <a class="enter" href="#/techniques/ikkyo-omote">一教（表）を見る</a>
  </main>
{/if}

<style>
  .cover {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-5);
    padding: var(--space-5);
  }

  .title {
    writing-mode: vertical-rl;
    font-family: var(--font-heading);
    font-size: clamp(3rem, 18vw, 7rem);
    letter-spacing: 0.2em;
    color: var(--sumi-shou);
  }

  .enter {
    font-family: var(--font-heading);
    font-size: var(--text-l);
    color: var(--sumi-shou);
  }
</style>
