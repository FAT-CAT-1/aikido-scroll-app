<script lang="ts">
  import HomeView from './components/HomeView.svelte'
  import Lazy from './components/Lazy.svelte'
  import PageHeader from './components/PageHeader.svelte'
  import UpdateToast from './components/UpdateToast.svelte'
  import { router } from './lib/router.svelte'

  // 表紙以外の画面は開いたときに読み込む（技詳細は GSAP を含むので特に大きい）
  const loadTechnique = () => import('./components/TechniqueView.svelte')
  const loadTechniqueList = () => import('./components/TechniqueList.svelte')
  const loadGlossary = () => import('./components/GlossaryList.svelte')
  const loadTerm = () => import('./components/TermView.svelte')
  const loadPage = () => import('./components/PageView.svelte')
</script>

<UpdateToast />

{#if router.route.name === 'technique'}
  {#key router.route.id}
    <Lazy load={loadTechnique} props={{ id: router.route.id, kind: router.route.kind }} />
  {/key}
{:else if router.route.name === 'techniques'}
  {#key router.route.kind}
    <Lazy load={loadTechniqueList} props={{ kind: router.route.kind }} />
  {/key}
{:else if router.route.name === 'term'}
  {#key router.route.id}
    <Lazy load={loadTerm} props={{ id: router.route.id }} />
  {/key}
{:else if router.route.name === 'glossary'}
  <Lazy load={loadGlossary} props={{}} />
{:else if router.route.name === 'page'}
  {#key router.route.id}
    <Lazy load={loadPage} props={{ id: router.route.id }} />
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
