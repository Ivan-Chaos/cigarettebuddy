<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** A file from `static/gifs/`. Without it a labelled slot is drawn, so an
     *  empty slot reads as deliberate rather than broken. */
    src?: string;
    /** Empty string marks it decorative; give real text if it carries meaning. */
    alt?: string;
    rotate?: number;
    size?: number;
    children?: Snippet;
    class?: string;
  }

  let { src, alt = '', rotate = -3, size = 104, children, class: className }: Props = $props();
</script>

<div
  data-slot="retro-sticker"
  class={cn('inline-block', className)}
  style="transform: rotate({rotate}deg)"
>
  {#if src}
    <img
      {src}
      {alt}
      aria-hidden={alt === '' ? 'true' : undefined}
      width={size}
      class="block border border-ink bg-panel p-1"
      style="max-width: 100%"
    />
  {:else if children}
    <div class="border border-ink bg-panel p-1">{@render children()}</div>
  {:else}
    <div
      class="grid place-content-center border border-dashed border-ink/45 bg-panel p-2 text-center"
      style="width: {size}px; height: {size}px"
    >
      <span class="rt-mono text-[0.625rem] text-ink-soft">
        gif slot<br />static/gifs/
      </span>
    </div>
  {/if}
</div>
