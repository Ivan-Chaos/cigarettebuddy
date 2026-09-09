<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    count: number;
    capacity?: number;
    label?: string;
    class?: string;
  }

  let { count, capacity = 8, label, class: className }: Props = $props();

  const shown = $derived(Math.min(Math.max(0, Math.floor(count)), capacity));
  const overflow = $derived(Math.max(0, Math.floor(count) - capacity));
</script>

<div class={cn('flex flex-col gap-1.5', className)}>
  <div
    data-slot="retro-ashtray"
    class="rt-inset flex min-h-9 flex-wrap items-center gap-1 border border-ink bg-putty px-2 py-1.5"
    role="img"
    aria-label={label ? `${count} ${label}` : `${count}`}
  >
    {#each { length: shown } as _, i (i)}
      <!-- one stubbed-out butt -->
      <span class="flex h-3 w-5 items-stretch" aria-hidden="true">
        <span class="w-3 border border-ink bg-panel"></span>
        <span class="w-2 border border-l-0 border-ink bg-ash"></span>
      </span>
    {/each}
    {#if shown === 0}
      <span class="rt-mono text-[0.6875rem] text-ink">empty</span>
    {/if}
    {#if overflow > 0}
      <span class="rt-mono text-[0.6875rem] text-ink">+{overflow}</span>
    {/if}
  </div>
  {#if label}
    <span class="text-xs text-ink-soft">{count} {label}</span>
  {/if}
</div>
