<script lang="ts">
  import { page } from '$app/state';
  import { cn } from '$lib/utils';

  export interface NavItem {
    href: string;
    label: string;
  }

  interface Props {
    items: NavItem[];
    /** Defaults to the current path; pass a hash to mark an in-page section. */
    current?: string;
    class?: string;
  }

  let { items, current, class: className }: Props = $props();

  const active = $derived(current ?? page.url.pathname);
</script>

<nav data-slot="retro-nav" class={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
  {#each items as item (item.href)}
    {@const isCurrent = item.href === active}
    <a
      href={item.href}
      aria-current={isCurrent ? 'page' : undefined}
      class={cn(
        'py-1 text-[0.9375rem] no-underline decoration-1 underline-offset-4 hover:underline',
        isCurrent ? 'text-ember underline decoration-2' : 'text-ink',
      )}
    >
      {item.label}
    </a>
  {/each}
</nav>
