<script lang="ts">
  import GlossaryList from './components/GlossaryList.svelte'
  import HomeView from './components/HomeView.svelte'
  import PageHeader from './components/PageHeader.svelte'
  import PageView from './components/PageView.svelte'
  import TechniqueList from './components/TechniqueList.svelte'
  import TechniqueView from './components/TechniqueView.svelte'
  import TermView from './components/TermView.svelte'
  import UpdateToast from './components/UpdateToast.svelte'
  import { router } from './lib/router.svelte'
</script>

<UpdateToast />

{#if router.route.name === 'technique'}
  {#key router.route.id}
    <TechniqueView id={router.route.id} kind={router.route.kind} />
  {/key}
{:else if router.route.name === 'techniques'}
  {#key router.route.kind}
    <TechniqueList kind={router.route.kind} />
  {/key}
{:else if router.route.name === 'term'}
  {#key router.route.id}
    <TermView id={router.route.id} />
  {/key}
{:else if router.route.name === 'glossary'}
  <GlossaryList />
{:else if router.route.name === 'page'}
  {#key router.route.id}
    <PageView id={router.route.id} />
  {/key}
{:else if router.route.name === 'home'}
  <HomeView />
{:else}
  <main class="notfound">
    <PageHeader title="ページが見つかりません" />
    <p>URL が正しいか確かめてください。</p>
    <p><a href="#/">巻物（表紙）へ</a></p>
  </main>
{/if}

<style>
  .notfound {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 var(--space-3) var(--space-6);
  }
</style>
