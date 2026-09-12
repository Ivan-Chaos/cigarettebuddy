<script lang="ts">
  import { CHAT_DURATION_MS } from '@cigbuddy/shared';
  import { cn } from '$lib/utils';

  interface Props {
    /** When the clock started. Null renders a full, unlit cigarette. */
    startedAt?: Date | number | null;
    /** Length of a whole cigarette. One room's worth by default. */
    durationMs?: number;
    running?: boolean;
    /** Off when the cigarette is an illustration rather than a live clock. */
    showClock?: boolean;
    /** Show what is left rather than what has burned. The drawing is the same. */
    countdown?: boolean;
    /** A fixed burn from 0 to 1, for drawing a lit cigarette that is not a
     *  clock. Wins over `startedAt`, and renders no time. Use this rather than
     *  a backdated `startedAt`: server and client would compute different
     *  values from the current time and the markup would fail to hydrate. */
    progress?: number;
    label?: string;
    class?: string;
  }

  let {
    startedAt = null,
    durationMs = CHAT_DURATION_MS,
    running = true,
    showClock = true,
    countdown = false,
    progress,
    label,
    class: className,
  }: Props = $props();

  let now = $state(Date.now());

  // Ticks only while there is something to tick for, and clears itself up.
  $effect(() => {
    if (!startedAt || !running) return;
    now = Date.now();
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  const startMs = $derived(startedAt ? new Date(startedAt).getTime() : null);
  const elapsed = $derived(startMs === null ? 0 : Math.max(0, now - startMs));
  const ratio = $derived(
    progress === undefined ? Math.min(1, elapsed / durationMs) : Math.min(1, Math.max(0, progress)),
  );
  /** Lit means there is an ember and an ash trail to draw. */
  const lit = $derived(progress !== undefined || startedAt !== null);

  // Geometry: 128 units of burnable paper from x=20, then a 52-unit filter.
  const paperX = $derived(20 + 128 * ratio);
  const paperW = $derived(128 * (1 - ratio));

  const clock = $derived.by(() => {
    const shownMs = countdown ? Math.max(0, durationMs - elapsed) : elapsed;
    // Ceil on the way down so the display reads 10:00 at the start, 0:00 at the end.
    const total = countdown ? Math.ceil(shownMs / 1000) : Math.floor(shownMs / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });
</script>

<div class={cn('flex flex-col gap-1.5', className)}>
  <svg viewBox="0 0 200 40" class="block w-full" role="img" aria-label={label ?? 'Cigarette'}>
    <!-- spent ash, trailing off the burning end -->
    {#if lit && ratio > 0.03}
      <rect
        x={Math.max(2, paperX - 16)}
        y="13"
        width={Math.min(11, paperX - 20)}
        height="14"
        fill="var(--color-ash)"
        stroke="var(--color-ink)"
      />
    {/if}

    <!-- the ember -->
    {#if lit && ratio < 1}
      <rect
        class="ember"
        x={paperX - 5}
        y="12"
        width="6"
        height="16"
        fill="var(--color-ember-hot)"
        stroke="var(--color-ink)"
      />
    {/if}

    <!-- paper -->
    {#if paperW > 0}
      <rect
        x={paperX}
        y="12"
        width={paperW}
        height="16"
        fill="var(--color-panel)"
        stroke="var(--color-ink)"
      />
    {/if}

    <!-- filter: ash-toned so it reads as a filter rather than more paper -->
    <rect x="148" y="12" width="50" height="16" fill="var(--color-ash)" stroke="var(--color-ink)" />
    <line x1="160" y1="13" x2="160" y2="27" stroke="var(--color-ink)" opacity="0.5" />
    <line x1="172" y1="13" x2="172" y2="27" stroke="var(--color-ink)" opacity="0.5" />
    <line x1="184" y1="13" x2="184" y2="27" stroke="var(--color-ink)" opacity="0.5" />
  </svg>

  {#if startedAt && showClock && progress === undefined}
    <span class="rt-mono text-xs text-ink-soft">
      {clock}{#if label}&nbsp;&mdash;&nbsp;{label}{/if}
    </span>
  {:else if label}
    <span class="rt-mono text-xs text-ink-soft">{label}</span>
  {/if}
</div>

<style>
  /* The flicker is decoration and stops under reduced motion. The cigarette's
     *length* keeps updating either way, because that is data, not decoration. */
  @media (prefers-reduced-motion: no-preference) {
    .ember {
      animation: ember-flicker 2.6s steps(1, end) infinite;
    }
  }
  @keyframes ember-flicker {
    0%,
    70% {
      opacity: 1;
    }
    71%,
    100% {
      opacity: 0.72;
    }
  }
</style>
