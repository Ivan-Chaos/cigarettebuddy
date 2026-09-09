<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const panelVariants = tv({
    base: 'rt-panel',
    variants: {
      tone: {
        panel: '',
        putty: 'rt-panel--putty',
        screen: 'rt-panel--screen',
      },
      shadow: {
        true: 'rt-raise',
        false: '',
      },
    },
    defaultVariants: { tone: 'panel', shadow: false },
  });

  export const stripVariants = tv({
    base: 'rt-strip',
    variants: {
      strip: {
        neutral: '',
        teal: 'rt-strip--teal',
        berry: 'rt-strip--berry',
        moss: 'rt-strip--moss',
        ember: 'rt-strip--ember',
        gold: 'rt-strip--gold',
      },
    },
    defaultVariants: { strip: 'neutral' },
  });

  export type PanelTone = VariantProps<typeof panelVariants>['tone'];
  export type PanelStrip = VariantProps<typeof stripVariants>['strip'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    /** Rendered into the title strip. Omit for a bare box. */
    title?: string;
    /** `span` by default so a Panel never invents a heading level; pass a real
     *  one where the panel is a document section. */
    titleAs?: 'h2' | 'h3' | 'span';
    /** Silkscreen title, for the widget rail. */
    pixel?: boolean;
    tone?: PanelTone;
    /** Colours the title strip. The body and border stay put. */
    strip?: PanelStrip;
    shadow?: boolean;
    dense?: boolean;
    /** Right-hand side of the title strip. */
    actions?: Snippet;
    /** For panels whose body has to flex or scroll. */
    bodyClass?: string;
    children: Snippet;
    class?: string;
  }

  let {
    title,
    titleAs = 'span',
    pixel = false,
    tone = 'panel',
    strip = 'neutral',
    shadow = false,
    dense = false,
    actions,
    bodyClass,
    children,
    class: className,
  }: Props = $props();
</script>

<div data-slot="retro-panel" class={cn(panelVariants({ tone, shadow }), className)}>
  {#if title || actions}
    <div class={stripVariants({ strip })}>
      {#if title}
        <svelte:element
          this={titleAs}
          class={pixel ? 'rt-pixel text-[0.625rem]' : 'text-sm font-semibold'}
        >
          {title}
        </svelte:element>
      {:else}
        <span></span>
      {/if}
      {@render actions?.()}
    </div>
  {/if}
  <div class={cn(dense ? 'p-2' : 'p-4', bodyClass)}>
    {@render children()}
  </div>
</div>
