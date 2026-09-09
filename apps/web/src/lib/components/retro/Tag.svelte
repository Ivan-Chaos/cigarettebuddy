<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  /* Named Tag, not Badge: `ui/badge` already exists (and is a pill, the exact
     opposite of this) and `Badge88x31` is a different thing again. */
  export const tagVariants = tv({
    base: 'inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs whitespace-nowrap',
    variants: {
      tone: {
        neutral: 'border-ink bg-putty text-ink',
        ok: 'border-moss bg-panel text-moss',
        warn: 'border-ink bg-putty text-ink',
        bad: 'border-ember bg-panel text-ember',
        ember: 'border-ember bg-ember text-paper',
      },
    },
    defaultVariants: { tone: 'neutral' },
  });

  export type TagTone = VariantProps<typeof tagVariants>['tone'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    tone?: TagTone;
    mono?: boolean;
    children: Snippet;
    class?: string;
  }

  let { tone = 'neutral', mono = false, children, class: className }: Props = $props();
</script>

<span data-slot="retro-tag" class={cn(tagVariants({ tone }), mono && 'rt-mono', className)}>
  {@render children()}
</span>
