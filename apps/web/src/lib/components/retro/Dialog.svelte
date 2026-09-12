<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Base from '$lib/components/ui/dialog';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    children: Snippet;
    footer?: Snippet;
    /** Receives the trigger props; omit and drive `open` yourself. */
    trigger?: Snippet<[Record<string, unknown>]>;
  }

  let { open = $bindable(false), title, description, children, footer, trigger }: Props = $props();
</script>

<Base.Root bind:open>
  {#if trigger}
    <Base.Trigger>
      {#snippet child({ props })}
        {@render trigger(props)}
      {/snippet}
    </Base.Trigger>
  {/if}

  <Base.Content class="gap-3 border border-ink bg-panel p-0">
    <Base.Header class="rt-strip gap-3 space-y-0 p-0 px-3 py-2 text-left">
      <Base.Title class="font-serif text-lg leading-none">{title}</Base.Title>
      {#if description}
        <Base.Description class="sr-only">{description}</Base.Description>
      {/if}
    </Base.Header>

    <div class="px-4 pb-1 text-sm">
      {@render children()}
    </div>

    {#if footer}
      <Base.Footer class="border-t border-ink px-4 py-3">
        {@render footer()}
      </Base.Footer>
    {/if}
  </Base.Content>
</Base.Root>
