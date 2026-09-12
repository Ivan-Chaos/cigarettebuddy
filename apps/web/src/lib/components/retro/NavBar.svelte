<script lang="ts" module>
  export interface NavItem {
    href: string;
    label: string;
  }
</script>

<script lang="ts">
  import { page } from '$app/state';
  import { cn } from '$lib/utils';

  interface Props {
    items: NavItem[];
    /** Defaults to the current path; pass a hash to mark an in-page section. */
    current?: string;
    /** `paper` for the dark top bar -- the base `a` rule is blue, which is
     *  unreadable on near-black. */
    tone?: 'ink' | 'paper';
    class?: string;
  }

  let { items, current, tone = 'ink', class: className }: Props = $props();

  const active = $derived(current ?? page.url.pathname);

  const rest = $derived(tone === 'paper' ? 'text-paper/85 hover:text-paper' : 'text-ink');
  const on = $derived(
    tone === 'paper' ? 'text-gold underline decoration-2' : 'text-ember underline decoration-2',
  );
</script>

<nav data-slot="retro-nav" class={cn('flex flex-wrap items-center gap-x-5 gap-y-1', className)}>
  {#each items as item (item.href)}
    {@const isCurrent = item.href === active}
    <a
      href={item.href}
      aria-current={isCurrent ? 'page' : undefined}
      class={cn(
        'py-1 text-[0.9375rem] no-underline decoration-1 underline-offset-4 hover:underline',
        isCurrent ? on : rest,
      )}
    >
      {item.label}
    </a>
  {/each}
</nav>
