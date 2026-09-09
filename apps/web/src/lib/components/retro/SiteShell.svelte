<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** Widens the frame for the two-video room stage. */
    wide?: boolean;
    /** Rendered into the full-bleed dark bar above the frame. */
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { wide = false, header, footer, children, class: className }: Props = $props();
</script>

<a class="rt-skip" href="#content">Skip to content</a>

{#if header}
  <header class="rt-topbar">
    <div class={cn('rt-topbar__inner', wide && 'rt-topbar__inner--wide')}>
      {@render header()}
    </div>
  </header>
{/if}

<div data-slot="retro-shell" class={cn('rt-frame sm:my-6', wide && 'max-w-[76rem]', className)}>
  <main id="content" class="px-4 py-6 sm:px-6 sm:py-8">
    {@render children()}
  </main>

  {#if footer}
    <footer class="border-t border-ink px-4 py-4 sm:px-6">
      {@render footer()}
    </footer>
  {/if}
</div>
