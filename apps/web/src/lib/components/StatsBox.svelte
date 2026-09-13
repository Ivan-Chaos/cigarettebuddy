<script lang="ts">
  import { onMount } from 'svelte';
  import { statsSchema, type Stats } from '@cigbuddy/shared';
  import { HitCounter } from '$lib/components/retro';
  import { cn } from '$lib/utils';

  interface Props {
    /** This browser's own visit count; `null` until the page has mounted. */
    visits: number | null;
  }

  let { visits }: Props = $props();

  /* `null` is "don't know": before the first answer, and again the moment a
     poll fails. Dashes are honest; a stale or invented number is not. */
  let stats = $state<Stats | null>(null);
  /* Phones get a one-line strip that opens on demand; wider screens always
     show the full box, so this only matters below `sm`. */
  let collapsed = $state(true);

  /* Zero people in rooms is the normal state for a solo visitor, so it gets a
     line in the site's voice rather than a row of zeros. Picked once, at
     mount, so it does not flicker between polls. */
  const LONELY = [
    'kinda lonely here right now',
    "nobody's out here but you",
    'just you and the ashtray',
  ] as const;
  let lonely = $state<string>(LONELY[0]);

  const POLL_MS = 15_000;

  async function load() {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const body: unknown = await res.json();
      stats = statsSchema.parse((body as { data?: unknown }).data);
    } catch {
      stats = null;
    }
  }

  onMount(() => {
    lonely = LONELY[Math.floor(Math.random() * LONELY.length)] ?? LONELY[0];
    void load();

    // No point polling a tab nobody is looking at; catch up the moment they are.
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  const summary = $derived(
    [
      `${stats ? stats.breaks : '-'} breaks`,
      `${stats ? stats.online : '-'} online`,
      `${visits ?? '-'} visits`,
    ].join(' / '),
  );
</script>

<!-- Fixed, under tooltips and dialogs (z-50) and well under the age gate.
     A strip along the bottom on phones; a raised box in the corner from `sm`. -->
<aside
  aria-label="Site numbers"
  class="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-panel text-ink sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[13rem] sm:border sm:shadow-md"
>
  <div class="rt-strip flex items-center justify-between gap-2 px-3 py-1.5">
    <span class="rt-pixel text-[0.625rem]">the numbers</span>
    <span class="rt-mono truncate text-[0.6875rem] sm:hidden" aria-hidden="true">{summary}</span>
    <button
      type="button"
      class="rt-mono shrink-0 border border-ink bg-panel px-1.5 text-xs leading-5 sm:hidden"
      aria-expanded={!collapsed}
      aria-controls="stats-box-body"
      onclick={() => (collapsed = !collapsed)}
    >
      {collapsed ? '[+]' : '[-]'}
      <span class="sr-only">{collapsed ? 'show' : 'hide'} the numbers</span>
    </button>
  </div>

  <div id="stats-box-body" class={cn('flex-col gap-3 p-3', collapsed ? 'hidden sm:flex' : 'flex')}>
    <HitCounter count={stats?.breaks ?? null} digits={5} label="smoke breaks" />

    {#if stats && stats.online === 0}
      <div class="flex flex-col items-center gap-1">
        <p class="rt-mono text-center text-xs text-ink-soft">{lonely}</p>
        <span class="text-xs text-ink-soft">online now</span>
      </div>
    {:else}
      <HitCounter count={stats?.online ?? null} digits={5} label="online now" />
    {/if}

    <HitCounter count={visits} digits={5} label="your visits" />

    <p class="rt-mono text-center text-[0.625rem] text-ink-soft">
      aggregate only. nobody's counted by name.
    </p>
  </div>
</aside>
