<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    /** Presentational only -- the caller owns where the number comes from. */
    count: number;
    digits?: number;
    label?: string;
    class?: string;
  }

  let { count, digits = 6, label, class: className }: Props = $props();

  const cells = $derived(
    Math.max(0, Math.floor(count)).toString().padStart(digits, '0').slice(-digits).split(''),
  );
</script>

<div class={cn('flex flex-col items-center gap-1', className)}>
  <!-- One label for the whole odometer, so a screen reader reads "417
       visitors" rather than six separate digit boxes. -->
  <div
    data-slot="retro-counter"
    class="flex gap-px border border-ink bg-screen p-px"
    role="img"
    aria-label={label ? `${count} ${label}` : String(count)}
  >
    {#each cells as digit, i (i)}
      <span
        class="rt-pixel min-w-[1.05rem] px-1 py-0.5 text-center text-[1rem] text-glow"
        aria-hidden="true"
      >
        {digit}
      </span>
    {/each}
  </div>
  {#if label}
    <span class="text-xs text-ink-soft">{label}</span>
  {/if}
</div>
