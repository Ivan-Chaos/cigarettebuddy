<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** Widens the frame for the two-video room stage. */
    wide?: boolean;
    /**
     * The bordered content sheet. Leave it on for pages that are still a single
     * document; turn it off for pages that compose their own full-bleed
     * `Band`s, which cannot escape the sheet's border and padding from inside.
     */
    framed?: boolean;
    /** Rendered into the full-bleed dark bar above the content. */
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { wide = false, framed = true, header, footer, children, class: className }: Props = $props();
</script>

<a class="rt-skip" href="#content">Skip to content</a>

{#if header}
  <header class="rt-topbar">
    <div class={cn('rt-topbar__inner', wide && 'rt-topbar__inner--wide')}>
      {@render header()}
    </div>
  </header>
{/if}

{#if framed}
  <div data-slot="retro-shell" class={cn('rt-frame sm:my-6', wide && 'max-w-[76rem]', className)}>
    <main id="content" class="rt-frame__body">
      {@render children()}
    </main>

    {#if footer}
      <footer class="border-t border-ink px-4 py-4 sm:px-6">
        {@render footer()}
      </footer>
    {/if}
  </div>
{:else}
  <main id="content" data-slot="retro-shell" class={className}>
    {@render children()}
  </main>

  {#if footer}
    <!-- Unframed, the footer would otherwise be a bare block with its content
         jammed against the viewport edge, so it becomes a band of its own. -->
    <footer class="rt-band border-t border-ink bg-panel">
      <div class={cn('rt-band__inner py-4 sm:py-5', wide && 'rt-band__inner--wide')}>
        {@render footer()}
      </div>
    </footer>
  {/if}
{/if}
