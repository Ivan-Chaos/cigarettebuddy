<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    value: string;
    label: string;
    hideLabel?: boolean;
    hint?: string;
    error?: string;
  }

  let {
    value = $bindable(''),
    label,
    hideLabel = false,
    hint,
    error,
    rows = 4,
    id,
    class: className,
    ...restProps
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(id ?? `ta-${uid}`);
  const describedBy = $derived(error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined);
</script>

<div class="flex w-full flex-col gap-1">
  <label for={fieldId} class={cn('text-sm font-semibold', hideLabel && 'sr-only')}>
    {label}
  </label>

  <textarea
    bind:value
    id={fieldId}
    {rows}
    data-slot="retro-textarea"
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy}
    class={cn(
      'rt-inset w-full resize-y border border-ink bg-panel px-2 py-1.5 text-sm text-ink placeholder:text-ink-soft disabled:bg-putty disabled:opacity-60',
      error && 'border-ember',
      className,
    )}
    {...restProps}></textarea>

  {#if error}
    <p id="{fieldId}-err" class="rt-mono text-xs text-ember">{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class="text-xs text-ink-soft">{hint}</p>
  {/if}
</div>
