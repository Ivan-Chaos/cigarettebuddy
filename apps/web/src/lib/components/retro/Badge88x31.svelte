<script lang="ts" module>
  export type BadgeTone = 'ink' | 'ember' | 'moss' | 'teal' | 'berry' | 'gold';
</script>

<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    /** The accessible name, and the image alt when `src` is given. */
    title: string;
    href?: string;
    /** A real 88x31 gif or png. Without it, a CSS badge is drawn instead. */
    src?: string;
    label?: string;
    sublabel?: string;
    tone?: BadgeTone;
    class?: string;
  }

  let { title, href, src, label, sublabel, tone = 'ink', class: className }: Props = $props();

  const tones: Record<BadgeTone, string> = {
    ink: 'bg-screen text-glow',
    ember: 'bg-ember text-paper',
    moss: 'bg-moss text-paper',
    teal: 'bg-teal text-paper',
    berry: 'bg-berry text-paper',
    gold: 'bg-gold text-ink',
  };
</script>

<!-- Never scaled: a stretched 88x31 is the one thing that reads instantly as
     fake, so the box is pinned to exactly 88x31 device-independent pixels. -->
{#snippet badge()}
  {#if src}
    <img {src} alt={title} width="88" height="31" class="block" />
  {:else}
    <span
      class={cn(
        'flex h-[31px] w-[88px] flex-col items-center justify-center overflow-hidden border border-ink leading-none',
        tones[tone],
      )}
    >
      <span class="rt-pixel text-[0.5rem]">{label ?? title}</span>
      {#if sublabel}
        <span class="rt-pixel mt-0.5 text-[0.4375rem] opacity-80">{sublabel}</span>
      {/if}
    </span>
  {/if}
{/snippet}

{#if href}
  <a
    {href}
    data-slot="retro-badge88"
    aria-label={title}
    class={cn('inline-block no-underline', className)}
  >
    {@render badge()}
  </a>
{:else}
  <span data-slot="retro-badge88" class={cn('inline-block', className)} {title}>
    {@render badge()}
  </span>
{/if}
