<script lang="ts" module>
  export type RuleVariant = 'solid' | 'double' | 'dotted';
</script>

<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    variant?: RuleVariant;
    orientation?: 'horizontal' | 'vertical';
    class?: string;
  }

  let { variant = 'solid', orientation = 'horizontal', class: className }: Props = $props();

  const horizontal = $derived(orientation === 'horizontal');

  const styles: Record<RuleVariant, string> = {
    solid: 'border-solid',
    double: 'border-double',
    dotted: 'border-dotted',
  };

  const weight = $derived(
    variant === 'double'
      ? horizontal
        ? 'border-t-[3px]'
        : 'border-l-[3px]'
      : horizontal
        ? 'border-t'
        : 'border-l',
  );
</script>

<!-- Hand-rolled rather than wrapping bits-ui Separator: a separator has no
     behavior to inherit, only `role` and `aria-orientation`, and the primitive
     stamps on a generated id nothing references. -->
<div
  data-slot="retro-rule"
  role="separator"
  aria-orientation={orientation}
  class={cn(
    'border-ink',
    styles[variant],
    weight,
    horizontal ? 'h-0 w-full' : 'w-0 self-stretch',
    className,
  )}
></div>
