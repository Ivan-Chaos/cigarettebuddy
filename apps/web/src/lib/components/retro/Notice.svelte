<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const noticeVariants = tv({
    base: 'border',
    variants: {
      tone: {
        info: 'border-ink bg-panel',
        warn: 'border-ink bg-putty',
        error: 'border-ember bg-panel',
        quiet: 'border-ink/35 bg-panel',
      },
    },
    defaultVariants: { tone: 'info' },
  });

  export type NoticeTone = VariantProps<typeof noticeVariants>['tone'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    tone?: NoticeTone;
    title?: string;
    children: Snippet;
    class?: string;
  }

  let { tone = 'info', title, children, class: className }: Props = $props();
</script>

<div data-slot="retro-notice" class={cn(noticeVariants({ tone }), className)}>
  {#if title}
    <p
      class={cn(
        'border-b px-3 py-1.5 font-serif text-base',
        tone === 'error' ? 'border-ember text-ember' : 'border-ink bg-putty text-ink',
      )}
    >
      {title}
    </p>
  {/if}
  <div class="space-y-2 px-3 py-2.5 text-sm">
    {@render children()}
  </div>
</div>
