<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils';

  /* Hand-rolled rather than a wrapper around `ui/button`: vega's base is ~700
     characters of `rounded-md shadow-xs transition-all focus-visible:ring-3
     active:translate-y-px dark:*`. twMerge resolves the radius and background
     conflicts but not `focus-visible:ring-3` (a different property from our
     outline), and the press physics we want -- translate *and* drop the shadow
     together -- fight `active:not-aria-[haspopup]:translate-y-px`. */
  export const buttonVariants = tv({
    base: 'rt-press inline-flex shrink-0 items-center justify-center gap-1.5 border border-ink whitespace-nowrap no-underline select-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    variants: {
      variant: {
        default: 'rt-raise-sm bg-panel text-ink hover:bg-putty',
        ember: 'rt-raise-sm bg-ember text-paper hover:bg-[#8f2f0a]',
        quiet: 'border-transparent bg-transparent text-ink hover:underline',
        danger: 'rt-raise-sm border-ember bg-panel text-ember hover:bg-[#f6e6df]',
        /* Filled destructive. Hovers to ink rather than darker ember so it never
           reads as `ember` with a different label. */
        'danger-solid': 'rt-raise-sm border-ink bg-ember text-paper hover:bg-ink',
      },
      size: {
        sm: 'h-7 px-2 text-[0.8125rem]',
        md: 'h-9 px-3 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
  export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> & {
      variant?: ButtonVariant;
      size?: ButtonSize;
    };
</script>

<script lang="ts">
  let {
    class: className,
    variant = 'default',
    size = 'md',
    ref = $bindable(null),
    href = undefined,
    type = 'button',
    disabled,
    children,
    ...restProps
  }: ButtonProps = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="retro-button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    data-slot="retro-button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {disabled}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
