<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    value: number;
    max?: number;
    segments?: number;
    label?: string;
    tone?: 'ember' | 'moss' | 'ink';
    class?: string;
  }

  let { value, max = 1, segments = 20, label, tone = 'ink', class: className }: Props = $props();

  const ratio = $derived(max <= 0 ? 0 : Math.min(1, Math.max(0, value / max)));
  const filled = $derived(Math.round(ratio * segments));

  const fill: Record<'ember' | 'moss' | 'ink', string> = {
    ember: 'bg-ember',
    moss: 'bg-moss',
    ink: 'bg-ink',
  };
</script>

<div class={cn('flex flex-col gap-1', className)}>
  {#if label}
    <span class="rt-mono text-xs text-ink-soft">{label}</span>
  {/if}
  <div
    data-slot="retro-progress"
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-label={label}
    class="rt-inset flex gap-px border border-ink bg-panel p-px"
  >
    {#each { length: segments } as _, i (i)}
      <span class={cn('h-3.5 flex-1', i < filled ? fill[tone] : 'bg-transparent')}></span>
    {/each}
  </div>
</div>
