<script lang="ts">
  import GlossaryList from './components/GlossaryList.svelte'
  import HomeView from './components/HomeView.svelte'
  import TechniqueView from './components/TechniqueView.svelte'
  import TermView from './components/TermView.svelte'
  import { router } from './lib/router.svelte'
</script>

{#if router.route.name === 'technique'}
  {#key router.route.id}
    <TechniqueView id={router.route.id} kind={router.route.kind} />
  {/key}
{:else if router.route.name === 'term'}
  {#key router.route.id}
    <TermView id={router.route.id} />
  {/key}
{:else if router.route.name === 'glossary'}
  <GlossaryList />
{:else if router.route.name === 'home'}
  <HomeView />
{:else}
  <main class="placeholder">
    <p>この画面は準備中です。</p>
    <p><a href="#/">巻物へ戻る</a>　<a href="#/techniques/ikkyo-omote">一教（表）</a></p>
  </main>
{/if}

<style>
  .placeholder {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: var(--space-3);
    text-align: center;
  }
</style>
