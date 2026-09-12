<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    value: string;
    label: string;
    /** Keeps the label for screen readers but hides it visually. */
    hideLabel?: boolean;
    hint?: string;
    error?: string;
    mono?: boolean;
  }

  let {
    value = $bindable(''),
    label,
    hideLabel = false,
    hint,
    error,
    mono = false,
    id,
    class: className,
    ...restProps
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(id ?? `tf-${uid}`);
  const describedBy = $derived(error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined);
</script>

<div class="flex w-full flex-col gap-1">
  <label for={fieldId} class={cn('text-sm font-semibold', hideLabel && 'sr-only')}>
    {label}
  </label>

  <input
    bind:value
    id={fieldId}
    data-slot="retro-input"
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy}
    class={cn(
      'rt-inset w-full border border-ink bg-panel px-2 py-1.5 text-sm text-ink placeholder:text-ink-soft disabled:bg-putty disabled:opacity-60',
      mono && 'rt-mono',
      error && 'border-ember',
      className,
    )}
    {...restProps}
  />

  {#if error}
    <p id="{fieldId}-err" class="rt-mono text-xs text-ember">{error}</p>
  {:else if hint}
    <p id="{fieldId}-hint" class="text-xs text-ink-soft">{hint}</p>
  {/if}
</div>
