<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import * as Base from '$lib/components/ui/tooltip';

  interface Props {
    text: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    /**
     * Receives the trigger props to spread onto your own element, so a
     * `Button` can be the trigger without a second `<button>` around it.
     * Omit it and `children` is wrapped instead.
     */
    trigger?: Snippet<[Record<string, unknown>]>;
    children?: Snippet;
  }

  let { text, side = 'top', trigger, children }: Props = $props();

  /* The primitive builds a portal container as it initialises, which a server
     render does not produce -- so wrapping the trigger during the first client
     render makes the markup fail to hydrate. Render the bare trigger until
     after mount, then wrap it. A tooltip is a progressive enhancement, so
     arriving a tick late costs nothing, and keeping this here means call sites
     do not each have to guard it. */
  let mounted = $state(false);
  onMount(() => (mounted = true));
</script>

{#if mounted}
  <!-- Instant, because a delay reads as a modern nicety. Nesting providers is
       fine in bits-ui, so the component stays self-contained. -->
  <Base.Provider delayDuration={0}>
    <Base.Root>
      {#if trigger}
        <Base.Trigger>
          {#snippet child({ props })}
            {@render trigger(props)}
          {/snippet}
        </Base.Trigger>
      {:else}
        <Base.Trigger>
          {@render children?.()}
        </Base.Trigger>
      {/if}
      <Base.Content {side} sideOffset={6} class="rt-mono text-xs">
        {text}
      </Base.Content>
    </Base.Root>
  </Base.Provider>
{:else if trigger}
  {@render trigger({})}
{:else}
  {@render children?.()}
{/if}
