<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** Seconds for one full pass. */
    speed?: number;
    direction?: 'left' | 'right';
    pauseOnHover?: boolean;
    children: Snippet;
    class?: string;
  }

  let {
    speed = 26,
    direction = 'left',
    pauseOnHover = true,
    children,
    class: className,
  }: Props = $props();
</script>

<!-- A CSS translate, never the <marquee> element. aria-live="off" so it never
     announces. Under reduced motion the track becomes a plain horizontally
     scrollable strip: the content stays fully readable rather than clipped. -->
<div
  data-slot="retro-marquee"
  aria-live="off"
  class={cn('track border-y border-ink bg-putty py-1', pauseOnHover && 'pause-on-hover', className)}
  style="--marquee-duration: {speed}s; --marquee-from: {direction === 'left'
    ? '0'
    : '-50%'}; --marquee-to: {direction === 'left' ? '-50%' : '0'}"
>
  <div class="run">
    <span class="cell">{@render children()}</span>
    <span class="cell" aria-hidden="true">{@render children()}</span>
  </div>
</div>

<style>
  .track {
    overflow: hidden;
  }
  .run {
    display: flex;
    width: max-content;
  }
  .cell {
    display: flex;
    flex: none;
    align-items: center;
    gap: 2.5rem;
    padding-inline: 1.25rem;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: no-preference) {
    .run {
      animation: marquee-run var(--marquee-duration) linear infinite;
    }
    .pause-on-hover:hover .run,
    .pause-on-hover:focus-within .run {
      animation-play-state: paused;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .track {
      overflow-x: auto;
    }
    /* The duplicate is decoration; hide it so the text is not read twice. */
    .cell[aria-hidden='true'] {
      display: none;
    }
  }

  @keyframes marquee-run {
    from {
      transform: translateX(var(--marquee-from));
    }
    to {
      transform: translateX(var(--marquee-to));
    }
  }
</style>
