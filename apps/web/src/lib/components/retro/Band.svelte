<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const bandVariants = tv({
    base: 'rt-band',
    variants: {
      tone: {
        paper: 'bg-paper',
        panel: 'bg-panel',
        putty: 'bg-putty',
        ink: 'bg-ink text-paper',
        screen: 'bg-screen text-glow',
      },
      divide: {
        true: 'rt-band--divide',
        false: '',
      },
    },
    defaultVariants: { tone: 'panel', divide: true },
  });

  export type BandTone = VariantProps<typeof bandVariants>['tone'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends HTMLAttributes<HTMLElement> {
    tone?: BandTone;
    /** Matches `SiteShell`'s wider frame, so the room page stays aligned. */
    wide?: boolean;
    /** Bottom ink hairline, so stacked bands read as separate surfaces. */
    divide?: boolean;
    /** The full-bleed outer element. */
    class?: string;
    /** The constrained row -- padding, grid, gap all belong here. */
    innerClass?: string;
    children: Snippet;
  }

  let {
    tone = 'panel',
    wide = false,
    divide = true,
    class: className,
    innerClass,
    children,
    ...rest
  }: Props = $props();
</script>

<!-- `rest` carries `id` through, so a band can be its own nav anchor rather
     than wrapping a second <section> just to hold one. -->
<section data-slot="retro-band" class={cn(bandVariants({ tone, divide }), className)} {...rest}>
  <div class={cn('rt-band__inner', wide && 'rt-band__inner--wide', innerClass)}>
    {@render children()}
  </div>
</section>
