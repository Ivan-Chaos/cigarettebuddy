<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    checked: boolean;
    label: string;
    id?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    id,
    disabled = false,
    class: className,
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(id ?? `cb-${uid}`);
</script>

<div class={cn('flex items-center gap-2', className)}>
  <input
    bind:checked
    id={fieldId}
    type="checkbox"
    {disabled}
    data-slot="retro-checkbox"
    class="rt-check"
  />
  <label for={fieldId} class={cn('text-sm', disabled && 'text-ink-soft')}>{label}</label>
</div>
