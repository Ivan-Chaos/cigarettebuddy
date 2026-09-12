<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends HTMLAnchorAttributes {
    href: string;
    variant?: 'text' | 'quiet';
    external?: boolean;
    children: Snippet;
  }

  let {
    href,
    variant = 'text',
    external = false,
    children,
    class: className,
    ...restProps
  }: Props = $props();
</script>

<a
  {href}
  data-slot="retro-link"
  target={external ? '_blank' : undefined}
  rel={external ? 'noreferrer noopener' : undefined}
  class={cn(variant === 'quiet' && 'text-ink-soft no-underline hover:underline', className)}
  {...restProps}
>
  {@render children()}{#if external}<span aria-hidden="true">&#8599;</span>{/if}
</a>
