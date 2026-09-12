<script lang="ts">
  import type { Component } from 'svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import { Button, MenuButton } from '$lib/components/retro';

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

  const options = $derived(
    devices.map((device, index) => ({ value: device.deviceId, label: nameOf(device, index) })),
  );
</script>

<!-- The split-button seam is a shared 1px ink border rather than a pair of
     half-rounded corners: there are no rounded corners left to halve. -->
<div class="inline-flex" role="group" aria-label={heading}>
  <Button aria-pressed={!active} {disabled} onclick={onToggle}>
    <Icon aria-hidden="true" />
    {label}
  </Button>

  <MenuButton
    label="Choose {heading.toLowerCase()}"
    {heading}
    value={selected}
    {options}
    {onSelect}
    align="end"
    size="icon"
    disabled={disabled && devices.length === 0}
    emptyText="No {heading.toLowerCase()}s found"
    class="-ml-px"
  >
    {#snippet trigger()}
      <ChevronDownIcon aria-hidden="true" />
    {/snippet}
  </MenuButton>
</div>
