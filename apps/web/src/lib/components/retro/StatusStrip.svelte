<script lang="ts">
  import { cn } from '$lib/utils';

  /** Matches the union `/room` already derives, so that $derived needs no edit. */
  export type StatusTone = 'ok' | 'pending' | 'bad';

  interface Props {
    tone: StatusTone;
    label: string;
    /** Right-aligned secondary text, e.g. the RTC connection state. */
    detail?: string;
    blink?: boolean;
    class?: string;
  }

  let { tone, label, detail, blink = false, class: className }: Props = $props();
</script>

<!-- The dot carries a shape difference as well as a hue, so state is never
     colour-alone -- filled square, hollow square, or square with a slash. -->
<div
  data-slot="retro-status"
  class={cn(
    'flex items-center justify-between gap-3 border border-ink bg-putty px-2 py-1',
    className,
  )}
>
  <span class="flex items-center gap-2">
    <span class="dot" class:blink data-tone={tone} aria-hidden="true"></span>
    <span class="rt-mono text-[0.8125rem] text-ink">{label}</span>
  </span>
  {#if detail}
    <span class="rt-mono text-xs text-ink">({detail})</span>
  {/if}
</div>

<style>
  .dot {
    position: relative;
    width: 0.625rem;
    height: 0.625rem;
    flex: none;
    border: 1px solid var(--color-ink);
  }
  .dot[data-tone='ok'] {
    background-color: var(--color-moss);
  }
  .dot[data-tone='pending'] {
    background-color: transparent;
  }
  .dot[data-tone='bad'] {
    background-color: var(--color-ember);
  }
  /* The slash that makes `bad` legible without colour. A rotated bar rather
     than a hard-stop gradient -- the brief bans gradient functions outright. */
  .dot[data-tone='bad']::after {
    content: '';
    position: absolute;
    top: 50%;
    left: -2px;
    right: -2px;
    height: 1px;
    background-color: var(--color-ink);
    transform: rotate(-45deg);
  }

  @media (prefers-reduced-motion: no-preference) {
    .dot.blink {
      animation: dot-blink 1.4s steps(1, end) infinite;
    }
  }
  @keyframes dot-blink {
    0%,
    50% {
      background-color: var(--color-ink);
    }
    50.01%,
    100% {
      background-color: transparent;
    }
  }
</style>
