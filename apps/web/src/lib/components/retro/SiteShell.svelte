<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** Widens the frame for the two-video room stage. */
    wide?: boolean;
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { wide = false, header, footer, children, class: className }: Props = $props();
</script>

<a class="rt-skip" href="#content">Skip to content</a>

<div
  data-slot="retro-shell"
  class={cn('rt-frame my-0 sm:my-6', wide && 'max-w-[76rem]', className)}
>
  {#if header}
    <header class="border-b border-ink px-4 pt-4 pb-3 sm:px-6">
      {@render header()}
    </header>
  {/if}

  <main id="content" class="px-4 py-6 sm:px-6 sm:py-8">
    {@render children()}
  </main>

  {#if footer}
    <footer class="border-t border-ink px-4 py-4 sm:px-6">
      {@render footer()}
    </footer>
  {/if}
</div>
