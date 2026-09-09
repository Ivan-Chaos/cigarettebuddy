<script lang="ts">
  import '../app.css';
  import { env } from '$env/dynamic/public';
  import { page } from '$app/state';

  let { children } = $props();

  const wide = $derived(page.url.pathname.startsWith('/room/'));
</script>

<svelte:head>
  <title>{env.PUBLIC_APP_NAME ?? 'CigaretteBuddy'}</title>
</svelte:head>

<main class:wide>
  {@render children?.()}
</main>
