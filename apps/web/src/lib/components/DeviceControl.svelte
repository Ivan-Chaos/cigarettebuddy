<script lang="ts">
  import type { Component } from 'svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

  interface Props {
    /** Menu heading, e.g. "Microphone". */
    heading: string;
    /** Text on the main (toggle) half of the split button. */
    label: string;
    icon: Component;
    /** Whether the input is currently live (not muted / not stopped). */
    active: boolean;
    disabled?: boolean;
    devices: MediaDeviceInfo[];
    selected: string;
    onToggle: () => void;
    onSelect: (deviceId: string) => void;
  }

  let {
    heading,
    label,
    icon: Icon,
    active,
    disabled = false,
    devices,
    selected,
    onToggle,
    onSelect,
  }: Props = $props();

  /** Browsers hide labels until permission is granted; fall back to a number. */
  function nameOf(device: MediaDeviceInfo, index: number): string {
    return device.label || `${heading} ${index + 1}`;
  }
</script>

<div class="inline-flex" role="group" aria-label={heading}>
  <Button
    variant="secondary"
    class="rounded-r-none"
    aria-pressed={!active}
    {disabled}
    onclick={onToggle}
  >
    <Icon />
    {label}
  </Button>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="secondary"
          size="icon"
          class="rounded-l-none border-l border-border/60"
          aria-label="Choose {heading.toLowerCase()}"
          disabled={disabled && devices.length === 0}
        >
          <ChevronDownIcon />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content align="end" class="min-w-56">
      <DropdownMenu.Label>{heading}</DropdownMenu.Label>
      <DropdownMenu.Separator />
      {#if devices.length === 0}
        <DropdownMenu.Item disabled>No {heading.toLowerCase()} found</DropdownMenu.Item>
      {:else}
        <DropdownMenu.RadioGroup value={selected} onValueChange={onSelect}>
          {#each devices as device, index (device.deviceId)}
            <DropdownMenu.RadioItem value={device.deviceId}>
              <span class="truncate">{nameOf(device, index)}</span>
            </DropdownMenu.RadioItem>
          {/each}
        </DropdownMenu.RadioGroup>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>
