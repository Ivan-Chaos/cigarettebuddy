<script lang="ts">
  import '../app.css';
  import { env } from '$env/dynamic/public';

  let { children } = $props();
</script>

<svelte:head>
  <title>{env.PUBLIC_APP_NAME ?? 'CigaretteBuddy'}</title>
</svelte:head>

<main>
  {@render children?.()}
</main>
