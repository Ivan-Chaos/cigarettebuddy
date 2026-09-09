<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import Button, { type ButtonSize, type ButtonVariant } from './Button.svelte';

  export interface MenuOption {
    value: string;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    /** Trigger text. Also the accessible name when `trigger` is a bare icon. */
    label: string;
    /** Heading inside the menu. */
    heading?: string;
    value?: string;
    options: MenuOption[];
    onSelect: (value: string) => void;
    align?: 'start' | 'center' | 'end';
    disabled?: boolean;
    emptyText?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Replaces the default label-and-chevron trigger. */
    trigger?: Snippet;
    class?: string;
  }

  let {
    label,
    heading,
    value,
    options,
    onSelect,
    align = 'start',
    disabled = false,
    emptyText = 'Nothing to choose from',
    variant = 'default',
    size = 'md',
    trigger,
    class: className,
  }: Props = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        {variant}
        {size}
        {disabled}
        aria-label={trigger ? label : undefined}
        class={className}
      >
        {#if trigger}
          {@render trigger()}
        {:else}
          {label}
          <ChevronDownIcon aria-hidden="true" />
        {/if}
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content {align} class="min-w-56">
    {#if heading}
      <DropdownMenu.Label class="rt-mono text-xs">{heading}</DropdownMenu.Label>
      <DropdownMenu.Separator class="bg-ink" />
    {/if}

    {#if options.length === 0}
      <DropdownMenu.Item disabled>{emptyText}</DropdownMenu.Item>
    {:else}
      <DropdownMenu.RadioGroup {value} onValueChange={onSelect}>
        {#each options as option (option.value)}
          <DropdownMenu.RadioItem value={option.value} disabled={option.disabled}>
            <span class="truncate">{option.label}</span>
          </DropdownMenu.RadioItem>
        {/each}
      </DropdownMenu.RadioGroup>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
